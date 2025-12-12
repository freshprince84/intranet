"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
// ❌ ENTFERNT: /auth/user - wird nicht verwendet, Standard ist /users/profile (getUserById in userController.ts)
router.post('/reset-password-request', authController_1.requestPasswordReset);
router.post('/reset-password', authController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.js.map