import { Request, Response } from 'express';
import { WhatsAppMessageParser, ParsedReservationMessage } from '../services/whatsappMessageParser';
import { WhatsAppReservationService } from '../services/whatsappReservationService';

/**
 * POST /api/whatsapp/webhook
 * Empfängt Webhooks von WhatsApp Business API
 * 
 * Verarbeitet eingehende Nachrichten und erstellt automatisch Reservierungen
 * wenn es sich um LobbyPMS Reservierungsnachrichten handelt
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // WhatsApp Business API Webhook-Verifizierung (GET Request)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // TODO: Webhook-Verifizierungstoken aus Settings laden
      const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WhatsApp Webhook] Webhook verifiziert');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send('Forbidden');
      }
    }

    // POST Request: Eingehende Nachricht
    const body = req.body;

    // WhatsApp Business API Format
    // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Eingehende Nachricht
      if (value?.messages?.[0]) {
        const message = value.messages[0];
        const messageText = message.text?.body || '';

        console.log('[WhatsApp Webhook] Eingehende Nachricht:', messageText);

        // Prüfe ob es eine LobbyPMS Reservierungsnachricht ist
        const parsedMessage = WhatsAppMessageParser.parseReservationMessage(messageText);

        if (parsedMessage) {
          console.log('[WhatsApp Webhook] LobbyPMS Reservierungsnachricht erkannt:', parsedMessage);

          // Erstelle Reservierung
          try {
            const reservation = await WhatsAppReservationService.createReservationFromMessage(parsedMessage);
            console.log('[WhatsApp Webhook] Reservierung erstellt:', reservation.id);

            // Bestätige Webhook-Empfang
            return res.status(200).json({ success: true, reservationId: reservation.id });
          } catch (error) {
            console.error('[WhatsApp Webhook] Fehler beim Erstellen der Reservierung:', error);
            // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
            return res.status(200).json({ success: false, error: 'Fehler beim Erstellen der Reservierung' });
          }
        } else {
          console.log('[WhatsApp Webhook] Keine LobbyPMS Reservierungsnachricht erkannt');
          // Normale Nachricht, nicht verarbeiten
          return res.status(200).json({ success: true, message: 'Nachricht nicht verarbeitet' });
        }
      }
    }

    // Unbekanntes Format
    console.log('[WhatsApp Webhook] Unbekanntes Webhook-Format:', JSON.stringify(body, null, 2));
    return res.status(200).json({ success: true, message: 'Webhook empfangen, aber nicht verarbeitet' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Fehler beim Verarbeiten:', error);
    // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
    return res.status(200).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

