import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [user, setUser] = useState({ username: 'Usuario', points: 0 }); // Datos temporales hasta que los traigamos de la BBDD

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      setSpotifyToken(urlToken);
      localStorage.setItem('spotifyAccessToken', urlToken);
      navigate('/dashboard', { replace: true });
    } else {
      const savedToken = localStorage.getItem('spotifyAccessToken');
      if (savedToken) {
        setSpotifyToken(savedToken);
      }
    }
  }, [location, navigate]);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Cargamos tu verdadero Dashboard y le pasamos los datos */}
        <Route path="/dashboard" element={
          <Dashboard
            user={user}
            setUser={setUser}
            spotifyToken={spotifyToken}
          />
        } />
      </Routes>
    </div>
  );
}

export default App;