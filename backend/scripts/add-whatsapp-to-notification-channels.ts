import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function addWhatsAppToNotificationChannels() {
  try {
    console.log('🔧 Füge WhatsApp zu Notification Channels hinzu...\n');

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
    
    // Aktualisiere Notification Channels
    const currentChannels = currentSettings.lobbyPms?.notificationChannels || ['email'];
    
    if (!currentChannels.includes('whatsapp')) {
      currentChannels.push('whatsapp');
      console.log('📝 Aktualisiere Notification Channels:');
      console.log(`   Vorher: ${JSON.stringify(currentSettings.lobbyPms?.notificationChannels || ['email'])}`);
      console.log(`   Nachher: ${JSON.stringify(currentChannels)}`);
    } else {
      console.log('✅ WhatsApp ist bereits in Notification Channels');
      console.log(`   Aktuelle Channels: ${JSON.stringify(currentChannels)}`);
    }

    const newSettings = {
      ...currentSettings,
      lobbyPms: {
        ...currentSettings.lobbyPms,
        notificationChannels: currentChannels
      }
    };

    // Verschlüssele Settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('\n✅ Settings verschlüsselt');
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

    console.log('\n✅ Notification Channels erfolgreich aktualisiert!');
    console.log(`   Channels: ${JSON.stringify(currentChannels)}`);

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

addWhatsAppToNotificationChannels()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

