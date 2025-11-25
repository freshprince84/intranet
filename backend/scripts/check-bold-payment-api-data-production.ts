import { PrismaClient } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Prüft Bold Payment API-Daten auf Produktivserver
 * Liest alle Organisationen und Branches aus und zeigt Bold Payment Settings an
 */
async function checkBoldPaymentApiDataProduction() {
  try {
    console.log('🔍 Prüfe Bold Payment API-Daten (Produktivserver)...\n');

    // 1. Prüfe alle Organisationen
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    console.log(`📋 Gefundene Organisationen: ${organizations.length}\n`);

    for (const org of organizations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Organisation: ${org.displayName || org.name} (ID: ${org.id})`);
      console.log(`${'='.repeat(60)}`);

      if (!org.settings) {
        console.log('   ❌ Keine Settings gefunden');
        continue;
      }

      const settings = org.settings as any;
      const boldPaymentSettings = settings?.boldPayment;

      if (!boldPaymentSettings) {
        console.log('   ❌ Keine Bold Payment-Settings gefunden');
        continue;
      }

      console.log('\n📦 Rohe Settings (verschlüsselt):');
      console.log(`   API Key vorhanden: ${!!boldPaymentSettings.apiKey}`);
      if (boldPaymentSettings.apiKey) {
        const apiKeyStr = String(boldPaymentSettings.apiKey);
        console.log(`   API Key Länge: ${apiKeyStr.length} Zeichen`);
        console.log(`   API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
        console.log(`   API Key Vorschau: ${apiKeyStr.substring(0, 30)}...`);
      }
      console.log(`   Merchant ID (roh): ${boldPaymentSettings.merchantId || 'nicht gesetzt'}`);
      console.log(`   Environment: ${boldPaymentSettings.environment || 'nicht gesetzt (Standard: sandbox)'}`);

      // Versuche Entschlüsselung
      console.log('\n🔓 Entschlüsselte Settings:');
      try {
        const decryptedSettings = decryptApiSettings(settings);
        const decryptedBoldPayment = decryptedSettings?.boldPayment;

        if (!decryptedBoldPayment) {
          console.log('   ❌ Bold Payment-Settings nach Entschlüsselung nicht gefunden!');
          continue;
        }

        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   API Key vorhanden: ${!!decryptedBoldPayment.apiKey}`);
        if (decryptedBoldPayment.apiKey) {
          const decryptedKey = String(decryptedBoldPayment.apiKey);
          console.log(`   API Key Länge: ${decryptedKey.length} Zeichen`);
          console.log(`   API Key (vollständig): ${decryptedKey}`);
        }
        console.log(`   Merchant ID (vollständig): ${decryptedBoldPayment.merchantId || 'nicht gesetzt'}`);
        console.log(`   Environment: ${decryptedBoldPayment.environment || 'nicht gesetzt (Standard: sandbox)'}`);

        // Prüfe Vollständigkeit
        console.log('\n✅ Vollständigkeitsprüfung:');
        const issues: string[] = [];
        
        if (!decryptedBoldPayment.apiKey) {
          issues.push('API Key fehlt');
        }
        if (!decryptedBoldPayment.merchantId) {
          issues.push('Merchant ID fehlt');
        }

        if (issues.length === 0) {
          console.log('   ✅ Alle erforderlichen Felder sind vorhanden');
          
          // Zeige Authorization Header Format
          console.log('\n🔑 Authorization Header:');
          console.log(`   Format: x-api-key ${decryptedBoldPayment.merchantId}`);
          console.log(`   Header-Wert: x-api-key ${decryptedBoldPayment.merchantId}`);
        } else {
          console.log('   ❌ Fehlende Felder:');
          issues.forEach(issue => console.log(`      - ${issue}`));
        }

      } catch (decryptError) {
        console.log('   ❌ Fehler bei Entschlüsselung:');
        if (decryptError instanceof Error) {
          console.log(`      ${decryptError.message}`);
        }
      }
    }

    // 2. Prüfe alle Branches
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📋 Prüfe Branches...');
    console.log(`${'='.repeat(60)}\n`);

    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        organizationId: true,
        boldPaymentSettings: true
      }
    });

    console.log(`Gefundene Branches: ${branches.length}\n`);

    for (const branch of branches) {
      if (!branch.boldPaymentSettings) {
        continue; // Überspringe Branches ohne Settings
      }

      console.log(`\n${'-'.repeat(60)}`);
      console.log(`Branch: ${branch.name} (ID: ${branch.id}, Org: ${branch.organizationId})`);
      console.log(`${'-'.repeat(60)}`);

      try {
        const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        const boldPaymentSettings = settings?.boldPayment || settings;

        console.log('\n🔓 Entschlüsselte Branch Settings:');
        console.log(`   API Key vorhanden: ${!!boldPaymentSettings?.apiKey}`);
        if (boldPaymentSettings?.apiKey) {
          const decryptedKey = String(boldPaymentSettings.apiKey);
          console.log(`   API Key Länge: ${decryptedKey.length} Zeichen`);
          console.log(`   API Key (vollständig): ${decryptedKey}`);
        }
        console.log(`   Merchant ID (vollständig): ${boldPaymentSettings?.merchantId || 'nicht gesetzt'}`);
        console.log(`   Environment: ${boldPaymentSettings?.environment || 'nicht gesetzt (Standard: sandbox)'}`);

        if (boldPaymentSettings?.merchantId) {
          console.log('\n🔑 Authorization Header:');
          console.log(`   Format: x-api-key ${boldPaymentSettings.merchantId}`);
          console.log(`   Header-Wert: x-api-key ${boldPaymentSettings.merchantId}`);
        }

      } catch (decryptError) {
        console.log('   ❌ Fehler bei Entschlüsselung:');
        if (decryptError instanceof Error) {
          console.log(`      ${decryptError.message}`);
        }
      }
    }

    console.log('\n\n✅ Prüfung abgeschlossen');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkBoldPaymentApiDataProduction()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

