"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const lobbyPmsController_1 = require("../controllers/lobbyPmsController");
const router = express_1.default.Router();
// Webhook-Route benötigt KEIN authMiddleware (wird von LobbyPMS aufgerufen)
// Aber sollte durch Webhook-Secret geschützt werden
router.post('/webhook', lobbyPmsController_1.handleWebhook);
// Alle anderen Routen erfordern Authentifizierung und Organisation
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Reservierungen
router.get('/reservations', lobbyPmsController_1.getReservations);
router.get('/reservations/:id', lobbyPmsController_1.getReservationById);
router.put('/reservations/:id/check-in', lobbyPmsController_1.checkInReservation);
// Synchronisation
router.post('/sync', lobbyPmsController_1.syncReservations);
router.post('/sync-full', lobbyPmsController_1.syncFullReservations); // ✅ MEMORY: Vollständiger Sync nach check_out_date (für manuellen ersten Sync)
// Validierung
router.get('/validate', lobbyPmsController_1.validateConnection);
exports.default = router;
//# sourceMappingURL=lobbyPms.js.map