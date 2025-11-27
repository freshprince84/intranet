/**
 * Testet TTLock für Branch 3 (Manila)
 * Prüft ob Settings geladen werden können und ob ein Test-Passcode erstellt werden kann
 */

import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testTTLockManila() {
  try {
    console.log('🔍 Teste TTLock für Branch 3 (Manila)...\n');

    // 1. Lade Branch 3
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
      throw new Error('Branch 3 (Manila) nicht gefunden!');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);
    console.log(`   Organization ID: ${branch.organizationId || 'nicht gesetzt'}\n`);

    // 2. Lade Organization Settings für Lock IDs
    let lockId: string | null = null;
    
    if (branch.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: branch.organizationId },
        select: { settings: true }
      });

      if (organization?.settings) {
        const { decryptApiSettings } = await import('../src/utils/encryption');
        const settings = decryptApiSettings(organization.settings as any);
        const doorSystem = settings?.doorSystem;
        
        if (doorSystem?.lockIds && doorSystem.lockIds.length > 0) {
          lockId = doorSystem.lockIds[0];
          console.log(`✅ Lock ID gefunden: ${lockId}\n`);
        } else {
          console.log('❌ Keine Lock IDs in Organization Settings gefunden!\n');
        }
      }
    }

    if (!lockId) {
      throw new Error('Keine Lock ID gefunden!');
    }

    // 3. Erstelle TTLockService für Branch 3
    console.log('🔧 Erstelle TTLockService für Branch 3...');
    const ttlockService = await TTLockService.createForBranch(3);
    console.log('✅ TTLockService erstellt\n');

    // 4. Teste Access Token
    console.log('🔐 Teste Access Token...');
    try {
      const accessToken = await (ttlockService as any).getAccessToken();
      console.log(`✅ Access Token erfolgreich erhalten: ${accessToken.substring(0, 20)}...\n`);
    } catch (error) {
      console.error('❌ Fehler beim Abrufen des Access Tokens:', error);
      if (error instanceof Error) {
        console.error(`   Fehlermeldung: ${error.message}\n`);
      }
      throw error;
    }

    // 5. Teste Passcode-Erstellung (gültig für 1 Minute)
    console.log('🔑 Teste Passcode-Erstellung...');
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 1 * 60 * 1000); // +1 Minute

    console.log(`   Start: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Ende:  ${endDate.toLocaleString('de-DE')}`);
    console.log(`   Lock ID: ${lockId}\n`);

    try {
      const passcode = await ttlockService.createTemporaryPasscode(
        lockId,
        startDate,
        endDate,
        'Test-Manila'
      );

      console.log(`✅ Passcode erfolgreich erstellt: ${passcode}\n`);
      console.log('✅ TTLock funktioniert korrekt!\n');
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Passcodes:', error);
      if (error instanceof Error) {
        console.error(`   Fehlermeldung: ${error.message}\n`);
      }
      throw error;
    }

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

testTTLockManila()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

