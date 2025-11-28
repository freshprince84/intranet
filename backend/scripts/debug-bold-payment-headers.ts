/**
 * Script: Debuggt welche Merchant ID tatsächlich verwendet wird
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugBoldPaymentHeaders() {
  try {
    console.log('🔍 Debug: Welche Merchant ID wird verwendet?\n');

    // 1. Prüfe Branch Settings
    console.log('='.repeat(80));
    console.log('BRANCH 3 SETTINGS (ROHDATEN):');
    console.log('='.repeat(80));
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { boldPaymentSettings: true }
    });

    if (branch?.boldPaymentSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        const boldPayment = decrypted?.boldPayment || decrypted;
        console.log('   API Key:', boldPayment?.apiKey ? String(boldPayment.apiKey).substring(0, 30) + '...' : 'NICHT GESETZT');
        console.log('   Merchant ID:', boldPayment?.merchantId || 'NICHT GESETZT');
        console.log('   Environment:', boldPayment?.environment || 'sandbox');
        console.log('');
      } catch (error) {
        console.log('   ❌ Fehler beim Entschlüsseln:', error instanceof Error ? error.message : String(error));
        console.log('');
      }
    } else {
      console.log('   ⚠️  Keine Branch Settings');
      console.log('');
    }

    // 2. Prüfe Organization Settings
    console.log('='.repeat(80));
    console.log('ORGANIZATION SETTINGS (ROHDATEN):');
    console.log('='.repeat(80));
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (org?.settings) {
      try {
        const decrypted = decryptApiSettings(org.settings as any);
        const boldPayment = decrypted?.boldPayment;
        console.log('   API Key:', boldPayment?.apiKey ? String(boldPayment.apiKey).substring(0, 30) + '...' : 'NICHT GESETZT');
        console.log('   Merchant ID:', boldPayment?.merchantId || 'NICHT GESETZT');
        console.log('   Environment:', boldPayment?.environment || 'sandbox');
        console.log('');
      } catch (error) {
        console.log('   ❌ Fehler beim Entschlüsseln:', error instanceof Error ? error.message : String(error));
        console.log('');
      }
    }

    // 3. Teste mit Branch Service
    console.log('='.repeat(80));
    console.log('TEST MIT BRANCH SERVICE:');
    console.log('='.repeat(80));
    const branchService = await BoldPaymentService.createForBranch(3);
    // Zugriff auf private Felder über Reflection (nur für Debug)
    const merchantId = (branchService as any).merchantId;
    const apiKey = (branchService as any).apiKey;
    const environment = (branchService as any).environment;
    console.log('   Merchant ID (Service):', merchantId || 'NICHT GESETZT');
    console.log('   API Key (Service):', apiKey ? String(apiKey).substring(0, 30) + '...' : 'NICHT GESETZT');
    console.log('   Environment (Service):', environment || 'sandbox');
    console.log('');

    // 4. Teste mit Organization Service
    console.log('='.repeat(80));
    console.log('TEST MIT ORGANIZATION SERVICE:');
    console.log('='.repeat(80));
    const orgService = new BoldPaymentService(1);
    await (orgService as any).loadSettings();
    const orgMerchantId = (orgService as any).merchantId;
    const orgApiKey = (orgService as any).apiKey;
    const orgEnvironment = (orgService as any).environment;
    console.log('   Merchant ID (Service):', orgMerchantId || 'NICHT GESETZT');
    console.log('   API Key (Service):', orgApiKey ? String(orgApiKey).substring(0, 30) + '...' : 'NICHT GESETZT');
    console.log('   Environment (Service):', orgEnvironment || 'sandbox');
    console.log('');

    // 5. Vergleich
    console.log('='.repeat(80));
    console.log('VERGLEICH:');
    console.log('='.repeat(80));
    if (merchantId === orgMerchantId) {
      console.log('✅ Merchant IDs sind IDENTISCH');
    } else {
      console.log('❌ Merchant IDs sind UNTERSCHIEDLICH!');
      console.log('   Branch:', merchantId);
      console.log('   Organization:', orgMerchantId);
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

debugBoldPaymentHeaders()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });










