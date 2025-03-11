# Cerebro Wiki System

## Über Cerebro Wiki

Das Cerebro Wiki ist ein internes Wissensmanagementsystem, das als zentrale Wissensdatenbank für das Unternehmen dient. Hier finden Mitarbeiter wichtige Dokumentationen, Anleitungen und Ressourcen.

### Wie man das Wiki verwendet

- **Artikel finden**: Über die hierarchische Struktur im Navigationsbereich, die Suchfunktion oder die Liste kürzlich aktualisierter Artikel
- **Artikel erstellen und bearbeiten**: Über den "+ Neuer Artikel" Button und den "Bearbeiten"-Button in der Artikelansicht (bei entsprechenden Berechtigungen)

### Empfohlene Wiki-Struktur

1. **Unternehmensinformationen**: Leitbild, Organisationsstruktur, Standorte
2. **Abteilungsdokumentationen**: HR, IT, Finanzen, Marketing
3. **Projektdokumentationen**: Aktuelle und abgeschlossene Projekte, Best Practices
4. **Prozesse und Richtlinien**: Unternehmensrichtlinien, Sicherheitsvorschriften
5. **Technische Dokumentationen**: Systemarchitektur, Handbücher

### Tipps für gute Wiki-Artikel
- Klare Struktur mit Überschriften
- Visuelle Hilfsmittel (Bilder, Diagramme)
- Aktuelle Informationen
- Verknüpfung verwandter Artikel
- Einbindung von Medien und externen Ressourcen

## Technische Details

### Berechtigungssystem

Das Cerebro Wiki verwendet ein rollenbasiertes Berechtigungssystem. Für den vollen Zugriff auf alle Funktionen werden folgende Berechtigungen benötigt:

1. **cerebro** (entityType: 'cerebro'): Grundlegende Berechtigung für das Erstellen und Bearbeiten von Artikeln
2. **cerebro_media** (entityType: 'cerebro'): Berechtigung zum Hochladen und Verwalten von Medien
3. **cerebro_links** (entityType: 'cerebro'): Berechtigung zum Hinzufügen und Verwalten von externen Links

Diese Berechtigungen können die folgenden Zugriffsebenen haben:
- **read**: Nur Lesezugriff
- **write**: Schreibzugriff (beinhaltet auch Lesezugriff)
- **both**: Voller Zugriff

### Berechtigungen für die Admin-Rolle

Die Admin-Rolle sollte standardmäßig alle Berechtigungen mit Zugriffsebene 'both' haben. Falls der "Neuer Artikel" Button nicht angezeigt wird, prüfen Sie die Berechtigungen mit folgendem Skript:

```typescript
// Führen Sie dieses Skript aus, um die Berechtigungen für die Admin-Rolle zu erstellen
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createAdditionalPermissions() {
  try {
    // Array aller benötigten Berechtigungen für Cerebro
    const requiredPermissions = [
      { entity: 'cerebro', entityType: 'cerebro', accessLevel: 'both' }, // Hauptberechtigung
      { entity: 'cerebro_media', entityType: 'cerebro', accessLevel: 'both' }, // Medienberechtigung
      { entity: 'cerebro_links', entityType: 'cerebro', accessLevel: 'both' }, // Linksberechtigung
    ];

    // Berechtigungen prüfen und hinzufügen...
  } catch (error) {
    console.error('Fehler:', error);
  }
}
```

Nach dem Hinzufügen neuer Berechtigungen müssen sich Benutzer ab- und wieder anmelden, damit die Änderungen wirksam werden.

## Funktionen

### Artikel

- Erstellen neuer Artikel
- Bearbeiten bestehender Artikel
- Hierarchische Organisation (Eltern-Kind-Beziehung)
- Suche nach Artikelinhalten
- Veröffentlichen/Verbergen von Artikeln

### Medien

- Hochladen von Dateien
- Einbinden von Medien in Artikel
- Verwaltung von Mediendateien

### Externe Links

- Hinzufügen von Links zu externen Ressourcen
- Organisation von Links nach Kategorien

## Frontend-Komponenten

### Hauptkomponenten

