const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importiere Datenbank und Modelle
const sequelize = require('./config/db');
const models = require('./models');

// Importiere Routen
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const userRoutes = require('./routes/users');
const branchRoutes = require('./routes/branches');
const taskRoutes = require('./routes/tasks');

// Initialisiere Express
const app = express();

// CORS-Konfiguration
app.use(cors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routen
app.use('/api/auth', authRoutes);
app.use('/api', requestRoutes);
app.use('/api', userRoutes);
app.use('/api', branchRoutes);
app.use('/api/tasks', taskRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Etwas ist schiefgelaufen!' });
});

// Server starten
const startServer = async () => {
    try {
        // Warte auf Datenbankverbindung
        await sequelize.authenticate();
        console.log('Datenbankverbindung hergestellt');

        // Synchronisiere Modelle
        await sequelize.sync({ alter: true });
        console.log('Datenbank synchronisiert');

        // Starte Server
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server läuft auf Port ${PORT}`);
        });
    } catch (error) {
        console.error('Fehler beim Starten des Servers:', error);
        // Versuche nach 5 Sekunden erneut zu starten
        setTimeout(startServer, 5000);
    }
};

// Starte den Server
startServer(); 