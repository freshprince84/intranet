import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkLatestReservationPin() {
  try {
    const latest = await prisma.reservation.findFirst({
      where: { organizationId: 1 },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        guestName: true,
        doorPin: true,
        doorAppName: true,
        paymentStatus: true,
        sentMessage: true,
        sentMessageAt: true,
        checkInDate: true,
        checkOutDate: true
      }
    });

    if (!latest) {
      console.log('❌ Keine Reservation gefunden');
      return;
    }

    console.log('📋 Neueste Reservation:');
    console.log(JSON.stringify(latest, null, 2));
    console.log('\n');
    console.log(`ID: ${latest.id}`);
    console.log(`Gast: ${latest.guestName}`);
    console.log(`Payment Status: ${latest.paymentStatus}`);
    console.log(`doorPin: ${latest.doorPin || 'NULL'}`);
    console.log(`doorAppName: ${latest.doorAppName || 'NULL'}`);
    console.log(`sentMessage vorhanden: ${!!latest.sentMessage}`);
    console.log(`sentMessageAt: ${latest.sentMessageAt || 'NULL'}`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestReservationPin()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

