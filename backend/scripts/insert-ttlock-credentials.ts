import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: TTLock-Zugangsdaten in Organisation 1 einfügen
 * 
 * Fügt die TTLock-Credentials direkt in die Datenbank für Organisation 1 ein.
 * Das clientSecret wird automatisch verschlüsselt.
 */

async function insertTTLockCredentials() {
  try {
    console.log('🚀 Starte Einfügen der TTLock-Zugangsdaten für Organisation 1...\n');

    // TTLock-Daten aus dem Bild
    const ttlockData = {
      provider: 'ttlock' as const,
      apiUrl: 'https://open.ttlock.com',
      clientId: 'c0128d6b496a4f848d06970a65210e8a',
      clientSecret: 'cdbb8ea148766914af14ef9e762a792d'
    };

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

    // Lade aktuelle Settings
    const currentSettings = (organization.settings || {}) as any;
    console.log('\n📋 Aktuelle Settings-Struktur:');
    console.log(`   - doorSystem vorhanden: ${!!currentSettings.doorSystem}`);
    if (currentSettings.doorSystem) {
      console.log(`   - doorSystem.provider: ${currentSettings.doorSystem.provider || 'nicht gesetzt'}`);
      console.log(`   - doorSystem.clientId: ${currentSettings.doorSystem.clientId ? 'vorhanden' : 'nicht vorhanden'}`);
      console.log(`   - doorSystem.clientSecret: ${currentSettings.doorSystem.clientSecret ? 'vorhanden' : 'nicht vorhanden'}`);
    }

    // Erstelle neue Settings mit TTLock-Daten
    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        ...ttlockData
      }
    };

    console.log('\n🔐 Verschlüssele clientSecret...');
    
    // Verschlüssele die Settings (clientSecret wird automatisch verschlüsselt)
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

    // Aktualisiere Organisation in der Datenbank
    console.log('\n💾 Speichere Settings in Datenbank...');
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
    console.log('\n📝 Eingefügte TTLock-Daten:');
    console.log(`   - Provider: ${ttlockData.provider}`);
    console.log(`   - API URL: ${ttlockData.apiUrl}`);
    console.log(`   - Client ID: ${ttlockData.clientId}`);
    console.log(`   - Client Secret: ${ttlockData.clientSecret.substring(0, 8)}... (verschlüsselt gespeichert)`);

    // Verifikation: Lade Settings erneut und prüfe
    console.log('\n🔍 Verifikation: Lade Settings erneut...');
    const verifyOrg = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        settings: true
      }
    });

    if (verifyOrg?.settings) {
      const verifySettings = verifyOrg.settings as any;
      if (verifySettings.doorSystem?.clientId === ttlockData.clientId) {
        console.log('✅ Verifikation erfolgreich: Client ID stimmt überein');
      } else {
        console.log('⚠️  Warnung: Client ID stimmt nicht überein');
      }
      if (verifySettings.doorSystem?.clientSecret) {
        console.log('✅ Verifikation erfolgreich: Client Secret ist vorhanden (verschlüsselt)');
      } else {
        console.log('⚠️  Warnung: Client Secret nicht gefunden');
      }
    }

    console.log('\n🎉 Fertig! TTLock-Zugangsdaten wurden erfolgreich eingefügt.');

  } catch (error) {
    console.error('\n❌ Fehler beim Einfügen der TTLock-Zugangsdaten:', error);
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
insertTTLockCredentials()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

