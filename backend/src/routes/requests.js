const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authMiddleware } = require('../middleware/auth');

// Alle Requests abrufen
router.get('/requests', authMiddleware, requestController.getAllRequests);

// Einen spezifischen Request abrufen
router.get('/requests/:id', authMiddleware, requestController.getRequestById);

// Neuen Request erstellen
router.post('/requests', authMiddleware, requestController.createRequest);

// Request aktualisieren
router.put('/requests/:id', authMiddleware, requestController.updateRequest);

// Request löschen
router.delete('/requests/:id', authMiddleware, requestController.deleteRequest);

module.exports = router; 