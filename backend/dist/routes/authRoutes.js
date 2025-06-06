"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authController_2 = require("../controllers/authController");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Original auth routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
router.get('/profile', auth_1.authenticateToken, authController_1.getCurrentUser);
router.put('/profile', auth_1.authenticateToken, userController_1.updateProfile);
// Extended registration routes for multi-tenant support
router.post('/register-with-organization', authController_2.authController.registerWithOrganization.bind(authController_2.authController));
router.post('/request-join-organization', authController_2.authController.requestToJoinOrganization.bind(authController_2.authController));
router.put('/join-requests/:requestId/approve', auth_1.authenticateToken, authController_2.authController.approveJoinRequest.bind(authController_2.authController));
router.get('/registration-organizations', authController_2.authController.getRegistrationOrganizations.bind(authController_2.authController));
exports.default = router;
//# sourceMappingURL=authRoutes.js.map