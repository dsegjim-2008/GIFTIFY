-- Creación de la Base de Datos
CREATE DATABASE IF NOT EXISTS giftify_db;
USE giftify_db;

-- ============================================
-- ENTIDAD EXISTENTE: Tabla de Usuarios
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 0,
    spotify_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL
);

-- ============================================
-- NUEVA ENTIDAD: Tabla de Premios (Rewards)
-- ============================================
CREATE TABLE rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo_path VARCHAR(255) DEFAULT NULL, -- Ruta a la imagen del premio en tu servidor/assets
    description TEXT,
    point_cost INT NOT NULL
);

-- ============================================
-- NUEVA ENTIDAD: Tabla de Playlists
-- ============================================
CREATE TABLE playlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo_path VARCHAR(255) DEFAULT NULL,
    user_id INT NOT NULL, -- FK que enlaza con la tabla users
    is_favorites_type BOOLEAN DEFAULT FALSE, -- Un flag para distinguir la lista 'Favoritos' automática
    UNIQUE (user_id, is_favorites_type, CASE WHEN is_favorites_type THEN 1 ELSE NULL END), -- Restricción: Un usuario solo puede tener una playlist de favoritos
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- NUEVA ENTIDAD: Tabla Intermedia de Canciones en Playlists (Many-to-Many)
-- ============================================
CREATE TABLE playlist_songs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    playlist_id INT NOT NULL, -- FK que enlaza con la tabla playlists
    spotify_track_id VARCHAR(255) NOT NULL, -- El ID de Spotify de la canción para reproducirla
    track_number INT NOT NULL, -- El orden de la canción dentro de la playlist
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- ============================================
-- NUEVA ENTIDAD: Tabla de Transacciones de Canje (Para historial de puntos)
-- ============================================
CREATE TABLE redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    points_spent INT NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
);