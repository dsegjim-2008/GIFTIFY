import React from 'react';
import { Star, Pencil, Gift } from 'lucide-react';

function ProfileView({ user, redeemedRewards, editProfile }) {
    return (
        <div className="profile-wrapper">
            <div className="profile-header-banner">
                {/* --- SECCIÓN DEL AVATAR ACTUALIZADA --- */}
                <div className="profile-avatar-large" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.photo_url && !user.photo_url.includes('default_avatar') ? (
                        <img 
                            src={user.photo_url} 
                            alt="Perfil" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            onError={(e) => { e.target.style.display = 'none'; }} // Si la imagen falla, la oculta y muestra el fondo
                        />
                    ) : (
                        user?.username?.charAt(0).toUpperCase() || 'U'
                    )}
                </div>
                {/* -------------------------------------- */}
                
                <div className="profile-header-info">
                    <h2>{user?.username || 'Usuario'}</h2>
                    <p>{user?.email || 'Sin correo vinculado'}</p>
                    <div className="profile-points-badge">
                        <Star size={16} fill="currentColor" /> {user?.points || 0} puntos
                    </div>
                </div>
                <button className="edit-profile-btn" onClick={editProfile}>
                    <Pencil size={16} /> Editar Datos
                </button>
            </div>

            <div className="profile-inventory">
                <h3><Gift size={20} style={{verticalAlign: 'middle', marginRight: '8px'}}/> Mi Inventario (Recompensas Canjeadas)</h3>
                {redeemedRewards.length === 0 ? (
                    <div className="empty-inventory">Aún no has canjeado ninguna recompensa. ¡Ve a la tienda!</div>
                ) : (
                    <div className="grid-container" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginTop: '20px'}}>
                        {redeemedRewards.map(reward => (
                            <div key={reward.id} className="reward-card owned-reward">
                                <img src={reward.photo_url} alt={reward.name} style={{width:'100%', height:'150px', objectFit:'cover', borderRadius: '8px', marginBottom: '10px'}} />
                                <h4>{reward.name}</h4>
                                <p style={{fontSize:'0.8rem', color:'var(--primary-cyan)', marginTop:'5px'}}>✓ Obtenido el {new Date(reward.redeemed_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfileView;