# Plan: Filter-Probleme beheben

## Übersicht

Behebung aller identifizierten Filter-Probleme in Requests, ToDo's, Workcenter und Tours.

---

## Problem 1: Requests (`requests-table`)

### 1.1 Filter "Todos"/"Alle" entfernen

**Problem:** Es gibt einen Filter "Todos" bzw. "Alle", der nicht existieren sollte.

**Lösung:**
- Im Seed prüfen, ob ein Filter mit Namen "Todos" oder "Alle" für `requests-table` erstellt wird
- Falls vorhanden: Entfernen aus Seed
- Falls bereits in DB: Migration-Script erstellen, um alle "Todos"/"Alle" Filter für `requests-table` zu löschen

**Dateien:**
- `backend/prisma/seed.ts` - Prüfen und entfernen
- Optional: Migration-Script für bestehende Daten

---

### 1.2 Filtergruppe "Users": Filterzeilen von "Actual" hinzufügen

**Problem:** In der Filtergruppe mit allen Benutzern fehlen die Filterzeilen von "Actual". 
Die User-Filter sollten zusätzlich zu `requestedBy = user` ODER `responsible = user` auch die Bedingung `status != 'approved' AND status != 'denied'` enthalten.

**Aktueller Zustand (Seed Zeile 2242-2248):**
```typescript
if (table.id === 'requests-table') {
  conditions = [
    { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
    { column: 'responsible', operator: 'equals', value: `user-${user.id}` }
  ];
  operators = ['OR'];
}
```

**Soll-Zustand:**
```typescript
if (table.id === 'requests-table') {
  conditions = [
    { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
    { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
    { column: 'status', operator: 'notEquals', value: 'approved' },
    { column: 'status', operator: 'notEquals', value: 'denied' }
  ];
  operators = ['OR', 'AND', 'AND']; // OR zwischen user-Bedingungen, dann AND für status
}
```

**Dateien:**
- `backend/prisma/seed.ts` - Zeile 2242-2248 anpassen
- Migration-Script für bestehende User-Filter in DB

---

### 1.3 Operator-Dropdown für "tipo": != hinzufügen, sinnlose Operatoren entfernen

**Problem:** Bei der Spalte "tipo" (type) fehlt der Operator `!=` (notEquals), enthält aber sinnlose Ausprägungen wie "contiene" (contains). Sollte gleich wie bei "estado" (status) sein.

**Aktueller Zustand (FilterRow.tsx Zeile 45-88):**
- `type` wird als Text-Spalte behandelt → bekommt `textOperators` (equals, contains, startsWith, endsWith)
- `status` bekommt `statusOperators` (equals, notEquals)

**Soll-Zustand:**
- `type` sollte `statusOperators` bekommen (equals, notEquals)
- Dropdown für `type` sollte wie `status` sein (nur equals/notEquals)

**Dateien:**
- `frontend/src/components/FilterRow.tsx` - Zeile 45-88: `getOperatorsByColumnType` anpassen
  - `type` zu `statusOperators` hinzufügen
- `frontend/src/components/FilterRow.tsx` - Zeile 387-406: `renderValueInput` für `type` bereits vorhanden (Dropdown), passt

---

## Problem 2: To Do's (`worktracker-todos`)

### 2.1 Filtergruppe "Users": Filterzeilen von "Actual" hinzufügen

**Problem:** In der Filtergruppe mit allen Benutzern fehlen die Filterzeilen von "Actual".
Die User-Filter sollten zusätzlich zu `responsible = user` ODER `qualityControl = user` auch die Bedingung `status != 'done'` enthalten.

