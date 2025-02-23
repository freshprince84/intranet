# Backend-Setup

1. Erstelle `src/config/db.js` für die Sequelize-Verbindung:
```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres'
});

module.exports = sequelize;


2. Erstelle erste Route in src/routes/auth.js:

const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
    res.send('Registrierung');
});

router.post('/login', (req, res) => {
    // Logik für Login und Rolle-Last-Used-Check
    res.send('Login erfolgreich');
});

module.exports = router;


3. Erstelle Route in src/routes/requests.js:

const express = require('express');
const router = express.Router();

router.post('/requests', (req, res) => {
    res.send('Request erstellt');
});

router.get('/requests', (req, res) => {
    res.send('Liste der Requests');
});

router.put('/requests/:id', (req, res) => {
    res.send('Request-Status aktualisiert');
});

module.exports = router;


4. Erstelle Route in src/routes/tasks.js:

const express = require('express');
const router = express.Router();

router.post('/tasks', (req, res) => {
    res.send('Task erstellt');
});

router.get('/tasks', (req, res) => {
    res.send('Liste der Tasks');
});

router.put('/tasks/:id', (req, res) => {
    res.send('Task-Status aktualisiert');
});

module.exports = router;


5. Erstelle Route in src/routes/roles.js:

const express = require('express');
const router = express.Router();

router.get('/roles', (req, res) => {
    res.send('Liste der Rollen');
});

router.post('/roles', (req, res) => {
    res.send('Rolle erstellt');
});

router.get('/permissions', (req, res) => {
    res.send('Liste der Berechtigungen');
});

module.exports = router;


6. Erstelle src/index.js:

const express = require('express');
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const taskRoutes = require('./routes/tasks');
const roleRoutes = require('./routes/roles');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', requestRoutes);
app.use('/api', taskRoutes);
app.use('/api', roleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
