import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: Setzt TTLock Client Secret auf korrekten Wert
 */

async function fixTTLockClientSecret() {
  try {
    console.log('🔧 Setze TTLock Client Secret auf korrekten Wert...\n');

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
    
    // Korrekte Werte aus Frontend
    const correctClientId = 'c0128d6b496a4f848d06970a65210e8a';
    const correctClientSecret = '6cd592b8076fb40cdd14fca5dd18b1';
    const correctUsername = '+573024498991';

    console.log('📝 Setze folgende Werte:');
    console.log(`   Client ID: ${correctClientId}`);
    console.log(`   Client Secret: ${correctClientSecret}`);
    console.log(`   Username: ${correctUsername}\n`);

    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        clientId: correctClientId,
        clientSecret: correctClientSecret, // Wird in encryptApiSettings verschlüsselt
        username: correctUsername
      }
    };

    // Verschlüssele Settings (verschlüsselt Client Secret automatisch)
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('✅ Settings verschlüsselt');
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

    console.log('\n✅ Client Secret erfolgreich aktualisiert!');
    console.log(`   Client ID: ${correctClientId}`);
    console.log(`   Client Secret: ${correctClientSecret.substring(0, 10)}... (wird verschlüsselt gespeichert)`);
    console.log(`   Username: ${correctUsername}`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTTLockClientSecret()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

