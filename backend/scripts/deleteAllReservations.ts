import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllReservations() {
  try {
    console.log('🚀 Starte Löschung aller Reservations...\n');

    // Zähle Reservations vor dem Löschen
    const countBefore = await prisma.reservation.count();
    console.log(`📊 Anzahl Reservations vor Löschung: ${countBefore}`);

    if (countBefore === 0) {
      console.log('✅ Keine Reservations vorhanden. Nichts zu löschen.');
      return;
    }

    // Lösche alle Reservations
    // Cascade-Delete löscht automatisch:
    // - ReservationSyncHistory (onDelete: Cascade)
    // - ReservationNotificationLog (onDelete: Cascade)
    // Tasks bleiben erhalten, taskId wird auf null gesetzt
    const result = await prisma.reservation.deleteMany({});

    console.log(`✅ ${result.count} Reservations erfolgreich gelöscht.`);
    console.log('   Abhängige Daten (Sync-History, Notification-Logs) wurden automatisch gelöscht.\n');

    // Verifiziere Löschung
    const countAfter = await prisma.reservation.count();
    console.log(`📊 Anzahl Reservations nach Löschung: ${countAfter}`);

    if (countAfter === 0) {
      console.log('✅ Alle Reservations wurden erfolgreich gelöscht.');
      console.log('   Neue Reservations werden beim nächsten LobbyPMS Sync automatisch importiert.\n');
    } else {
      console.log(`⚠️  WARNUNG: ${countAfter} Reservations sind noch vorhanden.`);
    }

  } catch (error) {
    console.error('❌ Fehler beim Löschen der Reservations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
deleteAllReservations()
  .then(() => {
    console.log('✅ Script erfolgreich abgeschlossen.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

