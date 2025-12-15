# Datumsfilter mit Zeitraum-Platzhaltern - Systemweite Implementierung

## Problem

Aktuell funktioniert "diese Woche" als zwei separate Filter-Bedingungen:
- `time >= __WEEK_START__` (nach dieser Woche)
- `time <= __WEEK_END__` (vor dieser Woche)

**Probleme:**
1. Zwei separate Bedingungen sind verwirrend ("nach dieser Woche" und "vor dieser Woche" ergibt keinen Sinn)
2. Keine Resultate werden angezeigt, weil die Filter-Bedingung nur auf `createdAt` filtert, aber die OR-Bedingung auch `deletedAt` und `statusHistory` prüft
3. Nicht konsistent mit `__TODAY__`, das als eine einzige Bedingung funktioniert

## Ziel

Genau wie `__TODAY__` funktioniert, sollen auch Zeiträume als **eine einzige Filter-Bedingung** funktionieren:

- `time = __TODAY__` → `createdAt >= startOfDay AND createdAt <= endOfDay` (bereits implementiert)
- `time = __THIS_WEEK__` → Zeitraum für diese Woche (analog zu `__TODAY__`)
- `time = __THIS_MONTH__` → Zeitraum für diesen Monat (analog zu `__TODAY__`)
- `time = __THIS_YEAR__` → Zeitraum für dieses Jahr (analog zu `__TODAY__`)

**Wichtig:** Für Analytics-Tabellen muss die Filter-Bedingung für "time" nicht nur auf `createdAt` filtern, sondern auch auf `deletedAt` und `statusHistory.changedAt`.

## Analyse: Wie funktioniert `__TODAY__`?

### Frontend (`FilterRow.tsx`):
- Dropdown-Option: "Heute" → `value = '__TODAY__'`, `operator = 'equals'`
- Eine einzige Filter-Bedingung

### Backend (`filterToPrisma.ts`):
- `convertDateCondition('__TODAY__', 'equals', 'createdAt')`:
  ```typescript
  if (operator === 'equals') {
    const startOfDay = new Date(dateValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateValue);
    endOfDay.setHours(23, 59, 59, 999);
    return { [fieldName]: { gte: startOfDay, lte: endOfDay } };
  }
  ```
- Ergebnis: `{ createdAt: { gte: startOfDay, lte: endOfDay } }`

### Frontend (`filterLogic.ts`):
- `evaluateDateCondition` prüft, ob `condition.value === '__TODAY__'`
- Konvertiert zu `Date` und prüft mit `equals` Operator

## Lösung: Neue Zeitraum-Platzhalter

### Neue Platzhalter:
- `__THIS_WEEK__` → Zeitraum: `__WEEK_START__` bis `__WEEK_END__`
- `__THIS_MONTH__` → Zeitraum: `__MONTH_START__` bis `__MONTH_END__`
- `__THIS_YEAR__` → Zeitraum: `__YEAR_START__` bis `__YEAR_END__`

### Funktionsweise (analog zu `__TODAY__`):

**Für normale Tabellen (Tasks, Requests, Tours, etc.):**
- `time = __THIS_WEEK__` → `{ createdAt: { gte: __WEEK_START__, lte: __WEEK_END__ } }`

**Für Analytics-Tabellen (todo-analytics-table, request-analytics-table):**
- `time = __THIS_WEEK__` → OR-Bedingung:
  ```typescript
  {
    OR: [
      { createdAt: { gte: __WEEK_START__, lte: __WEEK_END__ } },
      { deletedAt: { gte: __WEEK_START__, lte: __WEEK_END__ } },
      { statusHistory: { some: { changedAt: { gte: __WEEK_START__, lte: __WEEK_END__ } } } }
    ]
  }
  ```

## Implementierungsplan

### Phase 1: Backend - Neue Platzhalter unterstützen

**Datei:** `backend/src/utils/filterToPrisma.ts`

