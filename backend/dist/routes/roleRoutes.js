"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const roleController_1 = require("../controllers/roleController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Nur Authentication anwenden - Multi-Tenant wird vom Controller selbst gehandhabt
router.use(auth_1.authenticateToken);
// Rollen-Routen
router.get('/', roleController_1.getAllRoles);
router.get('/:id', roleController_1.getRoleById);
router.post('/', roleController_1.createRole);
router.put('/:id', roleController_1.updateRole);
router.delete('/:id', roleController_1.deleteRole);
router.get('/:id/permissions', roleController_1.getRolePermissions);
exports.default = router;
//# sourceMappingURL=roleRoutes.js.map