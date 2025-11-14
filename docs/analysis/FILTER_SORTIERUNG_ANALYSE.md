# Analyse: Filter-Sortierung pro Zeile mit Reihenfolge

## Übersicht
Die Sortierung soll von spalten-basiert (`Record<string, 'asc' | 'desc'>`) zu zeilen-basiert mit Reihenfolge geändert werden:
- **Aktuell**: `sortDirections: { status: 'asc', branch: 'desc' }` (pro Spalte)
- **Neu**: `sortDirections: Array<{ column: string, direction: 'asc' | 'desc', priority: number }>` (pro Filterzeile mit Reihenfolge)

## Betroffene Dateien

### 1. Backend

#### 1.1 Prisma Schema
**Datei**: `backend/prisma/schema.prisma`
- **Aktuell**: `sortDirections String?` (JSON-String mit `Record<string, 'asc' | 'desc'>`)
- **Neu**: `sortDirections String?` (JSON-String mit `Array<{ column: string, direction: 'asc' | 'desc', priority: number }>`)
- **Änderung**: Schema bleibt gleich (String), nur das Format ändert sich

#### 1.2 Controller
**Datei**: `backend/src/controllers/savedFilterController.ts`
- **Betroffene Funktionen**:
  - `saveFilter`: `sortDirections` speichern (neues Format)
  - `getUserSavedFilters`: `sortDirections` parsen (neues Format)
  - `getFilterGroups`: `sortDirections` parsen (neues Format)
- **Interface**: `SavedFilterRequest` erweitern um neues Format

### 2. Frontend - Core Komponenten

#### 2.1 FilterRow
**Datei**: `frontend/src/components/FilterRow.tsx`
- **Aktuell**: `sortDirection?: 'asc' | 'desc'` (einzelne Richtung)
- **Neu**: `sortDirection?: 'asc' | 'desc'`, `sortPriority?: number` (Richtung + Priorität)
- **UI**: Priorität anzeigen (z.B. "1", "2", "3") neben Sortierrichtung

#### 2.2 FilterPane
**Datei**: `frontend/src/components/FilterPane.tsx`
- **Aktuell**: `sortDirections: Record<string, 'asc' | 'desc'>`
- **Neu**: `sortDirections: Array<{ column: string, direction: 'asc' | 'desc', priority: number }>`
- **Änderungen**:
  - State-Management für Array-basierte Sortierrichtungen
  - Priorität verwalten (beim Hinzufügen/Entfernen von Zeilen)
  - UI für Prioritäts-Anzeige und -Änderung

#### 2.3 SavedFilterTags
**Datei**: `frontend/src/components/SavedFilterTags.tsx`
- **Interface**: `SavedFilter` erweitern um neues Format
- **Props**: `onSelectFilter` und `onFilterChange` anpassen

### 3. Frontend - Seiten/Komponenten mit Filtern

#### 3.1 Worktracker (To-Dos)
**Datei**: `frontend/src/pages/Worktracker.tsx`
- **TableId**: `'worktracker-todos'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `title`, `status`, `responsibleAndQualityControl`, `branch`, `dueDate`

#### 3.2 Requests
**Datei**: `frontend/src/components/Requests.tsx`
- **TableId**: `'requests-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `title`, `status`, `type`, `requestedBy`, `responsible`, `branch`, `dueDate`

#### 3.3 ConsultationList
**Datei**: `frontend/src/components/ConsultationList.tsx`
- **TableId**: `'consultations-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `client`, `branch`, `notes`, `startTime`, `duration`, `invoiceStatus`

#### 3.4 RoleManagementTab
**Datei**: `frontend/src/components/RoleManagementTab.tsx`
- **TableId**: `'roles-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `name`, `description`

#### 3.5 BranchManagementTab
**Datei**: `frontend/src/components/BranchManagementTab.tsx`
- **TableId**: `'branches-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `name`, `address`, `city`, `country`

#### 3.6 ActiveUsersList (Workcenter)
**Datei**: `frontend/src/components/teamWorktime/ActiveUsersList.tsx`
- **TableId**: `'workcenter-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `name`, `branch`, `hasActiveWorktime`, `duration`

#### 3.7 TodoAnalyticsTab
**Datei**: `frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx`
- **TableId**: `'todo-analytics-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `time`, `title`, `status`, `responsible`, `qualityControl`, `branch`

#### 3.8 RequestAnalyticsTab
**Datei**: `frontend/src/components/teamWorktime/RequestAnalyticsTab.tsx`
- **TableId**: `'request-analytics-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `time`, `title`, `status`, `requester`, `responsible`, `branch`

#### 3.9 InvoiceManagementTab
**Datei**: `frontend/src/components/InvoiceManagementTab.tsx`
- **TableId**: `'invoice-management'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `client`, `status`, `total`

#### 3.10 MyJoinRequestsList
**Datei**: `frontend/src/components/organization/MyJoinRequestsList.tsx`
- **TableId**: `'my-join-requests-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `organization`, `message`, `status`

#### 3.11 JoinRequestsList
**Datei**: `frontend/src/components/organization/JoinRequestsList.tsx`
- **TableId**: `'join-requests-table'`
- **Status**: ✅ Verwendet FilterPane + SavedFilterTags
- **Sortierung**: Muss angepasst werden
- **Spalten**: `requester`, `message`, `status`

#### 3.12 ConsultationTracker
**Datei**: `frontend/src/components/ConsultationTracker.tsx`
- **Status**: ❌ Verwendet KEINE Filter (nur Events für ConsultationList)
- **Änderung**: Keine Änderung erforderlich

## Zusammenfassung

### Anzahl betroffener Dateien
- **Backend**: 1 Datei (Controller)
- **Frontend Core**: 3 Dateien (FilterRow, FilterPane, SavedFilterTags)
- **Frontend Seiten**: 12 Dateien (alle mit FilterPane/SavedFilterTags)

### Gesamt: 16 Dateien

## Neue Datenstruktur

### Altes Format
```typescript
sortDirections: {
  "status": "asc",
  "branch": "desc"
}
```

### Neues Format
```typescript
sortDirections: [
  { column: "status", direction: "asc", priority: 1 },
  { column: "branch", direction: "desc", priority: 2 }
]
```

## UI-Änderungen

### FilterRow
- Sortierrichtung-Button bleibt (↑/↓)
- **NEU**: Prioritäts-Anzeige (z.B. "1", "2", "3") neben Button
- **NEU**: Priorität ändern (Drag & Drop oder Buttons)

### FilterPane
- Prioritäten automatisch verwalten (1, 2, 3, ...)
- Beim Hinzufügen/Entfernen von Zeilen: Prioritäten neu nummerieren
- **NEU**: UI zum Ändern der Prioritäts-Reihenfolge

## Sortierungslogik

### Aktuell
- Sortierung nach `sortDirections[condition.column]`
- Reihenfolge: Nach Filterbedingungen (keine explizite Priorität)

### Neu
- Sortierung nach `priority` (1, 2, 3, ...)
- Mehrfachsortierung: Zuerst nach priority 1, dann priority 2, etc.
- Nur Zeilen mit gesetzter Sortierrichtung werden berücksichtigt

## Migration

### Datenbank
- Bestehende `sortDirections` müssen konvertiert werden
- Migration: Altes Format → Neues Format
- Fallback: Wenn altes Format erkannt wird, konvertieren

### Rückwärtskompatibilität
- Alte Filter ohne `sortDirections`: Keine Sortierung
- Alte Filter mit altem Format: Automatisch konvertieren beim Laden

## Implementierungsreihenfolge

1. **Backend**: Schema/Controller anpassen (Format ändern)
2. **Frontend Core**: FilterRow, FilterPane, SavedFilterTags
3. **Frontend Seiten**: Alle 12 Seiten anpassen
4. **Migration**: Datenkonvertierung für bestehende Filter
5. **Testing**: Alle Tabellen testen

