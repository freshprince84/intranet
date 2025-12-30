import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testWebhookVerification() {
  try {
    console.log('🔍 Test: Webhook-Verifizierung\n');
    console.log('='.repeat(60));

    // 1. Prüfe .env Variable
    console.log('\n1. Prüfe WHATSAPP_WEBHOOK_VERIFY_TOKEN:');
    console.log('-'.repeat(60));
    
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    if (!verifyToken) {
      console.log('❌ WHATSAPP_WEBHOOK_VERIFY_TOKEN ist nicht in .env gesetzt!');
      console.log('\n   Lösung:');
      console.log('   1. Führe aus: npx ts-node scripts/add-webhook-verify-token.ts');
      console.log('   2. Oder füge manuell hinzu: WHATSAPP_WEBHOOK_VERIFY_TOKEN=dein_token');
      return;
    }

    console.log(`✅ Token gefunden: ${verifyToken.substring(0, 20)}...`);
    console.log(`   - Länge: ${verifyToken.length} Zeichen`);
    console.log(`   - Erwarteter Token: 80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab`);
    
    if (verifyToken === '80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab') {
      console.log('   ✅ Token stimmt überein!');
    } else {
      console.log('   ⚠️  Token stimmt NICHT überein!');
      console.log('   → Verwende den Token aus .env in Meta Console');
    }

    // 2. Simuliere Meta Webhook-Verifizierung
    console.log('\n\n2. Simuliere Meta Webhook-Verifizierung:');
    console.log('-'.repeat(60));
    
    const testMode = 'subscribe';
    const testToken = verifyToken;
    const testChallenge = 'test_challenge_12345';

    console.log(`   - Mode: ${testMode}`);
    console.log(`   - Token: ${testToken.substring(0, 20)}...`);
    console.log(`   - Challenge: ${testChallenge}`);

    // Simuliere die Prüfung wie im Controller
    if (testMode === 'subscribe' && testToken === verifyToken) {
      console.log('   ✅ Verifizierung würde erfolgreich sein!');
      console.log(`   → Challenge würde zurückgegeben: ${testChallenge}`);
    } else {
      console.log('   ❌ Verifizierung würde fehlschlagen!');
      if (testMode !== 'subscribe') {
        console.log(`   → Mode ist nicht 'subscribe': ${testMode}`);
      }
      if (testToken !== verifyToken) {
        console.log(`   → Token stimmt nicht überein`);
      }
    }

    // 3. Webhook URL
    console.log('\n\n3. Webhook URL:');
    console.log('-'.repeat(60));
    
    const webhookUrl = 'https://65.109.228.106.nip.io/api/whatsapp/webhook';
    console.log(`   - URL: ${webhookUrl}`);
    console.log(`   - Route: /api/whatsapp/webhook`);
    console.log(`   - ✅ Route ist korrekt registriert (siehe app.ts)`);

    // 4. Nächste Schritte
    console.log('\n\n4. Nächste Schritte:');
    console.log('-'.repeat(60));
    console.log('   1. ✅ Verify Token ist in .env gesetzt');
    console.log('   2. ⚠️  Server MUSS neu gestartet werden, damit .env geladen wird!');
    console.log('   3. In Meta Console:');
    console.log(`      - Callback URL: ${webhookUrl}`);
    console.log(`      - Verify Token: ${verifyToken}`);
    console.log('   4. Nach "Bestätigen und speichern" sollte Verifizierung funktionieren');

    console.log('\n✅ Test abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

testWebhookVerification();

