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

    // --- FUNCIONES ---
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
            html: '<input id="swal-input-name" class="swal2-input" placeholder="Nombre de la lista" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">',
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Crear', cancelButtonText: 'Cancelar',
            background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#d33',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                if (!name) Swal.showValidationMessage('¡El nombre es obligatorio!');
                return { name };
            }
        });

        if (formValues) {
            try {
                const formData = new FormData(); formData.append('name', formValues.name);
                await axios.post('http://127.0.0.1:3001/api/users/playlists', formData, config);
                const res = await axios.get('http://127.0.0.1:3001/api/users/playlists', config);
                setMyPlaylists(res.data);
                Swal.fire({ title: '¡Creada!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1f3a', color: '#fff' });
            } catch(e) { console.error(e); }
        }
    };

    const editPlaylist = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Lista',
            html: `<input id="swal-input-name" class="swal2-input" value="${selectedPlaylist.name}" placeholder="Nombre de la lista" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
            background: '#1a1f3a', color: '#fff', confirmButtonColor: '#1DB954', cancelButtonColor: '#d33',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                if (!name) Swal.showValidationMessage('¡El nombre es obligatorio!');
                return { name };
            }
        });

        if (formValues) {
            try {
                const formData = new FormData(); formData.append('name', formValues.name);
                const res = await axios.put(`http://127.0.0.1:3001/api/users/playlists/${selectedPlaylist.id}`, formData, config);
                setSelectedPlaylist(res.data);
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

    const editProfile = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar Perfil',
            html: `<input id="swal-input-name" class="swal2-input" value="${user?.username || ''}" placeholder="Nombre de usuario" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">` +
                  `<input id="swal-input-email" type="email" class="swal2-input" value="${user?.email || ''}" placeholder="Correo electrónico" style="background: rgba(26, 31, 58, 0.6); color: white; border: 1px solid rgba(0, 217, 255, 0.1); width: 80%;">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', background: '#1a1f3a', color: '#fff',
            preConfirm: () => ({ username: document.getElementById('swal-input-name').value, email: document.getElementById('swal-input-email').value })
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
        if (!spotifyToken) return Swal.fire({ title: 'Spotify Desconectado', icon: 'warning', background: '#1a1f3a', color: '#fff' });
        let finalUri = uri;
        if (!finalUri && trackInfo?.name && trackInfo?.artist) {
            setResolvingUri(`${trackInfo.name}-${trackInfo.artist}`);
            try {
                const res = await axios.get(`http://127.0.0.1:3001/api/spotify/find-track-uri?name=${encodeURIComponent(trackInfo.name)}&artist=${encodeURIComponent(trackInfo.artist)}`, config);
                finalUri = res.data.uri;
            } catch (e) { console.error(e); }
            setResolvingUri(null);
        }
        if (!finalUri) return Swal.fire({ title: 'No disponible', text: 'Esta canción no está en Spotify.', icon: 'info', background: '#1a1f3a', color: '#fff' });
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

    return {
        searchQuery, setSearchQuery, searchResults, isSearchOpen, setIsSearchOpen,
        selectedArtist, albums, eps, singles, activeTab, setActiveTab, selectedAlbum, setSelectedAlbum, albumTracks,
        loading, currentUri, playingArtistData, resolvingUri, myPlaylists, followedArtists, isFollowing,
        showPlaylistModal, setShowPlaylistModal, selectedPlaylist, setSelectedPlaylist, playlistSongs,
        rewards, redeemedRewards, homeFeed, selectedDynamicList, setSelectedDynamicList,
        handleSearch, clearSearch, selectArtist, selectAlbum, toggleFollow, createPlaylist, editPlaylist,
        openPlaylist, addToPlaylist, removeFromPlaylist, redeemReward, editProfile, playContent, formatDuration
    };
}

export default useDashboardData;