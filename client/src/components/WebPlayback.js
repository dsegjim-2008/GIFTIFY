import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const defaultTrack = {
    name: "Listo para reproducir",
    album: { images: [{ url: "https://via.placeholder.com/150" }] },
    artists: [{ name: "Selecciona una canción" }]
};

function WebPlayback({ token, trackUri, playingArtist, setUser }) {
    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [current_track, setTrack] = useState(defaultTrack);
    const [deviceId, setDeviceId] = useState(null);
    const [playerInstance, setPlayerInstance] = useState(null);

    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.5);

    const scriptLoaded = useRef(false);

    // 1. INICIALIZACIÓN DEL SDK
    useEffect(() => {
        if (scriptLoaded.current) return;
        scriptLoaded.current = true;

        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'Giftify Web Player',
                getOAuthToken: cb => { cb(token); },
                volume: 0.5
            });

            setPlayerInstance(player);

            player.addListener('ready', ({ device_id }) => {
                console.log('✅ SDK Spotify Listo. Dispositivo:', device_id);
                setDeviceId(device_id);

                // Transfiere la reproducción a este dispositivo web
                axios.put('https://api.spotify.com/v1/me/player', {
                    device_ids: [device_id],
                    play: false
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(e => console.warn("Aviso: Transferencia manual requerida"));
            });

            player.addListener('player_state_changed', (state) => {
                if (!state) { setActive(false); return; }
                setTrack(state.track_window.current_track);
                setPaused(state.paused);
                setDuration(state.duration);
                setPosition(state.position);
                player.getVolume().then(v => setVolume(v));
                setActive(true);
            });

            player.connect();
        };

        return () => { if (playerInstance) playerInstance.disconnect(); };
    }, [token]);

    // 2. REPRODUCCIÓN AUTOMÁTICA
    useEffect(() => {
        if (!deviceId || !trackUri) return;

        const playSong = async () => {
            try {
                const body = trackUri.includes('album')
                    ? { context_uri: trackUri }
                    : { uris: [trackUri] };

                await axios.put(
                    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
                    body,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (err) {
                console.error("❌ Error en reproducción Spotify:", err.response?.data || err.message);
            }
        };
        playSong();
    }, [deviceId, trackUri, token]);

    // 3. CHIVATO Y CONTABILIZACIÓN DE PUNTOS
    useEffect(() => {
        if (!is_active || is_paused || !playingArtist) return;

        const interval = setInterval(() => {
            // Llamamos al backend para sumar puntos (El token propio de backend lo haremos luego)
            axios.post('http://127.0.0.1:3001/api/users/earn', {
                artistId: playingArtist.id,
                artistName: playingArtist.name
            })
                .then(res => {
                    if (setUser) setUser(prev => ({ ...prev, points: res.data.newPoints }));
                })
                .catch(err => console.error("❌ Ruta de puntos aún no creada"));

        }, 10000); // 10 segundos

        return () => clearInterval(interval);
    }, [is_active, is_paused, playingArtist, setUser]);

    // 4. TIMER VISUAL
    useEffect(() => {
        if (!is_paused && is_active) {
            const interval = setInterval(() => {
                setPosition(prev => (prev + 1000 > duration ? duration : prev + 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [is_paused, is_active, duration]);

    const formatTime = (ms) => {
        if (!ms) return "0:00";
        const m = Math.floor(ms / 60000);
        const s = ((ms % 60000) / 1000).toFixed(0);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!deviceId) return <div style={containerStyle}><div style={{ color: '#fff', width: '100%', textAlign: 'center' }}>Cargando Spotify Web Player...</div></div>;

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', width: '30%' }}>
                <img src={current_track?.album?.images[0]?.url || "https://via.placeholder.com/50"} alt="" style={{ height: '56px', width: '56px', marginRight: '15px', borderRadius: '4px' }} />
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap' }}>{current_track?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#b3b3b3' }}>{current_track?.artists?.[0]?.name}</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
                <div style={{ display: 'flex', gap: '25px', alignItems: 'center', marginBottom: '8px' }}>
                    <button className="btn-control side-btn" onClick={() => playerInstance?.previousTrack()}>⏮</button>
                    <button className="btn-control play-btn" onClick={() => playerInstance?.togglePlay()}>
                        {is_paused ? "▶" : "⏸"}
                    </button>
                    <button className="btn-control side-btn" onClick={() => playerInstance?.nextTrack()}>⏭</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', fontSize: '0.75rem', color: '#b3b3b3' }}>
                    <span style={{ minWidth: '35px', textAlign: 'right' }}>{formatTime(position)}</span>
                    <input type="range" min={0} max={duration || 100} value={position} onChange={(e) => {
                        const val = Number(e.target.value);
                        setPosition(val);
                        playerInstance?.seek(val);
                    }} className="progress-bar" style={{ width: '100%', cursor: 'pointer' }} />
                    <span style={{ minWidth: '35px' }}>{formatTime(duration)}</span>
                </div>
            </div>

            <div style={{ width: '30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '20px', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem', opacity: 0.7 }}>🔊</span>
                <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => {
                    const val = Number(e.target.value);
                    setVolume(val);
                    playerInstance?.setVolume(val);
                }} style={{ width: '100px', cursor: 'pointer' }} />
            </div>

            <style>{`
                .btn-control { background: none; border: none; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
                .side-btn { color: #b3b3b3; font-size: 1.4rem; }
                .side-btn:hover { color: #fff; transform: scale(1.1); }
                .play-btn { background: #fff; color: #000; border-radius: 50%; width: 38px; height: 38px; font-size: 1.2rem; box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
                .play-btn:hover { background: #1DB954; color: #fff; transform: scale(1.08); }
                input[type=range] { -webkit-appearance: none; background: transparent; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 12px; border-radius: 50%; background: #fff; cursor: pointer; margin-top: -4px; }
                input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #4f4f4f; border-radius: 2px; }
                .progress-bar:hover::-webkit-slider-runnable-track { background: #1DB954; }
            `}</style>
        </div>
    );
}

const containerStyle = { position: 'fixed', bottom: 0, left: 0, width: '100%', height: '90px', backgroundColor: '#181818', borderTop: '1px solid #282828', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: 'white', zIndex: 9999, boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' };

export default WebPlayback;