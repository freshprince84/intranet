"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Geschützte Routen - erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Benutzer-Routen
router.get('/', userController_1.getAllUsers);
router.get('/profile', userController_1.getCurrentUser);
router.put('/profile', userController_1.updateProfile);
router.put('/settings', userController_1.updateUserSettings);
router.put('/switch-role', userController_1.switchUserRole);
// Neue Routen für Benutzerverwaltung
router.get('/:id', userController_1.getUserById);
router.put('/:id', userController_1.updateUserById);
router.put('/:id/roles', userController_1.updateUserRoles);
exports.default = router;
//# sourceMappingURL=users.js.map