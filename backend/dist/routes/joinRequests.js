"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joinRequestController_1 = require("../controllers/joinRequestController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Alle Routen benötigen Authentifizierung
router.use(auth_1.authMiddleware);
// POST /api/join-requests - Neue Beitrittsanfrage erstellen
router.post('/', joinRequestController_1.createJoinRequest);
// GET /api/join-requests - Beitrittsanfragen für aktuelle Organisation abrufen
router.get('/', joinRequestController_1.getJoinRequestsForOrganization);
// PUT /api/join-requests/:id/process - Beitrittsanfrage bearbeiten (genehmigen/ablehnen)
router.put('/:id/process', joinRequestController_1.processJoinRequest);
exports.default = router;
//# sourceMappingURL=joinRequests.js.map