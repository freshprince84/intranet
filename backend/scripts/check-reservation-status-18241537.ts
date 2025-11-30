/**
 * Prüft Reservation 18241537 - Status-Updates (Payment & Check-in)
 * 
 * Prüft:
 * - Aktueller Status und Payment Status in der Datenbank
 * - Webhook-Logs (Bold Payment und LobbyPMS)
 * - Notification-Logs
 * - Sync-History
 * - Wann wurden Status-Updates durchgeführt
 * - Warum wurden Status-Updates nicht durchgeführt
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservation18241537() {
  console.log('\n🔍 Prüfe Reservation 18241537 (Status-Updates: Payment & Check-in)\n');
  console.log('='.repeat(80));

  try {
    // Suche Reservation nach lobbyReservationId ODER interner ID
    let reservation = await prisma.reservation.findFirst({
      where: {
        lobbyReservationId: '18241537'
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        task: {
          select: {
            id: true,
            status: true,
            title: true
          }
        }
      }
    });

    if (!reservation) {
      console.log('❌ Reservation mit LobbyPMS ID 18241537 nicht gefunden');
      console.log('\n📋 Suche nach ähnlichen IDs...');
      
      // Suche nach ähnlichen IDs
      const similar = await prisma.reservation.findMany({
        where: {
          lobbyReservationId: {
            contains: '182415'
          }
        },
        select: {
          id: true,
          lobbyReservationId: true,
          guestName: true,
          status: true,
          paymentStatus: true
        },
        take: 10
      });
      
      if (similar.length > 0) {
        console.log('Gefundene ähnliche Reservierungen:');
        similar.forEach(r => {
          console.log(`  - ID: ${r.id}, LobbyID: ${r.lobbyReservationId}, Name: ${r.guestName}, Status: ${r.status}, Payment: ${r.paymentStatus}`);
        });
      }
      
      // Versuche auch interne ID
      const reservationId = parseInt('18241537', 10);
      if (!isNaN(reservationId)) {
        reservation = await prisma.reservation.findUnique({
          where: {
            id: reservationId
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                displayName: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true
              }
            },
            task: {
              select: {
                id: true,
                status: true,
                title: true
              }
            }
          }
        });
      }
      
      if (!reservation) {
        console.log('\n❌ Reservation nicht gefunden - weder als LobbyPMS ID noch als interne ID');
        return;
      }
    }

    console.log('✅ Reservation gefunden!\n');
    console.log('📋 Reservation-Details:');
    console.log(`   Interne ID: ${reservation.id}`);
    console.log(`   LobbyPMS ID: ${reservation.lobbyReservationId}`);
    console.log(`   Gast: ${reservation.guestName}`);
    console.log(`   E-Mail: ${reservation.guestEmail || 'Nicht gesetzt'}`);
    console.log(`   Telefon: ${reservation.guestPhone || 'Nicht gesetzt'}`);
    console.log(`   Check-in: ${reservation.checkInDate.toISOString()}`);
    console.log(`   Check-out: ${reservation.checkOutDate.toISOString()}`);
    console.log(`   Organisation: ${reservation.organization.displayName || reservation.organization.name} (ID: ${reservation.organizationId})`);
    console.log(`   Branch: ${reservation.branch?.name || 'N/A'} (ID: ${reservation.branchId || 'N/A'})`);
    
    // ⚠️ WICHTIG: Status und Payment Status
    console.log('\n⚠️  STATUS-ANALYSE:');
    console.log(`   Aktueller Status: ${reservation.status}`);
    console.log(`   Payment Status: ${reservation.paymentStatus}`);
    console.log(`   Online Check-in abgeschlossen: ${reservation.onlineCheckInCompleted ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Online Check-in Zeitpunkt: ${reservation.onlineCheckInCompletedAt ? reservation.onlineCheckInCompletedAt.toISOString() : 'N/A'}`);
    console.log(`   Payment Link: ${reservation.paymentLink ? '✅ Vorhanden' : '❌ Fehlt'}`);
    if (reservation.paymentLink) {
      console.log(`   Payment Link URL: ${reservation.paymentLink}`);
    }
    
    // Prüfe ob Status korrekt ist
    const statusIssues: string[] = [];
    if (reservation.paymentStatus !== 'paid') {
      statusIssues.push(`Payment Status ist "${reservation.paymentStatus}" statt "paid"`);
    }
    if (reservation.status !== 'checked_in') {
      statusIssues.push(`Status ist "${reservation.status}" statt "checked_in"`);
    }
    if (!reservation.onlineCheckInCompleted) {
      statusIssues.push('Online Check-in wurde nicht als abgeschlossen markiert');
    }
    
    if (statusIssues.length > 0) {
      console.log('\n❌ PROBLEME GEFUNDEN:');
      statusIssues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n✅ Status ist korrekt!');
    }

    // Prüfe Sync-History
    console.log('\n📊 Sync-History:');
    const syncHistory = await prisma.reservationSyncHistory.findMany({
      where: {
        reservationId: reservation.id
      },
      orderBy: {
        syncedAt: 'desc'
      },
      take: 20
    });

    if (syncHistory.length === 0) {
      console.log('   ⚠️  Keine Sync-History gefunden');
    } else {
      console.log(`   ✅ ${syncHistory.length} Sync-Einträge gefunden:`);
      syncHistory.forEach((sync, index) => {
        console.log(`\n   ${index + 1}. Sync (${sync.syncedAt.toISOString()}):`);
        console.log(`      Typ: ${sync.syncType}`);
        if (sync.errorMessage) {
          console.log(`      ❌ Fehler: ${sync.errorMessage}`);
        }
        if (sync.syncData) {
          const data = sync.syncData as any;
          if (data.status) {
            console.log(`      Status: ${data.status}`);
          }
          if (data.payment_status) {
            console.log(`      Payment Status: ${data.payment_status}`);
          }
          if (data.checked_in !== undefined) {
            console.log(`      Checked In: ${data.checked_in}`);
          }
          if (data.paid_out !== undefined) {
            console.log(`      Paid Out: ${data.paid_out}`);
          }
          if (data.total_to_pay !== undefined) {
            console.log(`      Total To Pay: ${data.total_to_pay}`);
          }
        }
      });
    }

    // Prüfe Notification-Logs
    console.log('\n📨 Notification-Logs:');
    const notifications = await prisma.reservationNotificationLog.findMany({
      where: {
        reservationId: reservation.id
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 20
    });

    if (notifications.length === 0) {
      console.log('   ⚠️  Keine Notification-Logs gefunden');
    } else {
      console.log(`   ✅ ${notifications.length} Notification-Einträge gefunden:`);
      notifications.forEach((notif, index) => {
        console.log(`\n   ${index + 1}. Notification (${notif.sentAt.toISOString()}):`);
        console.log(`      Typ: ${notif.notificationType}`);
        console.log(`      Kanal: ${notif.channel}`);
        console.log(`      Erfolg: ${notif.success ? '✅' : '❌'}`);
        console.log(`      Gesendet an: ${notif.sentTo || 'N/A'}`);
        if (notif.errorMessage) {
          console.log(`      ❌ Fehler: ${notif.errorMessage}`);
        }
      });
    }

    // Prüfe Task-Status
    if (reservation.task) {
      console.log('\n📋 Verknüpfter Task:');
      console.log(`   Task ID: ${reservation.task.id}`);
      console.log(`   Task Titel: ${reservation.task.title}`);
      console.log(`   Task Status: ${reservation.task.status}`);
    } else {
      console.log('\n📋 Verknüpfter Task: Kein Task gefunden');
    }

    // Prüfe Timestamps
    console.log('\n⏰ Timestamps:');
    console.log(`   Erstellt: ${reservation.createdAt.toISOString()}`);
    console.log(`   Aktualisiert: ${reservation.updatedAt.toISOString()}`);
    console.log(`   Einladung versendet: ${reservation.invitationSentAt ? reservation.invitationSentAt.toISOString() : 'N/A'}`);
    console.log(`   Nachricht versendet: ${reservation.sentMessageAt ? reservation.sentMessageAt.toISOString() : 'N/A'}`);

    // Analyse: Wann sollte Status aktualisiert worden sein?
    console.log('\n🔍 ANALYSE:');
    const now = new Date();
    const checkInDate = new Date(reservation.checkInDate);
    const timeSinceCheckIn = now.getTime() - checkInDate.getTime();
    const hoursSinceCheckIn = timeSinceCheckIn / (1000 * 60 * 60);
    
    console.log(`   Check-in Datum: ${checkInDate.toISOString()}`);
    console.log(`   Aktuelles Datum: ${now.toISOString()}`);
    console.log(`   Stunden seit Check-in Datum: ${hoursSinceCheckIn.toFixed(2)}`);
    
    if (checkInDate <= now && reservation.status !== 'checked_in') {
      console.log(`   ⚠️  Check-in Datum ist erreicht/überschritten, aber Status ist nicht "checked_in"`);
    }
    
    // Prüfe ob Payment-Link vorhanden ist und ob er bezahlt wurde
    if (reservation.paymentLink) {
      console.log('\n💳 Payment-Link Analyse:');
      console.log(`   Payment-Link vorhanden: ✅`);
      console.log(`   Payment-Link: ${reservation.paymentLink}`);
      
      // Versuche Link-ID zu extrahieren
      const linkIdMatch = reservation.paymentLink.match(/LNK_[A-Z0-9]+/);
      if (linkIdMatch) {
        const linkId = linkIdMatch[0];
        console.log(`   Link ID: ${linkId}`);
        console.log(`   💡 Tipp: Prüfe im Bold Payment Dashboard, ob dieser Link bezahlt wurde`);
        console.log(`   💡 Tipp: Prüfe Server-Logs auf Bold Payment Webhook-Events für Link ID: ${linkId}`);
      }
    } else {
      console.log('\n💳 Payment-Link Analyse:');
      console.log(`   ⚠️  Kein Payment-Link vorhanden`);
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG:');
    console.log(`   Reservation ID: ${reservation.id} (LobbyPMS: ${reservation.lobbyReservationId})`);
    console.log(`   Status: ${reservation.status} ${reservation.status !== 'checked_in' ? '❌' : '✅'}`);
    console.log(`   Payment Status: ${reservation.paymentStatus} ${reservation.paymentStatus !== 'paid' ? '❌' : '✅'}`);
    console.log(`   Online Check-in: ${reservation.onlineCheckInCompleted ? '✅' : '❌'}`);
    
    if (statusIssues.length > 0) {
      console.log('\n❌ PROBLEM: Status-Updates wurden nicht korrekt durchgeführt!');
      console.log('\n🔍 NÄCHSTE SCHRITTE ZUR DIAGNOSE:');
      console.log('   1. Prüfe Server-Logs auf Bold Payment Webhook-Events');
      console.log('   2. Prüfe Server-Logs auf LobbyPMS Webhook-Events');
      console.log('   3. Prüfe im Bold Payment Dashboard, ob Zahlung tatsächlich erfolgt ist');
      console.log('   4. Prüfe im LobbyPMS, ob Check-in tatsächlich durchgeführt wurde');
      console.log('   5. Prüfe ob Webhook-Endpunkte erreichbar sind und Events empfangen haben');
    } else {
      console.log('\n✅ Status ist korrekt - keine Probleme gefunden');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Prüfung abgeschlossen\n');

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

checkReservation18241537();

