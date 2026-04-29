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

// VARIABLES DE CACHÉ GLOBAL
let cachedTopTracks = [];
let lastCacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

const fallbackTracks = [
    { id: '1', spotify_track_id: '1', track_name: 'Columbia', artist_name: 'Quevedo', image_url: 'http://127.0.0.1:3001/uploads/fav.jpeg', duration_ms: 200000, uri: '', track_number: 1 },
    { id: '2', spotify_track_id: '2', track_name: 'LUNA', artist_name: 'Feid', image_url: 'http://127.0.0.1:3001/uploads/fav.jpeg', duration_ms: 200000, uri: '', track_number: 2 },
    { id: '3', spotify_track_id: '3', track_name: 'DESPECHÁ', artist_name: 'ROSALÍA', image_url: 'http://127.0.0.1:3001/uploads/fav.jpeg', duration_ms: 200000, uri: '', track_number: 3 }
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

// ============================================
// BUSCADOR MIXTO (Canciones en Spotify, Artistas en Deezer)
// ============================================
router.get('/search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) return res.json({ artists: [], tracks: [] });
        
        const token = getTokenFromHeader(req);

        // Buscamos Canciones en Spotify y Artistas en Deezer simultáneamente
        const [spotifyTracksRes, deezerArtistsRes] = await Promise.allSettled([
            axios.get(`${SPOTIFY_API}/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            axios.get(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=6`)
        ]);

        const tracks = spotifyTracksRes.status === 'fulfilled'
            ? (spotifyTracksRes.value.data.tracks?.items || []).map((t, i) => ({
                id: t.id,
                spotify_track_id: t.id,
                track_name: t.name,
                // Spotify nos manda todos los artistas en un array, los unimos por comas
                artist_name: t.artists.map(a => a.name).join(', '), 
                image_url: t.album.images[0]?.url || 'http://127.0.0.1:3001/uploads/fav.jpeg',
                duration_ms: t.duration_ms,
                uri: t.uri, 
                track_number: i + 1
            }))
            : [];

        const artists = deezerArtistsRes.status === 'fulfilled'
            ? (deezerArtistsRes.value.data.data || []).map(a => ({
                id: a.id.toString(),
                name: a.name,
                images: [{ url: a.picture_xl }, { url: a.picture_medium }]
            }))
            : [];

        res.json({ artists, tracks });
    } catch (e) {
        console.error('Error en /search:', e.message);
        res.status(500).json({ error: "Error en búsqueda", artists: [], tracks: [] });
    }
});

// ============================================
// DISCOGRAFÍA DEL ARTISTA (100% DEEZER)
// ============================================
router.get('/artist-tracks', async (req, res) => {
    try {
        const artistId = req.query.id;
        // Obtenemos los álbumes del artista directamente de Deezer (sin Rate Limits)
        const response = await axios.get(`https://api.deezer.com/artist/${artistId}/albums?limit=50`);
        
        const albumsData = response.data.data || [];
        
        const formatItem = (item) => ({ 
            id: item.id.toString(), 
            name: item.title, 
            uri: '', // Lo dejamos vacío para que el Frontend use el "Traductor" al darle a Play
            image: item.cover_medium, 
            total_tracks: item.tracklist ? 'Varios' : 1, 
            release_date: item.release_date || 'Desconocido' 
        });

        const albums = albumsData.filter(a => a.record_type !== 'single' && a.record_type !== 'ep').map(formatItem);
        const eps = albumsData.filter(a => a.record_type === 'ep').map(formatItem);
        const singles = albumsData.filter(a => a.record_type === 'single').map(formatItem);

        res.json({ albums, eps, singles });
    } catch (e) { 
        console.error('Error en /artist-tracks:', e.message);
        res.status(500).json({ error: "Error" }); 
    }
});

// ============================================
// CANCIONES DE UN ÁLBUM (100% DEEZER)
// ============================================
router.get('/album-tracks', async (req, res) => {
    try {
        const albumId = req.query.id;
        // 1. Obtenemos las canciones
        const response = await axios.get(`https://api.deezer.com/album/${albumId}/tracks`);
        // 2. Obtenemos la portada del álbum (Deezer la manda separada a veces)
        const albumInfo = await axios.get(`https://api.deezer.com/album/${albumId}`);
        const coverImage = albumInfo.data.cover_medium || '';

        const tracks = (response.data.data || []).map((t, i) => ({ 
            id: t.id.toString(), 
            name: t.title, 
            artist_name: t.contributors ? t.contributors.map(c => c.name).join(', ') : t.artist.name,
            image_url: coverImage, 
            uri: '', // De nuevo, vacío para que salte el traductor a Spotify
            track_number: i + 1, 
            duration_ms: t.duration * 1000 
        }));

        res.json(tracks);
    } catch (e) { 
        console.error('Error en /album-tracks:', e.message);
        res.status(500).json({ error: "Error" }); 
    }
});

