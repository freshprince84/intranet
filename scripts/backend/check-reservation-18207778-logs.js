/**
 * Prüft Reservation 18207778 und alle relevanten Logs
 * Verwendet Prisma statt psql
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReservation18207778() {
  console.log('\n🔍 Prüfe Reservation 18207778 und Logs');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Suche Reservation
    console.log('📋 1. Suche Reservation in Datenbank...');
    console.log('   - Nach LobbyPMS ID:');
    let reservation = await prisma.reservation.findFirst({
      where: {
        lobbyReservationId: '18207778'
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        guestNationality: true,
        branchId: true,
        organizationId: true
      }
    });

    if (reservation) {
      console.log('   ✅ Reservation gefunden:');
      console.log(`      ID: ${reservation.id}`);
      console.log(`      LobbyPMS ID: ${reservation.lobbyReservationId}`);
      console.log(`      Gast: ${reservation.guestName}`);
      console.log(`      Telefon: ${reservation.guestPhone || 'N/A'}`);
      console.log(`      E-Mail: ${reservation.guestEmail || 'N/A'}`);
      console.log(`      Nationalität: ${reservation.guestNationality || 'N/A'}`);
      console.log(`      Branch ID: ${reservation.branchId || 'N/A'}`);
      console.log(`      Organisation ID: ${reservation.organizationId}`);
    } else {
      console.log('   ❌ Reservation mit LobbyPMS ID 18207778 nicht gefunden');
      
      // Versuche interne ID
      console.log('');
      console.log('   - Nach interner ID:');
      reservation = await prisma.reservation.findUnique({
        where: {
          id: 18207778
        },
        select: {
          id: true,
          lobbyReservationId: true,
          guestName: true,
          guestPhone: true,
          guestEmail: true,
          guestNationality: true,
          branchId: true,
          organizationId: true
        }
      });

      if (reservation) {
        console.log('   ✅ Reservation gefunden (interne ID):');
        console.log(`      ID: ${reservation.id}`);
        console.log(`      LobbyPMS ID: ${reservation.lobbyReservationId || 'N/A'}`);
        console.log(`      Gast: ${reservation.guestName}`);
        console.log(`      Telefon: ${reservation.guestPhone || 'N/A'}`);
        console.log(`      E-Mail: ${reservation.guestEmail || 'N/A'}`);
        console.log(`      Nationalität: ${reservation.guestNationality || 'N/A'}`);
        console.log(`      Branch ID: ${reservation.branchId || 'N/A'}`);
        console.log(`      Organisation ID: ${reservation.organizationId}`);
      } else {
        console.log('   ❌ Reservation mit interner ID 18207778 nicht gefunden');
        
        // Suche ähnliche IDs
        console.log('');
        console.log('   - Ähnliche IDs:');
        const similar = await prisma.reservation.findMany({
          where: {
            OR: [
              { lobbyReservationId: { contains: '182077' } },
              { id: { gte: 18207700, lte: 18207799 } }
            ]
          },
          select: {
            id: true,
            lobbyReservationId: true,
            guestName: true,
            guestPhone: true
          },
          take: 10
        });

        if (similar.length > 0) {
          console.log('   Gefundene ähnliche Reservierungen:');
          similar.forEach(r => {
            console.log(`      - ID: ${r.id}, LobbyID: ${r.lobbyReservationId || 'N/A'}, Name: ${r.guestName}`);
          });
        } else {
          console.log('   Keine ähnlichen Reservierungen gefunden');
        }
      }
    }

    // 2. Prüfe Notification-Logs
    console.log('');
    console.log('='.repeat(80));
    console.log('📨 2. Prüfe Notification-Logs...');
    console.log('');

    if (reservation) {
      console.log(`   - Alle Logs für Reservation ${reservation.id}:`);
      const logs = await prisma.reservationNotificationLog.findMany({
        where: {
          reservationId: reservation.id
        },
        orderBy: {
          sentAt: 'desc'
        },
        take: 10
      });

      if (logs.length > 0) {
        logs.forEach((log, index) => {
          console.log(`\n   ${index + 1}. Notification (${log.sentAt.toISOString()}):`);
          console.log(`      Typ: ${log.notificationType}`);
          console.log(`      Kanal: ${log.channel}`);
          console.log(`      Erfolg: ${log.success ? '✅' : '❌'}`);
          console.log(`      Gesendet an: ${log.sentTo || 'N/A'}`);
          if (log.errorMessage) {
            console.log(`      Fehler: ${log.errorMessage}`);
          }
          if (log.message) {
            const preview = log.message.length > 100 ? log.message.substring(0, 100) + '...' : log.message;
            console.log(`      Nachricht: ${preview}`);
          }
        });
      } else {
        console.log('   ⚠️  Keine Notification-Logs gefunden');
      }
    }

    // 3. Prüfe letzte WhatsApp-Notifications
    console.log('');
    console.log('   - Letzte WhatsApp-Notifications (letzte 24h, alle Reservierungen):');
    const recentWhatsAppLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        channel: 'whatsapp',
        sentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Letzte 24h
        }
      },
      include: {
        reservation: {
          select: {
            id: true,
            lobbyReservationId: true,
            guestName: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 20
    });

    if (recentWhatsAppLogs.length > 0) {
      recentWhatsAppLogs.forEach((log, index) => {
        const isTargetReservation = reservation && log.reservationId === reservation.id;
        const marker = isTargetReservation ? '🎯' : '  ';
        console.log(`${marker} ${index + 1}. Reservation ID: ${log.reservation.id}, LobbyID: ${log.reservation.lobbyReservationId || 'N/A'}, Name: ${log.reservation.guestName}`);
        console.log(`      Typ: ${log.notificationType}, Kanal: ${log.channel}, Erfolg: ${log.success ? '✅' : '❌'}`);
        console.log(`      Gesendet an: ${log.sentTo || 'N/A'}, Zeit: ${log.sentAt.toISOString()}`);
        if (log.errorMessage) {
          console.log(`      Fehler: ${log.errorMessage.substring(0, 150)}`);
        }
      });
    } else {
      console.log('   ⚠️  Keine WhatsApp-Notifications in den letzten 24h gefunden');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Prüfung abgeschlossen');
    console.log('');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservation18207778();

