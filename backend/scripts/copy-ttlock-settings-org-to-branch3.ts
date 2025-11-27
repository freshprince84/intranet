/**
 * Kopiert korrekte TTLock Settings von Organization nach Branch 3
 * Nur wenn sicher ist, dass Organization Settings korrekt sind
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings, decryptBranchApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function copyTTLockSettingsOrgToBranch3() {
  try {
    console.log('🔧 Kopiere korrekte TTLock Settings von Organization nach Branch 3...\n');

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
        organizationId: true,
        doorSystemSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch 3 nicht gefunden!');
    }

    if (!branch.organizationId) {
      throw new Error('Branch 3 hat keine Organization ID!');
    }

    const organization = await prisma.organization.findUnique({
      where: { id: branch.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error('Organization hat keine Settings!');
    }

    const backup = {
      timestamp: new Date().toISOString(),
      branchId: 3,
      branchSettings: branch.doorSystemSettings,
      organizationId: branch.organizationId,
      organizationSettings: organization.settings
    };

    const backupFile = `/var/www/intranet/backend/backups/branch-3-ttlock-copy-org-${Date.now()}.json`;
    fs.mkdirSync('/var/www/intranet/backend/backups', { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup erstellt: ${backupFile}\n`);

    // 3. LADE ORGANIZATION SETTINGS (QUELLE - KORREKTE DATEN)
    console.log('📋 Lade Organization Settings (Quelle)...');
    const orgDecrypted = decryptApiSettings(organization.settings as any);
    const orgDoorSystem = orgDecrypted?.doorSystem;

    if (!orgDoorSystem) {
      throw new Error('Organization hat keine doorSystem Settings!');
    }

    console.log('✅ Organization Settings geladen:');
    console.log(`   - clientId: ${orgDoorSystem.clientId ? `${orgDoorSystem.clientId.substring(0, 10)}...` : 'nicht gesetzt'}`);
    console.log(`   - clientSecret: ${orgDoorSystem.clientSecret ? '✅ vorhanden' : 'nicht gesetzt'}`);
    console.log(`   - username: ${orgDoorSystem.username || 'nicht gesetzt'}`);
    console.log(`   - password: ${orgDoorSystem.password ? `${orgDoorSystem.password.substring(0, 10)}... (${orgDoorSystem.password.length} Zeichen)` : 'nicht gesetzt'}`);
    
    const orgPasswordIsMD5 = orgDoorSystem.password && /^[a-f0-9]{32}$/i.test(orgDoorSystem.password);
    console.log(`   - password ist MD5-Hash: ${orgPasswordIsMD5 ? '✅ Ja' : '❌ Nein'}`);
    console.log(`   - apiUrl: ${orgDoorSystem.apiUrl || 'nicht gesetzt'}`);
    console.log(`   - lockIds: ${orgDoorSystem.lockIds ? JSON.stringify(orgDoorSystem.lockIds) : 'nicht gesetzt'}\n`);

    // Prüfe ob Organization Settings vollständig sind
    if (!orgDoorSystem.clientId || !orgDoorSystem.clientSecret || !orgDoorSystem.username || !orgDoorSystem.password) {
      throw new Error('Organization Settings sind unvollständig!');
    }

    if (!orgPasswordIsMD5) {
      throw new Error('Organization Password ist NICHT MD5-hashed - kann nicht kopiert werden!');
    }

    // 4. LADE BRANCH SETTINGS (ZIEL - FALSCHE DATEN)
    console.log('📋 Lade Branch Settings (Ziel - werden überschrieben)...');
    let branchDoorSystem: any = {};
    
    if (branch.doorSystemSettings) {
      const branchDecrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
      branchDoorSystem = branchDecrypted?.doorSystem || branchDecrypted || {};
      
      console.log('⚠️  Aktuelle Branch Settings:');
      console.log(`   - clientId: ${branchDoorSystem.clientId ? `${branchDoorSystem.clientId.substring(0, 10)}...` : 'nicht gesetzt'}`);
      console.log(`   - username: ${branchDoorSystem.username || 'nicht gesetzt'}`);
      console.log(`   - password: ${branchDoorSystem.password ? `${branchDoorSystem.password.substring(0, 10)}... (${branchDoorSystem.password.length} Zeichen)` : 'nicht gesetzt'}`);
      
      const branchPasswordIsMD5 = branchDoorSystem.password && /^[a-f0-9]{32}$/i.test(branchDoorSystem.password);
      console.log(`   - password ist MD5-Hash: ${branchPasswordIsMD5 ? '✅ Ja' : '❌ Nein'}\n`);
    } else {
      console.log('   - Branch hat keine Settings (wird neu erstellt)\n');
    }

    // 5. KOPIERE KORREKTE DATEN VON ORGANIZATION NACH BRANCH
    console.log('📋 Kopiere korrekte Daten von Organization nach Branch 3...');
    
    const updatedBranchSettings = {
      ...branchDoorSystem,
      // Kopiere alle wichtigen Felder von Organization
      clientId: orgDoorSystem.clientId,
      clientSecret: orgDoorSystem.clientSecret, // Wird beim Verschlüsseln automatisch verschlüsselt
      username: orgDoorSystem.username,
      password: orgDoorSystem.password, // MD5-hashed
      apiUrl: orgDoorSystem.apiUrl || 'https://euopen.ttlock.com',
      // Behalte Branch-spezifische Felder falls vorhanden
      lockIds: branchDoorSystem.lockIds || orgDoorSystem.lockIds || [],
      appName: branchDoorSystem.appName || orgDoorSystem.appName,
      passcodeType: branchDoorSystem.passcodeType || orgDoorSystem.passcodeType || 'auto'
    };

    console.log('✅ Daten kopiert:');
    console.log(`   - clientId: ${updatedBranchSettings.clientId.substring(0, 10)}...`);
    console.log(`   - clientSecret: ✅ vorhanden`);
    console.log(`   - username: ${updatedBranchSettings.username}`);
    console.log(`   - password: ${updatedBranchSettings.password.substring(0, 10)}... (${updatedBranchSettings.password.length} Zeichen, MD5-hashed)`);
    console.log(`   - apiUrl: ${updatedBranchSettings.apiUrl}`);
    console.log(`   - lockIds: ${JSON.stringify(updatedBranchSettings.lockIds)}\n`);

    // 6. VERSCHLÜSSELE UND SPEICHERE
    console.log('🔐 Verschlüssele Branch Settings...');
    const encryptedBranchSettings = encryptBranchApiSettings(updatedBranchSettings);
    console.log('✅ Verschlüsselung erfolgreich\n');

    console.log('💾 Speichere Branch Settings...');
    await prisma.branch.update({
      where: { id: 3 },
      data: {
        doorSystemSettings: encryptedBranchSettings as any
      }
    });
    console.log('✅ Branch Settings erfolgreich aktualisiert!\n');

    console.log('✅ TTLock Settings von Organization nach Branch 3 kopiert!');
    console.log('   → Branch 3 hat jetzt die korrekten Settings (mit MD5-gehashtem Password)\n');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

copyTTLockSettingsOrgToBranch3()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

