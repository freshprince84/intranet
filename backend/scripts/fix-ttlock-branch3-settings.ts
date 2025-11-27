/**
 * Fix: TTLock Branch 3 Settings
 * Option 1: Password MD5-hashen
 * Option 2: doorSystemSettings löschen (Fallback auf Organization)
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import { decryptBranchApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixTTLockBranch3Settings() {
  try {
    console.log('🔧 Fix: TTLock Branch 3 Settings...\n');

    // 1. PRÜFE ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY ist nicht korrekt gesetzt!');
    }
    console.log('✅ ENCRYPTION_KEY ist gesetzt\n');

    // 2. ERSTELLE BACKUP
    console.log('💾 Erstelle Backup...');
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        doorSystemSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch 3 nicht gefunden!');
    }

    const backup = {
      timestamp: new Date().toISOString(),
      branchId: 3,
      doorSystemSettings: branch.doorSystemSettings
    };

    const backupFile = `/var/www/intranet/backend/backups/branch-3-ttlock-fix-${Date.now()}.json`;
    fs.mkdirSync('/var/www/intranet/backend/backups', { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup erstellt: ${backupFile}\n`);

    if (!branch.doorSystemSettings) {
      console.log('✅ Branch 3 hat keine doorSystemSettings - alles OK!\n');
      return;
    }

    // 3. LADE AKTUELLE SETTINGS
    const decrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
    const doorSystemSettings = decrypted?.doorSystem || decrypted;

    if (!doorSystemSettings) {
      console.log('✅ Branch 3 doorSystemSettings sind leer - alles OK!\n');
      return;
    }

    console.log('📋 Aktuelle Branch Settings:');
    console.log(`   - clientId: ${doorSystemSettings.clientId || 'nicht gesetzt'}`);
    console.log(`   - username: ${doorSystemSettings.username || 'nicht gesetzt'}`);
    console.log(`   - password: ${doorSystemSettings.password ? `${doorSystemSettings.password.substring(0, 10)}... (${doorSystemSettings.password.length} Zeichen)` : 'nicht gesetzt'}\n`);

    // 4. PRÜFE OB PASSWORD MD5-HASHED IST
    if (doorSystemSettings.password) {
      const isMD5Hash = /^[a-f0-9]{32}$/i.test(doorSystemSettings.password);
      
      if (isMD5Hash) {
        console.log('✅ Password ist bereits MD5-hashed!');
        console.log('⚠️  Aber Branch 3 sollte keine eigenen TTLock Settings haben!');
        console.log('   → Empfehlung: doorSystemSettings löschen (Fallback auf Organization)\n');
      } else {
        console.log('⚠️  Password ist NICHT MD5-hashed!');
        console.log(`   Aktueller Wert: ${doorSystemSettings.password}`);
        console.log(`   Länge: ${doorSystemSettings.password.length} Zeichen\n`);
      }
    }

    // 5. OPTION: Password MD5-hashen
    if (doorSystemSettings.password && !/^[a-f0-9]{32}$/i.test(doorSystemSettings.password)) {
      console.log('🔐 Hashe Password mit MD5...');
      const passwordHash = crypto.createHash('md5').update(doorSystemSettings.password).digest('hex');
      
      const updatedSettings = {
        ...doorSystemSettings,
        password: passwordHash
      };

      // Verschlüssele Settings
      const encryptedSettings = encryptBranchApiSettings(updatedSettings);

      // Speichere in DB
      await prisma.branch.update({
        where: { id: 3 },
        data: {
          doorSystemSettings: encryptedSettings as any
        }
      });

      console.log(`✅ Password MD5-gehasht und gespeichert: ${passwordHash}\n`);
      console.log('⚠️  ABER: Branch 3 sollte keine eigenen TTLock Settings haben!');
      console.log('   → Besser: doorSystemSettings löschen (Fallback auf Organization)\n');
    }

    // 6. OPTION: doorSystemSettings löschen (EMPFOHLEN)
    console.log('🗑️  OPTION: Lösche doorSystemSettings für Branch 3...');
    console.log('   → Branch 3 verwendet dann Organization Settings als Fallback\n');
    
    await prisma.branch.update({
      where: { id: 3 },
      data: {
        doorSystemSettings: null
      }
    });

    console.log('✅ doorSystemSettings für Branch 3 gelöscht!');
    console.log('   → TTLock verwendet jetzt Organization Settings (mit korrektem MD5-Password)\n');

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

fixTTLockBranch3Settings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

