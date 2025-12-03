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
    try {
        // Logge ALLE Requests für Debugging
        console.log('[Bold Payment Webhook] Request erhalten:', {
            method: req.method,
            url: req.url,
            path: req.path,
            headers: {
                'user-agent': req.headers['user-agent'],
                'content-type': req.headers['content-type'],
                'origin': req.headers['origin'],
                'x-bold-signature': req.headers['x-bold-signature'] ? 'present' : 'missing'
            },
            query: req.query,
            body: req.method === 'POST' ? JSON.stringify(req.body).substring(0, 200) : 'N/A'
        });
        // OPTIONS-Request für CORS Preflight
        if (req.method === 'OPTIONS') {
            console.log('[Bold Payment Webhook] OPTIONS Request - CORS Preflight');
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, x-bold-signature');
            return res.status(200).end();
        }
        // GET-Request für Webhook-Validierung (wie WhatsApp)
        // Bold Payment könnte einen GET-Request senden beim Erstellen des Webhooks
        if (req.method === 'GET') {
            console.log('[Bold Payment Webhook] GET Request - Validierung:', {
                query: req.query,
                headers: {
                    'user-agent': req.headers['user-agent'],
                    'content-type': req.headers['content-type']
                }
            });
            // Challenge-Response (falls Bold Payment einen Challenge sendet)
            const challenge = req.query.challenge || req.query.challenge_token || req.query.token;
            if (challenge) {
                console.log('[Bold Payment Webhook] Challenge-Response:', challenge);
                return res.status(200).send(String(challenge));
            }
            // Fallback: Einfache Bestätigung
            return res.status(200).json({
                success: true,
                message: 'Webhook endpoint is active',
                timestamp: new Date().toISOString()
            });
        }
        // POST-Request: Normale Webhook-Verarbeitung
        const payload = req.body;
        // WICHTIG: Bold Payment erfordert Antwort innerhalb von 2 Sekunden!
        // Deshalb: Sofort mit 200 antworten, Verarbeitung asynchron machen
        console.log('[Bold Payment Webhook] POST Request - Empfangen:', JSON.stringify(payload).substring(0, 200));
        // Sofortige Antwort (innerhalb von 2 Sekunden erforderlich)
        res.status(200).json({ success: true, message: 'Webhook received' });
        // Verarbeitung asynchron (ohne auf Antwort zu warten)
        // Verwende setImmediate, damit die Response zuerst gesendet wird
        setImmediate(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                // Validiere Webhook-Secret (falls konfiguriert)
                // TODO: Implementiere Webhook-Secret-Validierung
                // const webhookSecret = req.headers['x-bold-webhook-secret'];
                // if (webhookSecret !== process.env.BOLD_PAYMENT_WEBHOOK_SECRET) {
                //   console.error('[Bold Payment Webhook] Ungültiges Webhook-Secret');
                //   return;
                // }
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
                        const { prisma } = yield Promise.resolve().then(() => __importStar(require('../utils/prisma')));
                        const reservation = yield prisma.reservation.findUnique({
                            where: { id: reservationId },
                            select: { organizationId: true, branchId: true }
                        });
                        if (reservation) {
                            const boldPaymentService = reservation.branchId
                                ? yield boldPaymentService_1.BoldPaymentService.createForBranch(reservation.branchId)
                                : new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                            yield boldPaymentService.handleWebhook(payload);
                            console.log('[Bold Payment Webhook] ✅ Webhook verarbeitet (via Reservation-ID)');
                            return;
                        }
                    }
                    // Bei fehlenden Daten: Loggen, aber nicht fehlschlagen
                    console.warn('[Bold Payment Webhook] Organisation-ID oder Reservierungs-ID fehlt im Webhook');
                    return;
                }
                // Verarbeite Webhook
                const boldPaymentService = new boldPaymentService_1.BoldPaymentService(parseInt(organizationId));
                yield boldPaymentService.handleWebhook(payload);
                console.log('[Bold Payment Webhook] ✅ Webhook verarbeitet');
            }
            catch (error) {
                console.error('[Bold Payment Webhook] Fehler beim Verarbeiten (asynchron):', error);
                // Fehler wird geloggt, aber Response wurde bereits gesendet
            }
        }));
    }
    catch (error) {
        // Nur für Fehler beim Senden der Response
        console.error('[Bold Payment Webhook] Fehler beim Senden der Response:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Webhooks'
            });
        }
    }
});
exports.handleWebhook = handleWebhook;
//# sourceMappingURL=boldPaymentController.js.map