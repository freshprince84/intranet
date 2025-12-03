/**
 * Prüft Reservation 18060402 - Check-in-Link-Abschluss Analyse
 * 
 * Diese Reservation hat den Check-in-Link abgeschlossen, aber Status wurde nicht aktualisiert.
 * 
 * Prüft:
 * - Welche Felder in LobbyPMS sind gefüllt (besonders holder-Felder)
 * - checkin_online Feld
 * - holder.type_document und holder.document
 * - holder.country vs holder.pais
 * - Vergleich mit lokaler Reservation
 * - Welche Felder können als Indikator für abgeschlossenen Check-in-Link dienen?
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function checkReservation18060402() {
  console.log('\n🔍 Prüfe Reservation 18060402 (Check-in-Link-Abschluss Analyse)\n');
  console.log('='.repeat(80));

  try {
    // Finde lokale Reservation
    const localReservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: '18060402' },
      include: {
        branch: {
          select: { id: true, name: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!localReservation) {
      console.log('❌ Reservation mit LobbyPMS ID 18060402 nicht in lokaler DB gefunden');
      console.log('\n📋 Versuche direkt von LobbyPMS abzurufen...');
      
      // Versuche direkt von LobbyPMS abzurufen (ohne Branch)
      const tempService = new LobbyPmsService(1); // Organisation 1
      try {
        const lobbyReservation = await tempService.fetchReservationById('18060402');
        console.log('✅ Reservation in LobbyPMS gefunden!');
        console.log('\n📊 LobbyPMS Daten:');
        console.log(JSON.stringify(lobbyReservation, null, 2));
        return;
      } catch (error) {
        console.error('❌ Fehler beim Abrufen von LobbyPMS:', error);
        return;
      }
    }

    console.log('✅ Lokale Reservation gefunden:');
    console.log(`   Interne ID: ${localReservation.id}`);
    console.log(`   LobbyPMS ID: ${localReservation.lobbyReservationId}`);
    console.log(`   Gast: ${localReservation.guestName}`);
    console.log(`   Status: ${localReservation.status}`);
    console.log(`   Payment Status: ${localReservation.paymentStatus}`);
    console.log(`   Online Check-in: ${localReservation.onlineCheckInCompleted ? '✅' : '❌'}`);
    console.log(`   Branch: ${localReservation.branch?.name || 'N/A'} (ID: ${localReservation.branchId || 'N/A'})`);

    if (!localReservation.branchId) {
      console.log('\n❌ Keine Branch-ID gefunden - kann nicht von LobbyPMS abrufen');
      return;
    }

    // Hole aktuelle Daten von LobbyPMS
    console.log('\n📡 Hole aktuelle Daten von LobbyPMS...');
    const service = await LobbyPmsService.createForBranch(localReservation.branchId);
    
    let lobbyReservation;
    try {
      lobbyReservation = await service.fetchReservationById('18060402');
    } catch (error) {
      console.error('❌ Fehler beim Abrufen von LobbyPMS:', error);
      console.log('\n💡 Versuche alternative Methode: Hole alle Reservierungen und filtere...');
      
      // Fallback: Hole alle Reservierungen und filtere nach booking_id
      const allReservations = await service.fetchReservations(
        new Date('2024-01-01'), // Weit zurück
        new Date('2026-12-31')  // Weit voraus
      );
      
      lobbyReservation = allReservations.find(r => 
        String(r.booking_id) === '18060402' || String(r.id) === '18060402'
      );
      
      if (!lobbyReservation) {
        console.error('❌ Reservation 18060402 nicht in LobbyPMS gefunden');
        return;
      }
      
      console.log('✅ Reservation über fetchReservations gefunden!');
    }

    console.log('\n📊 LobbyPMS Reservierungs-Daten:');
    console.log('='.repeat(80));
    
    // Basis-Informationen
    console.log('\n🔹 Basis-Informationen:');
    console.log(`   Booking ID: ${lobbyReservation.booking_id || lobbyReservation.id}`);
    console.log(`   Creation Date: ${lobbyReservation.creation_date || 'N/A'}`);
    console.log(`   Check-in Date: ${lobbyReservation.start_date || lobbyReservation.check_in_date || 'N/A'}`);
    console.log(`   Check-out Date: ${lobbyReservation.end_date || lobbyReservation.check_out_date || 'N/A'}`);
    console.log(`   Checked In: ${lobbyReservation.checked_in ? '✅ true' : '❌ false'}`);
    console.log(`   Checked Out: ${lobbyReservation.checked_out ? '✅ true' : '❌ false'}`);
    console.log(`   Checkin Online: ${lobbyReservation.checkin_online ? '✅ true' : '❌ false'}`);

    // Holder-Objekt (wichtig für Check-in-Link-Erkennung)
    console.log('\n🔹 Holder-Objekt (Check-in-Link-Daten):');
    const holder = lobbyReservation.holder || {};
    console.log(`   Client ID: ${holder.client_id || 'N/A'}`);
    console.log(`   Type Document: ${holder.type_document || '"" (leer)'}`);
    console.log(`   Document: ${holder.document || '"" (leer)'}`);
    console.log(`   Name: ${holder.name || 'N/A'}`);
    console.log(`   Surname: ${holder.surname || 'N/A'}`);
    console.log(`   Second Surname: ${holder.second_surname || 'N/A'}`);
    console.log(`   Email: ${holder.email || 'N/A'}`);
    console.log(`   Phone: ${holder.phone || 'N/A'}`);
    console.log(`   Country: ${holder.country || 'N/A'}`);
    console.log(`   Pais: ${holder.pais || 'N/A'}`);

    // Vollständiges holder-Objekt ausgeben
    console.log('\n🔹 Vollständiges holder-Objekt:');
    console.log(JSON.stringify(holder, null, 2));

    // Analyse: Welche Felder deuten auf abgeschlossenen Check-in-Link hin?
    console.log('\n🔍 ANALYSE: Check-in-Link-Abschluss-Indikatoren');
    console.log('='.repeat(80));
    
    const indicators = {
      checkin_online: lobbyReservation.checkin_online === true,
      hasTypeDocument: !!(holder.type_document && holder.type_document !== ''),
      hasDocument: !!(holder.document && holder.document !== ''),
      hasCountry: !!(holder.country && holder.country !== ''),
      hasPais: !!(holder.pais && holder.pais !== ''),
      hasName: !!(holder.name && holder.name !== ''),
      hasSurname: !!(holder.surname && holder.surname !== ''),
      hasEmail: !!(holder.email && holder.email !== ''),
      hasPhone: !!(holder.phone && holder.phone !== ''),
    };

    console.log('\n📋 Indikatoren:');
    console.log(`   checkin_online: ${indicators.checkin_online ? '✅ true' : '❌ false'}`);
    console.log(`   holder.type_document gefüllt: ${indicators.hasTypeDocument ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.document gefüllt: ${indicators.hasDocument ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.country gefüllt: ${indicators.hasCountry ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.pais gefüllt: ${indicators.hasPais ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.name gefüllt: ${indicators.hasName ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.surname gefüllt: ${indicators.hasSurname ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.email gefüllt: ${indicators.hasEmail ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   holder.phone gefüllt: ${indicators.hasPhone ? '✅ JA' : '❌ NEIN'}`);

    // Empfehlung: Welche Kombination deutet auf abgeschlossenen Check-in-Link hin?
    console.log('\n💡 EMPFEHLUNGEN:');
    
    if (indicators.checkin_online) {
      console.log('   ✅ checkin_online = true → Check-in-Link wurde verwendet');
    } else {
      console.log('   ⚠️  checkin_online = false → Unklar ob Check-in-Link verwendet wurde');
    }

    if (indicators.hasTypeDocument && indicators.hasDocument) {
      console.log('   ✅ type_document + document gefüllt → Dokument hochgeladen (Check-in-Link abgeschlossen)');
    } else {
      console.log('   ⚠️  type_document oder document leer → Dokument möglicherweise nicht hochgeladen');
    }

    if (indicators.hasCountry || indicators.hasPais) {
      console.log('   ✅ country oder pais gefüllt → Nationalität angegeben');
    }

    // Vergleich mit lokaler Reservation
    console.log('\n📊 Vergleich: Lokal vs LobbyPMS');
    console.log('='.repeat(80));
    console.log(`   Lokaler Status: ${localReservation.status}`);
    console.log(`   LobbyPMS checked_in: ${lobbyReservation.checked_in ? 'true' : 'false'}`);
    console.log(`   Lokaler Payment Status: ${localReservation.paymentStatus}`);
    console.log(`   LobbyPMS paid_out: ${lobbyReservation.paid_out || 0}`);
    console.log(`   LobbyPMS total_to_pay: ${lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || 0}`);

    // Vollständige LobbyPMS-Response ausgeben
    console.log('\n📄 Vollständige LobbyPMS-Response:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(lobbyReservation, null, 2));

    // Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG:');
    console.log(`   Reservation ID: ${localReservation.id} (LobbyPMS: ${localReservation.lobbyReservationId})`);
    console.log(`   checkin_online: ${lobbyReservation.checkin_online ? '✅ true' : '❌ false'}`);
    console.log(`   type_document: ${holder.type_document || '"" (leer)'}`);
    console.log(`   document: ${holder.document || '"" (leer)'}`);
    console.log(`   country: ${holder.country || '"" (leer)'}`);
    console.log(`   pais: ${holder.pais || '"" (leer)'}`);
    
    console.log('\n💡 MÖGLICHE INDIKATOREN FÜR CHECK-IN-LINK-ABSCHLUSS:');
    if (indicators.checkin_online) {
      console.log('   1. ✅ checkin_online = true (sicherster Indikator)');
    }
    if (indicators.hasTypeDocument && indicators.hasDocument) {
      console.log('   2. ✅ type_document + document gefüllt (sehr wahrscheinlich)');
    }
    if (indicators.hasCountry || indicators.hasPais) {
      console.log('   3. ✅ country oder pais gefüllt (möglich)');
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

checkReservation18060402();

