/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

// Konfiguration der neu erstellten Dateien
const neueDateien = [
  { pfad: '../../BENUTZERHANDBUCH.md', title: 'Benutzerhandbuch', parentSlug: null },
  { pfad: '../../ADMINISTRATORHANDBUCH.md', title: 'Administratorhandbuch', parentSlug: null },
  { pfad: '../../ENTWICKLUNGSUMGEBUNG.md', title: 'Entwicklungsumgebung', parentSlug: null },
  { pfad: '../../ARCHITEKTUR.md', title: 'Architektur', parentSlug: null },
  { pfad: '../../API_REFERENZ.md', title: 'API-Referenz', parentSlug: null },
  { pfad: '../../DATENBANKSCHEMA.md', title: 'Datenbankschema', parentSlug: null },
  { pfad: '../../BERECHTIGUNGSSYSTEM.md', title: 'Berechtigungssystem', parentSlug: null },
  { pfad: '../../DEPLOYMENT.md', title: 'Deployment', parentSlug: null },
];

/**
 * Erstellt einen eindeutigen Slug basierend auf dem vorgeschlagenen Titel
 */
async function erstelleEindeutigenSlug(vorschlag: string, id?: number): Promise<string> {
  // Erstelle einen Basis-Slug
  let slug = slugify(vorschlag, {
    lower: true,
    strict: true,
    locale: 'de'
  });
  
  // Finde alle Artikel mit ähnlichem Slug
  const existierendeArtikel = await prisma.cerebroCarticle.findMany({
    where: {
      slug: {
        startsWith: slug
      },
      NOT: id ? { id } : undefined
    }
  });
  
  // Wenn keine Konflikte existieren, gib den Basis-Slug zurück
  if (existierendeArtikel.length === 0) {
    return slug;
  }
  
  // Füge eine Nummer hinzu, um den Slug eindeutig zu machen
  return `${slug}-${existierendeArtikel.length + 1}`;
}

/**
 * Importiert eine Dokumentationsdatei in die Datenbank
 */
async function importiereDokumentationsdatei(config: { pfad: string; title: string; parentSlug: string | null }) {
  try {
    const { pfad, title, parentSlug } = config;
    const filePath = path.resolve(__dirname, pfad);
    
    // Datei einlesen
    if (!fs.existsSync(filePath)) {
      console.log(`Datei nicht gefunden: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const slug = await erstelleEindeutigenSlug(title);
    
    // Parent ID ermitteln, wenn parentSlug vorhanden ist
    let parentId: number | null = null;
    if (parentSlug) {
      const parent = await prisma.cerebroCarticle.findFirst({
        where: { slug: parentSlug },
      });
      
      parentId = parent?.id ?? null;
    }
    
    // Prüfen, ob Artikel bereits existiert (anhand des Titels)
    const existierenderArtikel = await prisma.cerebroCarticle.findFirst({
      where: { title },
    });
    
    if (existierenderArtikel) {
      // Artikel aktualisieren
      await prisma.cerebroCarticle.update({
        where: { id: existierenderArtikel.id },
        data: {
          content,
          parentId,
          isPublished: true,
          githubPath: pfad.replace('../../', ''), // GitHub-Pfad auf den Dateipfad setzen
        },
      });
      console.log(`Artikel aktualisiert: ${title}`);
    } else {
      // Neuen Artikel erstellen
      await prisma.cerebroCarticle.create({
        data: {
          title,
          content,
          slug,
          parentId,
          createdById: 1, // Admin-Benutzer ID
          isPublished: true,
          githubPath: pfad.replace('../../', ''), // GitHub-Pfad auf den Dateipfad setzen
        },
      });
      console.log(`Neuer Artikel erstellt: ${title}`);
    }
  } catch (error) {
    console.error(`Fehler beim Importieren der Datei:`, error);
  }
}

/**
 * Importiert alle neuen Dokumentationsdateien
 */
async function importiereNeueDokumentation() {
  try {
    // Überprüfe Admin-Benutzer
    const adminUser = await prisma.user.findFirst({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      console.error('Admin-Benutzer nicht gefunden. Bitte stelle sicher, dass der Seed ausgeführt wurde.');
      return;
    }

    console.log('Starte Import neuer Dokumentationsdateien...');
    
    // Überprüfen, ob der "Markdown-Dateien" Ordner existiert und ihn erstellen, falls nicht
    let markdownFolder = await prisma.cerebroCarticle.findFirst({
      where: { slug: 'markdown-folder' }
    });
    
    if (!markdownFolder) {
      markdownFolder = await prisma.cerebroCarticle.create({
        data: {
          title: 'Markdown-Dateien',
          slug: 'markdown-folder',
          content: 'Sammlung wichtiger Dokumentationsdateien aus dem GitHub Repository.',
          createdById: adminUser.id,
          isPublished: true
        }
      });
      console.log('Markdown-Ordner erstellt');
    }
    
    // Importiere jede Dokumentationsdatei
    for (const datei of neueDateien) {
      const parentSlug = datei.parentSlug || 'markdown-folder';
      await importiereDokumentationsdatei({
        ...datei,
        parentSlug
      });
    }
    
    console.log('Import abgeschlossen');
  } catch (error) {
    console.error('Fehler beim Importieren der Dokumentation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Import
importiereNeueDokumentation().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
}); 