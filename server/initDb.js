const db = require('./db');
const util = require('util');

const query = util.promisify(db.query).bind(db);

const initDatabase = async () => {
    console.log("⏳ Comprobando y construyendo la Base de Datos...");

    try {
        // 1. Usuarios
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                points INT DEFAULT 0,
                spotify_id VARCHAR(255) NOT NULL,
                photo_url VARCHAR(255) DEFAULT 'http://127.0.0.1:3001/media/logo.webp',
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                expires_at BIGINT NOT NULL
            )
        `);

        // 2. Premios (Incluye is_special)
        await query(`
            CREATE TABLE IF NOT EXISTS rewards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                photo_url VARCHAR(255) DEFAULT NULL,
                description TEXT,
                point_cost INT NOT NULL,
                is_special BOOLEAN DEFAULT FALSE
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

        // Seeder de premios (Corregido para insertar is_special)
        const rewardsCount = await query('SELECT COUNT(*) as count FROM rewards');
        if (rewardsCount[0].count === 0) {
            await query(`
                INSERT INTO rewards (name, photo_url, description, point_cost, is_special) VALUES 
                
                -- ==========================================
                -- 10 REGALOS ESPECIALES (is_special = TRUE)
                -- ==========================================
                ('Entrada Riverland Fest', 'http://127.0.0.1:3001/media/riverland.webp', 'Arriondas, Asturias (21-22-23 Agosto)', 1400000, TRUE),
                ('Entrada Primavera Sound', 'http://127.0.0.1:3001/media/primavera.webp', 'Barcelona (3-7 Junio)', 5500000, TRUE),
                ('Entrada Festival B', 'http://127.0.0.1:3001/media/carab.webp', 'Barcelona (18-19 Septiembre)', 1000000, TRUE),
                ('Entrada Dreambeach', 'http://127.0.0.1:3001/media/dreambeach.webp', 'Vélez-Málaga (31 Julio - 1 Agosto)', 1800000, TRUE),
                ('Entrada Concierto m&g Dellafuente', 'http://127.0.0.1:3001/media/dellafuente.webp', 'Acesso al concierto + Meet & Greet (27 Octubre)', 2000000, TRUE),
                ('Vinilo firmado Diego900', 'http://127.0.0.1:3001/media/diego900.webp', 'Vinilo de "La espalda del Sol" dedicado por el artista', 1000000, TRUE),
                ('Entrada a elegir en Ticketmaster', 'http://127.0.0.1:3001/media/ticketmaster.webp', 'En cualquier concierto disponible en 2026', 3000000, TRUE),
                ('Auriculares Inalámbricos', 'http://127.0.0.1:3001/media/jbl.webp', 'JBL Tune 777 NC', 1700000, TRUE),
                ('Tocadiscos', 'http://127.0.0.1:3001/media/tocadiscos.webp', 'Audio-Technica AT-LP60XBK', 3000000, TRUE),
                ('Altavoces', 'http://127.0.0.1:3001/media/altavoces.webp', 'Edifier MR3', 2400000, TRUE),

                -- ==========================================
                -- REGALOS NORMALES (is_special = FALSE)
                -- ==========================================
                ('Entrada Sticky M.A.', 'http://127.0.0.1:3001/media/sticky.webp', 'Entrada para cualquier concierto de la gira 2026', 570000, FALSE),
                ('Entrada Disobey', 'http://127.0.0.1:3001/media/disobey.webp', 'Entrada para cualquier concierto de la gira 2026', 540000, FALSE),
                ("Entrada L'haine", 'http://127.0.0.1:3001/media/lhaine.webp', 'Entrada para cualquier concierto de la gira 2026', 550000, FALSE),
                ('Entrada Hoke', 'http://127.0.0.1:3001/media/hoke.webp', 'Entrada para cualquier concierto de la gira 2026', 570000, FALSE),
                ('Entrada GlorySixVain', 'http://127.0.0.1:3001/media/glorysixvain.webp', 'Entrada para cualquier concierto de la gira 2026', 520000, FALSE),
                ('Entrada El Bugg', 'http://127.0.0.1:3001/media/elbugg.webp', 'Entrada para cualquier concierto de la gira 2026', 530000, FALSE),
                ('Entrada Yung Beef', 'http://127.0.0.1:3001/media/yungbeef.webp', 'Entrada para cualquier concierto de la gira 2026', 700000, FALSE),
                ('Entrada Guxo', 'http://127.0.0.1:3001/media/guxo.webp', 'Entrada para cualquier concierto de la gira 2026', 530000, FALSE),
                ('Entrada L0rna', 'http://127.0.0.1:3001/media/lorna.webp', 'Entrada para cualquier concierto de la gira 2026', 550000, FALSE),
                ('Entrada Akriila', 'http://127.0.0.1:3001/media/akriila.webp', 'Entrada para cualquier concierto de la gira 2026', 620000, FALSE),
                ('Camiseta Cruz Cafuné', 'http://127.0.0.1:3001/media/cruzzi.webp', 'Camiseta Cruz Cafuné (Talla seleccionable)', 650000, FALSE),
                ('Camiseta Recycled J', 'http://127.0.0.1:3001/media/recycled.webp', 'Camiseta Recycled J (Talla seleccionable)', 600000, FALSE),
                ('Camiseta La vendición', 'http://127.0.0.1:3001/media/lavendicion.webp', 'Camiseta La vendición(Talla seleccionable)', 540000, FALSE),
                ('Camiseta Hijos de la Ruina', 'http://127.0.0.1:3001/media/hdlr.webp', 'Camiseta Hijos de la Ruina(Talla seleccionable)', 700000, FALSE),
                ('Camiseta Rojuu', 'http://127.0.0.1:3001/media/rojuu.webp', 'Camiseta Rojuu(Talla seleccionable)', 520000, FALSE),
                ('Vinilo Juicy Bae', 'http://127.0.0.1:3001/media/juicy.webp', 'Vinilo Juicy Bae (PTSD)', 500000, FALSE),
                ('Vinilo Mvrk', 'http://127.0.0.1:3001/media/mvrk.webp', 'Vinilo Mvrk (Portate Bien!)', 500000, FALSE),
                ('Vinilo Travis Scott', 'http://127.0.0.1:3001/media/travis.webp', 'Vinilo Travis Scott (ASTROWORLD)', 540000, FALSE),
                ('Vinilo Alvaro Díaz', 'http://127.0.0.1:3001/media/alvaro.webp', 'Vinilo Alvaro Díaz (Sayonara)', 720000, FALSE),
                ('Vinilo C.Tangana', 'http://127.0.0.1:3001/media/tangana.webp', 'Vinilo C.Tangana (Avida Dollars)', 520000, FALSE),
                ('CD Rosalia', 'http://127.0.0.1:3001/media/rosalia.webp', 'CD Rosalia (LUX)', 400000, FALSE),
                ('CD LaBlackie', 'http://127.0.0.1:3001/media/blackie.webp', 'CD LaBlackie (La Favorita)', 300000, FALSE),
                ('CD Playboi Carti', 'http://127.0.0.1:3001/media/carti.webp', 'CD Playboi Carti (Music)', 450000, FALSE),
                ('CD Juice Wrld', 'http://127.0.0.1:3001/media/wrld.webp', 'CD Juice Wrld (Death Race for Love)', 400000, FALSE),
                ('CD Eminem', 'http://127.0.0.1:3001/media/eminem.webp', 'CD Eminem (The Eminem Show)', 420000, FALSE),
                ('Auriculares Inalámbricos', 'http://127.0.0.1:3001/media/auriculares.webp', 'Xiaomi Redmi Buds 8', 350000, FALSE),
                ('Bufanda Dellafuente', 'http://127.0.0.1:3001/media/bufanda.webp', 'Bufanda Dellafuente', 480000, FALSE),
                ('Cupón 25€ FNAC', 'http://127.0.0.1:3001/media/fnac.webp', 'Cupón 25€ FNAC', 500000, FALSE),
                ('Cupón 25€ MediaMarkt', 'http://127.0.0.1:3001/media/mediamarkt.webp', 'Cupón 25€ MediaMarkt', 500000, FALSE),
                ('Cupón 25€ Amazon', 'http://127.0.0.1:3001/media/amazon.webp', 'Cupón 25€ Amazon', 500000, FALSE)
            `);
            console.log("✅ Premios de ejemplo insertados.");
        }

    } catch (error) {
        console.error("❌ Error inicializando BBDD:", error);
    }
};

module.exports = initDatabase;