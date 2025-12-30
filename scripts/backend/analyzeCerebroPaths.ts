/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Prüft, ob eine Datei im Repository existiert
 */
function fileExists(filePath: string): boolean {
  // Pfad relativ zum Repository-Root
  const repoRoot = path.resolve(__dirname, '../../');
  const fullPath = path.join(repoRoot, filePath);
  return fs.existsSync(fullPath);
}

/**
 * Findet den korrekten Pfad für eine Datei, wenn sie verschoben wurde
 */
function findCorrectPath(oldPath: string): string | null {
  const repoRoot = path.resolve(__dirname, '../../');
  
  // Liste der möglichen neuen Pfade
  const possiblePaths = [
    oldPath, // Original-Pfad
    `docs/${oldPath}`, // In docs/ verschoben
    `docs/core/${oldPath}`, // In docs/core/ verschoben
    `docs/modules/${oldPath}`, // In docs/modules/ verschoben
    `docs/technical/${oldPath}`, // In docs/technical/ verschoben
    `docs/user/${oldPath}`, // In docs/user/ verschoben
  ];
  
  // Prüfe auch mit verschiedenen Groß-/Kleinschreibungen
  const fileName = path.basename(oldPath);
  const possibleFileNames = [
    fileName,
    fileName.toUpperCase(),
    fileName.toLowerCase(),
    fileName.charAt(0).toUpperCase() + fileName.slice(1).toLowerCase()
  ];
  
  for (const possiblePath of possiblePaths) {
    for (const possibleFileName of possibleFileNames) {
      const testPath = possiblePath.replace(path.basename(possiblePath), possibleFileName);
      if (fileExists(testPath)) {
        return testPath;
      }
    }
  }
  
  // Suche rekursiv im docs-Verzeichnis
  const docsDir = path.join(repoRoot, 'docs');
  if (fs.existsSync(docsDir)) {
    const found = findFileRecursive(docsDir, fileName);
    if (found) {
      return path.relative(repoRoot, found);
    }
  }
  
  return null;
}

/**
 * Sucht rekursiv nach einer Datei
 */
function findFileRecursive(dir: string, fileName: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, fileName);
      if (found) return found;
    } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
      return fullPath;
    }
  }
  
  return null;
}

/**
 * Analysiert alle Cerebro-Artikel mit githubPath
 */
async function analyzeCerebroPaths() {
  try {
    console.log('🔍 Analysiere Cerebro-Dokumentenzuweisungen...\n');
    
    // Hole alle Artikel mit githubPath
    const articles = await prisma.cerebroCarticle.findMany({
      where: {
        githubPath: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        githubPath: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 Gefunden: ${articles.length} Artikel mit githubPath\n`);
    
    const problems: Array<{
      id: number;
      title: string;
      slug: string;
      oldPath: string;
      exists: boolean;
      correctPath: string | null;
    }> = [];
    
    // Prüfe jeden Artikel
    for (const article of articles) {
      if (!article.githubPath) continue;
      
      const oldPath = article.githubPath;
      const exists = fileExists(oldPath);
      const correctPath = exists ? null : findCorrectPath(oldPath);
      
      if (!exists) {
        problems.push({
          id: article.id,
          title: article.title,
          slug: article.slug,
          oldPath: oldPath,
          exists: false,
          correctPath: correctPath
        });
      }
    }
    
    // Ausgabe der Ergebnisse
    if (problems.length === 0) {
      console.log('✅ Alle Pfade sind korrekt!\n');
    } else {
      console.log(`❌ ${problems.length} Artikel mit fehlerhaften Pfaden:\n`);
      console.log('='.repeat(100));
      
      for (const problem of problems) {
        console.log(`\n📄 Artikel ID: ${problem.id}`);
        console.log(`   Titel: ${problem.title}`);
        console.log(`   Slug: ${problem.slug}`);
        console.log(`   ❌ Alter Pfad (nicht gefunden): ${problem.oldPath}`);
        
        if (problem.correctPath) {
          console.log(`   ✅ Korrekter Pfad: ${problem.correctPath}`);
        } else {
          console.log(`   ⚠️  Datei nicht gefunden (möglicherweise gelöscht oder umbenannt)`);
        }
      }
      
      console.log('\n' + '='.repeat(100));
      console.log(`\n📋 Zusammenfassung:`);
      console.log(`   - Gesamt Artikel mit githubPath: ${articles.length}`);
      console.log(`   - Fehlerhafte Pfade: ${problems.length}`);
      console.log(`   - Korrekte Pfade: ${articles.length - problems.length}`);
      
      // Erstelle Update-Liste
      console.log(`\n📝 SQL-Update-Befehle (für Artikel mit gefundenen korrekten Pfaden):\n`);
      const updateable = problems.filter(p => p.correctPath !== null);
      
      if (updateable.length > 0) {
        for (const item of updateable) {
          console.log(`UPDATE "CerebroCarticle" SET "githubPath" = '${item.correctPath}' WHERE id = ${item.id};`);
        }
      } else {
        console.log('   (Keine automatisch korrigierbaren Pfade gefunden)');
      }
    }
    
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Analyse
analyzeCerebroPaths().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

