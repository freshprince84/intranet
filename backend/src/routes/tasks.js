const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware } = require('../middleware/auth');

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);

// GET /api/tasks - Alle Tasks abrufen
router.get('/', taskController.getAllTasks);

// GET /api/tasks/:id - Einzelnen Task abrufen
router.get('/:id', taskController.getTaskById);

// POST /api/tasks - Neuen Task erstellen
router.post('/', taskController.createTask);

// PUT /api/tasks/:id - Task aktualisieren
router.put('/:id', taskController.updateTask);

// DELETE /api/tasks/:id - Task löschen
router.delete('/:id', taskController.deleteTask);

module.exports = router; 