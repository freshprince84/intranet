import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPaymentLinkFacts() {
  try {
    // 1. Reservierungen OHNE Payment-Link, die versucht wurden zu senden
    const reservationsWithoutPaymentLink = await prisma.reservation.findMany({
      where: {
        paymentLink: null,
        OR: [
          { sentMessageAt: { not: null } },
          { status: 'notification_sent' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
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
    console.log('RESERVATIONS_WITHOUT_PAYMENT_LINK:', JSON.stringify(reservationsWithoutPaymentLink, null, 2));
    
    // 2. Notification-Logs mit Fehlern (letzte 24h)
    const errorLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        success: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reservation: {
          select: {
            id: true,
            guestName: true,
            paymentLink: true,
            amount: true,
            currency: true
          }
        }
      }
    });
    console.log('ERROR_LOGS:', JSON.stringify(errorLogs.map(l => ({
      id: l.id,
      reservationId: l.reservationId,
      guestName: l.reservation?.guestName,
      type: l.notificationType,
      channel: l.channel,
      error: l.errorMessage,
      sentTo: l.sentTo,
      createdAt: l.createdAt,
      hasPaymentLink: !!l.reservation?.paymentLink,
      amount: l.reservation?.amount,
      currency: l.reservation?.currency
    })), null, 2));
    
    // 3. Reservierungen mit Payment-Link-Fehler in Error-Message
    const paymentLinkErrors = errorLogs.filter(l => 
      l.errorMessage?.includes('Payment-Link') || 
      l.errorMessage?.includes('Bold Payment') ||
      l.errorMessage?.includes('Betrag zu niedrig')
    );
    console.log('PAYMENT_LINK_ERRORS:', JSON.stringify(paymentLinkErrors.map(l => ({
      reservationId: l.reservationId,
      guestName: l.reservation?.guestName,
      error: l.errorMessage,
      amount: l.reservation?.amount,
      currency: l.reservation?.currency,
      createdAt: l.createdAt
    })), null, 2));
    
    // 4. Reservierungen der letzten 7 Tage OHNE Payment-Link
    const recentWithoutPaymentLink = await prisma.reservation.findMany({
      where: {
        paymentLink: null,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        amount: true,
        currency: true,
        createdAt: true
      }
    });
    console.log('RECENT_WITHOUT_PAYMENT_LINK_COUNT:', recentWithoutPaymentLink.length);
    console.log('RECENT_WITHOUT_PAYMENT_LINK:', JSON.stringify(recentWithoutPaymentLink, null, 2));
    
    // 5. Reservierungen mit Betrag 0 oder < 10000 COP
    const lowAmountReservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { amount: 0 },
          { amount: { lt: 10000 } }
        ],
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        guestName: true,
        amount: true,
        currency: true,
        paymentLink: true,
        createdAt: true
      }
    });
    console.log('LOW_AMOUNT_RESERVATIONS_COUNT:', lowAmountReservations.length);
    console.log('LOW_AMOUNT_RESERVATIONS:', JSON.stringify(lowAmountReservations, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentLinkFacts();

