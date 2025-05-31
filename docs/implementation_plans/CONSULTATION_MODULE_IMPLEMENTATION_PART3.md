# Implementierungsplan Teil 3: Consultation-Modul - Dokumentation & Finalisierung

## Fortsetzung von Teil 2

**WICHTIG**: Dieser Plan setzt Teil 1 und 2 fort. Stelle sicher, dass alle Schritte aus den vorherigen Teilen abgeschlossen sind.

## Phase 11: Modul-Dokumentation

### Schritt 11.1: Modul-Dokumentation erstellen
- [ ] Erstelle neue Datei: `docs/modules/MODUL_CONSULTATIONS.md`
- [ ] Füge folgenden Inhalt ein:

```markdown
# MODUL CONSULTATIONS

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Consultations-Moduls im Intranet-Projekt. Das Modul ermöglicht die Verwaltung von Kundenberatungen mit Zeiterfassung und Notizen.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Komponenten](#komponenten)
3. [Client-Verwaltung](#client-verwaltung)
4. [Beratungs-Verwaltung](#beratungs-verwaltung)
5. [API-Endpunkte](#api-endpunkte)
6. [Datenmodell](#datenmodell)
7. [Benutzeroberfläche](#benutzeroberfläche)
8. [Berechtigungen](#berechtigungen)
9. [Integration mit anderen Modulen](#integration-mit-anderen-modulen)
10. [Besonderheiten](#besonderheiten)

## Überblick

Das Consultations-Modul erweitert das bestehende Zeiterfassungssystem um die Möglichkeit, Beratungen mit Kunden zu tracken. Hauptfunktionen:

- Client-Verwaltung (Anlegen, Bearbeiten, Löschen)
- Beratungszeiten erfassen (Start/Stop oder manuell)
- Notizen während der Beratung erfassen
- Verknüpfung mit Tasks für detaillierte Dokumentation
- Übersicht aller Beratungen mit Filter- und Suchfunktionen
- Quick-Start über zuletzt beratene Clients

## Komponenten

### Frontend-Komponenten

1. **ConsultationTracker.tsx**
   - Hauptkomponente für Start/Stop von Beratungen
   - Manuelle Zeiterfassung
   - Notizen-Erfassung während laufender Beratung
   - Recent-Client-Tags für Quick-Start

2. **ConsultationList.tsx**
   - Tabellarische Übersicht aller Beratungen
   - Filter- und Suchfunktionen
   - Inline-Bearbeitung von Notizen
   - Task-Verknüpfung

3. **ClientSelectModal.tsx**
   - Modal zur Auswahl eines Clients
   - Suchfunktion
   - Option zum Anlegen neuer Clients

4. **CreateClientModal.tsx**
   - Formular zum Anlegen neuer Clients
   - Validierung der Eingaben

5. **LinkTaskModal.tsx**
   - Modal zur Verknüpfung von Tasks mit Beratungen
   - Filtert nur offene und in Bearbeitung befindliche Tasks

### Backend-Controller

1. **clientController.ts**
   - CRUD-Operationen für Clients
   - Recent Clients Abfrage

2. **consultationController.ts**
   - Start/Stop von Beratungen
   - Notizen-Verwaltung
   - Task-Verknüpfung

## Client-Verwaltung

Clients werden in einer eigenen Tabelle verwaltet mit folgenden Feldern:
- Name (Pflichtfeld)
- Firma
- E-Mail
- Telefon
- Adresse
- Notizen
- Aktiv-Status

### Recent Clients Feature

Die 10 zuletzt beratenen Clients werden als clickbare Tags angezeigt, um schnell eine neue Beratung zu starten.

## Beratungs-Verwaltung

Beratungen sind erweiterte WorkTime-Einträge mit zusätzlichen Feldern:
- Client-Referenz
- Notizen
- Task-Verknüpfungen

### Workflow

1. **Beratung starten**
   - Client auswählen oder neu anlegen
   - Niederlassung wählen
   - Optional: Erste Notizen erfassen

2. **Während der Beratung**
   - Notizen werden automatisch alle 30 Sekunden gespeichert
   - Laufzeit wird angezeigt

3. **Beratung beenden**
   - Endzeit wird gesetzt
   - Finale Notizen werden gespeichert

4. **Nachbearbeitung**
   - Tasks können verknüpft werden
   - Notizen können nachträglich bearbeitet werden

## API-Endpunkte

### Client-Endpoints

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/clients` | GET | Alle Clients abrufen |
| `/api/clients/:id` | GET | Einzelnen Client abrufen |
| `/api/clients` | POST | Neuen Client erstellen |
| `/api/clients/:id` | PUT | Client aktualisieren |
| `/api/clients/:id` | DELETE | Client löschen |
| `/api/clients/recent` | GET | Zuletzt beratene Clients |

