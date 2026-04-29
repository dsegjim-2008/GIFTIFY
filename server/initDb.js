const db = require('./db');
const util = require('util');

const query = util.promisify(db.query).bind(db);

const initDatabase = async () => {
    console.log("⏳ Comprobando y construyendo la Base de Datos...");

    try {
        // 1. Usuarios (Añadido photo_url para la imagen de perfil)
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                points INT DEFAULT 0,
                spotify_id VARCHAR(255) NOT NULL,
                photo_url VARCHAR(255) DEFAULT 'http://127.0.0.1:3001/uploads/fav.jpeg',
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                expires_at BIGINT NOT NULL
            )
        `);

        // 2. Premios
        await query(`
            CREATE TABLE IF NOT EXISTS rewards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                photo_url VARCHAR(255) DEFAULT NULL,
                description TEXT,
                point_cost INT NOT NULL
            )
        `);

        // 3. Playlists 
        await query(`
            CREATE TABLE IF NOT EXISTS playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                photo_url VARCHAR(255) DEFAULT NULL,
                user_id INT NOT NULL,
                is_favorites_type BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 4. Canciones en Playlists
        await query(`
            CREATE TABLE IF NOT EXISTS playlist_songs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                playlist_id INT NOT NULL,
                spotify_track_id VARCHAR(255) NOT NULL,
                track_name VARCHAR(255),
                artist_name VARCHAR(255),
                image_url VARCHAR(255),
                duration_ms INT,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            )
        `);

        // 5. Artistas Seguidos
        await query(`
            CREATE TABLE IF NOT EXISTS followed_artists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                spotify_artist_id VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                image_url VARCHAR(255),
                UNIQUE(user_id, spotify_artist_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 6. Canjes
        await query(`
            CREATE TABLE IF NOT EXISTS redemptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                reward_id INT NOT NULL,
                points_spent INT NOT NULL,
                redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
            )
        `);

        console.log("✅ Estructura de tablas verificada.");

        // Seeder de premios
        const rewardsCount = await query('SELECT COUNT(*) as count FROM rewards');
        if (rewardsCount[0].count === 0) {
            await query(`
                INSERT INTO rewards (name, photo_url, description, point_cost) VALUES 
                ('Suscripción Premium 1 Mes', 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Spotify', 'Un mes de música sin anuncios.', 1500),
                ('Tarjeta Regalo Amazon 10€', 'https://via.placeholder.com/300/FF9900/FFFFFF?text=Amazon', 'Canjea en Amazon.', 3000),
                ('Auriculares Inalámbricos', 'https://via.placeholder.com/300/0A0E27/00D9FF?text=Auriculares', 'Cascos bluetooth neón.', 8500)
            `);
            console.log("✅ Premios de ejemplo insertados.");
        }

    } catch (error) {
        console.error("❌ Error inicializando BBDD:", error);
    }
};

module.exports = initDatabase;