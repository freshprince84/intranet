"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const branchController_1 = require("../controllers/branchController");
const router = (0, express_1.Router)();
// Debug-Route ohne Auth
router.get('/debug', (_req, res) => {
    res.json({ message: 'Die Route /api/branches/debug funktioniert!' });
});
// Test-Route ohne Auth mit Controller
router.get('/test', branchController_1.getTest);
// Alle Niederlassungen abrufen - ohne Auth zum Testen
router.get('/', branchController_1.getAllBranches);
exports.default = router;
//# sourceMappingURL=branches.js.map