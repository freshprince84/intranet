import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script: Finde die Parameter des funktionierenden Codes vom 13.11.2025
 * Suche nach Code 7149923045 oder 149923045
 */
async function findWorkingCodeParams() {
  try {
    console.log('🔍 Suche nach funktionierendem Code vom 13.11.2025...\n');
    console.log('   Gesuchte Codes: 7149923045 oder 149923045\n');

    // Suche nach Reservierungen mit diesen Codes
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { doorPin: { contains: '149923045' } },
          { ttlLockPassword: { contains: '149923045' } },
          { doorPin: { contains: '7149923045' } },
          { ttlLockPassword: { contains: '7149923045' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (reservations.length === 0) {
      console.log('❌ Keine Reservierungen mit den gesuchten Codes gefunden');
      console.log('\n📋 Suche nach allen Reservierungen vom 13.11.2025...\n');
      
      // Suche nach Reservierungen vom 13.11.2025
      const dateStart = new Date('2025-11-13T00:00:00.000Z');
      const dateEnd = new Date('2025-11-14T00:00:00.000Z');
      
      const reservationsOnDate = await prisma.reservation.findMany({
        where: {
          createdAt: {
            gte: dateStart,
            lt: dateEnd
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (reservationsOnDate.length > 0) {
        console.log(`✅ ${reservationsOnDate.length} Reservierungen vom 13.11.2025 gefunden:\n`);
        reservationsOnDate.forEach((r, index) => {
          console.log(`${index + 1}. Reservation ID: ${r.id}`);
          console.log(`   Guest: ${r.guestName}`);
          console.log(`   Door PIN: ${r.doorPin || 'null'}`);
          console.log(`   TTLock Password: ${r.ttlLockPassword || 'null'}`);
          console.log(`   Check-in: ${r.checkInDate}`);
          console.log(`   Check-out: ${r.checkOutDate}`);
          console.log(`   Created: ${r.createdAt}`);
          console.log(`   Updated: ${r.updatedAt}`);
          console.log('');
        });
      } else {
        console.log('❌ Keine Reservierungen vom 13.11.2025 gefunden');
      }
    } else {
      console.log(`✅ ${reservations.length} Reservierung(en) mit gesuchten Codes gefunden:\n`);
      reservations.forEach((r, index) => {
        console.log(`${index + 1}. Reservation ID: ${r.id}`);
        console.log(`   Guest: ${r.guestName}`);
        console.log(`   Door PIN: ${r.doorPin || 'null'}`);
        console.log(`   TTLock Password: ${r.ttlLockPassword || 'null'}`);
        console.log(`   Check-in: ${r.checkInDate}`);
        console.log(`   Check-out: ${r.checkOutDate}`);
        console.log(`   Created: ${r.createdAt}`);
        console.log(`   Updated: ${r.updatedAt}`);
        
        // Berechne die Differenz zwischen checkInDate und checkOutDate
        if (r.checkInDate && r.checkOutDate) {
          const diffMs = r.checkOutDate.getTime() - r.checkInDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          console.log(`   ⏱️  Zeitdifferenz: ${diffDays.toFixed(2)} Tage (${diffMs} ms)`);
        }
        
        console.log('');
      });
    }

    // Suche auch nach allen Reservierungen mit PINs, sortiert nach Datum
    console.log('\n📋 Alle Reservierungen mit PINs (sortiert nach Datum):\n');
    const allWithPins = await prisma.reservation.findMany({
      where: {
        OR: [
          { doorPin: { not: null } },
          { ttlLockPassword: { not: null } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        guestName: true,
        doorPin: true,
        ttlLockPassword: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true
      }
    });

    if (allWithPins.length > 0) {
      allWithPins.forEach((r, index) => {
        const pinStr = r.doorPin?.toString() || r.ttlLockPassword?.toString() || '';
        const pinLength = pinStr.length;
        const isMatch = pinStr.includes('149923045') || pinStr.includes('7149923045');
        
        console.log(`${index + 1}. ID: ${r.id}, Created: ${r.createdAt?.toISOString()}`);
        console.log(`   PIN: ${pinStr} (${pinLength} Ziffern)${isMatch ? ' ⭐ MATCH!' : ''}`);
        console.log(`   Check-in: ${r.checkInDate?.toISOString()}`);
        console.log(`   Check-out: ${r.checkOutDate?.toISOString()}`);
        if (r.checkInDate && r.checkOutDate) {
          const diffMs = r.checkOutDate.getTime() - r.checkInDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          console.log(`   Zeitdifferenz: ${diffDays.toFixed(2)} Tage`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

findWorkingCodeParams();

