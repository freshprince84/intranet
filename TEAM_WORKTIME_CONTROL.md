# Team Worktime Control

## Übersicht

Diese Dokumentation beschreibt die Implementierung einer neuen Seite "Team Worktime Control" im Intranet-System. Die Seite dient als Kontrollzentrum für Vorgesetzte, um die Zeiterfassung und Tasks ihrer Teammitglieder zu verwalten.

## Inhaltsverzeichnis

1. [Ziele und Anforderungen](#ziele-und-anforderungen)
2. [Datenbankänderungen](#datenbankänderungen)
3. [Backend-Implementierung](#backend-implementierung)
4. [Frontend-Implementierung](#frontend-implementierung)
5. [Berechtigungskonzept](#berechtigungskonzept)
6. [Benachrichtigungssystem](#benachrichtigungssystem)
7. [API-Endpunkte](#api-endpunkte)
8. [UI/UX-Design](#uiux-design)
9. [Tests und Qualitätssicherung](#tests-und-qualitätssicherung)
10. [Implementierungsplan](#implementierungsplan)

## Ziele und Anforderungen

### Hauptziele

Die Team Worktime Control-Seite soll Vorgesetzten ermöglichen:

1. Echtzeit-Überwachung der aktiven Zeiterfassungen im Team
2. Individuelle Kontrolle und Beendigung aktiver Zeiterfassungen
3. Tagesweise Ansicht und Bearbeitung von Zeiterfassungen der Teammitglieder
4. Übersicht der bewilligten Überstunden pro Benutzer

### Funktionale Anforderungen

- Anzeige aller Benutzer mit aktiver Zeiterfassung
- Möglichkeit, einzelne aktive Zeiterfassungen zu stoppen mit Angabe einer Endzeit
- Tagesweise Auflistung und Bearbeitung der Zeiterfassungen (Start-/Endzeiten ändern)
- Anzeige und Verwaltung der bewilligten Überstunden pro Teammitglied
- Integration im Sidemenu nach dem "Worktracker"-Menüpunkt

### Nicht-funktionale Anforderungen

- Benutzerfreundliche Oberfläche im Stil des bestehenden Systems
- Echtzeitaktualisierung der Daten ohne vollständiges Neuladen der Seite
- Konsistente Fehlerbehandlung
- Berücksichtigung der Zeitzonen-Regeln gemäß bestehender Dokumentation

## Datenbankänderungen

### Erweiterung des User-Modells

In der `User`-Tabelle wird ein neues Feld für die bewilligten Überstunden benötigt:

```prisma
model User {
  // Bestehende Felder...
  approvedOvertimeHours Float @default(0) // Neue Zeile: Bewilligte Überstunden in Stunden
}
```

### Änderungen an Permissions

Neue Berechtigungen für die Team Worktime Control-Seite müssen definiert werden:

```prisma
// Neue Berechtigungseinträge in der Datenbank
// entity: "team_worktime_control"
// accessLevel: "read", "write", "both"
// entityType: "page"

// entity: "team_worktime"
// accessLevel: "read", "write", "both"
// entityType: "table"
```

### Änderungen am Notification-System

Neue Notification-Typen für Team-Worktime-Aktionen:

```prisma
enum NotificationType {
  // Bestehende Typen...
  worktime_manager_stop // Neuer Typ für das Stoppen der Zeiterfassung durch einen Vorgesetzten
}
```

Notwendige Erweiterungen der NotificationSettings und UserNotificationSettings:

```prisma
model NotificationSettings {
  // Bestehende Felder...
  worktimeManagerStop Boolean @default(true)
}

model UserNotificationSettings {
  // Bestehende Felder...
  worktimeManagerStop Boolean?
}
```

## Backend-Implementierung

### Neue Controller

Ein neuer Controller `teamWorktimeController.ts` muss erstellt werden mit folgenden Funktionen:

1. `getActiveTeamWorktimes`: Abrufen aller Benutzer mit aktiver Zeiterfassung
2. `stopUserWorktime`: Stoppen der Zeiterfassung eines bestimmten Benutzers
3. `getUserWorktimesByDay`: Abrufen der Zeiterfassungen eines Benutzers für einen bestimmten Tag
4. `updateUserWorktime`: Aktualisieren der Zeiterfassungen eines Benutzers
5. `updateApprovedOvertimeHours`: Aktualisieren der bewilligten Überstunden eines Benutzers

### Middleware

Eine Middleware zur Überprüfung der Vorgesetztenrolle und Teamzugehörigkeit:

```typescript
export const isTeamManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    // Prüfen, ob der Benutzer die nötigen Berechtigungen hat
    // Implementierungsdetails...
    next();
  } catch (error) {
    res.status(403).json({ message: "Keine ausreichenden Berechtigungen" });
  }
};
```

### Erweiterung des Notification-Controllers

Ergänzung der `createNotificationIfEnabled`-Funktion um den neuen Notification-Typ:

```typescript
// Erweiterung von createNotificationIfEnabled für worktimeManagerStop
```

## Frontend-Implementierung

### Neue Komponenten

1. `TeamWorktimeControl.tsx`: Hauptkomponente für die Seite
2. `ActiveUsersList.tsx`: Komponente zur Anzeige aktiver Benutzer
3. `StopWorktimeModal.tsx`: Modal zum Stoppen der Zeiterfassung mit Endzeit-Angabe
4. `UserWorktimeTable.tsx`: Tabelle zur Anzeige der Zeiterfassungen eines Benutzers
5. `UserOvertimeEditor.tsx`: Komponente zur Bearbeitung der bewilligten Überstunden

### Routing

Erweiterung der Routing-Konfiguration in `App.tsx`:

```typescript
// Route für die neue Seite
<Route path="/team-worktime-control" element={
  <ProtectedRoute entity="team_worktime_control" accessLevel="read">
    <TeamWorktimeControl />
  </ProtectedRoute>
} />
```

### Sidemenu-Integration

Erweiterung des Sidemenus in `Sidebar.tsx`:

```tsx
// Neuer Menüpunkt nach "Worktracker"
{hasPermission('team_worktime_control', 'read') && (
  <NavLink
    to="/team-worktime-control"
    className={({isActive}) => `${isActive ? activeClasses : inactiveClasses}`}
  >
    <UsersIcon className="h-6 w-6" />
    <span>Team Worktime Control</span>
  </NavLink>
)}
```

### Neue API-Services

Erweiterung von `api.ts` bzw. Erstellung eines neuen Service `teamWorktimeService.ts`:

```typescript
// API-Endpunkte für die neuen Funktionalitäten
export const TEAM_WORKTIME = {
  ACTIVE: `${API_URL}/team-worktime/active`,
  STOP_USER: `${API_URL}/team-worktime/stop-user`,
  USER_DAY: `${API_URL}/team-worktime/user-day`,
  UPDATE: `${API_URL}/team-worktime/update`,
  OVERTIME: `${API_URL}/team-worktime/overtime`
};
```

## Berechtigungskonzept

### Neue Berechtigungen

Für den Zugriff auf die Team Worktime Control-Funktionalität werden folgende Berechtigungen benötigt:

1. `team_worktime_control` (Seitenzugriff)
   - `read`: Ansicht der Seite
   - `write`: Bearbeitung (Stoppen von Zeiterfassungen, Ändern von Zeiten)
   - `both`: Vollzugriff

2. `team_worktime` (Tabellenzugriff)
   - `read`: Ansicht der Tabellendaten
   - `write`: Bearbeitung der Tabellendaten
   - `both`: Vollzugriff

### Rollen-Zuweisung

Die folgenden Rollen sollten Zugriff auf die Team Worktime Control-Funktionalität erhalten:

- Admin: Vollzugriff (`both`)
- Manager: Vollzugriff (`both`)
- Team Lead: Vollzugriff (`both`) (auf eigene Teams beschränkt)

## Benachrichtigungssystem

### Neue Benachrichtigungstypen

1. `worktime_manager_stop`: Wird ausgelöst, wenn ein Vorgesetzter die Zeiterfassung eines Benutzers stoppt

### Erweiterung der Benachrichtigungseinstellungen

Die Komponente `NotificationSettings.tsx` muss um die neuen Benachrichtigungstypen erweitert werden.

## API-Endpunkte

### Neue Endpunkte

1. `GET /team-worktime/active`: Aktive Zeiterfassungen im Team abrufen
   - Parameter: `teamId` (optional)
   - Rückgabe: Liste der Benutzer mit aktiver Zeiterfassung

2. `POST /team-worktime/stop-user`: Zeiterfassung eines Benutzers stoppen
   - Parameter: `userId`, `endTime`
   - Rückgabe: Aktualisierte Zeiterfassung

3. `GET /team-worktime/user-day`: Zeiterfassungen eines Benutzers für einen Tag abrufen
   - Parameter: `userId`, `date`
   - Rückgabe: Liste der Zeiterfassungen

4. `PUT /team-worktime/update`: Zeiterfassungen aktualisieren
   - Parameter: `id`, `startTime`, `endTime` (optional)
   - Rückgabe: Aktualisierte Zeiterfassung

5. `PUT /team-worktime/overtime`: Bewilligte Überstunden aktualisieren
   - Parameter: `userId`, `approvedOvertimeHours`
   - Rückgabe: Aktualisierter Benutzer

## UI/UX-Design

Die Team Worktime Control-Seite folgt dem bestehenden Design des Intranet-Systems:

### Layout

1. Header-Bereich mit Seitentitel und Icon
2. Zwei Tabs: "Aktive Zeiterfassungen" und "Teammitglieder Übersicht"
3. Suchfeld zur Filterung der Benutzer

### Tab "Aktive Zeiterfassungen"

- Tabelle mit Spalten: Name, Startzeit, Laufzeit, Niederlassung, Aktionen
- Button zum Stoppen der Zeiterfassung pro Benutzer
- Modal zur Angabe der Endzeit beim Stoppen

### Tab "Teammitglieder Übersicht"

- Auswahl eines Datums mit Datumsauswahl-Komponente
- Auswahl eines Benutzers aus Dropdown
- Tabelle mit Zeiterfassungen des Benutzers für den ausgewählten Tag
- Bearbeitungsmöglichkeit für Start-/Endzeiten
- Anzeige und Bearbeitung der bewilligten Überstunden

## Tests und Qualitätssicherung

1. Unit-Tests für neue Controller-Funktionen
2. Integration-Tests für API-Endpunkte
3. End-to-End-Tests für Frontend-Komponenten
4. Überprüfung der korrekten Zeitzonenverarbeitung

## Implementierungsplan

1. **Datenbank-Änderungen**
   - Migration für User-Tabelle (approvedOvertimeHours)
   - Seed-Daten für neue Berechtigungen

2. **Backend-Implementierung**
   - TeamWorktimeController erstellen
   - Middleware für Berechtigungsprüfungen
   - Erweiterung des Notification-Systems

3. **Frontend-Implementierung**
   - Neue Komponenten erstellen
   - API-Services implementieren
   - Routing und Sidemenu anpassen

4. **Testing und Qualitätssicherung**
   - Unit- und Integrationstests
   - Manuelle Funktionalitätstests
   - Review der Zeitzonenbehandlung

5. **Deployment**
   - Datenbankmigrationen ausführen
   - Backend und Frontend aktualisieren
   - Konfiguration überprüfen
