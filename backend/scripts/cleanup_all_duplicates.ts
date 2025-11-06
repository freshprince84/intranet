#!/usr/bin/env node
/**
 * Bereinigt alle Duplikate in Requests und Tasks
 * 
 * Duplikat-Kriterium: Gleicher Titel + Organization
 * Behalten: Ältester Eintrag (niedrigste ID / frühestes createdAt)
 * 
 * Verwendung:
 *   npx ts-node scripts/cleanup_all_duplicates.ts          # Normal-Modus
 *   npx ts-node scripts/cleanup_all_duplicates.ts --dry-run # Dry-Run Modus
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

interface DuplicateGroup {
  key: string;
  ids: number[];
  titles: string[];
  createdAt: Date[];
}

async function cleanupRequests(dryRun: boolean) {
  console.log('\n📋 Bereinige Requests...');
  
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

  for (const req of allRequests) {
    if (!req.organizationId) continue;
    
    const key = `${req.title}|${req.organizationId}`;
    
    if (seen.has(key)) {
      const group = seen.get(key)!;
      group.ids.push(req.id);
      group.titles.push(req.title);
      group.createdAt.push(req.createdAt);
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
  const duplicateGroups = Array.from(seen.values()).filter(g => g.ids.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('   ✓ Keine doppelten Requests gefunden');
    return { deleted: 0, kept: allRequests.length };
  }

  console.log(`   Gefunden: ${duplicateGroups.length} Duplikat-Gruppen`);

  let totalDeleted = 0;
  let totalKept = 0;

  for (const group of duplicateGroups) {
    // Sortiere nach ID (ältester zuerst)
    const sortedIds = [...group.ids].sort((a, b) => a - b);
    const toKeep = sortedIds[0];
    const toDelete = sortedIds.slice(1);

    totalKept += 1;
    totalDeleted += toDelete.length;

    if (dryRun) {
      console.log(`   [DRY-RUN] Würde löschen: ${toDelete.length} Duplikate von "${group.titles[0]}" (IDs: ${toDelete.join(', ')})`);
      console.log(`   [DRY-RUN] Würde behalten: ID ${toKeep}`);
    } else {
      await prisma.request.deleteMany({
        where: { id: { in: toDelete } }
      });
      console.log(`   ✓ ${toDelete.length} Duplikate gelöscht von "${group.titles[0]}"`);
    }
  }

  return { deleted: totalDeleted, kept: totalKept };
}

async function cleanupTasks(dryRun: boolean) {
  console.log('\n✅ Bereinige Tasks...');
  
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

  for (const task of allTasks) {
    if (!task.organizationId) continue;
    
    const key = `${task.title}|${task.organizationId}`;
    
    if (seen.has(key)) {
      const group = seen.get(key)!;
      group.ids.push(task.id);
      group.titles.push(task.title);
      group.createdAt.push(task.createdAt);
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
  const duplicateGroups = Array.from(seen.values()).filter(g => g.ids.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('   ✓ Keine doppelten Tasks gefunden');
    return { deleted: 0, kept: allTasks.length };
  }

  console.log(`   Gefunden: ${duplicateGroups.length} Duplikat-Gruppen`);

  let totalDeleted = 0;
  let totalKept = 0;

  // WICHTIG: Prüfe abhängige Daten (WorkTimeTask hat kein Cascade Delete)
  console.log('   ⚠️  Prüfe abhängige Daten (WorkTimeTask)...');
  const workTimeTaskCounts = new Map<number, number>();

  for (const group of duplicateGroups) {
    const sortedIds = [...group.ids].sort((a, b) => a - b);
    const toDelete = sortedIds.slice(1);

    // Zähle WorkTimeTask-Verbindungen für zu löschende Tasks
    for (const taskId of toDelete) {
      const count = await prisma.workTimeTask.count({
        where: { taskId }
      });
      if (count > 0) {
        workTimeTaskCounts.set(taskId, count);
      }
    }
  }

  if (workTimeTaskCounts.size > 0) {
    console.log(`   ⚠️  ${workTimeTaskCounts.size} Tasks haben WorkTimeTask-Verbindungen`);
    console.log('   Diese werden automatisch mitgelöscht (Cascade Delete)');
  }

  for (const group of duplicateGroups) {
    // Sortiere nach ID (ältester zuerst)
    const sortedIds = [...group.ids].sort((a, b) => a - b);
    const toKeep = sortedIds[0];
    const toDelete = sortedIds.slice(1);

    totalKept += 1;
    totalDeleted += toDelete.length;

    if (dryRun) {
      const workTimeLinks = toDelete.filter(id => workTimeTaskCounts.has(id))
        .reduce((sum, id) => sum + (workTimeTaskCounts.get(id) || 0), 0);
      console.log(`   [DRY-RUN] Würde löschen: ${toDelete.length} Duplikate von "${group.titles[0]}" (IDs: ${toDelete.join(', ')})`);
      if (workTimeLinks > 0) {
        console.log(`   [DRY-RUN] Würde auch löschen: ${workTimeLinks} WorkTimeTask-Verbindungen`);
      }
      console.log(`   [DRY-RUN] Würde behalten: ID ${toKeep}`);
    } else {
      // Lösche zuerst WorkTimeTask-Verbindungen (falls vorhanden)
      for (const taskId of toDelete) {
        if (workTimeTaskCounts.has(taskId)) {
          await prisma.workTimeTask.deleteMany({
            where: { taskId }
          });
        }
      }

      // Lösche Tasks (Cascade Delete für TaskAttachment, TaskCerebroCarticle, TaskStatusHistory)
      await prisma.task.deleteMany({
        where: { id: { in: toDelete } }
      });
      console.log(`   ✓ ${toDelete.length} Duplikate gelöscht von "${group.titles[0]}"`);
    }
  }

  return { deleted: totalDeleted, kept: totalKept };
}

async function main() {
  try {
    if (DRY_RUN) {
      console.log('🧹 [DRY-RUN MODUS] Bereinige Duplikate (keine Änderungen werden vorgenommen)...\n');
    } else {
      console.log('🧹 Bereinige Duplikate in der Datenbank...');
      console.log('   Kriterium: Gleicher Titel + Organization');
      console.log('   Behalten: Ältester Eintrag (niedrigste ID)\n');
    }

    const requestsResult = await cleanupRequests(DRY_RUN);
    const tasksResult = await cleanupTasks(DRY_RUN);

    // Finale Statistik
    const finalRequestsCount = await prisma.request.count({
      where: { organizationId: { not: null } }
    });
    const finalTasksCount = await prisma.task.count({
      where: { organizationId: { not: null } }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 Zusammenfassung:');
    console.log('='.repeat(60));
    console.log(`Requests:`);
    console.log(`   Gelöscht: ${requestsResult.deleted}`);
    console.log(`   Behalten: ${requestsResult.kept}`);
    console.log(`   Final: ${finalRequestsCount}`);
    console.log(`\nTasks:`);
    console.log(`   Gelöscht: ${tasksResult.deleted}`);
    console.log(`   Behalten: ${tasksResult.kept}`);
    console.log(`   Final: ${finalTasksCount}`);
    console.log('\n' + '='.repeat(60));
    console.log(`Gesamt gelöscht: ${requestsResult.deleted + tasksResult.deleted}`);
    console.log('='.repeat(60));

    if (DRY_RUN) {
      console.log('\n💡 Dies war ein Dry-Run. Führe das Script ohne --dry-run aus, um die Änderungen anzuwenden.');
    } else {
      console.log('\n✅ Bereinigung abgeschlossen!');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

