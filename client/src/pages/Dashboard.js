import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Search, Plus, Check, Play, Star, FolderPlus, Disc3, Music, UserPlus, ArrowLeft, Trash2, Pencil, ShoppingBag, Clock, ListMusic, Gift } from 'lucide-react';
import WebPlayback from '../components/WebPlayback';
import './Dashboard.css';

function Dashboard({ user, setUser, spotifyToken, spotifyId, view, setView }) {
    // --- ESTADOS ---
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState({ artists: [], tracks: [] });
    // NUEVO ESTADO: Controla si el menú desplegable está visible
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [albums, setAlbums] = useState([]);
    const [eps, setEps] = useState([]);
    const [singles, setSingles] = useState([]);
    const [activeTab, setActiveTab] = useState('albums');
    
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [albumTracks, setAlbumTracks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentUri, setCurrentUri] = useState(null);
    const [playingArtistData, setPlayingArtistData] = useState(null);

    const [resolvingUri, setResolvingUri] = useState(null);

    const [myPlaylists, setMyPlaylists] = useState([]);
    const [followedArtists, setFollowedArtists] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(null);
    
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistSongs, setPlaylistSongs] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [redeemedRewards, setRedeemedRewards] = useState([]);

    const [homeFeed, setHomeFeed] = useState(null);
    const [selectedDynamicList, setSelectedDynamicList] = useState(null);

    const config = { headers: { Authorization: `Bearer ${spotifyToken}`, 'X-Spotify-Id': spotifyId } };

    // --- EFECTOS ---
    useEffect(() => {
        if (spotifyId) {
            axios.get('http://127.0.0.1:3001/api/users/profile', config).then(res => setUser(res.data));
            axios.get('http://127.0.0.1:3001/api/users/playlists', config).then(res => setMyPlaylists(res.data));
            axios.get('http://127.0.0.1:3001/api/users/followed-artists', config).then(res => setFollowedArtists(res.data));
            axios.get('http://127.0.0.1:3001/api/users/rewards', config).then(res => setRewards(res.data));
        }
    }, [spotifyId, spotifyToken, view]); 

    useEffect(() => {
        // Solo recarga el feed si estás en inicio y no viendo a un artista
        if (spotifyToken && view === 'inicio' && !selectedArtist) {
            axios.get('http://127.0.0.1:3001/api/spotify/home-feed', config)
                 .then(res => setHomeFeed(res.data))
                 .catch(err => console.error(err));
        }
    }, [spotifyToken, view, selectedArtist]);

    useEffect(() => {
        if (view === 'perfil') {
            axios.get('http://127.0.0.1:3001/api/users/redeemed', config)
                 .then(res => setRedeemedRewards(res.data))
                 .catch(err => console.error(err));
        }
    }, [view]);

    useEffect(() => { setSelectedDynamicList(null); }, [view, searchQuery]);

    // --- NUEVO EFECTO: BÚSQUEDA EN VIVO (DEBOUNCE) ---
    useEffect(() => {
        // Si el usuario borra todo el texto, limpiamos el panel inmediatamente
        if (!searchQuery.trim()) {
            setSearchResults({ artists: [], tracks: [] });
            setIsSearchOpen(false);
            return;
        }

        // Configuramos un temporizador para no bombardear a la API con cada letra
        const delayDebounceFn = setTimeout(async () => {
            try {
                // Hacemos la petición a nuestra ruta de búsqueda (Deezer)
                const res = await axios.get(`http://127.0.0.1:3001/api/spotify/search?query=${encodeURIComponent(searchQuery)}`, config);
                setSearchResults(res.data);
                setIsSearchOpen(true); // Desplegamos el panel con los resultados
            } catch (error) {
                console.error("Error en la búsqueda en vivo:", error);
            }
        }, 400); // 400 milisegundos de espera tras la última pulsación de tecla

        // Función de limpieza: si el usuario teclea algo antes de los 400ms, reiniciamos el reloj
        return () => clearTimeout(delayDebounceFn);
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    // --- FUNCIONES ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) { 
            setSearchResults({ artists: [], tracks: [] }); 
            setIsSearchOpen(false);
            return; 
        }
        
        // Ya no cambiamos la vista, te dejamos donde estés (Dashboard, Perfil, etc)
        setLoading(true);
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/search?query=${searchQuery}`, config);
            setSearchResults(res.data);
            setIsSearchOpen(true); // Abre el menú desplegable con los resultados
        } catch (error) { 
            console.error(error); 
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults({ artists: [], tracks: [] });
        setIsSearchOpen(false);
        setSelectedArtist(null);
    };

    const selectArtist = async (artist) => {
        setIsSearchOpen(false); // Cierra el panel de búsqueda
        setSearchQuery("");     // Limpia la barra superior
        setSelectedArtist(artist);
        setSelectedAlbum(null);
        setActiveTab('albums');
        setView('inicio');
        setLoading(true);
        setIsFollowing(followedArtists.some(a => a.spotify_artist_id === artist.id));
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/artist-tracks?id=${artist.id}`, config);
            setAlbums(res.data.albums || []);
            setEps(res.data.eps || []);
            setSingles(res.data.singles || []);
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    const selectAlbum = async (album) => {
        setSelectedAlbum(album);
        setAlbumTracks([]);
        setLoading(true);
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/album-tracks?id=${album.id}`, config);
            setAlbumTracks(res.data);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    const toggleFollow = async () => {
        const artistData = { id: selectedArtist.id, name: selectedArtist.name, image: selectedArtist.images[0]?.url };
        const res = await axios.post('http://127.0.0.1:3001/api/users/follow-artist', { artist: artistData }, config);
        setIsFollowing(res.data.followed);
        const fresh = await axios.get('http://127.0.0.1:3001/api/users/followed-artists', config);
        setFollowedArtists(fresh.data);
    };

    const createPlaylist = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Crear nueva Lista',
            html:
                '<input id="swal-input-name" class="swal2-input" placeholder="Nombre de la lista" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">' +
                '<p style="font-size: 0.8rem; color: #888; margin-top: 15px; margin-bottom: 5px;">Subir portada (Opcional):</p>' +
                '<input type="file" id="swal-input-file" accept="image/*" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; padding: 10px; border-radius: 8px;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#d33',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                const file = document.getElementById('swal-input-file').files[0];
                if (!name) Swal.showValidationMessage('¡El nombre es obligatorio!');
                return { name, file };
            }
        });

        if (formValues) {
            try {
                const formData = new FormData();
                formData.append('name', formValues.name);
                if (formValues.file) formData.append('image', formValues.file);
                await axios.post('http://127.0.0.1:3001/api/users/playlists', formData, { headers: { ...config.headers, 'Content-Type': 'multipart/form-data' } });
                const res = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(res.data);
                Swal.fire({ title: '¡Creada!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    const editPlaylist = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Lista',
            html:
                `<input id="swal-input-name" class="swal2-input" value="${selectedPlaylist.name}" placeholder="Nombre de la lista" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">` +
                '<p style="font-size: 0.8rem; color: #888; margin-top: 15px; margin-bottom: 5px;">Cambiar portada (Opcional):</p>' +
                '<input type="file" id="swal-input-file" accept="image/*" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; padding: 10px; border-radius: 8px;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#d33',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                const file = document.getElementById('swal-input-file').files[0];
                if (!name) Swal.showValidationMessage('¡El nombre es obligatorio!');
                return { name, file };
            }
        });

        if (formValues) {
            try {
                const formData = new FormData();
                formData.append('name', formValues.name);
                if (formValues.file) formData.append('image', formValues.file);
                const res = await axios.put(`http://127.0.0.1:3001/api/users/playlists/${selectedPlaylist.id}`, formData, { headers: { ...config.headers, 'Content-Type': 'multipart/form-data' } });
                setSelectedPlaylist(res.data);
                const freshPlaylists = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(freshPlaylists.data);
                Swal.fire({ title: '¡Actualizada!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    const openPlaylist = async (playlist) => {
        setSelectedPlaylist(playlist);
        setLoading(true);
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/users/playlists/${playlist.id}/songs`, config);
            setPlaylistSongs(res.data);
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    const addToPlaylist = async (playlistId, track) => {
        try {
            await axios.post('http://127.0.0.1:3001/api/users/playlists/add-song', { playlistId, track }, config);
            setShowPlaylistModal(null);
            Swal.fire({ title: 'Añadida', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
        } catch(e) { console.error(e); }
    };

    const removeFromPlaylist = async (playlistId, trackId) => {
        try {
            await axios.delete(`http://127.0.0.1:3001/api/users/playlists/remove-song`, { data: { playlistId, trackId }, ...config });
            setPlaylistSongs(prev => prev.filter(t => t.spotify_track_id !== trackId));
            Swal.fire({ title: 'Eliminada', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
        } catch(e) { console.error(e); }
    };

    const redeemReward = async (reward) => {
        if (user.points < reward.point_cost) {
            return Swal.fire({ title: 'Puntos insuficientes', text: `Necesitas ${reward.point_cost} puntos.`, icon: 'error', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954' });
        }
        const confirm = await Swal.fire({ title: '¿Confirmar canje?', text: `Vas a gastar ${reward.point_cost} puntos.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, canjear', cancelButtonText: 'Cancelar', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#d33' });
        if (confirm.isConfirmed) {
            try {
                const res = await axios.post('http://127.0.0.1:3001/api/users/redeem', { rewardId: reward.id, cost: reward.point_cost }, config);
                setUser(prev => ({ ...prev, points: res.data.newPoints }));
                Swal.fire({ title: '¡Canje exitoso!', icon: 'success', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954' });
            } catch (error) { Swal.fire({ title: 'Error', icon: 'error', background: '#1a1f3a', color: '#fff' }); }
        }
    };

    const editProfile = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Perfil',
            html:
                `<input id="swal-input-name" class="swal2-input" value="${user?.username || ''}" placeholder="Nombre de usuario" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">` +
                `<input id="swal-input-email" type="email" class="swal2-input" value="${user?.email || ''}" placeholder="Correo electrónico" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#d33',
            preConfirm: () => {
                return {
                    username: document.getElementById('swal-input-name').value,
                    email: document.getElementById('swal-input-email').value
                }
            }
        });
    
        if (formValues) {
            try {
                await axios.put('http://127.0.0.1:3001/api/users/update-profile', formValues, config);
                setUser(prev => ({ ...prev, username: formValues.username, email: formValues.email }));
                Swal.fire({ title: '¡Actualizado!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    const playContent = async (uri, item = null, trackInfo = null) => {
        if (!spotifyToken) return Swal.fire({ title: 'Spotify Desconectado', icon: 'warning', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954' });

        let finalUri = uri;

        if (!finalUri && trackInfo?.name && trackInfo?.artist) {
            const resolveKey = `${trackInfo.name}-${trackInfo.artist}`;
            setResolvingUri(resolveKey);
            try {
                const res = await axios.get(
                    `http://127.0.0.1:3001/api/spotify/find-track-uri?name=${encodeURIComponent(trackInfo.name)}&artist=${encodeURIComponent(trackInfo.artist)}`,
                    config
                );
                finalUri = res.data.uri;
            } catch (e) {
                console.error('No se pudo resolver la URI:', e);
            }
            setResolvingUri(null);
        }

        if (!finalUri) {
            return Swal.fire({ title: 'No disponible', text: 'Esta canción no está disponible en tu cuenta de Spotify.', icon: 'info', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954' });
        }

        setCurrentUri(finalUri);
        if (item && item.artist_name) setPlayingArtistData({ id: item.artist_name, name: item.artist_name });
        else if (selectedArtist) setPlayingArtistData({ id: selectedArtist.id, name: selectedArtist.name });
    };

    const formatDuration = (ms) => {
        if (!ms) return '';
        const m = Math.floor(ms / 60000);
        const s = ((ms % 60000) / 1000).toFixed(0);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentList = activeTab === 'albums' ? albums : activeTab === 'eps' ? eps : singles;

    const renderContent = () => {
        if (view === 'perfil') {
            return (
                <div className="profile-wrapper">
                    <div className="profile-header-banner">
                        <div className="profile-avatar-large">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="profile-header-info">
                            <h2>{user?.username || 'Usuario'}</h2>
                            <p>{user?.email || 'Sin correo vinculado'}</p>
                            <div className="profile-points-badge">
                                <Star size={16} fill="currentColor" /> {user?.points || 0} puntos
                            </div>
                        </div>
                        <button className="edit-profile-btn" onClick={editProfile}>
                            <Pencil size={16} /> Editar Datos
                        </button>
                    </div>
        
                    <div className="profile-inventory">
                        <h3><Gift size={20} style={{verticalAlign: 'middle', marginRight: '8px'}}/> Mi Inventario (Recompensas Canjeadas)</h3>
                        {redeemedRewards.length === 0 ? (
                            <div className="empty-inventory">Aún no has canjeado ninguna recompensa. ¡Ve a la tienda!</div>
                        ) : (
                            <div className="grid-container" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginTop: '20px'}}>
                                {redeemedRewards.map(reward => (
                                    <div key={reward.id} className="reward-card owned-reward">
                                        <img src={reward.photo_url} alt={reward.name} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius: '8px', marginBottom: '10px'}} />
                                        <h4>{reward.name}</h4>
                                        <p style={{fontSize:'0.8rem', color:'var(--primary-cyan)', marginTop:'5px'}}>✓ Obtenido el {new Date(reward.redeemed_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (view === 'recompensas') {
            return (
                <div className="results-section">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                        <h2><ShoppingBag size={24} style={{verticalAlign: 'middle', marginRight: '10px'}}/> Tienda de Recompensas</h2>
                        <div style={{background:'var(--card-bg)', padding:'10px 20px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
                            <span style={{fontSize:'1.2rem', fontWeight:'bold', color:'var(--primary-yellow)'}}><Star fill="currentColor" size={16}/> {user?.points || 0} pts</span>
                        </div>
                    </div>
                    <div className="grid-container" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'}}>
                        {rewards.map(reward => (
                            <div key={reward.id} className="reward-store-card">
                                <img src={reward.photo_url} alt={reward.name} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius: '8px', marginBottom: '10px'}} />
                                <h3>{reward.name}</h3>
                                <p style={{fontSize:'0.8rem', color:'var(--text-secondary)', flex: 1, marginBottom: '10px'}}>{reward.description}</p>
                                <button className="track-play-button" style={{width:'100%', background: user?.points >= reward.point_cost ? 'var(--primary-cyan)' : '#333', cursor: user?.points >= reward.point_cost ? 'pointer' : 'not-allowed'}} onClick={() => redeemReward(reward)}>
                                    Canjear ({reward.point_cost} pts)
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (view === 'artistas') {
            return (
                <div className="results-section">
                    <h2>Artistas que sigues</h2>
                    <div className="grid-container">
                        {followedArtists.map(a => (
                            <div key={a.id} className="artist-card" onClick={() => selectArtist({id: a.spotify_artist_id, name: a.name, images: [{url: a.image_url}]})}>
                                <img src={a.image_url} className="artist-image" alt="" />
                                <div className="artist-name">{a.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (view === 'listas') {
            if (selectedPlaylist) {
                return (
                    <div className="search-section">
                        <div className="artist-header">
                            <img src={selectedPlaylist.photo_url} className="artist-header-image" style={{borderRadius: '8px', width: '120px', height: '120px'}} alt="" />
                            <div className="artist-header-info">
                                <h3>{selectedPlaylist.name}</h3>
                                <p>{playlistSongs.length} canciones</p>
                                {!selectedPlaylist.is_favorites_type && (
                                    <button className="back-button" onClick={editPlaylist} style={{marginTop:'10px', display:'flex', alignItems:'center', gap:'6px', padding: '6px 12px'}}>
                                        <Pencil size={14}/> Editar Lista
                                    </button>
                                )}
                            </div>
                        </div>
                        <button className="back-button" style={{display:'flex', alignItems:'center', gap:'6px', marginBottom: '20px'}} onClick={() => setSelectedPlaylist(null)}>
                            <ArrowLeft size={16} /> Volver a Tus Listas
                        </button>
                        {loading ? <div className="loading-spinner"></div> : (
                            <div className="tracklist">
                                {playlistSongs.map((track, index) => (
                                    <div key={track.id} className="track-item">
                                        <span style={{ width: '30px', textAlign: 'center', color: '#bbb' }}>{index + 1}</span>
                                        <img src={track.image_url} style={{width: '40px', height: '40px', borderRadius: '4px'}} alt=""/>
                                        <div className="track-info">
                                            <div className="track-name">{track.track_name}</div>
                                            <div className="track-artist">{track.artist_name}</div>
                                        </div>
                                        <button className="track-play-button" style={{background:'rgba(255, 0, 0, 0.1)', color:'#ff4d4d', border:'1px solid #ff4d4d', display:'flex', alignItems:'center', gap:'4px'}} onClick={() => removeFromPlaylist(selectedPlaylist.id, track.spotify_track_id)}>
                                            <Trash2 size={14}/> Quitar
                                        </button>
                                        <button className="track-play-button" style={{background:'#1DB954', display:'flex', alignItems:'center', gap:'4px'}} onClick={() => playContent(`spotify:track:${track.spotify_track_id}`)}>
                                            <Play size={14} fill="currentColor" /> Play
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div className="results-section">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                        <h2>Tus Listas de Reproducción</h2>
                        <button className="search-button" style={{display:'flex', alignItems:'center', gap:'8px'}} onClick={createPlaylist}>
                            <Plus size={18} /> Crear Nueva
                        </button>
                    </div>
                    <div className="grid-container">
                        {myPlaylists.map(p => (
                            <div key={p.id} className="artist-card" style={{borderRadius: '8px'}} onClick={() => openPlaylist(p)}>
                                <img src={p.photo_url} className="artist-image" style={{borderRadius: '8px'}} alt="" />
                                <div className="artist-name">{p.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (view === 'inicio' && selectedDynamicList) {
            return (
                <div className="search-section">
                    <div className="artist-header">
                        <div className="dynamic-header-mosaic">
                            {selectedDynamicList.images.map((img, i) => <img key={i} src={img} alt=""/>)}
                        </div>
                        <div className="artist-header-info" style={{marginLeft: '20px'}}>
                            <h3>{selectedDynamicList.title}</h3>
                            <p style={{color: 'var(--text-secondary)'}}>{selectedDynamicList.subtitle}</p>
                            <p style={{marginTop:'5px', color:'var(--text-secondary)', fontSize: '0.9rem'}}>{selectedDynamicList.tracks.length} canciones</p>
                        </div>
                        <button className="track-play-button" style={{ marginLeft: 'auto', background: '#1DB954', padding: '12px 24px', display:'flex', alignItems:'center', gap:'6px' }} 
                            onClick={() => playContent(selectedDynamicList.tracks[0]?.uri, {artist_name: selectedDynamicList.tracks[0]?.artist_name}, {name: selectedDynamicList.tracks[0]?.track_name, artist: selectedDynamicList.tracks[0]?.artist_name})}>
                            <Play size={16} fill="currentColor" /> Reproducir todo
                        </button>
                    </div>
                    <button className="back-button" style={{display:'flex', alignItems:'center', gap:'6px', marginBottom: '20px'}} onClick={() => setSelectedDynamicList(null)}>
                        <ArrowLeft size={16} /> Volver a Inicio
                    </button>

                    <div className="tracklist">
                        {selectedDynamicList.tracks.map((track, index) => {
                            const isResolving = resolvingUri === `${track.track_name}-${track.artist_name}`;
                            return (
                                <div key={index} className="track-item">
                                    <span style={{ width: '30px', textAlign: 'center', color: '#bbb' }}>{index + 1}</span>
                                    <img src={track.image_url} style={{width: '40px', height: '40px', borderRadius: '4px'}} alt=""/>
                                    <div className="track-info">
                                        <div className="track-name">{track.track_name}</div>
                                        <div className="track-artist">{track.artist_name}</div>
                                    </div>
                                    <button className="track-play-button" style={{background:'#6B1FB5', display:'flex', alignItems:'center', gap:'4px'}} 
                                        onClick={() => setShowPlaylistModal({id: track.spotify_track_id, name: track.track_name, artist: track.artist_name, image: track.image_url, duration_ms: track.duration_ms || 0})}>
                                        <Plus size={14}/> Añadir
                                    </button>
                                    <button 
                                        className="track-play-button" 
                                        style={{background: isResolving ? '#555' : '#1DB954', display:'flex', alignItems:'center', gap:'4px'}} 
                                        disabled={isResolving}
                                        onClick={() => playContent(track.uri, {artist_name: track.artist_name}, {name: track.track_name, artist: track.artist_name})}
                                    >
                                        {isResolving ? '...' : <><Play size={14} fill="currentColor" /> Play</>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (view === 'inicio' && !selectedArtist && homeFeed) {
            return (
                <div className="home-feed-wrapper">
                    {homeFeed.recentlyPlayed.length > 0 && (
                        <div className="shelf-section">
                            <h2 className="shelf-title"><Clock size={22} color="var(--primary-cyan)" /> Recientemente escuchado</h2>
                            <div className="horizontal-scroll">
                                {homeFeed.recentlyPlayed.map(item => (
                                    <div key={item.id} className="horizontal-card" onClick={() => playContent(item.uri, {artist_name: item.artist})}>
                                        <div className="horizontal-image-container">
                                            <img src={item.image} className="horizontal-image" alt="" />
                                            <div className="play-overlay"><Play fill="currentColor" size={24} /></div>
                                        </div>
                                        <div className="horizontal-title">{item.name}</div>
                                        <div className="horizontal-subtitle">{item.artist}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="dynamic-mixes-container">
                        {homeFeed.mixRelacionados && homeFeed.mixRelacionados.tracks.length > 0 && (
                            <div className="dynamic-mix-box mix-box" onClick={() => setSelectedDynamicList(homeFeed.mixRelacionados)}>
                                <div className="dynamic-mix-title">{homeFeed.mixRelacionados.title}</div>
                                <div className="dynamic-mix-subtitle">{homeFeed.mixRelacionados.subtitle}</div>
                                <div className="dynamic-mix-images">
                                    {homeFeed.mixRelacionados.images.map((img, i) => <img key={i} src={img} alt="" />)}
                                </div>
                            </div>
                        )}
                        {homeFeed.radarNovedades && homeFeed.radarNovedades.tracks.length > 0 && (
                            <div className="dynamic-mix-box radar-box" onClick={() => setSelectedDynamicList(homeFeed.radarNovedades)}>
                                <div className="dynamic-mix-title">{homeFeed.radarNovedades.title}</div>
                                <div className="dynamic-mix-subtitle">{homeFeed.radarNovedades.subtitle}</div>
                                <div className="dynamic-mix-images">
                                    {homeFeed.radarNovedades.images.map((img, i) => <img key={i} src={img} alt="" />)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <>
                {selectedArtist && !selectedAlbum && (
                    <div className="search-section">
                        <div className="artist-header">
                            <img src={selectedArtist.images[0]?.url} className="artist-header-image" alt="" />
                            <div className="artist-header-info">
                                <h3>{selectedArtist.name}</h3>
                                <button className={isFollowing ? "back-button active" : "back-button"} onClick={toggleFollow} style={{marginTop:'10px', display:'flex', alignItems:'center', gap:'6px'}}>
                                    {isFollowing ? <><Check size={16}/> Siguiendo</> : <><UserPlus size={16}/> Seguir Artista</>}
                                </button>
                            </div>
                            <button className="back-button" style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px'}} onClick={clearSearch}>
                                <ArrowLeft size={16} /> Volver a Inicio
                            </button>
                        </div>
                        
                        <div className="tabs-container">
                             <button className={activeTab === 'albums' ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab('albums')}><span style={{display:'flex', alignItems:'center', gap:'6px'}}><Disc3 size={16} /> Álbumes ({albums.length})</span></button>
                             <button className={activeTab === 'eps' ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab('eps')}><span style={{display:'flex', alignItems:'center', gap:'6px'}}><Disc3 size={16} /> EPs ({eps.length})</span></button>
                             <button className={activeTab === 'singles' ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab('singles')}><span style={{display:'flex', alignItems:'center', gap:'6px'}}><Music size={16} /> Singles ({singles.length})</span></button>
                        </div>

                        {loading ? <div className="loading-spinner"></div> : (
                            <div className="tracklist">
                                {currentList.length === 0 && <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No hay contenido disponible.</p>}
                                {currentList.map(item => (
                                    <div key={item.id} className="track-item">
                                        <img src={item.image} style={{width: '50px', height: '50px', borderRadius: '4px'}} alt=""/>
                                        <div className="track-info" style={{cursor: 'pointer'}} onClick={() => selectAlbum(item)}>
                                            <div className="track-name">{item.name}</div>
                                            <div className="track-artist">{item.release_date?.slice(0, 4)} · {item.total_tracks} {item.total_tracks === 1 ? 'canción' : 'canciones'}</div>
                                        </div>
                                        <button className="track-play-button" style={{background:'rgba(26, 31, 58, 0.4)', color:'white', display:'flex', alignItems:'center', gap:'4px'}} onClick={() => selectAlbum(item)}>
                                            <ListMusic size={14}/> Ver canciones
                                        </button>
                                        <button className="track-play-button" style={{background:'#1DB954', display:'flex', alignItems:'center', gap:'4px'}} onClick={() => playContent(item.uri)}>
                                            <Play size={14} fill="currentColor" /> Play
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedArtist && selectedAlbum && (
                    <div className="search-section">
                        <div className="artist-header">
                            <img src={selectedAlbum.image} className="artist-header-image" style={{borderRadius: '8px'}} alt="" />
                            <div className="artist-header-info">
                                <h3>{selectedAlbum.name}</h3>
                                <p>{selectedAlbum.release_date?.slice(0, 4)} · {selectedAlbum.total_tracks} canciones</p>
                            </div>
                            <button className="track-play-button" style={{ marginLeft: 'auto', background: '#1DB954', padding: '12px 24px', display:'flex', alignItems:'center', gap:'6px' }} onClick={() => playContent(selectedAlbum.uri)}>
                                <Play size={16} fill="currentColor" /> Reproducir todo
                            </button>
                        </div>
                        
                        <button className="back-button" style={{display:'flex', alignItems:'center', gap:'6px', marginBottom: '20px'}} onClick={() => setSelectedAlbum(null)}>
                            <ArrowLeft size={16} /> Volver a {selectedArtist.name}
                        </button>

                        {loading ? <div className="loading-spinner"></div> : (
                            <div className="tracklist">
                                {albumTracks.map((track) => {
                                    const isResolving = resolvingUri === `${track.name}-${selectedArtist.name}`;
                                    return (
                                        <div key={track.id} className="track-item">
                                            <span style={{ width: '30px', textAlign: 'center', color: '#bbb' }}>{track.track_number}</span>
                                            <div className="track-info">
                                                <div className="track-name">{track.name}</div>
                                                <div className="track-duration">{formatDuration(track.duration_ms)}</div>
                                            </div>
                                            <button className="track-play-button" style={{background:'#6B1FB5', display:'flex', alignItems:'center', gap:'4px'}} 
                                                onClick={() => setShowPlaylistModal({id: track.id, name: track.name, artist: selectedArtist.name, image: selectedAlbum.image, duration_ms: track.duration_ms})}>
                                                <Plus size={14}/> Añadir
                                            </button>
                                            <button 
                                                className="track-play-button" 
                                                style={{background: isResolving ? '#555' : '#1DB954', display:'flex', alignItems:'center', gap:'4px'}} 
                                                disabled={isResolving}
                                                onClick={() => playContent(track.uri, {artist_name: selectedArtist.name}, {name: track.name, artist: selectedArtist.name})}
                                            >
                                                {isResolving ? '...' : <><Play size={14} fill="currentColor" /> Play</>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="dashboard-container">
            <div className="top-search-bar" style={{ position: 'relative', zIndex: 1000 }}>
                <form className="search-form compact-search" onSubmit={handleSearch}>
                    <div className="search-input-wrapper">
                        <span className="search-icon-inside" style={{display:'flex', alignItems:'center'}}><Search size={18} /></span>
                        <input 
                            type="text" 
                            className="search-input with-icon" 
                            value={searchQuery} 
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                if (!e.target.value) setIsSearchOpen(false);
                            }} 
                            placeholder="¿Qué te apetece escuchar?" 
                        />
                    </div>
                </form>

                {/* OVERLAY INVISIBLE PARA CERRAR EL PANEL AL HACER CLIC FUERA */}
                {isSearchOpen && (
                    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999}} onClick={() => setIsSearchOpen(false)} />
                )}

                {/* PANEL FLOTANTE DE RESULTADOS */}
                {isSearchOpen && (searchResults.artists?.length > 0 || searchResults.tracks?.length > 0) && (
                    <div className="search-dropdown-panel" style={{position: 'absolute', top: '100%', left: '0', right: '0', zIndex: 1000}}>
                        
                        {/* CANCIONES */}
                        {searchResults.tracks?.length > 0 && (
                            <div className="dropdown-section">
                                <div className="dropdown-section-title"><Music size={14} style={{verticalAlign:'middle', marginRight:'5px'}}/> Canciones</div>
                                {searchResults.tracks.map((track) => {
                                    const isResolving = resolvingUri === `${track.track_name}-${track.artist_name}`;
                                    return (
                                        <div key={track.id} className="dropdown-track-item">
                                            <img src={track.image_url} alt="" />
                                            <div className="dropdown-track-info">
                                                <div className="dropdown-track-name">{track.track_name}</div>
                                                <div className="dropdown-track-artist">{track.artist_name}</div>
                                            </div>
                                            <button className="track-play-button" style={{background:'#6B1FB5', padding:'6px', display:'flex'}} 
                                                onClick={() => {
                                                    setIsSearchOpen(false);
                                                    setShowPlaylistModal({id: track.spotify_track_id, name: track.track_name, artist: track.artist_name, image: track.image_url, duration_ms: track.duration_ms || 0});
                                                }}>
                                                <Plus size={14}/>
                                            </button>
                                            <button className="track-play-button" style={{background: isResolving ? '#555' : '#1DB954', padding:'6px', display:'flex'}} 
                                                disabled={isResolving}
                                                onClick={() => {
                                                    playContent(track.uri, {artist_name: track.artist_name}, {name: track.track_name, artist: track.artist_name});
                                                }}>
                                                {isResolving ? '...' : <Play size={14} fill="currentColor" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ARTISTAS */}
                        {searchResults.artists?.length > 0 && (
                            <div className="dropdown-section" style={{marginTop: '20px'}}>
                                <div className="dropdown-section-title"><UserPlus size={14} style={{verticalAlign:'middle', marginRight:'5px'}}/> Artistas</div>
                                <div className="dropdown-artist-grid">
                                    {searchResults.artists.map(artist => (
                                        <div key={artist.id} className="dropdown-artist-card" onClick={() => selectArtist(artist)}>
                                            <img src={artist.images[1]?.url || artist.images[0]?.url || 'http://127.0.0.1:3001/uploads/fav.jpeg'} alt="" />
                                            <div className="dropdown-artist-name">{artist.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
            
            <div className="dashboard-scrollable-content">{renderContent()}</div>

            {showPlaylistModal && (
                <div className="playlist-modal-overlay">
                    <div className="playlist-modal">
                        <h3 style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}><FolderPlus size={20}/> Añadir a...</h3>
                        <p style={{fontSize:'0.8rem', color:'#888', marginBottom:'20px'}}>{showPlaylistModal.name}</p>
                        <div className="modal-options">
                            {myPlaylists.map(p => (
                                <button key={p.id} onClick={() => addToPlaylist(p.id, showPlaylistModal)} style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    {p.is_favorites_type ? <Star size={16} color="#FFD662" fill="#FFD662"/> : <Music size={16} color="#00D9FF" />} {p.name}
                                </button>
                            ))}
                        </div>
                        <button className="back-button" style={{width:'100%', marginTop:'15px'}} onClick={() => setShowPlaylistModal(null)}>Cancelar</button>
                    </div>
                </div>
            )}

            {spotifyToken && <WebPlayback token={spotifyToken} spotifyId={spotifyId} playingArtist={playingArtistData} user={user} setUser={setUser} trackUri={currentUri} />}
        </div>
    );
}

export default Dashboard;