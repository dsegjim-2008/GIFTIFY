import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Search, Plus, Check, Play, Star, FolderPlus, Disc3, Music, UserPlus, ArrowLeft, ListMusic, Trash2, Pencil } from 'lucide-react';
import WebPlayback from '../components/WebPlayback';
import './Dashboard.css';

function Dashboard({ user, setUser, spotifyToken, spotifyId, view, setView }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
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

    const [myPlaylists, setMyPlaylists] = useState([]);
    const [followedArtists, setFollowedArtists] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(null);
    
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistSongs, setPlaylistSongs] = useState([]);

    const config = { headers: { Authorization: `Bearer ${spotifyToken}`, 'X-Spotify-Id': spotifyId } };

    useEffect(() => {
        if (spotifyId) {
            axios.get('http://127.0.0.1:3001/api/users/profile', config).then(res => setUser(res.data));
            axios.get('http://127.0.0.1:3001/api/users/playlists', config).then(res => setMyPlaylists(res.data));
            axios.get('http://127.0.0.1:3001/api/users/followed-artists', config).then(res => setFollowedArtists(res.data));
        }
    }, [spotifyId, spotifyToken, view]); 

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setView('inicio');
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/search?query=${searchQuery}`, config);
            setSearchResults(res.data);
            setSelectedArtist(null);
            setSelectedAlbum(null);
        } catch (error) { console.error(error); }
    };

    const selectArtist = async (artist) => {
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
        } catch (error) { console.error("Error cargando canciones", error); } 
        finally { setLoading(false); }
    };

    const toggleFollow = async () => {
        const artistData = { id: selectedArtist.id, name: selectedArtist.name, image: selectedArtist.images[0]?.url };
        const res = await axios.post('http://127.0.0.1:3001/api/users/follow-artist', { artist: artistData }, config);
        setIsFollowing(res.data.followed);
        const fresh = await axios.get('http://127.0.0.1:3001/api/users/followed-artists', config);
        setFollowedArtists(fresh.data);
    };

    // --- PLAYLISTS: CREAR CON IMAGEN LOCAL ---
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
            background: '#1a1f3a',
            color: '#fff',
            confirmButtonColor: '#1DB954',
            cancelButtonColor: '#d33',
            customClass: { popup: 'glass-effect' },
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                const file = document.getElementById('swal-input-file').files[0];
                if (!name) Swal.showValidationMessage('¡El nombre es obligatorio!');
                return { name, file };
            }
        });

        if (formValues) {
            try {
                // Usamos FormData en lugar de JSON para poder enviar el archivo al servidor
                const formData = new FormData();
                formData.append('name', formValues.name);
                if (formValues.file) formData.append('image', formValues.file);

                await axios.post('http://127.0.0.1:3001/api/users/playlists', formData, {
                    headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
                });
                
                const res = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(res.data);
                Swal.fire({ title: '¡Creada!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    // --- PLAYLISTS: EDITAR CON IMAGEN LOCAL ---
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
            background: '#1a1f3a',
            color: '#fff',
            confirmButtonColor: '#1DB954',
            cancelButtonColor: '#d33',
            customClass: { popup: 'glass-effect' },
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

                const res = await axios.put(`http://127.0.0.1:3001/api/users/playlists/${selectedPlaylist.id}`, formData, {
                    headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
                });
                
                setSelectedPlaylist(res.data); // Actualiza la cabecera actual
                const freshPlaylists = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(freshPlaylists.data); // Actualiza las tarjetas
                
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
            Swal.fire({ title: 'Añadida correctamente', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
        } catch(e) { console.error(e); }
    };

    const removeFromPlaylist = async (playlistId, trackId) => {
        try {
            await axios.delete(`http://127.0.0.1:3001/api/users/playlists/remove-song`, { data: { playlistId, trackId }, ...config });
            setPlaylistSongs(prev => prev.filter(t => t.spotify_track_id !== trackId));
            Swal.fire({ title: 'Canción eliminada', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
        } catch(e) { console.error(e); }
    };

    const playContent = (uri) => {
        if (!spotifyToken) return Swal.fire({ title: 'Spotify Desconectado', text: 'Necesitas iniciar sesión para reproducir canciones.', icon: 'warning', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954' });
        setCurrentUri(uri);
        if (selectedArtist) setPlayingArtistData({ id: selectedArtist.id, name: selectedArtist.name });
    };

    const formatDuration = (ms) => {
        if (!ms) return '';
        const m = Math.floor(ms / 60000);
        const s = ((ms % 60000) / 1000).toFixed(0);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const currentList = activeTab === 'albums' ? albums : activeTab === 'eps' ? eps : singles;

    const renderContent = () => {
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
                                <h3 style={{fontSize: '2rem'}}>{selectedPlaylist.name}</h3>
                                <p>{playlistSongs.length} canciones en esta lista</p>
                                
                                {/* BOTÓN DE EDITAR (No se muestra en Favoritos) */}
                                {!selectedPlaylist.is_favorites_type && (
                                    <button 
                                        className="back-button" 
                                        onClick={editPlaylist}
                                        style={{marginTop:'10px', display:'flex', alignItems:'center', gap:'6px', padding: '6px 12px'}}
                                    >
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
                                {playlistSongs.length === 0 && <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>Esta lista está vacía.</p>}
                                {playlistSongs.map((track, index) => (
                                    <div key={track.id} className="track-item">
                                        <span style={{ width: '30px', textAlign: 'center', color: '#bbb' }}>{index + 1}</span>
                                        <img src={track.image_url} style={{width: '40px', height: '40px', borderRadius: '4px'}} alt=""/>
                                        <div className="track-info">
                                            <div className="track-name">{track.track_name}</div>
                                            <div className="track-artist">{track.artist_name}</div>
                                        </div>
                                        <button className="track-play-button" style={{background:'rgba(255, 0, 0, 0.1)', color:'#ff4d4d', border:'1px solid #ff4d4d', display:'flex', alignItems:'center', gap:'4px'}} 
                                            onClick={() => removeFromPlaylist(selectedPlaylist.id, track.spotify_track_id)}>
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

        return (
            <>
                {!selectedArtist && searchResults.length > 0 && (
                    <div className="results-section">
                        <h2>Resultados</h2>
                        <div className="grid-container">
                            {searchResults.map(artist => (
                                <div key={artist.id} className="artist-card" onClick={() => selectArtist(artist)}>
                                    <img src={artist.images[1]?.url} className="artist-image" alt="" />
                                    <div className="artist-name">{artist.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                            <button className="back-button" style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px'}} onClick={() => setSelectedArtist(null)}>
                                <ArrowLeft size={16} /> Volver
                            </button>
                        </div>
                        
                        <div className="tabs-container">
                             <button className={activeTab === 'albums' ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab('albums')}>
                                <span style={{display:'flex', alignItems:'center', gap:'6px'}}><Disc3 size={16} /> Álbumes ({albums.length})</span>
                             </button>
                             <button className={activeTab === 'eps' ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab('eps')}>
                                <span style={{display:'flex', alignItems:'center', gap:'6px'}}><Disc3 size={16} /> EPs ({eps.length})</span>
                             </button>
                             <button className={activeTab === 'singles' ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab('singles')}>
                                <span style={{display:'flex', alignItems:'center', gap:'6px'}}><Music size={16} /> Singles ({singles.length})</span>
                             </button>
                        </div>

                        {loading ? <div className="loading-spinner"></div> : (
                            <div className="tracklist">
                                {currentList.length === 0 && <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No hay contenido disponible.</p>}
                                {currentList.map(item => (
                                    <div key={item.id} className="track-item">
                                        <img src={item.image} style={{width: '50px', height: '50px', borderRadius: '4px'}} alt=""/>
                                        <div className="track-info" style={{cursor: 'pointer'}} onClick={() => selectAlbum(item)}>
                                            <div className="track-name">{item.name}</div>
                                            <div className="track-artist">
                                                {item.release_date?.slice(0, 4)} · {item.total_tracks} {item.total_tracks === 1 ? 'canción' : 'canciones'}
                                            </div>
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
                                {albumTracks.map((track) => (
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
                                        <button className="track-play-button" style={{background:'#1DB954', display:'flex', alignItems:'center', gap:'4px'}} onClick={() => playContent(track.uri)}>
                                            <Play size={14} fill="currentColor" /> Play
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="dashboard-container">
            <div className="top-search-bar">
                <form className="search-form compact-search" onSubmit={handleSearch}>
                    <div className="search-input-wrapper">
                        <span className="search-icon-inside" style={{display:'flex', alignItems:'center'}}><Search size={18} /></span>
                        <input type="text" className="search-input with-icon" value={searchQuery} 
                               onChange={e => setSearchQuery(e.target.value)} placeholder="¿Qué buscamos?" />
                    </div>
                    <button type="submit" className="search-button">Buscar</button>
                </form>
            </div>

            <div className="dashboard-scrollable-content">
                {renderContent()}
            </div>

            {showPlaylistModal && (
                <div className="playlist-modal-overlay">
                    <div className="playlist-modal">
                        <h3 style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}><FolderPlus size={20}/> Añadir a...</h3>
                        <p style={{fontSize:'0.8rem', color:'#888', marginBottom:'20px'}}>{showPlaylistModal.name}</p>
                        <div className="modal-options">
                            {myPlaylists.map(p => (
                                <button key={p.id} onClick={() => addToPlaylist(p.id, showPlaylistModal)} style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    {p.is_favorites_type ? <Star size={16} color="#FFD662" fill="#FFD662"/> : <Music size={16} color="#00D9FF" />} 
                                    {p.name}
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