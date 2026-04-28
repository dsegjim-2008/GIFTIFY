const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// URLs oficiales de Spotify
const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH = 'https://accounts.spotify.com';

// VARIABLES DE CACHÉ GLOBAL (Almacenan los datos en la memoria RAM de tu servidor)
let cachedTopTracks = [];
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora de duración

// LISTA DE EMERGENCIA (Por si Spotify te tiene baneado temporalmente por pulsar mucho F5)
const fallbackTracks = [
    { id: '1', spotify_track_id: '1', track_name: 'Columbia', artist_name: 'Quevedo', image_url: 'https://via.placeholder.com/150/1DB954/1A1F3A?text=Quevedo', duration_ms: 200000, uri: '', track_number: 1 },
    { id: '2', spotify_track_id: '2', track_name: 'LUNA', artist_name: 'Feid', image_url: 'https://via.placeholder.com/150/1DB954/1A1F3A?text=Feid', duration_ms: 200000, uri: '', track_number: 2 },
    { id: '3', spotify_track_id: '3', track_name: 'DESPECHÁ', artist_name: 'ROSALÍA', image_url: 'https://via.placeholder.com/150/1DB954/1A1F3A?text=Rosalia', duration_ms: 200000, uri: '', track_number: 3 },
    { id: '4', spotify_track_id: '4', track_name: 'Monaco', artist_name: 'Bad Bunny', image_url: 'https://via.placeholder.com/150/1DB954/1A1F3A?text=Bad+Bunny', duration_ms: 200000, uri: '', track_number: 4 }
];

const getTokenFromHeader = (req) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.split(' ')[1];
};

const fetchAllPages = async (url, token) => {
    let results = [];
    let nextUrl = url;
    while (nextUrl) {
        const response = await axios.get(nextUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        results = results.concat(response.data.items);
        nextUrl = response.data.next;
    }
    return results;
};

const getFavorites = (spotifyId) => {
    return new Promise((resolve) => {
        db.query(`
            SELECT ps.spotify_track_id, ps.track_name, ps.artist_name, ps.image_url, ps.duration_ms 
            FROM playlist_songs ps 
            JOIN playlists p ON p.id = ps.playlist_id 
            JOIN users u ON u.id = p.user_id 
            WHERE u.spotify_id = ? AND p.is_favorites_type = TRUE
        `, [spotifyId], (err, results) => {
            if (err) resolve([]);
            else resolve(results);
        });
    });
};

router.get('/login-url', (req, res) => {
    const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state user-read-recently-played';
    const auth_query_parameters = new URLSearchParams({ response_type: 'code', client_id: CLIENT_ID, scope: scope, redirect_uri: REDIRECT_URI });
    res.json({ url: SPOTIFY_AUTH + '/authorize?' + auth_query_parameters.toString() });
});

router.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    try {
        const response = await axios({
            method: 'post',
            url: SPOTIFY_AUTH + '/api/token',
            data: new URLSearchParams({ code, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }).toString(),
            headers: { 'content-type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) }
        });

        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;
        const expires_at = Date.now() + 3600000;

        const userResponse = await axios.get(SPOTIFY_API + '/me', { headers: { 'Authorization': 'Bearer ' + access_token } });
        const spotifyData = userResponse.data;

        db.query('SELECT * FROM users WHERE spotify_id = ?', [spotifyData.id], (err, results) => {
            if (err) throw err;
            if (results.length === 0) {
                db.query('INSERT INTO users (username, email, password, spotify_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [spotifyData.display_name, spotifyData.email, 'spotify_oauth', spotifyData.id, access_token, refresh_token, expires_at],
                    (err2, ins) => {
                        db.query('INSERT INTO playlists (name, photo_url, user_id, is_favorites_type) VALUES (?, ?, ?, ?)',
                            ['Mis Favoritos', 'http://127.0.0.1:3001/uploads/fav.jpeg', ins.insertId, true],
                            () => res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}&spotify_id=${spotifyData.id}`));
                    });
            } else {
                const existingUserId = results[0].id;
                db.query('UPDATE users SET access_token = ?, refresh_token = ?, expires_at = ? WHERE spotify_id = ?',
                    [access_token, refresh_token, expires_at, spotifyData.id],
                    () => {
                        db.query('SELECT id FROM playlists WHERE user_id = ? AND is_favorites_type = TRUE', [existingUserId], (err3, favs) => {
                            if (favs.length === 0) {
                                db.query('INSERT INTO playlists (name, photo_url, user_id, is_favorites_type) VALUES (?, ?, ?, ?)',
                                    ['Mis Favoritos', 'http://127.0.0.1:3001/uploads/fav.jpeg', existingUserId, true],
                                    () => res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}&spotify_id=${spotifyData.id}`));
                            } else {
                                res.redirect(`http://127.0.0.1:3000/dashboard?token=${access_token}&spotify_id=${spotifyData.id}`);
                            }
                        });
                    });
            }
        });
    } catch (e) { res.redirect('http://127.0.0.1:3000/?error=auth_failed'); }
});

