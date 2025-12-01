# Fundamentale Probleme - Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Nur Analyse, keine Änderungen  
**Zweck:** Identifizierung der fundamentalen Probleme, die seit Wochen bestehen

---

## 🔴 PROBLEM 1: DB-VERBINDUNGSPROBLEME - WARUM PASSIEREN DIE DAUERND?

### Aktuelle Implementierung

**Datei:** `backend/src/utils/prisma.ts`

**Was passiert:**
1. **10 Prisma-Instanzen** werden erstellt (Zeile 65-86)
2. **Jede Instanz hat 10 Verbindungen** (Zeile 18: `connectionLimit = 10`)
3. **Gesamt: 100 Verbindungen** (10 × 10 = 100)
4. **Round-Robin-Verteilung** über Proxy (Zeile 106-112)
5. **executeWithRetry** macht Retries bei DB-Fehlern (Zeile 125-178)

### Das fundamentale Problem

**1. Round-Robin-Verteilung blockiert Verbindungen:**
```typescript
// Zeile 91-101: Round-Robin-Verteilung
const getPrismaPool = (): PrismaClient => {
  const pool = prismaPools[currentPoolIndex];
  currentPoolIndex = (currentPoolIndex + 1) % prismaPools.length;
  return pool;
};
```

**Problem:**
- Jeder Request nutzt einen anderen Pool (Round-Robin)
- Wenn ein Pool voll ist (10/10), wird trotzdem versucht, diesen Pool zu nutzen
- **Keine intelligente Pool-Auswahl** - Round-Robin ignoriert Pool-Status

**2. executeWithRetry verschlimmert das Problem:**
```typescript
// Zeile 155-169: Retry bei DB-Fehlern
if (
  error instanceof PrismaClientKnownRequestError &&
  (error.code === 'P1001' || // Can't reach database server
   error.code === 'P1008' || // Operations timed out
   error.message.includes('Server has closed the connection') ||
   error.message.includes("Can't reach database server"))
) {
  // Retry mit Delay
  await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
}
```

**Problem:**
- Bei DB-Fehler macht `executeWithRetry` **3 Retries**
- Jeder Retry blockiert eine Verbindung für 1-3 Sekunden
- **Bei vollem Pool:** Retries blockieren Verbindungen → Pool wird noch voller → **Teufelskreis!**

**3. Connection Pool Timeout wird falsch behandelt:**
```typescript
// Zeile 140-152: Connection Pool Timeout
if (
  error instanceof PrismaClientKnownRequestError &&
  error.message.includes('Timed out fetching a new connection from the connection pool')
) {
  // Sofort werfen, kein Retry
  throw error;
}
```

**Problem:**
- Connection Pool Timeout wird erkannt, aber **nur wenn die Fehlermeldung exakt passt**
- **Viele DB-Fehler werden als P1001/P1008 erkannt** → Retry → verschlimmert das Problem

### Warum passieren die DB-Verbindungsfehler dauernd?

**Root Cause:**
1. **Round-Robin-Verteilung** nutzt Pools blind (ignoriert Pool-Status)
2. **executeWithRetry** macht Retries bei DB-Fehlern → blockiert Verbindungen
3. **Bei vollem Pool:** Retries verschlimmern das Problem → **Teufelskreis**
4. **Connection Pool Timeout** wird nicht immer korrekt erkannt → Retry trotzdem

**Resultat:**
- Pool wird voll → DB-Fehler → Retries → Pool wird noch voller → **System bricht zusammen**

---

## 🔴 PROBLEM 2: FILTER-CHAOS - WAS FÜR EIN RIESEN CHAOS HAST DU MITTELWEILE MIT DEN FILTERN ANGERICHTET?

### Aktuelle Implementierung

**Backend:**
- `backend/src/controllers/savedFilterController.ts` - Filter-Controller
- `backend/src/services/filterCache.ts` - Filter-Cache (einzelne Filter)
- `backend/src/services/filterListCache.ts` - Filter-Listen-Cache

