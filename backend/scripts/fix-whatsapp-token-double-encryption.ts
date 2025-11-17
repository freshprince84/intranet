import { PrismaClient } from '@prisma/client';
import { encryptApiSettings, decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixWhatsAppTokenDoubleEncryption() {
  try {
    console.log('🔧 Behebe mehrfache Verschlüsselung des WhatsApp Tokens...\n');

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

    console.log(`✅ Organisation: ${organization.displayName}\n`);

    const currentSettings = (organization.settings || {}) as any;
    
    // Entschlüssele Settings
    const decryptedSettings = decryptApiSettings(currentSettings);
    const whatsappSettings = decryptedSettings?.whatsapp;
    
    if (!whatsappSettings?.apiKey) {
      throw new Error('WhatsApp API Key nicht gefunden!');
    }

    console.log('📋 Aktueller WhatsApp Token:');
    console.log(`   Länge: ${whatsappSettings.apiKey.length} Zeichen`);
    console.log(`   Erste 50 Zeichen: ${whatsappSettings.apiKey.substring(0, 50)}...`);
    console.log(`   Enthält Doppelpunkte: ${whatsappSettings.apiKey.includes(':')}\n`);

    // Prüfe ob Token mehrfach verschlüsselt ist
    let apiKey = whatsappSettings.apiKey;
    let decryptionCount = 0;
    
    // Entschlüssele so lange, bis kein ':' mehr vorhanden ist
    while (apiKey.includes(':')) {
      try {
        const { decryptSecret } = await import('../src/utils/encryption');
        apiKey = decryptSecret(apiKey);
        decryptionCount++;
        console.log(`   Entschlüsselung ${decryptionCount}: Länge jetzt ${apiKey.length} Zeichen`);
      } catch (error) {
        console.error('   Fehler bei Entschlüsselung:', error);
        break;
      }
    }

    if (decryptionCount > 1) {
      console.log(`\n⚠️  Token war ${decryptionCount} mal verschlüsselt!`);
    }

    console.log(`\n📝 Finaler Token:`);
    console.log(`   Länge: ${apiKey.length} Zeichen`);
    console.log(`   Erste 30 Zeichen: ${apiKey.substring(0, 30)}...`);
    console.log(`   Erwartete Länge: 205 Zeichen\n`);

    // Aktualisiere Settings mit entschlüsseltem Token
    const newSettings = {
      ...currentSettings,
      whatsapp: {
        ...currentSettings.whatsapp,
        apiKey: apiKey // Wird in encryptApiSettings wieder verschlüsselt (nur einmal!)
      }
    };

    // Verschlüssele Settings (verschlüsselt Token automatisch - nur einmal!)
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('✅ Settings verschlüsselt (Token wird nur einmal verschlüsselt)');
    } catch (encryptionError) {
      console.warn('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt');
      encryptedSettings = newSettings;
    }

    // Speichere in DB
    await prisma.organization.update({
      where: { id: 1 },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('\n✅ WhatsApp Token erfolgreich korrigiert!');
    console.log(`   Token wurde ${decryptionCount} mal entschlüsselt und dann einmal verschlüsselt gespeichert`);

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

fixWhatsAppTokenDoubleEncryption()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

