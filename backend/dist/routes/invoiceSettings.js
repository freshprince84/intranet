"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const invoiceSettingsController_1 = require("../controllers/invoiceSettingsController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Invoice Settings Routen
router.get('/', invoiceSettingsController_1.getInvoiceSettings);
router.post('/', invoiceSettingsController_1.createOrUpdateInvoiceSettings);
router.put('/', invoiceSettingsController_1.createOrUpdateInvoiceSettings);
router.get('/next-number', invoiceSettingsController_1.getNextInvoiceNumber);
exports.default = router;
//# sourceMappingURL=invoiceSettings.js.map