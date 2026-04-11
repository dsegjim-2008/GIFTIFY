const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH = 'https://accounts.spotify.com';

const getTokenFromHeader = (req) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.split(' ')[1];
};

// Pagina todos los resultados de un endpoint de Spotify
const fetchAllPages = async (url, token) => {
    let results = [];
    let nextUrl = url;

    while (nextUrl) {
        const response = await axios.get(nextUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        results = results.concat(response.data.items);
        nextUrl = response.data.next; // null cuando no hay más páginas
    }

    return results;
};

// 1. Generar la URL de inicio de sesión
router.get('/login-url', (req, res) => {
    const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state';
    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI
    });
    res.json({ url: SPOTIFY_AUTH + '/authorize?' + auth_query_parameters.toString() });
});

// 2. El Callback y guardado en Base de Datos
router.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    try {
        const response = await axios({
            method: 'post',
            url: SPOTIFY_AUTH + '/api/token',
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
        const refresh_token = response.data.refresh_token;
        const expires_at = Date.now() + 3600000;

        const userResponse = await axios.get(SPOTIFY_API + '/me', {
            headers: { 'Authorization': 'Bearer ' + access_token }
        });
        const spotifyData = userResponse.data;

        db.query('SELECT * FROM users WHERE spotify_id = ?', [spotifyData.id], (err, results) => {
            if (err) throw err;
            if (results.length === 0) {
                db.query(
                    'INSERT INTO users (username, email, password, spotify_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [spotifyData.display_name, spotifyData.email, 'spotify_oauth', spotifyData.id, access_token, refresh_token, expires_at],
                    (err2) => {
                        if (err2) throw err2;
                        res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}&spotify_id=${spotifyData.id}`);
                    }
                );
            } else {
                db.query(
                    'UPDATE users SET access_token = ?, refresh_token = ?, expires_at = ? WHERE spotify_id = ?',
                    [access_token, refresh_token, expires_at, spotifyData.id],
                    (err2) => {
                        if (err2) throw err2;
                        res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}&spotify_id=${spotifyData.id}`);
                    }
                );
            }
        });
    } catch (error) {
        console.error("❌ Error en autenticación:", error.message);
        res.redirect('http://127.0.0.1:3000/?error=auth_failed');
    }
});

// 3. Buscar Artistas
router.get('/search', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        if (!token) return res.status(401).json({ error: "Token no encontrado en el header" });

        const query = req.query.query;
        const response = await axios.get(SPOTIFY_API + '/search?q=' + query + '&type=artist&limit=8', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data.artists.items);
    } catch (error) {
        console.error("❌ Error buscando artista:", error.response?.data || error.message);
        res.status(500).json({ error: "Error en la búsqueda" });
    }
});

// 4. Discografía completa: álbumes y singles paginados y ordenados cronológicamente
router.get('/artist-tracks', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        if (!token) return res.status(401).json({ error: "Token no encontrado en el header" });

        const artistId = req.query.id;

        // Dos llamadas en paralelo: una para álbumes, otra para singles
        const [albumItems, singleItems] = await Promise.all([
            fetchAllPages(
                SPOTIFY_API + '/artists/' + artistId + '/albums?include_groups=album&market=ES&limit=10',
                token
            ),
            fetchAllPages(
                SPOTIFY_API + '/artists/' + artistId + '/albums?include_groups=single&market=ES&limit=10',
                token
            )
        ]);

        const formatItem = (item) => ({
            id: item.id,
            name: item.name,
            uri: item.uri,
            image: item.images[0]?.url,
            type: item.album_type === 'single' ? 'Single' : 'Álbum',
            release_date: item.release_date
        });

        // Ordenar cronológicamente (más reciente primero)
        const sortByDate = (a, b) => new Date(b.release_date) - new Date(a.release_date);

        const albums = albumItems.map(formatItem).sort(sortByDate);
        const singles = singleItems.map(formatItem).sort(sortByDate);

        res.json({ albums, singles });
    } catch (error) {
        console.error("❌ Error obteniendo discografía:", error.response?.data || error.message);
        res.status(500).json({ error: "Error obteniendo discografía" });
    }
});

module.exports = router;