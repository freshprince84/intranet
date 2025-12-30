/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Prüft, ob eine Datei im Repository existiert
 */
function fileExists(filePath: string): boolean {
  const repoRoot = path.resolve(__dirname, '../../');
  const fullPath = path.join(repoRoot, filePath);
  return fs.existsSync(fullPath);
}

/**
 * Findet den korrekten Pfad für eine Datei, wenn sie verschoben wurde
 */
function findCorrectPath(oldPath: string): string | null {
  const repoRoot = path.resolve(__dirname, '../../');
  
  const possiblePaths = [
    oldPath,
    `docs/${oldPath}`,
    `docs/core/${oldPath}`,
    `docs/modules/${oldPath}`,
    `docs/technical/${oldPath}`,
    `docs/user/${oldPath}`,
  ];
  
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
 * Korrigiert alle Cerebro-Artikel mit fehlerhaften githubPath-Werten
 */
async function fixCerebroPaths() {
  try {
    console.log('🔧 Korrigiere Cerebro-Dokumentenzuweisungen...\n');
    
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
    
    let fixed = 0;
    let notFound = 0;
    const updates: Array<{ id: number; oldPath: string; newPath: string }> = [];
    
    // Prüfe und korrigiere jeden Artikel
    for (const article of articles) {
      if (!article.githubPath) continue;
      
      const oldPath = article.githubPath;
      const exists = fileExists(oldPath);
      
      if (!exists) {
        const correctPath = findCorrectPath(oldPath);
        
        if (correctPath) {
          // Update durchführen
          await prisma.cerebroCarticle.update({
            where: { id: article.id },
            data: {
              githubPath: correctPath
            }
          });
          
          updates.push({
            id: article.id,
            oldPath: oldPath,
            newPath: correctPath
          });
          
          fixed++;
          console.log(`✅ ID ${article.id} (${article.title}): ${oldPath} → ${correctPath}`);
        } else {
          notFound++;
          console.log(`⚠️  ID ${article.id} (${article.title}): ${oldPath} - Datei nicht gefunden`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(100));
    console.log(`\n📋 Zusammenfassung:`);
    console.log(`   - Gesamt Artikel mit githubPath: ${articles.length}`);
    console.log(`   - Korrigiert: ${fixed}`);
    console.log(`   - Nicht gefunden: ${notFound}`);
    console.log(`   - Bereits korrekt: ${articles.length - fixed - notFound}`);
    
    if (fixed > 0) {
      console.log(`\n✅ ${fixed} Pfade erfolgreich korrigiert!`);
    }
    
    if (notFound > 0) {
      console.log(`\n⚠️  ${notFound} Artikel konnten nicht automatisch korrigiert werden (Dateien nicht gefunden).`);
    }
    
  } catch (error) {
    console.error('❌ Fehler bei der Korrektur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Korrektur
fixCerebroPaths().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

