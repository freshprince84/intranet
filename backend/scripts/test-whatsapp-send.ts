import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from '../src/services/whatsappService';

const prisma = new PrismaClient();

async function testWhatsAppSend() {
  try {
    // Hole neueste Reservierung
    const reservation = await prisma.reservation.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!reservation) {
      console.log('Keine Reservierung gefunden.');
      return;
    }

    console.log('\n=== Test WhatsApp-Versand ===');
    console.log(`Reservierung ID: ${reservation.id}`);
    console.log(`Gast: ${reservation.guestName}`);
    console.log(`Telefon: ${reservation.guestPhone || 'N/A'}`);
    console.log(`Organisation: ${reservation.organization.displayName} (ID: ${reservation.organizationId})`);
    console.log(`Status: ${reservation.status}`);
    console.log(`Nachricht bereits versendet: ${reservation.sentMessageAt ? 'JA' : 'NEIN'}`);

    if (!reservation.guestPhone) {
      console.log('\n❌ Keine Telefonnummer vorhanden!');
      return;
    }

    console.log('\n--- Initialisiere WhatsApp Service ---');
    const whatsappService = new WhatsAppService(reservation.organizationId);
    
    console.log('\n--- Teste sendMessageWithFallback ---');
    const testMessage = `Test-Nachricht für Reservierung ${reservation.id}`;
    const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_confirmation';
    const templateParams = [
      reservation.guestName,
      'Test Betrag',
      'Test Link',
      reservation.paymentLink || 'Test Payment Link'
    ];

    console.log(`Sende an: ${reservation.guestPhone}`);
    console.log(`Template: ${templateName}`);
    console.log(`Message: ${testMessage}`);

    try {
      const result = await whatsappService.sendMessageWithFallback(
        reservation.guestPhone,
        testMessage,
        templateName,
        templateParams
      );

      console.log(`\n✅ Ergebnis: ${result ? 'ERFOLG' : 'FEHLER'}`);
      if (result) {
        console.log('✅ WhatsApp-Nachricht wurde erfolgreich versendet!');
      } else {
        console.log('❌ WhatsApp-Nachricht konnte nicht versendet werden!');
      }
    } catch (error) {
      console.error('\n❌ FEHLER beim Versenden:');
      console.error('Fehlertyp:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Fehlermeldung:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('Stack Trace:', error.stack);
      }
      
      // Detaillierte Fehleranalyse
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('access token') || errorMessage.includes('OAuthException')) {
        console.error('\n⚠️ PROBLEM: WhatsApp Access Token ist abgelaufen oder ungültig!');
      } else if (errorMessage.includes('API Key') || errorMessage.includes('nicht konfiguriert')) {
        console.error('\n⚠️ PROBLEM: WhatsApp API Key fehlt oder ist nicht korrekt konfiguriert!');
      } else if (errorMessage.includes('Phone Number ID')) {
        console.error('\n⚠️ PROBLEM: WhatsApp Phone Number ID fehlt oder ist nicht korrekt konfiguriert!');
      } else if (errorMessage.includes('Settings nicht gefunden')) {
        console.error('\n⚠️ PROBLEM: WhatsApp Settings nicht gefunden für Organisation!');
      } else if (errorMessage.includes('ENCRYPTION_KEY')) {
        console.error('\n⚠️ PROBLEM: ENCRYPTION_KEY fehlt in den Environment-Variablen!');
      }
    }
  } catch (error) {
    console.error('Fehler beim Test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWhatsAppSend();
