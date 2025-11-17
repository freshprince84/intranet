import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findPasscodeParams() {
  try {
    console.log('🔍 Suche nach Code 149923045...\n');

    // Suche Reservation mit diesem Code
    const reservation = await prisma.reservation.findFirst({
      where: {
        OR: [
          { doorPin: { contains: '149923045' } },
          { ttlLockPassword: { contains: '149923045' } }
        ]
      },
      orderBy: { id: 'desc' }
    });

    if (reservation) {
      console.log('✅ Reservation gefunden:');
      console.log(`   ID: ${reservation.id}`);
      console.log(`   Guest: ${reservation.guestName}`);
      console.log(`   Check-in: ${reservation.checkInDate}`);
      console.log(`   Check-out: ${reservation.checkOutDate}`);
      console.log(`   Door PIN: ${reservation.doorPin}`);
      console.log(`   TTLock Password: ${reservation.ttlLockPassword}`);
      console.log(`   Created: ${reservation.createdAt}`);
    } else {
      console.log('❌ Keine Reservation mit Code 149923045 gefunden');
    }

    // Suche auch nach ähnlichen Codes
    const similarCodes = await prisma.reservation.findMany({
      where: {
        OR: [
          { doorPin: { contains: '1499230' } },
          { ttlLockPassword: { contains: '1499230' } }
        ]
      },
      orderBy: { id: 'desc' },
      take: 10
    });

    if (similarCodes.length > 0) {
      console.log(`\n📋 Ähnliche Codes gefunden (${similarCodes.length}):`);
      similarCodes.forEach(r => {
        console.log(`   ID: ${r.id}, PIN: ${r.doorPin}, Created: ${r.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPasscodeParams();

