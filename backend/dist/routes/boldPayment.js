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
 * WICHTIG: Kein authMiddleware, da von Bold Payment aufgerufen
 * Aber sollte durch Webhook-Secret geschützt werden
 */
router.post('/webhook', boldPaymentController_1.handleWebhook);
exports.default = router;
//# sourceMappingURL=boldPayment.js.map