"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_1 = require("../controllers/roleController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Alle Rollen abrufen
router.get('/', auth_1.authMiddleware, roleController_1.getAllRoles);
// Eine spezifische Rolle abrufen
router.get('/:id', auth_1.authMiddleware, roleController_1.getRoleById);
// Neue Rolle erstellen
router.post('/', auth_1.authMiddleware, roleController_1.createRole);
// Rolle aktualisieren
router.put('/:id', auth_1.authMiddleware, roleController_1.updateRole);
// Rolle löschen
router.delete('/:id', auth_1.authMiddleware, roleController_1.deleteRole);
// Berechtigungen einer Rolle abrufen
router.get('/:id/permissions', auth_1.authMiddleware, roleController_1.getRolePermissions);
exports.default = router;
//# sourceMappingURL=roles.js.map