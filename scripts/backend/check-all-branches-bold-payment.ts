import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Prüft Bold Payment-Konfiguration für alle Branches
 */
async function checkAllBranchesBoldPayment() {
  try {
    console.log('🔍 Prüfe Bold Payment-Konfiguration für alle Branches...\n');

    const branches = await prisma.branch.findMany({
      where: { organizationId: 1 },
      select: {
        id: true,
        name: true,
        organizationId: true,
        boldPaymentSettings: true
      },
      orderBy: { id: 'asc' }
    });

    if (branches.length === 0) {
      console.log('❌ Keine Branches gefunden!');
      return;
    }

    console.log(`Gefundene Branches: ${branches.length}\n`);

    for (const branch of branches) {
      console.log(`📋 Branch ${branch.id}: ${branch.name}`);
      
      if (!branch.boldPaymentSettings) {
        console.log('   ⚠️  Keine Bold Payment-Settings (verwendet Organization Settings)');
        console.log('');
        continue;
      }

      try {
        const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        const boldPaymentSettings = settings?.boldPayment || settings;

        if (!boldPaymentSettings) {
          console.log('   ❌ Settings vorhanden, aber leer');
          console.log('');
          continue;
        }

        console.log('   ✅ Bold Payment-Settings gefunden:');
        console.log(`      API Key vorhanden: ${!!boldPaymentSettings.apiKey}`);
        if (boldPaymentSettings.apiKey) {
          const apiKeyStr = String(boldPaymentSettings.apiKey);
          console.log(`      API Key Länge: ${apiKeyStr.length} Zeichen`);
          console.log(`      API Key Vorschau: ${apiKeyStr.substring(0, 30)}...`);
        }
        console.log(`      Merchant ID: ${boldPaymentSettings.merchantId || 'nicht gesetzt'}`);
        console.log(`      Environment: ${boldPaymentSettings.environment || 'nicht gesetzt (Standard: sandbox)'}`);
        
        // Warnung wenn Sandbox
        if (boldPaymentSettings.environment === 'sandbox' || !boldPaymentSettings.environment) {
          console.log('      ⚠️  WARNUNG: Environment ist auf "sandbox" - Links werden im Testmodus erstellt!');
        }
        
      } catch (error) {
        console.log('   ❌ Fehler beim Entschlüsseln der Settings:');
        if (error instanceof Error) {
          console.log(`      ${error.message}`);
        }
      }
      
      console.log('');
    }

    console.log('✅ Prüfung abgeschlossen');

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

checkAllBranchesBoldPayment()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

