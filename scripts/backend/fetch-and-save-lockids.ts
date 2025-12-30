import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import { encryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: Lock IDs von TTLock API abrufen und in Organisation 1 speichern
 * 
 * Ruft alle verfügbaren Locks von TTLock ab und speichert sie in den Settings.
 */

async function fetchAndSaveLockIds() {
  try {
    console.log('🚀 Starte Abruf der Lock IDs für Organisation 1...\n');

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

    // Prüfe ob TTLock konfiguriert ist
    const currentSettings = (organization.settings || {}) as any;
    if (!currentSettings.doorSystem?.clientId || !currentSettings.doorSystem?.clientSecret) {
      throw new Error('TTLock ist nicht konfiguriert! Bitte zuerst Client ID und Secret einfügen.');
    }

    console.log('\n🔐 Verbinde mit TTLock API...');
    
    // Erstelle TTLock Service
    const ttlockService = new TTLockService(1);
    
    // Rufe Locks ab
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

    console.log('\n🔐 Verschlüssele Settings...');
    
    // Verschlüssele die Settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(newSettings);
      console.log('✅ Verschlüsselung erfolgreich');
    } catch (encryptionError) {
      console.error('⚠️  Verschlüsselungsfehler:', encryptionError);
      if (encryptionError instanceof Error && encryptionError.message.includes('ENCRYPTION_KEY')) {
        console.warn('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt (nur für Entwicklung!)');
        encryptedSettings = newSettings;
      } else {
        throw encryptionError;
      }
    }

    // Speichere in Datenbank
    console.log('\n💾 Speichere Lock IDs in Datenbank...');
    const updatedOrganization = await prisma.organization.update({
      where: { id: 1 },
      data: {
        settings: encryptedSettings
      },
      select: {
        id: true,
        name: true,
        displayName: true
      }
    });

    console.log('\n✅ Erfolgreich aktualisiert!');
    console.log(`   Organisation: ${updatedOrganization.displayName} (ID: ${updatedOrganization.id})`);
    console.log(`   Lock IDs gespeichert: ${lockIds.length}`);

    // Verifikation
    console.log('\n🔍 Verifikation: Lade Settings erneut...');
    const verifyOrg = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        settings: true
      }
    });

    if (verifyOrg?.settings) {
      const verifySettings = verifyOrg.settings as any;
      if (verifySettings.doorSystem?.lockIds?.length === lockIds.length) {
        console.log('✅ Verifikation erfolgreich: Lock IDs stimmen überein');
      } else {
        console.log('⚠️  Warnung: Anzahl der Lock IDs stimmt nicht überein');
      }
    }

    console.log('\n🎉 Fertig! Lock IDs wurden erfolgreich gespeichert.');

  } catch (error) {
    console.error('\n❌ Fehler beim Abruf der Lock IDs:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
fetchAndSaveLockIds()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

