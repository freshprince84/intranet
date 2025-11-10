"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
router.get('/user', auth_1.authMiddleware, authController_1.getCurrentUser);
router.post('/reset-password-request', authController_1.requestPasswordReset);
router.post('/reset-password', authController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.js.map