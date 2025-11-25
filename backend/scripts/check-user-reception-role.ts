#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserReceptionRole() {
  try {
    // Prüfe welche User die Reception-Rolle haben UND lastUsed = true
    const usersWithReception = await prisma.userRole.findMany({
      where: {
        roleId: 15,
        lastUsed: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    console.log('USER MIT RECEPTION-ROLLE (lastUsed=true):', usersWithReception.length);
    usersWithReception.forEach(ur => {
      console.log(`  User ID ${ur.userId}: ${ur.user.firstName} ${ur.user.lastName} (${ur.user.email})`);
    });
    
    // Prüfe auch User mit Reception-Rolle aber lastUsed = false
    const usersWithReceptionInactive = await prisma.userRole.findMany({
      where: {
        roleId: 15,
        lastUsed: false
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
    
    console.log(`\nUSER MIT RECEPTION-ROLLE (lastUsed=false): ${usersWithReceptionInactive.length}`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserReceptionRole();

