const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const fs = require('fs');

// --- CONFIGURACIÓN DE MULTER (PARA SUBIR FOTOS) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir); // Crea la carpeta si no existe
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Le ponemos la fecha delante para que no haya dos fotos con el mismo nombre
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')); 
    }
});
const upload = multer({ storage: storage });


// --- PERFIL Y PUNTOS ---
router.get('/profile', async (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    if (!spotifyId) return res.status(401).json({ error: "Falta ID" });
    db.query('SELECT id, username, points FROM users WHERE spotify_id = ?', [spotifyId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) res.json(results[0]);
        else res.status(404).json({ error: "No encontrado" });
    });
});

router.post('/earn', async (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    if (!spotifyId) return res.status(401).json({ error: "Falta ID" });
    db.query('UPDATE users SET points = points + 5 WHERE spotify_id = ?', [spotifyId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query('SELECT points FROM users WHERE spotify_id = ?', [spotifyId], (err2, results) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ newPoints: results[0].points });
        });
    });
});

// --- PLAYLISTS ---
router.get('/playlists', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    db.query('SELECT p.* FROM playlists p JOIN users u ON p.user_id = u.id WHERE u.spotify_id = ?', [spotifyId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// CREAR PLAYLIST (AHORA CON ARCHIVO LOCAL)
router.post('/playlists', upload.single('image'), (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const { name } = req.body;
    
    db.query('SELECT id FROM users WHERE spotify_id = ?', [spotifyId], (err, users) => {
        if (err || users.length === 0) return res.status(404).send();
        
        let photo_url = 'https://via.placeholder.com/150/6B1FB5/FFFFFF?text=Playlist'; // Foto por defecto
        
        // Si el usuario subió una imagen, generamos la ruta correcta hacia nuestro servidor local
        if (req.file) {
            photo_url = `http://127.0.0.1:3001/uploads/${req.file.filename}`;
        }

        db.query('INSERT INTO playlists (name, user_id, photo_url) VALUES (?, ?, ?)', 
            [name, users[0].id, photo_url], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ id: result.insertId, name, photo_url });
        });
    });
});

// NUEVO: EDITAR PLAYLIST
router.put('/playlists/:id', upload.single('image'), (req, res) => {
    const playlistId = req.params.id;
    const { name } = req.body;
    
    let query = 'UPDATE playlists SET name = ? WHERE id = ?';
    let params = [name, playlistId];

    if (req.file) {
        const photo_url = `http://127.0.0.1:3001/uploads/${req.file.filename}`;
        query = 'UPDATE playlists SET name = ?, photo_url = ? WHERE id = ?';
        params = [name, photo_url, playlistId];
    }

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Devolvemos la playlist actualizada
        db.query('SELECT * FROM playlists WHERE id = ?', [playlistId], (err2, results) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(results[0]);
        });
    });
});

router.get('/playlists/:id/songs', (req, res) => {
    db.query('SELECT * FROM playlist_songs WHERE playlist_id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/playlists/add-song', (req, res) => {
    const { playlistId, track } = req.body;
    db.query(`INSERT INTO playlist_songs (playlist_id, spotify_track_id, track_name, artist_name, image_url, duration_ms) 
              VALUES (?, ?, ?, ?, ?, ?)`, 
        [playlistId, track.id, track.name, track.artist, track.image, track.duration_ms], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
    });
});

router.delete('/playlists/remove-song', (req, res) => {
    const { playlistId, trackId } = req.body;
    db.query('DELETE FROM playlist_songs WHERE playlist_id = ? AND spotify_track_id = ?', [playlistId, trackId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- ARTISTAS SEGUIDOS ---
router.get('/followed-artists', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    db.query('SELECT a.* FROM followed_artists a JOIN users u ON a.user_id = u.id WHERE u.spotify_id = ?', [spotifyId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/follow-artist', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const { artist } = req.body;
    db.query('SELECT id FROM users WHERE spotify_id = ?', [spotifyId], (err, users) => {
        if (err || users.length === 0) return res.status(404).send();
        
        db.query('SELECT id FROM followed_artists WHERE user_id = ? AND spotify_artist_id = ?', [users[0].id, artist.id], (err2, exists) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (exists.length > 0) {
                db.query('DELETE FROM followed_artists WHERE id = ?', [exists[0].id], () => res.json({ followed: false }));
            } else {
                db.query('INSERT INTO followed_artists (user_id, spotify_artist_id, name, image_url) VALUES (?, ?, ?, ?)', 
                    [users[0].id, artist.id, artist.name, artist.image], () => res.json({ followed: true }));
            }
        });
    });
});

module.exports = router;