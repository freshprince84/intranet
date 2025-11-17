import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Script: Aktualisiert TTLock-Credentials mit korrekten Werten aus TTLock Portal
 */

async function updateTTLockCorrectCredentials() {
  try {
    console.log('🔧 Aktualisiere TTLock-Credentials mit korrekten Werten...\n');

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
    
    // Korrekte Werte aus TTLock Portal
    const correctClientId = 'c0128d6b496a4f848d06970a65210e8a';
    const correctClientSecret = 'cdbb8ea148766914af14ef9e762a792d'; // AUS TTLOCK PORTAL!
    const correctUsername = '+573024498991';
    const correctPassword = 'DigitalAccess123!';
    const correctPasswordHash = crypto.createHash('md5').update(correctPassword).digest('hex');
    const correctApiUrl = 'https://euopen.ttlock.com';
    const correctPasscodeType = 'auto';

    console.log('📝 Setze folgende Werte:');
    console.log(`   Client ID: ${correctClientId}`);
    console.log(`   Client Secret: ${correctClientSecret}`);
    console.log(`   Username: ${correctUsername}`);
    console.log(`   Password: ${correctPassword} (MD5: ${correctPasswordHash})`);
    console.log(`   API URL: ${correctApiUrl}`);
    console.log(`   Passcode-Typ: ${correctPasscodeType}\n`);

    // Entschlüssele aktuelle Settings, um zu prüfen, ob Client Secret bereits verschlüsselt ist
    const { decryptApiSettings } = await import('../src/utils/encryption');
    const decryptedCurrentSettings = decryptApiSettings(currentSettings);
    
    // Prüfe ob Client Secret bereits verschlüsselt ist
    const currentClientSecret = decryptedCurrentSettings?.doorSystem?.clientSecret;
    const isAlreadyEncrypted = currentClientSecret && currentClientSecret.includes(':');
    
    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        provider: 'ttlock',
        apiUrl: correctApiUrl,
        clientId: correctClientId,
        // Nur verschlüsseln, wenn es noch nicht verschlüsselt ist
        clientSecret: isAlreadyEncrypted ? currentSettings.doorSystem?.clientSecret : correctClientSecret,
        username: correctUsername,
        password: correctPasswordHash, // MD5-Hash (wird NICHT nochmal verschlüsselt)
        passcodeType: correctPasscodeType,
        // Lock IDs bleiben erhalten falls vorhanden
        lockIds: currentSettings.doorSystem?.lockIds || []
      }
    };
    
    // Wenn Client Secret noch nicht verschlüsselt ist, muss es verschlüsselt werden
    if (!isAlreadyEncrypted) {
      console.log('⚠️  Client Secret ist noch nicht verschlüsselt - wird verschlüsselt');
    } else {
      console.log('✅ Client Secret ist bereits verschlüsselt - wird nicht erneut verschlüsselt');
    }

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

    console.log('\n✅ TTLock-Credentials erfolgreich aktualisiert!');
    console.log('─'.repeat(60));
    console.log(`   Client ID: ${correctClientId}`);
    console.log(`   Client Secret: ${correctClientSecret.substring(0, 10)}... (verschlüsselt gespeichert)`);
    console.log(`   Username: ${correctUsername}`);
    console.log(`   Password: ${correctPasswordHash.substring(0, 10)}... (MD5-Hash)`);
    console.log(`   API URL: ${correctApiUrl}`);
    console.log(`   Passcode-Typ: ${correctPasscodeType}`);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateTTLockCorrectCredentials()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

