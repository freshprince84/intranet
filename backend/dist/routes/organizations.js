"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizationController_1 = require("../controllers/organizationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Alle Routen benötigen Authentifizierung
router.use(auth_1.authMiddleware);
// GET /api/organizations - Alle Organisationen abrufen
router.get('/', organizationController_1.getAllOrganizations);
// GET /api/organizations/:id - Organisation nach ID abrufen
router.get('/:id', organizationController_1.getOrganizationById);
// GET /api/organizations/:id/stats - Organisation-Statistiken abrufen
router.get('/:id/stats', organizationController_1.getOrganizationStats);
// POST /api/organizations - Neue Organisation erstellen
router.post('/', organizationController_1.createOrganization);
// PUT /api/organizations/:id - Organisation aktualisieren
router.put('/:id', organizationController_1.updateOrganization);
// DELETE /api/organizations/:id - Organisation löschen
router.delete('/:id', organizationController_1.deleteOrganization);
exports.default = router;
//# sourceMappingURL=organizations.js.map