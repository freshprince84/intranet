/**
 * Script zum Befüllen von organizationId für bestehende Tasks und Requests
 * 
 * Logik:
 * - Task: organizationId aus roleId → role.organizationId ODER qualityControl → dessen aktive Rolle → organizationId
 * - Request: organizationId aus requester → dessen aktive Rolle → organizationId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fillOrganizationIds() {
  try {
    console.log('🚀 Starte Befüllung von organizationId für Tasks und Requests...\n');

    // ========================================
    // 1. TASKS AKTUALISIEREN
    // ========================================
    console.log('📋 Aktualisiere Tasks...');
    
    // Hole alle Tasks ohne organizationId
    const tasksWithoutOrg = await prisma.task.findMany({
      where: {
        organizationId: null
      },
      include: {
        role: {
          select: {
            organizationId: true
          }
        },
        qualityControl: {
          include: {
            roles: {
              where: {
                lastUsed: true
              },
              include: {
                role: {
                  select: {
                    organizationId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`   Gefunden: ${tasksWithoutOrg.length} Tasks ohne organizationId`);

    let tasksUpdated = 0;
    let tasksSkipped = 0;

    for (const task of tasksWithoutOrg) {
      let organizationId: number | null = null;

      // Option 1: organizationId aus roleId
      if (task.roleId && task.role?.organizationId) {
        organizationId = task.role.organizationId;
      }
      // Option 2: organizationId aus qualityControl's aktiver Rolle
      else if (task.qualityControl?.roles && task.qualityControl.roles.length > 0) {
        const activeRole = task.qualityControl.roles[0];
        if (activeRole.role?.organizationId) {
          organizationId = activeRole.role.organizationId;
        }
      }

      if (organizationId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { organizationId }
        });
        tasksUpdated++;
        console.log(`   ✅ Task ${task.id}: organizationId = ${organizationId}`);
      } else {
        tasksSkipped++;
        console.log(`   ⏭️ Task ${task.id}: Konnte organizationId nicht bestimmen`);
      }
    }

    console.log(`\n📊 Tasks: ${tasksUpdated} aktualisiert, ${tasksSkipped} übersprungen\n`);

    // ========================================
    // 2. REQUESTS AKTUALISIEREN
    // ========================================
    console.log('📋 Aktualisiere Requests...');
    
    // Hole alle Requests ohne organizationId
    const requestsWithoutOrg = await prisma.request.findMany({
      where: {
        organizationId: null
      },
      include: {
        requester: {
          include: {
            roles: {
              where: {
                lastUsed: true
              },
              include: {
                role: {
                  select: {
                    organizationId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`   Gefunden: ${requestsWithoutOrg.length} Requests ohne organizationId`);

    let requestsUpdated = 0;
    let requestsSkipped = 0;

    for (const request of requestsWithoutOrg) {
      let organizationId: number | null = null;

      // organizationId aus requester's aktiver Rolle
      if (request.requester?.roles && request.requester.roles.length > 0) {
        const activeRole = request.requester.roles[0];
        if (activeRole.role?.organizationId) {
          organizationId = activeRole.role.organizationId;
        }
      }

      if (organizationId) {
        await prisma.request.update({
          where: { id: request.id },
          data: { organizationId }
        });
        requestsUpdated++;
        console.log(`   ✅ Request ${request.id}: organizationId = ${organizationId}`);
      } else {
        requestsSkipped++;
        console.log(`   ⏭️ Request ${request.id}: Konnte organizationId nicht bestimmen`);
      }
    }

    console.log(`\n📊 Requests: ${requestsUpdated} aktualisiert, ${requestsSkipped} übersprungen\n`);

    // ========================================
    // 3. WORKTIMES AKTUALISIEREN
    // ========================================
    console.log('📋 Aktualisiere WorkTimes...');
    
    const workTimesWithoutOrg = await prisma.workTime.findMany({
      where: {
        organizationId: null
      },
      include: {
        user: {
          include: {
            roles: {
              where: {
                lastUsed: true
              },
              include: {
                role: {
                  select: {
                    organizationId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`   Gefunden: ${workTimesWithoutOrg.length} WorkTimes ohne organizationId`);

    let workTimesUpdated = 0;
    let workTimesSkipped = 0;

    for (const workTime of workTimesWithoutOrg) {
      let organizationId: number | null = null;

      if (workTime.user?.roles && workTime.user.roles.length > 0) {
        const activeRole = workTime.user.roles[0];
        if (activeRole.role?.organizationId) {
          organizationId = activeRole.role.organizationId;
        }
      }

      if (organizationId) {
        await prisma.workTime.update({
          where: { id: workTime.id },
          data: { organizationId }
        });
        workTimesUpdated++;
        console.log(`   ✅ WorkTime ${workTime.id}: organizationId = ${organizationId}`);
      } else {
        workTimesSkipped++;
        console.log(`   ⏭️ WorkTime ${workTime.id}: Konnte organizationId nicht bestimmen`);
      }
    }

    console.log(`\n📊 WorkTimes: ${workTimesUpdated} aktualisiert, ${workTimesSkipped} übersprungen\n`);

    // ========================================
    // 4. CLIENTS AKTUALISIEREN
    // ========================================
    console.log('📋 Aktualisiere Clients...');
    
    const clientsWithoutOrg = await prisma.client.findMany({
      where: {
        organizationId: null
      },
      include: {
        workTimes: {
          include: {
            user: {
              include: {
                roles: {
                  where: {
                    lastUsed: true
                  },
                  include: {
                    role: {
                      select: {
                        organizationId: true
                      }
                    }
                  }
                }
              }
            }
          },
          take: 1
        }
      }
    });

    console.log(`   Gefunden: ${clientsWithoutOrg.length} Clients ohne organizationId`);

    let clientsUpdated = 0;
    let clientsSkipped = 0;

    for (const client of clientsWithoutOrg) {
      let organizationId: number | null = null;

      // Versuche organizationId aus erster WorkTime des Clients zu bekommen
      if (client.workTimes && client.workTimes.length > 0) {
        const workTime = client.workTimes[0];
        if (workTime.user?.roles && workTime.user.roles.length > 0) {
          const activeRole = workTime.user.roles[0];
          if (activeRole.role?.organizationId) {
            organizationId = activeRole.role.organizationId;
          }
        }
      }

      if (organizationId) {
        await prisma.client.update({
          where: { id: client.id },
          data: { organizationId }
        });
        clientsUpdated++;
        console.log(`   ✅ Client ${client.id}: organizationId = ${organizationId}`);
      } else {
        clientsSkipped++;
        console.log(`   ⏭️ Client ${client.id}: Konnte organizationId nicht bestimmen`);
      }
    }

    console.log(`\n📊 Clients: ${clientsUpdated} aktualisiert, ${clientsSkipped} übersprungen\n`);

    console.log('✅ Befüllung abgeschlossen!');
    console.log('\n📋 Zusammenfassung:');
    console.log(`   - Tasks: ${tasksUpdated} aktualisiert, ${tasksSkipped} übersprungen`);
    console.log(`   - Requests: ${requestsUpdated} aktualisiert, ${requestsSkipped} übersprungen`);
    console.log(`   - WorkTimes: ${workTimesUpdated} aktualisiert, ${workTimesSkipped} übersprungen`);
    console.log(`   - Clients: ${clientsUpdated} aktualisiert, ${clientsSkipped} übersprungen`);

  } catch (error) {
    console.error('❌ Fehler beim Befüllen von organizationId:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fillOrganizationIds()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

