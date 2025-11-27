/**
 * Script: Testet Bold Payment API direkt mit den korrekten Werten
 */

import axios from 'axios';

async function testBoldPaymentDirect() {
  try {
    console.log('🧪 Teste Bold Payment API direkt...\n');

    const merchantId = 'CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E';
    const apiUrl = 'https://integrations.api.bold.co';

    const payload = {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: 126000,
        subtotal: 126000,
        taxes: [],
        tip_amount: 0
      },
      reference: 'TEST-' + Date.now(),
      description: 'Test Payment Link'
    };

    console.log('📋 Request Details:');
    console.log(`   URL: ${apiUrl}/online/link/v1`);
    console.log(`   Merchant ID: ${merchantId}`);
    console.log(`   Authorization: x-api-key ${merchantId}`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));
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
        console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      } else {
        console.log('Error:', error.message);
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  }
}

testBoldPaymentDirect()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });









