const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authMiddleware } = require('../middleware/auth');

// Alle Rollen abrufen
router.get('/roles', authMiddleware, roleController.getAllRoles);

// Eine spezifische Rolle abrufen
router.get('/roles/:id', authMiddleware, roleController.getRoleById);

// Neue Rolle erstellen
router.post('/roles', authMiddleware, roleController.createRole);

// Rolle aktualisieren
router.put('/roles/:id', authMiddleware, roleController.updateRole);

// Rolle löschen
router.delete('/roles/:id', authMiddleware, roleController.deleteRole);

// Berechtigungen einer Rolle abrufen
router.get('/roles/:id/permissions', authMiddleware, roleController.getRolePermissions);

module.exports = router; 