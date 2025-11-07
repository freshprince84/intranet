# Performance-Analyse: Was wird genau wann geladen?

## Status: Optimierung wurde NICHT umgesetzt

Die geplante Attachment-Optimierung wurde **nicht implementiert**. Das erklärt, warum es immer noch langsam ist.

---

## Detaillierte Analyse: Was wird wann geladen?

### 1. Dashboard - Requests Component (`Requests.tsx`)

#### Beim Component-Mount (useEffect):

**Zeitpunkt 0ms**: Component wird gemountet

**Zeitpunkt 0-50ms**: 
- `useTableSettings('dashboard_requests')` Hook wird initialisiert
- **API-Call**: `GET /table-settings/dashboard_requests` (Zeile 34 in useTableSettings.ts)

**Zeitpunkt 0-100ms**:
- `fetchRequests()` wird aufgerufen (Zeile 290-292)
- **API-Call**: `GET /requests` (Zeile 244)
  - Lädt ALLE Requests ohne Pagination
  - Backend lädt KEINE Attachments mit

**Zeitpunkt 100ms - 5-10 Sekunden** (abhängig von Anzahl Requests):
- **N+1 Query Problem**: Für JEDEN Request wird ein separater API-Call gemacht
- **API-Calls**: `GET /requests/:id/attachments` für jeden Request (Zeile 251-252)
- Bei 50 Requests = 50 zusätzliche HTTP-Requests
- Bei 100 Requests = 100 zusätzliche HTTP-Requests

**Zeitpunkt 0-200ms** (parallel):
- `createStandardFilters()` wird aufgerufen (Zeile 295-383)
- **API-Call**: `GET /saved-filters/requests-table` (Zeile 306-307)
- Falls Filter fehlen: `POST /saved-filters` (Zeile 340, 365)

**Zeitpunkt 0-300ms** (parallel):
- `setInitialFilter()` wird aufgerufen (Zeile 386-407)
- **API-Call**: `GET /saved-filters/requests-table` (Zeile 389)

#### Zusammenfassung Requests Component:
- **1x** `GET /requests` (alle Requests)
- **Nx** `GET /requests/:id/attachments` (für jeden Request)
- **1x** `GET /table-settings/dashboard_requests`
- **2x** `GET /saved-filters/requests-table` (doppelt!)
- **0-2x** `POST /saved-filters` (nur wenn Filter fehlen)

**Gesamt bei 50 Requests**: ~54 HTTP-Requests
**Gesamt bei 100 Requests**: ~104 HTTP-Requests

---

### 2. Worktracker - Tasks Component (`Worktracker.tsx`)

#### Beim Component-Mount (useEffect):

**Zeitpunkt 0ms**: Component wird gemountet

**Zeitpunkt 0-50ms**:
- `useTableSettings('worktracker_tasks')` Hook wird initialisiert
- **API-Call**: `GET /table-settings/worktracker_tasks` (Zeile 34 in useTableSettings.ts)

**Zeitpunkt 0-100ms**:
- `loadTasks()` wird aufgerufen (Zeile 288-293)
- **API-Call**: `GET /tasks` (Zeile 246)
  - Lädt ALLE Tasks ohne Pagination
  - Backend lädt KEINE Attachments mit

**Zeitpunkt 100ms - 10-20 Sekunden** (abhängig von Anzahl Tasks):
- **N+1 Query Problem**: Für JEDEN Task wird ein separater API-Call gemacht
- **API-Calls**: `GET /tasks/:id/attachments` für jeden Task (Zeile 253-254)
- Bei 50 Tasks = 50 zusätzliche HTTP-Requests
- Bei 100 Tasks = 100 zusätzliche HTTP-Requests
- Bei 200 Tasks = 200 zusätzliche HTTP-Requests

**Zeitpunkt 0-200ms** (parallel):
- `setInitialFilter()` wird aufgerufen (Zeile 315-333)
- **API-Call**: `GET /saved-filters/worktracker-todos` (Zeile 318)

**Zeitpunkt 0-300ms** (parallel):
- `createStandardFilters()` wird aufgerufen (Zeile 336-421)
- **API-Call**: `GET /saved-filters/worktracker-todos` (Zeile 347)
- Falls Filter fehlen: `POST /saved-filters` (Zeile 371, 393)

#### Zusammenfassung Worktracker Component:
- **1x** `GET /tasks` (alle Tasks)
- **Nx** `GET /tasks/:id/attachments` (für jeden Task)
- **1x** `GET /table-settings/worktracker_tasks`
- **2x** `GET /saved-filters/worktracker-todos` (doppelt!)
- **0-2x** `POST /saved-filters` (nur wenn Filter fehlen)

**Gesamt bei 50 Tasks**: ~54 HTTP-Requests
**Gesamt bei 100 Tasks**: ~104 HTTP-Requests
**Gesamt bei 200 Tasks**: ~204 HTTP-Requests

---

## Performance-Probleme identifiziert

### Problem 1: N+1 Query Problem (KRITISCH) ⚠️

**Status**: NICHT behoben - Optimierung wurde nicht umgesetzt

**Requests**:
- Backend lädt KEINE Attachments mit (`getAllRequests` Zeile 59-75)
- Frontend macht separate Requests für jeden Request
- Bei 50 Requests = 50 zusätzliche HTTP-Requests

