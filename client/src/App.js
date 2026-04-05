import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';

function App() {
  const [spotifyToken, setSpotifyToken] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Comprobamos si el servidor nos ha redirigido con un token en la URL (?token=XXXX)
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      // Lo guardamos en React y en el navegador para no perderlo al actualizar la página
      setSpotifyToken(urlToken);
      localStorage.setItem('spotifyAccessToken', urlToken);

      // Limpiamos la URL para que no se vea el código feo y mandamos al dashboard
      navigate('/dashboard', { replace: true });
    } else {
      // Si entramos normal, miramos si ya teníamos la sesión iniciada de antes
      const savedToken = localStorage.getItem('spotifyAccessToken');
      if (savedToken) {
        setSpotifyToken(savedToken);
      }
    }
  }, [location, navigate]);

  return (
    <div className="App">
      <Routes>
        {/* Ruta principal: La pantalla de bienvenida */}
        <Route path="/" element={<Login />} />

        {/* Ruta del Dashboard (por ahora es un chivato temporal para ver si funciona) */}
        <Route path="/dashboard" element={
          <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>
            <h1>¡Sesión Iniciada! 🎉</h1>
            <p>{spotifyToken ? "Token capturado con éxito. Listo para la música." : "Cargando..."}</p>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;