// ============================================
// RESOLVEDOR DE URIs (Traductor Deezer -> Spotify)
// ============================================
router.get('/find-track-uri', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        const { name, artist } = req.query;
        if (!name || !artist) return res.json({ uri: null });

        const query = encodeURIComponent(`${name} ${artist}`);
        const response = await axios.get(`${SPOTIFY_API}/search?q=${query}&type=track&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const track = response.data.tracks?.items?.[0];
        res.json({ uri: track ? track.uri : null });
    } catch (e) {
        console.error('❌ Error traduciendo URI:', e.message);
        res.json({ uri: null });
    }
});

router.get('/home-feed', async (req, res) => {
    try {
        const token = getTokenFromHeader(req);
        const spotifyId = req.headers['x-spotify-id'];
        if (!token || !spotifyId) return res.status(401).json({ error: "Faltan credenciales" });
        const config = { headers: { 'Authorization': `Bearer ${token}` } };

        // 1. Historial (Spotify)
        const recentRes = await axios.get(SPOTIFY_API + '/me/player/recently-played?limit=50', config).catch(() => ({ data: { items: [] } }));
        const recentFormatted = (recentRes.data.items || []).filter(i => i.track && i.track.id).map(i => ({
            id: i.track.id, spotify_track_id: i.track.id, track_name: i.track.name, 
            artist_name: i.track.artists.map(a => a.name).join(', '), 
            image_url: i.track.album.images[0]?.url, duration_ms: i.track.duration_ms, uri: i.track.uri
        }));

        const uniqueRecentMap = new Map();
        recentFormatted.forEach(t => { if(!uniqueRecentMap.has(t.id)) uniqueRecentMap.set(t.id, t); });
        const uniqueRecent = Array.from(uniqueRecentMap.values()).slice(0, 10).map(t => ({
            id: t.id, name: t.track_name, artist: t.artist_name, image: t.image_url, uri: t.uri
        }));

        // 2. Mix Diario (Spotify + BD)
        const favTracks = await getFavorites(spotifyId);
        let mixPool = favTracks.map(t => ({
            id: t.spotify_track_id, spotify_track_id: t.spotify_track_id, track_name: t.track_name, artist_name: t.artist_name, image_url: t.image_url, duration_ms: t.duration_ms, uri: `spotify:track:${t.spotify_track_id}`
        }));
        
        mixPool = [...mixPool, ...recentFormatted];
        const mixMap = new Map();
        mixPool.forEach(t => { if(!mixMap.has(t.spotify_track_id)) mixMap.set(t.spotify_track_id, t); });
        let finalMix = Array.from(mixMap.values()).sort(() => 0.5 - Math.random()).slice(0, 30);
        finalMix.forEach((t, i) => t.track_number = i + 1);

        // 3. TOP ÉXITOS: API DE DEEZER (Inmune al Rate Limit)
        console.log("-> 3. Obteniendo Top Éxitos (Vía Deezer)...");
        let topTracks = [];

        if (cachedTopTracks.length > 0 && (Date.now() - lastCacheTime < CACHE_DURATION)) {
            console.log("   ✅ Recuperando canciones de la memoria caché.");
            topTracks = cachedTopTracks;
        } else {
            console.log("   ⚠️ Caché vacía. Consultando a Deezer...");
            try {
                const deezerRes = await axios.get('https://api.deezer.com/chart/0/tracks?limit=30');
                topTracks = (deezerRes.data.data || []).map((t, i) => ({
                    id: t.id.toString(), 
                    spotify_track_id: t.id.toString(), // ID falso para rellenar, se ignorará
                    track_name: t.title, 
                    artist_name: t.contributors ? t.contributors.map(c => c.name).join(', ') : t.artist.name,
                    image_url: t.album.cover_medium || 'http://127.0.0.1:3001/uploads/fav.jpeg', 
                    duration_ms: t.duration * 1000, 
                    uri: '', // Vacio intencionadamente para que el frontend lo traduzca al darle Play
                    track_number: i + 1
                }));

                if (topTracks.length > 0) {
                    console.log(`   ✅ Guardando ${topTracks.length} éxitos de Deezer en caché.`);
                    cachedTopTracks = topTracks;
                    lastCacheTime = Date.now();
                } else {
                    topTracks = fallbackTracks;
                }
            } catch (deezerError) {
                console.error("   ❌ Error en Deezer:", deezerError.message);
                topTracks = fallbackTracks;
            }
        }

        // Función auxiliar para extraer solo 3 nombres de artistas individuales para el subtítulo
        const getSubtitle = (tracks) => {
            const allArtistsRaw = tracks.map(t => t.artist_name).join(', ').split(',').map(s => s.trim()).filter(Boolean);
            const uniqueArtists = [...new Set(allArtistsRaw)];
            return uniqueArtists.slice(0, 3).join(', ') + (uniqueArtists.length > 3 ? '...' : '');
        };

        res.json({
            recentlyPlayed: uniqueRecent,
            mixRelacionados: { 
                title: "MIX DIARIO", 
                subtitle: getSubtitle(finalMix), 
                images: [...new Set(finalMix.map(t => t.image_url))].filter(Boolean).slice(0, 4), 
                tracks: finalMix 
            },
            radarNovedades: { 
                title: "Top Éxitos del Momento", 
                subtitle: getSubtitle(topTracks), 
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