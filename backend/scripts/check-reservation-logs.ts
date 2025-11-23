import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservationLogs() {
  try {
    console.log('🔍 Prüfe Reservation Notification Logs...\n');

    // 1. Prüfe ob es überhaupt Notification-Logs gibt
    const logCount = await prisma.reservationNotificationLog.count();
    console.log(`📊 Anzahl Notification-Logs in DB: ${logCount}\n`);

    if (logCount > 0) {
      const recentLogs = await prisma.reservationNotificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          reservation: {
            select: {
              id: true,
              guestName: true
            }
          }
        }
      });

      console.log('📋 Neueste Notification-Logs:');
      recentLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. Reservation ${log.reservationId} (${log.reservation?.guestName || 'N/A'})`);
        console.log(`   Type: ${log.notificationType}`);
        console.log(`   Channel: ${log.channel}`);
        console.log(`   Success: ${log.success}`);
        console.log(`   Sent At: ${log.sentAt}`);
        console.log(`   Sent To: ${log.sentTo || 'N/A'}`);
        if (log.errorMessage) {
          console.log(`   ❌ Error: ${log.errorMessage}`);
        }
        console.log(`   Created At: ${log.createdAt}`);
      });
    } else {
      console.log('⚠️ KEINE Notification-Logs in der Datenbank gefunden!\n');
    }

    // 2. Prüfe Reservierungen mit sentMessageAt
    const reservationsWithSent = await prisma.reservation.findMany({
      where: {
        sentMessageAt: {
          not: null
        }
      },
      orderBy: {
        sentMessageAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        paymentLink: true,
        sentMessageAt: true,
        status: true
      }
    });

    console.log(`\n📧 Reservierungen mit sentMessageAt (${reservationsWithSent.length}):`);
    reservationsWithSent.forEach((res, index) => {
      console.log(`\n${index + 1}. Reservation ${res.id}: ${res.guestName}`);
      console.log(`   Phone: ${res.guestPhone || 'N/A'}`);
      console.log(`   Email: ${res.guestEmail || 'N/A'}`);
      console.log(`   Payment Link: ${res.paymentLink ? '✅' : '❌'}`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Sent At: ${res.sentMessageAt}`);
    });

    // 3. Prüfe neueste Reservierungen
    const recentReservations = await prisma.reservation.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        paymentLink: true,
        sentMessageAt: true,
        status: true,
        createdAt: true
      }
    });

    console.log(`\n📋 Neueste Reservierungen (${recentReservations.length}):`);
    recentReservations.forEach((res, index) => {
      console.log(`\n${index + 1}. Reservation ${res.id}: ${res.guestName}`);
      console.log(`   Phone: ${res.guestPhone || 'N/A'}`);
      console.log(`   Email: ${res.guestEmail || 'N/A'}`);
      console.log(`   Payment Link: ${res.paymentLink ? '✅' : '❌'}`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Sent At: ${res.sentMessageAt || '❌ NICHT GESENDET'}`);
      console.log(`   Created At: ${res.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservationLogs();

