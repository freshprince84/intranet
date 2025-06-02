"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const monthlyConsultationReportController_1 = require("../controllers/monthlyConsultationReportController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Monthly Report Routen
router.get('/', monthlyConsultationReportController_1.getMonthlyReports);
router.get('/check-unbilled', monthlyConsultationReportController_1.checkUnbilledConsultations);
router.get('/:id', monthlyConsultationReportController_1.getMonthlyReportById);
router.get('/:id/pdf', monthlyConsultationReportController_1.generateMonthlyReportPDF);
router.post('/generate', monthlyConsultationReportController_1.generateMonthlyReport);
router.post('/generate-automatic', monthlyConsultationReportController_1.generateAutomaticMonthlyReport);
router.patch('/:id/status', monthlyConsultationReportController_1.updateReportStatus);
router.delete('/:id', monthlyConsultationReportController_1.deleteMonthlyReport);
exports.default = router;
//# sourceMappingURL=monthlyConsultationReports.js.map