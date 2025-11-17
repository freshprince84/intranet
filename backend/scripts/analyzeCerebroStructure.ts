/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CerebroArticle {
  id: number;
  title: string;
  slug: string;
  parentId: number | null;
  githubPath: string | null;
  position: number | null;
  isPublished: boolean;
  createdAt: Date;
  parent?: CerebroArticle | null;
  children?: CerebroArticle[];
}

interface AnalysisResult {
  totalArticles: number;
  articlesWithGithubPath: number;
  articlesWithoutGithubPath: number;
  rootArticles: CerebroArticle[];
  markdownFolder: CerebroArticle | null;
  articlesInMarkdownFolder: CerebroArticle[];
  standaloneArticles: CerebroArticle[];
  articlesWithMissingFiles: Array<{ article: CerebroArticle; githubPath: string }>;
  articlesWithLocalFilesButNotInServer: Array<{ file: string; title: string }>;
}

/**
 * Prüft, ob eine Datei lokal existiert
 */
function fileExistsLocally(filePath: string): boolean {
  const repoRoot = path.resolve(__dirname, '../../');
  const fullPath = path.join(repoRoot, filePath);
  return fs.existsSync(fullPath);
}

/**
 * Findet alle Markdown-Dateien im docs-Verzeichnis
 */
function findAllMarkdownFilesInDocs(dir: string, baseDir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'uploads'];
      if (!ignoreDirs.some(ignore => entry.name.includes(ignore))) {
        findAllMarkdownFilesInDocs(fullPath, baseDir, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  
  return files;
}

/**
 * Analysiert die Cerebro-Struktur
 */
async function analyzeCerebroStructure(): Promise<AnalysisResult> {
  console.log('🔍 Analysiere Cerebro-Struktur...\n');
  
  // Hole alle Artikel
  const allArticles = await prisma.cerebroCarticle.findMany({
    include: {
      parent: true,
      children: true
    },
    orderBy: [
      { position: 'asc' },
      { title: 'asc' }
    ]
  });
  
  console.log(`📊 Gefunden: ${allArticles.length} Artikel insgesamt\n`);
  
  // Kategorisiere Artikel
  const articlesWithGithubPath = allArticles.filter(a => a.githubPath !== null);
  const articlesWithoutGithubPath = allArticles.filter(a => a.githubPath === null);
  const rootArticles = allArticles.filter(a => a.parentId === null);
  
  // Finde den Markdown-Ordner
  const markdownFolder = allArticles.find(a => 
    a.title === 'Markdown-Dateien' || 
    a.slug === 'markdown-folder' ||
    a.title === 'Intranet - Überblick'
  ) || null;
  
  // Artikel im Markdown-Ordner
  const articlesInMarkdownFolder = markdownFolder 
    ? allArticles.filter(a => a.parentId === markdownFolder.id)
    : [];
  
  // Standalone-Artikel (ohne Parent, aber nicht der Markdown-Ordner)
  const standaloneArticles = rootArticles.filter(a => 
    a.id !== markdownFolder?.id
  );
  
  // Prüfe, welche githubPath-Dateien lokal fehlen
  const articlesWithMissingFiles: Array<{ article: CerebroArticle; githubPath: string }> = [];
  for (const article of articlesWithGithubPath) {
    if (article.githubPath && !fileExistsLocally(article.githubPath)) {
      articlesWithMissingFiles.push({
        article: article as CerebroArticle,
        githubPath: article.githubPath
      });
    }
  }
  
  // Finde lokale Markdown-Dateien, die nicht in Cerebro sind
  const repoRoot = path.resolve(__dirname, '../../');
  const docsDir = path.join(repoRoot, 'docs');
  const allLocalMdFiles: string[] = [];
  
  if (fs.existsSync(docsDir)) {
    findAllMarkdownFilesInDocs(docsDir, repoRoot, allLocalMdFiles);
  }
  
  // Prüfe auch README.md im Root
  const readmePath = path.join(repoRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    allLocalMdFiles.push('README.md');
  }
  
  const articlesWithLocalFilesButNotInServer: Array<{ file: string; title: string }> = [];
  for (const file of allLocalMdFiles) {
    const existsInCerebro = allArticles.some(a => a.githubPath === file);
    if (!existsInCerebro) {
      const title = path.basename(file, '.md').replace(/_/g, ' ').replace(/-/g, ' ');
      articlesWithLocalFilesButNotInServer.push({ file, title });
    }
  }
  
  return {
    totalArticles: allArticles.length,
    articlesWithGithubPath: articlesWithGithubPath.length,
    articlesWithoutGithubPath: articlesWithoutGithubPath.length,
    rootArticles: rootArticles as CerebroArticle[],
    markdownFolder: markdownFolder as CerebroArticle | null,
    articlesInMarkdownFolder: articlesInMarkdownFolder as CerebroArticle[],
    standaloneArticles: standaloneArticles as CerebroArticle[],
    articlesWithMissingFiles,
    articlesWithLocalFilesButNotInServer
  };
}

/**
 * Gibt die Analyse-Ergebnisse aus
 */
function printAnalysisResults(result: AnalysisResult) {
  console.log('='.repeat(100));
  console.log('\n📊 ZUSAMMENFASSUNG DER CEREBRO-STRUKTUR\n');
  console.log('='.repeat(100));
  
  console.log(`\n📈 Gesamtstatistik:`);
  console.log(`   - Gesamt Artikel: ${result.totalArticles}`);
  console.log(`   - Artikel mit githubPath (aus Git/Docs): ${result.articlesWithGithubPath}`);
  console.log(`   - Artikel ohne githubPath (manuell erstellt): ${result.articlesWithoutGithubPath}`);
  
  console.log(`\n📁 Struktur:`);
  console.log(`   - Root-Artikel (ohne Parent): ${result.rootArticles.length}`);
  if (result.markdownFolder) {
    console.log(`   - Markdown-Ordner gefunden: "${result.markdownFolder.title}" (ID: ${result.markdownFolder.id})`);
    console.log(`   - Artikel im Markdown-Ordner: ${result.articlesInMarkdownFolder.length}`);
  } else {
    console.log(`   - ⚠️  Markdown-Ordner NICHT gefunden!`);
  }
  console.log(`   - Standalone-Artikel (Root, aber nicht Markdown-Ordner): ${result.standaloneArticles.length}`);
  
  // Zeige Root-Artikel
  if (result.rootArticles.length > 0) {
    console.log(`\n📋 Root-Artikel (Top-Level):`);
    for (const article of result.rootArticles) {
      const isMarkdown = article.id === result.markdownFolder?.id;
      const marker = isMarkdown ? '📁' : '📄';
      console.log(`   ${marker} ${article.title} (ID: ${article.id}, Slug: ${article.slug})`);
      if (article.githubPath) {
        console.log(`      └─ githubPath: ${article.githubPath}`);
      }
    }
  }
  
  // Zeige Standalone-Artikel
  if (result.standaloneArticles.length > 0) {
    console.log(`\n📄 Standalone-Artikel (sollten auf gleicher Ebene wie Markdown-Ordner sein):`);
    for (const article of result.standaloneArticles) {
      console.log(`   - ${article.title} (ID: ${article.id}, Slug: ${article.slug})`);
      if (article.githubPath) {
        console.log(`     └─ githubPath: ${article.githubPath}`);
      }
    }
  }
  
  // Zeige Artikel im Markdown-Ordner
  if (result.articlesInMarkdownFolder.length > 0) {
    console.log(`\n📁 Artikel im Markdown-Ordner (${result.articlesInMarkdownFolder.length}):`);
    // Gruppiere nach Verzeichnis
    const grouped: Record<string, CerebroArticle[]> = {};
    for (const article of result.articlesInMarkdownFolder) {
      if (article.githubPath) {
        const dir = path.dirname(article.githubPath);
        if (!grouped[dir]) {
          grouped[dir] = [];
        }
        grouped[dir].push(article);
      } else {
        if (!grouped['[Ohne githubPath]']) {
          grouped['[Ohne githubPath]'] = [];
        }
        grouped['[Ohne githubPath]'].push(article);
      }
    }
    
    const sortedDirs = Object.keys(grouped).sort();
    for (const dir of sortedDirs) {
      console.log(`\n   📂 ${dir}/`);
      for (const article of grouped[dir]) {
        console.log(`      - ${article.title} (${article.githubPath || 'kein githubPath'})`);
      }
    }
  }
  
  // Zeige Artikel mit fehlenden Dateien
  if (result.articlesWithMissingFiles.length > 0) {
    console.log(`\n❌ Artikel mit fehlenden lokalen Dateien (${result.articlesWithMissingFiles.length}):`);
    for (const item of result.articlesWithMissingFiles) {
      console.log(`   - ${item.article.title}`);
      console.log(`     └─ githubPath: ${item.githubPath} (Datei nicht gefunden!)`);
    }
  }
  
  // Zeige lokale Dateien, die nicht in Cerebro sind
  if (result.articlesWithLocalFilesButNotInServer.length > 0) {
    console.log(`\n📝 Lokale Markdown-Dateien, die NICHT in Cerebro sind (${result.articlesWithLocalFilesButNotInServer.length}):`);
    // Gruppiere nach Verzeichnis
    const grouped: Record<string, Array<{ file: string; title: string }>> = {};
    for (const item of result.articlesWithLocalFilesButNotInServer) {
      const dir = path.dirname(item.file);
      if (!grouped[dir]) {
        grouped[dir] = [];
      }
      grouped[dir].push(item);
    }
    
    const sortedDirs = Object.keys(grouped).sort();
    for (const dir of sortedDirs) {
      console.log(`\n   📂 ${dir}/`);
      for (const item of grouped[dir]) {
        console.log(`      - ${item.file}`);
      }
    }
  }
  
  // Empfehlungen
  console.log(`\n${'='.repeat(100)}`);
  console.log('\n💡 EMPFEHLUNGEN ZUR STRUKTUR-VERBESSERUNG:\n');
  
  if (!result.markdownFolder) {
    console.log('   ⚠️  1. Markdown-Ordner fehlt!');
    console.log('      → Erstelle einen Root-Artikel mit Titel "Intranet - Überblick" oder "Markdown-Dateien"');
    console.log('      → Alle Artikel mit githubPath sollten als Kinder dieses Ordners sein\n');
  }
  
  if (result.standaloneArticles.length > 0) {
    console.log(`   ⚠️  2. ${result.standaloneArticles.length} Standalone-Artikel gefunden`);
    console.log('      → Diese sollten auf gleicher Ebene wie der Markdown-Ordner sein');
    console.log('      → Struktur sollte sein:');
    console.log('         - Standalone-Artikel (gleiche Ebene)');
    console.log('         - Markdown-Ordner (Überordner für alle Git/Docs-Artikel)');
    console.log('            └─ Alle Artikel aus docs/ und Git\n');
  }
  
  if (result.articlesWithMissingFiles.length > 0) {
    console.log(`   ⚠️  3. ${result.articlesWithMissingFiles.length} Artikel verweisen auf nicht existierende Dateien`);
    console.log('      → Prüfe die githubPath-Werte und korrigiere sie\n');
  }
  
  if (result.articlesWithLocalFilesButNotInServer.length > 0) {
    console.log(`   ⚠️  4. ${result.articlesWithLocalFilesButNotInServer.length} lokale Dateien sind nicht in Cerebro`);
    console.log('      → Diese sollten importiert werden\n');
  }
  
  console.log('='.repeat(100));
}

/**
 * Hauptfunktion
 */
async function main() {
  try {
    const result = await analyzeCerebroStructure();
    printAnalysisResults(result);
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Analyse
main().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

