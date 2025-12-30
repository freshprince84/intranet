import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Prüft WhatsApp-Konfiguration auf dem Server
 */
async function checkWhatsAppConfig() {
  try {
    console.log('🔍 Prüfe WhatsApp-Konfiguration...\n');

    // 1. Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    console.log('1. ENCRYPTION_KEY:');
    if (!encryptionKey) {
      console.log('   ❌ NICHT GESETZT!');
      console.log('   ⚠️  WhatsApp-Settings können nicht entschlüsselt werden!');
    } else {
      console.log('   ✅ Gesetzt');
      console.log(`   Länge: ${encryptionKey.length} Zeichen`);
      if (encryptionKey.length !== 64) {
        console.log('   ⚠️  WARNUNG: Sollte 64 Zeichen lang sein (32 bytes hex)');
      }
      console.log(`   Erste 10 Zeichen: ${encryptionKey.substring(0, 10)}...`);
    }
    console.log('');

    // 2. Lade Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`2. Organisation: ${organization.displayName} (ID: ${organization.id})\n`);

    // 3. Prüfe Settings
    if (!organization.settings) {
      console.log('   ❌ Keine Settings gefunden!');
      return;
    }

    const settings = organization.settings as any;
    const whatsappSettings = settings?.whatsapp;

    console.log('3. WhatsApp-Settings in DB:');
    if (!whatsappSettings) {
      console.log('   ❌ Keine WhatsApp-Settings gefunden!');
      return;
    }

    console.log(`   Provider: ${whatsappSettings.provider || 'nicht gesetzt'}`);
    console.log(`   API Key vorhanden: ${!!whatsappSettings.apiKey}`);
    if (whatsappSettings.apiKey) {
      const apiKeyStr = String(whatsappSettings.apiKey);
      console.log(`   API Key Länge: ${apiKeyStr.length} Zeichen`);
      console.log(`   API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt (iv:authTag:encrypted)' : 'Unverschlüsselt'}`);
      console.log(`   API Key Vorschau: ${apiKeyStr.substring(0, 20)}...`);
    }
    console.log(`   Phone Number ID: ${whatsappSettings.phoneNumberId || 'nicht gesetzt'}`);
    console.log(`   Business Account ID: ${whatsappSettings.businessAccountId || 'nicht gesetzt'}`);
    console.log('');

    // 4. Versuche Entschlüsselung
    console.log('4. Entschlüsselung:');
    try {
      const decryptedSettings = decryptApiSettings(settings);
      const decryptedWhatsapp = decryptedSettings?.whatsapp;

      if (!decryptedWhatsapp) {
        console.log('   ❌ WhatsApp-Settings nach Entschlüsselung nicht gefunden!');
        return;
      }

      console.log('   ✅ Entschlüsselung erfolgreich');
      console.log(`   Provider: ${decryptedWhatsapp.provider || 'nicht gesetzt'}`);
      console.log(`   API Key vorhanden: ${!!decryptedWhatsapp.apiKey}`);
      if (decryptedWhatsapp.apiKey) {
        const decryptedKey = String(decryptedWhatsapp.apiKey);
        console.log(`   API Key Länge: ${decryptedKey.length} Zeichen`);
        console.log(`   API Key Vorschau: ${decryptedKey.substring(0, 30)}...`);
        
        // Prüfe ob es der neue permanente Token ist
        if (decryptedKey.startsWith('EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD')) {
          console.log('   ✅ Neuer permanenter Token erkannt!');
        } else {
          console.log('   ⚠️  Token scheint nicht der neue permanente Token zu sein');
        }
      }
      console.log(`   Phone Number ID: ${decryptedWhatsapp.phoneNumberId || 'nicht gesetzt'}`);
      console.log('');

      // 5. Prüfe Vollständigkeit
      console.log('5. Vollständigkeitsprüfung:');
      const issues: string[] = [];
      
      if (!decryptedWhatsapp.provider) {
        issues.push('Provider fehlt');
      }
      if (!decryptedWhatsapp.apiKey) {
        issues.push('API Key fehlt');
      }
      if (!decryptedWhatsapp.phoneNumberId) {
        issues.push('Phone Number ID fehlt');
      }
      if (decryptedWhatsapp.provider === 'whatsapp-business-api' && !decryptedWhatsapp.phoneNumberId) {
        issues.push('Phone Number ID ist für WhatsApp Business API erforderlich');
      }

      if (issues.length === 0) {
        console.log('   ✅ Alle erforderlichen Felder sind vorhanden');
      } else {
        console.log('   ❌ Fehlende Felder:');
        issues.forEach(issue => console.log(`      - ${issue}`));
      }

    } catch (decryptError) {
      console.log('   ❌ Fehler bei Entschlüsselung:');
      if (decryptError instanceof Error) {
        console.log(`      ${decryptError.message}`);
      } else {
        console.log(`      ${JSON.stringify(decryptError)}`);
      }
      console.log('');
      console.log('   💡 Mögliche Ursachen:');
      console.log('      - ENCRYPTION_KEY fehlt oder ist falsch');
      console.log('      - Settings wurden mit einem anderen Key verschlüsselt');
      console.log('      - Settings sind korrupt');
    }

    console.log('\n✅ Prüfung abgeschlossen');

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

checkWhatsAppConfig()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

