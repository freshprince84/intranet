#!/usr/bin/env node
/**
 * Analysiert Duplikate in Requests und Tasks
 * 
 * Duplikat-Kriterium: Gleicher Titel + Organization
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  key: string;
  ids: number[];
  titles: string[];
  createdAt: Date[];
}

async function analyzeRequests() {
  console.log('\n📋 Analysiere Requests...');
  
  const allRequests = await prisma.request.findMany({
    where: {
      organizationId: { not: null }
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      organizationId: true,
      createdAt: true
    }
  });

  const seen = new Map<string, DuplicateGroup>();
  const duplicates: DuplicateGroup[] = [];

  for (const req of allRequests) {
    if (!req.organizationId) continue;
    
    const key = `${req.title}|${req.organizationId}`;
    
    if (seen.has(key)) {
      const group = seen.get(key)!;
      group.ids.push(req.id);
      group.titles.push(req.title);
      group.createdAt.push(req.createdAt);
      if (group.ids.length === 2) {
        duplicates.push(group);
      }
    } else {
      seen.set(key, {
        key,
        ids: [req.id],
        titles: [req.title],
        createdAt: [req.createdAt]
      });
    }
  }

  // Filtere nur Gruppen mit mehr als 1 Eintrag
  const duplicateGroups = duplicates.filter(g => g.ids.length > 1);

  console.log(`   Gesamt: ${allRequests.length} Requests`);
  console.log(`   Eindeutige: ${seen.size - duplicateGroups.length}`);
  console.log(`   Duplikat-Gruppen: ${duplicateGroups.length}`);
  
  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.ids.length - 1, 0);
  console.log(`   Zu löschende Duplikate: ${totalDuplicates}`);

  if (duplicateGroups.length > 0) {
    console.log('\n   Beispiele von Duplikat-Gruppen:');
    duplicateGroups.slice(0, 5).forEach((group, idx) => {
      console.log(`   ${idx + 1}. "${group.titles[0]}" (Org: ${group.key.split('|')[1]})`);
      console.log(`      ${group.ids.length} Duplikate (IDs: ${group.ids.join(', ')})`);
    });
    if (duplicateGroups.length > 5) {
      console.log(`   ... und ${duplicateGroups.length - 5} weitere Gruppen`);
    }
  }

  return {
    total: allRequests.length,
    unique: seen.size - duplicateGroups.length,
    duplicateGroups: duplicateGroups.length,
    duplicatesToDelete: totalDuplicates,
    groups: duplicateGroups
  };
}

async function analyzeTasks() {
  console.log('\n✅ Analysiere Tasks...');
  
  const allTasks = await prisma.task.findMany({
    where: {
      organizationId: { not: null }
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      organizationId: true,
      createdAt: true
    }
  });

  const seen = new Map<string, DuplicateGroup>();
  const duplicates: DuplicateGroup[] = [];

  for (const task of allTasks) {
    if (!task.organizationId) continue;
    
    const key = `${task.title}|${task.organizationId}`;
    
    if (seen.has(key)) {
      const group = seen.get(key)!;
      group.ids.push(task.id);
      group.titles.push(task.title);
      group.createdAt.push(task.createdAt);
      if (group.ids.length === 2) {
        duplicates.push(group);
      }
    } else {
      seen.set(key, {
        key,
        ids: [task.id],
        titles: [task.title],
        createdAt: [task.createdAt]
      });
    }
  }

  // Filtere nur Gruppen mit mehr als 1 Eintrag
  const duplicateGroups = duplicates.filter(g => g.ids.length > 1);

  console.log(`   Gesamt: ${allTasks.length} Tasks`);
  console.log(`   Eindeutige: ${seen.size - duplicateGroups.length}`);
  console.log(`   Duplikat-Gruppen: ${duplicateGroups.length}`);
  
  const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.ids.length - 1, 0);
  console.log(`   Zu löschende Duplikate: ${totalDuplicates}`);

  if (duplicateGroups.length > 0) {
    console.log('\n   Beispiele von Duplikat-Gruppen:');
    duplicateGroups.slice(0, 5).forEach((group, idx) => {
      console.log(`   ${idx + 1}. "${group.titles[0]}" (Org: ${group.key.split('|')[1]})`);
      console.log(`      ${group.ids.length} Duplikate (IDs: ${group.ids.join(', ')})`);
    });
    if (duplicateGroups.length > 5) {
      console.log(`   ... und ${duplicateGroups.length - 5} weitere Gruppen`);
    }
  }

  return {
    total: allTasks.length,
    unique: seen.size - duplicateGroups.length,
    duplicateGroups: duplicateGroups.length,
    duplicatesToDelete: totalDuplicates,
    groups: duplicateGroups
  };
}

async function main() {
  try {
    console.log('🔍 Analysiere Duplikate in der Datenbank...');
    console.log('   Kriterium: Gleicher Titel + Organization\n');

    const requestsStats = await analyzeRequests();
    const tasksStats = await analyzeTasks();

    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 Zusammenfassung:');
    console.log('='.repeat(60));
    console.log(`Requests:`);
    console.log(`   Gesamt: ${requestsStats.total}`);
    console.log(`   Eindeutige: ${requestsStats.unique}`);
    console.log(`   Duplikat-Gruppen: ${requestsStats.duplicateGroups}`);
    console.log(`   Zu löschende: ${requestsStats.duplicatesToDelete}`);
    console.log(`\nTasks:`);
    console.log(`   Gesamt: ${tasksStats.total}`);
    console.log(`   Eindeutige: ${tasksStats.unique}`);
    console.log(`   Duplikat-Gruppen: ${tasksStats.duplicateGroups}`);
    console.log(`   Zu löschende: ${tasksStats.duplicatesToDelete}`);
    console.log('\n' + '='.repeat(60));
    console.log(`Gesamt zu löschende Duplikate: ${requestsStats.duplicatesToDelete + tasksStats.duplicatesToDelete}`);
    console.log('='.repeat(60));

    if (requestsStats.duplicatesToDelete > 0 || tasksStats.duplicatesToDelete > 0) {
      console.log('\n💡 Tipp: Führe cleanup_all_duplicates.ts aus, um die Duplikate zu bereinigen.');
    } else {
      console.log('\n✅ Keine Duplikate gefunden!');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