**Tasks**:
- Backend lädt KEINE Attachments mit (`getAllTasks` Zeile 39-55)
- Frontend macht separate Requests für jeden Task
- Bei 100 Tasks = 100 zusätzliche HTTP-Requests

**Impact**: 
- **80-95% der Ladezeit** wird durch Attachment-Requests verursacht
- Bei 100 Tasks mit je 100ms Request-Zeit = **10 Sekunden nur für Attachments**

---

### Problem 2: Doppelte Filter-API-Calls

**Requests Component**:
- `createStandardFilters()` lädt Filter (Zeile 306)
- `setInitialFilter()` lädt Filter erneut (Zeile 389)
- **2x** `GET /saved-filters/requests-table`

**Worktracker Component**:
- `setInitialFilter()` lädt Filter (Zeile 318)
- `createStandardFilters()` lädt Filter erneut (Zeile 347)
- **2x** `GET /saved-filters/worktracker-todos`

**Impact**: 
- Unnötige API-Calls
- Kann kombiniert werden zu 1 Call

---

### Problem 3: Keine Pagination

**Requests**:
- `GET /requests` lädt ALLE Requests ohne Limit
- Bei 1000 Requests werden alle geladen

**Tasks**:
- `GET /tasks` lädt ALLE Tasks ohne Limit
- Bei 1000 Tasks werden alle geladen

**Impact**:
- Sehr große JSON-Responses
- Lange Übertragungszeiten
- Hoher Memory-Verbrauch im Browser

---

### Problem 4: Settings werden beim Mount geladen

**Requests**:
- `useTableSettings('dashboard_requests')` lädt Settings beim Mount
- **API-Call**: `GET /table-settings/dashboard_requests`

**Worktracker**:
- `useTableSettings('worktracker_tasks')` lädt Settings beim Mount
- **API-Call**: `GET /table-settings/worktracker_tasks`

**Impact**:
- Zusätzliche API-Calls beim Mount
- Könnte gecacht werden oder lazy geladen werden

---

## Performance-Metriken (geschätzt)

### Beispiel: 50 Requests, 100 Tasks

**Requests Component**:
- 1x `/requests`: ~200ms
- 50x `/requests/:id/attachments`: ~5000ms (50 × 100ms)
- 1x `/table-settings/dashboard_requests`: ~50ms
- 2x `/saved-filters/requests-table`: ~100ms
- **Gesamt**: ~5.35 Sekunden

**Worktracker Component**:
- 1x `/tasks`: ~300ms
- 100x `/tasks/:id/attachments`: ~10000ms (100 × 100ms)
- 1x `/table-settings/worktracker_tasks`: ~50ms
- 2x `/saved-filters/worktracker-todos`: ~100ms
- **Gesamt**: ~10.45 Sekunden

**Gesamt Dashboard-Ladezeit**: ~15-20 Sekunden

---

## Lösungsvorschläge (Priorität)

### Priorität 1: N+1 Query Problem beheben (KRITISCH) 🔴

**Was**: Attachments direkt mit Requests/Tasks laden

**Wie**:
1. Backend: `attachments` zu Prisma `include` hinzufügen
2. Frontend: Separate Attachment-Requests entfernen

**Impact**: 
- **80-95% Performance-Verbesserung**
- Von N+1 Requests auf 1 Request
- Von ~10 Sekunden auf ~1 Sekunde

---

### Priorität 2: Doppelte Filter-Calls eliminieren 🟡

**Was**: Filter nur einmal laden

**Wie**:
- `createStandardFilters()` und `setInitialFilter()` kombinieren
- Filter erst laden, dann prüfen ob Standard-Filter fehlen

**Impact**:
- 2 API-Calls weniger pro Component
- ~100-200ms schneller

---

### Priorität 3: Pagination einführen 🟡

**Was**: Nur erste N Requests/Tasks laden

**Wie**:
- Backend: `limit` und `offset` Parameter unterstützen
- Frontend: Standard-Limit von 50-100 Items
- "Mehr laden"-Button für zusätzliche Items

**Impact**:
- Kleinere JSON-Responses
- Schnellere initiale Ladezeit
- Weniger Memory-Verbrauch

---

### Priorität 4: Settings-Caching 🟢

**Was**: Settings cachen oder lazy laden

**Wie**:
- Settings in localStorage cachen
- Nur beim ersten Load vom Server holen
- Oder: Settings lazy laden (nur wenn User Settings ändert)

**Impact**:
- 1-2 API-Calls weniger beim Mount
- ~50-100ms schneller

---

## Empfohlene Implementierungsreihenfolge

1. ✅ **Priorität 1**: N+1 Query Problem beheben (sofort)
2. ✅ **Priorität 2**: Doppelte Filter-Calls eliminieren
3. ⚠️ **Priorität 3**: Pagination einführen (optional, aber empfohlen)
4. ⚠️ **Priorität 4**: Settings-Caching (optional)

---

## Zusammenfassung

**Hauptproblem**: N+1 Query Problem - Attachments werden nicht mitgeladen
**Status**: Optimierung wurde NICHT umgesetzt
**Impact**: 80-95% der Ladezeit wird durch Attachment-Requests verursacht

**Sofortmaßnahme**: Attachment-Optimierung implementieren (wie im Plan beschrieben)

