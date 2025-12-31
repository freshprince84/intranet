#!/usr/bin/env ts-node
/**
 * Invalidiert UserCache für alle User mit Reception-Rolle
 * Damit die neue Permission sofort geladen wird
 */

import { PrismaClient } from '@prisma/client';
import { userCache } from '../src/services/userCache';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Suche alle User mit Reception-Rolle...');
    
    // Finde Reception-Rolle
    const receptionRole = await prisma.role.findFirst({
      where: { name: 'Reception' }
    });

    if (!receptionRole) {
      console.log('❌ Reception-Rolle nicht gefunden!');
      return;
    }

    console.log(`✅ Reception-Rolle gefunden (ID: ${receptionRole.id})`);

    // Finde alle User mit dieser Rolle
    const usersWithReceptionRole = await prisma.userRole.findMany({
      where: { roleId: receptionRole.id },
      select: { userId: true }
    });

    console.log(`📊 Gefunden: ${usersWithReceptionRole.length} User(s) mit Reception-Rolle`);

    // Invalidiere Cache für alle betroffenen User
    let invalidatedCount = 0;
    for (const userRole of usersWithReceptionRole) {
      userCache.invalidate(userRole.userId);
      invalidatedCount++;
      console.log(`   ✅ Cache invalidiert für User ${userRole.userId}`);
    }

    console.log(`\n✅ Fertig: ${invalidatedCount} User-Cache(s) invalidiert`);
    console.log('   Die neue Permission wird beim nächsten Request geladen.');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

