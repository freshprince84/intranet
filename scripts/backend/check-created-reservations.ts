/**
 * Script zum Prüfen, wie viele Reservationen aus Emails erstellt wurden
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkReservations() {
  try {
    const organizationId = 1;
    
    // Hole alle Reservationen mit lobbyReservationId (aus Emails erstellt)
    const reservations = await prisma.reservation.findMany({
      where: {
        organizationId: organizationId,
        lobbyReservationId: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log(`\n📊 Reservationen aus Emails (letzte 20):\n`);
    console.log(`Gesamt: ${reservations.length} Reservationen mit lobbyReservationId\n`);

    reservations.forEach((res, index) => {
      console.log(`${index + 1}. Reservation ID: ${res.id}`);
      console.log(`   Code: ${res.lobbyReservationId}`);
      console.log(`   Gast: ${res.guestName}`);
      console.log(`   Check-in: ${res.checkInDate.toLocaleDateString('de-DE')}`);
      console.log(`   Check-out: ${res.checkOutDate.toLocaleDateString('de-DE')}`);
      console.log(`   Betrag: ${res.amount} ${res.currency}`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Erstellt: ${res.createdAt.toLocaleString('de-DE')}`);
      console.log('');
    });

    // Zähle alle
    const totalCount = await prisma.reservation.count({
      where: {
        organizationId: organizationId,
        lobbyReservationId: {
          not: null
        }
      }
    });

    console.log(`\n✅ Gesamt: ${totalCount} Reservationen aus Emails erstellt\n`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservations();

