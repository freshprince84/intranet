#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWhyTasksNotVisible() {
  try {
    const userId = 16; // Patrick
    const organizationId = 1;
    const userRoleId = 15; // Reception
    
    // Filter wie in getAllTasks (EXAKT)
    const taskFilter: any = {
      organizationId: organizationId,
      OR: [
        { responsibleId: userId },
        { qualityControlId: userId },
        { roleId: userRoleId }
      ]
    };
    
    console.log('='.repeat(80));
    console.log('WARUM SIND CHECK-IN TASKS NICHT SICHTBAR?');
    console.log('='.repeat(80));
    
    // Simuliere EXAKT die Query aus getAllTasks (OHNE orderBy, MIT limit 50)
    const tasks = await prisma.task.findMany({
      where: taskFilter,
      take: 50, // Standard-Limit wie in getAllTasks
      include: {
        responsible: {
          select: { id: true, firstName: true, lastName: true }
        },
        role: {
          select: { id: true, name: true }
        },
        qualityControl: {
          select: { id: true, firstName: true, lastName: true }
        },
        branch: {
          select: { id: true, name: true }
        }
      }
      // KEIN orderBy - genau wie im Controller!
    });
    
    console.log(`\nAnzahl Tasks zurückgegeben: ${tasks.length}`);
    
    // Prüfe ob Tasks 807-811 dabei sind
    const taskIds = tasks.map(t => t.id);
    const checkInTasks = [807, 808, 809, 810, 811];
    const foundCheckInTasks = checkInTasks.filter(id => taskIds.includes(id));
    const missingCheckInTasks = checkInTasks.filter(id => !taskIds.includes(id));
    
    console.log(`\nCheck-in Tasks (807-811) in Ergebnis:`);
    console.log(`  Gefunden: ${foundCheckInTasks.length}/5`);
    if (foundCheckInTasks.length > 0) {
      console.log(`  ✅ ${foundCheckInTasks.join(', ')}`);
    }
    if (missingCheckInTasks.length > 0) {
      console.log(`  ❌ FEHLEND: ${missingCheckInTasks.join(', ')}`);
    }
    
    // Zeige alle Tasks die zurückgegeben werden
    console.log(`\n` + '='.repeat(80));
    console.log('ALLE TASKS DIE ZURÜCKGEGEBEN WERDEN (erste 50, keine Sortierung):');
    console.log('='.repeat(80));
    tasks.forEach((t, index) => {
      const isCheckIn = checkInTasks.includes(t.id);
      const marker = isCheckIn ? '⭐ CHECK-IN' : '  ';
      console.log(`${marker} ${index + 1}. Task ID ${t.id}: ${t.title}`);
      console.log(`     roleId: ${t.roleId} (${t.role?.name || 'N/A'}) | createdAt: ${t.createdAt}`);
    });
    
    // Prüfe wie viele Tasks insgesamt durch Filter kommen
    const totalCount = await prisma.task.count({
      where: taskFilter
    });
    
    console.log(`\n` + '='.repeat(80));
    console.log('ANALYSE:');
    console.log('='.repeat(80));
    console.log(`Gesamtanzahl Tasks durch Filter: ${totalCount}`);
    console.log(`Limit in Query: 50`);
    console.log(`Zurückgegeben: ${tasks.length}`);
    
    if (totalCount > 50) {
      console.log(`\n⚠️  PROBLEM: Es gibt ${totalCount} Tasks, aber nur 50 werden zurückgegeben!`);
      console.log(`   Die Check-in Tasks könnten außerhalb der ersten 50 sein.`);
    }
    
    // Prüfe Position der Check-in Tasks wenn nach createdAt sortiert
    console.log(`\n` + '='.repeat(80));
    console.log('SORTIERUNG TEST:');
    console.log('='.repeat(80));
    
    // Test 1: Nach createdAt DESC (neueste zuerst)
    const tasksDesc = await prisma.task.findMany({
      where: taskFilter,
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true }
    });
    
    const checkInInDesc = checkInTasks.filter(id => tasksDesc.map(t => t.id).includes(id));
    console.log(`Nach createdAt DESC: Check-in Tasks in ersten 50: ${checkInInDesc.length}/5`);
    if (checkInInDesc.length > 0) {
      tasksDesc.forEach((t, index) => {
        if (checkInTasks.includes(t.id)) {
          console.log(`  ⭐ Position ${index + 1}: Task ${t.id} (${t.createdAt})`);
        }
      });
    }
    
    // Test 2: Nach createdAt ASC (älteste zuerst)
    const tasksAsc = await prisma.task.findMany({
      where: taskFilter,
      take: 50,
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, createdAt: true }
    });
    
    const checkInInAsc = checkInTasks.filter(id => tasksAsc.map(t => t.id).includes(id));
    console.log(`Nach createdAt ASC: Check-in Tasks in ersten 50: ${checkInInAsc.length}/5`);
    
    // Test 3: Nach ID DESC (höchste ID zuerst)
    const tasksIdDesc = await prisma.task.findMany({
      where: taskFilter,
      take: 50,
      orderBy: { id: 'desc' },
      select: { id: true, title: true, createdAt: true }
    });
    
    const checkInInIdDesc = checkInTasks.filter(id => tasksIdDesc.map(t => t.id).includes(id));
    console.log(`Nach ID DESC: Check-in Tasks in ersten 50: ${checkInInIdDesc.length}/5`);
    if (checkInInIdDesc.length > 0) {
      tasksIdDesc.forEach((t, index) => {
        if (checkInTasks.includes(t.id)) {
          console.log(`  ⭐ Position ${index + 1}: Task ${t.id}`);
        }
      });
    }
    
    // Prüfe die Check-in Tasks Details
    console.log(`\n` + '='.repeat(80));
    console.log('CHECK-IN TASKS DETAILS:');
    console.log('='.repeat(80));
    const checkInTasksDetails = await prisma.task.findMany({
      where: {
        id: { in: checkInTasks }
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        organizationId: true,
        roleId: true,
        responsibleId: true,
        qualityControlId: true
      },
      orderBy: { id: 'asc' }
    });
    
    checkInTasksDetails.forEach(t => {
      console.log(`\nTask ${t.id}: ${t.title}`);
      console.log(`  createdAt: ${t.createdAt}`);
      console.log(`  organizationId: ${t.organizationId}`);
      console.log(`  roleId: ${t.roleId}`);
      console.log(`  responsibleId: ${t.responsibleId}`);
      console.log(`  qualityControlId: ${t.qualityControlId}`);
      
      // Prüfe ob Task durch Filter kommt
      const matchesOrg = t.organizationId === organizationId;
      const matchesResponsible = t.responsibleId === userId;
      const matchesQualityControl = t.qualityControlId === userId;
      const matchesRole = t.roleId === userRoleId;
      const shouldMatch = matchesOrg && (matchesResponsible || matchesQualityControl || matchesRole);
      
      console.log(`  → Sollte durch Filter kommen: ${shouldMatch ? '✅ JA' : '❌ NEIN'}`);
    });
    
    // Prüfe welche Tasks VOR den Check-in Tasks kommen (wenn nach ID sortiert)
    console.log(`\n` + '='.repeat(80));
    console.log('WELCHE TASKS KOMMEN VOR DEN CHECK-IN TASKS?');
    console.log('='.repeat(80));
    
    const minCheckInId = Math.min(...checkInTasks);
    const tasksBeforeCheckIn = await prisma.task.findMany({
      where: {
        ...taskFilter,
        id: { gt: minCheckInId - 100, lt: minCheckInId } // Tasks kurz vor den Check-in Tasks
      },
      select: { id: true, title: true, createdAt: true },
      orderBy: { id: 'desc' },
      take: 20
    });
    
    console.log(`Tasks mit ID < ${minCheckInId} (die vor Check-in Tasks kommen könnten):`);
    tasksBeforeCheckIn.forEach(t => {
      console.log(`  Task ${t.id}: ${t.title} (createdAt: ${t.createdAt})`);
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhyTasksNotVisible();