### Consultation-Endpoints

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/consultations` | GET | Alle Beratungen abrufen |
| `/api/consultations/start` | POST | Beratung starten |
| `/api/consultations/stop` | POST | Beratung beenden |
| `/api/consultations/:id/notes` | PATCH | Notizen aktualisieren |
| `/api/consultations/:id/link-task` | POST | Task verknüpfen |
| `/api/consultations/:id/create-task` | POST | Neuen Task erstellen |

## Datenmodell

### Client Model

```prisma
model Client {
  id          Int        @id @default(autoincrement())
  name        String
  company     String?
  email       String?
  phone       String?
  address     String?
  notes       String?    @db.Text
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  workTimes   WorkTime[]
}
```

### WorkTime Erweiterungen

```prisma
model WorkTime {
  // ... bestehende Felder ...
  clientId    Int?
  client      Client?   @relation(fields: [clientId], references: [id])
  notes       String?   @db.Text
  taskLinks   WorkTimeTask[]
}
```

### WorkTimeTask (Verknüpfungstabelle)

```prisma
model WorkTimeTask {
  id          Int       @id @default(autoincrement())
  workTimeId  Int
  taskId      Int
  createdAt   DateTime  @default(now())
  workTime    WorkTime  @relation(fields: [workTimeId], references: [id])
  task        Task      @relation(fields: [taskId], references: [id])
  
  @@unique([workTimeId, taskId])
}
```

## Benutzeroberfläche

### Consultations-Seite Layout

1. **Header**
   - Titel mit Icon
   - Beschreibungstext

2. **ConsultationTracker Box**
   - Niederlassungsauswahl
   - Start/Stop/Manuell Buttons
   - Recent Client Tags
   - Notizen-Feld (bei aktiver Beratung)

3. **ConsultationList Box**
   - Suchfeld
   - Filter-Button
   - Spalten-Konfiguration
   - Sortierbare Tabelle

### Filter-Funktionalität

Folgende Filterkriterien sind verfügbar:
- Client (enthält/gleich)
- Niederlassung (enthält/gleich)
- Notizen (enthält)
- Dauer (größer/kleiner/gleich in Stunden)

Filter können mit UND/ODER verknüpft und gespeichert werden.

## Berechtigungen

Das Modul verwendet folgende Berechtigungen:

- `consultations_view` - Beratungen anzeigen
- `consultations_create` - Neue Beratungen starten
- `consultations_edit` - Beratungen bearbeiten
- `consultations_delete` - Beratungen löschen
- `clients_manage` - Clients verwalten

## Integration mit anderen Modulen

### Zeiterfassung (WorkTime)
- Beratungen sind spezielle WorkTime-Einträge
- Nutzen die gleiche Infrastruktur für Start/Stop

### Task-System
- Tasks können mit Beratungen verknüpft werden
- Automatische Task-Erstellung für Beratungsnotizen möglich

### Benachrichtigungen
- Bei Start/Stop werden Benachrichtigungen erstellt (wenn aktiviert)

## Besonderheiten

### Auto-Save für Notizen
- Notizen werden automatisch alle 30 Sekunden gespeichert
- Verhindert Datenverlust bei längeren Beratungen

### Manuelle Zeiterfassung
- Beratungen können nachträglich erfasst werden
- Start- und Endzeit manuell eingeben

### Performance-Optimierungen
- Recent Clients werden gecacht
- Lazy Loading für Task-Verknüpfungen
- Pagination bei großen Datenmengen (geplant)

### Keyboard Shortcuts (geplant)
- `Strg+N` - Neue Beratung starten
- `Strg+S` - Notizen speichern
- `ESC` - Modal schließen
```

