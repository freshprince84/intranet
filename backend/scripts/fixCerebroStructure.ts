/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

/**
 * Erstellt oder findet den Markdown-Überordner
 */
async function getOrCreateMarkdownFolder(adminUserId: number): Promise<number> {
  // Suche nach existierendem Markdown-Ordner
  const existing = await prisma.cerebroCarticle.findFirst({
    where: {
      OR: [
        { title: 'Intranet - Überblick' },
        { title: 'Markdown-Dateien' },
        { slug: 'intranet-ueberblick' },
        { slug: 'markdown-folder' }
      ],
      parentId: null // Muss Root-Artikel sein
    }
  });

  if (existing) {
    console.log(`✅ Markdown-Ordner gefunden: "${existing.title}" (ID: ${existing.id})`);
    return existing.id;
  }

  // Erstelle neuen Markdown-Ordner
  const slug = await createUniqueSlug('Intranet - Überblick');
  const newFolder = await prisma.cerebroCarticle.create({
    data: {
      title: 'Intranet - Überblick',
      content: '# Intranet - Überblick\n\nDieser Ordner enthält alle Dokumentationsartikel aus dem Git-Repository.',
      slug: slug,
      parentId: null,
      createdById: adminUserId,
      isPublished: true,
      position: 1 // Erste Position für den Überordner
    }
  });

  console.log(`✅ Markdown-Ordner erstellt: "${newFolder.title}" (ID: ${newFolder.id})`);
  return newFolder.id;
}

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
 * Korrigiert die Cerebro-Struktur
 */
async function fixCerebroStructure() {
  try {
    console.log('🔧 Starte Korrektur der Cerebro-Struktur...\n');

    // Finde Admin-User (ID 1 oder ersten User)
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
    console.log('');

    // Hole alle Artikel
    const allArticles = await prisma.cerebroCarticle.findMany({
      where: {
        id: { not: markdownFolderId } // Markdown-Ordner selbst ausschließen
      }
    });

    console.log(`📊 Gefunden: ${allArticles.length} Artikel zum Prüfen\n`);

    let movedCount = 0;
    let standaloneCount = 0;
    let alreadyCorrectCount = 0;

    // Kategorisiere und korrigiere Artikel
    for (const article of allArticles) {
      const hasGithubPath = article.githubPath !== null && article.githubPath !== '';
      const isRoot = article.parentId === null;
      const isInMarkdownFolder = article.parentId === markdownFolderId;

      if (hasGithubPath) {
        // Artikel mit githubPath sollten im Markdown-Ordner sein
        if (!isInMarkdownFolder) {
          await prisma.cerebroCarticle.update({
            where: { id: article.id },
            data: {
              parentId: markdownFolderId,
              position: null // Position wird automatisch sortiert
            }
          });
          console.log(`📁 Verschoben: "${article.title}" → Markdown-Ordner`);
          movedCount++;
        } else {
          console.log(`✅ Bereits korrekt: "${article.title}" (im Markdown-Ordner)`);
          alreadyCorrectCount++;
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
        } else {
          console.log(`✅ Bereits korrekt: "${article.title}" (Standalone)`);
          standaloneCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n📊 ZUSAMMENFASSUNG:\n');
    console.log(`   ✅ Artikel korrekt verschoben: ${movedCount}`);
    console.log(`   ✅ Artikel bereits korrekt: ${alreadyCorrectCount + standaloneCount}`);
    console.log(`   📁 Artikel im Markdown-Ordner: ${allArticles.filter(a => a.githubPath && a.parentId === markdownFolderId).length}`);
    console.log(`   📄 Standalone-Artikel: ${allArticles.filter(a => !a.githubPath && a.parentId === null).length}`);
    console.log('\n' + '='.repeat(100));
    console.log('\n✅ Struktur-Korrektur abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler bei der Struktur-Korrektur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Korrektur
fixCerebroStructure().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

