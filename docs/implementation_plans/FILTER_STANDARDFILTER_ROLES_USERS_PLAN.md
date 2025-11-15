# Plan: Standardfilter für Rollen und Benutzer bei Requests und ToDos

## Übersicht

Erweiterung des Filtersystems um automatisch generierte Standardfilter für Rollen und Benutzer bei Requests und ToDos. Diese Filter werden für jeden Benutzer erstellt und in Gruppen organisiert.

## Anforderungen

### 1. Requests (`requests-table`)

**Für Admin-Rollen:**
- Filter-Gruppe "Roles" erstellen
- Für jede Rolle der Organisation einen Filter:
  - `requestedBy = role-{id}` ODER `responsible = role-{id}`
  - Filter-Name: Rollenname (z.B. "Admin", "Reception", etc.)

**Für jeden Benutzer:**
- Filter-Gruppe "Users" erstellen
- Für jeden Benutzer der Organisation einen Filter:
  - `requestedBy = user-{id}` ODER `responsible = user-{id}`
  - Filter-Name: Benutzername (z.B. "John Doe")

### 2. ToDos (`worktracker-todos`)

**Für Admin-Rollen:**
- Filter-Gruppe "Roles" erstellen
- Für jede Rolle der Organisation einen Filter:
  - `responsible = role-{id}`
  - Filter-Name: Rollenname

**Für jeden Benutzer:**
- Filter-Gruppe "Users" erstellen
- Für jeden Benutzer der Organisation einen Filter:
  - `responsible = user-{id}` ODER `qualityControl = user-{id}`
  - Filter-Name: Benutzername

### 3. FilterRow-Komponente

**Sicherstellen, dass User/Role-Spalten IMMER Dropdowns verwenden:**
- `requestedBy`: Dropdown (User + Rollen)
- `responsible`: Dropdown (User + Rollen)
- `qualityControl`: Dropdown (nur User)
- Keine Text-Eingabe für diese Spalten möglich

### 4. Seed-Integration

- Standardfilter im Seed erstellen
- Für jeden Benutzer beim Seed ausführen
- Filter-Gruppen erstellen und Filter zuordnen

## Technische Details

### Datenstruktur

**Filter-Gruppe:**
```typescript
{
  userId: number,
  tableId: 'requests-table' | 'worktracker-todos',
  name: 'Roles' | 'Users' (übersetzt),
  order: number
}
```

**Filter:**
```typescript
{
  userId: number,
  tableId: 'requests-table' | 'worktracker-todos',
  name: string, // Rollenname oder Benutzername
  conditions: [
    { column: 'requestedBy' | 'responsible' | 'qualityControl', operator: 'equals', value: 'role-{id}' | 'user-{id}' }
    // Bei Requests: ODER-Verknüpfung für requestedBy/responsible
  ],
  operators: ['OR'] | [], // Bei Requests mit ODER, sonst leer
  groupId: number, // ID der Filter-Gruppe
  order: number
}
```

### API-Endpunkte

Bereits vorhanden:
- `POST /api/saved-filters/groups` - Filter-Gruppe erstellen
- `POST /api/saved-filters` - Filter erstellen
- `POST /api/saved-filters/:filterId/group/:groupId` - Filter zu Gruppe hinzufügen

### Organisation und Rollen abrufen

**Backend:**
- `getAllRoles(req)` - Alle Rollen der Organisation (mit `getDataIsolationFilter`)
- `getAllUsersForDropdown(req)` - Alle Benutzer der Organisation (mit `getUserOrganizationFilter`)

**Admin-Rollen identifizieren:**
- Rolle mit `name = 'Admin'`
- Kann `organizationId` haben (organisations-spezifisch) oder `null` (global)

## Implementierungsschritte

### Phase 1: Backend - Seed-Erweiterung

1. **Neue Funktion im Seed erstellen:**
   - `createRoleAndUserFilters(userId: number, organizationId: number | null)`
   - Parameter: userId, organizationId
   - Erstellt Filter für Requests und ToDos

2. **Filter-Gruppen erstellen:**
   - "Roles" Gruppe für `requests-table`
   - "Users" Gruppe für `requests-table`
   - "Roles" Gruppe für `worktracker-todos`
   - "Users" Gruppe für `worktracker-todos`
   - Übersetzungen berücksichtigen (DE: "Rollen", "Benutzer", ES: "Roles", "Usuarios", EN: "Roles", "Users")

3. **Rollen-Filter erstellen:**
   - Alle Rollen der Organisation abrufen (`getAllRoles`)
   - Für jede Rolle:
     - **Requests:** Filter mit `requestedBy = role-{id} OR responsible = role-{id}`
     - **ToDos:** Filter mit `responsible = role-{id}`
     - Filter zur "Roles"-Gruppe hinzufügen

4. **Benutzer-Filter erstellen:**
   - Alle Benutzer der Organisation abrufen (`getAllUsersForDropdown`)
   - Für jeden Benutzer:
     - **Requests:** Filter mit `requestedBy = user-{id} OR responsible = user-{id}`
     - **ToDos:** Filter mit `responsible = user-{id} OR qualityControl = user-{id}`
     - Filter zur "Users"-Gruppe hinzufügen

