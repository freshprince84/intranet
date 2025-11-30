import { Request, Response } from 'express';
import { BoldPaymentService } from '../services/boldPaymentService';

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
export const handleWebhook = async (req: Request, res: Response) => {
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
    setImmediate(async () => {
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
        const organizationId = payload.metadata?.organization_id || 
                              payload.data?.metadata?.organization_id;

        if (!organizationId) {
          console.warn('[Bold Payment Webhook] Organisation-ID nicht gefunden im Webhook');
          // Versuche über Reservation-ID zu finden
          const reservationId = payload.metadata?.reservation_id || 
                              payload.data?.metadata?.reservation_id ||
                              (payload.reference ? parseInt(payload.reference.replace('RES-', '')) : null);

          if (reservationId) {
            // Finde Organisation über Reservierung
            const { prisma } = await import('../utils/prisma');
            
            const reservation = await prisma.reservation.findUnique({
              where: { id: reservationId },
              select: { organizationId: true, branchId: true }
            });

            if (reservation) {
              const boldPaymentService = reservation.branchId
                ? await BoldPaymentService.createForBranch(reservation.branchId)
                : new BoldPaymentService(reservation.organizationId);
              await boldPaymentService.handleWebhook(payload);
              console.log('[Bold Payment Webhook] ✅ Webhook verarbeitet (via Reservation-ID)');
              return;
            }
          }

          // Bei fehlenden Daten: Loggen, aber nicht fehlschlagen
          console.warn('[Bold Payment Webhook] Organisation-ID oder Reservierungs-ID fehlt im Webhook');
          return;
        }

        // Verarbeite Webhook
        const boldPaymentService = new BoldPaymentService(parseInt(organizationId));
        await boldPaymentService.handleWebhook(payload);
        console.log('[Bold Payment Webhook] ✅ Webhook verarbeitet');
      } catch (error) {
        console.error('[Bold Payment Webhook] Fehler beim Verarbeiten (asynchron):', error);
        // Fehler wird geloggt, aber Response wurde bereits gesendet
      }
    });
  } catch (error) {
    // Nur für Fehler beim Senden der Response
    console.error('[Bold Payment Webhook] Fehler beim Senden der Response:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Webhooks'
      });
    }
  }
};

