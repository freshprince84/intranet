/**
 * Script zum Testen der Bold Payment Link-Erstellung
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';

const prisma = new PrismaClient();

async function testBoldPaymentLink(organizationId: number = 1) {
  console.log(`\n💳 Teste Bold Payment Link-Erstellung für Organisation ${organizationId}...\n`);

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
          guestPhone: '+573001234567',
          checkInDate: tomorrow,
          checkOutDate: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
          status: 'confirmed',
          paymentStatus: 'pending',
          organizationId
        }
      });
      console.log(`✅ Test-Reservierung erstellt: ID ${reservation.id}`);
    }

    console.log(`📋 Verwende Reservierung: ${reservation.guestName} (ID: ${reservation.id})\n`);

    // Teste Bold Payment Service
    const boldPaymentService = new BoldPaymentService(organizationId);
    
    console.log('🔗 Erstelle Payment-Link...');
    const amount = 100000; // 100.000 COP
    const paymentLink = await boldPaymentService.createPaymentLink(
      reservation,
      amount,
      'COP',
      `Test-Zahlung für ${reservation.guestName}`
    );

    console.log(`\n✅ Payment-Link erfolgreich erstellt!`);
    console.log(`🔗 Link: ${paymentLink}\n`);

    // Prüfe ob Link in DB gespeichert wurde
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      select: { paymentLink: true }
    });

    if (updatedReservation?.paymentLink) {
      console.log(`✅ Payment-Link in Datenbank gespeichert: ${updatedReservation.paymentLink}`);
    } else {
      console.log(`⚠️  Payment-Link wurde nicht in Datenbank gespeichert`);
    }

    console.log('\n🎉 Bold Payment Test erfolgreich!\n');
  } catch (error) {
    console.error('\n❌ Fehler beim Testen:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const organizationId = parseInt(process.argv[2] || '1');
testBoldPaymentLink(organizationId);

