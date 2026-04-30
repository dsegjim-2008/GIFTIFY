const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURACIÓN DE MULTER (SUBIDA DE IMÁGENES)
// ============================================
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const getUserId = (spotifyId, callback) => {
    db.query('SELECT id FROM users WHERE spotify_id = ?', [spotifyId], (err, results) => {
        if (err || results.length === 0) return callback(new Error('Usuario no encontrado'), null);
        callback(null, results[0].id);
    });
};

// --- NUEVA FUNCIÓN BASURERA ---
// Borra físicamente la foto anterior para no llenar el servidor
const deleteOldFile = (fileUrl) => {
    if (!fileUrl) return;
    
    // Solo borramos si es una subida nuestra (contiene la ruta /uploads/) 
    // Y verificamos que NO sean las fotos por defecto del sistema
    if (fileUrl.includes('127.0.0.1:3001/uploads/') && 
        !fileUrl.includes('fav.jpeg') && 
        !fileUrl.includes('default_avatar.jpeg') && 
        !fileUrl.includes('fnac.png')) {
        
        // Extraemos solo el nombre del archivo
        const filename = fileUrl.split('/uploads/')[1];
        const filePath = path.join(__dirname, '../uploads', filename);
        
        // Borramos el archivo
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error borrando archivo local antiguo:", err);
            else console.log(`🗑️ Archivo local eliminado: ${filename}`);
        });
    }
};

