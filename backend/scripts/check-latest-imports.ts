import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestImports() {
  try {
    // Hole letzte 10 Reservierungen für Manila (Branch 3)
    const manila = await prisma.reservation.findMany({
      where: { branchId: 3 },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        guestName: true,
        createdAt: true,
        lobbyReservationId: true
      }
    });

    // Hole letzte 10 Reservierungen für Parque Poblado (Branch 4)
    const poblado = await prisma.reservation.findMany({
      where: { branchId: 4 },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        guestName: true,
        createdAt: true,
        lobbyReservationId: true
      }
    });

    console.log('\n=== Manila (Branch 3) - Letzte 10 Reservierungen ===');
    manila.forEach((r, i) => {
      const timeAgo = Math.round((Date.now() - r.createdAt.getTime()) / 1000 / 60);
      console.log(`${i + 1}. ${r.createdAt.toISOString()} (vor ${timeAgo} Min) - ${r.guestName} (Lobby ID: ${r.lobbyReservationId})`);
    });

    console.log('\n=== Parque Poblado (Branch 4) - Letzte 10 Reservierungen ===');
    poblado.forEach((r, i) => {
      const timeAgo = Math.round((Date.now() - r.createdAt.getTime()) / 1000 / 60);
      console.log(`${i + 1}. ${r.createdAt.toISOString()} (vor ${timeAgo} Min) - ${r.guestName} (Lobby ID: ${r.lobbyReservationId})`);
    });

    // Prüfe letzte Stunde
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const manilaLastHour = await prisma.reservation.count({
      where: {
        branchId: 3,
        createdAt: { gte: oneHourAgo }
      }
    });
    const pobladoLastHour = await prisma.reservation.count({
      where: {
        branchId: 4,
        createdAt: { gte: oneHourAgo }
      }
    });

    console.log('\n=== Letzte Stunde ===');
    console.log(`Manila (Branch 3): ${manilaLastHour} Reservierungen`);
    console.log(`Parque Poblado (Branch 4): ${pobladoLastHour} Reservierungen`);

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestImports();

