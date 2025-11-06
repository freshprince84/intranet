"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const branchController_1 = require("../controllers/branchController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Debug-Route ohne Auth
router.get('/debug', (_req, res) => {
    res.json({ message: 'Die Route /api/branches/debug funktioniert!' });
});
// Test-Route ohne Auth mit Controller
router.get('/test', branchController_1.getTest);
// Alle Routen erfordern Authentifizierung und Organisation-Kontext
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Alle Niederlassungen abrufen - nur für authentifizierte User der Organisation
router.get('/', branchController_1.getAllBranches);
exports.default = router;
//# sourceMappingURL=branches.js.map