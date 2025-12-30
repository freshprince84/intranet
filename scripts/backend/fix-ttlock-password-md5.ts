/**
 * Fix: TTLock Password MD5-hashen
 * Hasht das Password in Organization Settings mit MD5
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import { decryptApiSettings, encryptApiSettings } from '../src/utils/encryption';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixTTLockPasswordMD5() {
  try {
    console.log('🔧 Fix: TTLock Password MD5-hashen für Organization 1...\n');

    // 1. PRÜFE ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY ist nicht korrekt gesetzt!');
    }
    console.log('✅ ENCRYPTION_KEY ist gesetzt\n');

    // 2. ERSTELLE BACKUP
    console.log('💾 Erstelle Backup...');
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error('Organization 1 hat keine Settings!');
    }

    const backup = {
      timestamp: new Date().toISOString(),
      organizationId: 1,
      settings: organization.settings
    };

    const backupFile = `/var/www/intranet/backend/backups/org-1-ttlock-password-fix-${Date.now()}.json`;
    fs.mkdirSync('/var/www/intranet/backend/backups', { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup erstellt: ${backupFile}\n`);

    // 3. LADE AKTUELLE SETTINGS
    const currentSettings = organization.settings as any;
    const decrypted = decryptApiSettings(currentSettings);
    const doorSystem = decrypted?.doorSystem;

    if (!doorSystem) {
      throw new Error('Organization hat keine doorSystem Settings!');
    }

    console.log('📋 Aktuelle Settings:');
    console.log(`   - clientId: ${doorSystem.clientId || 'nicht gesetzt'}`);
    console.log(`   - username: ${doorSystem.username || 'nicht gesetzt'}`);
    console.log(`   - password: ${doorSystem.password ? `${doorSystem.password.substring(0, 10)}... (${doorSystem.password.length} Zeichen)` : 'nicht gesetzt'}\n`);

    // 4. PRÜFE OB PASSWORD BEREITS MD5-HASHED IST
    if (doorSystem.password) {
      const isMD5Hash = /^[a-f0-9]{32}$/i.test(doorSystem.password);
      
      if (isMD5Hash) {
        console.log('✅ Password ist bereits MD5-hashed!');
        console.log(`   Hash: ${doorSystem.password}\n`);
        console.log('⚠️  Keine Änderung nötig - Password ist bereits korrekt!\n');
        return;
      } else {
        console.log('⚠️  Password ist NICHT MD5-hashed!');
        console.log(`   Aktueller Wert: ${doorSystem.password}`);
        console.log(`   Länge: ${doorSystem.password.length} Zeichen\n`);
        console.log('❌ PROBLEM: Password muss MD5-hashed werden!');
        console.log('   → Benötigt: Korrektes Klartext-Password\n');
        console.log('⚠️  Bitte das korrekte Klartext-Password angeben, damit es MD5-gehasht werden kann!\n');
        throw new Error('Password ist nicht MD5-hashed - benötigt Klartext-Password zum Hashen');
      }
    } else {
      throw new Error('Password ist nicht gesetzt!');
    }

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

// Alternative: Fix mit bekanntem Password
async function fixTTLockPasswordMD5WithPassword(plainPassword: string) {
  try {
    console.log('🔧 Fix: TTLock Password MD5-hashen für Organization 1...\n');

    // 1. PRÜFE ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY ist nicht korrekt gesetzt!');
    }
    console.log('✅ ENCRYPTION_KEY ist gesetzt\n');

    // 2. ERSTELLE BACKUP
    console.log('💾 Erstelle Backup...');
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error('Organization 1 hat keine Settings!');
    }

    const backup = {
      timestamp: new Date().toISOString(),
      organizationId: 1,
      settings: organization.settings
    };

    const backupFile = `/var/www/intranet/backend/backups/org-1-ttlock-password-fix-${Date.now()}.json`;
    fs.mkdirSync('/var/www/intranet/backend/backups', { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup erstellt: ${backupFile}\n`);

    // 3. LADE AKTUELLE SETTINGS
    const currentSettings = organization.settings as any;
    const decrypted = decryptApiSettings(currentSettings);
    const doorSystem = decrypted?.doorSystem;

    if (!doorSystem) {
      throw new Error('Organization hat keine doorSystem Settings!');
    }

    // 4. ERSTELLE MD5-HASH
    const passwordHash = crypto.createHash('md5').update(plainPassword).digest('hex');
    console.log('🔐 Password-Hash erstellt:');
    console.log(`   Klartext: ${plainPassword}`);
    console.log(`   MD5-Hash: ${passwordHash}`);
    console.log(`   Hash-Länge: ${passwordHash.length} Zeichen\n`);

    // 5. AKTUALISIERE SETTINGS
    const updatedSettings = {
      ...decrypted,
      doorSystem: {
        ...doorSystem,
        password: passwordHash // MD5-hashed
      }
    };

    // 6. VERSCHLÜSSELE SETTINGS
    const encryptedSettings = encryptApiSettings(updatedSettings);

    // 7. SPEICHERE IN DB
    await prisma.organization.update({
      where: { id: 1 },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('✅ Password erfolgreich MD5-gehasht und gespeichert!\n');

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

// Hauptfunktion
if (process.argv[2]) {
  // Password als Argument übergeben
  const plainPassword = process.argv[2];
  fixTTLockPasswordMD5WithPassword(plainPassword)
    .catch((e) => {
      console.error('💥 Fataler Fehler:', e);
      process.exit(1);
    });
} else {
  // Nur prüfen
  fixTTLockPasswordMD5()
    .catch((e) => {
      console.error('💥 Fataler Fehler:', e);
      process.exit(1);
    });
}


