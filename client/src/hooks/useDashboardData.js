import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

function useDashboardData(user, setUser, spotifyToken, spotifyId, view, setView) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState({ artists: [], tracks: [] });
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

    const [currentQueue, setCurrentQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isShuffle, setIsShuffle] = useState(false);
    const [playbackHistory, setPlaybackHistory] = useState([]);

    const config = { headers: { Authorization: `Bearer ${spotifyToken}`, 'X-Spotify-Id': spotifyId } };

    useEffect(() => {
        if (spotifyId) {
            axios.get('http://127.0.0.1:3001/api/users/profile', config).then(res => setUser(res.data));
            axios.get('http://127.0.0.1:3001/api/users/playlists', config).then(res => setMyPlaylists(res.data));
            axios.get('http://127.0.0.1:3001/api/users/followed-artists', config).then(res => setFollowedArtists(res.data));
            axios.get('http://127.0.0.1:3001/api/users/rewards', config).then(res => setRewards(res.data));
        }
    }, [spotifyId, spotifyToken, view]); 

    useEffect(() => {
        if (spotifyToken && view === 'inicio' && !selectedArtist) {
            axios.get('http://127.0.0.1:3001/api/spotify/home-feed', config).then(res => setHomeFeed(res.data)).catch(err => console.error(err));
        }
    }, [spotifyToken, view, selectedArtist]);

    useEffect(() => {
        if (view === 'perfil') {
            axios.get('http://127.0.0.1:3001/api/users/redeemed', config).then(res => setRedeemedRewards(res.data)).catch(err => console.error(err));
        }
    }, [view]);

    useEffect(() => { setSelectedDynamicList(null); }, [view, searchQuery]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ artists: [], tracks: [] });
            setIsSearchOpen(false);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await axios.get(`http://127.0.0.1:3001/api/spotify/search?query=${encodeURIComponent(searchQuery)}`, config);
                setSearchResults(res.data);
                setIsSearchOpen(true);
            } catch (error) { console.error("Error en búsqueda:", error); }
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = (e) => { e.preventDefault(); if (searchQuery.trim()) setIsSearchOpen(true); };
    const clearSearch = () => { setSearchQuery(""); setSearchResults({ artists: [], tracks: [] }); setIsSearchOpen(false); setSelectedArtist(null); };

    const selectArtist = async (artist) => {
        setIsSearchOpen(false); setSearchQuery(""); setSelectedArtist(artist); setSelectedAlbum(null);
        setActiveTab('albums'); setView('inicio'); setLoading(true);
        setIsFollowing(followedArtists.some(a => a.spotify_artist_id === artist.id));
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/artist-tracks?id=${artist.id}`, config);
            setAlbums(res.data.albums || []); setEps(res.data.eps || []); setSingles(res.data.singles || []);
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    const selectAlbum = async (album) => {
        setSelectedAlbum(album); setAlbumTracks([]); setLoading(true);
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
                '<input id="swal-input-name" class="swal2-input" placeholder="Nombre de la lista" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; margin-bottom: 10px;">' +
                '<input id="swal-input-file" type="file" class="swal2-file" style="background: rgba(26, 31, 58, 0.4); color: #ccc; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; font-size: 0.8rem;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            background: '#1a1f3a',
            color: '#fff',
            confirmButtonColor: '#1DB954', 
            cancelButtonColor: '#555',
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
                if (formValues.file) {
                    formData.append('photo', formValues.file); 
                }

                await axios.post('http://127.0.0.1:3001/api/users/playlists', formData, {
                    headers: { ...config.headers, 'Content-Type': 'multipart/form-data' } 
                });
                
                const res = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(res.data);
                Swal.fire({ title: '¡Creada!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    // --- NUEVO: EDITAR PLAYLIST CON BOTÓN DE ELIMINAR ---
    const editPlaylist = async () => {
        const result = await Swal.fire({
            title: 'Editar Lista',
            html: 
                `<input id="swal-input-name" class="swal2-input" value="${selectedPlaylist.name}" placeholder="Nombre de la lista" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; margin-bottom: 10px;">` +
                `<input id="swal-input-file" type="file" class="swal2-file" style="background: rgba(26, 31, 58, 0.4); color: #ccc; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; font-size: 0.8rem;">`,
            focusConfirm: false,
            showCancelButton: true,
            showDenyButton: true, // Esto activa el botón rojo extra
            confirmButtonText: 'Guardar',
            denyButtonText: 'Borrar Lista',
            cancelButtonText: 'Cancelar',
            background: '#1a1f3a',
            color: '#fff',
            confirmButtonColor: '#1DB954', 
            denyButtonColor: '#d33',
            cancelButtonColor: '#555',
            preConfirm: () => ({
                name: document.getElementById('swal-input-name').value,
                file: document.getElementById('swal-input-file').files[0]
            })
        });

        // 1. Si el usuario pulsó el botón rojo de "Borrar Lista"
        if (result.isDenied) {
            const confirmDelete = await Swal.fire({
                title: '¿Estás seguro?',
                text: "Se borrará la lista y todas sus canciones. No podrás deshacerlo.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#555',
                confirmButtonText: 'Sí, borrar todo',
                cancelButtonText: 'Cancelar',
                background: '#1a1f3a', color: '#fff'
            });

            if (confirmDelete.isConfirmed) {
                try {
                    await axios.delete(`http://127.0.0.1:3001/api/users/playlists/${selectedPlaylist.id}`, config);
                    setMyPlaylists(prev => prev.filter(p => p.id !== selectedPlaylist.id));
                    setSelectedPlaylist(null); // Limpiamos la vista actual
                    Swal.fire({ title: 'Lista Borrada', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
                } catch(e) { console.error(e); }
            }
        } 
        // 2. Si el usuario pulsó en "Guardar" cambios
        else if (result.isConfirmed && result.value) {
            try {
                const formData = new FormData();
                formData.append('name', result.value.name);
                if (result.value.file) formData.append('photo', result.value.file);

                const res = await axios.put(`http://127.0.0.1:3001/api/users/playlists/${selectedPlaylist.id}`, formData, {
                    headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
                });

                setSelectedPlaylist(prev => ({ ...prev, ...res.data }));
                const freshPlaylists = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(freshPlaylists.data);

                Swal.fire({ title: '¡Actualizada!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    const openPlaylist = async (playlist) => {
        setSelectedPlaylist(playlist); setLoading(true);
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
        } catch(e) { 
            setShowPlaylistModal(null);
            if (e.response && e.response.status === 400) {
                Swal.fire({ title: 'Ya está en la lista', text: 'Esta canción ya forma parte de esta playlist.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000, background: '#1a1f3a', color: '#fff' });
            } else {
                Swal.fire({ title: 'Error', text: 'No se pudo añadir la canción', icon: 'error', background: '#1a1f3a', color: '#fff' });
            }
        }
    };

    const removeFromPlaylist = async (playlistId, trackId) => {
        try {
            await axios.delete(`http://127.0.0.1:3001/api/users/playlists/remove-song`, { data: { playlistId, trackId }, ...config });
            setPlaylistSongs(prev => prev.filter(t => t.spotify_track_id !== trackId));
            Swal.fire({ title: 'Eliminada', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
        } catch(e) { console.error(e); }
    };

    const redeemReward = async (reward) => {
        if (user.points < reward.point_cost) return Swal.fire({ title: 'Puntos insuficientes', text: `Necesitas ${reward.point_cost} puntos.`, icon: 'error', background: '#1a1f3a', color: '#fff' });
        const confirm = await Swal.fire({ title: '¿Confirmar canje?', text: `Vas a gastar ${reward.point_cost} puntos.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'Cancelar', background: '#1a1f3a', color: '#fff' });
        if (confirm.isConfirmed) {
            try {
                const res = await axios.post('http://127.0.0.1:3001/api/users/redeem', { rewardId: reward.id, cost: reward.point_cost }, config);
                setUser(prev => ({ ...prev, points: res.data.newPoints }));
                Swal.fire({ title: '¡Canje exitoso!', icon: 'success', background: '#1a1f3a', color: '#fff' });
            } catch (error) { Swal.fire({ title: 'Error', icon: 'error', background: '#1a1f3a', color: '#fff' }); }
        }
    };

    // --- NUEVO: EDITAR PERFIL AVANZADO (FOTOS Y CONTRASEÑA) ---
    const editProfile = async () => {
        const result = await Swal.fire({
            title: 'Editar Perfil',
            html: `<input id="swal-input-name" class="swal2-input" value="${user?.username || ''}" placeholder="Nombre de usuario" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; margin-bottom: 10px;">` +
                  `<input id="swal-input-email" type="email" class="swal2-input" value="${user?.email || ''}" placeholder="Correo electrónico" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; margin-bottom: 10px;">` +
                  `<input id="swal-input-password" type="password" class="swal2-input" placeholder="Nueva contraseña (dejar en blanco para no cambiar)" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; margin-bottom: 10px;">` +
                  `<label style="font-size: 0.8rem; display:block; margin-top:10px; color:#aaa;">Foto de Perfil:</label>` +
                  `<input id="swal-input-file" type="file" class="swal2-file" style="background: rgba(26, 31, 58, 0.4); color: #ccc; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%; font-size: 0.8rem;">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#555',
            preConfirm: () => ({ 
                username: document.getElementById('swal-input-name').value, 
                email: document.getElementById('swal-input-email').value,
                password: document.getElementById('swal-input-password').value,
                file: document.getElementById('swal-input-file').files[0]
            })
        });

        if (result.isConfirmed && result.value) {
            try {
                const formData = new FormData();
                formData.append('username', result.value.username);
                formData.append('email', result.value.email);
                if (result.value.password) formData.append('password', result.value.password);
                if (result.value.file) formData.append('photo', result.value.file);

                await axios.put('http://127.0.0.1:3001/api/users/update-profile', formData, {
                    headers: { ...config.headers, 'Content-Type': 'multipart/form-data' }
                });
                
                // Pedimos de nuevo los datos del perfil para refrescar la foto nueva en pantalla
                const freshUser = await axios.get('http://127.0.0.1:3001/api/users/profile', config);
                setUser(freshUser.data);

                Swal.fire({ title: '¡Actualizado!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    const playContent = async (uri, item = null, trackInfo = null, listToQueue = null, isBack = false) => {
        if (!spotifyToken) return Swal.fire({ title: 'Spotify Desconectado', icon: 'warning', background: '#1a1f3a', color: '#fff' });
        
        let finalUri = uri;
        let queue = listToQueue || [];

        if (!listToQueue) {
            if (view === 'listas') queue = playlistSongs;
            else if (view === 'inicio' && selectedDynamicList) queue = selectedDynamicList.tracks;
            else if (selectedAlbum) queue = albumTracks;
        }
        
        if (!finalUri && trackInfo) {
            setResolvingUri(`${trackInfo.name || trackInfo.track_name}-${trackInfo.artist || trackInfo.artist_name}`);
            try {
                const name = trackInfo.name || trackInfo.track_name;
                const artist = trackInfo.artist || trackInfo.artist_name;
                const res = await axios.get(`http://127.0.0.1:3001/api/spotify/find-track-uri?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist)}`, config);
                finalUri = res.data.uri;
            } catch (e) { console.error(e); }
            setResolvingUri(null);
        }
        
        if (!finalUri) return Swal.fire({ title: 'No disponible', text: 'Esta canción no está en Spotify.', icon: 'info', background: '#1a1f3a', color: '#fff' });
        
        if (!isBack && currentUri && finalUri !== currentUri) {
            if (currentIndex !== -1 && currentQueue[currentIndex]) {
                setPlaybackHistory(prev => [...prev, currentQueue[currentIndex]]);
            }
        }

        setCurrentUri(finalUri);

        setCurrentQueue(queue);
        const index = queue.findIndex(t => (t.uri === finalUri) || (t.spotify_track_id && finalUri.includes(t.spotify_track_id)));
        setCurrentIndex(index !== -1 ? index : 0);

        if (trackInfo || item) {
            setPlayingArtistData({ 
                id: trackInfo?.artist_name || item?.name || selectedArtist?.id, 
                name: trackInfo?.artist_name || item?.name || selectedArtist?.name 
            });
        }
    };

    const playNext = () => {
        if (currentQueue.length === 0) return;
        let nextIndex;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * currentQueue.length);
        } else {
            nextIndex = (currentIndex + 1) % currentQueue.length;
        }
        const nextTrack = currentQueue[nextIndex];
        playContent(nextTrack.uri, null, nextTrack, currentQueue);
    };

    const playPrevious = () => {
        if (playbackHistory.length > 0) {
            const lastTrack = playbackHistory[playbackHistory.length - 1];
            setPlaybackHistory(prev => prev.slice(0, -1));
            playContent(lastTrack.uri, null, lastTrack, currentQueue, true);
        } else {
            if (currentQueue.length === 0) return;
            const prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
            const prevTrack = currentQueue[prevIndex];
            playContent(prevTrack.uri, null, prevTrack, currentQueue, true);
        }
    };

    const toggleShuffle = () => setIsShuffle(!isShuffle);

    const formatDuration = (ms) => {
        if (!ms) return '';
        const m = Math.floor(ms / 60000);
        const s = ((ms % 60000) / 1000).toFixed(0);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return {
        searchQuery, setSearchQuery, searchResults, isSearchOpen, setIsSearchOpen,
        selectedArtist, albums, eps, singles, activeTab, setActiveTab, selectedAlbum, setSelectedAlbum, albumTracks,
        loading, currentUri, playingArtistData, resolvingUri, myPlaylists, followedArtists, isFollowing,
        showPlaylistModal, setShowPlaylistModal, selectedPlaylist, setSelectedPlaylist, playlistSongs,
        rewards, redeemedRewards, homeFeed, selectedDynamicList, setSelectedDynamicList,
        isShuffle, playNext, playPrevious, toggleShuffle,
        handleSearch, clearSearch, selectArtist, selectAlbum, toggleFollow, createPlaylist, editPlaylist,
        openPlaylist, addToPlaylist, removeFromPlaylist, redeemReward, editProfile, playContent, formatDuration
    };
}

export default useDashboardData;