"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tableSettingsController_1 = require("../controllers/tableSettingsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Alle Routen mit authMiddleware schützen
router.use(auth_1.authMiddleware);
// Tabelleneinstellungen für einen Benutzer abrufen
router.get('/:tableId', tableSettingsController_1.getUserTableSettings);
// Tabelleneinstellungen für einen Benutzer speichern
router.post('/', tableSettingsController_1.saveUserTableSettings);
exports.default = router;
//# sourceMappingURL=tableSettings.js.map