1. **`convertDateCondition` erweitern:**
   - Erkenne `__THIS_WEEK__`, `__THIS_MONTH__`, `__THIS_YEAR__`
   - Wenn `value === '__THIS_WEEK__'`:
     - Berechne `__WEEK_START__` und `__WEEK_END__`
     - Wenn `operator === 'equals'`:
       - Für normale Tabellen: `{ [fieldName]: { gte: weekStart, lte: weekEnd } }`
       - **Problem:** Für Analytics-Tabellen muss es eine OR-Bedingung sein
   - Analog für `__THIS_MONTH__` und `__THIS_YEAR__`

2. **Spezielle Behandlung für Analytics-Tabellen:**
   - **Option A:** Neuer Parameter `isAnalytics` in `convertFilterConditionsToPrismaWhere`
   - **Option B:** Spezielle Behandlung in `analyticsController.ts` nach der Filter-Konvertierung
   - **Option C:** Neue Funktion `convertTimeConditionForAnalytics` in `analyticsController.ts`
   
   **Empfehlung:** Option C (sauberste Lösung, keine Änderungen an bestehender Logik)

### Phase 2: Backend - Analytics-Controller anpassen

**Datei:** `backend/src/controllers/analyticsController.ts`

1. **Neue Funktion `extractAndConvertTimeFilterForAnalytics`:**
   ```typescript
   function extractAndConvertTimeFilterForAnalytics(filterWhereClause: any): {
     timeFilter: any;
     remainingFilter: any;
   } {
     // Prüfe, ob filterWhereClause eine Bedingung für createdAt mit Zeitraum-Platzhalter enthält
     // Wenn ja:
     //   1. Extrahiere die Zeitraum-Bedingung (gte/lte)
     //   2. Konvertiere zu OR-Bedingung mit createdAt, deletedAt, statusHistory
     //   3. Entferne die ursprüngliche Bedingung aus filterWhereClause
     //   4. Gib timeFilter und remainingFilter zurück
   }
   ```

2. **In `getTodosChronological` und `getRequestsChronological`:**
   - Nach `convertFilterConditionsToPrismaWhere`:
     - Rufe `extractAndConvertTimeFilterForAnalytics(filterWhereClause)` auf
     - Verwende `timeFilter` für die OR-Bedingung (ersetze die hardcodierte OR-Bedingung)
     - Verwende `remainingFilter` für `filterWhereClause`

3. **Logik:**
   - Wenn `filterWhereClause.createdAt` existiert und `gte`/`lte` enthält:
     - Extrahiere `gte` und `lte` Werte
     - Erstelle OR-Bedingung:
       ```typescript
       {
         OR: [
           { createdAt: { gte, lte } },
           { deletedAt: { gte, lte } },
           { statusHistory: { some: { changedAt: { gte, lte } } } }
         ]
       }
       ```
     - Entferne `createdAt` aus `filterWhereClause`

### Phase 3: Frontend - FilterRow anpassen

**Datei:** `frontend/src/components/FilterRow.tsx`

1. **Platzhalter-Dropdown erweitern:**
   - Statt zwei Bedingungen für "Diese Woche" → eine Bedingung mit `__THIS_WEEK__`
   - Dropdown-Optionen:
     - "custom" → Datumsauswahl
     - "today" → `value = '__TODAY__'`, `operator = 'equals'`
     - "thisWeek" → `value = '__THIS_WEEK__'`, `operator = 'equals'`
     - "thisMonth" → `value = '__THIS_MONTH__'`, `operator = 'equals'`
     - "thisYear" → `value = '__THIS_YEAR__'`, `operator = 'equals'`

2. **Entfernen:**
   - `onAddRangeConditions` Prop (nicht mehr benötigt)
   - Logik für zwei separate Bedingungen (Zeilen 511-540)

3. **UI-Anpassung:**
   - Platzhalter-Anzeige erweitern:
     - `__THIS_WEEK__` → "Diese Woche"
     - `__THIS_MONTH__` → "Dieser Monat"
     - `__THIS_YEAR__` → "Dieses Jahr"

### Phase 4: Frontend - filterLogic anpassen

**Datei:** `frontend/src/utils/filterLogic.ts`

