import React from 'react';
import { Plus, ArrowLeft, Trash2, Play, Pencil } from 'lucide-react';

function PlaylistsView({ 
    selectedPlaylist, setSelectedPlaylist, myPlaylists, playlistSongs, 
    loading, editPlaylist, createPlaylist, openPlaylist, removeFromPlaylist, playContent 
}) {
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

export default PlaylistsView;