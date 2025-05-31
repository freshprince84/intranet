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