1. Erstelle `src/config/db.js` für die Sequelize-Verbindung:
javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres'
});

module.exports = sequelize;


2. Erstelle erste Route in src/routes/auth.js:
javascript
const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
    res.send('Registrierung');
});

module.exports = router;


3. Erstelle src/index.js:
javascript
const express = require('express');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
