/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

/**
 * Liste von Verzeichnissen, die ausgeschlossen werden sollen
 */
const EXCLUDED_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'uploads',
];

/**
 * Test-Artikel, die entfernt werden sollen (basierend auf Titel/Slug)
 */
const TEST_ARTICLE_PATTERNS = [
  /^test\d*$/i,
  /^test-\d+$/i,
  /^test\d+$/i,
];

/**
 * Erstellt einen eindeutigen Slug
 */
async function createUniqueSlug(title: string, excludeId?: number): Promise<string> {
  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.cerebroCarticle.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Erstellt oder findet den Markdown-Überordner
 */
async function getOrCreateMarkdownFolder(adminUserId: number): Promise<number> {
  const existing = await prisma.cerebroCarticle.findFirst({
    where: {
      OR: [
        { title: 'Intranet - Überblick' },
        { title: 'Markdown-Dateien' },
        { slug: 'intranet-ueberblick' },
        { slug: 'markdown-folder' }
      ],
      parentId: null
    }
  });

  if (existing) {
    console.log(`✅ Markdown-Ordner gefunden: "${existing.title}" (ID: ${existing.id})`);
    return existing.id;
  }

  const slug = await createUniqueSlug('Intranet - Überblick');
  const newFolder = await prisma.cerebroCarticle.create({
    data: {
      title: 'Intranet - Überblick',
      content: '# Intranet - Überblick\n\nDieser Ordner enthält alle Dokumentationsartikel aus dem Git-Repository.',
      slug: slug,
      parentId: null,
      createdById: adminUserId,
      isPublished: true,
      position: 1
    }
  });

  console.log(`✅ Markdown-Ordner erstellt: "${newFolder.title}" (ID: ${newFolder.id})`);
  return newFolder.id;
}

/**
 * Erstellt oder findet einen Unterordner basierend auf dem Verzeichnis
 */
async function getOrCreateSubFolder(
  folderName: string,
  parentId: number,
  adminUserId: number
): Promise<number> {
  const existing = await prisma.cerebroCarticle.findFirst({
    where: {
      title: folderName,
      parentId: parentId
    }
  });

  if (existing) {
    return existing.id;
  }

  const slug = await createUniqueSlug(folderName);
  const newFolder = await prisma.cerebroCarticle.create({
    data: {
      title: folderName,
      content: `# ${folderName}\n\nArtikel in diesem Ordner.`,
      slug: slug,
      parentId: parentId,
      createdById: adminUserId,
      isPublished: true
    }
  });

  return newFolder.id;
}

/**
 * Findet alle Markdown-Dateien
 */
function findAllMarkdownFiles(dir: string, baseDir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      const shouldExclude = EXCLUDED_DIRECTORIES.some(excluded => 
        relativePath.includes(excluded) || entry.name === excluded
      );
      
      if (!shouldExclude) {
        findAllMarkdownFiles(fullPath, baseDir, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  
  return files;
}

/**
 * Prüft, ob ein Artikel ein Test-Artikel ist
 */
function isTestArticle(article: { title: string; slug: string }): boolean {
  return TEST_ARTICLE_PATTERNS.some(pattern => 
    pattern.test(article.title) || pattern.test(article.slug)
  );
}

/**
 * Phase 1: Entfernt Duplikate
 */
async function removeDuplicates(markdownFolderId: number): Promise<number> {
  console.log('\n📋 Phase 1: Entferne Duplikate...\n');

  const allArticles = await prisma.cerebroCarticle.findMany({
    where: {
      id: { not: markdownFolderId }
    },
    orderBy: {
      createdAt: 'asc' // Behalte älteste Version
    }
  });

  // Gruppiere nach Titel
  const titleGroups: Record<string, typeof allArticles> = {};
  for (const article of allArticles) {
    if (!titleGroups[article.title]) {
      titleGroups[article.title] = [];
    }
    titleGroups[article.title].push(article);
  }

  let deletedCount = 0;
  const duplicatesToDelete: number[] = [];

  for (const [title, articles] of Object.entries(titleGroups)) {
    if (articles.length > 1) {
      // Behalte den ersten (ältesten), lösche den Rest
      const toKeep = articles[0];
      const toDelete = articles.slice(1);

      console.log(`⚠️  Duplikat gefunden: "${title}" (${articles.length}x)`);
      console.log(`   ✅ Behalte: ID ${toKeep.id} (erstellt: ${toKeep.createdAt.toISOString()})`);

      for (const article of toDelete) {
        console.log(`   ❌ Lösche: ID ${article.id} (erstellt: ${article.createdAt.toISOString()})`);
        duplicatesToDelete.push(article.id);
        deletedCount++;
      }
    }
  }

  // Lösche Duplikate (zuerst abhängige Daten)
  if (duplicatesToDelete.length > 0) {
    for (const articleId of duplicatesToDelete) {
      // Lösche Media
      await prisma.cerebroMedia.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche External Links
      await prisma.cerebroExternalLink.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Task-Verbindungen
      await prisma.taskCerebroCarticle.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Request-Verbindungen
      await prisma.requestCerebroCarticle.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Notifications
      await prisma.notification.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Tag-Verbindungen (Many-to-Many)
      await prisma.$executeRaw`
        DELETE FROM "_CerebroCarticleToCerebroTag" WHERE "A" = ${articleId}
      `;
    }

    // Jetzt können die Artikel gelöscht werden
    await prisma.cerebroCarticle.deleteMany({
      where: {
        id: { in: duplicatesToDelete }
      }
    });
    console.log(`\n✅ ${deletedCount} Duplikate entfernt\n`);
  } else {
    console.log(`✅ Keine Duplikate gefunden\n`);
  }

  return deletedCount;
}

/**
 * Phase 2: Entfernt Test-Artikel
 */
async function removeTestArticles(markdownFolderId: number): Promise<number> {
  console.log('\n📋 Phase 2: Entferne Test-Artikel...\n');

  const allArticles = await prisma.cerebroCarticle.findMany({
    where: {
      id: { not: markdownFolderId }
    }
  });

  const testArticles = allArticles.filter(article => isTestArticle(article));
  const testArticleIds = testArticles.map(a => a.id);

  if (testArticleIds.length > 0) {
    console.log(`⚠️  Gefunden: ${testArticleIds.length} Test-Artikel:`);
    for (const article of testArticles) {
      console.log(`   ❌ Lösche: "${article.title}" (ID: ${article.id}, Slug: ${article.slug})`);
    }

    // Lösche zuerst alle abhängigen Daten
    for (const articleId of testArticleIds) {
      // Lösche Media
      await prisma.cerebroMedia.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche External Links
      await prisma.cerebroExternalLink.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Task-Verbindungen
      await prisma.taskCerebroCarticle.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Request-Verbindungen
      await prisma.requestCerebroCarticle.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Notifications
      await prisma.notification.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Tag-Verbindungen (Many-to-Many)
      await prisma.$executeRaw`
        DELETE FROM "_CerebroCarticleToCerebroTag" WHERE "A" = ${articleId}
      `;
    }

    // Jetzt können die Artikel gelöscht werden
    await prisma.cerebroCarticle.deleteMany({
      where: {
        id: { in: testArticleIds }
      }
    });

    console.log(`\n✅ ${testArticleIds.length} Test-Artikel entfernt\n`);
    return testArticleIds.length;
  } else {
    console.log(`✅ Keine Test-Artikel gefunden\n`);
    return 0;
  }
}

/**
 * Phase 3: Korrigiert Struktur (verschiebt Artikel mit githubPath in Markdown-Ordner)
 */
async function fixStructure(markdownFolderId: number): Promise<number> {
  console.log('\n📋 Phase 3: Korrigiere Struktur...\n');

  const allArticles = await prisma.cerebroCarticle.findMany({
    where: {
      id: { not: markdownFolderId }
    }
  });

  let movedCount = 0;

  for (const article of allArticles) {
    const hasGithubPath = article.githubPath !== null && article.githubPath !== '';
    const isInMarkdownFolder = article.parentId === markdownFolderId;
    const isRoot = article.parentId === null;

    if (hasGithubPath) {
      // Artikel mit githubPath sollten im Markdown-Ordner sein
      if (!isInMarkdownFolder) {
        await prisma.cerebroCarticle.update({
          where: { id: article.id },
          data: {
            parentId: markdownFolderId,
            position: null
          }
        });
        console.log(`📁 Verschoben: "${article.title}" → Markdown-Ordner`);
        movedCount++;
      }
    } else {
      // Artikel ohne githubPath sollten Standalone sein (Root-Level)
      if (!isRoot) {
        await prisma.cerebroCarticle.update({
          where: { id: article.id },
          data: {
            parentId: null,
            position: null
          }
        });
        console.log(`📄 Verschoben: "${article.title}" → Root-Level (Standalone)`);
        movedCount++;
      }
    }
  }

  console.log(`\n✅ ${movedCount} Artikel verschoben\n`);
  return movedCount;
}

/**
 * Phase 4: Entfernt Artikel mit fehlenden Dateien
 */
async function removeArticlesWithMissingFiles(markdownFolderId: number): Promise<number> {
  console.log('\n📋 Phase 4: Entferne Artikel mit fehlenden Dateien...\n');

  const articlesWithGithubPath = await prisma.cerebroCarticle.findMany({
    where: {
      githubPath: { not: null },
      id: { not: markdownFolderId }
    }
  });

  const repoRoot = path.resolve(__dirname, '../../');
  const articlesToDelete: number[] = [];

  for (const article of articlesWithGithubPath) {
    if (article.githubPath) {
      const fullPath = path.join(repoRoot, article.githubPath);
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Datei fehlt: "${article.title}" → ${article.githubPath}`);
        articlesToDelete.push(article.id);
      }
    }
  }

  if (articlesToDelete.length > 0) {
    // Lösche zuerst alle abhängigen Daten
    for (const articleId of articlesToDelete) {
      // Lösche Media
      await prisma.cerebroMedia.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche External Links
      await prisma.cerebroExternalLink.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Task-Verbindungen
      await prisma.taskCerebroCarticle.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Request-Verbindungen
      await prisma.requestCerebroCarticle.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Notifications
      await prisma.notification.deleteMany({
        where: { carticleId: articleId }
      });
      
      // Lösche Tag-Verbindungen (Many-to-Many)
      await prisma.$executeRaw`
        DELETE FROM "_CerebroCarticleToCerebroTag" WHERE "A" = ${articleId}
      `;
    }

    // Jetzt können die Artikel gelöscht werden
    await prisma.cerebroCarticle.deleteMany({
      where: {
        id: { in: articlesToDelete }
      }
    });
    console.log(`\n✅ ${articlesToDelete.length} Artikel mit fehlenden Dateien entfernt\n`);
    return articlesToDelete.length;
  } else {
    console.log(`✅ Keine Artikel mit fehlenden Dateien gefunden\n`);
    return 0;
  }
}

/**
 * Phase 5: Importiert alle fehlenden Markdown-Dateien
 */
async function importMissingFiles(markdownFolderId: number, adminUserId: number): Promise<number> {
  console.log('\n📋 Phase 5: Importiere fehlende Markdown-Dateien...\n');

  // Finde alle existierenden githubPath-Werte
  const existingArticles = await prisma.cerebroCarticle.findMany({
    where: {
      githubPath: { not: null }
    },
    select: {
      githubPath: true
    }
  });

  const existingPaths = new Set(existingArticles.map(a => a.githubPath).filter(Boolean) as string[]);

  // Finde alle lokalen Markdown-Dateien
  const repoRoot = path.resolve(__dirname, '../../');
  const docsDir = path.join(repoRoot, 'docs');
  const allMdFiles: string[] = [];

  if (fs.existsSync(docsDir)) {
    findAllMarkdownFiles(docsDir, repoRoot, allMdFiles);
  }

  // Prüfe auch README.md im Root
  const readmePath = path.join(repoRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    allMdFiles.push('README.md');
  }

  // Filtere fehlende Dateien
  const missingFiles = allMdFiles.filter(file => !existingPaths.has(file));

  console.log(`📊 Gefunden: ${missingFiles.length} fehlende Dateien\n`);

  let importedCount = 0;

  // Importiere README.md zuerst
  if (missingFiles.includes('README.md')) {
    await importMarkdownFile('README.md', markdownFolderId, adminUserId);
    importedCount++;
  }

  // Importiere alle anderen Dateien
  for (const file of missingFiles) {
    if (file !== 'README.md') {
      await importMarkdownFile(file, markdownFolderId, adminUserId);
      importedCount++;
    }
  }

  console.log(`\n✅ ${importedCount} Dateien importiert\n`);
  return importedCount;
}

/**
 * Importiert eine Markdown-Datei
 */
async function importMarkdownFile(
  filePath: string,
  markdownFolderId: number,
  adminUserId: number
): Promise<void> {
  try {
    const repoRoot = path.resolve(__dirname, '../../');
    const fullPath = path.join(repoRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Datei nicht gefunden: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const fileName = path.basename(filePath, '.md');
    
    // Erstelle Titel aus Dateinamen
    const title = fileName
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Bestimme Parent basierend auf Verzeichnisstruktur
    const dirPath = path.dirname(filePath);
    let parentId = markdownFolderId;

    // Wenn Datei in einem Unterverzeichnis ist, erstelle/finde Unterordner
    if (dirPath && dirPath !== '.' && dirPath !== 'docs') {
      const relativeDir = dirPath.replace(/^docs\//, ''); // Entferne 'docs/' Präfix
      if (relativeDir && relativeDir !== 'docs') {
        // Erstelle Ordnerstruktur basierend auf Verzeichnis
        const dirParts = relativeDir.split(path.sep);
        let currentParentId = markdownFolderId;
        
        for (const dirPart of dirParts) {
          const folderName = dirPart
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          currentParentId = await getOrCreateSubFolder(folderName, currentParentId, adminUserId);
        }
        
        parentId = currentParentId;
      }
    }

    const slug = await createUniqueSlug(title);

    // Prüfe, ob bereits vorhanden
    const existing = await prisma.cerebroCarticle.findFirst({
      where: {
        OR: [
          { githubPath: filePath },
          { slug }
        ]
      }
    });

    if (existing) {
      // Aktualisiere bestehenden Artikel
      await prisma.cerebroCarticle.update({
        where: { id: existing.id },
        data: {
          content,
          parentId,
          githubPath: filePath,
          isPublished: true
        }
      });
      console.log(`✅ Aktualisiert: ${title}`);
    } else {
      // Erstelle neuen Artikel
      await prisma.cerebroCarticle.create({
        data: {
          title,
          content,
          slug,
          parentId,
          createdById: adminUserId,
          isPublished: true,
          githubPath: filePath
        }
      });
      console.log(`➕ Erstellt: ${title}`);
    }
  } catch (error) {
    console.error(`❌ Fehler beim Importieren von ${filePath}:`, error);
  }
}

/**
 * Hauptfunktion
 */
async function fixCerebroComplete() {
  try {
    console.log('='.repeat(100));
    console.log('\n🔧 VOLLSTÄNDIGE CEREBRO-STRUKTUR-KORREKTUR\n');
    console.log('='.repeat(100));

    // Finde Admin-User
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: 1 },
          { username: 'admin' }
        ]
      }
    });

    if (!adminUser) {
      throw new Error('Kein Admin-User gefunden!');
    }

    console.log(`\n👤 Verwende Admin-User: ${adminUser.username} (ID: ${adminUser.id})\n`);

    // Erstelle oder finde Markdown-Ordner
    const markdownFolderId = await getOrCreateMarkdownFolder(adminUser.id);

    // Phase 1: Entferne Duplikate
    const duplicatesRemoved = await removeDuplicates(markdownFolderId);

    // Phase 2: Entferne Test-Artikel
    const testArticlesRemoved = await removeTestArticles(markdownFolderId);

    // Phase 3: Korrigiere Struktur
    const articlesMoved = await fixStructure(markdownFolderId);

    // Phase 4: Entferne Artikel mit fehlenden Dateien
    const missingFilesRemoved = await removeArticlesWithMissingFiles(markdownFolderId);

    // Phase 5: Importiere fehlende Dateien
    const filesImported = await importMissingFiles(markdownFolderId, adminUser.id);

    // Finale Statistik
    const finalStats = await prisma.cerebroCarticle.groupBy({
      by: ['parentId'],
      _count: true
    });

    const rootArticles = await prisma.cerebroCarticle.count({
      where: { parentId: null }
    });

    const articlesInMarkdownFolder = await prisma.cerebroCarticle.count({
      where: { parentId: markdownFolderId }
    });

    console.log('='.repeat(100));
    console.log('\n📊 ZUSAMMENFASSUNG:\n');
    console.log(`   ❌ Duplikate entfernt: ${duplicatesRemoved}`);
    console.log(`   ❌ Test-Artikel entfernt: ${testArticlesRemoved}`);
    console.log(`   📁 Artikel verschoben: ${articlesMoved}`);
    console.log(`   ❌ Artikel mit fehlenden Dateien entfernt: ${missingFilesRemoved}`);
    console.log(`   ➕ Dateien importiert: ${filesImported}`);
    console.log(`\n   📊 Finale Statistik:`);
    console.log(`      - Root-Artikel (Standalone): ${rootArticles - 1} (ohne Markdown-Ordner)`);
    console.log(`      - Artikel im Markdown-Ordner: ${articlesInMarkdownFolder}`);
    console.log(`      - Gesamt Artikel: ${rootArticles + articlesInMarkdownFolder}`);
    console.log('\n' + '='.repeat(100));
    console.log('\n✅ VOLLSTÄNDIGE KORREKTUR ABGESCHLOSSEN!\n');

  } catch (error) {
    console.error('❌ Fehler bei der Korrektur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Korrektur
fixCerebroComplete().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

