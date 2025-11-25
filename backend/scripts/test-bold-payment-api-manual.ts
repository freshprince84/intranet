import { PrismaClient } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Testet Bold Payment API manuell mit echten Daten
 */
async function testBoldPaymentApiManual() {
  try {
    console.log('🔍 Teste Bold Payment API manuell mit echten Daten...\n');

    // 1. Lade Settings aus Organisation 1
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization?.settings) {
      throw new Error('Organisation 1 nicht gefunden oder keine Settings');
    }

    const settings = decryptApiSettings(organization.settings as any);
    const boldPaymentSettings = settings?.boldPayment;

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

    // 2. Teste API mit verschiedenen Payload-Varianten
    const apiUrl = 'https://integrations.api.bold.co';
    
    console.log('🌐 API URL:', apiUrl);
    console.log('🔑 Authorization Header:', `x-api-key ${merchantId}`);
    console.log('');

    // Test 1: Payload wie VORHER (ohne taxes, ohne 5% Aufschlag)
    console.log('='.repeat(60));
    console.log('TEST 1: Payload wie VORHER (ohne taxes, ohne 5% Aufschlag)');
    console.log('='.repeat(60));
    
    const payload1 = {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: 40000,
        subtotal: 40000,
        taxes: [],
        tip_amount: 0
      },
      reference: `TEST-${Date.now()}-1`,
      description: 'Test Payment (wie vorher)'
    };

    console.log('Payload:', JSON.stringify(payload1, null, 2));
    console.log('');

    try {
      const response1 = await axios.post(
        `${apiUrl}/online/link/v1`,
        payload1,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `x-api-key ${merchantId}`
          },
          timeout: 30000
        }
      );

      console.log('✅ ERFOLG!');
      console.log('Status:', response1.status);
      console.log('Response:', JSON.stringify(response1.data, null, 2));
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

    console.log('\n');

    // Test 2: Payload mit 5% Aufschlag (wie HEUTE)
    console.log('='.repeat(60));
    console.log('TEST 2: Payload mit 5% Aufschlag (wie HEUTE)');
    console.log('='.repeat(60));
    
    const baseAmount = 40000;
    const surcharge = Math.round(baseAmount * 0.05);
    const totalAmount = Math.round(baseAmount) + surcharge;

    const payload2 = {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: totalAmount, // 42000
        subtotal: totalAmount, // 42000 (wie aktuell im Code)
        taxes: [],
        tip_amount: 0
      },
      reference: `TEST-${Date.now()}-2`,
      description: 'Test Payment (mit 5% Aufschlag)'
    };

    console.log('Payload:', JSON.stringify(payload2, null, 2));
    console.log('');

    try {
      const response2 = await axios.post(
        `${apiUrl}/online/link/v1`,
        payload2,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `x-api-key ${merchantId}`
          },
          timeout: 30000
        }
      );

      console.log('✅ ERFOLG!');
      console.log('Status:', response2.status);
      console.log('Response:', JSON.stringify(response2.data, null, 2));
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

    console.log('\n');

    // Test 3: Alternative Authorization Header Formate
    console.log('='.repeat(60));
    console.log('TEST 3: Alternative Authorization Header Formate');
    console.log('='.repeat(60));

    const testFormats = [
      { name: 'Format 1: x-api-key', header: `x-api-key ${merchantId}` },
      { name: 'Format 2: Bearer', header: `Bearer ${merchantId}` },
      { name: 'Format 3: Nur Merchant ID', header: merchantId },
      { name: 'Format 4: X-API-Key Header', header: merchantId, useXApiKey: true }
    ];

    for (const format of testFormats) {
      console.log(`\nTest: ${format.name}`);
      console.log(`Header: ${format.useXApiKey ? 'X-API-Key' : 'Authorization'}: ${format.header}`);
      
      try {
        const headers: any = {
          'Content-Type': 'application/json'
        };
        
        if (format.useXApiKey) {
          headers['X-API-Key'] = format.header;
        } else {
          headers['Authorization'] = format.header;
        }

        const response = await axios.post(
          `${apiUrl}/online/link/v1`,
          payload1,
          {
            headers,
            timeout: 30000
          }
        );

        console.log('✅ ERFOLG!');
        console.log('Status:', response.status);
        break; // Erster erfolgreicher Test
      } catch (error: any) {
        console.log('❌ FEHLER!');
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('\n✅ Tests abgeschlossen');

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

testBoldPaymentApiManual()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

