/**
 * Script: Korrigiert Bold Payment Settings für Manila (Branch 3)
 * 
 * Setzt die gleichen Werte wie in Organization Settings
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings, decryptApiSettings } from '../src/utils/encryption';
import { encryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixManilaBoldPaymentSettings() {
  try {
    console.log('🔧 Korrigiere Bold Payment Settings für Manila (Branch 3)...\n');

    // 1. Lade Organization Settings (korrekte Werte)
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error('Organisation 1 nicht gefunden oder hat keine Settings!');
    }

    const orgSettings = decryptApiSettings(organization.settings as any);
    const orgBoldPayment = orgSettings?.boldPayment;

    if (!orgBoldPayment?.apiKey || !orgBoldPayment?.merchantId) {
      throw new Error('Organization Settings haben keine Bold Payment Konfiguration!');
    }

    console.log('✅ Korrekte Werte aus Organization Settings:');
    console.log(`   API Key: ${String(orgBoldPayment.apiKey).substring(0, 20)}...`);
    console.log(`   Merchant ID: ${orgBoldPayment.merchantId}`);
    console.log(`   Environment: ${orgBoldPayment.environment || 'production'}`);
    console.log('');

    // 2. Lade Branch 3 (Manila)
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        boldPaymentSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch 3 (Manila) nicht gefunden!');
    }

    console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
    console.log('');

    // 3. Erstelle neue Branch Settings mit korrekten Werten
    const newBoldPaymentSettings = {
      apiKey: orgBoldPayment.apiKey,
      merchantId: orgBoldPayment.merchantId,
      environment: orgBoldPayment.environment || 'production'
    };

    // Verschlüssele die neuen Settings
    const encryptedSettings = encryptBranchApiSettings({
      boldPayment: newBoldPaymentSettings
    });

    // 4. Aktualisiere Branch Settings
    await prisma.branch.update({
      where: { id: 3 },
      data: {
        boldPaymentSettings: encryptedSettings
      }
    });

    console.log('✅ Branch Settings erfolgreich aktualisiert!');
    console.log('');
    console.log('📋 Neue Branch Settings:');
    console.log(`   API Key: ${String(newBoldPaymentSettings.apiKey).substring(0, 20)}...`);
    console.log(`   Merchant ID: ${newBoldPaymentSettings.merchantId}`);
    console.log(`   Environment: ${newBoldPaymentSettings.environment}`);
    console.log('');

    // 5. Verifiziere die Änderung
    const updatedBranch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { boldPaymentSettings: true }
    });

    if (updatedBranch?.boldPaymentSettings) {
      const { decryptBranchApiSettings } = await import('../src/utils/encryption');
      const decrypted = decryptBranchApiSettings(updatedBranch.boldPaymentSettings as any);
      const boldPayment = decrypted?.boldPayment || decrypted;

      if (boldPayment?.merchantId === orgBoldPayment.merchantId) {
        console.log('✅ Verifizierung erfolgreich: Merchant ID stimmt überein!');
      } else {
        console.log('⚠️  Verifizierung: Merchant ID stimmt nicht überein!');
      }
    }

    console.log('\n🎉 Korrektur abgeschlossen!');

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

fixManilaBoldPaymentSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });








