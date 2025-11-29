/**
 * Script: Testet Bold Payment mit detailliertem Logging
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBoldPaymentWithLogs() {
  try {
    console.log('🧪 Teste Bold Payment mit detailliertem Logging...\n');

    // Lade Reservierung 14086
    const reservation = await prisma.reservation.findUnique({
      where: { id: 14086 }
    });

    if (!reservation) {
      throw new Error('Reservierung nicht gefunden!');
    }

    console.log(`📋 Reservierung: ${reservation.guestName} (ID: ${reservation.id})`);
    console.log(`   Branch ID: ${reservation.branchId}`);
    console.log('');

    // Erstelle Service
    console.log('🔧 Erstelle BoldPaymentService für Branch 3...');
    const service = await BoldPaymentService.createForBranch(3);
    
    const merchantId = (service as any).merchantId;
    console.log(`   Merchant ID: ${merchantId}`);
    console.log('');

    // Erstelle Payment-Link
    console.log('💳 Erstelle Payment-Link...');
    const amount = typeof reservation.amount === 'number' 
      ? reservation.amount 
      : Number(reservation.amount);
    
    try {
      const paymentLink = await service.createPaymentLink(
        reservation,
        amount,
        reservation.currency || 'COP',
        `Test-Zahlung für ${reservation.guestName}`
      );

      console.log('\n✅ Payment-Link erfolgreich erstellt!');
      console.log(`🔗 Link: ${paymentLink}\n`);
    } catch (error) {
      console.error('\n❌ Fehler beim Erstellen des Payment-Links:');
      if (error instanceof Error) {
        console.error(`   Message: ${error.message}`);
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
        }
      }
      throw error;
    }

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

testBoldPaymentWithLogs()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });












