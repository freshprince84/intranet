# Implementierungsplan: Sortierung pro Filter

## Übersicht
Die Sortierung soll von einer globalen Einstellung pro User zu einer pro-Filter Einstellung geändert werden. Bei jeder Spalte, die im Filter eingestellt wird, soll es möglich sein, die Sortierung (auf- oder absteigend) einzustellen.

## Anforderungen

1. **Sortierung pro Filter pro User**: Jeder gespeicherte Filter soll seine eigene Sortierung haben
2. **Sortierung pro Spalte im Filter**: Bei jeder Spalte, die im Filter eingestellt wird, soll eine Sortierrichtung (asc/desc) wählbar sein
3. **Card-Ansicht**: Die "allgemeine" Sortierung (TableColumnConfig) soll für Card-Ansicht entfernt werden
4. **Tabellen-Ansicht**: Die Sortierung im Spaltenheader bleibt unverändert (wird nicht angefasst)

## Technische Änderungen

### 1. Backend-Änderungen

#### 1.1 Datenbankschema (Prisma)
**Datei**: `backend/prisma/schema.prisma`

**Änderung**: SavedFilter Model erweitern um `sortDirections` Feld:
```prisma
model SavedFilter {
  id         Int      @id @default(autoincrement())
  userId     Int
  tableId    String
  name       String
  conditions String
  operators  String
  sortDirections String?  // NEU: JSON-String mit Record<string, 'asc' | 'desc'>
  groupId    Int?
  order      Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
  group      FilterGroup? @relation(fields: [groupId], references: [id])

  @@unique([userId, tableId, name])
}
```

**Migration erstellen**: Neue Migration für `sortDirections` Feld

#### 1.2 Controller-Änderungen
**Datei**: `backend/src/controllers/savedFilterController.ts`

**Änderungen**:
- `saveFilter`: `sortDirections` aus Request Body lesen und als JSON-String speichern
- `getFiltersByTable`: `sortDirections` aus JSON-String parsen und zurückgeben
- `deleteFilter`: Keine Änderung nötig
- `createFilterGroup`: Keine Änderung nötig
- `getFilterGroups`: `sortDirections` aus JSON-String parsen und zurückgeben
- `updateFilterGroup`: Keine Änderung nötig

**Details**:
- `sortDirections` wird als JSON-String gespeichert (wie `conditions` und `operators`)
- Format: `Record<string, 'asc' | 'desc'>` (z.B. `{"title": "asc", "dueDate": "desc"}`)
- Beim Parsen: `JSON.parse(filter.sortDirections || '{}')` verwenden

### 2. Frontend-Änderungen

#### 2.1 FilterRow Komponente
**Datei**: `frontend/src/components/FilterRow.tsx`

**Änderungen**:
- Neue Props: `sortDirection?: 'asc' | 'desc'` und `onSortDirectionChange?: (direction: 'asc' | 'desc') => void`
- UI: Sortierrichtung-Button/Icons neben jeder Filterbedingung hinzufügen
- Design: Ähnlich wie in TableColumnConfig, aber kompakter

**Details**:
- Sortierrichtung nur anzeigen, wenn eine Spalte ausgewählt ist (`condition.column !== ''`)
- Button mit Pfeil-Icons (ArrowUpIcon/ArrowDownIcon) oder Toggle-Button
- Standard: `'asc'` wenn nicht gesetzt

#### 2.2 FilterPane Komponente
**Datei**: `frontend/src/components/FilterPane.tsx`

**Änderungen**:
- Neue Props: `savedSortDirections?: Record<string, 'asc' | 'desc'>` und `onSortDirectionsChange?: (sortDirections: Record<string, 'asc' | 'desc'>) => void`
- State: `sortDirections` State hinzufügen
- FilterRow: `sortDirection` und `onSortDirectionChange` Props übergeben
- Beim Speichern: `sortDirections` mit an Backend senden

**Details**:
- `sortDirections` State initialisieren mit `savedSortDirections || {}`
- Bei Änderung einer Sortierrichtung: State aktualisieren und `onSortDirectionsChange` aufrufen
- Beim Speichern: `sortDirections` im Request Body mitsenden

#### 2.3 Worktracker Komponente
**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:

1. **State Management**:
   - `sortConfig` State entfernen (Zeile 180)
   - `cardSortDirections` State entfernen (Zeile 209)
   - Neuer State: `filterSortDirections: Record<string, 'asc' | 'desc'>` (aus aktuellem Filter)

2. **Filter-Anwendung**:
   - `applyFilterConditions`: Auch `sortDirections` aus Filter übernehmen
   - `handleFilterChange`: `sortDirections` aus Filter laden
   - `resetFilterConditions`: `sortSortDirections` zurücksetzen

3. **Sortierung in filteredAndSortedTasks**:
   - Sortierung basierend auf `filterSortDirections` anwenden (nicht mehr `sortConfig` oder `cardSortDirections`)
   - Für jede Spalte in `filterSortDirections`: Sortierung anwenden
   - Reihenfolge: Nach der Reihenfolge der Filterbedingungen sortieren

4. **TableColumnConfig entfernen (nur für Cards)**:
   - `showSortDirection={viewMode === 'cards'}` entfernen
   - `sortDirections` und `onSortDirectionChange` Props entfernen (nur für Cards)
   - Button/Modal für Sortierung in Card-Ansicht entfernen

