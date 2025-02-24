const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { authMiddleware } = require('../middleware/auth');

// Alle Niederlassungen abrufen
router.get('/branches', authMiddleware, branchController.getAllBranches);

module.exports = router; 