5. **Seed-Integration:**
   - Funktion für jeden Benutzer im Seed aufrufen
   - Nach Erstellung der Benutzer und Rollen

### Phase 2: Frontend - FilterRow-Anpassung

1. **Dropdown-Erzwingung für User/Role-Spalten:**
   - `requestedBy`: Prüfen ob Spalte existiert → Dropdown anzeigen
   - `responsible`: Prüfen ob Spalte existiert → Dropdown anzeigen
   - `qualityControl`: Prüfen ob Spalte existiert → Dropdown anzeigen
   - Text-Eingabe für diese Spalten deaktivieren

2. **Spalten-Erkennung:**
   - In `FilterRow.tsx` prüfen, ob Spalte User/Role-Spalte ist
   - Liste der User/Role-Spalten definieren:
     - Requests: `['requestedBy', 'responsible']`
     - ToDos: `['responsible', 'qualityControl']`

3. **Fallback-Logik:**
   - Wenn Spalte nicht erkannt wird, aber User/Role-Format (`user-{id}` oder `role-{id}`) verwendet wird, trotzdem Dropdown anzeigen

### Phase 3: Frontend - Standardfilter-Erstellung (Optional)

1. **createStandardFilters erweitern:**
   - In `Requests.tsx` und `Worktracker.tsx`
   - Prüfen ob Rollen/User-Filter bereits existieren
   - Fehlende Filter erstellen
   - Filter-Gruppen erstellen falls nicht vorhanden

2. **Migration bestehender Filter:**
   - Bestehende Filter prüfen
   - Falls Filter ohne Gruppe existieren, zu passender Gruppe hinzufügen

## Dateien die geändert werden müssen

### Backend

1. **`backend/prisma/seed.ts`**
   - Neue Funktion `createRoleAndUserFilters`
   - Aufruf für jeden Benutzer nach Erstellung

### Frontend

1. **`frontend/src/components/FilterRow.tsx`**
   - Dropdown-Erzwingung für User/Role-Spalten
   - Spalten-Erkennung erweitern

2. **`frontend/src/components/Requests.tsx`** (Optional)
   - `createStandardFilters` erweitern für Rollen/User-Filter

3. **`frontend/src/pages/Worktracker.tsx`** (Optional)
   - `createStandardFilters` erweitern für Rollen/User-Filter

## Übersetzungen

### Neue Übersetzungsschlüssel

```json
{
  "filter": {
    "groups": {
      "roles": "Rollen",
      "users": "Benutzer"
    }
  }
}
```

**DE:**
- `filter.groups.roles`: "Rollen"
- `filter.groups.users`: "Benutzer"

**EN:**
- `filter.groups.roles`: "Roles"
- `filter.groups.users`: "Users"

**ES:**
- `filter.groups.roles`: "Roles"
- `filter.groups.users`: "Usuarios"

## Testfälle

1. **Seed-Test:**
   - Seed ausführen
   - Prüfen ob Filter-Gruppen erstellt wurden
   - Prüfen ob Filter für alle Rollen/Benutzer erstellt wurden
   - Prüfen ob Filter korrekt zu Gruppen zugeordnet wurden

2. **FilterRow-Test:**
   - Filter-Panel öffnen
   - Spalte "requestedBy" auswählen → Dropdown muss erscheinen
   - Spalte "responsible" auswählen → Dropdown muss erscheinen
   - Spalte "qualityControl" auswählen → Dropdown muss erscheinen
   - Text-Eingabe für diese Spalten muss nicht möglich sein

3. **Filter-Anwendung:**
   - Filter aus "Roles"-Gruppe auswählen
   - Prüfen ob korrekte Requests/ToDos angezeigt werden
   - Filter aus "Users"-Gruppe auswählen
   - Prüfen ob korrekte Requests/ToDos angezeigt werden

## Risiken und Überlegungen

1. **Performance:**
   - Bei vielen Rollen/Benutzern werden viele Filter erstellt
   - Filter-Gruppen helfen bei der Organisation
   - Seed kann länger dauern

2. **Datenisolation:**
   - Filter müssen nur für Rollen/Benutzer der eigenen Organisation erstellt werden
   - `getDataIsolationFilter` und `getUserOrganizationFilter` verwenden

3. **Admin-Rollen:**
   - Globaler Admin (`organizationId = null`) sieht alle Organisationen
   - Organisations-spezifische Admins sehen nur ihre Organisation
   - Filter entsprechend anpassen

4. **Bestehende Filter:**
   - Bestehende Filter nicht überschreiben
   - Nur fehlende Filter erstellen
   - Prüfung auf Existenz vor Erstellung

## Offene Fragen

1. Sollen Filter auch für inaktive Benutzer erstellt werden?
   - **Empfehlung:** Nur aktive Benutzer (wie `getAllUsersForDropdown`)

2. Sollen Filter auch für Rollen ohne Benutzer erstellt werden?
   - **Empfehlung:** Ja, auch leere Rollen können relevant sein

3. Was passiert wenn neue Rollen/Benutzer hinzugefügt werden?
   - **Empfehlung:** Frontend `createStandardFilters` erweitern, um fehlende Filter zu erstellen

4. Sollen Filter für globale Rollen (organizationId = null) erstellt werden?
   - **Empfehlung:** Nur wenn Benutzer globaler Admin ist

