"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const savedFilterController_1 = require("../controllers/savedFilterController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Middleware für die Authentifizierung
router.use(auth_1.authMiddleware);
// Routen für gespeicherte Filter
router.get('/:tableId', savedFilterController_1.getUserSavedFilters);
router.post('/', savedFilterController_1.saveFilter);
router.delete('/:id', savedFilterController_1.deleteFilter);
exports.default = router;
//# sourceMappingURL=savedFilters.js.map