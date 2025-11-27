/**
 * Script: Erstellt einen Zahlungslink mit 10000 COP
 * 
 * Verwendet Bold Payment API um einen Zahlungslink zu erstellen
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function createPaymentLink10000() {
  try {
    console.log('💳 Erstelle Zahlungslink mit 10000 COP...\n');

    const organizationId = 1;
    const amount = 10000; // 10000 COP
    const currency = 'COP';

    // Erstelle temporäre Reservierung (Bold Payment Service benötigt eine Reservation)
    console.log('📋 Erstelle temporäre Reservierung...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const checkOutDate = new Date(tomorrow);
    checkOutDate.setDate(checkOutDate.getDate() + 1);

    const reservation = await prisma.reservation.create({
      data: {
        lobbyReservationId: 'PAYMENT-LINK-' + Date.now(),
        guestName: 'Zahlungslink Test',
        guestEmail: 'test@example.com',
        guestPhone: '+573001234567',
        checkInDate: tomorrow,
        checkOutDate: checkOutDate,
        status: 'confirmed',
        paymentStatus: 'pending',
        amount: amount,
        currency: currency,
        organizationId: organizationId
      }
    });

    console.log(`✅ Temporäre Reservierung erstellt: ID ${reservation.id}\n`);

    // Erstelle Bold Payment Service
    console.log('🔧 Initialisiere Bold Payment Service...');
    const boldPaymentService = new BoldPaymentService(organizationId);

    // Erstelle Zahlungslink
    console.log(`💳 Erstelle Zahlungslink: ${amount} ${currency}...`);
    const paymentLink = await boldPaymentService.createPaymentLink(
      reservation,
      amount,
      currency,
      `Zahlungslink Test - ${amount} ${currency}`
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ ZAHLUNGSLINK ERFOLGREICH ERSTELLT!');
    console.log('='.repeat(80));
    console.log('');
    console.log('🔗 Zahlungslink:');
    console.log(`   ${paymentLink}`);
    console.log('');
    console.log('📋 Details:');
    console.log(`   Betrag: ${amount} ${currency}`);
    console.log(`   Reservierung ID: ${reservation.id}`);
    console.log(`   Organisation ID: ${organizationId}`);
    console.log('');
    console.log('='.repeat(80));
    console.log('');

    // Prüfe ob Link in DB gespeichert wurde
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      select: { paymentLink: true }
    });

    if (updatedReservation?.paymentLink) {
      console.log(`✅ Payment-Link in Datenbank gespeichert`);
    } else {
      console.log(`⚠️  Payment-Link wurde nicht in Datenbank gespeichert`);
    }

    console.log('\n🎉 Zahlungslink erfolgreich erstellt!\n');

  } catch (error) {
    console.error('\n❌ Fehler beim Erstellen des Zahlungslinks:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createPaymentLink10000()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });








