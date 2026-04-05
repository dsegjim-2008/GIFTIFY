const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// 1. Generar la URL de inicio de sesión para el Frontend
router.get('/login-url', (req, res) => {
    // Estos "scopes" son los permisos que le pedimos al usuario (leer su email, controlar el reproductor, etc.)
    const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state';

    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI
    });

    res.json({ url: 'https://accounts.spotify.com/authorize?' + auth_query_parameters.toString() });
});

// 2. El Callback: Spotify nos devuelve al usuario aquí con un código secreto
router.get('/callback', async (req, res) => {
    const code = req.query.code || null;

    try {
        // Intercambiamos el código por el Token de Acceso
        const response = await axios({
            method: 'post',
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

        // Le pedimos a Spotify los datos del perfil del usuario (nombre, email, id)
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
                    // Lo devolvemos al frontend con su token
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

module.exports = router;