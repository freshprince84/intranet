import { Request, Response } from 'express';
import { WhatsAppMessageParser, ParsedReservationMessage } from '../services/whatsappMessageParser';
import { WhatsAppReservationService } from '../services/whatsappReservationService';
import { WhatsAppMessageHandler } from '../services/whatsappMessageHandler';
import { WhatsAppService } from '../services/whatsappService';
import { prisma } from '../utils/prisma';

/**
 * POST /api/whatsapp/webhook
 * Empfängt Webhooks von WhatsApp Business API
 * 
 * Verarbeitet eingehende Nachrichten und erstellt automatisch Reservierungen
 * wenn es sich um LobbyPMS Reservierungsnachrichten handelt
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Webhook] Webhook-Anfrage erhalten:', {
      method: req.method,
      path: req.path,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });

    // WhatsApp Business API Webhook-Verifizierung (GET Request)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('[WhatsApp Webhook] GET Request - Verifizierung:', { mode, token: token ? '***' : 'fehlt', challenge });

      // TODO: Webhook-Verifizierungstoken aus Settings laden
      const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WhatsApp Webhook] Webhook verifiziert');
        return res.status(200).send(challenge);
      } else {
        console.warn('[WhatsApp Webhook] Verifizierung fehlgeschlagen:', { mode, tokenMatch: token === verifyToken });
        return res.status(403).send('Forbidden');
      }
    }

    // POST Request: Eingehende Nachricht
    const body = req.body;
    console.log('[WhatsApp Webhook] POST Request Body:', JSON.stringify(body, null, 2));

    // WhatsApp Business API Format
    // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const field = changes?.field;

      console.log('[WhatsApp Webhook] Webhook Field:', field);
      console.log('[WhatsApp Webhook] Has messages:', !!value?.messages?.[0]);
      console.log('[WhatsApp Webhook] Has statuses:', !!value?.statuses?.[0]);

      // Status-Update (loggen für Debugging)
      if (value?.statuses?.[0]) {
        const statusUpdate = value.statuses[0];
        const status = statusUpdate.status;
        const messageId = statusUpdate.id;
        const recipientId = statusUpdate.recipient_id;
        const timestamp = statusUpdate.timestamp;
        const errors = statusUpdate.errors;
        
        console.log('[WhatsApp Webhook] Status-Update empfangen:', {
          status,
          messageId,
          recipientId,
          timestamp,
          errors: errors ? JSON.stringify(errors, null, 2) : 'keine'
        });
        
        // Bei Fehlern detailliert loggen
        if (status === 'failed' || errors) {
          console.error('[WhatsApp Webhook] ❌ Nachricht-Zustellung fehlgeschlagen!', {
            status,
            messageId,
            recipientId,
            errors: errors ? JSON.stringify(errors, null, 2) : 'keine Fehlerdetails',
            timestamp
          });
        } else if (status === 'sent') {
          console.log('[WhatsApp Webhook] ✅ Nachricht erfolgreich gesendet:', { messageId, recipientId });
        } else if (status === 'delivered') {
          console.log('[WhatsApp Webhook] ✅ Nachricht erfolgreich zugestellt:', { messageId, recipientId });
        } else if (status === 'read') {
          console.log('[WhatsApp Webhook] ✅ Nachricht gelesen:', { messageId, recipientId });
        }
        
        return res.status(200).json({ success: true, message: 'Status-Update empfangen' });
      }

      // Eingehende Nachricht
      if (value?.messages?.[0]) {
        const message = value.messages[0];
        const fromNumber = message.from; // Telefonnummer des Absenders
        const messageText = message.text?.body || '';
        const mediaUrl = message.image?.id || message.document?.id;
        const phoneNumberId = value.metadata?.phone_number_id;
        
        // Gruppen-Erkennung: Prüfe ob Nachricht aus Gruppe kommt
        const context = message.context;
        const groupId = context?.group_id || null;
        const isGroupMessage = !!groupId;

        console.log('[WhatsApp Webhook] Eingehende Nachricht:', {
          from: fromNumber,
          text: messageText,
          phoneNumberId: phoneNumberId,
          isGroupMessage: isGroupMessage,
          groupId: groupId
        });

        // 1. Identifiziere Branch via Phone Number ID
        const branchId = await identifyBranchFromPhoneNumberId(phoneNumberId);

        if (!branchId) {
          console.error('[WhatsApp Webhook] Branch nicht gefunden für Phone Number ID:', phoneNumberId);
          // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
          return res.status(200).json({ success: false, error: 'Branch nicht gefunden' });
        }

        console.log('[WhatsApp Webhook] Branch identifiziert:', branchId);

        // 1.5. Speichere eingehende Nachricht in Datenbank
        try {
          const { LanguageDetectionService } = require('../services/languageDetectionService');
          const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(fromNumber);
          const messageId = message.id;
          
          // Prüfe ob es eine Reservation zu dieser Telefonnummer gibt
          const reservation = await prisma.reservation.findFirst({
            where: {
              guestPhone: normalizedPhone,
              branchId: branchId
            },
            orderBy: {
              checkInDate: 'desc'
            }
          });
          
          // Speichere Nachricht
          await prisma.whatsAppMessage.create({
            data: {
              direction: 'incoming',
              phoneNumber: normalizedPhone,
              message: messageText,
              messageId: messageId,
              branchId: branchId,
              reservationId: reservation?.id || null,
              sentAt: new Date(parseInt(message.timestamp) * 1000) // WhatsApp timestamp ist in Sekunden
            }
          });
          
          console.log('[WhatsApp Webhook] ✅ Eingehende Nachricht in Datenbank gespeichert');
        } catch (dbError) {
          console.error('[WhatsApp Webhook] ⚠️ Fehler beim Speichern der eingehenden Nachricht:', dbError);
          // Weiter mit Verarbeitung, auch wenn Speichern fehlschlägt
        }

        // 2. Prüfe ob es eine LobbyPMS Reservierungsnachricht ist (bestehende Funktionalität)
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
        }

        // 3. Verarbeite Nachricht via Message Handler (neue Funktionalität)
        try {
          console.log('[WhatsApp Webhook] Rufe Message Handler auf...');
          const response = await WhatsAppMessageHandler.handleIncomingMessage(
            fromNumber,
            messageText,
            branchId,
            mediaUrl,
            groupId || undefined
          );

          console.log('[WhatsApp Webhook] Antwort generiert:', response.substring(0, 100) + '...');
          console.log('[WhatsApp Webhook] Vollständige Antwort:', response);

          // 4. Sende Antwort
          console.log('[WhatsApp Webhook] Erstelle WhatsApp Service für Branch', branchId);
          const whatsappService = await WhatsAppService.getServiceForBranch(branchId);
          
          console.log('[WhatsApp Webhook] Sende Antwort an', fromNumber, isGroupMessage ? `(Gruppe: ${groupId})` : '');
          
          // Für Gruppen: Sende mit group_id, für Einzel-Chats: normale Nachricht
          if (isGroupMessage && groupId) {
            await whatsappService.sendMessage(fromNumber, response, undefined, groupId);
          } else {
            await whatsappService.sendMessage(fromNumber, response);
          }

          console.log('[WhatsApp Webhook] ✅ Antwort erfolgreich gesendet');

          return res.status(200).json({ success: true, message: 'Nachricht verarbeitet und Antwort gesendet' });
        } catch (error) {
          console.error('[WhatsApp Webhook] ❌ Fehler bei Message Handler:', error);
          if (error instanceof Error) {
            console.error('[WhatsApp Webhook] Fehlermeldung:', error.message);
            console.error('[WhatsApp Webhook] Stack:', error.stack);
          }
          // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
          return res.status(200).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Fehler bei der Verarbeitung' 
          });
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

/**
 * Identifiziert Branch via Phone Number ID
 * 
 * 1. Prüft Phone Number Mapping
 * 2. Fallback: Sucht Branch mit dieser phoneNumberId in Settings
 */
