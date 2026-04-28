import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ListMusic, MicVocal, Award, User, LogOut, Gift, Star } from 'lucide-react';
import './Sidebar.css';

function Sidebar({ user, spotifyToken, setView, activeView }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('spotifyAccessToken');
        localStorage.removeItem('spotifyId');
        navigate('/');
    };

    const menuItems = [
        { id: 'inicio', icon: <Home size={20} />, label: 'Inicio' },
        { id: 'listas', icon: <ListMusic size={20} />, label: 'Tus Listas' },
        { id: 'artistas', icon: <MicVocal size={20} />, label: 'Artistas Seguidos' },
        { id: 'recompensas', icon: <Award size={20} />, label: 'Recompensas' }, // CAMBIO AQUÍ
        { id: 'perfil', icon: <User size={20} />, label: 'Perfil' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo" onClick={() => setView('inicio')} style={{cursor:'pointer'}}>
                <span className="logo-emoji"><Gift size={32} color="#FF6B35" /></span>
                <span className="logo-text">Giftify</span>
            </div>

            <div className="sidebar-user-info">
                <div className="user-avatar-sidebar">
                    <User size={24} color="white" />
                </div>
                <div className="user-details-sidebar">
                    <p className="user-name-sidebar">{user?.username || 'Usuario'}</p>
                    <p className="user-points-sidebar">
                        <span className="points-icon" style={{display:'flex', alignItems:'center'}}>
                            <Star size={14} fill="#FFD662" color="#FFD662" />
                        </span>
                        {user?.points || 0} pts
                    </p>
                </div>
            </div>

            <nav className="sidebar-menu">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`menu-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => setView(item.id)}
                    >
                        <span className="menu-icon" style={{display:'flex', alignItems:'center'}}>{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-divider"></div>

            <button className="logout-button" onClick={handleLogout}>
                <span className="logout-icon" style={{display:'flex', alignItems:'center'}}><LogOut size={20} /></span>
                <span className="logout-label">Cerrar Sesión</span>
            </button>

            <div className="spotify-status">
                <span className="status-dot"></span>
                <span className="status-text">Spotify Conectado</span>
            </div>
        </aside>
    );
}

export default Sidebar;