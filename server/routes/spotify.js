const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// 1. Generar la URL de inicio de sesión para el Frontend
router.get('/login-url', (req, res) => {
    const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state';

    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI
    });

    // URL CORREGIDA
    res.json({ url: 'https://accounts.spotify.com/authorize?' + auth_query_parameters.toString() });
});

// 2. El Callback: Spotify nos devuelve al usuario aquí
router.get('/callback', async (req, res) => {
    const code = req.query.code || null;

    try {
        // Intercambiamos el código por el Token de Acceso
        const response = await axios({
            method: 'post',
            // URL CORREGIDA
            url: 'https://accounts.spotify.com/api/token',
            data: new URLSearchParams({
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString(),
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            }
        });

        const access_token = response.data.access_token;

        // Le pedimos a Spotify los datos del perfil del usuario
        // URL CORREGIDA
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': 'Bearer ' + access_token }
        });

        const spotifyData = userResponse.data;

        // Comprobamos si el usuario ya existe en nuestra base de datos
        const query = 'SELECT * FROM users WHERE spotify_id = ?';
        db.query(query, [spotifyData.id], (err, results) => {
            if (err) throw err;

            if (results.length === 0) {
                // Si no existe, lo registramos automáticamente
                const insertQuery = 'INSERT INTO users (username, email, password, spotify_id) VALUES (?, ?, ?, ?)';
                db.query(insertQuery, [spotifyData.display_name, spotifyData.email, 'spotify_oauth', spotifyData.id], (err2) => {
                    if (err2) throw err2;
                    res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}`);
                });
            } else {
                // Si ya existe, simplemente lo devolvemos al frontend con su token
                res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}`);
            }
        });

    } catch (error) {
        console.error("❌ Error en autenticación con Spotify:", error.response ? error.response.data : error.message);
        res.redirect('http://127.0.0.1:3000/?error=auth_failed');
    }
});

// --- NUEVAS RUTAS: BUSCADOR Y DISCOGRAFÍA ---

// Función auxiliar: El servidor pide su propio pase temporal a Spotify para poder buscar
const getSpotifyAppToken = async () => {
    const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
        }
    });
    return response.data.access_token;
};

// 3. Buscar Artistas
router.get('/search', async (req, res) => {
    try {
        const token = await getSpotifyAppToken();
        const query = req.query.query;
        
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=artist&limit=8`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        res.json(response.data.artists.items);
    } catch (error) {
        console.error("❌ Error buscando artista:", error.message);
        res.status(500).json({ error: "Error en la búsqueda" });
    }
});

// 4. Obtener las canciones principales del artista
router.get('/artist-tracks', async (req, res) => {
    try {
        const token = await getSpotifyAppToken();
        const artistId = req.query.id;
        
        // Pedimos los "Top Tracks" del artista a Spotify
        const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=ES`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Filtramos solo los datos que nuestro Frontend necesita
        const tracks = response.data.tracks.map(t => ({
            id: t.id,
            name: t.name,
            uri: t.uri,
            image: t.album.images[0]?.url,
            type: t.album.album_type,
            release_date: t.album.release_date
        }));
        
        res.json(tracks);
    } catch (error) {
        console.error("❌ Error obteniendo canciones:", error.message);
        res.status(500).json({ error: "Error obteniendo canciones" });
    }
});

module.exports = router;