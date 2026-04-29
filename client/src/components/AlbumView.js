import React from 'react';
import { ArrowLeft, Play, Plus } from 'lucide-react';

function AlbumView({ selectedAlbum, selectedArtist, albumTracks, loading, formatDuration, setShowPlaylistModal, playContent, setSelectedAlbum }) {
    return (
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
                            <button className="track-play-button" style={{background: '#1DB954', display:'flex', alignItems:'center', gap:'4px'}} 
                                onClick={() => playContent(track.uri, {artist_name: selectedArtist.name}, {name: track.name, artist: selectedArtist.name})}>
                                <Play size={14} fill="currentColor" /> Play
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AlbumView;