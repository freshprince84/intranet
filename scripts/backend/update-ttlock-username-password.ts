import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Script: TTLock Username und Password (MD5) hinzufügen
 */

async function updateUsernamePassword() {
  try {
    console.log('🚀 Aktualisiere TTLock Username und Password...\n');

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
    
    // MD5-Hash des Passworts erstellen
    const password = 'DigitalAccess123!';
    const passwordHash = crypto.createHash('md5').update(password).digest('hex');
    console.log(`\n🔐 Passwort MD5-Hash: ${passwordHash}`);

    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        username: '+573024498991', // TTLock APP Username (Kolumbien) - mit +
        password: passwordHash // MD5-hashed
      }
    };

    console.log('\n📝 Username und Password werden aktualisiert:');
    console.log(`   Username: 3024498991`);
    console.log(`   Password (MD5): ${passwordHash}`);

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

    console.log('\n✅ Username und Password erfolgreich aktualisiert!');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateUsernamePassword()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

