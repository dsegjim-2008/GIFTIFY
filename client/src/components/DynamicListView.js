import React from 'react';
import { ArrowLeft, Play, Plus } from 'lucide-react';

function DynamicListView({ 
    selectedDynamicList, setSelectedDynamicList, 
    resolvingUri, setShowPlaylistModal, playContent 
}) {
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

export default DynamicListView;