**Frontend:**
- `frontend/src/components/SavedFilterTags.tsx` - Filter-Tags-Komponente
- `frontend/src/components/Requests.tsx` - Requests-Komponente (lädt Filter)
- `frontend/src/pages/Worktracker.tsx` - Worktracker-Seite (lädt Filter)

### Das fundamentale Problem

**1. Filter werden in JSON-Strings gespeichert:**
```typescript
// savedFilterController.ts Zeile 80-82
const conditionsJson = JSON.stringify(conditions || []);
const operatorsJson = JSON.stringify(operators || []);
const sortDirectionsJson = JSON.stringify(sortDirections || {});
```

**Problem:**
- Filter-Daten werden als **JSON-Strings** in der DB gespeichert
- **Jedes Laden** erfordert JSON.parse()
- **Jedes Speichern** erfordert JSON.stringify()
- **Fehleranfällig:** JSON-Parsing kann fehlschlagen

**2. Migration-Logik überall:**
```typescript
// filterListCache.ts Zeile 68-108: Migration-Logik
const parsedFilters = savedFilters.map(filter => {
  let sortDirections: any[] = [];
  if (filter.sortDirections) {
    try {
      if (filter.sortDirections.trim() === 'null' || filter.sortDirections.trim() === '') {
        sortDirections = [];
      } else {
        const parsed = JSON.parse(filter.sortDirections);
        // Migration: Altes Format (Record) zu neuem Format (Array) konvertieren
        if (Array.isArray(parsed)) {
          sortDirections = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Altes Format: { "status": "asc", "branch": "desc" }
          sortDirections = Object.entries(parsed).map(([column, direction], index) => ({
            column,
            direction: direction as 'asc' | 'desc',
            priority: index + 1
          }));
        }
      }
    } catch (e) {
      console.error('Fehler beim Parsen von sortDirections:', e);
      sortDirections = [];
    }
  }
  // ...
});
```

**Problem:**
- **Migration-Logik ist überall** (filterListCache.ts, savedFilterController.ts, etc.)
- **Altes Format vs. neues Format** - beide müssen unterstützt werden
- **Fehleranfällig:** JSON-Parsing kann fehlschlagen → Filter funktionieren nicht

**3. Doppelte Filter-Ladung:**
```typescript
// Requests.tsx Zeile 529: Lädt Requests
useEffect(() => {
  fetchRequests(undefined, undefined, false, 20, 0);
}, []);

// SavedFilterTags.tsx Zeile 208-256: Lädt Filter AUCH
useEffect(() => {
  const fetchData = async () => {
    const [filtersResponse, groupsResponse] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
    ]);
    // ...
  };
  fetchData();
}, [tableId]);
```

**Problem:**
- **Requests.tsx** lädt Requests (ohne Filter)
- **SavedFilterTags.tsx** lädt Filter (separat)
- **Doppelte API-Calls** für Filter
- **Keine Koordination** zwischen Komponenten

**4. Filter-Format-Inkonsistenzen:**
```typescript
// savedFilterController.ts Zeile 82: sortDirections als {} (Objekt)
const sortDirectionsJson = JSON.stringify(sortDirections || {});

// filterListCache.ts Zeile 69: sortDirections als [] (Array)
let sortDirections: any[] = [];
```

**Problem:**
- **Backend speichert** sortDirections als Objekt `{}`
- **Frontend erwartet** sortDirections als Array `[]`
- **Migration-Logik** konvertiert zwischen beiden Formaten
- **Inkonsistent:** Verschiedene Formate an verschiedenen Stellen

### Warum ist das Filter-System ein Chaos?

**Root Cause:**
1. **JSON-Strings in DB** - Fehleranfällig, keine Type-Safety
2. **Migration-Logik überall** - Altes Format vs. neues Format
3. **Doppelte Filter-Ladung** - Keine Koordination zwischen Komponenten
4. **Format-Inkonsistenzen** - Backend speichert Objekt, Frontend erwartet Array

