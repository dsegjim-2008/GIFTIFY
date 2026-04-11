const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const SPOTIFY_API = 'https://api.spotify.com/v1';

const getSpotifyUser = async (token) => {
    const response = await axios.get(SPOTIFY_API + '/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.id;
};

// 1. Obtener perfil
router.get('/profile', async (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    if (!spotifyId) return res.status(401).json({ error: "Falta el ID de Spotify" });
    
    db.query('SELECT username, points FROM users WHERE spotify_id = ?', [spotifyId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: "Usuario no encontrado en la BBDD" });
        }
    });
});

// 2. Sumar puntos (ahora con log para depurar)
router.post('/earn', async (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    if (!spotifyId) {
        console.error("❌ /earn: falta X-Spotify-Id");
        return res.status(401).json({ error: "Falta el ID de Spotify" });
    }
    
    console.log(`💰 Sumando puntos para usuario ${spotifyId}`);
    
    const updateQuery = 'UPDATE users SET points = points + 5 WHERE spotify_id = ?';
    db.query(updateQuery, [spotifyId], (err) => {
        if (err) throw err;
        
        db.query('SELECT points FROM users WHERE spotify_id = ?', [spotifyId], (err2, results) => {
            if (err2) throw err2;
            res.json({ newPoints: results[0].points });
        });
    });
});

module.exports = router;