1. **`evaluateDateCondition` erweitern:**
   - Unterstützung für `__THIS_WEEK__`, `__THIS_MONTH__`, `__THIS_YEAR__`
   - Wenn `condition.value === '__THIS_WEEK__'`:
     - Berechne `weekStart` und `weekEnd`
     - Wenn `operator === 'equals'`:
       - Prüfe: `normalizedDate >= weekStart && normalizedDate <= weekEnd`
   - Analog für `__THIS_MONTH__` und `__THIS_YEAR__`

### Phase 5: Seed anpassen

**Datei:** `backend/prisma/seed.ts`

1. **Benutzer-Filter für `todo-analytics-table` ändern:**
   - Aktuell:
     ```typescript
     conditions = [
       { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
       { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
       { column: 'time', operator: 'after', value: '__WEEK_START__' },
       { column: 'time', operator: 'before', value: '__WEEK_END__' }
     ];
     operators = ['OR', 'AND', 'AND'];
     ```
   - Neu:
     ```typescript
     conditions = [
       { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
       { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
       { column: 'time', operator: 'equals', value: '__THIS_WEEK__' }
     ];
     operators = ['OR', 'AND'];
     ```

2. **Rollen-Filter für `todo-analytics-table` ändern:**
   - Aktuell:
     ```typescript
     conditions = [
       { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
       { column: 'time', operator: 'after', value: '__WEEK_START__' },
       { column: 'time', operator: 'before', value: '__WEEK_END__' }
     ];
     operators = ['AND', 'AND'];
     ```
   - Neu:
     ```typescript
     conditions = [
       { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
       { column: 'time', operator: 'equals', value: '__THIS_WEEK__' }
     ];
     operators = ['AND'];
     ```

3. **Benutzer-Filter für `request-analytics-table` ändern:**
   - Analog zu `todo-analytics-table`

### Phase 6: Übersetzungen

**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

1. **Neue Übersetzungsschlüssel hinzufügen:**
   ```json
   "filter": {
     "row": {
       "placeholders": {
         "today": "Heute",
         "thisWeek": "Diese Woche",
         "thisMonth": "Dieser Monat",
         "thisYear": "Dieses Jahr",
         "custom": "Benutzerdefiniert"
       }
     }
   }
   ```

### Phase 7: Dokumentation

**Dateien:**
- `docs/implementation_plans/TASKS_REQUESTS_ANALYTICS_UMBAU_PLAN.md`
- `docs/implementation_plans/DATUMSFILTER_PLATZHALTER_PLAN.md`

1. **Aktualisieren:**
   - Neue Platzhalter dokumentieren
   - Spezielle Behandlung für Analytics-Tabellen dokumentieren
   - Seed-Filter-Struktur dokumentieren

## Risiken und Überlegungen

### Risiko 1: Analytics-spezifische Logik
**Status:** Mittel
- **Problem:** Filter-Bedingung für "time" muss in Analytics-Tabellen anders behandelt werden
- **Lösung:** Spezielle Funktion in `analyticsController.ts` (Option C)
- **Alternative:** Neuer Parameter `isAnalytics` in `convertFilterConditionsToPrismaWhere` (Option A)

### Risiko 2: Rückwärtskompatibilität
**Status:** Gering
- Bestehende Filter mit `__TODAY__` funktionieren weiterhin
- Bestehende Filter mit `__WEEK_START__`/`__WEEK_END__` müssen aktualisiert werden (Seed)
- **Lösung:** Seed verwendet `upsert`, aktualisiert bestehende Filter

### Risiko 3: Performance
**Status:** Gering
- Platzhalter werden nur beim Filtern evaluiert
- Keine zusätzlichen DB-Queries
- OR-Bedingung ist bereits vorhanden, wird nur anders konstruiert

### Risiko 4: Systemweite Kompatibilität
**Status:** Gering
- Neue Platzhalter funktionieren für alle Datumsfelder (nicht nur "time")
- Für normale Tabellen: Standard-Verhalten (nur `createdAt`)
- Für Analytics-Tabellen: Spezielle Behandlung in `analyticsController.ts`

## Implementierungsreihenfolge

