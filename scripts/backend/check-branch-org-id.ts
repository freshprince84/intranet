#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const branches = await prisma.branch.findMany({
    where: { id: { in: [3, 4] } },
    select: { id: true, name: true, organizationId: true }
  });
  
  for (const b of branches) {
    console.log(`${b.name} (ID: ${b.id}): organizationId = ${b.organizationId}`);
  }
  
  await prisma.$disconnect();
}

check();

