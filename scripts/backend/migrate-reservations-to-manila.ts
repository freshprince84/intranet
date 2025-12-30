/**
 * Data-Migration: Migriert bestehende Reservierungen zu Branch "Manila"
 * 
 * Alle Reservierungen mit organizationId = 1 und branchId = NULL
 * werden automatisch dem Branch "Manila" zugeordnet.
 * 
 * WICHTIG: Diese Migration muss NACH den Schema-Migrationen ausgeführt werden!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateReservationsToManila() {
  try {
    console.log('🚀 Migriere bestehende Reservierungen zu Branch "Manila"...\n');

    // 1. Finde Branch "Manila" in Organisation 1
    const branch = await prisma.branch.findFirst({
      where: {
        name: 'Manila',
        organizationId: 1
      }
    });

    if (!branch) {
      throw new Error('Branch "Manila" in Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);

    // 2. Finde alle Reservierungen ohne branchId in Organisation 1
    const reservations = await prisma.reservation.findMany({
      where: {
        organizationId: 1,
        branchId: null
      }
    });

    console.log(`📋 Gefunden: ${reservations.length} Reservierungen ohne branchId`);

    if (reservations.length === 0) {
      console.log('✅ Keine Reservierungen zu migrieren');
      return;
    }

    // 3. Update alle Reservierungen
    const result = await prisma.reservation.updateMany({
      where: {
        organizationId: 1,
        branchId: null
      },
      data: {
        branchId: branch.id
      }
    });

    console.log(`✅ ${result.count} Reservierungen zu Branch "Manila" migriert`);
    console.log('\n✅ Migration abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Migration aus
migrateReservationsToManila()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

