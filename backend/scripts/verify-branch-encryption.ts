/**
 * Script: Verifiziert ob Branch Settings korrekt verschlüsselt wurden
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings, decryptApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyBranchEncryption() {
  try {
    console.log('🔍 Verifiziere Branch Settings Verschlüsselung...\n');

    // 1. Lade Organization Settings (Referenz)
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      throw new Error('Organization nicht gefunden!');
    }

    const orgDecrypted = decryptApiSettings(org.settings as any);
    const orgBoldPayment = orgDecrypted?.boldPayment;

    console.log('📋 Organization Settings (Referenz):');
    console.log(`   Merchant ID: ${orgBoldPayment?.merchantId}`);
    console.log(`   API Key: ${orgBoldPayment?.apiKey ? String(orgBoldPayment.apiKey).substring(0, 20) + '...' : 'NICHT GESETZT'}`);
    console.log(`   Environment: ${orgBoldPayment?.environment || 'sandbox'}`);
    console.log('');

    // 2. Lade Branch Settings
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { boldPaymentSettings: true }
    });

    if (!branch?.boldPaymentSettings) {
      throw new Error('Branch Settings nicht gefunden!');
    }

    console.log('📋 Branch Settings (Verschlüsselt):');
    const branchSettingsRaw = branch.boldPaymentSettings as any;
    console.log(`   Typ: ${typeof branchSettingsRaw}`);
    console.log(`   Keys: ${Object.keys(branchSettingsRaw).join(', ')}`);
    if (branchSettingsRaw.boldPayment) {
      console.log(`   boldPayment vorhanden: ${!!branchSettingsRaw.boldPayment}`);
      if (branchSettingsRaw.boldPayment.merchantId) {
        console.log(`   Merchant ID (verschlüsselt): ${String(branchSettingsRaw.boldPayment.merchantId).substring(0, 50)}...`);
      }
    }
    console.log('');

    // 3. Entschlüssele Branch Settings
    console.log('🔓 Entschlüssele Branch Settings...');
    const branchDecrypted = decryptBranchApiSettings(branch.boldPaymentSettings as any);
    const branchBoldPayment = branchDecrypted?.boldPayment || branchDecrypted;

    console.log('📋 Branch Settings (Entschlüsselt):');
    console.log(`   Merchant ID: ${branchBoldPayment?.merchantId || 'NICHT GESETZT'}`);
    console.log(`   API Key: ${branchBoldPayment?.apiKey ? String(branchBoldPayment.apiKey).substring(0, 20) + '...' : 'NICHT GESETZT'}`);
    console.log(`   Environment: ${branchBoldPayment?.environment || 'sandbox'}`);
    console.log('');

    // 4. Vergleich
    console.log('='.repeat(80));
    console.log('VERGLEICH:');
    console.log('='.repeat(80));
    
    if (branchBoldPayment?.merchantId === orgBoldPayment?.merchantId) {
      console.log('✅ Merchant IDs sind IDENTISCH');
    } else {
      console.log('❌ Merchant IDs sind UNTERSCHIEDLICH!');
      console.log(`   Branch: ${branchBoldPayment?.merchantId}`);
      console.log(`   Organization: ${orgBoldPayment?.merchantId}`);
    }

    if (branchBoldPayment?.apiKey === orgBoldPayment?.apiKey) {
      console.log('✅ API Keys sind IDENTISCH');
    } else {
      console.log('❌ API Keys sind UNTERSCHIEDLICH!');
    }

    if (branchBoldPayment?.environment === orgBoldPayment?.environment) {
      console.log('✅ Environments sind IDENTISCH');
    } else {
      console.log('❌ Environments sind UNTERSCHIEDLICH!');
      console.log(`   Branch: ${branchBoldPayment?.environment || 'sandbox'}`);
      console.log(`   Organization: ${orgBoldPayment?.environment || 'sandbox'}`);
    }
    console.log('');

    // 5. Test: Neu verschlüsseln und vergleichen
    console.log('🧪 Test: Neu verschlüsseln...');
    const testEncrypted = encryptBranchApiSettings({
      boldPayment: {
        apiKey: orgBoldPayment!.apiKey,
        merchantId: orgBoldPayment!.merchantId,
        environment: orgBoldPayment!.environment || 'production'
      }
    });

    const testDecrypted = decryptBranchApiSettings(testEncrypted);
    const testBoldPayment = testDecrypted?.boldPayment || testDecrypted;

    if (testBoldPayment?.merchantId === orgBoldPayment?.merchantId) {
      console.log('✅ Neu verschlüsselte Settings können korrekt entschlüsselt werden');
    } else {
      console.log('❌ Neu verschlüsselte Settings können NICHT korrekt entschlüsselt werden!');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyBranchEncryption()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });











