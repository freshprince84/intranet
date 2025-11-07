#!/usr/bin/env node
/**
 * Datenbank-Prüfskript
 * Prüft Organisationen, Rollen, User, Requests und Tasks
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Datenbank-Prüfung...\n');
  
  try {
    // 1. Organisationen prüfen
    console.log('='.repeat(60));
    console.log('1. ORGANISATIONEN:');
    console.log('='.repeat(60));
    const orgs = await prisma.organization.findMany({
      orderBy: { id: 'asc' }
    });
    
    for (const org of orgs) {
      const requestCount = await prisma.request.count({ where: { organizationId: org.id } });
      const taskCount = await prisma.task.count({ where: { organizationId: org.id } });
      const roleCount = await prisma.role.count({ where: { organizationId: org.id } });
      
      console.log(`\nID: ${org.id}`);
      console.log(`  Name: ${org.name}`);
      console.log(`  Display: ${org.displayName}`);
      console.log(`  Requests: ${requestCount}`);
      console.log(`  Tasks: ${taskCount}`);
      console.log(`  Roles: ${roleCount}`);
    }
    
    // 2. Rollen prüfen (besonders Admin-Rollen)
    console.log('\n' + '='.repeat(60));
    console.log('2. ROLLEN (Admin-Rollen):');
    console.log('='.repeat(60));
    const adminRoles = await prisma.role.findMany({
      where: {
        name: 'Admin'
      },
      orderBy: { id: 'asc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        _count: {
          select: {
            users: true,
            permissions: true
          }
        }
      }
    });
    
    for (const role of adminRoles) {
      console.log(`\nID: ${role.id}`);
      console.log(`  Name: ${role.name}`);
      console.log(`  Organization: ${role.organizationId ? `ID ${role.organizationId} (${role.organization?.name || 'N/A'})` : 'NULL (global)'}`);
      console.log(`  Description: ${role.description || 'N/A'}`);
      console.log(`  Users: ${role._count.users}`);
      console.log(`  Permissions: ${role._count.permissions}`);
    }
    
    // 3. La Familia Hostel speziell prüfen
    console.log('\n' + '='.repeat(60));
    console.log('3. LA FAMILIA HOSTEL (ID 1) DETAILS:');
    console.log('='.repeat(60));
    const laFamilia = await prisma.organization.findUnique({
      where: { id: 1 },
      include: {
        requests: {
          take: 5,
          orderBy: { id: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        },
        tasks: {
          take: 5,
          orderBy: { id: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        },
        roles: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
    
    if (laFamilia) {
      console.log(`\nName: ${laFamilia.name}`);
      console.log(`Display: ${laFamilia.displayName}`);
      console.log(`\nRequests (gesamt): ${await prisma.request.count({ where: { organizationId: 1 } })}`);
      console.log(`Tasks (gesamt): ${await prisma.task.count({ where: { organizationId: 1 } })}`);
      console.log(`\nLetzte 5 Requests:`);
      laFamilia.requests.forEach(req => {
        console.log(`  - ID ${req.id}: ${req.title} (${req.status})`);
      });
      console.log(`\nLetzte 5 Tasks:`);
      laFamilia.tasks.forEach(task => {
        console.log(`  - ID ${task.id}: ${task.title} (${task.status})`);
      });
      console.log(`\nRollen:`);
      laFamilia.roles.forEach(role => {
        console.log(`  - ID ${role.id}: ${role.name}`);
      });
    } else {
      console.log('❌ La Familia Hostel (ID 1) nicht gefunden!');
    }
    
    // 4. User mit Organisationen prüfen
    console.log('\n' + '='.repeat(60));
    console.log('4. USER MIT ROLEN (erste 10):');
    console.log('='.repeat(60));
    const users = await prisma.user.findMany({
      take: 10,
      include: {
        roles: {
          include: {
            role: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    for (const user of users) {
      console.log(`\nUser: ${user.username} (ID: ${user.id})`);
      console.log(`  Rollen:`);
      user.roles.forEach(ur => {
        const orgInfo = ur.role.organizationId 
          ? `Org ${ur.role.organizationId} (${ur.role.organization?.name || 'N/A'})`
          : 'Global (keine Org)';
        console.log(`    - ${ur.role.name} (${orgInfo})`);
      });
    }
    
    // 5. Requests/Tasks nach Organisation prüfen
    console.log('\n' + '='.repeat(60));
    console.log('5. REQUESTS/TASKS NACH ORGANISATION:');
    console.log('='.repeat(60));
    const requestsByOrg = await prisma.request.groupBy({
      by: ['organizationId'],
      _count: {
        id: true
      }
    });
    
    console.log('\nRequests:');
    for (const group of requestsByOrg) {
      const orgName = group.organizationId 
        ? (await prisma.organization.findUnique({ where: { id: group.organizationId }, select: { name: true } }))?.name || 'N/A'
        : 'NULL';
      console.log(`  Org ${group.organizationId || 'NULL'} (${orgName}): ${group._count.id} Requests`);
    }
    
    const tasksByOrg = await prisma.task.groupBy({
      by: ['organizationId'],
      _count: {
        id: true
      }
    });
    
    console.log('\nTasks:');
    for (const group of tasksByOrg) {
      const orgName = group.organizationId 
        ? (await prisma.organization.findUnique({ where: { id: group.organizationId }, select: { name: true } }))?.name || 'N/A'
        : 'NULL';
      console.log(`  Org ${group.organizationId || 'NULL'} (${orgName}): ${group._count.id} Tasks`);
    }
    
    // 6. Standard-Organisation prüfen
    console.log('\n' + '='.repeat(60));
    console.log('6. STANDARD-ORGANISATION:');
    console.log('='.repeat(60));
    const defaultOrg = await prisma.organization.findUnique({
      where: { name: 'default' },
      include: {
        _count: {
          select: {
            requests: true,
            tasks: true,
            roles: true
          }
        },
        roles: {
          where: { name: 'Admin' },
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (defaultOrg) {
      console.log(`\nID: ${defaultOrg.id}`);
      console.log(`Name: ${defaultOrg.name}`);
      console.log(`Display: ${defaultOrg.displayName}`);
      console.log(`Requests: ${defaultOrg._count.requests}`);
      console.log(`Tasks: ${defaultOrg._count.tasks}`);
      console.log(`Roles: ${defaultOrg._count.roles}`);
      console.log(`Admin-Rollen: ${defaultOrg.roles.length}`);
      defaultOrg.roles.forEach(role => {
        console.log(`  - ID ${role.id}: ${role.name}`);
      });
    } else {
      console.log('❌ Standard-Organisation nicht gefunden');
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