## Phase 12: API-Dokumentation aktualisieren

### Schritt 12.1: API_REFERENZ.md erweitern
- [ ] Öffne `docs/technical/API_REFERENZ.md`
- [ ] Füge nach den WorkTime-Endpoints folgende Abschnitte hinzu:

```markdown
## Clients API

### Endpoints

#### GET /api/clients
Ruft alle Clients ab.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Max Mustermann",
    "company": "Musterfirma GmbH",
    "email": "max@musterfirma.de",
    "phone": "+49 123 456789",
    "address": "Musterstraße 1, 12345 Musterstadt",
    "notes": "Wichtiger Kunde",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
]
```

#### GET /api/clients/:id
Ruft einen einzelnen Client mit seinen letzten 10 Beratungen ab.

#### POST /api/clients
Erstellt einen neuen Client.

**Request Body:**
```json
{
  "name": "Max Mustermann",
  "company": "Musterfirma GmbH",
  "email": "max@musterfirma.de",
  "phone": "+49 123 456789",
  "address": "Musterstraße 1, 12345 Musterstadt",
  "notes": "Wichtiger Kunde"
}
```

#### PUT /api/clients/:id
Aktualisiert einen bestehenden Client.

#### DELETE /api/clients/:id
Löscht einen Client.

#### GET /api/clients/recent
Ruft die 10 zuletzt beratenen Clients des aktuellen Benutzers ab.

## Consultations API

### Endpoints

#### GET /api/consultations
Ruft alle Beratungen des aktuellen Benutzers ab.

**Query Parameter:**
- `clientId` (optional): Filtert nach Client
- `from` (optional): Start-Datum (ISO 8601)
- `to` (optional): End-Datum (ISO 8601)

#### POST /api/consultations/start
Startet eine neue Beratung.

**Request Body:**
```json
{
  "branchId": 1,
  "clientId": 1,
  "notes": "Erste Notizen",
  "startTime": "2024-01-01T10:00:00Z" // optional für manuelle Erfassung
}
```

#### POST /api/consultations/stop
Beendet die aktive Beratung.

**Request Body:**
```json
{
  "notes": "Finale Notizen",
  "endTime": "2024-01-01T11:00:00Z" // optional
}
```

#### PATCH /api/consultations/:id/notes
Aktualisiert die Notizen einer Beratung.

**Request Body:**
```json
{
  "notes": "Aktualisierte Notizen"
}
```

#### POST /api/consultations/:id/link-task
Verknüpft einen Task mit einer Beratung.

**Request Body:**
```json
{
  "taskId": 123
}
```

#### POST /api/consultations/:id/create-task
Erstellt einen neuen Task für eine Beratung.

**Request Body:**
```json
{
  "title": "Follow-up Beratung",
  "description": "Details zum Follow-up",
  "dueDate": "2024-01-15T10:00:00Z",
  "branchId": 1,
  "qualityControlId": 2
}
```
```

## Phase 13: Datenbankschema-Dokumentation aktualisieren

### Schritt 13.1: DATENBANKSCHEMA.md erweitern
- [ ] Öffne `docs/technical/DATENBANKSCHEMA.md`
- [ ] Füge nach der WorkTime-Tabelle folgende Abschnitte hinzu:

```markdown
## Client

Speichert Informationen über Kunden/Clients für Beratungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | Int | Primärschlüssel | PK, Auto-increment |
| name | String | Name des Clients | NOT NULL |
| company | String? | Firmenname | - |
| email | String? | E-Mail-Adresse | - |
| phone | String? | Telefonnummer | - |
| address | String? | Adresse | - |
| notes | String? | Allgemeine Notizen | Text |
| isActive | Boolean | Aktiv-Status | DEFAULT true |
| createdAt | DateTime | Erstellungszeitpunkt | DEFAULT now() |
| updatedAt | DateTime | Letztes Update | @updatedAt |

### Beziehungen
- `workTimes`: One-to-Many zu WorkTime (alle Beratungen mit diesem Client)

## WorkTime (Erweiterungen)

Zusätzliche Felder für Beratungsfunktionalität:

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| clientId | Int? | Verweis auf Client | FK zu Client |
| notes | String? | Beratungsnotizen | Text |

### Neue Beziehungen
- `client`: Many-to-One zu Client
- `taskLinks`: One-to-Many zu WorkTimeTask

## WorkTimeTask

Verknüpfungstabelle zwischen WorkTime (Beratungen) und Tasks.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | Int | Primärschlüssel | PK, Auto-increment |
| workTimeId | Int | Verweis auf WorkTime | FK zu WorkTime |
| taskId | Int | Verweis auf Task | FK zu Task |
| createdAt | DateTime | Erstellungszeitpunkt | DEFAULT now() |

### Constraints
- Unique Index auf (workTimeId, taskId)

### Beziehungen
- `workTime`: Many-to-One zu WorkTime
- `task`: Many-to-One zu Task

## Task (Erweiterungen)

Zusätzliche Beziehung für Beratungsverknüpfungen:

### Neue Beziehungen
- `workTimeLinks`: One-to-Many zu WorkTimeTask
```

## Phase 14: Seed-Daten und Migration

### Schritt 14.1: Seed-Daten für Demo-Clients erstellen
- [ ] Öffne `backend/prisma/seed.ts`
- [ ] Füge nach dem User-Seed folgende Demo-Clients hinzu:

```typescript
// Demo-Clients erstellen
const clients = [
  {
    name: 'Musterfirma GmbH',
    company: 'Musterfirma GmbH',
    email: 'info@musterfirma.de',
    phone: '+49 123 456789',
    address: 'Musterstraße 1, 12345 Musterstadt',
    notes: 'Langjähriger Kunde, bevorzugt Termine vormittags'
  },
  {
    name: 'Max Müller',
    email: 'max.mueller@example.com',
    phone: '+49 987 654321',
    notes: 'Einzelunternehmer, IT-Beratung'
  },
  {
    name: 'Beispiel AG',
    company: 'Beispiel AG',
    email: 'kontakt@beispiel-ag.de',
    address: 'Beispielweg 42, 54321 Beispielstadt'
  }
];

for (const clientData of clients) {
  await prisma.client.create({
    data: clientData
  });
}

console.log('Demo-Clients erstellt');
```

### Schritt 14.2: Berechtigungen im Seed hinzufügen
- [ ] Füge in der Admin-Rollen-Sektion folgende Berechtigungen hinzu:

```typescript
// Consultation Berechtigungen
await prisma.permission.create({
  data: {
    roleId: adminRole.id,
    entity: 'consultations',
    accessLevel: 'both',
    entityType: 'page'
  }
});

