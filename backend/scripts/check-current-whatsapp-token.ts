import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkCurrentWhatsAppToken() {
  try {
    console.log('🔍 Prüfe aktuellen WhatsApp Token in der DB...\n');

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

    if (!organization.settings) {
      console.log('❌ Keine Settings gefunden!');
      return;
    }

    const settings = decryptApiSettings(organization.settings as any);
    const whatsappSettings = settings?.whatsapp;

    if (!whatsappSettings) {
      console.log('❌ Keine WhatsApp Settings gefunden!');
      return;
    }

    console.log('📋 Aktuelle WhatsApp Settings:');
    console.log(`   Provider: ${whatsappSettings.provider || 'nicht gesetzt'}`);
    console.log(`   API Key vorhanden: ${!!whatsappSettings.apiKey}`);
    
    if (whatsappSettings.apiKey) {
      const apiKey = whatsappSettings.apiKey;
      console.log(`   API Key Länge: ${apiKey.length} Zeichen`);
      console.log(`   API Key (erste 30 Zeichen): ${apiKey.substring(0, 30)}...`);
      console.log(`   API Key (letzte 30 Zeichen): ...${apiKey.substring(apiKey.length - 30)}`);
      console.log(`   API Key (vollständig): ${apiKey}`);
    } else {
      console.log('   ⚠️  API Key fehlt!');
    }
    
    console.log(`   Phone Number ID: ${whatsappSettings.phoneNumberId || 'nicht gesetzt'}`);
    console.log(`   Business Account ID: ${whatsappSettings.businessAccountId || 'nicht gesetzt'}`);

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

checkCurrentWhatsAppToken()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