router.get('/search', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        const response = await axios.get(SPOTIFY_API + '/search?q=' + req.query.query + '&type=artist&limit=10', { headers: { 'Authorization': `Bearer ${token}` } });
        res.json(response.data.artists.items);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

router.get('/artist-tracks', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        const artistId = req.query.id;
        const [albumItems, epItems, singleItems] = await Promise.all([
            fetchAllPages(SPOTIFY_API + '/artists/' + artistId + '/albums?include_groups=album&market=ES&limit=10', token),
            fetchAllPages(SPOTIFY_API + '/artists/' + artistId + '/albums?include_groups=ep&market=ES&limit=10', token),
            fetchAllPages(SPOTIFY_API + '/artists/' + artistId + '/albums?include_groups=single&market=ES&limit=10', token)
        ]);
        const formatItem = (item) => ({ id: item.id, name: item.name, uri: item.uri, image: item.images[0]?.url, total_tracks: item.total_tracks, release_date: item.release_date });
        const sortByDate = (a, b) => new Date(b.release_date) - new Date(a.release_date);
        const formattedSingles = singleItems.map(formatItem);
        res.json({
            albums: albumItems.map(formatItem).sort(sortByDate),
            eps: [...epItems.map(formatItem), ...formattedSingles.filter(s => s.total_tracks > 1)].sort(sortByDate),
            singles: formattedSingles.filter(s => s.total_tracks <= 1).sort(sortByDate)
        });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

router.get('/album-tracks', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        const tracks = await fetchAllPages(SPOTIFY_API + '/albums/' + req.query.id + '/tracks?market=ES&limit=10', token);
        res.json(tracks.map((t, i) => ({ id: t.id, name: t.name, uri: t.uri, track_number: t.track_number || i + 1, duration_ms: t.duration_ms })));
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

router.get('/home-feed', async (req, res) => {
    try {
        console.log("\n========================================");
        console.log("🚀 INICIANDO CARGA DEL HOME FEED (CON CACHÉ ANTI-BLOQUEOS)...");
        
        const token = getTokenFromHeader(req);
        const spotifyId = req.headers['x-spotify-id'];
        if (!token || !spotifyId) return res.status(401).json({ error: "Faltan credenciales" });
        const config = { headers: { 'Authorization': `Bearer ${token}` } };

        // 1. Historial
        console.log("-> 1. Buscando Historial Reciente...");
        const recentRes = await axios.get(SPOTIFY_API + '/me/player/recently-played?limit=50', config).catch(() => ({ data: { items: [] } }));
        const recentFormatted = (recentRes.data.items || []).filter(i => i.track && i.track.id).map(i => ({
            id: i.track.id, spotify_track_id: i.track.id, track_name: i.track.name, artist_name: i.track.artists[0].name, image_url: i.track.album.images[0]?.url, duration_ms: i.track.duration_ms, uri: i.track.uri
        }));

        const uniqueRecentMap = new Map();
        recentFormatted.forEach(t => { if(!uniqueRecentMap.has(t.id)) uniqueRecentMap.set(t.id, t); });
        const uniqueRecent = Array.from(uniqueRecentMap.values()).slice(0, 10).map(t => ({
            id: t.id, name: t.track_name, artist: t.artist_name, image: t.image_url, uri: t.uri
        }));

        // 2. Mix Diario (Favoritos + Recientes)
        console.log("-> 2. Preparando Mix Diario...");
        const favTracks = await getFavorites(spotifyId);
        let mixPool = favTracks.map(t => ({
            id: t.spotify_track_id, spotify_track_id: t.spotify_track_id, track_name: t.track_name, artist_name: t.artist_name, image_url: t.image_url, duration_ms: t.duration_ms, uri: `spotify:track:${t.spotify_track_id}`
        }));
        
        mixPool = [...mixPool, ...recentFormatted];
        const mixMap = new Map();
        mixPool.forEach(t => { if(!mixMap.has(t.spotify_track_id)) mixMap.set(t.spotify_track_id, t); });
        let finalMix = Array.from(mixMap.values()).sort(() => 0.5 - Math.random()).slice(0, 30);
        finalMix.forEach((t, i) => t.track_number = i + 1);

        // 3. TOP ÉXITOS: SISTEMA DE CACHÉ
        console.log("-> 3. Obteniendo Top Éxitos...");
        let topTracks = [];

        // Comprobamos si tenemos las canciones guardadas y si ha pasado menos de 1 hora
        if (cachedTopTracks.length > 0 && (Date.now() - lastCacheTime < CACHE_DURATION)) {
            console.log("   ✅ Recuperando canciones de la memoria caché (0 peticiones a Spotify).");
            topTracks = cachedTopTracks;
        } else {
            console.log("   ⚠️ Caché vacía o caducada. Consultando a Spotify de forma segura...");
            
            const [res1, res2, res3] = await Promise.all([
                axios.get(`${SPOTIFY_API}/search?q=artist:quevedo&type=track&limit=10`, config).catch(() => null),
                axios.get(`${SPOTIFY_API}/search?q=artist:feid&type=track&limit=10`, config).catch(() => null),
                axios.get(`${SPOTIFY_API}/search?q=artist:rosalia&type=track&limit=10`, config).catch(() => null)
            ]);

            const rawTopTracks = [
                ...(res1?.data?.tracks?.items || []),
                ...(res2?.data?.tracks?.items || []),
                ...(res3?.data?.tracks?.items || [])
            ];

            topTracks = rawTopTracks.filter(t => t && t.id).map((t, i) => ({
                id: t.id, 
                spotify_track_id: t.id, 
                track_name: t.name, 
                artist_name: t.artists[0]?.name || 'Desconocido', 
                image_url: t.album?.images[0]?.url || 'https://via.placeholder.com/150', 
                duration_ms: t.duration_ms, 
                uri: t.uri, 
                track_number: i + 1
            }));

            if (topTracks.length > 0) {
                console.log(`   ✅ Guardando ${topTracks.length} canciones en la caché por 1 hora.`);
                cachedTopTracks = topTracks;
                lastCacheTime = Date.now();
            } else {
                console.log("   🚨 Spotify te sigue bloqueando temporalmente por Rate Limit.");
                console.log("   🛡️ Activando protocolo de emergencia: Usando canciones Fallback para que puedas seguir trabajando.");
                topTracks = fallbackTracks;
            }
        }

        console.log("=========================================\n");

        res.json({
            recentlyPlayed: uniqueRecent,
            mixRelacionados: { 
                title: "MIX DIARIO", 
                subtitle: [...new Set(finalMix.map(t => t.artist_name))].slice(0, 3).join(', ') + '...', 
                images: [...new Set(finalMix.map(t => t.image_url))].filter(Boolean).slice(0, 4), 
                tracks: finalMix 
            },
            radarNovedades: { 
                title: "Top Éxitos del Momento", 
                subtitle: [...new Set(topTracks.map(t => t.artist_name))].slice(0, 3).join(', ') + '...', 
                images: [...new Set(topTracks.map(t => t.image_url))].filter(Boolean).slice(0, 4), 
                tracks: topTracks 
            }
        });
    } catch (e) { 
        console.error("❌ Error fatal en home-feed:", e);
        res.status(500).json({ error: "Error crítico" }); 
    }
});

module.exports = router;