# Rollenauswahl und Berechtigungsmanagement

## Berechtigungsstruktur
Die Berechtigungsstruktur wurde aktualisiert, um granularere Kontrolle zu ermöglichen:

- Das Feld `page` wurde zu `entity` umbenannt und kann nun sowohl Seiten als auch Tabellen repräsentieren
- Das neue Feld `entityType` unterscheidet zwischen 'page' und 'table' Berechtigungen
- Für Tabellen wie "requests" und "tasks" wurden spezifische Tabellenberechtigungen eingeführt
- Die Frontend-Komponenten prüfen jetzt Berechtigungen mit `hasPermission('entity', 'accessLevel', 'entityType')`

### Implementierte Berechtigungen für Tabellen
- **requests**: Kontrolliert Zugriff auf Anfragen-Daten (Erstellen, Bearbeiten, Statusänderungen)
- **tasks**: Kontrolliert Zugriff auf Aufgaben-Daten (Erstellen, Bearbeiten, Statusänderungen)

## Rollenmanagement & Login
- Beim Login wird die zuletzt genutzte Rolle (`lastUsed=true`) für den Benutzer aktiviert
- Wenn keine zuletzt genutzte Rolle vorhanden ist, wird die Rolle mit der niedrigsten ID aktiviert
- Im Rollenauswahlmenü werden die Rollen alphabetisch (A-Z) sortiert angezeigt
- Nach einem Rollenwechsel bleibt diese Rolle auch für den nächsten Login aktiv (wird in der Datenbank gespeichert)

## Überblick

Die Rollenauswahl-Funktionalität ermöglicht es Benutzern, zwischen ihren zugewiesenen Rollen zu wechseln. Diese Funktion ist als Untermenü im Profilmenü der Topbar verfügbar und bietet folgenden Nutzen:

1. Schnelle Umschaltung zwischen verschiedenen Berechtigungsstufen
2. Klare Anzeige der aktuell aktiven Rolle
3. Konsistente Benutzeroberfläche mit anderen Menüoptionen
4. Intuitive Integration in das bestehende Benutzermenü

## Backend-Implementierung

### Datenmodell

Die Funktionalität nutzt das bestehende Datenmodell:

- `User`: Benutzer der Anwendung
- `Role`: Definierte Rollen mit Berechtigungen
- `UserRole`: Verknüpfung zwischen Benutzern und Rollen
  - Enthält das Feld `lastUsed` (Boolean), das angibt, welche Rolle aktiv ist

### API-Endpunkte

#### `PUT /api/users/switch-role`

Dieser Endpunkt wechselt die aktive Rolle eines Benutzers.

**Request-Parameter:**
```json
{
  "roleId": 2
}
```

**Response:**
```json
{
  "id": 1,
  "username": "benutzer",
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@beispiel.de",
  "roles": [
    {
      "role": {
        "id": 1,
        "name": "Administrator",
        "permissions": [...]
      },
      "lastUsed": false
    },
    {
      "role": {
        "id": 2,
        "name": "Mitarbeiter",
        "permissions": [...]
      },
      "lastUsed": true
    }
  ],
  "settings": {...}
}
```

## Frontend-Implementierung

### Komponenten

Die Funktionalität ist in die folgenden Komponenten integriert:

1. `Header.tsx`:
   - Enthält die Topbar und das Profilmenü
   - Implementiert die Rollenauswahl als Untermenü
   - Zeigt die aktive Rolle hervorgehoben an
   - Sortiert die Rollen alphabetisch (A-Z) für bessere Übersichtlichkeit

2. `authContext.tsx`:
   - Stellt den `switchRole` Kontext für die Anwendung bereit
   - Verwaltet den aktuellen Benutzer und seine aktive Rolle
   - Synchronisiert den Rollenwechsel mit dem Backend

2. `useAuth.tsx`:
   - Erweitert um die `switchRole`-Funktion
   - Aktualisiert den Benutzerkontext nach dem Rollenwechsel
   - Implementiert `hasPermission(entity, accessLevel, entityType)`-Funktion zur Berechtigungsprüfung
   - Verwaltet den aktuellen Benutzer und seine aktive Rolle
   - Sortiert die Rollen alphabetisch im Rollenauswahlmenü

### Benutzeroberfläche

Die Rollenauswahl ist als Untermenü im Profilmenü implementiert:

1. Der Benutzer klickt auf sein Profilbild/Namen in der Topbar
2. Im geöffneten Profilmenü sieht er die Option "Aktive Rolle: [Rollenname]"
3. Beim Klick auf diese Option öffnet sich ein Untermenü rechts daneben
4. In diesem Untermenü werden alle verfügbaren Rollen angezeigt
5. Die aktuelle Rolle ist farblich hervorgehoben

## Erweiterte Berechtigungsstruktur

Die Rollenauswahl wirkt sich auf die verfügbaren Berechtigungen aus. Mit der erweiterten Berechtigungsstruktur ergeben sich folgende Änderungen:

### Permissions-Objekt

Das Permissions-Objekt im Benutzerkontext wurde erweitert, um zwischen Seiten- und Tabellenberechtigungen zu unterscheiden:

```typescript
interface Permission {
  entity: string;       // Identifiziert Seite oder Tabelle
  entityType: string;   // 'page' oder 'table'
  accessLevel: 'read' | 'write' | 'both' | 'none';
}
```

### Berechtigungsprüfung

Die `hasPermission`-Funktion wurde aktualisiert, um die erweiterte Struktur zu unterstützen:

```typescript
const hasPermission = (
  entity: string, 
  accessLevel: 'read' | 'write', 
  entityType: 'page' | 'table' = 'page'
): boolean => {
  const permission = permissions.find(
    p => p.entity === entity && p.entityType === entityType
  );
  
  if (!permission) return false;
  
  if (permission.accessLevel === 'both') return true;
  return permission.accessLevel === accessLevel;
};
```

### Verwendungsbeispiel

```tsx
// Seitenzugriff prüfen (für Navigation)
{hasPermission('dashboard', 'read') && <DashboardLink />}

// Tabellenaktion prüfen (für CRUD-Operationen)
{hasPermission('tasks', 'write', 'table') && <CreateTaskButton />}
```

## Beispiel-Nutzung

1. Benutzer klickt auf sein Profilbild/Namen in der Topbar
2. Profilmenü öffnet sich mit Optionen wie "Profil", "Einstellungen" und "Aktive Rolle: [Rollenname]"
3. Klick auf "Aktive Rolle" öffnet das Rollen-Untermenü
4. Benutzer wählt eine andere Rolle aus dem Untermenü
5. Das Backend aktualisiert die `lastUsed`-Eigenschaft
6. Die Benutzeroberfläche schließt die Menüs und aktualisiert die Anzeige

## Fehlerbehandlung

- Wenn der Benutzer versucht, eine Rolle auszuwählen, die ihm nicht zugewiesen ist, wird eine Fehlermeldung angezeigt.
- Bei Netzwerkfehlern wird der Rollenwechsel nicht durchgeführt und eine entsprechende Nachricht im Frontend angezeigt.
- Die Rollenauswahl-Option wird nur angezeigt, wenn der Benutzer mehr als eine Rolle hat. 