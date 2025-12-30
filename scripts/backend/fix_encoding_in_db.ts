#!/usr/bin/env node
/**
 * Korrigiert falsch kodierte Zeichen in bereits importierten Daten
 * Liest die korrigierten JSON-Dateien und aktualisiert die Datenbank
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Pfade
const IMPORT_DIR = path.join(process.cwd(), '..', 'import_data');

function loadJsonFile(filename: string): any[] {
  const filePath = path.join(IMPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Datei nicht gefunden: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function fixTasks() {
  console.log('\n✅ Korrigiere Tasks...');
  const tasks = loadJsonFile('tasks.json');
  
  let updated = 0;
  let skipped = 0;
  
  // Erstelle eine Map für schnelleren Zugriff: old_id -> korrigierte Daten
  const tasksByOldId = new Map<string, typeof tasks[0]>();
  for (const task of tasks) {
    if (task.old_id) {
      tasksByOldId.set(String(task.old_id), task);
    }
  }
  
  // Hole alle Tasks der Organisation
  const allTasks = await prisma.task.findMany({
    where: { organizationId: 1 },
    select: { id: true, title: true, description: true }
  });
  
  console.log(`  Gefunden: ${allTasks.length} Tasks in der Datenbank`);
  
  // Prüfe jeden Task und aktualisiere wenn nötig
  for (const dbTask of allTasks) {
    try {
      // Suche nach einem Task mit ähnlichem Titel in den korrigierten Daten
      let matchingTaskData: typeof tasks[0] | null = null;
      
      // Versuche zuerst, über den Titel zu matchen (auch wenn falsch kodiert)
      // Normalisiere beide Titel für Vergleich (entferne Encoding-Probleme)
      const normalizeForMatch = (str: string) => {
        return str.toLowerCase()
          .replace(/[Ã©Ã]/g, '')
          .replace(/[éá]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 30);
      };
      
      const dbTitleNormalized = normalizeForMatch(dbTask.title);
      
      for (const taskData of tasks) {
        const correctedTitleNormalized = normalizeForMatch(taskData.title);
        // Prüfe ob die normalisierten Titel übereinstimmen
        if (dbTitleNormalized === correctedTitleNormalized && dbTitleNormalized.length > 10) {
          matchingTaskData = taskData;
          break;
        }
      }
      
      // Falls kein Match, prüfe ob der Task falsch kodierte Zeichen enthält
      // und versuche direkt zu korrigieren
      if (!matchingTaskData && (dbTask.title.includes('TÃ©') || dbTask.title.includes('JosÃ©') || dbTask.title.includes('Ã'))) {
        // Versuche, den Titel direkt zu korrigieren
        try {
          const correctedTitle = dbTask.title
            .replace(/TÃ©/g, 'Té')
            .replace(/JosÃ©/g, 'José')
            .replace(/Ã©/g, 'é')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã³/g, 'ó')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã/g, 'í');
          
          if (correctedTitle !== dbTask.title) {
            await prisma.task.update({
              where: { id: dbTask.id },
              data: { title: correctedTitle }
            });
            updated++;
            if (updated % 50 === 0) {
              console.log(`  ... ${updated} Tasks aktualisiert`);
            }
            continue;
          }
        } catch (e) {
          // Ignoriere Fehler bei direkter Korrektur
        }
      }
      
      // Wenn kein Match gefunden, überspringe
      if (!matchingTaskData) {
        skipped++;
        continue;
      }
      
      // Prüfe ob Update nötig ist
      if (dbTask.title === matchingTaskData.title && 
          dbTask.description === (matchingTaskData.description || null)) {
        // Bereits korrekt
        continue;
      }
      
      // Aktualisiere Task
      await prisma.task.update({
        where: { id: dbTask.id },
        data: {
          title: matchingTaskData.title,
          description: matchingTaskData.description || null,
        }
      });
      
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`  ... ${updated} Tasks aktualisiert`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Task ${dbTask.id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✓ ${updated} Tasks aktualisiert, ${skipped} übersprungen`);
}

async function fixRequests() {
  console.log('\n📋 Korrigiere Requests...');
  const requests = loadJsonFile('requests.json');
  
  let updated = 0;
  let skipped = 0;
  
  for (const reqData of requests) {
    try {
      // Suche Request anhand des Titels
      const existingRequests = await prisma.request.findMany({
        where: {
          title: { contains: reqData.title.substring(0, 50) },
          organizationId: 1
        }
      });
      
      if (existingRequests.length === 0) {
        skipped++;
        continue;
      }
      
      // Aktualisiere alle gefundenen Requests
      for (const req of existingRequests) {
        await prisma.request.update({
          where: { id: req.id },
          data: {
            title: reqData.title,
            description: reqData.description || null,
          }
        });
        updated++;
      }
      
      if (updated % 50 === 0) {
        console.log(`  ... ${updated} Requests aktualisiert`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Request ${reqData.old_id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✓ ${updated} Requests aktualisiert, ${skipped} übersprungen`);
}

async function fixCerebro() {
  console.log('\n🧠 Korrigiere Cerebro-Artikel...');
  const cerebro = loadJsonFile('cerebro.json');
  
  let updated = 0;
  let skipped = 0;
  
  for (const articleData of cerebro) {
    try {
      const existing = await prisma.cerebroCarticle.findUnique({
        where: { slug: articleData.slug }
      });
      
      if (!existing) {
        skipped++;
        continue;
      }
      
      await prisma.cerebroCarticle.update({
        where: { id: existing.id },
        data: {
          title: articleData.title,
          content: articleData.content || '',
        }
      });
      
      updated++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Cerebro-Artikel ${articleData.old_id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✓ ${updated} Cerebro-Artikel aktualisiert, ${skipped} übersprungen`);
}

async function main() {
  console.log('🔧 Starte Korrektur der Zeichenkodierung in der Datenbank...\n');
  
  try {
    await fixTasks();
    await fixRequests();
    await fixCerebro();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Korrektur abgeschlossen!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fehler bei der Korrektur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

