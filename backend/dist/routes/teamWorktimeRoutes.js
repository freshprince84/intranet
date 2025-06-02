"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const isTeamManager_1 = require("../middleware/isTeamManager");
const teamWorktimeController_1 = require("../controllers/teamWorktimeController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung und Team-Manager-Berechtigung
router.use(auth_1.authenticateToken);
router.use(isTeamManager_1.isTeamManager);
// Aktive Zeiterfassungen im Team abrufen
router.get('/active', teamWorktimeController_1.getActiveTeamWorktimes);
// Zeiterfassung eines Benutzers stoppen
router.post('/stop-user', teamWorktimeController_1.stopUserWorktime);
// Zeiterfassungen eines Benutzers für einen Tag abrufen
router.get('/user-day', teamWorktimeController_1.getUserWorktimesByDay);
// Zeiterfassung aktualisieren
router.put('/update', teamWorktimeController_1.updateUserWorktime);
// Bewilligte Überstunden aktualisieren
router.put('/overtime', teamWorktimeController_1.updateApprovedOvertimeHours);
exports.default = router;
//# sourceMappingURL=teamWorktimeRoutes.js.map