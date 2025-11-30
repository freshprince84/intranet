import express from 'express';
import { handleWebhook } from '../controllers/boldPaymentController';

const router = express.Router();

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
router.options('/webhook', handleWebhook); // OPTIONS für CORS
router.get('/webhook', handleWebhook);    // GET für Validierung
router.post('/webhook', handleWebhook);    // POST für Events

export default router;

