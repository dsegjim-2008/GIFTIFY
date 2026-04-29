import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { SkipBack, Play, Pause, SkipForward, Volume2, Music, Shuffle, PlusCircle } from 'lucide-react';
import './WebPlayback.css';

const defaultTrack = {
    name: "Listo para reproducir",
    album: { images: [{ url: "https://via.placeholder.com/150" }] },
    artists: [{ name: "Selecciona una canción" }]
};

// Añadimos playNext, playPrevious, toggleShuffle e isShuffle a las props
function WebPlayback({ token, trackUri, playingArtist, setUser, spotifyId, setShowPlaylistModal, selectArtist, playNext, playPrevious, toggleShuffle, isShuffle }) {
    const [is_paused, setPaused] = useState(false);
    const [is_active, setActive] = useState(false);
    const [current_track, setTrack] = useState(defaultTrack);
    const [deviceId, setDeviceId] = useState(null);
    const [playerInstance, setPlayerInstance] = useState(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const scriptLoaded = useRef(false);
    const SPOTIFY_API = 'https://api.spotify.com/v1';

    // 1. Inicialización del SDK de Spotify
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
                getOAuthToken: cb => cb(token),
                volume: 0.5
            });
            setPlayerInstance(player);

            player.addListener('ready', ({ device_id }) => {
                setDeviceId(device_id);
                axios.put(SPOTIFY_API + '/me/player', { device_ids: [device_id], play: false }, 
                { headers: { 'Authorization': `Bearer ${token}` } }).catch(e => console.warn("Transferencia manual"));
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

    // 2. Lógica de Reproducción (ESTABLE: 1 Sola Canción)
    useEffect(() => {
        if (!deviceId || !trackUri) return;
        
        const playSong = async () => {
            try {
                // Spotify vuelve a recibir solo uris simples, ¡así no se colapsa!
                const body = typeof trackUri === 'string' && trackUri.includes('album') 
                    ? { context_uri: trackUri } 
                    : { uris: [trackUri] };

                await axios.put(SPOTIFY_API + '/me/player/play?device_id=' + deviceId, body, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) { 
                console.error("Error reproduciendo:", err); 
            }
        };
        
        playSong();
    }, [deviceId, trackUri, token]);

    // 3. Sumar Puntos
    useEffect(() => {
        if (!is_active || is_paused || !spotifyId) return;
        const interval = setInterval(() => {
            axios.post('http://127.0.0.1:3001/api/users/earn', {
                artistId: playingArtist?.id || 'desconocido',
                artistName: playingArtist?.name || 'desconocido'
            }, { headers: { 'Authorization': `Bearer ${token}`, 'X-Spotify-Id': spotifyId } })
            .then(res => { if (setUser && res.data.newPoints) setUser(prev => ({ ...prev, points: res.data.newPoints })); })
            .catch(err => console.error("Error sumando puntos:", err));
        }, 10000); 
        return () => clearInterval(interval);
    }, [is_active, is_paused, playingArtist, setUser, token, spotifyId]);

    // 4. Progreso de la barra de tiempo
    useEffect(() => {
        if (!is_paused && is_active) {
            const interval = setInterval(() => {
                setPosition(prev => (prev + 1000 > duration ? duration : prev + 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [is_paused, is_active, duration]);

    // ==========================================
    // FUNCIONES DE INTERACCIÓN
    // ==========================================
    const formatTime = (ms) => {
        if (!ms) return "0:00";
        const m = Math.floor(ms / 60000);
        const s = ((ms % 60000) / 1000).toFixed(0);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleAddToPlaylist = () => {
        if (!current_track || !setShowPlaylistModal) return;
        const trackData = {
            id: current_track.id || (current_track.uri ? current_track.uri.split(':')[2] : null),
            name: current_track.name,
            artist: current_track.artists.map(a => a.name).join(', '),
            image: current_track.album.images[0]?.url,
            duration_ms: duration
        };
        setShowPlaylistModal(trackData);
    };

    const handleArtistClick = (artist) => {
        if (!artist.uri || !selectArtist) return;
        const artistId = artist.uri.split(':')[2];
        selectArtist({
            id: artistId,
            name: artist.name,
            images: [{ url: current_track.album.images[0]?.url }] 
        });
    };

    if (!deviceId) return (
        <div className="player-loading">
            <Music size={24} style={{marginRight: '10px'}} />
            <span>Conectando con Spotify...</span>
        </div>
    );

    return (
        <div className="player-container">
            <div className="player-track-info">
                <img src={current_track?.album?.images[0]?.url || "https://via.placeholder.com/150"} alt="Álbum" className="player-album-art" />
                <div className="player-track-details">
                    <div className="player-track-name">{current_track?.name}</div>
                    <div className="player-artist-name">
                        {current_track.artists.map((artist, index) => (
                            <span key={index}>
                                <span className="clickable-artist" onClick={() => handleArtistClick(artist)}>
                                    {artist.name}
                                </span>
                                {index < current_track.artists.length - 1 ? ', ' : ''}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="player-controls">
                <div className="player-buttons">
                    {/* Botones conectados a las funciones de React */}
                    <button className="btn-control btn-side" onClick={toggleShuffle} title="Aleatorio">
                        <Shuffle size={20} color={isShuffle ? '#1DB954' : 'currentColor'} />
                    </button>
                    
                    <button className="btn-control btn-side" onClick={playPrevious}>
                        <SkipBack size={24} />
                    </button>
                    <button className="btn-control btn-play" onClick={() => playerInstance?.togglePlay()}>
                        {is_paused ? <Play size={24} fill="currentColor" style={{marginLeft:'4px'}} /> : <Pause size={24} fill="currentColor" />}
                    </button>
                    <button className="btn-control btn-side" onClick={playNext}>
                        <SkipForward size={24} />
                    </button>

                    <button className="btn-control btn-side" onClick={handleAddToPlaylist} title="Añadir a lista">
                        <PlusCircle size={20} />
                    </button>
                </div>

                <div className="player-progress-section">
                    <span className="player-time">{formatTime(position)}</span>
                    <input type="range" min={0} max={duration || 100} value={position}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setPosition(val);
                            playerInstance?.seek(val);
                        }}
                        className="player-progress-bar"
                    />
                    <span className="player-time">{formatTime(duration)}</span>
                </div>
            </div>

            <div className="player-volume-section">
                <Volume2 size={20} className="volume-icon" />
                <input type="range" min={0} max={1} step={0.01} value={volume}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        setVolume(val);
                        playerInstance?.setVolume(val);
                    }}
                    className="player-volume-bar"
                />
            </div>
        </div>
    );
}

export default WebPlayback;