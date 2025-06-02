"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const worktimeController_1 = require("../controllers/worktimeController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Spezifische Routen zuerst definieren
router.post('/start', worktimeController_1.startWorktime);
router.post('/stop', worktimeController_1.stopWorktime);
router.get('/stats', worktimeController_1.getWorktimeStats);
router.get('/export', worktimeController_1.exportWorktimes);
router.get('/active', worktimeController_1.getActiveWorktime);
// Dann die allgemeinen und parametrisierten Routen
router.get('/', worktimeController_1.getWorktimes);
router.put('/:id', worktimeController_1.updateWorktime);
router.delete('/:id', worktimeController_1.deleteWorktime);
exports.default = router;
//# sourceMappingURL=worktime.js.map