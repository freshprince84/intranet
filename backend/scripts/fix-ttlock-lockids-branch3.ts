/**
 * Fix: Kopiert lockIds von Organization nach Branch 3
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings, decryptBranchApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixTTLockLockIdsBranch3() {
  try {
    console.log('🔧 Fix: Kopiere lockIds von Organization nach Branch 3...\n');

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
      branchSettings: branch.doorSystemSettings
    };

    const backupFile = `/var/www/intranet/backend/backups/branch-3-ttlock-lockids-fix-${Date.now()}.json`;
    fs.mkdirSync('/var/www/intranet/backend/backups', { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup erstellt: ${backupFile}\n`);

    // 3. LADE ORGANIZATION SETTINGS (QUELLE)
    console.log('📋 Lade Organization Settings...');
    const orgDecrypted = decryptApiSettings(organization.settings as any);
    const orgDoorSystem = orgDecrypted?.doorSystem;

    if (!orgDoorSystem) {
      throw new Error('Organization hat keine doorSystem Settings!');
    }

    const orgLockIds = orgDoorSystem.lockIds || [];
    console.log(`✅ Organization lockIds: ${JSON.stringify(orgLockIds)}\n`);

    if (orgLockIds.length === 0) {
      throw new Error('Organization hat keine lockIds!');
    }

    // 4. LADE BRANCH SETTINGS
    console.log('📋 Lade Branch Settings...');
    if (!branch.doorSystemSettings) {
      throw new Error('Branch 3 hat keine doorSystemSettings!');
    }

    const branchDecrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
    const branchDoorSystem = branchDecrypted?.doorSystem || branchDecrypted;

    const currentLockIds = branchDoorSystem?.lockIds || [];
    console.log(`⚠️  Aktuelle Branch lockIds: ${JSON.stringify(currentLockIds)}\n`);

    // 5. AKTUALISIERE lockIds
    console.log('📋 Aktualisiere lockIds...');
    const updatedBranchSettings = {
      ...branchDoorSystem,
      lockIds: orgLockIds // Verwende Organization lockIds
    };

    console.log(`✅ Neue Branch lockIds: ${JSON.stringify(updatedBranchSettings.lockIds)}\n`);

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

    console.log('✅ lockIds von Organization nach Branch 3 kopiert!');
    console.log(`   → Branch 3 hat jetzt lockIds: ${JSON.stringify(updatedBranchSettings.lockIds)}\n`);

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

fixTTLockLockIdsBranch3()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });


