/**
 * Synchronisiert Reservation 18241537 mit LobbyPMS
 * 
 * Aktualisiert:
 * - Check-in Status (basierend auf checked_in Boolean)
 * - Payment Status (basierend auf paid_out vs total_to_pay)
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function syncReservation18241537() {
  console.log('\n🔄 Synchronisiere Reservation 18241537 mit LobbyPMS\n');
  console.log('='.repeat(80));

  try {
    // Finde Reservation
    const reservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: '18241537' },
      include: { 
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!reservation) {
      console.log('❌ Reservation mit LobbyPMS ID 18241537 nicht gefunden');
      return;
    }

    console.log('✅ Reservation gefunden:');
    console.log(`   Interne ID: ${reservation.id}`);
    console.log(`   LobbyPMS ID: ${reservation.lobbyReservationId}`);
    console.log(`   Gast: ${reservation.guestName}`);
    console.log(`   Branch: ${reservation.branch?.name || 'N/A'} (ID: ${reservation.branchId || 'N/A'})`);
    console.log(`   Organisation: ${reservation.organization.name} (ID: ${reservation.organizationId})`);
    
    console.log('\n📊 Aktueller Status (vor Sync):');
    console.log(`   Status: ${reservation.status}`);
    console.log(`   Payment Status: ${reservation.paymentStatus}`);
    console.log(`   Online Check-in: ${reservation.onlineCheckInCompleted ? '✅' : '❌'}`);

    if (!reservation.branchId) {
      console.log('\n❌ Keine Branch-ID gefunden - kann nicht synchronisieren');
      console.log('   💡 Lösung: Reservation muss einem Branch zugeordnet sein');
      return;
    }

    console.log('\n🔄 Hole aktuelle Daten von LobbyPMS...');

    // Erstelle Service
    const service = await LobbyPmsService.createForBranch(reservation.branchId);

    // Hole aktuelle Daten von LobbyPMS
    const lobbyReservation = await service.getReservationById('18241537');

    if (!lobbyReservation) {
      console.log('❌ Reservation nicht in LobbyPMS gefunden');
      console.log('   💡 Prüfe ob LobbyPMS ID korrekt ist');
      return;
    }

    console.log('✅ LobbyPMS Daten erhalten:\n');
    console.log('📋 LobbyPMS Status:');
    console.log(`   Checked In: ${lobbyReservation.checked_in ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Checked Out: ${lobbyReservation.checked_out ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Status: ${lobbyReservation.status || 'N/A'}`);
    
    console.log('\n💳 LobbyPMS Payment:');
    console.log(`   Paid Out: ${lobbyReservation.paid_out || '0'}`);
    console.log(`   Total To Pay: ${lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || '0'}`);
    console.log(`   Payment Status: ${lobbyReservation.payment_status || 'N/A'}`);

    // Berechne erwartete Status-Updates
    console.log('\n🔍 Erwartete Status-Updates:');
    
    // Check-in Status
    let expectedStatus = 'confirmed';
    if (lobbyReservation.checked_out) {
      expectedStatus = 'checked_out';
    } else if (lobbyReservation.checked_in) {
      expectedStatus = 'checked_in';
    }
    console.log(`   Status: ${reservation.status} → ${expectedStatus} ${reservation.status === expectedStatus ? '✅ (bereits korrekt)' : '🔄 (wird aktualisiert)'}`);

    // Payment Status
    const paidOut = parseFloat(lobbyReservation.paid_out || '0');
    const totalToPay = parseFloat(lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || '0');
    let expectedPaymentStatus = 'pending';
    if (paidOut >= totalToPay && totalToPay > 0) {
      expectedPaymentStatus = 'paid';
    } else if (paidOut > 0) {
      expectedPaymentStatus = 'partially_paid';
    }
    console.log(`   Payment Status: ${reservation.paymentStatus} → ${expectedPaymentStatus} ${reservation.paymentStatus === expectedPaymentStatus ? '✅ (bereits korrekt)' : '🔄 (wird aktualisiert)'}`);

    console.log('\n🔄 Führe Synchronisation durch...');

    // Synchronisiere
    const syncedReservation = await service.syncReservation(lobbyReservation);

    console.log('\n✅ Synchronisation abgeschlossen!\n');
    console.log('📊 Neuer Status (nach Sync):');
    console.log(`   Status: ${syncedReservation.status} ${syncedReservation.status === expectedStatus ? '✅' : '⚠️'}`);
    console.log(`   Payment Status: ${syncedReservation.paymentStatus} ${syncedReservation.paymentStatus === expectedPaymentStatus ? '✅' : '⚠️'}`);
    console.log(`   Online Check-in: ${syncedReservation.onlineCheckInCompleted ? '✅' : '❌'}`);
    if (syncedReservation.onlineCheckInCompletedAt) {
      console.log(`   Online Check-in Zeitpunkt: ${syncedReservation.onlineCheckInCompletedAt.toISOString()}`);
    }
    console.log(`   Aktualisiert: ${syncedReservation.updatedAt.toISOString()}`);

    // Prüfe ob Updates erfolgreich waren
    const statusUpdated = syncedReservation.status !== reservation.status;
    const paymentUpdated = syncedReservation.paymentStatus !== reservation.paymentStatus;

    if (statusUpdated || paymentUpdated) {
      console.log('\n✅ Status wurde aktualisiert!');
      if (statusUpdated) {
        console.log(`   ✅ Status: ${reservation.status} → ${syncedReservation.status}`);
      }
      if (paymentUpdated) {
        console.log(`   ✅ Payment Status: ${reservation.paymentStatus} → ${syncedReservation.paymentStatus}`);
      }
    } else {
      console.log('\n⚠️  Status wurde NICHT aktualisiert');
      console.log('   💡 Mögliche Ursachen:');
      console.log('      - LobbyPMS hat noch nicht aktualisierte Daten');
      console.log('      - Check-in/Payment wurde noch nicht in LobbyPMS erfasst');
      console.log('      - Bedingungen für Status-Update nicht erfüllt');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Synchronisation abgeschlossen\n');

  } catch (error) {
    console.error('\n❌ Fehler bei der Synchronisation:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

syncReservation18241537();

