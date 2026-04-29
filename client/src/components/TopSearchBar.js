import React from 'react';
import { Search, Music, UserPlus, Plus, Play } from 'lucide-react';

function TopSearchBar({ 
    searchQuery, setSearchQuery, handleSearch, 
    isSearchOpen, setIsSearchOpen, searchResults, 
    resolvingUri, selectArtist, setShowPlaylistModal, playContent 
}) {
    return (
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
    );
}

export default TopSearchBar;