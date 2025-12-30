import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservation() {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: 96 }
    });

    if (!reservation) {
      console.log('❌ Reservation 96 nicht gefunden');
      return;
    }

    console.log('📋 Reservation 96 (Daniel Oliveira):');
    console.log('   ID:', reservation.id);
    console.log('   Code:', reservation.lobbyReservationId);
    console.log('   Gast:', reservation.guestName);
    console.log('   Email:', reservation.guestEmail || 'NICHT GESETZT');
    console.log('   Telefon:', reservation.guestPhone || 'NICHT GESETZT');
    console.log('   Check-in:', reservation.checkInDate);
    console.log('   Check-out:', reservation.checkOutDate);
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservation();

