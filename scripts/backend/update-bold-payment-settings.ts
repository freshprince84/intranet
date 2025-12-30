import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Aktualisiere Bold Payment Settings
 * 
 * Usage:
 *   npx ts-node scripts/update-bold-payment-settings.ts "API_KEY" "MERCHANT_ID" [environment]
 * 
 * Beispiel:
 *   npx ts-node scripts/update-bold-payment-settings.ts "sSG8UxJpeYMZ13lqPlcIFw" "Ixt4916HZkcVYVmH7MmLdby5NudM-F20ZsV4eX-MLso" "sandbox"
 */
async function updateBoldPaymentSettings() {
  try {
    console.log('🚀 Aktualisiere Bold Payment Settings...\n');

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

    // API Key und Merchant ID aus Argumenten oder lokalen Settings
    const apiKey = process.argv[2] || settings.boldPayment?.apiKey;
    const merchantId = process.argv[3] || settings.boldPayment?.merchantId;
    const environment = (process.argv[4] as 'sandbox' | 'production') || settings.boldPayment?.environment || 'sandbox';

    if (!apiKey) {
      throw new Error('API Key fehlt! Bitte als 1. Argument übergeben oder in lokalen Settings vorhanden sein.');
    }

    if (!merchantId) {
      throw new Error('Merchant ID fehlt! Bitte als 2. Argument übergeben oder in lokalen Settings vorhanden sein.');
    }

    // Aktualisiere Bold Payment Settings
    const updatedSettings = {
      ...settings,
      boldPayment: {
        ...settings.boldPayment,
        apiKey: apiKey,
        merchantId: merchantId,
        environment: environment
      }
    };

    // Verschlüssele die Settings (falls ENCRYPTION_KEY gesetzt ist)
    let finalSettings;
    try {
      finalSettings = encryptApiSettings(updatedSettings);
    } catch (error) {
      // Falls ENCRYPTION_KEY nicht gesetzt ist, speichere unverschlüsselt (nur für Development)
      console.log('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt (nur für Development)');
      finalSettings = updatedSettings;
    }

    // Speichere in DB
    await prisma.organization.update({
      where: { id: 1 },
      data: { settings: finalSettings }
    });

    console.log(`\n✅ Bold Payment Settings aktualisiert!`);
    console.log(`\n📋 Neue Einstellungen:`);
    console.log(`   API Key: ${apiKey.substring(0, 20)}... (${apiKey.length} Zeichen)`);
    console.log(`   Merchant ID: ${merchantId}`);
    console.log(`   Environment: ${environment}`);

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

updateBoldPaymentSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