1. **Backend:** Neue Platzhalter in `convertDateCondition` (`__THIS_WEEK__`, `__THIS_MONTH__`, `__THIS_YEAR__`)
2. **Backend:** `extractAndConvertTimeFilterForAnalytics` Funktion in `analyticsController.ts`
3. **Backend:** `getTodosChronological` und `getRequestsChronological` anpassen
4. **Frontend:** `filterLogic.ts` erweitern (neue Platzhalter unterstützen)
5. **Frontend:** `FilterRow.tsx` anpassen (Dropdown, entfernen von `onAddRangeConditions`)
6. **Seed:** Filter ändern (von zwei Bedingungen zu einer Bedingung)
7. **Übersetzungen:** Neue Schlüssel hinzufügen
8. **Dokumentation:** Aktualisieren

## Testing

1. **FilterRow:** Platzhalter-Dropdown funktioniert für "time" Spalte
2. **Backend:** Alle Platzhalter werden korrekt aufgelöst
3. **Backend:** Analytics-Controller konvertiert Zeitraum-Filter korrekt zu OR-Bedingung
4. **Frontend:** Filter-Logik funktioniert mit allen Platzhaltern
5. **Seed:** Filter enthalten eine einzige Bedingung mit `__THIS_WEEK__`
6. **Analytics-Tabs:** Resultate werden korrekt angezeigt (auch für gelöschte Tasks/Requests und Status-Änderungen)
7. **Rückwärtskompatibilität:** Bestehende Filter mit `__TODAY__` funktionieren weiterhin

## Memory Leak Prevention

### Frontend - useEffect Cleanup

**Datei:** `frontend/src/components/FilterRow.tsx`

1. **useEffect für `loadUsersAndRoles` (Zeile 119):**
   - **Problem:** Kein Cleanup für async Operationen
   - **Lösung:** AbortController verwenden
   ```typescript
   useEffect(() => {
     const abortController = new AbortController();
     
     const loadUsersAndRoles = async () => {
       try {
         // ... existing code ...
         const response = await axiosInstance.get('/users/dropdown', {
           signal: abortController.signal
         });
         // ... rest of code ...
       } catch (error) {
         if (error.name !== 'AbortError') {
           // Handle error
         }
       }
     };
     
     loadUsersAndRoles();
     
     return () => {
       abortController.abort();
     };
   }, []);
   ```

**Datei:** `frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx`

1. **useEffect für `fetchTodos` (Zeile 186):**
   - **Problem:** Kein Cleanup für async Operationen
   - **Lösung:** AbortController verwenden
   ```typescript
   useEffect(() => {
     const abortController = new AbortController();
     
     const fetchTodos = async () => {
       try {
         // ... existing code ...
         const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TODOS_CHRONOLOGICAL, {
           params,
           signal: abortController.signal
         });
         // ... rest of code ...
       } catch (error) {
         if (error.name !== 'AbortError') {
           // Handle error
         }
       } finally {
         setLoading(false);
       }
     };
     
     fetchTodos();
     
     return () => {
       abortController.abort();
     };
   }, [selectedDate, filterConditions, filterLogicalOperators, selectedFilterId]);
   ```

**Datei:** `frontend/src/components/teamWorktime/RequestAnalyticsTab.tsx`

1. **useEffect für `fetchRequests` (analog zu TodoAnalyticsTab):**
   - **Problem:** Kein Cleanup für async Operationen
   - **Lösung:** AbortController verwenden (identisch zu TodoAnalyticsTab)

**Datei:** `frontend/src/components/FilterPane.tsx`

1. **useEffect für `fetchExistingFilters` (Zeile 55):**
   - **Problem:** Kein Cleanup für async Operationen
   - **Lösung:** AbortController verwenden
   ```typescript
   useEffect(() => {
     const abortController = new AbortController();
     
     const fetchExistingFilters = async () => {
       try {
         const response = await axiosInstance.get(
           API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId),
           { signal: abortController.signal }
         );
         // ... rest of code ...
       } catch (err) {
         if (err.name !== 'AbortError') {
           // Handle error
         }
       }
     };
     
     fetchExistingFilters();
     
     return () => {
       abortController.abort();
     };
   }, [tableId]);
   ```

## Berechtigungen

**Status:** ✅ Bereits implementiert

**Datei:** `backend/src/routes/teamWorktimeRoutes.ts`

- **Zeile 28-30:** Alle Analytics-Endpoints haben bereits:
  - `authenticateToken` Middleware
  - `organizationMiddleware` Middleware
  - `isTeamManager` Middleware

**Ergebnis:** Keine zusätzliche Berechtigungsprüfung nötig. Analytics-Endpoints sind bereits geschützt.

## Notifications

**Status:** ✅ Nicht nötig

**Begründung:**
- Filter-Änderungen sind lokale UI-Aktionen
- Keine Benutzer-Aktionen, die Benachrichtigungen erfordern
- Keine Datenänderungen (nur Filterung)

## Performance

### Backend

**Status:** ✅ Keine Performance-Beeinträchtigung

**Details:**
- Platzhalter werden nur beim Filtern evaluiert (einmal pro Request)
- Date-Berechnungen sind sehr schnell (< 1ms)
- Keine zusätzlichen DB-Queries
- OR-Bedingung ist bereits vorhanden, wird nur anders konstruiert
- Indizes vorhanden: `createdAt`, `deletedAt`, `statusHistory.changedAt` (bereits in Schema definiert)

**Optimierungen:**
- Keine Caching nötig (Date-Berechnungen sind trivial)
- Query-Optimierung: Prisma verwendet bereits vorhandene Indizes

### Frontend

**Status:** ✅ Keine Performance-Beeinträchtigung

**Details:**
- Platzhalter werden nur beim Filtern evaluiert (einmal pro Filter-Änderung)
- Date-Berechnungen sind sehr schnell (< 1ms)
- Keine zusätzlichen API-Calls
- Filter-Logik verwendet bereits vorhandene `evaluateDateCondition` Funktion

**Optimierungen:**
- Keine Caching nötig (Date-Berechnungen sind trivial)
- `useMemo` für gefilterte Daten bereits vorhanden (TodoAnalyticsTab.tsx Zeile 369)

## Code-Standards (VIBES.md)

### DRY (Don't Repeat Yourself)

**Status:** ✅ Eingehalten

**Details:**
- Neue Platzhalter verwenden bestehende `convertDateCondition` Funktion
- Frontend verwendet bestehende `evaluateDateCondition` Funktion
- Keine Code-Duplikation

### Error Handling

**Datei:** `backend/src/utils/filterToPrisma.ts`

1. **`convertDateCondition` erweitern:**
   - Error Handling für ungültige Platzhalter-Werte
   ```typescript
   function convertDateCondition(value: any, operator: string, fieldName: string = 'dueDate'): any {
     try {
       let dateValue: Date;
       
       if (value === '__THIS_WEEK__') {
         const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
         weekStart.setHours(0, 0, 0, 0);
         const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
         weekEnd.setHours(23, 59, 59, 999);
         
         if (operator === 'equals') {
           return { [fieldName]: { gte: weekStart, lte: weekEnd } };
         }
         // ... other operators ...
       }
       // ... other placeholders ...
     } catch (error) {
       logger.error(`[convertDateCondition] Fehler bei Platzhalter ${value}:`, error);
       return {}; // Fallback: Leere Bedingung
     }
   }
   ```

### TypeScript

**Status:** ✅ Vollständig typisiert

**Details:**
- Alle neuen Platzhalter sind String-Literale
- Funktionen sind vollständig typisiert
- Keine `any` Types (außer für Prisma Where-Klauseln, wie bereits vorhanden)

## Zusätzliche Änderungen

### Phase 8: FilterPane.tsx - onAddRangeConditions entfernen

**Datei:** `frontend/src/components/FilterPane.tsx`

1. **Entfernen:**
   - `handleAddRangeConditions` Funktion (Zeile 144-155)
   - `onAddRangeConditions={handleAddRangeConditions}` Prop in FilterRow (Zeile 267)

**Begründung:** Nicht mehr benötigt, da Zeiträume jetzt als eine einzige Bedingung funktionieren.

### Phase 9: Backend - Error Handling für neue Platzhalter