// ============================================
// 1. PERFIL Y DATOS BÁSICOS
// ============================================
router.get('/profile', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    db.query('SELECT id, username, email, points, photo_url FROM users WHERE spotify_id = ?', [spotifyId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

router.put('/update-profile', upload.single('photo'), (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const { username, email, password } = req.body;
    
    let query = 'UPDATE users SET username = ?, email = ?';
    let params = [username, email];

    // Si ha subido foto, la añadimos a la actualización y borramos la vieja
    if (req.file) {
        // Buscamos la foto antigua antes de actualizar
        db.query('SELECT photo_url FROM users WHERE spotify_id = ?', [spotifyId], (err, users) => {
            if (!err && users.length > 0) {
                deleteOldFile(users[0].photo_url); // Borramos la vieja
            }
        });

        const photoUrl = `http://127.0.0.1:3001/uploads/${req.file.filename}`;
        query += ', photo_url = ?';
        params.push(photoUrl);
    }

    if (password && password.trim() !== '') {
        query += ', password = ?';
        params.push(password);
    }

    query += ' WHERE spotify_id = ?';
    params.push(spotifyId);

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============================================
// 2. GESTIÓN DE PLAYLISTS
// ============================================
router.get('/playlists', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    getUserId(spotifyId, (err, userId) => {
        if (err) return res.status(404).json({ error: err.message });
        db.query('SELECT * FROM playlists WHERE user_id = ? ORDER BY is_favorites_type DESC, id ASC', [userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
});

router.post('/playlists', upload.single('photo'), (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const { name } = req.body;
    const photoUrl = req.file ? `http://127.0.0.1:3001/uploads/${req.file.filename}` : 'http://127.0.0.1:3001/media/logo.webp';

    getUserId(spotifyId, (err, userId) => {
        if (err) return res.status(404).json({ error: err.message });
        db.query('INSERT INTO playlists (name, photo_url, user_id, is_favorites_type) VALUES (?, ?, ?, false)', 
        [name, photoUrl, userId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, name, photo_url: photoUrl });
        });
    });
});

router.put('/playlists/:id', upload.single('photo'), (req, res) => {
    const playlistId = req.params.id;
    const { name } = req.body;
    
    if (req.file) {
        // Buscamos la foto antigua de la playlist para borrarla
        db.query('SELECT photo_url FROM playlists WHERE id = ?', [playlistId], (err, results) => {
            if (!err && results.length > 0) {
                deleteOldFile(results[0].photo_url); // Borramos la vieja
            }
        });

        const photoUrl = `http://127.0.0.1:3001/uploads/${req.file.filename}`;
        db.query('UPDATE playlists SET name = ?, photo_url = ? WHERE id = ?', [name, photoUrl, playlistId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: playlistId, name, photo_url: photoUrl });
        });
    } else {
        db.query('UPDATE playlists SET name = ? WHERE id = ?', [name, playlistId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: playlistId, name });
        });
    }
});

router.delete('/playlists/:id', (req, res) => {
    const playlistId = req.params.id;
    
    // Buscamos la foto para borrarla porque la playlist ya no existirá
    db.query('SELECT photo_url FROM playlists WHERE id = ?', [playlistId], (err, results) => {
        if (!err && results.length > 0) {
            deleteOldFile(results[0].photo_url);
        }
    });

    db.query('DELETE FROM playlist_songs WHERE playlist_id = ?', [playlistId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query('DELETE FROM playlists WHERE id = ?', [playlistId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ============================================
// 3. CANCIONES DE PLAYLISTS
// ============================================
router.get('/playlists/:id/songs', (req, res) => {
    const playlistId = req.params.id;
    db.query('SELECT * FROM playlist_songs WHERE playlist_id = ?', [playlistId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/playlists/add-song', (req, res) => {
    const { playlistId, track } = req.body;
    db.query('SELECT id FROM playlist_songs WHERE playlist_id = ? AND spotify_track_id = ?', 
    [playlistId, track.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'La canción ya está en la lista' });

        db.query(`INSERT INTO playlist_songs (playlist_id, spotify_track_id, track_name, artist_name, image_url, duration_ms) VALUES (?, ?, ?, ?, ?, ?)`, 
        [playlistId, track.id, track.name, track.artist, track.image, track.duration_ms], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

router.delete('/playlists/remove-song', (req, res) => {
    const { playlistId, trackId } = req.body;
    db.query('DELETE FROM playlist_songs WHERE playlist_id = ? AND spotify_track_id = ?', [playlistId, trackId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============================================
// 4. ARTISTAS SEGUIDOS
// ============================================
router.get('/followed-artists', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    getUserId(spotifyId, (err, userId) => {
        if (err) return res.status(404).json({ error: err.message });
        db.query('SELECT * FROM followed_artists WHERE user_id = ?', [userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
});

router.post('/follow-artist', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const { artist } = req.body;
    getUserId(spotifyId, (err, userId) => {
        if (err) return res.status(404).json({ error: err.message });
        db.query('SELECT id FROM followed_artists WHERE user_id = ? AND spotify_artist_id = ?', [userId, artist.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                db.query('DELETE FROM followed_artists WHERE id = ?', [results[0].id], () => res.json({ followed: false }));
            } else {
                db.query('INSERT INTO followed_artists (user_id, spotify_artist_id, name, image_url) VALUES (?, ?, ?, ?)', 
                [userId, artist.id, artist.name, artist.image], () => res.json({ followed: true }));
            }
        });
    });
});

// ============================================
// 5. SISTEMA DE PUNTOS Y RECOMPENSAS
// ============================================
let dailyRewardsCache = { special: null, normals: [] };
let lastRotationDate = null;

router.get('/rewards', (req, res) => {
    const today = new Date().toLocaleDateString('es-ES');

    if (lastRotationDate !== today || !dailyRewardsCache.special) {
        db.query('SELECT * FROM rewards', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const specials = results.filter(r => r.is_special);
            const normals = results.filter(r => !r.is_special);
            
            const shuffledSpecials = specials.sort(() => 0.5 - Math.random());
            const shuffledNormals = normals.sort(() => 0.5 - Math.random());
            
            dailyRewardsCache = {
                special: shuffledSpecials[0] || null,
                normals: shuffledNormals.slice(0, 6)
            };
            
            lastRotationDate = today;
            res.json(dailyRewardsCache);
        });
    } else {
        res.json(dailyRewardsCache);
    }
});

router.get('/redeemed', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    db.query(`SELECT r.*, red.redeemed_at FROM redemptions red JOIN rewards r ON red.reward_id = r.id JOIN users u ON red.user_id = u.id WHERE u.spotify_id = ?`, 
    [spotifyId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.map(r => ({ ...r, redeemed_at: r.redeemed_at || new Date().toISOString() })));
    });
});

router.post('/redeem', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const { rewardId, cost } = req.body;
    getUserId(spotifyId, (err, userId) => {
        if (err) return res.status(404).json({ error: err.message });
        db.query('SELECT points FROM users WHERE id = ?', [userId], (err, users) => {
            if (err || users.length === 0) return res.status(500).json({ error: 'Error obteniendo puntos' });
            const currentPoints = users[0].points;
            if (currentPoints < cost) return res.status(400).json({ error: 'Puntos insuficientes' });

            db.query('UPDATE users SET points = points - ? WHERE id = ?', [cost, userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                db.query('INSERT INTO redemptions (user_id, reward_id, points_spent) VALUES (?, ?, ?)', 
                [userId, rewardId, cost], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, newPoints: currentPoints - cost });
                });
            });
        });
    });
});

router.post('/earn', (req, res) => {
    const spotifyId = req.headers['x-spotify-id'];
    const POINTS_PER_INTERVAL = 10;
    db.query('UPDATE users SET points = points + ? WHERE spotify_id = ?', [POINTS_PER_INTERVAL, spotifyId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query('SELECT points FROM users WHERE spotify_id = ?', [spotifyId], (err, results) => {
            if (err || results.length === 0) return res.status(500).json({ error: 'Error leyendo puntos' });
            res.json({ success: true, newPoints: results[0].points });
        });
    });
});

module.exports = router;