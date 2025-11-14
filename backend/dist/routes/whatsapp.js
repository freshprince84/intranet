"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsappController_1 = require("../controllers/whatsappController");
const router = express_1.default.Router();
// Webhook-Route benötigt KEIN authMiddleware (wird von WhatsApp aufgerufen)
// Aber sollte durch Webhook-Verifizierung geschützt werden
router.post('/webhook', whatsappController_1.handleWebhook);
router.get('/webhook', whatsappController_1.handleWebhook); // Für Webhook-Verifizierung (GET Request)
exports.default = router;
//# sourceMappingURL=whatsapp.js.map