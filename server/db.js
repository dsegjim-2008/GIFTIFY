const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // port: 3307 // Descomenta esta línea si tu MySQL de XAMPP usa el puerto 3307
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        return;
    }
    console.log('✅ Conectado a la base de datos MySQL (giftify_db)');
});

module.exports = db;