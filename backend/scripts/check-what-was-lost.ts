/**
 * Script: Prüft was beim Neu-Verschlüsseln verloren gegangen ist
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkWhatWasLost() {
  try {
    console.log('🔍 Prüfe was beim Neu-Verschlüsseln verloren gegangen ist...\n');

    // Prüfe Branch Manila
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        whatsappSettings: true,
        doorSystemSettings: true,
        boldPaymentSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch nicht gefunden!');
    }

    console.log('='.repeat(80));
    console.log('BRANCH MANILA (ID 3) - AKTUELLE SETTINGS:');
    console.log('='.repeat(80));

    // WhatsApp Settings
    if (branch.whatsappSettings) {
      const whatsapp = decryptBranchApiSettings(branch.whatsappSettings as any);
      console.log('\n📱 WhatsApp Settings:');
      console.log(JSON.stringify(whatsapp, null, 2));
      console.log('\n   Erwartete Felder:');
      console.log('   - apiKey: ' + (whatsapp?.whatsapp?.apiKey ? '✅' : '❌'));
      console.log('   - phoneNumberId: ' + (whatsapp?.whatsapp?.phoneNumberId ? '✅' : '❌'));
      console.log('   - provider: ' + (whatsapp?.whatsapp?.provider ? '✅' : '❌'));
    } else {
      console.log('\n📱 WhatsApp Settings: ❌ NICHT VORHANDEN');
    }

    // TTLock Settings
    if (branch.doorSystemSettings) {
      const ttlock = decryptBranchApiSettings(branch.doorSystemSettings as any);
      console.log('\n🔐 TTLock Settings:');
      console.log(JSON.stringify(ttlock, null, 2));
      console.log('\n   Erwartete Felder:');
      console.log('   - clientId: ' + (ttlock?.doorSystem?.clientId ? '✅' : '❌'));
      console.log('   - clientSecret: ' + (ttlock?.doorSystem?.clientSecret ? '✅' : '❌'));
      console.log('   - lockIds: ' + (ttlock?.doorSystem?.lockIds ? '✅' : '❌'));
      console.log('   - provider: ' + (ttlock?.doorSystem?.provider ? '✅' : '❌'));
    } else {
      console.log('\n🔐 TTLock Settings: ❌ NICHT VORHANDEN');
    }

    // Bold Payment Settings
    if (branch.boldPaymentSettings) {
      const bold = decryptBranchApiSettings(branch.boldPaymentSettings as any);
      console.log('\n💳 Bold Payment Settings:');
      console.log(JSON.stringify(bold, null, 2));
      console.log('\n   Erwartete Felder:');
      console.log('   - apiKey: ' + (bold?.boldPayment?.apiKey ? '✅' : '❌'));
      console.log('   - merchantId: ' + (bold?.boldPayment?.merchantId ? '✅' : '❌'));
      console.log('   - environment: ' + (bold?.boldPayment?.environment ? '✅' : '❌'));
    } else {
      console.log('\n💳 Bold Payment Settings: ❌ NICHT VORHANDEN');
    }

    console.log('');

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

checkWhatWasLost()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });












