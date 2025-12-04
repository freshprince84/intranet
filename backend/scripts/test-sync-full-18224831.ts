/**
 * Testet warum Reservation 18224831 beim sync-full nicht importiert wird
 * 
 * Simuliert genau das, was syncReservationsByCheckoutDate() macht
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function testSyncFull() {
  console.log('\n🔍 Teste sync-full für Reservation 18224831\n');
  console.log('='.repeat(80));

  const reservationId = '18224831';
  const branchId = 3; // Manila (wo die Reservation gefunden wurde)

  try {
    // 1. Simuliere syncReservationsByCheckoutDate
    console.log('\n📋 1. Simuliere syncReservationsByCheckoutDate()...');
    
    const service = await LobbyPmsService.createForBranch(branchId);
    
    // Berechne "gestern" (wie in syncReservationsByCheckoutDate)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    console.log(`   Gestern (Filter): ${yesterday.toISOString()}`);
    console.log(`   Hole Reservierungen mit check_out_date >= gestern...\n`);

    // Rufe fetchReservationsByCheckoutDate auf
    const lobbyReservations = await service.fetchReservationsByCheckoutDate(yesterday);
    
    console.log(`   ✅ Gefundene Reservierungen: ${lobbyReservations.length}`);
    
    // Suche nach unserer Reservation
    const targetReservation = lobbyReservations.find(r => 
      String(r.booking_id) === reservationId || 
      String(r.id) === reservationId
    );

    if (targetReservation) {
      console.log(`\n   ✅ Reservation ${reservationId} wurde GEFUNDEN!`);
      console.log(`\n   📊 Reservation-Daten:`);
      console.log(`      Booking ID: ${targetReservation.booking_id || targetReservation.id}`);
      console.log(`      Check-in: ${targetReservation.start_date || targetReservation.check_in_date || 'N/A'}`);
      console.log(`      Check-out: ${targetReservation.end_date || targetReservation.check_out_date || 'N/A'}`);
      console.log(`      check_out_date Feld: ${targetReservation.check_out_date || 'FEHLT!'}`);
      console.log(`      end_date Feld: ${targetReservation.end_date || 'FEHLT!'}`);
      
      // Prüfe warum sie gefiltert wurde oder nicht
      if (!targetReservation.check_out_date) {
        console.log(`\n   ⚠️  PROBLEM: check_out_date Feld fehlt!`);
        console.log(`      Die Reservation hat nur end_date, aber der Code prüft check_out_date!`);
        console.log(`      Zeile 635 in fetchReservationsByCheckoutDate: if (!reservation.check_out_date) return false;`);
      } else {
        const checkOutDate = new Date(targetReservation.check_out_date);
        console.log(`\n   ✅ check_out_date vorhanden: ${checkOutDate.toISOString()}`);
        console.log(`      >= gestern: ${checkOutDate >= yesterday ? '✅ JA' : '❌ NEIN'}`);
      }
    } else {
      console.log(`\n   ❌ Reservation ${reservationId} wurde NICHT gefunden!`);
      console.log(`\n   🔍 Prüfe warum...`);
      
      // Versuche direkt zu holen
      try {
        const directReservation = await service.fetchReservationById(reservationId);
        console.log(`   ✅ Reservation existiert in LobbyPMS (fetchReservationById)`);
        console.log(`      Check-out: ${directReservation.end_date || directReservation.check_out_date || 'N/A'}`);
        console.log(`      check_out_date: ${directReservation.check_out_date || 'FEHLT'}`);
        console.log(`      end_date: ${directReservation.end_date || 'FEHLT'}`);
        
        if (!directReservation.check_out_date && directReservation.end_date) {
          console.log(`\n   ⚠️  PROBLEM GEFUNDEN:`);
          console.log(`      Reservation hat end_date="${directReservation.end_date}"`);
          console.log(`      ABER check_out_date fehlt!`);
          console.log(`      fetchReservationsByCheckoutDate filtert nach check_out_date (Zeile 635)`);
          console.log(`      → Reservation wird herausgefiltert!`);
        }
      } catch (error) {
        console.log(`   ⚠️  fetchReservationById fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }

    // 2. Teste syncReservation direkt
    if (targetReservation) {
      console.log(`\n📋 2. Teste syncReservation() direkt...`);
      try {
        const syncedReservation = await service.syncReservation(targetReservation);
        console.log(`   ✅ syncReservation erfolgreich!`);
        console.log(`      Lokale ID: ${syncedReservation.id}`);
        console.log(`      LobbyPMS ID: ${syncedReservation.lobbyReservationId}`);
      } catch (error) {
        console.log(`   ❌ syncReservation fehlgeschlagen:`);
        console.error(`      ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        if (error instanceof Error && error.stack) {
          console.error(`      Stack: ${error.stack}`);
        }
      }
    }

    // 3. Prüfe ob Reservation bereits in DB existiert
    console.log(`\n📋 3. Prüfe lokale Datenbank...`);
    const existingReservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: reservationId },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        checkOutDate: true
      }
    });

    if (existingReservation) {
      console.log(`   ✅ Reservation bereits in DB:`);
      console.log(`      ID: ${existingReservation.id}`);
      console.log(`      Gast: ${existingReservation.guestName}`);
      console.log(`      Check-out: ${existingReservation.checkOutDate}`);
    } else {
      console.log(`   ❌ Reservation NICHT in DB`);
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG:');
    console.log(`   Reservation ID: ${reservationId}`);
    console.log(`   Branch ID: ${branchId}`);
    console.log(`   Gefunden in fetchReservationsByCheckoutDate: ${targetReservation ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   In lokaler DB: ${existingReservation ? '✅ JA' : '❌ NEIN'}`);
    
    if (targetReservation) {
      console.log(`\n   ✅ Reservation wird gefunden → Problem liegt bei syncReservation()`);
    } else {
      console.log(`\n   ❌ Reservation wird NICHT gefunden → Problem liegt bei fetchReservationsByCheckoutDate()`);
      console.log(`      Mögliche Ursachen:`);
      console.log(`      1. check_out_date Feld fehlt (nur end_date vorhanden)`);
      console.log(`      2. Pagination stoppt zu früh (nach 3 Seiten ohne passende Reservierungen)`);
      console.log(`      3. Check-out Date ist älter als gestern`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test abgeschlossen\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testSyncFull();

