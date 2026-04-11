const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Importar y usar las rutas de Spotify
const spotifyRoutes = require('./routes/spotify');
app.use('/api/spotify', spotifyRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('🚀 API de Giftify funcionando correctamente');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en: http://127.0.0.1:${PORT}`);
});