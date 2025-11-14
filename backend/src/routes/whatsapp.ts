import express from 'express';
import { handleWebhook } from '../controllers/whatsappController';

const router = express.Router();

// Webhook-Route benötigt KEIN authMiddleware (wird von WhatsApp aufgerufen)
// Aber sollte durch Webhook-Verifizierung geschützt werden
router.post('/webhook', handleWebhook);
router.get('/webhook', handleWebhook); // Für Webhook-Verifizierung (GET Request)

export default router;