- **Cerebro.tsx**: Die Hauptkomponente mit dem Router
- **ArticleList.tsx**: Zeigt eine Liste aller Artikel an
- **ArticleView.tsx**: Zeigt einen einzelnen Artikel an
- **ArticleEdit.tsx**: Formular zum Erstellen/Bearbeiten von Artikeln
- **ArticleStructure.tsx**: Zeigt die hierarchische Struktur der Artikel
- **AddMedia.tsx**: Formular zum Hochladen von Medien
- **AddExternalLink.tsx**: Formular zum Hinzufügen externer Links

### Berechtigungsprüfung in Komponenten

In allen Komponenten werden Berechtigungen über den `usePermissions` Hook geprüft:

```typescript
// Beispiel:
const { hasPermission } = usePermissions();
const canCreateArticles = hasPermission('cerebro', 'write', 'cerebro');

// Rendering basierend auf Berechtigung
{canCreateArticles && (
  <button onClick={...}>Neuer Artikel</button>
)}
```

## Fehlerbehebung

### "Neuer Artikel" Button wird nicht angezeigt

1. Stellen Sie sicher, dass die Admin-Rolle die erforderlichen Berechtigungen hat
2. Überprüfen Sie, ob der Benutzer die Admin-Rolle hat und diese aktiv ist
3. Melden Sie sich ab und wieder an, um die Berechtigungen neu zu laden
4. Prüfen Sie die Browser-Konsole auf JavaScript-Fehler

### 500-Fehler beim API-Aufruf

1. Stellen Sie sicher, dass die `CerebroCarticle`-Tabelle in der Datenbank existiert
2. Überprüfen Sie die Server-Logs auf detaillierte Fehlermeldungen
3. Stellen Sie sicher, dass die Prisma-Schemas korrekt sind und die Datenbank synchronisiert ist

## Technische Implementierung

### Datenmodell

Das Datenmodell umfasst folgende Hauptentitäten:

1. **CerebroCarticle**: Repräsentiert einen Wiki-Artikel
   - Hierarchische Struktur durch Selbstreferenzierung (parentId)
   - Verknüpfungen zu Erstellern und Bearbeitern
   - Unterstützung für Tags

2. **CerebroMedia**: Speichert Mediendateien
   - Pfad zur Datei im Dateisystem
   - Metadaten wie MIME-Typ und Größe
   - Verknüpfung zum Artikel

3. **CerebroExternalLink**: Verwaltet externe Links
   - URL und Titel
   - Typ-Klassifizierung (Google Drive, YouTube, etc.)
   - Verknüpfung zum Artikel

4. **CerebroTag**: Ermöglicht die Kategorisierung von Artikeln

### API-Endpunkte

#### Artikel-Endpunkte
- `GET /api/cerebro/carticles` - Alle Artikel abrufen
- `GET /api/cerebro/carticles/:id` - Artikel nach ID abrufen
- `GET /api/cerebro/carticles/slug/:slug` - Artikel nach Slug abrufen
- `GET /api/cerebro/carticles/structure` - Hierarchische Struktur abrufen
- `GET /api/cerebro/carticles/search` - Artikel suchen
- `POST /api/cerebro/carticles` - Neuen Artikel erstellen
- `PUT /api/cerebro/carticles/:id` - Artikel aktualisieren
- `DELETE /api/cerebro/carticles/:id` - Artikel löschen

#### Medien-Endpunkte
- `POST /api/cerebro/media/upload` - Mediendatei hochladen
- `GET /api/cerebro/media/carticle/:carticleId` - Medien eines Artikels abrufen
- `GET /api/cerebro/media/:id` - Einzelne Mediendatei abrufen
- `PUT /api/cerebro/media/:id` - Mediendatei aktualisieren
- `DELETE /api/cerebro/media/:id` - Mediendatei löschen

#### Externe Links-Endpunkte
- `POST /api/cerebro/external-links` - Externen Link erstellen
- `GET /api/cerebro/external-links/carticle/:carticleId` - Links eines Artikels abrufen
- `GET /api/cerebro/external-links/:id` - Einzelnen Link abrufen
- `GET /api/cerebro/external-links/preview` - Vorschau für URL generieren
- `PUT /api/cerebro/external-links/:id` - Link aktualisieren
- `DELETE /api/cerebro/external-links/:id` - Link löschen

### Berechtigungssystem

Das Berechtigungssystem wurde erweitert, um spezifische Berechtigungen für das Cerebro Wiki-System zu unterstützen:

- `cerebro` - Hauptberechtigung für Artikel
- `cerebro_media` - Berechtigung für Medien-Management
- `cerebro_links` - Berechtigung für externe Links

Jede Berechtigung unterstützt die Zugriffsebenen `read` und `write`.

### Benachrichtigungen

Das System sendet automatisch Benachrichtigungen bei folgenden Ereignissen:
- Erstellung eines neuen Artikels
- Aktualisierung eines Artikels
- Löschung eines Artikels

Benutzer können ihre Benachrichtigungseinstellungen anpassen, um zu kontrollieren, welche Benachrichtigungen sie erhalten möchten.

## Frontend-Integration

Die Frontend-Integration erfolgt über die bestehenden React-Komponenten und Hooks:
- `useAuth` für die Authentifizierung
- `usePermissions` für die Berechtigungsprüfung

## Zukünftige Erweiterungen

- Versionsverlauf für Artikel
- Kommentarfunktion
- Erweiterte Formatierungsoptionen (Rich Text Editor)
- Erweiterte Statistiken und Nutzungsanalysen

### Fehlerbehebung bei 500 Errors

#### 500 Server-Fehler beim Abrufen von Artikelstruktur und Artikeln

Wenn Fehler wie diese auftreten:
```
GET http://localhost:5000/api/cerebro/carticles/structure 500 (Internal Server Error)
GET http://localhost:5000/api/cerebro/carticles 500 (Internal Server Error)
```

Mit Fehlermeldungen in der Benutzeroberfläche:
- "Fehler beim Laden der Navigationsstruktur."
- "Fehler beim Laden der Artikel. Bitte versuchen Sie es später erneut."

Mögliche Ursachen und Lösungen:

1. **Fehlende Datenbanktabelle** (Hauptursache):
   - Die Tabelle `CerebroCarticle` existiert nicht in der Datenbank.
   - Fehlercode: `P2021` - "The table does not exist in the current database"
   - Lösung: Die Tabelle muss in der Datenbank angelegt werden.
   ```bash
   # Führen Sie einen der folgenden Befehle aus:
   npx prisma db push   # Wenn Sie eine neue Datenbank aufsetzen
   # ODER
   npx prisma migrate dev --name add_cerebro_tables  # Für bestehende Projekte
   ```
   - Überprüfen Sie in Prisma Studio, ob die `CerebroCarticle`-Tabelle vorhanden ist.
   - **GELÖST**: Die Tabelle wurde erfolgreich mit `npx prisma db push` erstellt und alle Controller-Methoden wurden auf Prisma ORM umgestellt.

2. **Controller-Methoden**:
   - Folgende Methoden wurden erfolgreich auf Prisma ORM umgestellt:
     - `getArticlesStructure` - Strukturbaum der Artikel
     - `getAllArticles` - Liste aller Artikel
     - `getArticleById` - Einzelner Artikel nach ID
     - `getArticleBySlug` - Einzelner Artikel nach Slug
     - `createUniqueSlug` - Hilfsfunktion für eindeutige Slugs
     - `searchArticles` - Suche nach Artikeln

3. **Inkonsistente API-Endpunkte**:
   - Stellen Sie sicher, dass die API-Pfade in Frontend und Backend übereinstimmen:
     - Backend-Routen sollten `/carticles/*` verwenden
     - Frontend-Aufrufe sollten `/cerebro/carticles/*` verwenden

4. **Debugging der 500-Fehler**:
   - Falls weiterhin 500-Fehler auftreten sollten, ist ein schrittweises Vorgehen empfehlenswert:
     1. Überprüfen Sie die Server-Logs für detaillierte Fehlermeldungen
     2. Testen Sie die API-Endpunkte direkt mit einem Tool wie Postman
     3. Vereinfachen Sie gegebenenfalls die Controller-Methoden, um die Fehlerquelle zu isolieren
     4. Überprüfen Sie alle Beziehungen und Joins, die in den Abfragen verwendet werden

