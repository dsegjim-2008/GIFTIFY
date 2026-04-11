import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WebPlayback from '../components/WebPlayback';

function Dashboard({ user, setUser, spotifyToken, spotifyId }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]); 
    const [selectedArtist, setSelectedArtist] = useState(null); 
    const [artistTracks, setArtistTracks] = useState([]); 
    
    const [currentUri, setCurrentUri] = useState(null); 
    const [playingArtistData, setPlayingArtistData] = useState(null); 

    useEffect(() => {
        if (spotifyId && spotifyToken) {
            axios.get('http://127.0.0.1:3001/api/users/profile', {
                headers: { Authorization: `Bearer ${spotifyToken}`, 'X-Spotify-Id': spotifyId }
            })
            .then(res => setUser(res.data))
            .catch(err => console.error("Error cargando perfil", err));
        }
    }, [spotifyId, spotifyToken, setUser]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/search?query=${searchQuery}`, {
                headers: { Authorization: `Bearer ${spotifyToken}`, 'X-Spotify-Id': spotifyId }
            });
            setSearchResults(res.data); 
            setSelectedArtist(null); 
        } catch (error) { console.error("Error en la búsqueda", error); }
    };

    const selectArtist = async (artist) => {
        setSelectedArtist(artist);
        setArtistTracks([]); 
        try {
            const res = await axios.get(`http://127.0.0.1:3001/api/spotify/artist-tracks?id=${artist.id}`, {
                headers: { 
                    Authorization: `Bearer ${spotifyToken}`,
                    'X-Spotify-Id': spotifyId 
                }
            });
            setArtistTracks(res.data);
        } catch (error) { 
            console.error("Error cargando discografía", error);
            alert("No se pudo cargar la discografía. Revisa la consola.");
        } 
    };

    const playContent = (uri) => {
        if (!spotifyToken) return alert("¡Conecta Spotify!");
        setCurrentUri(uri);
        if (selectedArtist) setPlayingArtistData({ id: selectedArtist.id, name: selectedArtist.name });
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', paddingBottom:'100px', color: '#333' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div>
                    <h1 style={{margin:0}}>Hola, {user ? user.username : 'Usuario'} 👋</h1>
                    <p style={{margin:'5px 0', color:'#666'}}>Tienes <span style={{fontWeight:'bold', color:'#1DB954'}}>{user ? user.points : 0} Puntos</span></p>
                </div>
                <button style={{ background:'#e8f5e9', color:'#2e7d32', border:'1px solid #2e7d32', padding:'10px 20px', borderRadius:'30px', fontWeight:'bold' }}>
                    ✅ Spotify Conectado
                </button>
            </div>

            {!selectedArtist ? (
                <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                     <h2>🔍 Busca un Artista</h2>
                     <form onSubmit={handleSearch} style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                        <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '30px', border: '1px solid #ddd', fontSize:'1rem' }} placeholder="Ej: Quevedo..."/>
                        <button type="submit" style={{ padding: '12px 25px', background: 'black', color: 'white', border: 'none', borderRadius: '30px', cursor:'pointer', fontWeight:'bold' }}>Buscar</button>
                     </form>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                        {searchResults.map(artist => (
                            <div key={artist.id} onClick={() => selectArtist(artist)} style={{ padding: '15px', textAlign: 'center', cursor: 'pointer', background:'#fff', borderRadius:'15px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                                <img src={artist.images[1]?.url || 'https://via.placeholder.com/150'} style={{ width:'100%', borderRadius:'50%', aspectRatio:'1/1', objectFit:'cover', boxShadow:'0 4px 10px rgba(0,0,0,0.1)' }} alt=""/>
                                <p style={{fontWeight:'bold', marginTop:'10px'}}>{artist.name}</p>
                            </div>
                        ))}
                     </div>
                </div>
            ) : (
                <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <button onClick={() => setSelectedArtist(null)} style={{ background:'#f0f0f0', border:'none', padding:'8px 15px', borderRadius:'20px', cursor:'pointer', marginBottom:'20px', fontWeight:'bold' }}>⬅ Volver</button>
                    
                    <div style={{display:'flex', alignItems:'center', gap:'20px', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'20px'}}>
                        <img src={selectedArtist.images[0]?.url || 'https://via.placeholder.com/150'} style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover'}} alt=""/>
                        <div>
                            <h2 style={{margin:0}}>{selectedArtist.name}</h2>
                            <p style={{margin:0, fontSize:'0.85rem', color:'#888'}}>Discografía</p>
                        </div>
                    </div>

                    <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                        {artistTracks.map((item) => (
                            <div key={item.id} style={{ marginBottom: '10px', borderBottom:'1px solid #f5f5f5', paddingBottom:'10px', display:'flex', gap:'15px', alignItems:'center' }}>
                                <img src={item.image} style={{width:'50px', height:'50px', borderRadius:'4px', objectFit:'cover'}} alt=""/>
                                <div style={{flex:1}}>
                                    <div style={{fontWeight:'bold', fontSize:'0.95rem'}}>{item.name}</div>
                                    <div style={{fontSize:'0.8rem', color:'#999'}}>{item.type}</div>
                                </div>
                                <button onClick={() => playContent(item.uri)} style={{ background: '#1DB954', color:'white', border:'none', borderRadius:'20px', padding:'8px 15px', cursor:'pointer', fontWeight:'bold', fontSize:'0.8rem' }}>▶ Play</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Renderizamos WebPlayback solo si tenemos token Y spotifyId */}
            {spotifyToken && spotifyId && (
                <WebPlayback 
                    token={spotifyToken} 
                    trackUri={currentUri} 
                    playingArtist={playingArtistData}
                    setUser={setUser}
                    spotifyId={spotifyId}
                />
            )}
        </div>
    );
}

export default Dashboard;