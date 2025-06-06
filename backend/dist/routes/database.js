"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const databaseController_1 = require("../controllers/databaseController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Database Management Routes
router.get('/tables', databaseController_1.getResetableTables);
router.post('/reset-table', databaseController_1.resetTable);
router.get('/logs', databaseController_1.getDatabaseLogs);
exports.default = router;
//# sourceMappingURL=database.js.map