#### Vorschläge für robustere Implementierungen

1. **Fehlerbehandlung verbessern**:
   ```typescript
   try {
     // API-Aufruf oder Datenbankabfrage
   } catch (error) {
     console.error('Detaillierte Fehlermeldung:', error);
     // Im Entwicklungsmodus mehr Details zurückgeben
     if (process.env.NODE_ENV === 'development') {
       return res.status(500).json({ 
         message: 'Fehler beim Abrufen des Artikels',
         error: error.message,
         stack: error.stack
       });
     }
     // In Produktion generische Fehlermeldung
     return res.status(500).json({ message: 'Ein Fehler ist aufgetreten' });
   }
   ```

2. **Transaktion für komplexe Operationen verwenden**:
   ```typescript
   const result = await prisma.$transaction(async (tx) => {
     // Mehrere Datenbankoperationen ausführen
     const article = await tx.cerebroCarticle.create(/* ... */);
     await tx.cerebroMedia.createMany(/* ... */);
     return article;
   });
   ```

## Benutzeranleitung: Cerebro Wiki

### Einführung
Das Cerebro Wiki-System ist eine zentrale Plattform für die Dokumentation und Wissensverwaltung in Ihrem Intranet. Es ermöglicht allen berechtigten Benutzern, Wissen zu teilen, zu organisieren und zu finden.

### Übersicht der Hauptfunktionen
- Artikelverwaltung (erstellen, bearbeiten, löschen)
- Mediendateien hochladen und verwalten
- Externe Links einbinden (besonders Google Drive-Dokumente)
- Hierarchische Organisation von Wissen
- Leistungsstarke Suchfunktion

### Erste Schritte

#### Wiki aufrufen
1. Melden Sie sich im Intranet an
2. Klicken Sie in der Seitenleiste auf "Wiki"
3. Sie sehen die Wiki-Startseite mit den zuletzt aktualisierten Artikeln

#### Artikel durchsuchen
1. Verwenden Sie das Suchfeld oben rechts im Wiki
2. Geben Sie Suchbegriffe ein und drücken Sie Enter oder klicken Sie auf das Suchsymbol
3. Die Suchergebnisse zeigen Artikel, deren Titel, Inhalt oder Tags Ihre Suchanfrage enthalten

#### Navigation im Wiki
- **Hauptseite**: Zeigt die zuletzt aktualisierten Artikel
- **Artikelstruktur**: Die hierarchische Baumansicht auf der linken Seite
- **Alle Artikel**: Link unter der Artikelliste auf der Hauptseite

### Artikel verwalten

#### Neuen Artikel erstellen
1. Klicken Sie auf die Schaltfläche "+ Neuer Artikel" (rechts oben auf der Wiki-Hauptseite)
2. Füllen Sie das Formular aus:
   - **Titel**: Der Titel des Artikels (erforderlich)
   - **Inhalt**: Der Haupttext des Artikels mit dem Rich-Text-Editor
   - **Übergeordneter Artikel**: Optional eine hierarchische Zuordnung
   - **Veröffentlicht**: Entscheidet, ob der Artikel sofort sichtbar ist
3. Klicken Sie auf "Speichern", um den Artikel zu erstellen

#### Artikel bearbeiten
1. Öffnen Sie den gewünschten Artikel
2. Klicken Sie auf die Schaltfläche "Bearbeiten" in der Artikelansicht
3. Nehmen Sie die gewünschten Änderungen vor
4. Klicken Sie auf "Speichern", um die Änderungen zu übernehmen

#### Rich-Text-Editor verwenden
Der Editor bietet verschiedene Formatierungsmöglichkeiten:
- **Textformatierung**: Fett, Kursiv, Unterstrichen, Durchgestrichen
- **Listen**: Nummerierte und Aufzählungslisten
- **Überschriften**: Verschiedene Überschriftenebenen
- **Links**: Text mit URLs verlinken
- **Einrückung**: Text einrücken oder ausrücken
- **Zitate**: Blockzitate erstellen
- **Code-Blöcke**: Für Quellcode oder formatierten Text