await prisma.permission.create({
  data: {
    roleId: adminRole.id,
    entity: 'clients',
    accessLevel: 'both',
    entityType: 'table'
  }
});
```

## Phase 15: Finale Integration und Tests

### Schritt 15.1: Menü-Integration vervollständigen
- [ ] Finde die Navigation-Komponente (suche nach "navigation" oder "menu")
- [ ] Stelle sicher, dass der Menüpunkt korrekt hinzugefügt wurde
- [ ] Prüfe die Icon-Imports

### Schritt 15.2: TypeScript Type-Checking
- [ ] Terminal im Frontend-Verzeichnis öffnen
- [ ] Führe aus: `npx tsc --noEmit`
- [ ] Behebe alle TypeScript-Fehler

### Schritt 15.3: Backend Type-Checking
- [ ] Terminal im Backend-Verzeichnis öffnen
- [ ] Führe aus: `npx tsc --noEmit`
- [ ] Behebe alle TypeScript-Fehler

### Schritt 15.4: Prisma Client generieren
- [ ] Terminal im Backend-Verzeichnis
- [ ] Führe aus: `npx prisma generate`

## Phase 16: Deployment-Vorbereitung

### Schritt 16.1: Environment-Variablen prüfen
- [ ] Stelle sicher, dass keine neuen Environment-Variablen benötigt werden
- [ ] Dokumentiere ggf. neue Variablen in `.env.example`

### Schritt 16.2: Build-Test durchführen
- [ ] Frontend Build: `cd frontend && npm run build`
- [ ] Backend Build: `cd backend && npm run build`
- [ ] Behebe alle Build-Fehler

## Abschluss-Checkliste Teil 3

### Dokumentation
- [ ] Modul-Dokumentation vollständig
- [ ] API-Referenz aktualisiert
- [ ] Datenbankschema dokumentiert
- [ ] Alle Code-Kommentare auf Deutsch

### Code-Qualität
- [ ] Keine TypeScript-Fehler
- [ ] Keine ungenutzten Imports
- [ ] Keine Console.logs im Production-Code
- [ ] Alle Error-Cases behandelt

### Tests (Manuell)
- [ ] Client CRUD funktioniert
- [ ] Beratung Start/Stop funktioniert
- [ ] Manuelle Erfassung funktioniert
- [ ] Recent Clients werden angezeigt
- [ ] Notizen Auto-Save funktioniert
- [ ] Task-Verknüpfung funktioniert
- [ ] Filter in der Liste funktionieren
- [ ] Spalten-Konfiguration funktioniert
- [ ] Berechtigungen greifen korrekt

### Performance
- [ ] Keine N+1 Query-Probleme
- [ ] Große Listen werden performant geladen
- [ ] Keine Memory Leaks (lange Beratung testen)

## Deployment-Schritte

1. **Migration auf Production**
   ```bash
   npx prisma migrate deploy
   ```

2. **Seed ausführen (nur neue Berechtigungen)**
   ```bash
   npx prisma db seed
   ```

3. **Server neu starten**
   - Backend-Server
   - Frontend-Build neu deployen

4. **Smoke Tests**
   - Als Admin einloggen
   - Consultation-Seite aufrufen
   - Einen Test-Client anlegen
   - Eine Test-Beratung durchführen

## Bekannte Limitierungen & Zukünftige Erweiterungen

### Aktuelle Limitierungen
1. Keine Pagination in der Beratungsliste
2. Keine Export-Funktion für Beratungen
3. Keine Statistiken/Reports
4. Keine Kalender-Integration

### Geplante Erweiterungen
1. **Pagination**: Bei mehr als 100 Beratungen
2. **Export**: Excel/CSV Export der Beratungen
3. **Statistiken**: Dashboard mit Beratungsstatistiken
4. **Kalender**: Integration mit Kalender-Systemen
5. **Templates**: Vorlagen für häufige Beratungstypen
6. **Dokumente**: Datei-Anhänge zu Beratungen
7. **Recurring**: Wiederkehrende Beratungen
8. **Notifications**: E-Mail bei wichtigen Beratungen

## Support & Wartung

### Häufige Probleme

1. **"Client ist erforderlich" Fehler**
   - Stelle sicher, dass ein Client ausgewählt wurde
   - Prüfe, ob die Client-ID korrekt übertragen wird

2. **Notizen werden nicht gespeichert**
   - Prüfe die Netzwerkverbindung
   - Schaue in die Browser-Konsole für Fehler
   - Stelle sicher, dass die Beratung dem User gehört

3. **Recent Clients werden nicht angezeigt**
   - Cache leeren (Browser)
   - Prüfe, ob Beratungen mit Client verknüpft sind

### Debug-Tipps

1. **Backend-Logs prüfen**
   ```bash
   tail -f backend/logs/app.log
   ```

2. **Datenbank-Queries debuggen**
   - Prisma Query-Logging aktivieren
   - SQL-Queries in pgAdmin prüfen

3. **Frontend-State debuggen**
   - React Developer Tools verwenden
   - Network-Tab für API-Calls prüfen

## Abschluss

Das Consultation-Modul ist nun vollständig implementiert und dokumentiert. Bei Fragen oder Problemen bitte die Dokumentation konsultieren oder ein Issue im Repository erstellen. 