/**
 * Script: Testet Verschlüsselung auf dem Server
 */

import { encryptSecret, decryptSecret } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEncryption() {
  try {
    console.log('🔍 Teste Verschlüsselung auf dem Server...\n');

    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    console.log('='.repeat(80));
    console.log('ENCRYPTION_KEY PRÜFUNG:');
    console.log('='.repeat(80));
    if (!encryptionKey) {
      console.log('❌ ENCRYPTION_KEY ist NICHT gesetzt!');
      return;
    }
    
    console.log(`✅ ENCRYPTION_KEY ist gesetzt`);
    console.log(`   Länge: ${encryptionKey.length} Zeichen`);
    console.log(`   Format: ${encryptionKey.match(/^[0-9a-fA-F]+$/) ? 'Hex (korrekt)' : 'NICHT Hex (falsch!)'}`);
    console.log(`   Erwartet: 64 Zeichen (32 bytes)`);
    if (encryptionKey.length !== 64) {
      console.log(`   ⚠️  WARNUNG: Falsche Länge! Sollte 64 Zeichen sein!`);
    }
    console.log('');

    // Test: Verschlüsselung und Entschlüsselung
    console.log('='.repeat(80));
    console.log('VERSCHLÜSSELUNGS-TEST:');
    console.log('='.repeat(80));
    
    const testText = 'Test-String-12345';
    console.log(`Original: ${testText}`);
    
    try {
      const encrypted = encryptSecret(testText);
      console.log(`Verschlüsselt: ${encrypted.substring(0, 50)}...`);
      
      const decrypted = decryptSecret(encrypted);
      console.log(`Entschlüsselt: ${decrypted}`);
      
      if (decrypted === testText) {
        console.log('✅ Verschlüsselung funktioniert korrekt!');
      } else {
        console.log('❌ Verschlüsselung funktioniert NICHT!');
        console.log(`   Erwartet: ${testText}`);
        console.log(`   Erhalten: ${decrypted}`);
      }
    } catch (error) {
      console.log('❌ Fehler bei Verschlüsselung/Entschlüsselung:');
      if (error instanceof Error) {
        console.log(`   ${error.message}`);
      }
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  }
}

testEncryption()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });








