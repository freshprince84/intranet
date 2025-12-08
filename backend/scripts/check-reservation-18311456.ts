/**
 * Prüft Reservation 18311456 - Warum wird sie nicht importiert?
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function checkReservation18311456() {
  console.log('\n🔍 Prüfe Reservation 18311456\n');
  console.log('='.repeat(80));

  const reservationId = '18311456';

  try {
    // 1. Prüfe lokale Datenbank
    console.log('\n📋 1. Prüfe lokale Datenbank...');
    const localReservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: reservationId },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        checkInDate: true,
        checkOutDate: true,
        branchId: true
      }
    });

    if (localReservation) {
      console.log('✅ Reservation bereits in DB:');
      console.log(`   ID: ${localReservation.id}`);
      console.log(`   Gast: ${localReservation.guestName}`);
      console.log(`   Check-in: ${localReservation.checkInDate}`);
      console.log(`   Check-out: ${localReservation.checkOutDate}`);
      return;
    } else {
      console.log('❌ Reservation NICHT in DB');
    }

    // 2. Finde alle Branches mit LobbyPMS
    console.log('\n📡 2. Versuche von LobbyPMS abzurufen...');
    const branches = await prisma.branch.findMany({
      where: {
        lobbyPmsSettings: { not: null }
      },
      select: {
        id: true,
        name: true,
        organizationId: true
      }
    });

    console.log(`   Gefundene Branches: ${branches.length}`);

    let lobbyReservation: any = null;
    let foundBranchId: number | null = null;

    for (const branch of branches) {
      try {
        console.log(`\n   Versuche Branch ${branch.id} (${branch.name})...`);
        const service = await LobbyPmsService.createForBranch(branch.id);
        
        // Versuche über fetchReservations (funktioniert definitiv)
        try {
          // Hole Reservierungen der letzten 7 Tage
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 7);
          
          console.log(`   Hole Reservierungen von ${startDate.toISOString()} bis ${endDate.toISOString()}...`);
          const allReservations = await service.fetchReservations(startDate, endDate);
          console.log(`   Gefunden: ${allReservations.length} Reservierungen`);
          
          lobbyReservation = allReservations.find(r => 
            String(r.booking_id) === reservationId || 
            String(r.id) === reservationId
          );
          
          if (lobbyReservation) {
            foundBranchId = branch.id;
            console.log(`   ✅ Reservation gefunden über fetchReservations!`);
            break;
          } else {
            console.log(`   ⚠️  Reservation nicht in fetchReservations gefunden`);
            
            // Versuche auch fetchReservationsByCheckoutDate
            console.log(`   Versuche fetchReservationsByCheckoutDate...`);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            
            const checkoutReservations = await service.fetchReservationsByCheckoutDate(yesterday);
            console.log(`   Gefunden: ${checkoutReservations.length} Reservierungen mit check_out >= gestern`);
            
            lobbyReservation = checkoutReservations.find(r => 
              String(r.booking_id) === reservationId || 
              String(r.id) === reservationId
            );
            
            if (lobbyReservation) {
              foundBranchId = branch.id;
              console.log(`   ✅ Reservation gefunden über fetchReservationsByCheckoutDate!`);
              break;
            }
          }
        } catch (error) {
          console.log(`   ⚠️  Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
          continue;
        }
      } catch (error) {
        console.log(`   ⚠️  Fehler beim Erstellen des Services: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        continue;
      }
    }

    if (!lobbyReservation) {
      console.log('\n❌ Reservation konnte nicht von LobbyPMS abgerufen werden');
      return;
    }

    // 3. Analysiere Reservation-Daten
    console.log('\n📊 3. LobbyPMS Reservierungs-Daten:');
    console.log('='.repeat(80));
    
    console.log(`\n🔹 Basis-Informationen:`);
    console.log(`   Booking ID: ${lobbyReservation.booking_id || lobbyReservation.id}`);
    console.log(`   Creation Date: ${lobbyReservation.creation_date || 'N/A'}`);
    console.log(`   Check-in: ${lobbyReservation.start_date || lobbyReservation.check_in_date || 'N/A'}`);
    console.log(`   Check-out: ${lobbyReservation.end_date || lobbyReservation.check_out_date || 'N/A'}`);
    console.log(`   check_out_date Feld: ${lobbyReservation.check_out_date || 'FEHLT'}`);
    console.log(`   end_date Feld: ${lobbyReservation.end_date || 'FEHLT'}`);
    console.log(`   Property ID: ${lobbyReservation.property_id || 'N/A'}`);

    // 4. Prüfe warum sie nicht gefunden wurde
    console.log('\n🔍 4. Analyse: Warum wurde sie nicht gefunden?');
    console.log('='.repeat(80));

    if (lobbyReservation.creation_date) {
      const creationDate = new Date(lobbyReservation.creation_date);
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      console.log(`\n📅 Creation Date: ${creationDate.toISOString()}`);
      console.log(`   Letzte 24h: ${last24Hours.toISOString()}`);
      console.log(`   Älter als 24h: ${creationDate < last24Hours ? '✅ JA' : '❌ NEIN'}`);
      
      if (creationDate < last24Hours) {
        console.log(`\n   ⚠️  PROBLEM: Creation Date ist älter als 24 Stunden!`);
        console.log(`   Der automatische Sync prüft nur die letzten 24 Stunden.`);
      }
    } else {
      console.log(`\n   ⚠️  PROBLEM: Kein creation_date Feld!`);
      console.log(`   fetchReservations filtert Reservierungen OHNE creation_date heraus (Zeile 484-486).`);
    }

    const checkOutDateString = lobbyReservation.check_out_date || lobbyReservation.end_date;
    if (checkOutDateString) {
      const checkOutDate = new Date(checkOutDateString);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      console.log(`\n📅 Check-out Date: ${checkOutDate.toISOString()}`);
      console.log(`   Gestern: ${yesterday.toISOString()}`);
      console.log(`   >= gestern: ${checkOutDate >= yesterday ? '✅ JA' : '❌ NEIN'}`);
      
      if (checkOutDate < yesterday) {
        console.log(`\n   ⚠️  PROBLEM: Check-out ist älter als gestern!`);
        console.log(`   fetchReservationsByCheckoutDate filtert nur check_out >= gestern.`);
      }
    } else {
      console.log(`\n   ⚠️  PROBLEM: Kein check_out_date UND kein end_date!`);
      console.log(`   fetchReservationsByCheckoutDate filtert Reservierungen OHNE check_out_date/end_date heraus.`);
    }

    // 5. Teste syncReservation direkt
    if (foundBranchId) {
      console.log(`\n📋 5. Teste syncReservation() direkt...`);
      try {
        const service = await LobbyPmsService.createForBranch(foundBranchId);
        const syncedReservation = await service.syncReservation(lobbyReservation);
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

    // 6. Vollständige Response
    console.log('\n📄 6. Vollständige LobbyPMS-Response:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(lobbyReservation, null, 2));

    // Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG:');
    console.log(`   Reservation ID: ${reservationId}`);
    console.log(`   In lokaler DB: ${localReservation ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   In LobbyPMS: ${lobbyReservation ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Branch ID: ${foundBranchId || 'N/A'}`);
    if (lobbyReservation) {
      console.log(`   Creation Date: ${lobbyReservation.creation_date || 'FEHLT'}`);
      console.log(`   Check-out: ${lobbyReservation.end_date || lobbyReservation.check_out_date || 'FEHLT'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analyse abgeschlossen\n');

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

checkReservation18311456();



