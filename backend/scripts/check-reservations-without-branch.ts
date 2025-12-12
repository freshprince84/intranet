#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservationsWithoutBranch() {
  try {
    console.log('🔍 Prüfe Reservierungen ohne branchId...\n');

    // 1. Zähle Reservierungen ohne branchId
    const withoutBranch = await prisma.reservation.count({
      where: {
        branchId: null,
        organizationId: 1 // La Familia Hostel
      }
    });

    console.log(`📊 Reservierungen OHNE branchId (Org 1): ${withoutBranch}\n`);

    if (withoutBranch === 0) {
      console.log('✅ Keine Reservierungen ohne branchId gefunden.');
      console.log('💡 Alle Reservierungen sind bereits einem Branch zugeordnet.\n');
    } else {
      // Zeige Beispiele
      const examples = await prisma.reservation.findMany({
        where: {
          branchId: null,
          organizationId: 1
        },
        take: 10,
        select: {
          id: true,
          guestName: true,
          lobbyReservationId: true,
          roomNumber: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('📋 Beispiele (neueste 10 Reservierungen ohne branchId):');
      examples.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.guestName}`);
        console.log(`   - lobbyReservationId: ${r.lobbyReservationId || 'N/A'}`);
        console.log(`   - roomNumber: ${r.roomNumber || 'N/A'}`);
        console.log(`   - Erstellt: ${r.createdAt.toISOString()}`);
      });

      console.log('\n💡 Diese Reservierungen könnten zu Manila (Branch 2) gehören.');
      console.log('   Lösung: Reservierungen müssen einem Branch zugeordnet werden.');
    }

    // 2. Prüfe auch alle Reservierungen der Organisation
    const totalReservations = await prisma.reservation.count({
      where: { organizationId: 1 }
    });

    console.log(`\n📊 Gesamtanzahl Reservierungen (Org 1): ${totalReservations}`);

    // 3. Prüfe Reservierungen MIT branchId
    const withBranch = await prisma.reservation.count({
      where: {
        branchId: { not: null },
        organizationId: 1
      }
    });

    console.log(`📊 Reservierungen MIT branchId: ${withBranch}`);
    console.log(`📊 Reservierungen OHNE branchId: ${withoutBranch}`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkReservationsWithoutBranch();

