import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Prüft Bold Payment-Konfiguration
 */
async function checkBoldPaymentConfig() {
  try {
    console.log('🔍 Prüfe Bold Payment-Konfiguration...\n');

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

    console.log(`Organisation: ${organization.displayName} (ID: ${organization.id})\n`);

    if (!organization.settings) {
      console.log('❌ Keine Settings gefunden!');
      return;
    }

    const settings = organization.settings as any;
    const boldPaymentSettings = settings?.boldPayment;

    console.log('Bold Payment-Settings in DB:');
    if (!boldPaymentSettings) {
      console.log('   ❌ Keine Bold Payment-Settings gefunden!');
      console.log('\n💡 Lösung: Bold Payment-Settings müssen über das Frontend hinzugefügt werden.');
      console.log('   Organisation → API-Konfiguration → Bold Payment');
      return;
    }

    console.log(`   API Key vorhanden: ${!!boldPaymentSettings.apiKey}`);
    if (boldPaymentSettings.apiKey) {
      const apiKeyStr = String(boldPaymentSettings.apiKey);
      console.log(`   API Key Länge: ${apiKeyStr.length} Zeichen`);
      console.log(`   API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
      console.log(`   API Key Vorschau: ${apiKeyStr.substring(0, 20)}...`);
    }
    console.log(`   Merchant ID: ${boldPaymentSettings.merchantId || 'nicht gesetzt'}`);
    console.log(`   Environment: ${boldPaymentSettings.environment || 'nicht gesetzt (Standard: sandbox)'}`);
    console.log('');

    // Versuche Entschlüsselung
    console.log('Entschlüsselung:');
    try {
      const decryptedSettings = decryptApiSettings(settings);
      const decryptedBoldPayment = decryptedSettings?.boldPayment;

      if (!decryptedBoldPayment) {
        console.log('   ❌ Bold Payment-Settings nach Entschlüsselung nicht gefunden!');
        return;
      }

      console.log('   ✅ Entschlüsselung erfolgreich');
      console.log(`   API Key vorhanden: ${!!decryptedBoldPayment.apiKey}`);
      if (decryptedBoldPayment.apiKey) {
        const decryptedKey = String(decryptedBoldPayment.apiKey);
        console.log(`   API Key Länge: ${decryptedKey.length} Zeichen`);
        console.log(`   API Key Vorschau: ${decryptedKey.substring(0, 30)}...`);
      }
      console.log(`   Merchant ID: ${decryptedBoldPayment.merchantId || 'nicht gesetzt'}`);
      console.log(`   Environment: ${decryptedBoldPayment.environment || 'nicht gesetzt (Standard: sandbox)'}`);
      console.log('');

      // Prüfe Vollständigkeit
      console.log('Vollständigkeitsprüfung:');
      const issues: string[] = [];
      
      if (!decryptedBoldPayment.apiKey) {
        issues.push('API Key fehlt');
      }
      if (!decryptedBoldPayment.merchantId) {
        issues.push('Merchant ID fehlt');
      }

      if (issues.length === 0) {
        console.log('   ✅ Alle erforderlichen Felder sind vorhanden');
      } else {
        console.log('   ❌ Fehlende Felder:');
        issues.forEach(issue => console.log(`      - ${issue}`));
        console.log('\n💡 Lösung: Bold Payment-Settings müssen über das Frontend hinzugefügt werden.');
        console.log('   Organisation → API-Konfiguration → Bold Payment');
      }

    } catch (decryptError) {
      console.log('   ❌ Fehler bei Entschlüsselung:');
      if (decryptError instanceof Error) {
        console.log(`      ${decryptError.message}`);
      }
    }

    console.log('\n✅ Prüfung abgeschlossen');

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

checkBoldPaymentConfig()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