### Mediendateien verwalten

#### Mediendateien zu Artikeln hinzufügen
1. Öffnen Sie den gewünschten Artikel
2. Klicken Sie auf den Tab "Medien" in der Artikelansicht
3. Klicken Sie auf die Schaltfläche "Medium hinzufügen"
4. Wählen Sie eine Datei von Ihrem Computer aus
5. Geben Sie eine Beschreibung ein (optional)
6. Klicken Sie auf "Hochladen"

#### Mediendateien anzeigen und verwalten
1. Öffnen Sie den gewünschten Artikel
2. Klicken Sie auf den Tab "Medien"
3. Alle Mediendateien des Artikels werden angezeigt
4. Klicken Sie auf eine Mediendatei, um diese zu öffnen
5. Verwenden Sie die Optionen zum Bearbeiten oder Löschen

### Externe Links verwalten

#### Externe Links zu Artikeln hinzufügen
1. Öffnen Sie den gewünschten Artikel
2. Klicken Sie auf den Tab "Externe Links"
3. Klicken Sie auf die Schaltfläche "Link hinzufügen"
4. Fügen Sie die URL ein
5. Das System generiert automatisch eine Vorschau und extrahiert Metadaten
6. Ergänzen oder bearbeiten Sie den Titel (optional)
7. Klicken Sie auf "Speichern"

#### Besondere Funktionen für Google Drive-Links
Bei Google Drive-Links (Dokumente, Tabellen, Präsentationen):
1. Das System erkennt automatisch den Typ des Google Drive-Dokuments
2. Es generiert eine Einbettungsansicht (falls möglich)
3. Der Inhalt wird direkt im Wiki angezeigt (ohne Verlassen der Seite)

### Wiki-Struktur verwalten

#### Hierarchische Organisation
1. Erstellen Sie zunächst Hauptartikel für übergeordnete Themen
2. Erstellen Sie dann Unterartikel, indem Sie beim Erstellen unter "Übergeordneter Artikel" den entsprechenden Hauptartikel auswählen
3. Die Struktur wird automatisch in der Baumansicht auf der linken Seite angezeigt

#### Artikel umstrukturieren
1. Bearbeiten Sie einen Artikel
2. Ändern Sie die Auswahl unter "Übergeordneter Artikel"
3. Speichern Sie die Änderungen
4. Die Struktur wird automatisch aktualisiert

### Tipps und Best Practices

#### Für effektive Wiki-Artikel
1. **Klare Titel**: Verwenden Sie aussagekräftige, präzise Titel
2. **Strukturierter Inhalt**: Nutzen Sie Überschriften zur Gliederung
3. **Konsistente Formatierung**: Halten Sie sich an einheitliche Formatierungsstandards
4. **Medien sinnvoll einsetzen**: Bilder, Diagramme und Videos können komplexe Informationen verständlicher machen
5. **Regelmäßig aktualisieren**: Halten Sie Informationen aktuell und relevant

#### Für die Wiki-Organisation
1. **Thematische Struktur**: Organisieren Sie nach Themengebieten
2. **Nicht zu tief verschachteln**: Halten Sie die Hierarchie übersichtlich (max. 3-4 Ebenen)
3. **Wichtige Artikel hervorheben**: Platzieren Sie zentrale Dokumente prominent
4. **Konsistente Namenskonventionen**: Verwenden Sie einheitliche Benennungen für ähnliche Artikel

### Fehlerbehebung und Hilfe

#### Häufige Probleme
1. **Artikel wird nicht angezeigt**: Überprüfen Sie, ob der Artikel als "Veröffentlicht" markiert ist
2. **Mediendatei kann nicht hochgeladen werden**: Stellen Sie sicher, dass die Datei den zulässigen Formaten entspricht
3. **Wiki-Navigation reagiert nicht**: Aktualisieren Sie die Seite, um die aktuelle Struktur zu laden

#### Hilfe erhalten
Bei Problemen mit dem Wiki-System wenden Sie sich an:
- Ihr IT-Support-Team
- Den Wiki-Administrator
