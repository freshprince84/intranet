/**
 * Script: Prüft welche Lock IDs in Reservierungen verwendet wurden
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkUsedLockIds() {
  try {
    console.log('🔍 Prüfe welche Lock IDs verwendet wurden...\n');

    // Finde alle Reservierungen mit ttlLockId
    const reservations = await prisma.reservation.findMany({
      where: {
        ttlLockId: { not: null }
      },
      select: {
        id: true,
        ttlLockId: true,
        doorPin: true,
        createdAt: true,
        guestName: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log('='.repeat(80));
    console.log(`GEFUNDENE RESERVIERUNGEN MIT TTLOCK ID (${reservations.length}):`);
    console.log('='.repeat(80));

    if (reservations.length === 0) {
      console.log('❌ Keine Reservierungen mit TTLock ID gefunden!');
    } else {
      const lockIds = new Set<string>();
      reservations.forEach(r => {
        if (r.ttlLockId) {
          lockIds.add(r.ttlLockId);
        }
        console.log(`ID: ${r.id}, Lock ID: ${r.ttlLockId}, PIN: ${r.doorPin || 'N/A'}, Gast: ${r.guestName}, Datum: ${r.createdAt.toISOString().split('T')[0]}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log('VERWENDETE LOCK IDs:');
      console.log('='.repeat(80));
      const lockIdsArray = Array.from(lockIds);
      if (lockIdsArray.length > 0) {
        lockIdsArray.forEach((lockId, index) => {
          console.log(`   ${index + 1}. ${lockId}`);
        });
        console.log(`\n✅ Insgesamt ${lockIdsArray.length} verschiedene Lock ID(s) verwendet`);
      } else {
        console.log('   ❌ Keine Lock IDs gefunden');
      }
    }

    // Prüfe auch Organization Settings (falls vorhanden)
    console.log('\n' + '='.repeat(80));
    console.log('ORGANIZATION SETTINGS - TTLOCK:');
    console.log('='.repeat(80));

    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (org?.settings) {
      const { decryptApiSettings } = await import('../src/utils/encryption');
      try {
        const settings = decryptApiSettings(org.settings as any);
        const doorSystem = settings?.doorSystem;
        if (doorSystem?.lockIds) {
          console.log(`   Lock IDs in Organization Settings: ${doorSystem.lockIds.join(', ')}`);
        } else {
          console.log('   ❌ Keine Lock IDs in Organization Settings');
        }
      } catch (e: any) {
        console.log(`   ⚠️  Fehler beim Entschlüsseln: ${e.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsedLockIds()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });










