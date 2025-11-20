#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const branches = await prisma.branch.findMany({
    where: { organizationId: 1 },
    select: { 
      id: true, 
      name: true, 
      organizationId: true, 
      lobbyPmsSettings: true 
    }
  });
  
  console.log('Branches in Organisation 1:\n');
  for (const b of branches) {
    const hasSettings = !!b.lobbyPmsSettings;
    console.log(`Branch ${b.id} (${b.name}): ${hasSettings ? '✅ HAT Settings' : '❌ KEINE Settings'}`);
  }
  
  await prisma.$disconnect();
}

check();

