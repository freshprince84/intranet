/**
 * Script: Testet Bold Payment API mit Branch-Level Settings (Branch 3 - Manila)
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBoldPaymentBranchSettings() {
  try {
    console.log('🔍 Teste Bold Payment API mit Branch-Level Settings (Branch 3 - Manila)...\n');

    // 1. Lade Branch Settings
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
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

    // 2. Entschlüssele Settings
    const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
    const boldPaymentSettings = settings?.boldPayment || settings;

    if (!boldPaymentSettings?.apiKey || !boldPaymentSettings?.merchantId) {
      throw new Error('Bold Payment Settings nicht vollständig');
    }

    const apiKey = String(boldPaymentSettings.apiKey);
    const merchantId = String(boldPaymentSettings.merchantId);
    const environment = boldPaymentSettings.environment || 'sandbox';

    console.log('📋 Gefundene Settings:');
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   Merchant ID: ${merchantId}`);
    console.log(`   Environment: ${environment}`);
    console.log('');

    const apiUrl = 'https://integrations.api.bold.co';

    console.log(`🌐 API URL: ${apiUrl}`);
    console.log(`🔑 Authorization Header: x-api-key ${merchantId}`);
    console.log('');

    // 3. Teste API-Call
    console.log('='.repeat(60));
    console.log('TEST: Payment-Link erstellen mit Branch Settings');
    console.log('='.repeat(60));

    const payload = {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: 42000,
        subtotal: 42000,
        taxes: [],
        tip_amount: 0
      },
      reference: `TEST-BRANCH-${Date.now()}`,
      description: 'Test Payment (Branch Settings)'
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    try {
      const response = await axios.post(
        `${apiUrl}/online/link/v1`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `x-api-key ${merchantId}`
          },
          timeout: 30000
        }
      );

      console.log('✅ ERFOLG!');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.log('❌ FEHLER!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Status Text:', error.response.statusText);
        console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error:', error.message);
      }
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

testBoldPaymentBranchSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

