import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Aktualisiere WhatsApp Settings mit neuem Access Token
 */

async function updateWhatsAppSettings() {
  try {
    console.log('🚀 Aktualisiere WhatsApp Settings...\n');

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

    console.log(`✅ Organisation: ${organization.displayName}`);

    const settings = (organization.settings || {}) as any;

    // Neuer Access Token
    const newAccessToken = process.argv[2] || 'EAAQYZBTYO0aQBPZB7ct7SSMf8X3cP0jhlX5OO3Koxr73x8LUxpzC3ZB33SOOnmBzY84ZCrWtpeh4lyRct07ZCbovPfUmgB66bWK8Ljce8MQgDYZApMWWoOA0FGeUMZCfJ5AOPa4xhNZCSNoNkRi5IkDQ1WhVfK5DaduZBGVsaiZCOf3Vj9oYT0hiGzBxVg5LKjTJ9DWgBAOu7hL0ZBhBW6wNPGTmDIcFB23jxryJTNvP1PLmzFpVHXckn1jU409p8IZD';
    
    // Phone Number ID (optional, falls als Argument übergeben)
    const phoneNumberId = process.argv[3];

    // Aktualisiere WhatsApp Settings
    const updatedSettings = {
      ...settings,
      whatsapp: {
        ...settings.whatsapp,
        provider: 'whatsapp-business-api',
        apiKey: newAccessToken,
        phoneNumberId: phoneNumberId || settings.whatsapp?.phoneNumberId || undefined
      }
    };

    // Verschlüssele die Settings (falls ENCRYPTION_KEY gesetzt ist)
    let finalSettings;
    try {
      finalSettings = encryptApiSettings(updatedSettings);
    } catch (error) {
      // Falls ENCRYPTION_KEY nicht gesetzt ist, speichere unverschlüsselt (nur für Development)
      console.log('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt (nur für Development)');
      finalSettings = updatedSettings;
    }

    // Speichere in DB
    await prisma.organization.update({
      where: { id: 1 },
      data: { settings: finalSettings }
    });

    console.log(`\n✅ WhatsApp Settings aktualisiert!`);
    console.log(`\n📋 Neue Einstellungen:`);
    console.log(`   Provider: whatsapp-business-api`);
    console.log(`   API Key: ${newAccessToken.substring(0, 20)}... (${newAccessToken.length} Zeichen)`);
    if (phoneNumberId) {
      console.log(`   Phone Number ID: ${phoneNumberId}`);
    } else if (settings.whatsapp?.phoneNumberId) {
      console.log(`   Phone Number ID: ${settings.whatsapp.phoneNumberId} (beibehalten)`);
    } else {
      console.log(`   ⚠️  Phone Number ID: Noch nicht gesetzt!`);
      console.log(`   💡 Bitte Phone Number ID aus WhatsApp Business Manager kopieren und als 2. Argument übergeben.`);
    }

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

updateWhatsAppSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

