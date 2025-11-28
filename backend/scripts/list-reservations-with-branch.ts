import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function listReservationsWithBranch() {
  try {
    const reservations = await prisma.reservation.findMany({
      take: 20,
      orderBy: { id: 'desc' },
      where: {
        branchId: { not: null }
      },
      select: {
        id: true,
        guestName: true,
        branchId: true,
        organizationId: true,
        amount: true,
        currency: true,
        paymentStatus: true
      }
    });

    console.log(`\n📋 Reservierungen mit Branch ID (letzte 20):\n`);
    console.log(JSON.stringify(reservations, null, 2));
    console.log('');

    // Prüfe auch Reservierungen ohne branchId
    const reservationsWithoutBranch = await prisma.reservation.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      where: {
        branchId: null
      },
      select: {
        id: true,
        guestName: true,
        branchId: true,
        organizationId: true,
        amount: true,
        currency: true
      }
    });

    console.log(`\n📋 Reservierungen OHNE Branch ID (letzte 5):\n`);
    console.log(JSON.stringify(reservationsWithoutBranch, null, 2));
    console.log('');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listReservationsWithBranch()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });










