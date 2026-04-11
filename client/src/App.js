import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
    const [spotifyToken, setSpotifyToken] = useState(null);
    const [spotifyId, setSpotifyId] = useState(null);
    const [user, setUser] = useState({ username: 'Cargando...', points: 0 }); 
    
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const urlToken = queryParams.get('token');
        const urlSpotifyId = queryParams.get('spotify_id');

        if (urlToken && urlSpotifyId) {
            setSpotifyToken(urlToken);
            setSpotifyId(urlSpotifyId);
            localStorage.setItem('spotifyAccessToken', urlToken);
            localStorage.setItem('spotifyId', urlSpotifyId);
            navigate('/dashboard', { replace: true });
        } else {
            const savedToken = localStorage.getItem('spotifyAccessToken');
            const savedId = localStorage.getItem('spotifyId');
            if (savedToken) setSpotifyToken(savedToken);
            if (savedId) setSpotifyId(savedId);
        }
    }, [location, navigate]);

    return (
        <div className="App">
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={
                    <Dashboard user={user} setUser={setUser} spotifyToken={spotifyToken} spotifyId={spotifyId} />
                } />
            </Routes>
        </div>
    );
}

export default App;