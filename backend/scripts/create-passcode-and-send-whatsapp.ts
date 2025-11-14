import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import { WhatsAppService } from '../src/services/whatsappService';
import { BoldPaymentService } from '../src/services/boldPaymentService';

const prisma = new PrismaClient();

/**
 * Script: Erstelle Passcode (30 Min gültig) und sende per WhatsApp
 * - Passcode Name: Patrick
 * - Gültig: Jetzt bis in 30 Minuten
 * - WhatsApp an: +41787192338
 * - Willkommensnachricht + Zahlungslink (40000 COP)
 */

async function createPasscodeAndSendWhatsApp() {
  try {
    console.log('🚀 Erstelle Passcode und sende per WhatsApp...\n');

    // Lade Organisation 1
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation: ${organization.displayName}`);

    const settings = (organization.settings || {}) as any;
    const doorSystem = settings?.doorSystem;

    if (!doorSystem?.lockIds || doorSystem.lockIds.length === 0) {
      throw new Error('Keine Lock IDs konfiguriert!');
    }

    const lockId = doorSystem.lockIds[0];
    console.log(`🔑 Verwende Lock ID: ${lockId}\n`);

    // 1. Erstelle Passcode (gültig von jetzt bis in 30 Minuten)
    const ttlockService = new TTLockService(1);
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // +30 Minuten

    console.log(`📅 Passcode-Zeitraum:`);
    console.log(`   Start: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Ende:  ${endDate.toLocaleString('de-DE')}`);
    console.log(`   Name:  Patrick\n`);

    console.log(`🔐 Erstelle Passcode...`);
    const passcode = await ttlockService.createTemporaryPasscode(
      lockId,
      startDate,
      endDate,
      'Patrick'
    );

    console.log(`✅ Passcode erstellt: ${passcode}\n`);

    // 2. Erstelle oder finde Dummy-Reservierung für Bold Payment Link
    let reservation = await prisma.reservation.findFirst({
      where: { 
        organizationId: 1,
        guestName: 'Patrick'
      }
    });

    if (!reservation) {
      console.log('📋 Erstelle Dummy-Reservierung für Payment Link...');
      reservation = await prisma.reservation.create({
        data: {
          lobbyReservationId: 'WHATSAPP-PATRICK-' + Date.now(),
          guestName: 'Patrick',
          guestEmail: 'patrick@example.com',
          guestPhone: '+41787192338',
          checkInDate: startDate,
          checkOutDate: endDate,
          status: 'confirmed',
          paymentStatus: 'pending',
          organizationId: 1
        }
      });
      console.log(`✅ Reservierung erstellt: ID ${reservation.id}\n`);
    }

    // 3. Erstelle Bold Payment Link (40000 COP)
    console.log(`💳 Erstelle Zahlungslink (40000 COP)...`);
    const boldPaymentService = new BoldPaymentService(1);
    const paymentLink = await boldPaymentService.createPaymentLink(
      reservation,
      40000, // 40000 COP
      'COP',
      `Zahlung für Patrick - Passcode ${passcode}`
    );
    console.log(`✅ Zahlungslink erstellt: ${paymentLink}\n`);

    // 4. Erstelle Willkommensnachricht
    const welcomeMessage = `¡Bienvenido a La Familia Hostel! 🏠

Tu código de acceso es: *${passcode}*

Este código es válido hasta: ${endDate.toLocaleString('es-CO', { 
  day: '2-digit', 
  month: '2-digit', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Para realizar tu pago, por favor utiliza el siguiente enlace:
${paymentLink}

¡Esperamos que disfrutes tu estadía! 😊`;

    // 5. Sende per WhatsApp (mit Fehlerbehandlung)
    let whatsappSuccess = false;
    try {
      console.log(`📱 Sende WhatsApp-Nachricht an +41787192338...`);
      const whatsappService = new WhatsAppService(1);
      whatsappSuccess = await whatsappService.sendMessage(
        '+41787192338',
        welcomeMessage
      );

      if (whatsappSuccess) {
        console.log(`\n✅ WhatsApp-Nachricht erfolgreich versendet!`);
      } else {
        console.log(`\n⚠️  WhatsApp-Nachricht konnte nicht automatisch versendet werden.`);
      }
    } catch (whatsappError) {
      console.log(`\n⚠️  WhatsApp-Nachricht konnte nicht automatisch versendet werden.`);
      if (whatsappError instanceof Error) {
        console.log(`   Fehler: ${whatsappError.message}`);
        if (whatsappError.message.includes('expired') || whatsappError.message.includes('access token')) {
          console.log(`   💡 Lösung: WhatsApp Access Token in den Settings erneuern.`);
        }
      }
    }

    // Zeige Zusammenfassung in jedem Fall
    console.log(`\n📋 Zusammenfassung:`);
    console.log(`   ✅ Passcode: ${passcode}`);
    console.log(`   ✅ Gültig bis: ${endDate.toLocaleString('de-DE')}`);
    console.log(`   ✅ Zahlungslink: ${paymentLink}`);
    console.log(`   ${whatsappSuccess ? '✅' : '⚠️ '} WhatsApp: +41787192338`);
    console.log(`\n📱 WhatsApp-Nachricht (${whatsappSuccess ? 'versendet' : 'zum manuellen Versand'}):`);
    console.log(`   ${welcomeMessage.replace(/\n/g, '\n   ')}`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPasscodeAndSendWhatsApp()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

