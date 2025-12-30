import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

// Konfiguration der zu importierenden Dateien
const dateien = [
  // Hauptdokumente
  { pfad: '../../README.md', title: 'Intranet - Überblick', parentSlug: null },
  { pfad: '../../DOKUMENTATIONSSTANDARDS.md', title: 'Dokumentationsstandards', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../CHANGELOG.md', title: 'Änderungshistorie', parentSlug: 'intranet-ueberblick' },
  
  // Nutzerorientierte Dokumentation
  { pfad: '../../BENUTZERHANDBUCH.md', title: 'Benutzerhandbuch', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../ADMINISTRATORHANDBUCH.md', title: 'Administratorhandbuch', parentSlug: 'intranet-ueberblick' },
  
  // Entwicklungsdokumentation
  { pfad: '../../ENTWICKLUNGSUMGEBUNG.md', title: 'Entwicklungsumgebung', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../ARCHITEKTUR.md', title: 'Systemarchitektur', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../CODING_STANDARDS.md', title: 'Programmierrichtlinien', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../DESIGN_STANDARDS.md', title: 'UI/UX-Designrichtlinien', parentSlug: 'intranet-ueberblick' },
  
  // Technische Spezifikationen
  { pfad: '../../API_REFERENZ.md', title: 'API-Referenz', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../DATENBANKSCHEMA.md', title: 'Datenbankschema', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../BERECHTIGUNGSSYSTEM.md', title: 'Berechtigungssystem', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../DEPLOYMENT.md', title: 'Deployment', parentSlug: 'intranet-ueberblick' },
  
  // Modulspezifische Dokumentation
  { pfad: '../../MODUL_ZEITERFASSUNG.md', title: 'Modul: Zeiterfassung', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../MODUL_CEREBRO.md', title: 'Modul: Cerebro Wiki', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../MODUL_TEAMKONTROLLE.md', title: 'Modul: Team-Worktime-Control', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../MODUL_ABRECHNUNG.md', title: 'Modul: Lohnabrechnung', parentSlug: 'intranet-ueberblick' },
];

/**
 * Erstellt einen eindeutigen Slug für einen Artikel
 */
async function erstelleEindeutigenSlug(vorschlag: string, id?: number): Promise<string> {
  let slug = slugify(vorschlag, { lower: true, strict: true });
  let eindeutigerSlug = slug;
  let counter = 0;

  // Prüfen ob Slug bereits existiert (außer bei dem zu aktualisierenden Artikel)
  let existiert = true;
  while (existiert) {
    const vorhandenerArtikel = await prisma.cerebroCarticle.findFirst({
      where: {
        slug: eindeutigerSlug,
        ...(id ? { id: { not: id } } : {}),
      },
    });

    if (!vorhandenerArtikel) {
      existiert = false;
    } else {
      counter++;
      eindeutigerSlug = `${slug}-${counter}`;
    }
  }

  return eindeutigerSlug;
}

/**
 * Importiert eine einzelne Dokumentationsdatei als Cerebro-Artikel
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
          githubPath: pfad,
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
          createdById: 1, // System-Benutzer ID
          isPublished: true,
          githubPath: pfad,
        },
      });
      console.log(`Neuer Artikel erstellt: ${title}`);
    }
  } catch (error) {
    console.error(`Fehler beim Importieren der Datei:`, error);
  }
}

/**
 * Importiert alle Dokumentationsdateien
 */
async function importiereNeueDoku() {
  console.log('Starte Import der neuen Dokumentationsdateien...');
  
  try {
    // Zuerst den Überblick-Artikel importieren
    const ueberblickDatei = dateien.find(d => d.title === 'Intranet - Überblick');
    if (ueberblickDatei) {
      await importiereDokumentationsdatei(ueberblickDatei);
    }
    
    // Dann alle anderen Dateien importieren
    for (const datei of dateien) {
      if (datei.title !== 'Intranet - Überblick') {
        await importiereDokumentationsdatei(datei);
      }
    }
    
    console.log('Import abgeschlossen!');
  } catch (error) {
    console.error('Fehler beim Importieren der Dokumentation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Skript ausführen
importiereNeueDoku()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 