5. **FilterPane Integration**:
   - `savedSortDirections={filterSortDirections}` übergeben
   - `onSortDirectionsChange`: State aktualisieren

6. **Tabellen-Sortierung**:
   - `handleSort` Funktion bleibt unverändert (für Tabellen-Header)
   - Tabellen-Header-Sortierung funktioniert weiterhin wie bisher

#### 2.4 SavedFilterTags Komponente
**Datei**: `frontend/src/components/SavedFilterTags.tsx`

**Änderungen**:
- `SavedFilter` Interface erweitern um `sortDirections?: Record<string, 'asc' | 'desc'>`
- Beim Laden von Filtern: `sortDirections` mit übergeben
- Beim Anwenden eines Filters: `sortDirections` mit übergeben

#### 2.5 API-Integration
**Datei**: `frontend/src/config/api.ts` (falls vorhanden)

**Änderungen**:
- API-Endpoints bleiben unverändert
- Request Body für `saveFilter` erweitern um `sortDirections`

### 3. Datenmigration

**Option 1: Leere Sortierungen für bestehende Filter**
- Bestehende Filter haben `sortDirections = null` oder `{}`
- Beim Laden: Fallback auf leeres Objekt `{}`
- Keine automatische Migration nötig

**Option 2: Standard-Sortierung für bestehende Filter**
- Migration-Script erstellen, das für alle bestehenden Filter eine Standard-Sortierung setzt
- Standard: `{"dueDate": "asc"}` (oder ähnlich)

**Empfehlung**: Option 1 (keine Migration, leere Sortierungen)

## Implementierungsschritte

### Phase 1: Backend
1. Prisma Schema erweitern
2. Migration erstellen und ausführen
3. Controller anpassen (saveFilter, getFiltersByTable, getFilterGroups)
4. API-Tests durchführen

### Phase 2: Frontend - FilterRow & FilterPane
1. FilterRow: Sortierrichtung-UI hinzufügen
2. FilterPane: Sortierrichtungen State und Props hinzufügen
3. FilterPane: Sortierrichtungen beim Speichern mitsenden
4. UI-Tests durchführen

### Phase 3: Frontend - Worktracker Integration
1. State Management anpassen (sortConfig entfernen, filterSortDirections hinzufügen)
2. Sortierung in filteredAndSortedTasks anpassen
3. TableColumnConfig für Cards entfernen
4. FilterPane Integration
5. SavedFilterTags Integration
6. Funktions-Tests durchführen

### Phase 4: Testing & Cleanup
1. Card-Ansicht testen (Sortierung pro Filter)
2. Tabellen-Ansicht testen (Header-Sortierung unverändert)
3. Filter speichern/laden testen
4. Code-Cleanup (entfernte States, ungenutzte Funktionen)

## UI/UX Design

### FilterRow Sortierrichtung
- **Position**: Rechts neben dem Wert-Eingabefeld
- **Design**: Toggle-Button mit Pfeil-Icons
  - Aufsteigend (asc): ↑ Icon
  - Absteigend (desc): ↓ Icon
- **Verhalten**: 
  - Klick wechselt zwischen asc/desc
  - Standard: asc (wenn nicht gesetzt)
  - Nur sichtbar, wenn Spalte ausgewählt ist

### FilterPane
- **Anzeige**: Sortierrichtung wird in jeder FilterRow angezeigt
- **Speichern**: Sortierrichtungen werden automatisch mit gespeichert

## Rückwärtskompatibilität

- Bestehende Filter ohne `sortDirections` funktionieren weiterhin
- Fallback auf leeres Objekt `{}` (keine Sortierung)
- Tabellen-Header-Sortierung bleibt unverändert

## Offene Fragen / Entscheidungen

1. **Standard-Sortierung**: Soll es eine Standard-Sortierung geben, wenn kein Filter aktiv ist?
   - **Entscheidung**: Ja, Standard-Sortierung nach `dueDate: 'asc'` wenn kein Filter aktiv ist

2. **Mehrfach-Sortierung**: Soll die Reihenfolge der Sortierung der Reihenfolge der Filterbedingungen folgen?
   - **Entscheidung**: Ja, Sortierung in der Reihenfolge der Filterbedingungen anwenden

3. **Tabellen-Header-Sortierung**: Soll die Header-Sortierung weiterhin funktionieren, auch wenn ein Filter aktiv ist?
   - **Entscheidung**: Ja, Header-Sortierung hat Priorität über Filter-Sortierung (oder umgekehrt?)
   - **Entscheidung**: Filter-Sortierung hat Priorität, Header-Sortierung wird ignoriert wenn Filter aktiv ist

## Testing Checkliste

- [ ] Filter speichern mit Sortierrichtungen
- [ ] Filter laden mit Sortierrichtungen
- [ ] Sortierrichtungen in FilterRow ändern
- [ ] Sortierung in Card-Ansicht anwenden
- [ ] Tabellen-Header-Sortierung funktioniert weiterhin
- [ ] Filter ohne Sortierrichtungen (rückwärtskompatibel)
- [ ] Mehrere Filterbedingungen mit unterschiedlichen Sortierrichtungen
- [ ] Filter zurücksetzen setzt auch Sortierrichtungen zurück

