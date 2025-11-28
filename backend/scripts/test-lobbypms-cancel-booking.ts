/**
 * Test-Script für LobbyPMS Booking Cancellation API
 * 
 * Testet ob updateReservationStatus() mit 'cancelled' funktioniert
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/test-lobbypms-cancel-booking.ts [booking_id]
 */

import { LobbyPmsService } from '../src/services/lobbyPmsService';
import { prisma } from '../src/utils/prisma';

async function testCancelBookingApi() {
  console.log('🧪 LobbyPMS Booking Cancellation API Test\n');
  console.log('=' .repeat(80));
  
  try {
    // Hole nur Branches die in LobbyPMS existieren: Manila (ID: 3) und Parque Poblado (ID: 4)
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: [3, 4] }, // Nur Manila und Parque Poblado
        lobbyPmsSettings: {
          not: null
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (branches.length === 0) {
      console.error('❌ Kein Branch mit LobbyPMS Settings gefunden! (Erwartet: Manila oder Parque Poblado)');
      process.exit(1);
    }

    // Verwende ersten gefundenen Branch
    const branch = branches[0];
    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);
    if (branches.length > 1) {
      console.log(`   (Verfügbar: ${branches.map(b => b.name).join(', ')})`);
    }
    console.log('');

    // Erstelle Service
    const service = await LobbyPmsService.createForBranch(branch.id);
    
    // Hole booking_id aus Argumenten oder aus Datenbank
    let bookingId: string | null = null;
    
    if (process.argv[2]) {
      bookingId = process.argv[2];
      console.log(`📋 Verwende booking_id aus Argumenten: ${bookingId}\n`);
    } else {
      // Hole erste Reservierung aus Datenbank
      const reservation = await prisma.reservation.findFirst({
        where: {
          branchId: branch.id,
          lobbyReservationId: {
            not: null
          }
        },
        select: {
          id: true,
          lobbyReservationId: true,
          guestName: true,
          status: true
        }
      });

      if (!reservation || !reservation.lobbyReservationId) {
        console.error('❌ Keine Reservierung mit lobbyReservationId gefunden!');
        console.log('💡 Verwende: npx ts-node backend/scripts/test-lobbypms-cancel-booking.ts [booking_id]');
        process.exit(1);
      }

      bookingId = reservation.lobbyReservationId;
      console.log(`📋 Reservierung gefunden:`);
      console.log(`   ID: ${reservation.id}`);
      console.log(`   LobbyPMS ID: ${bookingId}`);
      console.log(`   Gast: ${reservation.guestName}`);
      console.log(`   Status: ${reservation.status}\n`);
      
      console.log('⚠️  WICHTIG: Dies ist ein Test! Die Reservierung wird NICHT wirklich storniert.');
      console.log('⚠️  Falls du eine echte Reservierung stornieren willst, verwende den booking_id als Argument.\n');
    }

    // Test 1: updateReservationStatus mit 'cancelled'
    console.log('📋 Test 1: updateReservationStatus() mit Status "cancelled"');
    try {
      // WICHTIG: Nur testen, nicht wirklich stornieren!
      // Verwende validateStatus um alle Status-Codes zu akzeptieren
      const response = await (service as any).axiosInstance.put(
        `/api/v1/bookings/${bookingId}/status`,
        { status: 'cancelled' },
        {
          validateStatus: () => true
        }
      );

      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));

      if (response.status >= 200 && response.status < 300) {
        console.log('   ✅ Erfolg! Endpunkt funktioniert.');
      } else if (response.status === 404) {
        console.log('   ❌ Endpunkt nicht gefunden (404)');
      } else if (response.status === 422) {
        console.log('   ❌ Ungültige Parameter (422)');
      } else {
        console.log(`   ⚠️  Unerwarteter Status: ${response.status}`);
      }
    } catch (error: any) {
      console.log('   ❌ Exception:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    console.log('');

    // Test 2: Alternative Endpunkte
    const alternativeEndpoints = [
      `/api/v2/bookings/${bookingId}/status`,
      `/api/v1/reservations/${bookingId}/status`,
      `/api/v2/reservations/${bookingId}/status`,
      `/api/v1/bookings/${bookingId}/cancel`,
      `/api/v2/bookings/${bookingId}/cancel`
    ];

    console.log('📋 Test 2: Alternative Endpunkte');
    for (const endpoint of alternativeEndpoints) {
      console.log(`   Teste: PUT ${endpoint}`);
      try {
        const response = await (service as any).axiosInstance.put(
          endpoint,
          { status: 'cancelled' },
          {
            validateStatus: () => true
          }
        );

        if (response.status >= 200 && response.status < 300) {
          console.log(`      ✅ Erfolg (Status ${response.status})!`);
          console.log(`      Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
        } else if (response.status === 404) {
          console.log(`      ❌ Nicht gefunden (404)`);
        } else {
          console.log(`      ⚠️  Status ${response.status}:`, JSON.stringify(response.data, null, 2).substring(0, 200));
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`      ❌ Nicht gefunden (404)`);
        } else {
          console.log(`      ❌ Exception:`, error.message);
        }
      }
    }
    console.log('');

    // Zusammenfassung
    console.log('=' .repeat(80));
    console.log('📊 ZUSAMMENFASSUNG\n');
    console.log('✅ Tests abgeschlossen!');
    console.log('💡 Prüfe die Ergebnisse oben, um zu sehen, welcher Endpunkt funktioniert.');

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Tests aus
testCancelBookingApi().catch(console.error);

