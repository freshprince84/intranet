import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservations() {
  try {
    // Hole alle Reservierungen
    const reservations = await prisma.reservation.findMany({
      take: 1000, // Erste 1000 Reservierungen
      orderBy: {
        id: 'desc'
      }
    });

    console.log(`\n=== Gefundene Reservierungen: ${reservations.length} ===\n`);

    let problemCount = 0;

    for (const reservation of reservations) {
      const problems: string[] = [];
      
      // Prüfe alle Felder, die in getFieldValue verwendet werden
      if (reservation.guestName === undefined) {
        problems.push('guestName ist undefined');
      }
      if (reservation.status === undefined) {
        problems.push('status ist undefined');
      }
      if (reservation.paymentStatus === undefined) {
        problems.push('paymentStatus ist undefined');
      }
      if (reservation.roomNumber === undefined) {
        problems.push('roomNumber ist undefined');
      }
      if (reservation.guestEmail === undefined) {
        problems.push('guestEmail ist undefined');
      }
      if (reservation.guestPhone === undefined) {
        problems.push('guestPhone ist undefined');
      }
      if (reservation.lobbyReservationId === undefined) {
        problems.push('lobbyReservationId ist undefined');
      }
      
      // Prüfe, ob Felder Objekte sind statt Strings
      if (reservation.guestName !== null && typeof reservation.guestName !== 'string') {
        problems.push(`guestName ist kein String: ${typeof reservation.guestName}`);
      }
      if (reservation.guestEmail !== null && typeof reservation.guestEmail !== 'string') {
        problems.push(`guestEmail ist kein String: ${typeof reservation.guestEmail}`);
      }
      if (reservation.guestPhone !== null && typeof reservation.guestPhone !== 'string') {
        problems.push(`guestPhone ist kein String: ${typeof reservation.guestPhone}`);
      }
      if (reservation.roomNumber !== null && typeof reservation.roomNumber !== 'string') {
        problems.push(`roomNumber ist kein String: ${typeof reservation.roomNumber}`);
      }
      if (reservation.lobbyReservationId !== null && typeof reservation.lobbyReservationId !== 'string') {
        problems.push(`lobbyReservationId ist kein String: ${typeof reservation.lobbyReservationId}`);
      }
      
      if (problems.length > 0) {
        problemCount++;
        console.log(`\n⚠️  Reservierung ID: ${reservation.id}`);
        console.log(`   Probleme: ${problems.join(', ')}`);
        console.log(`   guestName: ${JSON.stringify(reservation.guestName)} (${typeof reservation.guestName})`);
        console.log(`   guestEmail: ${JSON.stringify(reservation.guestEmail)} (${typeof reservation.guestEmail})`);
        console.log(`   guestPhone: ${JSON.stringify(reservation.guestPhone)} (${typeof reservation.guestPhone})`);
        console.log(`   roomNumber: ${JSON.stringify(reservation.roomNumber)} (${typeof reservation.roomNumber})`);
        console.log(`   lobbyReservationId: ${JSON.stringify(reservation.lobbyReservationId)} (${typeof reservation.lobbyReservationId})`);
      }
    }

    console.log(`\n=== Zusammenfassung ===`);
    console.log(`Gesamt Reservierungen geprüft: ${reservations.length}`);
    console.log(`Reservierungen mit Problemen: ${problemCount}`);
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Reservierungen:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservations();

