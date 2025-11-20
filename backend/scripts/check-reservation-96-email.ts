import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservation96() {
  try {
    console.log('🔍 Prüfe Reservation 96 (Daniel Oliveira)...\n');

    // 1. Reservation-Daten
    const reservation = await prisma.reservation.findUnique({
      where: { id: 96 },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        paymentLink: true,
        sentMessageAt: true,
        status: true,
        amount: true,
        currency: true
      }
    });

    if (!reservation) {
      console.log('❌ Reservation 96 nicht gefunden');
      return;
    }

    console.log('📋 Reservation-Daten:');
    console.log('   ID:', reservation.id);
    console.log('   Gast:', reservation.guestName);
    console.log('   Email:', reservation.guestEmail || 'NICHT GESETZT');
    console.log('   Telefon:', reservation.guestPhone || 'NICHT GESETZT');
    console.log('   Payment-Link:', reservation.paymentLink || 'NICHT GESETZT');
    console.log('   Status:', reservation.status);
    console.log('   Sent Message At:', reservation.sentMessageAt || 'NICHT GESETZT');
    console.log('   Amount:', reservation.amount);
    console.log('   Currency:', reservation.currency);
    console.log('');

    // 2. Notification Logs
    const logs = await prisma.reservationNotificationLog.findMany({
      where: { reservationId: 96 },
      orderBy: { sentAt: 'desc' },
      take: 10
    });

    console.log(`📧 Notification Logs (${logs.length} Einträge):`);
    if (logs.length === 0) {
      console.log('   ⚠️ Keine Notification-Logs gefunden');
    } else {
      logs.forEach((log, index) => {
        console.log(`\n   Log ${index + 1}:`);
        console.log('      Type:', log.notificationType);
        console.log('      Channel:', log.channel);
        console.log('      Success:', log.success);
        console.log('      Sent To:', log.sentTo || 'N/A');
        console.log('      Error:', log.errorMessage || 'Kein Fehler');
        console.log('      Sent At:', log.sentAt);
      });
    }
    console.log('');

    // 3. Analyse
    console.log('🔍 Analyse:');
    const hasEmail = !!reservation.guestEmail;
    const hasPhone = !!reservation.guestPhone;
    const hasPaymentLink = !!reservation.paymentLink;
    const emailLogs = logs.filter(log => log.channel === 'email');
    const whatsappLogs = logs.filter(log => log.channel === 'whatsapp');
    const successfulEmailLogs = emailLogs.filter(log => log.success);
    const failedEmailLogs = emailLogs.filter(log => !log.success);

    console.log('   Email vorhanden:', hasEmail ? '✅' : '❌');
    console.log('   Telefon vorhanden:', hasPhone ? '✅' : '❌');
    console.log('   Payment-Link vorhanden:', hasPaymentLink ? '✅' : '❌');
    console.log('   Email-Logs gesamt:', emailLogs.length);
    console.log('   Email-Logs erfolgreich:', successfulEmailLogs.length);
    console.log('   Email-Logs fehlgeschlagen:', failedEmailLogs.length);
    console.log('   WhatsApp-Logs gesamt:', whatsappLogs.length);
    console.log('');

    if (hasEmail && hasPaymentLink) {
      if (emailLogs.length === 0) {
        console.log('   ⚠️ PROBLEM: Email vorhanden, Payment-Link vorhanden, aber KEINE Email-Logs!');
        console.log('   → Email-Versand wurde wahrscheinlich nicht versucht');
        console.log('   → Mögliche Ursachen:');
        console.log('      - Check-in-Link fehlt');
        console.log('      - Bedingung in Code nicht erfüllt');
        console.log('      - Code wurde noch nicht deployed');
      } else if (failedEmailLogs.length > 0) {
        console.log('   ⚠️ PROBLEM: Email-Versand wurde versucht, aber fehlgeschlagen!');
        failedEmailLogs.forEach(log => {
          console.log(`      Fehler: ${log.errorMessage || 'Unbekannter Fehler'}`);
        });
      } else if (successfulEmailLogs.length > 0) {
        console.log('   ✅ Email-Versand war erfolgreich!');
      }
    } else {
      if (!hasEmail) {
        console.log('   ⚠️ Email fehlt - Email-Versand nicht möglich');
      }
      if (!hasPaymentLink) {
        console.log('   ⚠️ Payment-Link fehlt - Email-Versand nicht möglich');
      }
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservation96();

