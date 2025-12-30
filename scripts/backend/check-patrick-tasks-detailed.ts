#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPatrickTasksDetailed() {
  try {
    const userId = 16; // Patrick
    const organizationId = 1;
    const userRoleId = 15; // Reception
    
    // Filter wie in getAllTasks
    const taskFilter: any = {
      organizationId: organizationId,
      OR: [
        { responsibleId: userId },
        { qualityControlId: userId },
        { roleId: userRoleId }
      ]
    };
    
    console.log('='.repeat(80));
    console.log('DETAILLIERTE TASK-ANALYSE FÜR PATRICK:');
    console.log('='.repeat(80));
    console.log('Filter:', JSON.stringify(taskFilter, null, 2));
    
    // Prüfe speziell die Tasks 807-811
    const specificTasks = await prisma.task.findMany({
      where: {
        id: { in: [807, 808, 809, 810, 811] }
      },
      select: {
        id: true,
        title: true,
        roleId: true,
        organizationId: true,
        branchId: true,
        responsibleId: true,
        qualityControlId: true,
        createdAt: true
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SPEZIELLE TASKS (807-811):');
    console.log('='.repeat(80));
    specificTasks.forEach(t => {
      console.log(`\nTask ID ${t.id}: ${t.title}`);
      console.log(`  roleId: ${t.roleId}`);
      console.log(`  organizationId: ${t.organizationId}`);
      console.log(`  branchId: ${t.branchId}`);
      console.log(`  responsibleId: ${t.responsibleId}`);
      console.log(`  qualityControlId: ${t.qualityControlId}`);
      console.log(`  createdAt: ${t.createdAt}`);
      
      // Prüfe ob Task durch Filter kommt
      const matchesOrg = t.organizationId === organizationId;
      const matchesResponsible = t.responsibleId === userId;
      const matchesQualityControl = t.qualityControlId === userId;
      const matchesRole = t.roleId === userRoleId;
      
      console.log(`  Matches Filter:`);
      console.log(`    organizationId: ${matchesOrg}`);
      console.log(`    responsibleId: ${matchesResponsible}`);
      console.log(`    qualityControlId: ${matchesQualityControl}`);
      console.log(`    roleId: ${matchesRole}`);
      
      const shouldMatch = matchesOrg && (matchesResponsible || matchesQualityControl || matchesRole);
      console.log(`  → Sollte durch Filter kommen: ${shouldMatch ? '✅ JA' : '❌ NEIN'}`);
    });
    
    // Prüfe alle Tasks mit dem Filter (ohne Limit)
    const allFilteredTasks = await prisma.task.findMany({
      where: taskFilter,
      select: { 
        id: true, 
        title: true, 
        roleId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('ALLE TASKS DIE DURCH FILTER KOMMEN (ohne Limit):');
    console.log('='.repeat(80));
    console.log(`Anzahl: ${allFilteredTasks.length}`);
    
    // Prüfe ob Tasks 807-811 dabei sind
    const taskIds = allFilteredTasks.map(t => t.id);
    const foundTasks = [807, 808, 809, 810, 811].filter(id => taskIds.includes(id));
    const missingTasks = [807, 808, 809, 810, 811].filter(id => !taskIds.includes(id));
    
    console.log(`\nTasks 807-811 in gefilterter Liste: ${foundTasks.length}/5`);
    if (foundTasks.length > 0) {
      console.log(`  Gefunden: ${foundTasks.join(', ')}`);
    }
    if (missingTasks.length > 0) {
      console.log(`  ❌ FEHLEND: ${missingTasks.join(', ')}`);
    }
    
    // Zeige die letzten 20 Tasks (sortiert nach createdAt desc)
    console.log('\nLetzte 20 Tasks (nach createdAt sortiert):');
    allFilteredTasks.slice(0, 20).forEach(t => {
      const isNew = [807, 808, 809, 810, 811].includes(t.id);
      console.log(`  ${isNew ? '⭐' : ' '} Task ID ${t.id}: ${t.title} (roleId: ${t.roleId}, createdAt: ${t.createdAt})`);
    });
    
    // Prüfe ob es ein Problem mit dem AND/OR gibt
    console.log('\n' + '='.repeat(80));
    console.log('PRISMA QUERY TEST:');
    console.log('='.repeat(80));
    
    // Test 1: Nur organizationId
    const test1 = await prisma.task.findMany({
      where: { organizationId: 1, id: { in: [807, 808, 809, 810, 811] } },
      select: { id: true }
    });
    console.log(`Test 1 (nur organizationId=1): ${test1.length} Tasks gefunden`);
    
    // Test 2: organizationId + roleId
    const test2 = await prisma.task.findMany({
      where: { 
        organizationId: 1, 
        roleId: 15,
        id: { in: [807, 808, 809, 810, 811] }
      },
      select: { id: true }
    });
    console.log(`Test 2 (organizationId=1 + roleId=15): ${test2.length} Tasks gefunden`);
    
    // Test 3: Vollständiger Filter
    const test3 = await prisma.task.findMany({
      where: taskFilter,
      select: { id: true }
    });
    console.log(`Test 3 (vollständiger Filter): ${test3.length} Tasks gefunden`);
    
    // Test 4: Prüfe ob Tasks 807-811 wirklich organizationId=1 haben
    const test4 = await prisma.task.findMany({
      where: { id: { in: [807, 808, 809, 810, 811] } },
      select: { id: true, organizationId: true, roleId: true }
    });
    console.log(`\nTest 4 (Tasks 807-811 Details):`);
    test4.forEach(t => {
      console.log(`  Task ${t.id}: organizationId=${t.organizationId}, roleId=${t.roleId}`);
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPatrickTasksDetailed();

