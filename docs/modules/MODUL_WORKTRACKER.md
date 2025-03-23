# MODUL WORKTRACKER

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Worktracker-Moduls im Intranet-Projekt. Besonderer Fokus liegt auf der Task-Verwaltung, Filter-Funktionalität und der Integration mit anderen Modulen.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Komponenten](#komponenten)
3. [Task-Verwaltung](#task-verwaltung)
4. [Filter-Funktionalität](#filter-funktionalität)
5. [API-Endpunkte](#api-endpunkte)
6. [Datenmodell](#datenmodell)
7. [Benutzeroberfläche](#benutzeroberfläche)
8. [Berechtigungen](#berechtigungen)
9. [Integration mit anderen Modulen](#integration-mit-anderen-modulen)
10. [Status-Update-Workflow](#status-update-workflow)

## Überblick

Das Worktracker-Modul ist das zentrale System zur Aufgabenverwaltung im Intranet. Es ermöglicht Benutzern das Erstellen, Bearbeiten, Filtern und Verfolgen von Aufgaben in verschiedenen Projektphasen. Das Modul unterstützt einen strukturierten Workflow mit den Status "Offen", "In Bearbeitung", "Nachbesserung", "Qualitätskontrolle" und "Erledigt".

Hauptfunktionen:
- Aufgabenverwaltung mit vollständigem CRUD-Workflow
- Zuweisungen von Verantwortlichen und Qualitätskontrolle
- Komplexe Filterfunktionen mit Speichermöglichkeit
- Integration mit dem Benachrichtigungssystem
- Anbindung an das Cerebro Wiki-System für Dokumentation

## Komponenten

Das Worktracker-Modul besteht aus folgenden Hauptkomponenten:

1. **Worktracker.tsx**: Hauptkomponente, die die Gesamtansicht des Worktrackers rendert
2. **TaskTable.tsx**: Tabellendarstellung der Aufgaben mit Sortierungs- und Filterfunktionen
3. **TaskForm.tsx**: Formular zum Erstellen und Bearbeiten von Aufgaben
4. **FilterPane.tsx**: Komponentensammlung für die erweiterte Filterung
5. **SavedFilterTags.tsx**: Komponente zur Verwaltung gespeicherter Filter
6. **TaskDetail.tsx**: Detailansicht einer einzelnen Aufgabe

## Task-Verwaltung

Die Task-Verwaltung im Worktracker umfasst den vollständigen Lebenszyklus einer Aufgabe:

1. **Erstellung**: Neue Aufgaben können über das Formular erstellt werden mit Angabe von Titel, Beschreibung, Verantwortlichem, Qualitätskontrolle, Fälligkeit und Niederlassung.
2. **Bearbeitung**: Bestehende Aufgaben können bearbeitet werden, wobei Änderungen im System protokolliert werden.
3. **Statusänderung**: Der Fortschritt einer Aufgabe wird durch Statusänderungen verfolgt.
4. **Löschen**: Aufgaben können bei Bedarf entfernt werden.

Die Status einer Aufgabe sind:
- **open**: Die Aufgabe wurde erstellt, aber noch nicht begonnen
- **in_progress**: Die Aufgabe wird aktuell bearbeitet
- **improval**: Die Aufgabe erfordert Nachbesserung
- **quality_control**: Die Aufgabe ist bereit für die Qualitätskontrolle
- **done**: Die Aufgabe wurde abgeschlossen

## Filter-Funktionalität

Eine der Kernfunktionen des Worktracker-Moduls ist die erweiterte Filterfunktionalität, die es Benutzern ermöglicht, komplexe Filtereinstellungen zu erstellen, zu speichern und wiederzuverwenden.

### Basis-Filterung

Die Basis-Filterung umfasst:
- Volltextsuche über alle relevanten Felder
- Schnellfilter für häufig verwendete Status (Offen, In Bearbeitung, etc.)
- Datum- und Zeitraumfilter für Fälligkeitsdaten

### Erweiterte Filterung

Die erweiterte Filterung erlaubt die Kombination mehrerer Filterbedingungen mit logischen Operatoren:

1. **Filterbedingungen**: Jede Bedingung besteht aus einem Feld (z.B. Status, Verantwortlicher), einem Operator (z.B. gleich, enthält) und einem Wert.
2. **Logische Verknüpfung**: Filterbedingungen können mit UND/ODER-Operatoren verknüpft werden.
3. **Gruppierung**: Komplexe Filter können durch Gruppierung von Bedingungen erstellt werden.

### Gespeicherte Filter

Mit der gespeicherten Filter-Funktion können Benutzer häufig verwendete Filterkonfigurationen speichern und wiederverwenden:

1. **Filterspeicherung**: Über den "Filter speichern"-Button können aktuelle Filtereinstellungen mit einem Namen versehen und gespeichert werden.
2. **Filterauswahl**: Gespeicherte Filter werden als Filter-Tags oberhalb der Tabelle angezeigt und können mit einem Klick aktiviert werden.
3. **Filterverwaltung**: Gespeicherte Filter können über das "X"-Symbol im Filter-Tag gelöscht werden.

Die gespeicherten Filter werden in der Datenbank im `SavedFilter`-Modell persistiert und sind benutzerspezifisch. Jeder Filter ist einer bestimmten Tabelle (z.B. "worktracker_todos") zugeordnet und enthält die Filterbedingungen und logischen Operatoren als JSON-Strings.

## API-Endpunkte

Das Worktracker-Modul verwendet folgende API-Endpunkte:

### Task-Verwaltung

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/tasks` | GET | Alle Aufgaben abrufen |
| `/api/tasks/:id` | GET | Einzelne Aufgabe abrufen |
| `/api/tasks` | POST | Neue Aufgabe erstellen |
| `/api/tasks/:id` | PUT | Aufgabe vollständig aktualisieren |
| `/api/tasks/:id` | PATCH | Aufgabe teilweise aktualisieren (z.B. nur Status) |
| `/api/tasks/:id` | DELETE | Aufgabe löschen |

**Hinweis**: Für Status-Updates einzelner Tasks wird bevorzugt die `PATCH`-Methode verwendet, da nur das Status-Feld aktualisiert wird. Das Backend unterstützt sowohl `PUT` als auch `PATCH` für maximale Flexibilität.

### Gespeicherte Filter

- `GET /api/saved-filters/:tableId`: Gespeicherte Filter für eine bestimmte Tabelle abrufen
- `POST /api/saved-filters`: Neuen Filter speichern oder bestehenden aktualisieren
- `DELETE /api/saved-filters/:id`: Gespeicherten Filter löschen

## Datenmodell

Das Worktracker-Modul verwendet folgende Datenmodelle:

### Task

```prisma
model Task {
  id               Int       @id @default(autoincrement())
  title           String
  description     String?
  status          TaskStatus @default(open)
  responsible     User       @relation("responsible", fields: [responsibleId], references: [id])
  responsibleId   Int
  qualityControl  User       @relation("quality_control", fields: [qualityControlId], references: [id])
  qualityControlId Int
  branch          Branch     @relation(fields: [branchId], references: [id])
  branchId        Int
  dueDate         DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}
```

### SavedFilter

```prisma
model SavedFilter {
  id        Int      @id @default(autoincrement())
  userId    Int
  tableId   String
  name      String
  conditions String
  operators String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, tableId, name])
}
```

## Benutzeroberfläche

Das Worktracker-Modul bietet eine intuitive Benutzeroberfläche mit folgenden Hauptelementen:

1. **Tabellendarstellung**: Aufgaben werden in einer übersichtlichen Tabelle mit sortierbaren Spalten angezeigt.
2. **Filterbereich**: Der erweiterte Filterbereich ermöglicht die Erstellung komplexer Filtereinstellungen.
3. **Filter-Tags**: Gespeicherte Filter werden als anklickbare Tags oberhalb der Tabelle angezeigt.
4. **Aufgabendetails**: Detaillierte Informationen zu einer Aufgabe werden in einer Seitenleiste oder einem Modal angezeigt.
5. **Formulare**: Intuitive Formulare für die Erstellung und Bearbeitung von Aufgaben.

### Filter-Benutzeroberfläche

Die Filter-Benutzeroberfläche besteht aus:

1. **FilterPane.tsx**: Hauptkomponente für den erweiterten Filter mit:
   - Bedingungsreihen für die Feldauswahl, Operatorauswahl und Wertangabe
   - Logische Operatoren (UND/ODER) zwischen den Bedingungen
   - Buttons zum Hinzufügen/Entfernen von Bedingungen
   - "Filter anwenden" und "Filter speichern" Buttons

2. **SavedFilterTags.tsx**: Komponente für die Anzeige und Verwaltung gespeicherter Filter mit:
   - Horizontale Liste von Filter-Tags
   - Klickbare Tags zum Anwenden eines Filters
   - Lösch-Symbol zum Entfernen eines Filters

## Berechtigungen

Das Worktracker-Modul verwendet das zentrale Berechtigungssystem des Intranets mit folgenden Berechtigungen:

- **worktracker_view**: Berechtigung zum Anzeigen des Worktrackers
- **worktracker_create**: Berechtigung zum Erstellen neuer Aufgaben
- **worktracker_edit**: Berechtigung zum Bearbeiten von Aufgaben
- **worktracker_delete**: Berechtigung zum Löschen von Aufgaben
- **worktracker_manage_filters**: Berechtigung zum Speichern und Verwalten von Filtern

## Integration mit anderen Modulen

Das Worktracker-Modul ist mit verschiedenen anderen Modulen des Intranets integriert:

1. **Benachrichtigungsmodul**: Erzeugt Benachrichtigungen bei Aufgabenänderungen und Statusupdates
2. **Cerebro Wiki**: Ermöglicht die Verknüpfung von Aufgaben mit Wiki-Artikeln für detaillierte Dokumentation
3. **Zeiterfassungsmodul**: Zeigt zugehörige Arbeitszeiten zu Aufgaben an (geplante Funktion)
4. **Benutzermodul**: Integration mit Benutzer- und Rollensystem für Zuweisungen und Berechtigungen

### status-update-workflow

Der Worktracker implementiert einen intuitiven Workflow für Status-Updates von Tasks:

1. **Status-Buttons**: Jeder Task besitzt kontextbezogene Status-Buttons (links: zurück, rechts: vorwärts)
2. **Benutzerabhängige Anzeige**: Die Buttons werden nur für Verantwortliche oder Qualitätskontrolleure angezeigt
3. **Frontend-Implementation**: Status-Updates werden mit der `PATCH`-HTTP-Methode an die API gesendet
4. **Backend-Verarbeitung**: Das Backend unterstützt sowohl PUT- als auch PATCH-Anfragen für die Tasks-Route

Die möglichen Status-Übergänge sind:
- "Offen" → "In Bearbeitung" (durch Verantwortlichen)
- "In Bearbeitung" → "Offen" (durch Verantwortlichen, Rückschritt)
- "In Bearbeitung" → "Qualitätskontrolle" (durch Verantwortlichen, Fortschritt)
- "Qualitätskontrolle" → "In Bearbeitung" (durch Verantwortlichen, Rückschritt)
- "Qualitätskontrolle" → "Erledigt" (durch Qualitätskontrolle, Fortschritt)
- "Erledigt" → "Qualitätskontrolle" (durch Qualitätskontrolle, Rückschritt)

Bei jeder Statusänderung werden automatisch Benachrichtigungen an die beteiligten Benutzer gesendet. 