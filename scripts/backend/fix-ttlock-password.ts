import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Script: Aktualisiert TTLock-Passwort mit korrektem MD5-Hash
 */

async function fixTTLockPassword() {
  try {
    console.log('🔧 Aktualisiere TTLock-Passwort...\n');

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
    
    // MD5-Hash des Passworts erstellen
    const password = 'DigitalAccess123!';
    const passwordHash = crypto.createHash('md5').update(password).digest('hex');
    
    console.log('📝 Passwort-Informationen:');
    console.log(`   Klartext: ${password}`);
    console.log(`   MD5-Hash: ${passwordHash}`);
    console.log(`   Hash-Länge: ${passwordHash.length} Zeichen\n`);

    // Aktueller Hash in DB
    const currentHash = currentSettings?.doorSystem?.password;
    if (currentHash) {
      console.log(`📋 Aktueller Hash in DB: ${currentHash.substring(0, 16)}...`);
      console.log(`   Länge: ${currentHash.length} Zeichen\n`);
      
      if (currentHash === passwordHash) {
        console.log('✅ Passwort-Hash ist bereits korrekt!');
        return;
      } else {
        console.log('⚠️  Passwort-Hash stimmt nicht überein - wird aktualisiert...\n');
      }
    }

    const newSettings = {
      ...currentSettings,
      doorSystem: {
        ...currentSettings.doorSystem,
        username: '+573024498991', // Stelle sicher, dass Username auch korrekt ist
        password: passwordHash // MD5-hashed
      }
    };

    // Verschlüssele Settings
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

    console.log('\n✅ Passwort erfolgreich aktualisiert!');
    console.log(`   Username: +573024498991`);
    console.log(`   Password-Hash: ${passwordHash.substring(0, 16)}...`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTTLockPassword()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

