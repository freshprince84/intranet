#!/usr/bin/env node
/**
 * Korrigiert Requests und Tasks - setzt sie auf Org 1 wenn User Rollen in Org 1 haben
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Korrigiere Requests und Tasks für La Familia Hostel...\n');
  
  try {
    // 1. Requests korrigieren - setze auf Org 1 wenn requester Rollen in Org 1 hat
    console.log('1. REQUESTS KORRIGIEREN:');
    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: 3 } // Standard-Organisation
        ]
      },
      include: {
        requester: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });
    
    let fixedRequests = 0;
    for (const req of requests) {
      // Prüfe ob requester Rollen in Org 1 hat
      const hasOrg1Role = req.requester.roles.some(ur => ur.role.organizationId === 1);
      
      if (hasOrg1Role) {
        await prisma.request.update({
          where: { id: req.id },
          data: { organizationId: 1 }
        });
        fixedRequests++;
        console.log(`   ✓ Request ${req.id}: organizationId = 1 (User hat Rollen in Org 1)`);
      }
    }
    
    // 2. Tasks korrigieren - setze auf Org 1 wenn responsible oder qualityControl Rollen in Org 1 hat
    console.log('\n2. TASKS KORRIGIEREN:');
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: 3 } // Standard-Organisation
        ]
      },
      include: {
        responsible: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        },
        qualityControl: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        },
        role: {
          include: {
            organization: true
          }
        }
      }
    });
    
    let fixedTasks = 0;
    for (const task of tasks) {
      // Prüfe verschiedene Möglichkeiten
      let shouldBeOrg1 = false;
      
      // 1. Task-Role ist in Org 1
      if (task.role?.organizationId === 1) {
        shouldBeOrg1 = true;
      }
      // 2. Responsible hat Rollen in Org 1
      else if (task.responsible && task.responsible.roles.some(ur => ur.role.organizationId === 1)) {
        shouldBeOrg1 = true;
      }
      // 3. QualityControl hat Rollen in Org 1
      else if (task.qualityControl && task.qualityControl.roles.some(ur => ur.role.organizationId === 1)) {
        shouldBeOrg1 = true;
      }
      
      if (shouldBeOrg1) {
        await prisma.task.update({
          where: { id: task.id },
          data: { organizationId: 1 }
        });
        fixedTasks++;
        console.log(`   ✓ Task ${task.id}: organizationId = 1`);
      }
    }
    
    // 3. Finale Statistik
    console.log('\n' + '='.repeat(60));
    console.log('✅ Zusammenfassung:');
    console.log(`   Requests korrigiert: ${fixedRequests}`);
    console.log(`   Tasks korrigiert: ${fixedTasks}`);
    
    const finalStats = {
      requestsOrg1: await prisma.request.count({ where: { organizationId: 1 } }),
      requestsOrg3: await prisma.request.count({ where: { organizationId: 3 } }),
      requestsNull: await prisma.request.count({ where: { organizationId: null } }),
      tasksOrg1: await prisma.task.count({ where: { organizationId: 1 } }),
      tasksOrg3: await prisma.task.count({ where: { organizationId: 3 } }),
      tasksNull: await prisma.task.count({ where: { organizationId: null } })
    };
    
    console.log('\nFinale Statistik:');
    console.log(`   Requests Org 1: ${finalStats.requestsOrg1}`);
    console.log(`   Requests Org 3: ${finalStats.requestsOrg3}`);
    console.log(`   Requests NULL: ${finalStats.requestsNull}`);
    console.log(`   Tasks Org 1: ${finalStats.tasksOrg1}`);
    console.log(`   Tasks Org 3: ${finalStats.tasksOrg3}`);
    console.log(`   Tasks NULL: ${finalStats.tasksNull}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

