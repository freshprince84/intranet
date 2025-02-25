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
exports.default = router;
//# sourceMappingURL=users.js.map