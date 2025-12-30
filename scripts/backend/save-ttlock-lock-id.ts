import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import { TTLockService } from '../src/services/ttlockService';

const prisma = new PrismaClient();

/**
 * Script: Ruft Lock IDs ab und speichert sie in der DB
 */

async function saveTTLockLockId() {
  try {
    console.log('🔧 Rufe Lock IDs ab und speichere sie...\n');

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
    
    // Rufe Lock IDs ab
    console.log('🔐 Verbinde mit TTLock API...');
    const ttlockService = new TTLockService(1);
    
    console.log('📋 Rufe verfügbare Locks ab...');
    const lockIds = await ttlockService.getLocks();
    
    if (lockIds.length === 0) {
      console.log('⚠️  Keine Locks gefunden!');
      return;
    }

    console.log(`✅ ${lockIds.length} Lock(s) gefunden:`);
    lockIds.forEach((lockId, index) => {
      console.log(`   ${index + 1}. ${lockId}`);
    });

    // Aktualisiere Settings mit Lock IDs
    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        lockIds: lockIds
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

    console.log('\n✅ Lock IDs erfolgreich gespeichert!');
    console.log(`   Lock IDs: ${lockIds.join(', ')}`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

saveTTLockLockId()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

