const express = require('express');
const cors = require('cors');
const path = require('path'); // NUEVO: Para manejar rutas de archivos
require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');
const initDatabase = require('./initDb'); 

const app = express();

app.use(cors());
app.use(express.json());

// NUEVO: Hacemos que la carpeta "uploads" sea pública para poder ver las fotos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/media', express.static(path.join(__dirname, 'media')));

const spotifyRoutes = require('./routes/spotify');
app.use('/api/spotify', spotifyRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('🚀 API de Giftify funcionando correctamente');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log(`Servidor escuchando en: http://127.0.0.1:${PORT}`);
    await initDatabase();
});