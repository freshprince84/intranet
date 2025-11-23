import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductionReservationErrors() {
  try {
    console.log('🔍 Prüfe Produktivserver auf Reservation-Fehler...\n');

    // 1. Prüfe Notification-Logs mit Fehlern
    const errorLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Letzte 7 Tage
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reservation: {
          select: {
            id: true,
            guestName: true,
            guestPhone: true,
            guestEmail: true,
            paymentLink: true,
            status: true
          }
        }
      }
    });

    console.log(`📊 Notification-Logs mit Fehlern (letzte 7 Tage): ${errorLogs.length}\n`);

    if (errorLogs.length > 0) {
      console.log('❌ Fehlerhafte Notification-Logs:');
      errorLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. Reservation ${log.reservationId} (${log.reservation?.guestName || 'N/A'})`);
        console.log(`   Type: ${log.notificationType}`);
        console.log(`   Channel: ${log.channel}`);
        console.log(`   Sent At: ${log.sentAt}`);
        console.log(`   Sent To: ${log.sentTo || 'N/A'}`);
        if (log.errorMessage) {
          console.log(`   ❌ ERROR: ${log.errorMessage}`);
        }
        console.log(`   Created At: ${log.createdAt}`);
        if (log.reservation) {
          console.log(`   Payment Link: ${log.reservation.paymentLink ? '✅' : '❌ NICHT VORHANDEN'}`);
          console.log(`   Status: ${log.reservation.status}`);
        }
      });
    }

    // 2. Prüfe Reservierungen ohne Payment-Link aber mit Versuch zu senden
    const reservationsWithoutPaymentLink = await prisma.reservation.findMany({
      where: {
        paymentLink: null,
        OR: [
          { sentMessageAt: { not: null } },
          { status: 'notification_sent' }
        ],
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Letzte 7 Tage
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        paymentLink: true,
        sentMessageAt: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true
      }
    });

    console.log(`\n\n📊 Reservierungen ohne Payment-Link aber mit Versuch zu senden: ${reservationsWithoutPaymentLink.length}\n`);

    if (reservationsWithoutPaymentLink.length > 0) {
      console.log('⚠️ Reservierungen ohne Payment-Link:');
      reservationsWithoutPaymentLink.forEach((res, index) => {
        console.log(`\n${index + 1}. Reservation ${res.id}: ${res.guestName}`);
        console.log(`   Phone: ${res.guestPhone || 'N/A'}`);
        console.log(`   Email: ${res.guestEmail || 'N/A'}`);
        console.log(`   Amount: ${res.amount} ${res.currency || 'COP'}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Sent At: ${res.sentMessageAt || 'NICHT GESENDET'}`);
        console.log(`   Created At: ${res.createdAt}`);
      });
    }

    // 3. Prüfe neueste Reservierungen mit Payment-Link-Fehlern
    const recentReservations = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Letzte 24 Stunden
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        paymentLink: true,
        sentMessageAt: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true
      }
    });

    console.log(`\n\n📊 Neueste Reservierungen (letzte 24 Stunden): ${recentReservations.length}\n`);

    if (recentReservations.length > 0) {
      console.log('📋 Neueste Reservierungen:');
      recentReservations.forEach((res, index) => {
        console.log(`\n${index + 1}. Reservation ${res.id}: ${res.guestName}`);
        console.log(`   Phone: ${res.guestPhone || 'N/A'}`);
        console.log(`   Email: ${res.guestEmail || 'N/A'}`);
        console.log(`   Amount: ${res.amount} ${res.currency || 'COP'}`);
        console.log(`   Payment Link: ${res.paymentLink ? '✅' : '❌ NICHT VORHANDEN'}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Sent At: ${res.sentMessageAt || 'NICHT GESENDET'}`);
        console.log(`   Created At: ${res.createdAt}`);
      });
    }

    // 4. Prüfe Notification-Logs für spezifische Reservation (falls ID bekannt)
    console.log(`\n\n📊 Alle Notification-Logs (letzte 24 Stunden):`);
    const allRecentLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reservation: {
          select: {
            id: true,
            guestName: true
          }
        }
      }
    });

    console.log(`Anzahl: ${allRecentLogs.length}`);
    allRecentLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. Reservation ${log.reservationId} (${log.reservation?.guestName || 'N/A'})`);
      console.log(`   Type: ${log.notificationType}, Channel: ${log.channel}`);
      console.log(`   Success: ${log.success ? '✅' : '❌'}`);
      if (log.errorMessage) {
        console.log(`   Error: ${log.errorMessage}`);
      }
      console.log(`   Created: ${log.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionReservationErrors();

