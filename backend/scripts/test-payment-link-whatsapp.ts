/**
 * Script zum Testen: Zahlungslink erstellen und per WhatsApp senden
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { WhatsAppService } from '../src/services/whatsappService';

const prisma = new PrismaClient();

async function testPaymentLinkWhatsApp(organizationId: number = 1, phoneNumber: string) {
  console.log(`\n💳📱 Teste: Zahlungslink erstellen und per WhatsApp senden...\n`);

  try {
    // Finde oder erstelle Test-Reservierung
    let reservation = await prisma.reservation.findFirst({
      where: { organizationId }
    });

    if (!reservation) {
      console.log('⚠️  Keine Reservierung gefunden. Erstelle Test-Reservierung...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      reservation = await prisma.reservation.create({
        data: {
          lobbyReservationId: 'TEST-RES-' + Date.now(),
          guestName: 'Test Gast',
          guestEmail: 'test@example.com',
          guestPhone: phoneNumber,
          checkInDate: tomorrow,
          checkOutDate: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
          status: 'confirmed',
          paymentStatus: 'pending',
          organizationId
        }
      });
      console.log(`✅ Test-Reservierung erstellt: ID ${reservation.id}`);
    } else {
      console.log(`📋 Verwende vorhandene Reservierung: ${reservation.guestName} (ID: ${reservation.id})`);
    }

    // 1. Erstelle Zahlungslink
    console.log('\n🔗 Erstelle Zahlungslink...');
    const boldPaymentService = new BoldPaymentService(organizationId);
    const amount = 100000; // 100.000 COP
    const paymentLink = await boldPaymentService.createPaymentLink(
      reservation,
      amount,
      'COP',
      `Zahlung für Reservierung ${reservation.guestName}`
    );

    console.log(`✅ Zahlungslink erstellt: ${paymentLink}\n`);

    // 2. Sende per WhatsApp
    console.log(`📱 Sende Zahlungslink per WhatsApp an: ${phoneNumber}...`);
    const whatsappService = new WhatsAppService(organizationId);
    
    const message = `Hola! 👋

Este es un mensaje de prueba del sistema Intranet.

Por favor, realiza el pago de tu reservación:

${paymentLink}

¡Gracias!`;

    const success = await whatsappService.sendMessage(phoneNumber, message);

    if (success) {
      console.log(`\n✅ WhatsApp-Nachricht erfolgreich versendet!`);
      console.log(`📱 Prüfe WhatsApp auf: ${phoneNumber}`);
      console.log(`💳 Zahlungslink: ${paymentLink}\n`);
    } else {
      console.log(`\n❌ WhatsApp-Nachricht konnte nicht versendet werden`);
      process.exit(1);
    }

    console.log('🎉 Test erfolgreich abgeschlossen!\n');
  } catch (error) {
    console.error('\n❌ Fehler beim Testen:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const organizationId = parseInt(process.argv[2] || '1');
const phoneNumber = process.argv[3] || '+41 78 719 23 38';

// Normalisiere Telefonnummer (entferne Leerzeichen)
const normalizedPhone = phoneNumber.replace(/\s+/g, '');

testPaymentLinkWhatsApp(organizationId, normalizedPhone);

