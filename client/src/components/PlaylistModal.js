import React from 'react';
import { FolderPlus, Star, Music } from 'lucide-react';

function PlaylistModal({ showPlaylistModal, myPlaylists, addToPlaylist, setShowPlaylistModal }) {
    return (
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
    );
}

export default PlaylistModal;