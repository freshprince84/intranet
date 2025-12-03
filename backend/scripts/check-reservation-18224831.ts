/**
 * Prüft Reservation 18224831 - Warum wird sie beim Sync nicht gefunden?
 * 
 * Diese Reservation fehlt nach manuellem Sync, obwohl sie in LobbyPMS vorhanden ist.
 * 
 * Prüft:
 * - Existiert die Reservation in der lokalen Datenbank?
 * - Ist die Reservation über die API abrufbar?
 * - Welches creation_date hat die Reservation?
 * - Warum wurde sie beim Sync nicht gefunden?
 * - Welche Filter könnten sie ausschließen?
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function checkReservation18224831() {
  console.log('\n🔍 Prüfe Reservation 18224831 (Sync-Problem Analyse)\n');
  console.log('='.repeat(80));

  const reservationId = '18224831';

  try {
    // 1. Prüfe lokale Datenbank
    console.log('\n📋 1. Prüfe lokale Datenbank...');
    const localReservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: reservationId },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        branchId: true,
        organizationId: true,
        branch: {
          select: { id: true, name: true, organizationId: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        syncHistory: {
          orderBy: { syncedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            syncType: true,
            syncedAt: true,
            errorMessage: true
          }
        }
      }
    });

    if (localReservation) {
      console.log('✅ Reservation in lokaler DB gefunden:');
      console.log(`   Interne ID: ${localReservation.id}`);
      console.log(`   LobbyPMS ID: ${localReservation.lobbyReservationId}`);
      console.log(`   Gast: ${localReservation.guestName}`);
      console.log(`   Status: ${localReservation.status}`);
      console.log(`   Check-in: ${localReservation.checkInDate}`);
      console.log(`   Check-out: ${localReservation.checkOutDate}`);
      console.log(`   Branch: ${localReservation.branch?.name || 'N/A'} (ID: ${localReservation.branchId || 'N/A'})`);
      console.log(`   Organisation: ${localReservation.organization?.name || 'N/A'} (ID: ${localReservation.organizationId || 'N/A'})`);
      
      if (localReservation.syncHistory.length > 0) {
        console.log(`\n   Letzte Sync-History:`);
        localReservation.syncHistory.forEach((history, idx) => {
          console.log(`   ${idx + 1}. ${history.syncType} - ${history.syncedAt.toISOString()}`);
          if (history.errorMessage) {
            console.log(`      Fehler: ${history.errorMessage}`);
          }
        });
      }
    } else {
      console.log('❌ Reservation NICHT in lokaler DB gefunden');
    }

    // 2. Versuche von LobbyPMS abzurufen
    console.log('\n📡 2. Versuche von LobbyPMS abzurufen...');
    
    // Finde alle Branches mit LobbyPMS Settings
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

    console.log(`   Gefundene Branches mit LobbyPMS: ${branches.length}`);

    let lobbyReservation: any = null;
    let foundBranchId: number | null = null;

    for (const branch of branches) {
      try {
        console.log(`   Versuche Branch ${branch.id} (${branch.name})...`);
        const service = await LobbyPmsService.createForBranch(branch.id);
        
        try {
          lobbyReservation = await service.fetchReservationById(reservationId);
          foundBranchId = branch.id;
          console.log(`   ✅ Reservation in LobbyPMS gefunden über Branch ${branch.id}!`);
          break;
        } catch (error) {
          if (error instanceof Error && error.message.includes('nicht gefunden')) {
            console.log(`   ⚠️  Reservation nicht in diesem Branch gefunden`);
            continue;
          } else {
            console.log(`   ⚠️  Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            continue;
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Fehler beim Erstellen des Services für Branch ${branch.id}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        continue;
      }
    }

    if (!lobbyReservation) {
      console.log('\n❌ Reservation konnte nicht von LobbyPMS abgerufen werden');
      console.log('   Mögliche Gründe:');
      console.log('   - Reservation existiert nicht in LobbyPMS');
      console.log('   - API-Endpoint ist falsch');
      console.log('   - Keine passende Branch-Konfiguration');
      return;
    }

    // 3. Analysiere LobbyPMS-Daten
    console.log('\n📊 3. LobbyPMS Reservierungs-Daten:');
    console.log('='.repeat(80));
    
    console.log(`\n🔹 Basis-Informationen:`);
    console.log(`   Booking ID: ${lobbyReservation.booking_id || lobbyReservation.id}`);
    console.log(`   Creation Date: ${lobbyReservation.creation_date || 'N/A'}`);
    console.log(`   Check-in Date: ${lobbyReservation.start_date || lobbyReservation.check_in_date || 'N/A'}`);
    console.log(`   Check-out Date: ${lobbyReservation.end_date || lobbyReservation.check_out_date || 'N/A'}`);
    console.log(`   Property ID: ${lobbyReservation.property_id || 'N/A'}`);
    console.log(`   Status: ${lobbyReservation.status || 'N/A'}`);
    console.log(`   Checked In: ${lobbyReservation.checked_in ? '✅ true' : '❌ false'}`);
    console.log(`   Checked Out: ${lobbyReservation.checked_out ? '✅ true' : '❌ false'}`);

    // 4. Analysiere warum sie beim Sync nicht gefunden wurde
    console.log('\n🔍 4. Analyse: Warum wurde sie beim Sync nicht gefunden?');
    console.log('='.repeat(80));

    if (lobbyReservation.creation_date) {
      const creationDate = new Date(lobbyReservation.creation_date);
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      console.log(`\n📅 Creation Date Analyse:`);
      console.log(`   Creation Date: ${creationDate.toISOString()}`);
      console.log(`   Jetzt: ${now.toISOString()}`);
      console.log(`   Letzte 24h: ${last24Hours.toISOString()}`);
      console.log(`   Letzte 7 Tage: ${last7Days.toISOString()}`);
      console.log(`   Letzte 30 Tage: ${last30Days.toISOString()}`);

      if (creationDate < last24Hours) {
        console.log(`\n   ⚠️  PROBLEM: Creation Date ist älter als 24 Stunden!`);
        console.log(`   Der automatische Sync prüft nur die letzten 24 Stunden (creation_date).`);
        console.log(`   Diese Reservation würde beim normalen Sync NICHT gefunden werden.`);
      } else {
        console.log(`\n   ✅ Creation Date ist innerhalb der letzten 24 Stunden`);
        console.log(`   Diese Reservation SOLLTE beim normalen Sync gefunden werden.`);
      }

      if (creationDate < last7Days) {
        console.log(`\n   ⚠️  Creation Date ist älter als 7 Tage`);
      } else if (creationDate < last30Days) {
        console.log(`\n   ℹ️  Creation Date ist zwischen 7 und 30 Tagen alt`);
      } else {
        console.log(`\n   ✅ Creation Date ist weniger als 7 Tage alt`);
      }
    } else {
      console.log(`\n   ⚠️  PROBLEM: Kein creation_date Feld vorhanden!`);
      console.log(`   Die fetchReservations Funktion filtert nach creation_date.`);
      console.log(`   Reservierungen OHNE creation_date werden herausgefiltert!`);
    }

    // 5. Prüfe Pagination-Problem
    console.log(`\n📄 5. Pagination-Analyse:`);
    console.log(`   Der Sync lädt maximal 5 Seiten (maxPages = 5)`);
    console.log(`   Pro Seite: 100 Reservierungen`);
    console.log(`   Maximal: 500 Reservierungen`);
    console.log(`   Stoppt nach 1 Seite ohne neue Reservierungen (MAX_CONSECUTIVE_OLD_PAGES = 1)`);
    console.log(`\n   ⚠️  MÖGLICHES PROBLEM:`);
    console.log(`   Wenn die Reservation auf Seite 6+ ist, wird sie nicht geladen.`);
    console.log(`   Wenn die Reservation ein altes creation_date hat, wird sie herausgefiltert.`);

    // 6. Vollständige LobbyPMS-Response
    console.log('\n📄 6. Vollständige LobbyPMS-Response:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(lobbyReservation, null, 2));

    // 7. Lösungsvorschläge
    console.log('\n💡 7. Lösungsvorschläge:');
    console.log('='.repeat(80));
    
    if (!localReservation) {
      console.log('\n   ✅ LÖSUNG 1: Manueller Sync für diese spezifische Reservation');
      console.log(`      POST /api/lobby-pms/sync mit body: { reservationIds: ["${reservationId}"] }`);
      
      if (foundBranchId) {
        console.log(`\n   ✅ LÖSUNG 2: Direkter Sync über Branch ${foundBranchId}`);
        console.log(`      const service = await LobbyPmsService.createForBranch(${foundBranchId});`);
        console.log(`      const reservation = await service.fetchReservationById("${reservationId}");`);
        console.log(`      await service.syncReservation(reservation);`);
      }
    }

    if (lobbyReservation.creation_date) {
      const creationDate = new Date(lobbyReservation.creation_date);
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      if (creationDate < last24Hours) {
        console.log(`\n   ⚠️  PROBLEM: Creation Date ist zu alt für automatischen Sync`);
        console.log(`   ✅ LÖSUNG: Verwende syncReservationsByCheckoutDate() für vollständigen Sync`);
        console.log(`      Oder: Erhöhe den Sync-Zeitraum in syncReservationsForBranch()`);
      }
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG:');
    console.log(`   Reservation ID: ${reservationId}`);
    console.log(`   In lokaler DB: ${localReservation ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   In LobbyPMS: ${lobbyReservation ? '✅ JA' : '❌ NEIN'}`);
    if (lobbyReservation) {
      console.log(`   Creation Date: ${lobbyReservation.creation_date || 'N/A'}`);
      if (lobbyReservation.creation_date) {
        const creationDate = new Date(lobbyReservation.creation_date);
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`   Älter als 24h: ${creationDate < last24Hours ? '✅ JA' : '❌ NEIN'}`);
      }
    }
    console.log(`   Branch ID: ${foundBranchId || 'N/A'}`);

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

checkReservation18224831();

