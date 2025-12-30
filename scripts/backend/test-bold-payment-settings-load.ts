/**
 * Script: Testet wie BoldPaymentService die Settings lädt
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBoldPaymentSettingsLoad() {
  try {
    console.log('🔍 Test: Wie lädt BoldPaymentService die Settings?\n');

    // Simuliere loadSettings() Logik
    const branchId = 3; // Manila
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        id: true,
        name: true,
        boldPaymentSettings: true 
      }
    });

    if (!branch?.boldPaymentSettings) {
      throw new Error('Branch 3 hat keine boldPaymentSettings!');
    }

    console.log(`✅ Branch ${branch.id} (${branch.name}) gefunden\n`);

    // Schritt 1: decryptBranchApiSettings() aufrufen
    console.log('1️⃣ decryptBranchApiSettings() aufrufen...');
    const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
    console.log('   Struktur:', JSON.stringify(Object.keys(settings), null, 2));
    console.log('');

    // Schritt 2: boldPaymentSettings extrahieren (wie in boldPaymentService.ts Zeile 79)
    console.log('2️⃣ boldPaymentSettings extrahieren (settings?.boldPayment || settings)...');
    const boldPaymentSettings = settings?.boldPayment || settings;
    console.log('   boldPaymentSettings:', boldPaymentSettings ? '✅ vorhanden' : '❌ fehlt');
    console.log('');

    // Schritt 3: Werte anzeigen
    console.log('3️⃣ Werte die verwendet werden:');
    if (boldPaymentSettings) {
      console.log(`   apiKey: ${boldPaymentSettings.apiKey ? `"${boldPaymentSettings.apiKey.substring(0, 30)}..." (Länge: ${boldPaymentSettings.apiKey.length})` : '❌ FEHLT'}`);
      console.log(`   Enthält ":" (verschlüsselt)? ${boldPaymentSettings.apiKey?.includes(':') ? '✅ JA - VERSCHLÜSSELT!' : '❌ NEIN - UNVERSCHLÜSSELT'}`);
      console.log('');
      console.log(`   merchantId: ${boldPaymentSettings.merchantId ? `"${boldPaymentSettings.merchantId}" (Länge: ${boldPaymentSettings.merchantId.length})` : '❌ FEHLT'}`);
      console.log(`   Enthält ":" (verschlüsselt)? ${boldPaymentSettings.merchantId?.includes(':') ? '✅ JA - VERSCHLÜSSELT!' : '❌ NEIN - UNVERSCHLÜSSELT'}`);
      console.log('');
      console.log(`   environment: ${boldPaymentSettings.environment || '❌ FEHLT'}`);
    }

    // Schritt 4: Zeige was an die API gesendet würde
    console.log('');
    console.log('4️⃣ Was würde an die API gesendet werden:');
    if (boldPaymentSettings?.merchantId) {
      console.log(`   Authorization Header: x-api-key ${boldPaymentSettings.merchantId}`);
    } else {
      console.log('   ❌ merchantId fehlt!');
    }

    // Schritt 5: Prüfe ob Werte korrekt aussehen
    console.log('');
    console.log('5️⃣ Prüfung:');
    if (boldPaymentSettings?.merchantId && boldPaymentSettings.merchantId.includes(':')) {
      console.log('   ⚠️ merchantId ist noch verschlüsselt! → 403 Forbidden');
    } else if (boldPaymentSettings?.merchantId) {
      console.log('   ✅ merchantId ist entschlüsselt');
      console.log(`   ⚠️ ABER: Prüfe ob der Wert korrekt ist (sollte die "Llave de identidad" sein)`);
    } else {
      console.log('   ❌ merchantId fehlt komplett!');
    }

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

testBoldPaymentSettingsLoad()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

