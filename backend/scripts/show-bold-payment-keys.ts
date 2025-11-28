import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Zeigt Bold Payment API Key und Llave de identidad (Merchant ID)
 * 
 * Ausgabe:
 * - Bold Payment API Key (Llave secreta)
 * - Llave de identidad (Merchant ID)
 * 
 * Speicherort in DB:
 * - Tabelle: Organization
 * - Feld: settings (JSONB)
 * - Pfad: settings.boldPayment.apiKey und settings.boldPayment.merchantId
 * - Verschlüsselung: AES-256-GCM (wenn ENCRYPTION_KEY gesetzt)
 */
async function showBoldPaymentKeys() {
  try {
    console.log('🔍 Lade Bold Payment-Konfiguration aus Datenbank...\n');

    // Lade Organisation (Standard: ID 1)
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

    console.log(`📋 Organisation: ${organization.displayName} (ID: ${organization.id})\n`);

    if (!organization.settings) {
      console.log('❌ Keine Settings gefunden in der Datenbank!');
      return;
    }

    const settings = organization.settings as any;
    const boldPaymentSettings = settings?.boldPayment;

    if (!boldPaymentSettings) {
      console.log('❌ Keine Bold Payment-Settings gefunden!');
      console.log('\n💡 Lösung: Bold Payment-Settings müssen über das Frontend hinzugefügt werden.');
      console.log('   Organisation → API-Konfiguration → Bold Payment');
      return;
    }

    // Versuche Entschlüsselung
    try {
      const decryptedSettings = decryptApiSettings(settings);
      const decryptedBoldPayment = decryptedSettings?.boldPayment;

      if (!decryptedBoldPayment) {
        console.log('❌ Bold Payment-Settings nach Entschlüsselung nicht gefunden!');
        return;
      }

      console.log('='.repeat(80));
      console.log('📦 BOLD PAYMENT API KONFIGURATION');
      console.log('='.repeat(80));
      console.log('');
      
      // Bold Payment API Key (Llave secreta)
      if (decryptedBoldPayment.apiKey) {
        const apiKey = String(decryptedBoldPayment.apiKey);
        console.log('🔑 Bold Payment API Key (Llave secreta):');
        console.log(`   ${apiKey}`);
        console.log(`   Länge: ${apiKey.length} Zeichen`);
        console.log('');
      } else {
        console.log('❌ Bold Payment API Key (Llave secreta): NICHT GESETZT');
        console.log('');
      }

      // Llave de identidad (Merchant ID)
      if (decryptedBoldPayment.merchantId) {
        const merchantId = String(decryptedBoldPayment.merchantId);
        console.log('🔑 Llave de identidad (Merchant ID):');
        console.log(`   ${merchantId}`);
        console.log(`   Länge: ${merchantId.length} Zeichen`);
        console.log('');
      } else {
        console.log('❌ Llave de identidad (Merchant ID): NICHT GESETZT');
        console.log('');
      }

      // Environment
      console.log('🌍 Environment:');
      console.log(`   ${decryptedBoldPayment.environment || 'sandbox (Standard)'}`);
      console.log('');

      console.log('='.repeat(80));
      console.log('📍 SPEICHERORT IN DER DATENBANK:');
      console.log('='.repeat(80));
      console.log('');
      console.log('Tabelle: Organization');
      console.log('Feld: settings (JSONB)');
      console.log('Pfad: settings.boldPayment.apiKey');
      console.log('Pfad: settings.boldPayment.merchantId');
      console.log('Verschlüsselung: AES-256-GCM (wenn ENCRYPTION_KEY gesetzt)');
      console.log('');

    } catch (decryptError) {
      console.log('❌ Fehler bei Entschlüsselung:');
      if (decryptError instanceof Error) {
        console.log(`   ${decryptError.message}`);
      }
      console.log('\n💡 Mögliche Ursachen:');
      console.log('   - ENCRYPTION_KEY ist nicht gesetzt oder falsch');
      console.log('   - Settings sind nicht verschlüsselt (Development-Modus)');
      
      // Versuche unverschlüsselte Werte anzuzeigen
      console.log('\n📋 Verschlüsselte/Unverschlüsselte Werte (Rohdaten):');
      if (boldPaymentSettings.apiKey) {
        const apiKeyStr = String(boldPaymentSettings.apiKey);
        console.log(`   API Key: ${apiKeyStr.substring(0, 50)}... (${apiKeyStr.length} Zeichen)`);
        console.log(`   Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
      }
      if (boldPaymentSettings.merchantId) {
        console.log(`   Merchant ID: ${boldPaymentSettings.merchantId}`);
      }
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

showBoldPaymentKeys()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });











