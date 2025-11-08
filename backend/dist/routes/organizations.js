"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const organizationController_1 = require("../controllers/organizationController");
const joinRequestController_1 = require("../controllers/joinRequestController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Route zum Erstellen einer Organisation benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.post('/', organizationController_1.createOrganization);
// Route zum Erstellen einer Join-Request benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.post('/join-request', joinRequestController_1.createJoinRequest);
// Route für eigene Beitrittsanfragen benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.get('/join-requests/my', joinRequestController_1.getMyJoinRequests);
// Route zum Zurückziehen einer Beitrittsanfrage benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.delete('/join-requests/:id/withdraw', joinRequestController_1.withdrawJoinRequest);
// Alle anderen Routen benötigen organizationMiddleware
router.use(organization_1.organizationMiddleware);
// Organisation-Routen
router.get('/current', organizationController_1.getCurrentOrganization);
router.get('/current/stats', organizationController_1.getOrganizationStats);
router.get('/current/language', organizationController_1.getOrganizationLanguage);
router.put('/current/language', organizationController_1.updateOrganizationLanguage);
router.put('/current', organizationController_1.updateCurrentOrganization);
// Join Request Routen
router.get('/join-requests', organizationController_1.getJoinRequests);
router.patch('/join-requests/:id', joinRequestController_1.processJoinRequest);
// Lebenszyklus-Rollen-Konfiguration
router.get('/current/lifecycle-roles', organizationController_1.getLifecycleRoles);
router.put('/current/lifecycle-roles', organizationController_1.updateLifecycleRoles);
// Suche
router.get('/search', organizationController_1.searchOrganizations);
exports.default = router;
//# sourceMappingURL=organizations.js.map