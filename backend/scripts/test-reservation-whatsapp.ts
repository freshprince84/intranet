import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from '../src/services/whatsappService';

const prisma = new PrismaClient();

async function testReservationWhatsApp() {
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

    console.log('\n=== Test WhatsApp-Versand mit Template ===');
    console.log(`Reservierung ID: ${reservation.id}`);
    console.log(`Gast: ${reservation.guestName}`);
    console.log(`Telefon: ${reservation.guestPhone || 'N/A'}`);
    console.log(`Organisation: ${reservation.organization.displayName} (ID: ${reservation.organizationId})`);

    if (!reservation.guestPhone) {
      console.log('\n❌ Keine Telefonnummer vorhanden!');
      return;
    }

    // Erstelle Check-in-Link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const checkInLink = `${frontendUrl}/check-in/${reservation.id}`;
    const paymentLink = reservation.paymentLink || 'https://checkout.bold.co/payment/TEST';

    console.log('\n--- Konfiguration ---');
    const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
    console.log(`Template Name: ${templateName}`);
    console.log(`Check-in-Link: ${checkInLink}`);
    console.log(`Payment-Link: ${paymentLink}`);

    // Template-Parameter: {{1}} = Gast-Name, {{2}} = Check-in-Link, {{3}} = Payment-Link
    const templateParams = [
      reservation.guestName,
      checkInLink,
      paymentLink
    ];

    console.log(`\nTemplate-Parameter:`);
    console.log(`  {{1}} = ${templateParams[0]}`);
    console.log(`  {{2}} = ${templateParams[1]}`);
    console.log(`  {{3}} = ${templateParams[2]}`);

    // Erstelle Nachrichtentext (für Session Message Fallback)
    const sentMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;

    console.log('\n--- Versende WhatsApp-Nachricht ---');
    const whatsappService = new WhatsAppService(reservation.organizationId);
    
    try {
      const result = await whatsappService.sendMessageWithFallback(
        reservation.guestPhone,
        sentMessage,
        templateName,
        templateParams
      );

      if (result) {
        console.log('\n✅ WhatsApp-Nachricht erfolgreich versendet!');
        console.log('Die Nachricht sollte jetzt in der Business Console erscheinen.');
        console.log('Bitte prüfe die Business Console für Template-Nachrichten.');
      } else {
        console.log('\n❌ WhatsApp-Nachricht konnte nicht versendet werden!');
      }
    } catch (error) {
      console.error('\n❌ FEHLER beim Versenden:');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Fehlertyp:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Fehlermeldung:', errorMessage);
      
      if (errorMessage.includes('template') || errorMessage.includes('Template')) {
        console.error('\n⚠️ Template-Fehler!');
        console.error('Mögliche Ursachen:');
        console.error(`1. Template "${templateName}" existiert nicht`);
        console.error('2. Template ist nicht genehmigt (Status: Pending/Rejected)');
        console.error('3. Template-Name stimmt nicht überein');
        console.error('4. Template-Parameter stimmen nicht überein');
      } else if (errorMessage.includes('24 hour') || errorMessage.includes('outside window')) {
        console.log('\nℹ️ 24h-Fenster abgelaufen - Template sollte verwendet werden');
      }
    }
  } catch (error) {
    console.error('Fehler beim Test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReservationWhatsApp();

