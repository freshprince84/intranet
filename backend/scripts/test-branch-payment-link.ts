/**
 * Script: Testet Payment-Link-Erstellung mit Branch Settings
 * 
 * Erstellt einen Payment-Link direkt mit Branch 3 Settings
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBranchPaymentLink() {
  try {
    console.log('🧪 Teste Payment-Link-Erstellung mit Branch 3 Settings...\n');

    // Lade Reservierung 14086
    const reservation = await prisma.reservation.findUnique({
      where: { id: 14086 },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            boldPaymentSettings: true
          }
        }
      }
    });

    if (!reservation) {
      throw new Error('Reservierung 14086 nicht gefunden!');
    }

    console.log(`📋 Reservierung: ${reservation.guestName} (ID: ${reservation.id})`);
    console.log(`   Branch: ${reservation.branch?.name} (ID: ${reservation.branchId})`);
    console.log(`   Betrag: ${reservation.amount} ${reservation.currency || 'COP'}`);
    console.log('');

    // Erstelle Bold Payment Service mit Branch
    console.log('🔧 Erstelle BoldPaymentService für Branch 3...');
    const boldPaymentService = await BoldPaymentService.createForBranch(3);
    console.log('✅ Service erstellt\n');

    // Versuche Payment-Link zu erstellen
    console.log('💳 Erstelle Payment-Link...');
    const amount = typeof reservation.amount === 'number' 
      ? reservation.amount 
      : Number(reservation.amount);
    
    const paymentLink = await boldPaymentService.createPaymentLink(
      reservation,
      amount,
      reservation.currency || 'COP',
      `Test-Zahlung für ${reservation.guestName}`
    );

    console.log('\n✅ Payment-Link erfolgreich erstellt!');
    console.log(`🔗 Link: ${paymentLink}\n`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 10).join('\n')}`);
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testBranchPaymentLink()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });










