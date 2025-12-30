#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPatrickRole() {
  try {
    // Finde Patrick Ammann
    const patrick = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'Pat@lafamilia', mode: 'insensitive' } },
          { firstName: { contains: 'Patrick', mode: 'insensitive' } },
          { lastName: { contains: 'Ammann', mode: 'insensitive' } }
        ]
      },
      include: {
        roles: {
          include: { 
            role: { 
              select: { 
                id: true, 
                name: true, 
                organizationId: true 
              } 
            } 
          }
        }
      }
    });
    
    if (!patrick) {
      console.log('Patrick Ammann nicht gefunden');
      return;
    }
    
    console.log('='.repeat(80));
    console.log('PATRICK AMMANN - ROLLEN-ANALYSE:');
    console.log('='.repeat(80));
    console.log('  User ID:', patrick.id);
    console.log('  Email:', patrick.email);
    console.log('  Name:', patrick.firstName, patrick.lastName);
    console.log('\n  ALLE ROLLEN:');
    patrick.roles.forEach(ur => {
      console.log(`    - Role ID ${ur.roleId}: ${ur.role.name} (Org: ${ur.role.organizationId})`);
      console.log(`      lastUsed: ${ur.lastUsed}`);
    });
    
    // Prüfe aktive Rolle (lastUsed: true)
    const activeRole = patrick.roles.find(ur => ur.lastUsed === true);
    if (activeRole) {
      console.log('\n  AKTIVE ROLLE (lastUsed=true):');
      console.log(`    - Role ID ${activeRole.roleId}: ${activeRole.role.name} (Org: ${activeRole.role.organizationId})`);
    } else {
      console.log('\n  ⚠️  KEINE AKTIVE ROLLE GEFUNDEN (lastUsed=true)');
    }
    
    // Prüfe Reception-Rolle (ID 15)
    const receptionRole = patrick.roles.find(ur => ur.roleId === 15);
    if (receptionRole) {
      console.log('\n  RECEPTION-ROLLE (ID 15):');
      console.log(`    - Gefunden: JA`);
      console.log(`    - lastUsed: ${receptionRole.lastUsed}`);
      if (!receptionRole.lastUsed) {
        console.log(`    - ⚠️  PROBLEM: Reception-Rolle ist NICHT als lastUsed=true gesetzt!`);
      }
    } else {
      console.log('\n  RECEPTION-ROLLE (ID 15):');
      console.log(`    - ⚠️  NICHT GEFUNDEN: Patrick hat die Reception-Rolle nicht!`);
    }
    
    // Prüfe Tasks
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: { gte: new Date('2025-11-24') },
        organizationId: 1,
        roleId: 15
      },
      select: {
        id: true,
        title: true,
        roleId: true,
        organizationId: true,
        branchId: true,
        responsibleId: true,
        qualityControlId: true
      },
      take: 5
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('TASKS MIT ROLE ID 15 (Reception):');
    console.log('='.repeat(80));
    console.log('Anzahl:', tasks.length);
    tasks.forEach(t => {
      console.log(`  Task ID ${t.id}: ${t.title}`);
      console.log(`    roleId: ${t.roleId} | orgId: ${t.organizationId} | branchId: ${t.branchId}`);
      console.log(`    responsibleId: ${t.responsibleId} | qualityControlId: ${t.qualityControlId}`);
    });
    
    // Simuliere Filter-Logik
    console.log('\n' + '='.repeat(80));
    console.log('FILTER-SIMULATION:');
    console.log('='.repeat(80));
    const userId = patrick.id;
    const organizationId = 1;
    const userRoleId = activeRole?.roleId || null;
    
    console.log('userId:', userId);
    console.log('organizationId:', organizationId);
    console.log('userRoleId (aus lastUsed=true):', userRoleId);
    console.log('userRoleName:', activeRole?.role.name || 'N/A');
    
    // Filter wie in getAllTasks
    const taskFilter: any = {
      organizationId: organizationId
    };
    
    if (userRoleId) {
      taskFilter.OR = [
        { responsibleId: userId },
        { qualityControlId: userId },
        { roleId: userRoleId }
      ];
    } else {
      taskFilter.OR = [
        { responsibleId: userId },
        { qualityControlId: userId }
      ];
    }
    
    console.log('\nFilter der angewendet wird:');
    console.log(JSON.stringify(taskFilter, null, 2));
    
    // Prüfe ob Tasks durch Filter kommen
    const filteredTasks = await prisma.task.findMany({
      where: taskFilter,
      select: { 
        id: true, 
        title: true, 
        roleId: true,
        responsibleId: true,
        qualityControlId: true
      },
      take: 10
    });
    
    console.log('\nTasks die durch Filter kommen:', filteredTasks.length);
    filteredTasks.forEach(t => {
      console.log(`  Task ID ${t.id}: ${t.title}`);
      console.log(`    roleId: ${t.roleId} | responsibleId: ${t.responsibleId} | qualityControlId: ${t.qualityControlId}`);
      
      // Prüfe warum dieser Task durch den Filter kommt
      const matchesResponsible = t.responsibleId === userId;
      const matchesQualityControl = t.qualityControlId === userId;
      const matchesRole = userRoleId && t.roleId === userRoleId;
      
      console.log(`    Matches: responsibleId=${matchesResponsible}, qualityControlId=${matchesQualityControl}, roleId=${matchesRole}`);
    });
    
    // Prüfe speziell Tasks mit roleId 15
    const receptionTasks = await prisma.task.findMany({
      where: {
        organizationId: 1,
        roleId: 15
      },
      select: { 
        id: true, 
        title: true, 
        roleId: true
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSE: Sollten Reception-Tasks sichtbar sein?');
    console.log('='.repeat(80));
    console.log(`Anzahl Reception-Tasks: ${receptionTasks.length}`);
    console.log(`Patricks aktive Rolle (lastUsed=true): ${activeRole?.role.name || 'KEINE'} (ID: ${userRoleId || 'N/A'})`);
    console.log(`Reception-Rolle ID: 15`);
    
    if (userRoleId === 15) {
      console.log('✅ Reception-Tasks SOLLTEN sichtbar sein (roleId match)');
    } else if (receptionRole && !receptionRole.lastUsed) {
      console.log('⚠️  PROBLEM: Patrick hat Reception-Rolle, aber sie ist NICHT als lastUsed=true gesetzt!');
      console.log('   → userRoleId ist daher nicht 15, sondern:', userRoleId);
      console.log('   → Reception-Tasks werden NICHT angezeigt');
    } else if (!receptionRole) {
      console.log('⚠️  PROBLEM: Patrick hat die Reception-Rolle gar nicht!');
    } else {
      console.log('⚠️  PROBLEM: Patricks aktive Rolle ist nicht Reception (ID 15)');
      console.log('   → Reception-Tasks werden NICHT angezeigt');
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPatrickRole();

