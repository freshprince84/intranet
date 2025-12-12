#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findManilaBranch() {
  try {
    console.log('🔍 Suche Branch "Manila"...\n');

    const branches = await prisma.branch.findMany({
      where: {
        name: { contains: 'Manila', mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        organizationId: true
      }
    });

    if (branches.length === 0) {
      console.log('❌ Kein Branch mit "Manila" im Namen gefunden!');
      
      // Zeige alle Branches
      const allBranches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          organizationId: true
        },
        orderBy: { id: 'asc' }
      });

      console.log('\n📋 Alle Branches:');
      allBranches.forEach(b => {
        console.log(`   - ID ${b.id}: ${b.name} (Org: ${b.organizationId})`);
      });
    } else {
      console.log('✅ Gefundene Branches:');
      branches.forEach(b => {
        console.log(`   - ID ${b.id}: ${b.name} (Org: ${b.organizationId})`);
      });
    }

    // Prüfe auch Reservierungen für alle Branches
    console.log('\n📊 Reservierungen pro Branch:');
    const allBranches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { id: 'asc' }
    });

    for (const branch of allBranches) {
      const count = await prisma.reservation.count({
        where: { branchId: branch.id }
      });
      const withRoomNumber = await prisma.reservation.count({
        where: {
          branchId: branch.id,
          roomNumber: { not: null }
        }
      });
      console.log(`   - ${branch.name} (ID ${branch.id}): ${count} Reservierungen, ${withRoomNumber} mit roomNumber`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findManilaBranch();

