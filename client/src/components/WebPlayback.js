import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { SkipBack, Play, Pause, SkipForward, Volume2, Music } from 'lucide-react';
import './WebPlayback.css';

const defaultTrack = {
    name: "Listo para reproducir",
    album: { images: [{ url: "https://via.placeholder.com/150" }] },
    artists: [{ name: "Selecciona una canción" }]
};

function WebPlayback({ token, trackUri, playingArtist, setUser, spotifyId }) {
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
                axios.put(SPOTIFY_API + '/me/player', {
                    device_ids: [device_id],
                    play: false
                }, { headers: { 'Authorization': `Bearer ${token}` } }).catch(e => console.warn("Transferencia manual"));
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

    useEffect(() => {
        if (!deviceId || !trackUri) return;
        const playSong = async () => {
            try {
                const body = trackUri.includes('album') ? { context_uri: trackUri } : { uris: [trackUri] };
                await axios.put(SPOTIFY_API + '/me/player/play?device_id=' + deviceId, body, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Error reproduciendo:", err);
            }
        };
        playSong();
    }, [deviceId, trackUri, token]);

    useEffect(() => {
        if (!is_active || is_paused || !playingArtist || !spotifyId) return;

        const interval = setInterval(() => {
            axios.post('http://127.0.0.1:3001/api/users/earn', {
                artistId: playingArtist.id,
                artistName: playingArtist.name
            }, {
                headers: { Authorization: `Bearer ${token}`, 'X-Spotify-Id': spotifyId }
            })
            .then(res => {
                if (setUser) setUser(prev => ({ ...prev, points: res.data.newPoints }));
            })
            .catch(err => console.error("Error earn:", err));
        }, 10000);

        return () => clearInterval(interval);
    }, [is_active, is_paused, playingArtist, setUser, token, spotifyId]);

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
                    <div className="player-artist-name">{current_track?.artists?.[0]?.name}</div>
                </div>
            </div>

            <div className="player-controls">
                <div className="player-buttons">
                    <button className="btn-control btn-side" onClick={() => playerInstance?.previousTrack()}>
                        <SkipBack size={24} />
                    </button>
                    <button className="btn-control btn-play" onClick={() => playerInstance?.togglePlay()}>
                        {is_paused ? <Play size={24} fill="currentColor" style={{marginLeft:'4px'}} /> : <Pause size={24} fill="currentColor" />}
                    </button>
                    <button className="btn-control btn-side" onClick={() => playerInstance?.nextTrack()}>
                        <SkipForward size={24} />
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