#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const count = await prisma.reservation.count({
    where: {
      branchId: { in: [3, 4] },
      createdAt: { gte: today }
    }
  });
  
  console.log(`Reservierungen heute für Manila/Parque Poblado: ${count}`);
  
  const latest = await prisma.reservation.findFirst({
    where: { branchId: { in: [3, 4] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, guestName: true, createdAt: true, branchId: true, lobbyReservationId: true }
  });
  
  if (latest) {
    console.log('Letzte Reservierung:', JSON.stringify(latest, null, 2));
  }
  
  await prisma.$disconnect();
}

check();

