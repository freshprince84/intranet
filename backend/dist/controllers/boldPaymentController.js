"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = void 0;
const boldPaymentService_1 = require("../services/boldPaymentService");
/**
 * POST /api/bold-payment/webhook
 * Empfängt Webhooks von Bold Payment
 *
 * Webhook-Events können sein:
 * - payment.paid
 * - payment.completed
 * - payment.partially_paid
 * - payment.refunded
 * - payment.failed
 * - payment.cancelled
 */
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const payload = req.body;
        // Validiere Webhook-Secret (falls konfiguriert)
        // TODO: Implementiere Webhook-Secret-Validierung
        // const webhookSecret = req.headers['x-bold-webhook-secret'];
        // if (webhookSecret !== process.env.BOLD_PAYMENT_WEBHOOK_SECRET) {
        //   return res.status(401).json({ success: false, message: 'Ungültiges Webhook-Secret' });
        // }
        console.log('[Bold Payment Webhook] Empfangen:', payload);
        // Extrahiere Organisation aus Webhook-Daten
        // Bold Payment sollte organization_id oder reservation_id im Metadata haben
        const organizationId = ((_a = payload.metadata) === null || _a === void 0 ? void 0 : _a.organization_id) ||
            ((_c = (_b = payload.data) === null || _b === void 0 ? void 0 : _b.metadata) === null || _c === void 0 ? void 0 : _c.organization_id);
        if (!organizationId) {
            console.warn('[Bold Payment Webhook] Organisation-ID nicht gefunden im Webhook');
            // Versuche über Reservation-ID zu finden
            const reservationId = ((_d = payload.metadata) === null || _d === void 0 ? void 0 : _d.reservation_id) ||
                ((_f = (_e = payload.data) === null || _e === void 0 ? void 0 : _e.metadata) === null || _f === void 0 ? void 0 : _f.reservation_id) ||
                (payload.reference ? parseInt(payload.reference.replace('RES-', '')) : null);
            if (reservationId) {
                // Finde Organisation über Reservierung
                const { PrismaClient } = yield Promise.resolve().then(() => __importStar(require('@prisma/client')));
                const prisma = new PrismaClient();
                const reservation = yield prisma.reservation.findUnique({
                    where: { id: reservationId },
                    select: { organizationId: true }
                });
                if (reservation) {
                    const boldPaymentService = new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                    yield boldPaymentService.handleWebhook(payload);
                    yield prisma.$disconnect();
                    return res.json({ success: true, message: 'Webhook verarbeitet' });
                }
                yield prisma.$disconnect();
            }
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID oder Reservierungs-ID fehlt im Webhook'
            });
        }
        // Verarbeite Webhook
        const boldPaymentService = new boldPaymentService_1.BoldPaymentService(parseInt(organizationId));
        yield boldPaymentService.handleWebhook(payload);
        // Bestätige Webhook-Empfang
        res.json({ success: true, message: 'Webhook verarbeitet' });
    }
    catch (error) {
        console.error('[Bold Payment Webhook] Fehler beim Verarbeiten:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Webhooks'
        });
    }
});
exports.handleWebhook = handleWebhook;
//# sourceMappingURL=boldPaymentController.js.map