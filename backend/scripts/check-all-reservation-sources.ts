/**
 * Script zum Prüfen, welche Reservation-Quellen bereits verarbeitet wurden
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkReservationSources() {
  try {
    const organizationId = 1;
    
    console.log('🔍 Analysiere Reservation-Quellen...\n');

    // Hole alle Reservationen mit lobbyReservationId (aus Emails erstellt)
    const reservations = await prisma.reservation.findMany({
      where: {
        organizationId: organizationId,
        lobbyReservationId: {
          not: null
        }
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Gesamt: ${reservations.length} Reservationen aus Emails\n`);

    // Analysiere Reservation-Codes
    // Booking.com: Nur Zahlen, 10+ Stellen
    // Airbnb: Alphanumerisch, meist 8-12 Zeichen, oft mit Buchstaben
    // Hostelworld: Vermutlich ähnlich wie Booking.com oder Airbnb

    const bookingCodes = reservations.filter(r => 
      r.lobbyReservationId && /^\d{10,}$/.test(r.lobbyReservationId)
    );

    const airbnbCodes = reservations.filter(r => 
      r.lobbyReservationId && /^[A-Z0-9]{6,}$/.test(r.lobbyReservationId) && 
      /[A-Z]/.test(r.lobbyReservationId) && // Enthält Buchstaben
      !/^\d+$/.test(r.lobbyReservationId) // Nicht nur Zahlen
    );

    const otherCodes = reservations.filter(r => 
      r.lobbyReservationId &&
      !/^\d{10,}$/.test(r.lobbyReservationId) &&
      !(/^[A-Z0-9]{6,}$/.test(r.lobbyReservationId) && /[A-Z]/.test(r.lobbyReservationId))
    );

    console.log('=== RESERVATION-QUELLEN ===\n');
    console.log(`Booking.com (nur Zahlen, 10+ Stellen): ${bookingCodes.length}`);
    console.log(`Airbnb (alphanumerisch mit Buchstaben): ${airbnbCodes.length}`);
    console.log(`Andere/Unbekannt: ${otherCodes.length}\n`);

    if (airbnbCodes.length > 0) {
      console.log('=== AIRBNB RESERVATIONEN (Beispiele) ===\n');
      airbnbCodes.slice(0, 5).forEach((res, index) => {
        console.log(`${index + 1}. Code: ${res.lobbyReservationId}, Gast: ${res.guestName}`);
      });
      console.log('');
    }

    if (otherCodes.length > 0) {
      console.log('=== ANDERE RESERVATIONEN (möglicherweise Hostelworld) ===\n');
      otherCodes.slice(0, 10).forEach((res, index) => {
        console.log(`${index + 1}. Code: ${res.lobbyReservationId}, Gast: ${res.guestName}`);
      });
      console.log('');
    }

    // Prüfe ob es Reservationen gibt, die aus Hostelworld-Emails stammen könnten
    // Hostelworld-Codes könnten Format haben wie: "324302-572832456" (aus dem Beispiel)
    const hostelworldPattern = reservations.filter(r => 
      r.lobbyReservationId && r.lobbyReservationId.includes('-')
    );

    if (hostelworldPattern.length > 0) {
      console.log(`⚠️  ${hostelworldPattern.length} Reservationen mit Bindestrich im Code (möglicherweise Hostelworld)`);
      console.log('   Beispiele:');
      hostelworldPattern.slice(0, 5).forEach((res, index) => {
        console.log(`   ${index + 1}. Code: ${res.lobbyReservationId}, Gast: ${res.guestName}`);
      });
      console.log('');
    }

    console.log('=== ZUSAMMENFASSUNG ===\n');
    console.log(`✅ Booking.com: ${bookingCodes.length} Reservationen`);
    console.log(`${airbnbCodes.length > 0 ? '✅' : '❌'} Airbnb: ${airbnbCodes.length} Reservationen`);
    console.log(`${hostelworldPattern.length > 0 ? '✅' : '❌'} Hostelworld (mit Bindestrich): ${hostelworldPattern.length} Reservationen`);
    console.log(`❓ Andere: ${otherCodes.length} Reservationen\n`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservationSources();