async function identifyBranchFromPhoneNumberId(phoneNumberId: string): Promise<number | null> {
  try {
    // 1. Prüfe Phone Number Mapping
    const mapping = await prisma.whatsAppPhoneNumberMapping.findFirst({
      where: { phoneNumberId },
      select: { branchId: true }
    });

    if (mapping) {
      console.log('[WhatsApp Webhook] Branch via Mapping gefunden:', mapping.branchId);
      return mapping.branchId;
    }

    // 2. Fallback: Suche Branch mit dieser phoneNumberId in Settings
    // Prisma unterstützt JSONB-Pfad-Suche nicht direkt, daher manuell
    const branches = await prisma.branch.findMany({
      where: {
        whatsappSettings: { not: null }
      },
      select: {
        id: true,
        whatsappSettings: true
      }
    });

    for (const branch of branches) {
      if (branch.whatsappSettings) {
        const settings = branch.whatsappSettings as any;
        const whatsappSettings = settings?.whatsapp || settings;
        if (whatsappSettings?.phoneNumberId === phoneNumberId) {
          console.log('[WhatsApp Webhook] Branch via Settings gefunden:', branch.id);
          return branch.id;
        }
      }
    }

    console.warn('[WhatsApp Webhook] Kein Branch gefunden für Phone Number ID:', phoneNumberId);
    return null;
  } catch (error) {
    console.error('[WhatsApp Webhook] Fehler bei Branch-Identifikation:', error);
    return null;
  }
}

