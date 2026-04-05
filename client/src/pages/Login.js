import React from 'react';
import axios from 'axios';

function Login() {
    const handleLogin = async () => {
        try {
            // Pedimos al backend la URL oficial de Spotify (usando la IP permitida)
            const res = await axios.get('http://127.0.0.1:3001/api/spotify/login-url');

            // Redirigimos al usuario a la página de Spotify para que acepte los permisos
            window.location.href = res.data.url;
        } catch (error) {
            console.error("Error al conectar con el servidor:", error);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white' }}>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '10px' }}>Giftify</h1>
            <p style={{ marginBottom: '30px', color: '#b3b3b3', fontSize: '1.2rem' }}>Escucha música, gana puntos y canjea regalos.</p>

            <button
                onClick={handleLogin}
                style={{ backgroundColor: '#1DB954', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
                Conectar con Spotify
            </button>
        </div>
    );
}

export default Login;