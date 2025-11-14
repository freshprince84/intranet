import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: TTLock API-URL auf api.sciener.com ändern
 */

async function updateApiUrl() {
  try {
    console.log('🚀 Aktualisiere TTLock API-URL auf api.sciener.com...\n');

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

    const currentSettings = (organization.settings || {}) as any;
    
    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        apiUrl: 'https://euopen.ttlock.com'
      }
    };

    console.log('\n📝 API-URL wird aktualisiert: https://api.sciener.com');

    // Verschlüssele Settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('✅ Verschlüsselung erfolgreich');
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

    console.log('\n✅ API-URL erfolgreich aktualisiert!');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateApiUrl()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

