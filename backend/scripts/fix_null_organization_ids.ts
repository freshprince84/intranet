#!/usr/bin/env node
/**
 * Korrigiert Requests und Tasks mit NULL organizationId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Korrigiere Requests und Tasks mit NULL organizationId...\n');
  
  try {
    // 1. Requests mit NULL organizationId prüfen
    console.log('1. REQUESTS MIT NULL organizationId:');
    const requestsNull = await prisma.request.findMany({
      where: { organizationId: null },
      include: {
        requester: {
          include: {
            roles: {
              where: { lastUsed: true },
              include: {
                role: {
                  include: {
                    organization: true
                  }
                }
              }
            }
          }
        },
        branch: true
      }
    });
    
    console.log(`   Gefunden: ${requestsNull.length} Requests`);
    
    let fixedRequests = 0;
    for (const req of requestsNull) {
      // Versuche organizationId aus requester's lastUsed Rolle zu holen
      const lastUsedRole = req.requester.roles.find(ur => ur.lastUsed);
      let orgId = null;
      
      if (lastUsedRole?.role?.organizationId) {
        orgId = lastUsedRole.role.organizationId;
      } else if (req.branch?.organizationId) {
        orgId = req.branch.organizationId;
      } else {
        // Fallback: La Familia Hostel (ID 1)
        orgId = 1;
        console.log(`   ⚠️  Request ${req.id}: Keine Org gefunden, setze auf La Familia Hostel`);
      }
      
      await prisma.request.update({
        where: { id: req.id },
        data: { organizationId: orgId }
      });
      
      fixedRequests++;
      console.log(`   ✓ Request ${req.id}: organizationId = ${orgId}`);
    }
    
    // 2. Tasks mit NULL organizationId prüfen
    console.log('\n2. TASKS MIT NULL organizationId:');
    const tasksNull = await prisma.task.findMany({
      where: { organizationId: null },
      include: {
        responsible: {
          include: {
            roles: {
              where: { lastUsed: true },
              include: {
                role: {
                  include: {
                    organization: true
                  }
                }
              }
            }
          }
        },
        branch: true,
        role: {
          include: {
            organization: true
          }
        }
      }
    });
    
    console.log(`   Gefunden: ${tasksNull.length} Tasks`);
    
    let fixedTasks = 0;
    for (const task of tasksNull) {
      // Versuche organizationId zu finden
      let orgId = null;
      
      // 1. Versuch: Aus Role
      if (task.role?.organizationId) {
        orgId = task.role.organizationId;
      }
      // 2. Versuch: Aus responsible's lastUsed Rolle
      else if (task.responsible) {
        const lastUsedRole = task.responsible.roles.find(ur => ur.lastUsed);
        if (lastUsedRole?.role?.organizationId) {
          orgId = lastUsedRole.role.organizationId;
        }
      }
      // 3. Versuch: Aus Branch
      else if (task.branch?.organizationId) {
        orgId = task.branch.organizationId;
      }
      // Fallback: La Familia Hostel
      else {
        orgId = 1;
        console.log(`   ⚠️  Task ${task.id}: Keine Org gefunden, setze auf La Familia Hostel`);
      }
      
      await prisma.task.update({
        where: { id: task.id },
        data: { organizationId: orgId }
      });
      
      fixedTasks++;
      console.log(`   ✓ Task ${task.id}: organizationId = ${orgId}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Zusammenfassung:');
    console.log(`   Requests korrigiert: ${fixedRequests}`);
    console.log(`   Tasks korrigiert: ${fixedTasks}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

