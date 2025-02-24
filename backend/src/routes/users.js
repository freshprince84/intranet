const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// Alle Benutzer abrufen
router.get('/users', authMiddleware, userController.getAllUsers);

module.exports = router; 