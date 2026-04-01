const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Importamos la conexión que acabamos de crear

const app = express();

// Middlewares fundamentales
app.use(cors()); // Permite que el frontend (puerto 3000) hable con el backend (puerto 3001)
app.use(express.json()); // Permite leer datos en formato JSON

// Ruta de prueba básica
app.get('/', (req, res) => {
    res.send('🚀 API de Giftify funcionando correctamente');
});

// Inicialización del servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en: http://localhost:${PORT}`);
});