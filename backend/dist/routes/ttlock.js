"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const ttlockController_1 = require("../controllers/ttlockController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung und Organisation
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// TTLock Endpoints
router.get('/locks', ttlockController_1.getLocks);
router.get('/locks/:lockId/info', ttlockController_1.getLockInfo);
router.post('/passcodes', ttlockController_1.createPasscode);
router.delete('/passcodes/:passcodeId', ttlockController_1.deletePasscode);
exports.default = router;
//# sourceMappingURL=ttlock.js.map