**Datei:** `backend/src/utils/filterToPrisma.ts`

1. **`convertDateCondition` erweitern:**
   - Try/Catch Block für Platzhalter-Evaluierung
   - Logging bei Fehlern
   - Fallback: Leere Bedingung bei Fehlern

### Phase 10: Frontend - Error Handling für neue Platzhalter

**Datei:** `frontend/src/utils/filterLogic.ts`

1. **`evaluateDateCondition` erweitern:**
   - Try/Catch Block für Platzhalter-Evaluierung
   - Fallback: `false` bei Fehlern (Filter schließt Datensatz aus)

## Implementierungsreihenfolge (aktualisiert)

1. **Backend:** Neue Platzhalter in `convertDateCondition` (`__THIS_WEEK__`, `__THIS_MONTH__`, `__THIS_YEAR__`)
2. **Backend:** Error Handling für neue Platzhalter
3. **Backend:** `extractAndConvertTimeFilterForAnalytics` Funktion in `analyticsController.ts`
4. **Backend:** `getTodosChronological` und `getRequestsChronological` anpassen
5. **Frontend:** `filterLogic.ts` erweitern (neue Platzhalter unterstützen, Error Handling)
6. **Frontend:** `FilterRow.tsx` anpassen (Dropdown, entfernen von `onAddRangeConditions`)
7. **Frontend:** `FilterPane.tsx` anpassen (entfernen von `handleAddRangeConditions`)
8. **Frontend:** Memory Leak Prevention (AbortController in allen useEffect Hooks)
9. **Seed:** Filter ändern (von zwei Bedingungen zu einer Bedingung)
10. **Übersetzungen:** Neue Schlüssel hinzufügen
11. **Dokumentation:** Aktualisieren

## Testing (erweitert)

1. **FilterRow:** Platzhalter-Dropdown funktioniert für "time" Spalte
2. **Backend:** Alle Platzhalter werden korrekt aufgelöst
3. **Backend:** Error Handling funktioniert bei ungültigen Platzhaltern
4. **Backend:** Analytics-Controller konvertiert Zeitraum-Filter korrekt zu OR-Bedingung
5. **Frontend:** Filter-Logik funktioniert mit allen Platzhaltern
6. **Frontend:** Error Handling funktioniert bei ungültigen Platzhaltern
7. **Frontend:** Memory Leaks verhindert (AbortController funktioniert)
8. **Seed:** Filter enthalten eine einzige Bedingung mit `__THIS_WEEK__`
9. **Analytics-Tabs:** Resultate werden korrekt angezeigt (auch für gelöschte Tasks/Requests und Status-Änderungen)
10. **Rückwärtskompatibilität:** Bestehende Filter mit `__TODAY__` funktionieren weiterhin
11. **Performance:** Keine Performance-Beeinträchtigung (gemessen)
12. **Berechtigungen:** Analytics-Endpoints sind geschützt (getestet)

## Offene Fragen

**Status:** ✅ Alle Fragen beantwortet

1. **Sollen die neuen Platzhalter auch für andere Datumsfelder verfügbar sein?**
   - **Antwort:** Ja, systemweit für alle Datumsfelder (konsistent)
   - **Einschränkung:** Spezielle OR-Bedingung nur für Analytics-Tabellen

2. **Soll `__THIS_WEEK__` die aktuelle Woche (Montag-Sonntag) oder die letzten 7 Tage sein?**
   - **Antwort:** Aktuelle Woche (Montag-Sonntag), konsistent mit `__WEEK_START__`/`__WEEK_END__`

3. **Soll `__THIS_MONTH__` den aktuellen Monat (1. bis letzter Tag) oder die letzten 30 Tage sein?**
   - **Antwort:** Aktueller Monat (1. bis letzter Tag), konsistent mit `__MONTH_START__`/`__MONTH_END__`

4. **Soll `__THIS_YEAR__` das aktuelle Jahr (1. Januar bis 31. Dezember) oder die letzten 365 Tage sein?**
   - **Antwort:** Aktuelles Jahr (1. Januar bis 31. Dezember), konsistent mit `__YEAR_START__`/`__YEAR_END__`

