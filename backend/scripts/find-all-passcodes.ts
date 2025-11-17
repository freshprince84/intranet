import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllPasscodes() {
  try {
    console.log('🔍 Suche nach allen Reservierungen mit PINs...\n');

    // Suche alle Reservierungen mit PINs
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { doorPin: { not: null } },
          { ttlLockPassword: { not: null } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        guestName: true,
        doorPin: true,
        ttlLockPassword: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (reservations.length === 0) {
      console.log('❌ Keine Reservierungen mit PINs gefunden');
      return;
    }

    console.log(`✅ ${reservations.length} Reservierungen mit PINs gefunden:\n`);

    reservations.forEach((r, index) => {
      console.log(`${index + 1}. Reservation ID: ${r.id}`);
      console.log(`   Guest: ${r.guestName}`);
      console.log(`   Door PIN: ${r.doorPin || 'null'}`);
      console.log(`   TTLock Password: ${r.ttlLockPassword || 'null'}`);
      console.log(`   Check-in: ${r.checkInDate}`);
      console.log(`   Check-out: ${r.checkOutDate}`);
      console.log(`   Created: ${r.createdAt}`);
      console.log(`   Updated: ${r.updatedAt}`);
      
      // Prüfe ob Code 149923045 oder 7149923045 enthalten ist
      const pinStr = r.doorPin?.toString() || r.ttlLockPassword?.toString() || '';
      if (pinStr.includes('149923045') || pinStr.includes('7149923045')) {
        console.log(`   ⭐ MATCH! Dieser Code enthält den gesuchten Code!`);
      }
      console.log('');
    });

    // Suche speziell nach Codes die 149923045 oder 7149923045 enthalten
    console.log('\n🔍 Spezielle Suche nach Codes 149923045 oder 7149923045...\n');
    
    const matchingReservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { doorPin: { contains: '149923045' } },
          { ttlLockPassword: { contains: '149923045' } },
          { doorPin: { contains: '7149923045' } },
          { ttlLockPassword: { contains: '7149923045' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (matchingReservations.length > 0) {
      console.log(`✅ ${matchingReservations.length} Reservierungen mit gesuchten Codes gefunden:\n`);
      matchingReservations.forEach(r => {
        console.log(`   ID: ${r.id}, Guest: ${r.guestName}`);
        console.log(`   Door PIN: ${r.doorPin}`);
        console.log(`   TTLock Password: ${r.ttlLockPassword}`);
        console.log(`   Created: ${r.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ Keine Reservierungen mit Codes 149923045 oder 7149923045 gefunden');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAllPasscodes();

