import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

// Konfiguration der zu importierenden Dateien
const dateien = [
  { pfad: '../../README.md', title: 'Intranet - Überblick', parentSlug: null },
  { pfad: '../../PROJECT_SETUP.md', title: 'Projekteinrichtung', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../DB_SCHEMA.md', title: 'Datenbankschema', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../BACKEND_SETUP.md', title: 'Backend Setup', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../FRONTEND_SETUP.md', title: 'Frontend Setup', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../API_INTEGRATION.md', title: 'API Integration', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../CEREBRO_WIKI.md', title: 'Cerebro Dokumentation', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../CHANGELOG.md', title: 'Änderungshistorie', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../ROLE_SWITCH.md', title: 'Rollenwechsel-Funktionalität', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../PAYROLL_INTEGRATION_CH_CO.md', title: 'Lohnabrechnung Integration', parentSlug: 'intranet-ueberblick' },
  { pfad: '../../repo_str', title: 'Repository-Struktur', parentSlug: 'intranet-ueberblick' },
];

// Benutzerhandbuch-Objekt
const benutzerhandbuch = {
  title: 'Benutzerhandbuch Intranet',
  content: `# Benutzerhandbuch für das Intranet

## Übersicht
Dieses Benutzerhandbuch enthält alle wichtigen Informationen zur Verwendung des Intranets. Hier finden Sie Anleitungen zu allen Funktionen und Bereichen.

## Navigation im Intranet
Das Intranet ist in verschiedene Bereiche unterteilt, die über die Hauptnavigation erreichbar sind:

1. **Dashboard** - Zeigt eine Übersicht wichtiger Informationen und Neuigkeiten
2. **Cerebro** - Wissensdatenbank mit Artikeln und Dokumentation
3. **Kalender** - Termine und Veranstaltungen planen und einsehen
4. **Aufgaben** - Aufgabenverwaltung und Projektverfolgung
5. **Anfragen** - Anfragen stellen und verfolgen
6. **Admin** - Verwaltungsfunktionen (nur für Administratoren)

## Cerebro verwenden
Cerebro ist die zentrale Wissensdatenbank des Intranets. Hier können Sie:
- Artikel lesen und durchsuchen
- Neue Artikel erstellen (mit entsprechender Berechtigung)
- Bestehende Artikel bearbeiten (mit entsprechender Berechtigung)
- Artikel mit Tags organisieren
- Medien und externe Links hinzufügen

### Artikel erstellen
1. Navigieren Sie zu Cerebro
2. Klicken Sie auf "Neuer Artikel"
3. Geben Sie Titel und Inhalt ein
4. Optional: Wählen Sie einen übergeordneten Artikel aus
5. Klicken Sie auf "Speichern"

### Medien hinzufügen
1. Wählen Sie bei der Bearbeitung eines Artikels "Medien hinzufügen"
2. Laden Sie Dateien hoch oder wählen Sie bestehende Medien aus
3. Die Medien können dann im Artikel verlinkt werden

## Kalender verwenden
Im Kalender können Sie:
- Termine einsehen
- Neue Termine erstellen
- Termine bearbeiten und löschen
- Nach Terminen filtern und suchen

## Aufgabenverwaltung
In der Aufgabenverwaltung können Sie:
- Aufgaben erstellen und zuweisen
- Aufgaben nach Status filtern
- Aufgaben kommentieren und aktualisieren
- Aufgaben abschließen

## Anfragen stellen
Über das Anfragenmodul können Sie:
- Neue Anfragen erstellen
- Bestehende Anfragen einsehen
- Anfragen kommentieren und aktualisieren
- Anfragen abschließen

## Profilverwalzung
Um Ihr Profil zu verwalten:
1. Klicken Sie auf Ihren Namen in der oberen rechten Ecke
2. Wählen Sie "Profil bearbeiten"
3. Aktualisieren Sie Ihre Informationen
4. Passen Sie Ihre Benachrichtigungseinstellungen an

## Hilfe und Support
Bei Fragen oder Problemen:
1. Überprüfen Sie die Dokumentation in Cerebro
2. Kontaktieren Sie den Support über das Anfragenmodul
3. Wenden Sie sich an einen Administrator

Dieses Handbuch wird regelmäßig aktualisiert, um neue Funktionen und Verbesserungen zu dokumentieren.`,
  parentSlug: null
};

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
        },
      });
      console.log(`Neuer Artikel erstellt: ${title}`);
    }
  } catch (error) {
    console.error(`Fehler beim Importieren der Datei:`, error);
  }
}

/**
 * Erstellt oder aktualisiert das Benutzerhandbuch
 */
async function erstelleBenutzerhandbuch() {
  try {
    const { title, content } = benutzerhandbuch;
    const slug = await erstelleEindeutigenSlug(title);
    
    // Prüfen, ob Handbuch bereits existiert
    const existierendesHandbuch = await prisma.cerebroCarticle.findFirst({
      where: { title },
    });
    
    if (existierendesHandbuch) {
      // Handbuch aktualisieren
      await prisma.cerebroCarticle.update({
        where: { id: existierendesHandbuch.id },
        data: {
          content,
          isPublished: true,
        },
      });
      console.log(`Benutzerhandbuch aktualisiert`);
    } else {
      // Neues Handbuch erstellen
      await prisma.cerebroCarticle.create({
        data: {
          title,
          content,
          slug,
          createdById: 1, // System-Benutzer ID
          isPublished: true,
        },
      });
      console.log(`Benutzerhandbuch erstellt`);
    }
  } catch (error) {
    console.error(`Fehler beim Erstellen des Benutzerhandbuchs:`, error);
  }
}

/**
 * Importiert alle Dokumentationsdateien
 */
async function importiereDokumentation() {
  console.log('Starte Import der Dokumentationsdateien...');
  
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
    
    // Benutzerhandbuch erstellen
    await erstelleBenutzerhandbuch();
    
    console.log('Import abgeschlossen!');
  } catch (error) {
    console.error('Fehler beim Import der Dokumentation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Starte den Import
importiereDokumentation()
  .then(() => console.log('Dokumentationsimport erfolgreich abgeschlossen!'))
  .catch((error) => console.error('Fehler beim Dokumentationsimport:', error)); 