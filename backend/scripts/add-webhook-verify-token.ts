import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.join(__dirname, '../.env');
const verifyToken = '80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab';

async function addWebhookVerifyToken() {
  try {
    console.log('🔧 Füge WhatsApp Webhook Verify Token zur .env hinzu\n');
    console.log('='.repeat(60));

    // Prüfe ob .env existiert
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env Datei nicht gefunden!');
      console.log(`   Erwarteter Pfad: ${envPath}`);
      return;
    }

    console.log(`✅ .env Datei gefunden: ${envPath}`);

    // Lade aktuelle .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Prüfe ob Token bereits existiert
    if (envContent.includes('WHATSAPP_WEBHOOK_VERIFY_TOKEN')) {
      console.log('\n⚠️  WHATSAPP_WEBHOOK_VERIFY_TOKEN ist bereits in .env vorhanden');
      
      // Prüfe ob es einen Wert hat
      const lines = envContent.split('\n');
      const tokenLine = lines.find(line => line.startsWith('WHATSAPP_WEBHOOK_VERIFY_TOKEN'));
      
      if (tokenLine && tokenLine.includes('=') && tokenLine.split('=')[1].trim()) {
        console.log('   Aktueller Wert:', tokenLine.split('=')[1].trim().substring(0, 20) + '...');
        console.log('\n   Möchtest du den Token überschreiben?');
        console.log('   → Wenn ja, entferne die Zeile manuell aus .env und führe das Script erneut aus');
        console.log('   → Wenn nein, verwende den bestehenden Token in Meta Console');
        return;
      } else {
        console.log('   Token hat keinen Wert - füge Wert hinzu...');
        
        // Ersetze leere Token-Zeile
        const newContent = envContent.replace(
          /^WHATSAPP_WEBHOOK_VERIFY_TOKEN\s*=.*$/m,
          `WHATSAPP_WEBHOOK_VERIFY_TOKEN=${verifyToken}`
        );
        
        fs.writeFileSync(envPath, newContent, 'utf8');
        console.log('✅ Token-Wert hinzugefügt!');
      }
    } else {
      console.log('\n📝 Füge WHATSAPP_WEBHOOK_VERIFY_TOKEN zur .env hinzu...');
      
      // Füge Token am Ende hinzu
      const newContent = envContent + (envContent.endsWith('\n') ? '' : '\n') + 
        `\n# WhatsApp Webhook Verify Token\n` +
        `WHATSAPP_WEBHOOK_VERIFY_TOKEN=${verifyToken}\n`;
      
      fs.writeFileSync(envPath, newContent, 'utf8');
      console.log('✅ Token hinzugefügt!');
    }

    console.log('\n📋 Token Details:');
    console.log(`   - Token: ${verifyToken}`);
    console.log(`   - Länge: ${verifyToken.length} Zeichen`);
    console.log(`   - Format: Hex (64 Zeichen)`);

    console.log('\n✅ Nächste Schritte:');
    console.log('   1. Server neu starten (damit .env geladen wird)');
    console.log('   2. Gehe zu Meta Developer Console');
    console.log('   3. Konfiguriere Webhook mit diesem Verify Token:');
    console.log(`      ${verifyToken}`);
    console.log('   4. Webhook URL: https://deine-domain.de/api/whatsapp/webhook');

    console.log('\n✅ Fertig!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

addWebhookVerifyToken();

