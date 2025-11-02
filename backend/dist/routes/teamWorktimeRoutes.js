"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const isTeamManager_1 = require("../middleware/isTeamManager");
const teamWorktimeController_1 = require("../controllers/teamWorktimeController");
const analyticsController_1 = require("../controllers/analyticsController");
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
// Analytics-Endpunkte
// To-Dos pro User für ein Datum (Tab 1)
router.get('/analytics/todos-by-user', analyticsController_1.getTodosByUserForDate);
// Requests pro User für ein Datum (Tab 1)
router.get('/analytics/requests-by-user', analyticsController_1.getRequestsByUserForDate);
// Alle To-Dos chronologisch für ein Datum (Tab 2)
router.get('/analytics/todos-chronological', analyticsController_1.getTodosChronological);
// Alle Requests chronologisch für ein Datum (Tab 3)
router.get('/analytics/requests-chronological', analyticsController_1.getRequestsChronological);
// Häufigkeitsanalyse für To-Dos (Tab 2)
router.get('/analytics/todos-frequency', analyticsController_1.getTodosFrequencyAnalysis);
// Schicht-basierte Analysen für To-Dos (Tab 2)
router.get('/analytics/todos-shifts', analyticsController_1.getTodosShiftAnalysis);
exports.default = router;
//# sourceMappingURL=teamWorktimeRoutes.js.map