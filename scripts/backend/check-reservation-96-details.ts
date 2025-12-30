import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservation96() {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: 96 },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        guestEmail: true,
        paymentStatus: true,
        paymentLink: true
      }
    });

    if (!reservation) {
      console.log('❌ Reservation 96 nicht gefunden');
      return;
    }

    console.log('📋 Reservation 96 Details:');
    console.log('   ID:', reservation.id);
    console.log('   lobbyReservationId:', reservation.lobbyReservationId);
    console.log('   Gast:', reservation.guestName);
    console.log('   Email:', reservation.guestEmail);
    console.log('   Payment Status:', reservation.paymentStatus);
    console.log('   Payment Link:', reservation.paymentLink || 'NICHT GESETZT');
    console.log('');

    // Generiere Check-in-Link wie aktuell implementiert
    const currentLink = `https://app.lobbypms.com/checkinonline/confirmar?codigo=${reservation.id}&email=${encodeURIComponent(reservation.guestEmail || '')}&lg=GB`;
    console.log('🔗 Aktueller Check-in-Link (mit ID):');
    console.log('   ', currentLink);
    console.log('');

    // Generiere Check-in-Link wie es sein sollte
    const correctLink = `https://app.lobbypms.com/checkinonline/confirmar?codigo=${reservation.lobbyReservationId}&email=${reservation.guestEmail}&lg=GB`;
    console.log('✅ Korrekter Check-in-Link (mit lobbyReservationId):');
    console.log('   ', correctLink);
    console.log('');

    console.log('🔍 Problem:');
    console.log('   - Aktuell wird reservation.id (96) verwendet');
    console.log('   - Sollte reservation.lobbyReservationId (5664182399) verwendet werden');
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservation96();



