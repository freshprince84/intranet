#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPatrickTasks() {
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
          where: { lastUsed: true },
          include: { role: { select: { id: true, name: true, organizationId: true } } }
        }
      }
    });
    
    if (!patrick) {
      console.log('Patrick Ammann nicht gefunden');
      return;
    }
    
    console.log('='.repeat(80));
    console.log('PATRICK AMMANN:');
    console.log('='.repeat(80));
    console.log('  User ID:', patrick.id);
    console.log('  Email:', patrick.email);
    console.log('  Name:', patrick.firstName, patrick.lastName);
    console.log('  Aktive Rollen (lastUsed=true):', patrick.roles.length);
    patrick.roles.forEach(ur => {
      console.log('    - Role ID', ur.roleId, ':', ur.role.name, '(Org:', ur.role.organizationId + ')');
    });
    
    // Prüfe welche Rolle ID 15 ist
    const role15 = await prisma.role.findUnique({
      where: { id: 15 },
      select: { id: true, name: true, organizationId: true }
    });
    console.log('\nROLLE ID 15:', role15);
    
    // Prüfe ob Patrick diese Rolle hat
    const patrickHasRole15 = patrick.roles.some(ur => ur.roleId === 15);
    console.log('Patrick hat Rolle 15 (Reception):', patrickHasRole15);
    
    // Prüfe Tasks
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: { gte: new Date('2025-11-24') },
        organizationId: 1
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
    console.log('ERSTELLTE TASKS (erste 5):');
    console.log('='.repeat(80));
    tasks.forEach(t => {
      console.log('  Task ID', t.id, ':', t.title);
      console.log('    roleId:', t.roleId, '| orgId:', t.organizationId, '| branchId:', t.branchId);
      console.log('    responsibleId:', t.responsibleId, '| qualityControlId:', t.qualityControlId);
    });
    
    // Simuliere Filter-Logik aus getAllTasks
    console.log('\n' + '='.repeat(80));
    console.log('FILTER-SIMULATION:');
    console.log('='.repeat(80));
    const userId = patrick.id;
    const organizationId = 1;
    const userRoleId = patrick.roles.find(ur => ur.roleId === 15)?.roleId || null;
    
    console.log('userId:', userId);
    console.log('organizationId:', organizationId);
    console.log('userRoleId:', userRoleId);
    
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
      select: { id: true, title: true, roleId: true },
      take: 5
    });
    
    console.log('\nTasks die durch Filter kommen:', filteredTasks.length);
    filteredTasks.forEach(t => {
      console.log('  Task ID', t.id, ':', t.title, '(roleId:', t.roleId + ')');
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPatrickTasks();

