import React from 'react';
import { ArrowLeft, Check, UserPlus, Disc3, Music, ListMusic, Play } from 'lucide-react';

function ArtistView({ 
    selectedArtist, isFollowing, toggleFollow, clearSearch, 
    activeTab, setActiveTab, loading, albums, eps, singles, 
    selectAlbum, playContent 
}) {
    const currentList = activeTab === 'albums' ? albums : activeTab === 'eps' ? eps : singles;

    return (
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
                                <div className="track-artist">{item.release_date?.slice(0, 4)} · {item.total_tracks} canciones</div>
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
    );
}

export default ArtistView;