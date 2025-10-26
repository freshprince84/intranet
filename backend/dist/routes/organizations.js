"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organizationController_1 = require("../controllers/organizationController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Organisation-Routen
router.get('/current', organizationController_1.getCurrentOrganization);
router.post('/', organizationController_1.createOrganization);
router.put('/current', organizationController_1.updateOrganization);
// Join Request Routen
router.post('/join-request', organizationController_1.createJoinRequest);
router.get('/join-requests', organizationController_1.getJoinRequests);
router.patch('/join-requests/:id', organizationController_1.processJoinRequest);
// Suche
router.get('/search', organizationController_1.searchOrganizations);
exports.default = router;
//# sourceMappingURL=organizations.js.map