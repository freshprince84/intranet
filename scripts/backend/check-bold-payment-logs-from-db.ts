import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkBoldPaymentLogsFromDB() {
  try {
    console.log('🔍 Prüfe Bold Payment Logs aus Datenbank...\n');

    // 1. Prüfe ReservationNotificationLogs mit Bold Payment Fehlern
    const errorLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        OR: [
          { errorMessage: { contains: 'Bold Payment' } },
          { errorMessage: { contains: 'Payment-Link' } },
          { errorMessage: { contains: '403' } },
          { errorMessage: { contains: 'Forbidden' } }
        ],
        createdAt: {
          gte: new Date('2025-11-24'),
          lte: new Date('2025-11-26')
        }
      },
      include: {
        reservation: {
          select: {
            id: true,
            guestName: true,
            amount: true,
            currency: true,
            paymentLink: true,
            branchId: true,
            organizationId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    console.log(`📋 Gefundene Fehler-Logs: ${errorLogs.length}\n`);

    for (const log of errorLogs) {
      console.log('='.repeat(60));
      console.log(`Reservation: ${log.reservation?.guestName} (ID: ${log.reservationId})`);
      console.log(`Datum: ${log.createdAt}`);
      console.log(`Erfolg: ${log.success}`);
      console.log(`Kanal: ${log.channel}`);
      console.log(`Betrag: ${log.reservation?.amount} ${log.reservation?.currency}`);
      console.log(`Payment Link vorhanden: ${!!log.reservation?.paymentLink}`);
      if (log.errorMessage) {
        console.log(`\nFehlermeldung:`);
        console.log(log.errorMessage);
      }
      if (log.paymentLink) {
        console.log(`Payment Link: ${log.paymentLink}`);
      }
      console.log('');
    }

    // 2. Prüfe erfolgreiche Payment-Link-Erstellungen
    const successLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        success: true,
        paymentLink: { not: null },
        createdAt: {
          gte: new Date('2025-11-24'),
          lte: new Date('2025-11-26')
        }
      },
      include: {
        reservation: {
          select: {
            id: true,
            guestName: true,
            amount: true,
            currency: true,
            paymentLink: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`\n✅ Erfolgreiche Payment-Links: ${successLogs.length}\n`);
    
    for (const log of successLogs.slice(0, 5)) {
      console.log(`- ${log.reservation?.guestName} (${log.createdAt.toISOString()}): ${log.paymentLink}`);
    }

    // 3. Prüfe Reservierungen mit Payment-Links von gestern vs. heute
    const yesterday = new Date('2025-11-24');
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date('2025-11-25');
    today.setHours(23, 59, 59, 999);

    const yesterdayReservations = await prisma.reservation.count({
      where: {
        paymentLink: { not: null },
        updatedAt: {
          gte: yesterday,
          lt: new Date('2025-11-25')
        }
      }
    });

    const todayReservations = await prisma.reservation.count({
      where: {
        paymentLink: { not: null },
        updatedAt: {
          gte: new Date('2025-11-25'),
          lte: today
        }
      }
    });

    console.log(`\n📊 Statistiken:`);
    console.log(`   Gestern (24.11): ${yesterdayReservations} Reservierungen mit Payment-Link`);
    console.log(`   Heute (25.11): ${todayReservations} Reservierungen mit Payment-Link`);

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkBoldPaymentLogsFromDB()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

