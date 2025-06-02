"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const consultationInvoiceController_1 = require("../controllers/consultationInvoiceController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Consultation Invoice Routen
router.get('/', consultationInvoiceController_1.getInvoices);
router.post('/create-from-consultations', consultationInvoiceController_1.createInvoiceFromConsultations);
router.get('/:id', consultationInvoiceController_1.getInvoiceById);
router.patch('/:id/status', consultationInvoiceController_1.updateInvoiceStatus);
router.get('/:id/pdf', consultationInvoiceController_1.generateInvoicePDFEndpoint);
router.post('/:id/mark-paid', consultationInvoiceController_1.markAsPaid);
router.delete('/:id', consultationInvoiceController_1.cancelInvoice);
exports.default = router;
//# sourceMappingURL=consultationInvoices.js.map