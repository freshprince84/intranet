/**
 * Script: Simuliert EXAKT was BoldPaymentService.loadSettings() macht
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugBoldPaymentServiceExact() {
  try {
    console.log('🔍 Simuliere EXAKT was BoldPaymentService.loadSettings() macht...\n');

    const branchId = 3; // Manila

    // Schritt 1: Lade Branch (wie in boldPaymentService.ts Zeile 68-74)
    console.log('1️⃣ Lade Branch aus Datenbank...');
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        boldPaymentSettings: true, 
        organizationId: true 
      }
    });

    if (!branch?.boldPaymentSettings) {
      throw new Error('Branch hat keine boldPaymentSettings!');
    }
    console.log('✅ Branch gefunden\n');

    // Schritt 2: decryptBranchApiSettings() (wie in Zeile 78)
    console.log('2️⃣ decryptBranchApiSettings() aufrufen...');
    const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
    console.log('   Struktur:', JSON.stringify(Object.keys(settings), null, 2));
    console.log('');

    // Schritt 3: boldPaymentSettings extrahieren (wie in Zeile 79)
    console.log('3️⃣ boldPaymentSettings extrahieren (settings?.boldPayment || settings)...');
    const boldPaymentSettings = settings?.boldPayment || settings;
    console.log('   boldPaymentSettings:', boldPaymentSettings ? '✅ vorhanden' : '❌ fehlt');
    console.log('');

    // Schritt 4: Werte prüfen (wie in Zeile 81-83)
    console.log('4️⃣ Werte die verwendet werden:');
    if (boldPaymentSettings?.apiKey) {
      const apiKey = String(boldPaymentSettings.apiKey);
      const merchantId = String(boldPaymentSettings.merchantId || '');
      
      console.log(`   apiKey: "${apiKey.substring(0, 30)}..." (Länge: ${apiKey.length})`);
      console.log(`   Enthält ":" (verschlüsselt)? ${apiKey.includes(':') ? '✅ JA' : '❌ NEIN'}`);
      console.log('');
      console.log(`   merchantId: "${merchantId}" (Länge: ${merchantId.length})`);
      console.log(`   Enthält ":" (verschlüsselt)? ${merchantId.includes(':') ? '✅ JA' : '❌ NEIN'}`);
      console.log('');

      // Schritt 5: Was würde an die API gesendet werden
      console.log('5️⃣ Was würde an die API gesendet werden:');
      console.log(`   Authorization Header: x-api-key ${merchantId}`);
      console.log('');

      // Schritt 6: Teste API-Call mit diesen EXAKTEN Werten
      console.log('6️⃣ Teste API-Call mit diesen EXAKTEN Werten...');
      const axios = require('axios');
      
      try {
        const response = await axios.post(
          'https://integrations.api.bold.co/online/link/v1',
          {
            amount_type: 'CLOSE',
            amount: {
              currency: 'COP',
              total_amount: 42000,
              subtotal: 42000,
              taxes: [],
              tip_amount: 0
            },
            reference: `DEBUG-${Date.now()}`,
            description: 'Debug Test'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `x-api-key ${merchantId}`
            },
            timeout: 30000
          }
        );

        console.log('✅ API-CALL ERFOLGREICH!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } catch (error: any) {
        console.log('❌ API-CALL FEHLGESCHLAGEN!');
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Status Text:', error.response.statusText);
          console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
          console.log('');
          console.log('⚠️ DIESER FEHLER TRITT AUCH IM SERVICE AUF!');
        } else {
          console.log('Error:', error.message);
        }
      }
    } else {
      console.log('❌ apiKey fehlt!');
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

debugBoldPaymentServiceExact()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

