import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import { encryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: TTLock API-URL auf euopen.ttlock.com ändern und Lock IDs abrufen
 */

async function updateApiUrlAndFetchLocks() {
  try {
    console.log('🚀 Starte Update der TTLock-Konfiguration für Organisation 1...\n');

    // Lade Organisation 1
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

    console.log(`✅ Organisation gefunden: ${organization.displayName} (${organization.name})`);

    const currentSettings = (organization.settings || {}) as any;
    
    // Aktualisiere API-URL auf euopen.ttlock.com
    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        apiUrl: 'https://euopen.ttlock.com'
      }
    };

    console.log('\n📝 API-URL aktualisiert: https://euopen.ttlock.com');

    // Versuche Lock IDs abzurufen
    console.log('\n🔐 Verbinde mit TTLock API...');
    
    try {
      const ttlockService = new TTLockService(1);
      // Temporär API-URL setzen
      (ttlockService as any).apiUrl = 'https://euopen.ttlock.com';
      (ttlockService as any).axiosInstance = (ttlockService as any).createAxiosInstance();
      
      console.log('📋 Rufe verfügbare Locks ab...');
      const lockIds = await ttlockService.getLocks();
      
      if (lockIds.length > 0) {
        console.log(`✅ ${lockIds.length} Lock(s) gefunden:`);
        lockIds.forEach((lockId, index) => {
          console.log(`   ${index + 1}. ${lockId}`);
        });
        
        newSettings.doorSystem.lockIds = lockIds;
        console.log('\n💾 Lock IDs werden gespeichert...');
      } else {
        console.log('⚠️  Keine Locks gefunden - Lock IDs müssen manuell gesetzt werden');
      }
    } catch (error) {
      console.error('⚠️  Fehler beim Abruf der Lock IDs:', error instanceof Error ? error.message : error);
      console.log('⚠️  Lock IDs müssen manuell gesetzt werden');
    }

    console.log('\n🔐 Verschlüssele Settings...');
    
    // Verschlüssele die Settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('✅ Verschlüsselung erfolgreich');
    } catch (encryptionError) {
      console.error('⚠️  Verschlüsselungsfehler:', encryptionError);
      if (encryptionError instanceof Error && encryptionError.message.includes('ENCRYPTION_KEY')) {
        console.warn('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt');
        encryptedSettings = newSettings;
      } else {
        throw encryptionError;
      }
    }

    // Speichere in Datenbank
    console.log('\n💾 Speichere Settings in Datenbank...');
    await prisma.organization.update({
      where: { id: 1 },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('\n✅ Erfolgreich aktualisiert!');
    console.log('   - API URL: https://euopen.ttlock.com');
    if (newSettings.doorSystem.lockIds?.length > 0) {
      console.log(`   - Lock IDs: ${newSettings.doorSystem.lockIds.length} gespeichert`);
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateApiUrlAndFetchLocks()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
