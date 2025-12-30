/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Findet alle Markdown-Dateien im Repository (außer in node_modules, .git, etc.)
 */
function findAllMarkdownFiles(dir: string, baseDir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    // Ignoriere bestimmte Verzeichnisse
    if (entry.isDirectory()) {
      const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'uploads'];
      if (!ignoreDirs.some(ignore => entry.name.includes(ignore))) {
        findAllMarkdownFiles(fullPath, baseDir, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  
  return files;
}

/**
 * Prüft, ob ein Dokument bereits in Cerebro existiert (anhand des githubPath)
 */
async function documentExistsInCerebro(githubPath: string): Promise<boolean> {
  const article = await prisma.cerebroCarticle.findFirst({
    where: {
      githubPath: githubPath
    }
  });
  
  return article !== null;
}

/**
 * Findet fehlende Cerebro-Einträge
 */
async function findMissingCerebroEntries() {
  try {
    console.log('🔍 Suche nach fehlenden Cerebro-Einträgen...\n');
    
    const repoRoot = path.resolve(__dirname, '../../');
    
    // Finde alle Markdown-Dateien
    console.log('📂 Durchsuche Repository nach Markdown-Dateien...');
    const allMdFiles = findAllMarkdownFiles(repoRoot, repoRoot);
    
    console.log(`📊 Gefunden: ${allMdFiles.length} Markdown-Dateien im Repository\n`);
    
    // Filtere relevante Dokumentationsdateien (nur in docs/ und Root)
    const relevantFiles = allMdFiles.filter(file => {
      // Nur Dateien in docs/ oder im Root (wichtige Dokumentation)
      return file.startsWith('docs/') || 
             (!file.includes('/') && file.endsWith('.md')) ||
             file.startsWith('README') ||
             file.includes('HANDbuch') ||
             file.includes('ANLEITUNG');
    });
    
    console.log(`📋 Relevante Dokumentationsdateien: ${relevantFiles.length}\n`);
    
    // Prüfe, welche bereits in Cerebro existieren
    const missing: string[] = [];
    const existing: string[] = [];
    
    console.log('🔍 Prüfe, welche bereits in Cerebro vorhanden sind...\n');
    
    for (const file of relevantFiles) {
      const exists = await documentExistsInCerebro(file);
      if (exists) {
        existing.push(file);
      } else {
        missing.push(file);
      }
    }
    
    // Ausgabe der Ergebnisse
    console.log('='.repeat(100));
    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   - Gesamt relevante Dateien: ${relevantFiles.length}`);
    console.log(`   - Bereits in Cerebro: ${existing.length}`);
    console.log(`   - Fehlen in Cerebro: ${missing.length}`);
    
    if (missing.length > 0) {
      console.log(`\n❌ Fehlende Dokumente in Cerebro (${missing.length}):\n`);
      
      // Gruppiere nach Verzeichnis
      const grouped: Record<string, string[]> = {};
      
      for (const file of missing) {
        const dir = path.dirname(file);
        if (!grouped[dir]) {
          grouped[dir] = [];
        }
        grouped[dir].push(file);
      }
      
      // Sortiere Verzeichnisse
      const sortedDirs = Object.keys(grouped).sort();
      
      for (const dir of sortedDirs) {
        console.log(`\n📁 ${dir}/`);
        for (const file of grouped[dir].sort()) {
          console.log(`   - ${path.basename(file)}`);
        }
      }
      
      console.log(`\n📝 Liste aller fehlenden Dateien (für Import-Script):\n`);
      for (const file of missing.sort()) {
        const title = path.basename(file, '.md').replace(/_/g, ' ').replace(/-/g, ' ');
        console.log(`  { pfad: '${file}', title: '${title}', parentSlug: null },`);
      }
    } else {
      console.log(`\n✅ Alle relevanten Dokumente sind bereits in Cerebro vorhanden!`);
    }
    
    if (existing.length > 0) {
      console.log(`\n✅ Bereits vorhandene Dokumente (${existing.length}):`);
      const existingGrouped: Record<string, string[]> = {};
      for (const file of existing) {
        const dir = path.dirname(file);
        if (!existingGrouped[dir]) {
          existingGrouped[dir] = [];
        }
        existingGrouped[dir].push(file);
      }
      
      const sortedDirs = Object.keys(existingGrouped).sort();
      for (const dir of sortedDirs) {
        console.log(`\n📁 ${dir}/`);
        for (const file of existingGrouped[dir].sort()) {
          console.log(`   ✓ ${path.basename(file)}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Fehler bei der Suche:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Suche
findMissingCerebroEntries().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

