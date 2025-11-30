/**
 * Testet ob Bold Payment Webhook-Endpunkt erreichbar ist
 * 
 * Prüft:
 * - URL-Erreichbarkeit
 * - SSL-Zertifikat
 * - Route-Funktionalität
 * - Response-Format
 */

import https from 'https';
import http from 'http';

const WEBHOOK_URL = 'https://65.109.228.106.nip.io/api/bold-payment/webhook';

async function testWebhookEndpoint() {
  console.log('\n🧪 Teste Bold Payment Webhook-Endpunkt\n');
  console.log('='.repeat(80));
  console.log(`URL: ${WEBHOOK_URL}\n`);

  // Test 1: URL-Erreichbarkeit
  console.log('📡 Test 1: URL-Erreichbarkeit');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });

    console.log(`   Status Code: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`   Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);

    if (response.status === 200 || response.status === 400) {
      console.log('   ✅ Endpunkt ist erreichbar und antwortet\n');
    } else if (response.status === 404) {
      console.log('   ❌ Route nicht gefunden (404) - Route ist nicht registriert!\n');
    } else {
      console.log(`   ⚠️  Unerwarteter Status Code: ${response.status}\n`);
    }

    // Prüfe Response-Format
    try {
      const responseJson = JSON.parse(responseText);
      if (responseJson.success !== undefined) {
        console.log('   ✅ Response-Format ist korrekt (JSON mit success-Feld)\n');
      } else {
        console.log('   ⚠️  Response-Format unerwartet (kein success-Feld)\n');
      }
    } catch (e) {
      console.log('   ⚠️  Response ist kein gültiges JSON\n');
    }

  } catch (error) {
    console.error('   ❌ Fehler beim Testen der URL:', error);
    if (error instanceof Error) {
      console.error(`   Fehlermeldung: ${error.message}`);
      
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.error('   💡 Problem: DNS-Auflösung fehlgeschlagen');
        console.error('   💡 Lösung: Prüfe ob Domain korrekt ist');
      } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
        console.error('   💡 Problem: SSL-Zertifikat-Problem');
        console.error('   💡 Lösung: Prüfe SSL-Zertifikat-Konfiguration');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('   💡 Problem: Verbindung abgelehnt');
        console.error('   💡 Lösung: Prüfe ob Server läuft und Port erreichbar ist');
      }
    }
    console.log('');
  }

  // Test 2: SSL-Zertifikat
  console.log('🔒 Test 2: SSL-Zertifikat');
  try {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      rejectUnauthorized: true
    };

    const req = https.request(options, (res) => {
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   ✅ SSL-Verbindung erfolgreich\n`);
    });

    req.on('error', (error) => {
      if (error.message.includes('certificate') || error.message.includes('SSL')) {
        console.error('   ❌ SSL-Zertifikat-Problem:', error.message);
        console.error('   💡 Lösung: Prüfe SSL-Zertifikat-Konfiguration\n');
      } else {
        console.error('   ❌ Fehler:', error.message);
        console.log('');
      }
    });

    req.end();

    // Warte kurz auf Response
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('   ❌ Fehler beim Testen des SSL-Zertifikats:', error);
    console.log('');
  }

  // Test 3: Route-Funktionalität
  console.log('🛣️  Test 3: Route-Funktionalität');
  console.log('   Teste mit vollständigem Webhook-Payload...\n');
  
  const testPayload = {
    event: 'payment.paid',
    data: {
      reference: 'RES-15120-1234567890',
      payment_link: 'LNK_4FK3BGFTTX',
      metadata: {
        reservation_id: 15120,
        organization_id: 1
      }
    }
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${responseText}\n`);

    if (response.status === 200) {
      const responseJson = JSON.parse(responseText);
      if (responseJson.success) {
        console.log('   ✅ Webhook wurde erfolgreich verarbeitet\n');
      } else {
        console.log('   ⚠️  Webhook wurde empfangen, aber Verarbeitung fehlgeschlagen\n');
      }
    } else {
      console.log(`   ⚠️  Unerwarteter Status: ${response.status}\n`);
    }

  } catch (error) {
    console.error('   ❌ Fehler:', error);
    console.log('');
  }

  // Zusammenfassung
  console.log('='.repeat(80));
  console.log('📋 ZUSAMMENFASSUNG:\n');
  console.log('✅ Wenn alle Tests erfolgreich:');
  console.log('   - Endpunkt ist erreichbar');
  console.log('   - Route ist registriert');
  console.log('   - SSL funktioniert');
  console.log('   - Problem liegt wahrscheinlich an .nip.io Domain-Format\n');
  console.log('❌ Wenn Tests fehlschlagen:');
  console.log('   - Prüfe Server-Logs');
  console.log('   - Prüfe Nginx-Konfiguration');
  console.log('   - Prüfe ob Route korrekt registriert ist\n');
  console.log('💡 Empfehlung:');
  console.log('   - Verwende echte Domain statt .nip.io');
  console.log('   - Siehe: docs/technical/BOLD_PAYMENT_WEBHOOK_NIPIO_PROBLEM.md\n');
  console.log('='.repeat(80));
}

testWebhookEndpoint();

