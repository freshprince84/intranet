/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
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
  'claude', // Claude-spezifische Dokumente
  'implementation_plans',
  'implementation_reports',
  'analysis',
  'systemDocTemplates'
];

/**
 * Erstellt einen eindeutigen Slug
 */
async function createUniqueSlug(title: string): Promise<string> {
  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.cerebroCarticle.findUnique({
      where: { slug }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Findet alle Markdown-Dateien im docs-Verzeichnis
 */
function findAllMarkdownFiles(dir: string, baseDir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      // Prüfe, ob Verzeichnis ausgeschlossen werden soll
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
 * Importiert README.md aus dem Root
 */
async function importReadme(markdownFolderId: number, adminUserId: number): Promise<void> {
  const readmePath = path.resolve(__dirname, '../../README.md');
  
  if (fs.existsSync(readmePath)) {
    await importMarkdownFile('README.md', markdownFolderId, adminUserId);
  }
}

/**
 * Hauptfunktion
 */
async function importAllDocsToCerebro() {
  try {
    console.log('📚 Starte Import aller Dokumentationsdateien...\n');

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

    console.log(`👤 Verwende Admin-User: ${adminUser.username} (ID: ${adminUser.id})\n`);

    // Erstelle oder finde Markdown-Ordner
    const markdownFolderId = await getOrCreateMarkdownFolder(adminUser.id);
    console.log(`📁 Markdown-Ordner ID: ${markdownFolderId}\n`);

    // Finde alle Markdown-Dateien
    const repoRoot = path.resolve(__dirname, '../../');
    const docsDir = path.join(repoRoot, 'docs');
    const allMdFiles: string[] = [];

    if (fs.existsSync(docsDir)) {
      findAllMarkdownFiles(docsDir, repoRoot, allMdFiles);
    }

    console.log(`📊 Gefunden: ${allMdFiles.length} Markdown-Dateien in docs/\n`);

    // Importiere README.md
    await importReadme(markdownFolderId, adminUser.id);
    console.log('');

    // Importiere alle Dateien aus docs/
    for (const file of allMdFiles) {
      await importMarkdownFile(file, markdownFolderId, adminUser.id);
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n✅ Import abgeschlossen!\n');
    console.log(`   📁 Markdown-Ordner: Intranet - Überblick`);
    console.log(`   📄 Importierte Dateien: ${allMdFiles.length + 1} (inkl. README.md)`);
    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Import
importAllDocsToCerebro().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});