**Aktueller Zustand (Seed Zeile 2249-2256):**
```typescript
} else if (table.id === 'worktracker-todos') {
  // ToDos: responsible = user ODER qualityControl = user
  conditions = [
    { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
    { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` }
  ];
  operators = ['OR'];
}
```

**Soll-Zustand:**
```typescript
} else if (table.id === 'worktracker-todos') {
  // ToDos: responsible = user ODER qualityControl = user UND status != 'done'
  conditions = [
    { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
    { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
    { column: 'status', operator: 'notEquals', value: 'done' }
  ];
  operators = ['OR', 'AND']; // OR zwischen user-Bedingungen, dann AND für status
}
```

**Dateien:**
- `backend/prisma/seed.ts` - Zeile 2249-2256 anpassen
- Migration-Script für bestehende User-Filter in DB

---

### 2.2 Operator-Dropdown für "sucursal" (branch): != hinzufügen, sinnlose Operatoren entfernen

**Problem:** Bei der Spalte "sucursal" (branch) fehlt der Operator `!=` (notEquals), enthält aber sinnlose Ausprägungen wie "contiene" (contains). Sollte gleich wie bei "estado" (status) sein.

**Aktueller Zustand (FilterRow.tsx Zeile 45-88):**
- `branch` wird als Text-Spalte behandelt → bekommt `textOperators` (equals, contains, startsWith, endsWith)
- `status` bekommt `statusOperators` (equals, notEquals)

**Soll-Zustand:**
- `branch` sollte `statusOperators` bekommen (equals, notEquals)
- Dropdown für `branch` ist bereits vorhanden (Zeile 456-477), passt

**Dateien:**
- `frontend/src/components/FilterRow.tsx` - Zeile 45-88: `getOperatorsByColumnType` anpassen
  - `branch` zu `statusOperators` hinzufügen (Zeile 80)

---

### 2.3 "acciones" (actions) aus FilterPane entfernen

**Problem:** "acciones" (actions) soll nicht im FilterPane als Filtermöglichkeit verfügbar sein.

**Aktueller Zustand (Worktracker.tsx):**
- FilterPane bekommt `columns` Array mit allen Spalten
- Muss prüfen, welche Spalten übergeben werden

**Lösung:**
- In `Worktracker.tsx` prüfen, welche Spalten an FilterPane übergeben werden
- `actions` aus dem `columns` Array entfernen

**Dateien:**
- `frontend/src/pages/Worktracker.tsx` - FilterPane `columns` Array anpassen
  - `actions` Spalte entfernen

---

### 2.4 "responsable/qc" (responsibleAndQualityControl) aus FilterPane entfernen

**Problem:** "responsable/qc" als Kombifeld soll nicht im FilterPane als Filtermöglichkeit verfügbar sein.

**Lösung:**
- In `Worktracker.tsx` prüfen, welche Spalten an FilterPane übergeben werden
- `responsibleAndQualityControl` aus dem `columns` Array entfernen
- Stattdessen sollten `responsible` und `qualityControl` einzeln verfügbar sein (falls gewünscht)

**Dateien:**
- `frontend/src/pages/Worktracker.tsx` - FilterPane `columns` Array anpassen
  - `responsibleAndQualityControl` Spalte entfernen
  - Prüfen ob `responsible` und `qualityControl` einzeln vorhanden sind

---

## Problem 3: Workcenter (`workcenter-table`)

### 3.1 Filter "todos" hat Löschenkreuzchen - darf nicht sein bei Standardfiltern

**Problem:** Der Filter/Filtertab "todos" (Alle) hat ein Löschenkreuzchen, obwohl er ein Standardfilter ist.

**Aktueller Zustand (SavedFilterTags.tsx Zeile 305-328):**
- `isStandardFilter` prüft auf: 'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche', 'Hoy'
- "todos" wird nicht erkannt als Standardfilter

**Lösung:**
- "todos" zu `standardFilterNames` hinzufügen
- Oder: Prüfen ob Filter-Name übersetzt wird und dann "Alle" ist

**Dateien:**
- `frontend/src/components/SavedFilterTags.tsx` - Zeile 308: `standardFilterNames` Array erweitern
  - 'Todos' hinzufügen
- Oder: `translateFilterName` prüfen (Zeile 58-72) - "todos" sollte zu "Alle" übersetzt werden

---

### 3.2 Filter lässt sich nicht wechseln

**Problem:** Der Filter lässt sich nicht wechseln.

**Mögliche Ursachen:**
- Filter-Name wird nicht korrekt erkannt/übersetzt
- `onFilterChange` wird nicht korrekt aufgerufen
- Filter-ID stimmt nicht

**Zu prüfen:**
- `ActiveUsersList.tsx` - `handleFilterChange` Funktion
- `SavedFilterTags.tsx` - `onFilterChange` Aufruf
- Filter-Name vs. übersetzter Name

**Dateien:**
- `frontend/src/components/teamWorktime/ActiveUsersList.tsx` - `handleFilterChange` prüfen
- `frontend/src/components/SavedFilterTags.tsx` - Filter-Wechsel-Logik prüfen

---

## Problem 7: Tours (`worktracker-tours`)

### 7.1 Falsche Filter werden angezeigt (Reservations-Filter statt Tours-Filter)

**Problem:** Es werden immer noch die Filter von Reservations (also die falschen) angezeigt.

**Aktueller Zustand (ToursTab.tsx Zeile 670-678):**
```typescript
<SavedFilterTags
  tableId={TOURS_TABLE_ID}
  ...
/>
```

**Mögliche Ursachen:**
- `TOURS_TABLE_ID` ist falsch definiert
- Filter werden für falsche `tableId` geladen
- `RESERVATIONS_TABLE_ID` wird versehentlich verwendet

**Zu prüfen:**
- `TOURS_TABLE_ID` Definition (Zeile 30)
- Prüfen ob `RESERVATIONS_TABLE_ID` irgendwo verwendet wird
- Filter-Context lädt Filter für falsche `tableId`

**Dateien:**
- `frontend/src/components/tours/ToursTab.tsx` - Zeile 30: `TOURS_TABLE_ID` prüfen
- Prüfen ob `RESERVATIONS_TABLE_ID` versehentlich verwendet wird
- `FilterContext.tsx` - Filter-Laden prüfen

---

## Implementierungsreihenfolge

1. **Backend (Seed):**
   - 1.1: "Todos"/"Alle" Filter für Requests entfernen
   - 1.2: User-Filter für Requests erweitern (status-Bedingungen)
   - 2.1: User-Filter für ToDos erweitern (status-Bedingungen)

2. **Frontend (FilterRow):**
   - 1.3: Operator-Dropdown für "type" anpassen
   - 2.2: Operator-Dropdown für "branch" anpassen

3. **Frontend (Worktracker):**
   - 2.3: "actions" aus FilterPane entfernen
   - 2.4: "responsibleAndQualityControl" aus FilterPane entfernen

4. **Frontend (SavedFilterTags):**
   - 3.1: "todos" als Standardfilter erkennen

5. **Frontend (ActiveUsersList):**
   - 3.2: Filter-Wechsel-Logik prüfen und beheben

6. **Frontend (ToursTab):**
   - 7.1: Falsche Filter-Anzeige beheben

---

## Migration für bestehende Daten

Für alle Änderungen an bestehenden Filtern in der DB:

1. **User-Filter erweitern (Requests & ToDos):**
   - Alle User-Filter für `requests-table` finden
   - Status-Bedingungen hinzufügen
   - Alle User-Filter für `worktracker-todos` finden
   - Status-Bedingungen hinzufügen

2. **"Todos"/"Alle" Filter löschen:**
   - Alle Filter mit Namen "Todos" oder "Alle" für `requests-table` löschen

**Dateien:**
- Optional: Migration-Script erstellen (`backend/prisma/migrations/...`)

---

## Test-Checkliste

- [ ] Requests: "Todos"/"Alle" Filter existiert nicht mehr
- [ ] Requests: User-Filter enthalten status-Bedingungen
- [ ] Requests: "type" hat nur equals/notEquals Operatoren
- [ ] ToDos: User-Filter enthalten status-Bedingungen
- [ ] ToDos: "branch" hat nur equals/notEquals Operatoren
- [ ] ToDos: "actions" ist nicht im FilterPane
- [ ] ToDos: "responsibleAndQualityControl" ist nicht im FilterPane
- [ ] Workcenter: "todos" hat kein Löschenkreuzchen
- [ ] Workcenter: Filter lässt sich wechseln
- [ ] Tours: Richtige Filter werden angezeigt (nicht Reservations-Filter)

