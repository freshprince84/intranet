"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const boldPaymentController_1 = require("../controllers/boldPaymentController");
const router = express_1.default.Router();
/**
 * Bold Payment Webhook Route
 *
 * WICHTIG:
 * - OPTIONS: Für CORS Preflight-Requests
 * - GET: Für Validierung beim Erstellen des Webhooks (Bold Payment sendet möglicherweise GET-Request)
 * - POST: Für echte Webhook-Events
 * - Kein authMiddleware, da von Bold Payment aufgerufen
 * - Aber sollte durch Webhook-Secret geschützt werden
 */
router.options('/webhook', boldPaymentController_1.handleWebhook); // OPTIONS für CORS
router.get('/webhook', boldPaymentController_1.handleWebhook); // GET für Validierung
router.post('/webhook', boldPaymentController_1.handleWebhook); // POST für Events
exports.default = router;
//# sourceMappingURL=boldPayment.js.map