**Resultat:**
- Filter funktionieren nicht zuverlässig
- Fehler beim Laden/Speichern von Filtern
- Performance-Probleme durch doppelte API-Calls

---

## 🔴 PROBLEM 3: SCHEMA-FEHLER - WAS IST MIT DEM FEHLER "SCHEMA NICHT GEFUNDEN"?

### Gefundene Stellen

**Datei:** `backend/src/routes/claudeRoutes.ts` Zeile 31-32
```typescript
FROM information_schema.columns 
WHERE table_schema = 'public'
```

**Problem:**
- **information_schema** wird verwendet für DB-Schema-Abfragen
- **table_schema = 'public'** - Hardcoded Schema-Name
- **Wenn Schema nicht 'public' heißt** → Fehler "Schema nicht gefunden"

### Warum tritt dieser Fehler auf?

**Root Cause:**
1. **Hardcoded Schema-Name** - `'public'` ist hardcoded
2. **Keine Fehlerbehandlung** - Wenn Schema nicht existiert, Fehler
3. **Nicht in allen Umgebungen** - Schema-Name kann unterschiedlich sein

**Resultat:**
- Fehler "Schema nicht gefunden" in bestimmten Umgebungen
- System funktioniert nicht, wenn Schema nicht 'public' heißt

---

## 📊 ZUSAMMENFASSUNG: FUNDAMENTALE PROBLEME

### Problem 1: DB-Verbindungsprobleme
**Ursache:**
- Round-Robin-Verteilung nutzt Pools blind
- executeWithRetry macht Retries → blockiert Verbindungen
- Bei vollem Pool: Retries verschlimmern das Problem → **Teufelskreis**

**Warum passieren die dauernd:**
- System ist in einem **Teufelskreis** gefangen
- Pool wird voll → DB-Fehler → Retries → Pool wird noch voller → **System bricht zusammen**

### Problem 2: Filter-Chaos
**Ursache:**
- JSON-Strings in DB (fehleranfällig)
- Migration-Logik überall (altes Format vs. neues Format)
- Doppelte Filter-Ladung (keine Koordination)
- Format-Inkonsistenzen (Backend Objekt, Frontend Array)

**Warum ist das ein Chaos:**
- **Viele verschiedene Implementierungen** für dasselbe Problem
- **Keine einheitliche Struktur** - jeder macht es anders
- **Fehleranfällig** - JSON-Parsing kann fehlschlagen

### Problem 3: Schema-Fehler
**Ursache:**
- Hardcoded Schema-Name `'public'`
- Keine Fehlerbehandlung
- Nicht in allen Umgebungen kompatibel

**Warum tritt dieser Fehler auf:**
- Schema-Name ist hardcoded → funktioniert nicht in allen Umgebungen

---

## 🎯 FAZIT

**Die fundamentalen Probleme sind:**

1. **DB-Verbindungsprobleme:** System ist in einem **Teufelskreis** gefangen
   - Round-Robin-Verteilung nutzt Pools blind
   - executeWithRetry verschlimmert das Problem
   - **Resultat:** System bricht zusammen

2. **Filter-Chaos:** **Viele verschiedene Implementierungen** für dasselbe Problem
   - JSON-Strings in DB
   - Migration-Logik überall
   - Doppelte Filter-Ladung
   - **Resultat:** Filter funktionieren nicht zuverlässig

3. **Schema-Fehler:** Hardcoded Schema-Name
   - `'public'` ist hardcoded
   - **Resultat:** Fehler in bestimmten Umgebungen

**Diese Probleme sind fundamental, weil:**
- Sie betreffen **die gesamte Architektur**
- Sie sind **nicht durch kleine Fixes lösbar**
- Sie verursachen **dauerhaft Probleme** (seit Wochen)

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Analyse abgeschlossen - NUR PRÜFEN, NICHTS ÄNDERN

