/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

/**
 * Erstellt die spanische Schichtplaner-Guía als Cerebro-Artikel auf oberster Ebene
 */
async function createSchichtplanerGuia() {
  try {
    console.log('📚 Erstelle spanische Schichtplaner-Guía als Cerebro-Artikel...\n');

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

    // Lese die Guía-Datei
    // __dirname zeigt auf dist/scripts/ oder scripts/, daher ../../../ führt zum Root
    // Auf Server: /var/www/intranet/backend/dist/scripts/ -> ../../../ -> /var/www/intranet/
    // Lokal: backend/dist/scripts/ -> ../../../ -> Root
    const repoRoot = path.resolve(__dirname, '../../../');
    let guiaPath = path.join(repoRoot, 'docs/implementation_plans/SCHICHTPLANER_GUIA_USUARIO_ES.md');
    
    // Fallback: Wenn nicht gefunden, versuche direkt im intranet-Verzeichnis (für Server)
    if (!fs.existsSync(guiaPath)) {
      const altPath = path.join(repoRoot, 'intranet/docs/implementation_plans/SCHICHTPLANER_GUIA_USUARIO_ES.md');
      if (fs.existsSync(altPath)) {
        guiaPath = altPath;
      }
    }
    
    if (!fs.existsSync(guiaPath)) {
      throw new Error(`Datei nicht gefunden: ${guiaPath}`);
    }

    const content = fs.readFileSync(guiaPath, 'utf8');
    const title = 'Guía Completa del Usuario - Planificador de Turnos';
    const slug = slugify(title, { lower: true, strict: true });

    console.log(`📄 Titel: ${title}`);
    console.log(`🔗 Slug: ${slug}\n`);

    // Prüfe, ob Artikel bereits existiert
    const existing = await prisma.cerebroCarticle.findFirst({
      where: {
        OR: [
          { slug },
          { title }
        ]
      }
    });

    if (existing) {
      // Aktualisiere bestehenden Artikel
      await prisma.cerebroCarticle.update({
        where: { id: existing.id },
        data: {
          content,
          parentId: null, // Oberste Ebene
          isPublished: true,
          updatedById: adminUser.id
        }
      });
      console.log(`✅ Artikel aktualisiert: ${title}`);
      console.log(`   ID: ${existing.id}`);
      console.log(`   URL: /cerebro/${slug}`);
    } else {
      // Erstelle neuen Artikel
      const newArticle = await prisma.cerebroCarticle.create({
        data: {
          title,
          content,
          slug,
          parentId: null, // Oberste Ebene (kein Parent)
          createdById: adminUser.id,
          isPublished: true
        }
      });
      console.log(`➕ Neuer Artikel erstellt: ${title}`);
      console.log(`   ID: ${newArticle.id}`);
      console.log(`   URL: /cerebro/${slug}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n✅ Spanische Schichtplaner-Guía erfolgreich erstellt/aktualisiert!\n');
    console.log(`   📍 Position: Oberste Ebene (Root-Level)`);
    console.log(`   🔗 Zugriff: /cerebro/${slug}`);
    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Guía:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Erstellung
createSchichtplanerGuia().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

