"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const consultationController_1 = require("../controllers/consultationController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Consultation-Routen
router.post('/start', consultationController_1.startConsultation);
router.post('/stop', consultationController_1.stopConsultation);
router.get('/', consultationController_1.getConsultations);
router.post('/:id/link-task', consultationController_1.linkTaskToConsultation);
router.post('/:id/create-task', consultationController_1.createTaskForConsultation);
router.patch('/:id/notes', consultationController_1.updateConsultationNotes);
router.delete('/:id', consultationController_1.deleteConsultation);
exports.default = router;
//# sourceMappingURL=consultations.js.map