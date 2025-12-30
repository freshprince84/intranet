import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkRecentReservationsWithErrors() {
  try {
    console.log('🔍 Prüfe Reservierungen mit Fehlern...\n');

    // Prüfe alle Reservierungen der letzten 3 Tage
    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: new Date('2025-11-23')
        }
      },
      include: {
        notificationLogs: {
          where: {
            OR: [
              { errorMessage: { contains: 'Bold Payment' } },
              { errorMessage: { contains: '403' } },
              { errorMessage: { contains: 'Forbidden' } },
              { success: false }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    console.log(`📋 Gefundene Reservierungen: ${reservations.length}\n`);

    const reservationsWithErrors = reservations.filter(r => 
      r.notificationLogs.length > 0 || 
      (!r.paymentLink && r.guestPhone)
    );

    console.log(`❌ Reservierungen mit Fehlern: ${reservationsWithErrors.length}\n`);

    for (const res of reservationsWithErrors.slice(0, 20)) {
      console.log('='.repeat(60));
      console.log(`Reservation ID: ${res.id}`);
      console.log(`Gast: ${res.guestName}`);
      console.log(`Telefon: ${res.guestPhone || 'keine'}`);
      console.log(`Email: ${res.guestEmail || 'keine'}`);
      console.log(`Betrag: ${res.amount} ${res.currency}`);
      console.log(`Payment Link: ${res.paymentLink || 'FEHLT!'}`);
      console.log(`Erstellt: ${res.createdAt}`);
      console.log(`Aktualisiert: ${res.updatedAt}`);
      
      if (res.notificationLogs.length > 0) {
        console.log(`\nFehler-Logs (${res.notificationLogs.length}):`);
        for (const log of res.notificationLogs) {
          console.log(`  - ${log.createdAt.toISOString()}: ${log.success ? '✅' : '❌'} ${log.channel}`);
          if (log.errorMessage) {
            console.log(`    Fehler: ${log.errorMessage.substring(0, 200)}`);
          }
        }
      }
      console.log('');
    }

    // Prüfe speziell Reservierungen ohne Payment-Link aber mit Telefonnummer
    const withoutPaymentLink = reservations.filter(r => 
      !r.paymentLink && 
      (r.guestPhone || r.guestEmail) &&
      r.createdAt >= new Date('2025-11-24')
    );

    console.log(`\n⚠️ Reservierungen OHNE Payment-Link (aber mit Kontakt): ${withoutPaymentLink.length}`);
    for (const res of withoutPaymentLink.slice(0, 10)) {
      console.log(`  - ID ${res.id}: ${res.guestName} (${res.guestPhone || res.guestEmail}) - Betrag: ${res.amount} ${res.currency}`);
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentReservationsWithErrors()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

