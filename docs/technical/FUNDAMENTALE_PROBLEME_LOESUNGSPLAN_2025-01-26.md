# Fundamentale Probleme - Detaillierter Lösungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Zweck:** Detaillierter Plan zur Behebung der fundamentalen Probleme

---

## 📊 BESTANDSAUFNAHME: WAS WURDE BEREITS GEMACHT?

### ✅ Problem 1: DB-Verbindungsprobleme - Teilweise behoben

**Was wurde bereits implementiert:**

1. **Connection Pool Timeout wird erkannt** (✅ IMPLEMENTIERT)
   - `backend/src/utils/prisma.ts` Zeile 138-152
   - Connection Pool Timeout wirft sofort Fehler (kein Retry)
   - Verhindert Teufelskreis bei vollem Pool

2. **disconnect/connect wurde entfernt** (✅ IMPLEMENTIERT)
   - `backend/src/utils/prisma.ts` Zeile 166-168
   - Retry ohne disconnect/connect (Prisma reconnect automatisch)
   - Verhindert 6-30 Sekunden zusätzliche Wartezeit

3. **Round-Robin-Verteilung** (✅ IMPLEMENTIERT)
   - `backend/src/utils/prisma.ts` Zeile 65-112
   - 10 Prisma-Instanzen mit je 10 Verbindungen = 100 Verbindungen total
   - Round-Robin-Verteilung über Proxy

**Was ist noch offen:**

1. **Round-Robin-Verteilung nutzt Pools blind**
   - Keine intelligente Pool-Auswahl (ignoriert Pool-Status)
   - Wenn ein Pool voll ist (10/10), wird trotzdem versucht, diesen Pool zu nutzen
   - **Problem:** Pools werden nicht gleichmäßig ausgelastet

2. **executeWithRetry wird zu häufig verwendet**
   - 15 Dateien verwenden `executeWithRetry`
   - Wird auch bei READ-Operationen verwendet (nicht kritisch)
   - **Problem:** Retries blockieren Verbindungen auch bei nicht-kritischen Operationen

---

### ✅ Problem 2: Filter-Chaos - Teilweise behoben

**Was wurde bereits implementiert:**

1. **Endlosschleife in Worktracker.tsx behoben** (✅ IMPLEMENTIERT)
   - `frontend/src/pages/Worktracker.tsx` Zeile 337, 937-985
   - Loading-State hinzugefügt
   - useCallback für stabile Referenzen
   - Fehlerbehandlung für Timeout-Fehler

2. **SavedFilterTags useEffect korrigiert** (✅ IMPLEMENTIERT)
   - `frontend/src/components/SavedFilterTags.tsx` Zeile 96, 208-256
   - Ref verhindert mehrfache Anwendung des Default-Filters
   - Korrekte Dependencies

**Was ist noch offen:**

1. **JSON-Strings in DB** (fehleranfällig)
   - Filter werden als JSON-Strings gespeichert
   - Jedes Laden erfordert JSON.parse()
   - **Problem:** Fehleranfällig, keine Type-Safety

2. **Migration-Logik überall**
   - Altes Format vs. neues Format müssen beide unterstützt werden
   - Migration-Logik in filterListCache.ts, savedFilterController.ts, etc.
   - **Problem:** Komplex, fehleranfällig

3. **Doppelte Filter-Ladung**
   - Requests.tsx lädt Requests (ohne Filter)
   - SavedFilterTags.tsx lädt Filter (separat)
   - **Problem:** Doppelte API-Calls, keine Koordination

4. **Format-Inkonsistenzen**
   - Backend speichert sortDirections als Objekt `{}`
   - Frontend erwartet sortDirections als Array `[]`
   - **Problem:** Migration-Logik konvertiert zwischen beiden Formaten

---

### ❌ Problem 3: Schema-Fehler - Nicht behoben

**Was ist noch offen:**

1. **Hardcoded Schema-Name**
   - `backend/src/routes/claudeRoutes.ts` Zeile 31-32: `table_schema = 'public'` ist hardcoded
   - **Problem:** Fehler in bestimmten Umgebungen, wenn Schema nicht 'public' heißt

---

## 🎯 DETAILLIERTER LÖSUNGSPLAN

### Problem 1: DB-Verbindungsprobleme - Intelligente Pool-Auswahl

#### Lösung 1.1: Pool-Status-Tracking implementieren

**Was:**
- Pool-Status für jeden Pool tracken (aktive Verbindungen, verfügbare Verbindungen)
- Pool-Auswahl basierend auf verfügbaren Verbindungen

**Wie:**
1. **Pool-Status-Tracking hinzufügen:**
   ```typescript
   // backend/src/utils/prisma.ts
   interface PoolStatus {
     poolId: number;
     activeConnections: number;
     maxConnections: number;
     availableConnections: number;
   }
   
   const poolStatuses: Map<number, PoolStatus> = new Map();
   
   // Pool-Status aktualisieren bei jedem Zugriff
   const updatePoolStatus = (poolId: number, activeConnections: number) => {
     poolStatuses.set(poolId, {
       poolId,
       activeConnections,
       maxConnections: 10,
       availableConnections: 10 - activeConnections
     });
   };
   ```

2. **Intelligente Pool-Auswahl:**
   ```typescript
   const getPrismaPool = (): PrismaClient => {
     // Finde Pool mit meisten verfügbaren Verbindungen
     let bestPool = prismaPools[0];
     let bestAvailable = 0;
     
     for (let i = 0; i < prismaPools.length; i++) {
       const status = poolStatuses.get(i + 1);
       const available = status?.availableConnections || 10;
       
       if (available > bestAvailable) {
         bestPool = prismaPools[i];
         bestAvailable = available;
       }
     }
     
     return bestPool;
   };
   ```

**Erwartete Verbesserung:**
- Pools werden gleichmäßig ausgelastet
- Weniger Connection Pool Timeouts
- System wird stabiler

**Risiko:** Mittel - Pool-Status-Tracking muss genau sein

---

#### Lösung 1.2: executeWithRetry nur bei kritischen Operationen

**Was:**
- `executeWithRetry` nur bei CREATE/UPDATE/DELETE Operationen
- NICHT bei READ-Operationen (findFirst, findUnique, findMany)

**Wie:**
1. **executeWithRetry aus READ-Operationen entfernen:**
   - `backend/src/services/filterListCache.ts` - ✅ BEREITS ENTFERNT (Zeile 58, 142)
   - `backend/src/services/filterCache.ts` - Prüfen ob noch vorhanden
   - `backend/src/controllers/savedFilterController.ts` - Prüfen ob noch bei READ-Operationen verwendet

2. **executeWithRetry nur bei WRITE-Operationen:**
   - CREATE: `prisma.savedFilter.create()`
   - UPDATE: `prisma.savedFilter.update()`
   - DELETE: `prisma.savedFilter.delete()`

**Erwartete Verbesserung:**
- 50-70% weniger executeWithRetry Aufrufe
- Connection Pool wird weniger belastet
- System wird schneller

**Risiko:** Niedrig - READ-Operationen sind nicht kritisch

---

### Problem 2: Filter-Chaos - Einheitliche Filter-Struktur

#### Lösung 2.1: Filter-Datenstruktur vereinheitlichen

**Was:**
- Einheitliche Datenstruktur für Filter (keine JSON-Strings mehr)
- Type-Safety durch TypeScript-Typen

**Wie:**
1. **Prisma Schema anpassen (wenn möglich):**
   - `conditions`: JSON → Array von FilterCondition
   - `operators`: JSON → Array von 'AND' | 'OR'
   - `sortDirections`: JSON → Array von SortDirection
   
   **ABER:** Prisma unterstützt keine Arrays direkt → JSON bleibt nötig
   
2. **TypeScript-Typen definieren:**
   ```typescript
   // backend/src/types/filter.ts
   export interface FilterCondition {
     column: string;
     operator: string;
     value: any;
   }
   
   export interface SortDirection {
     column: string;
     direction: 'asc' | 'desc';
     priority: number;
     conditionIndex: number;
   }
   
   export interface SavedFilterData {
     conditions: FilterCondition[];
     operators: ('AND' | 'OR')[];
     sortDirections: SortDirection[];
   }
   ```

3. **Helper-Funktionen für JSON-Parsing:**
   ```typescript
   // backend/src/utils/filterHelpers.ts
   export const parseFilterConditions = (json: string): FilterCondition[] => {
     try {
       return JSON.parse(json);
     } catch (e) {
       console.error('Fehler beim Parsen von conditions:', e);
       return [];
     }
   };
   
   export const stringifyFilterConditions = (conditions: FilterCondition[]): string => {
     return JSON.stringify(conditions);
   };
   ```

**Erwartete Verbesserung:**
- Type-Safety durch TypeScript-Typen
- Fehlerbehandlung zentralisiert
- Code wird wartbarer

**Risiko:** Niedrig - Nur Helper-Funktionen, keine DB-Änderungen

---

#### Lösung 2.2: Migration-Logik zentralisieren

**Was:**
- Migration-Logik in eine zentrale Funktion auslagern
- Altes Format wird einmalig konvertiert, dann einheitliches Format

**Wie:**
1. **Migration-Funktion erstellen:**
   ```typescript
   // backend/src/utils/filterMigration.ts
   export const migrateSortDirections = (sortDirections: string): SortDirection[] => {
     if (!sortDirections || sortDirections.trim() === 'null' || sortDirections.trim() === '') {
       return [];
     }
     
     try {
       const parsed = JSON.parse(sortDirections);
       
       // Neues Format (Array)
       if (Array.isArray(parsed)) {
         return parsed;
       }
       
       // Altes Format (Objekt) → Konvertieren
       if (typeof parsed === 'object' && parsed !== null) {
         return Object.entries(parsed).map(([column, direction], index) => ({
           column,
           direction: direction as 'asc' | 'desc',
           priority: index + 1,
           conditionIndex: 0 // Default, da altes Format keine conditionIndex hatte
         }));
       }
       
       return [];
     } catch (e) {
       console.error('Fehler beim Migrieren von sortDirections:', e);
       return [];
     }
   };
   ```

2. **Migration-Logik überall ersetzen:**
   - `backend/src/services/filterListCache.ts` Zeile 68-108
   - `backend/src/controllers/savedFilterController.ts` Zeile 136-160
   - Alle anderen Stellen, die Migration-Logik haben

**Erwartete Verbesserung:**
- Migration-Logik zentralisiert
- Code wird wartbarer
- Fehlerbehandlung einheitlich

**Risiko:** Niedrig - Nur Code-Refactoring, keine DB-Änderungen

---

#### Lösung 2.3: Doppelte Filter-Ladung beheben

**Was:**
- Filter werden nur einmal geladen
- Koordination zwischen Komponenten

**Wie:**
1. **Filter-Context erstellen:**
   ```typescript
   // frontend/src/contexts/FilterContext.tsx
   interface FilterContextType {
     filters: SavedFilter[];
     groups: FilterGroup[];
     loading: boolean;
     error: string | null;
     loadFilters: (tableId: string) => Promise<void>;
   }
   
   export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const [filters, setFilters] = useState<SavedFilter[]>([]);
     const [groups, setGroups] = useState<FilterGroup[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     
     const loadFilters = useCallback(async (tableId: string) => {
       // Filter laden nur wenn noch nicht geladen
       if (filters.length > 0) return;
       
       setLoading(true);
       try {
         const [filtersResponse, groupsResponse] = await Promise.all([
           axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
           axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
         ]);
         
         setFilters(filtersResponse.data);
         setGroups(groupsResponse.data);
       } catch (err) {
         setError('Fehler beim Laden der Filter');
       } finally {
         setLoading(false);
       }
     }, [filters.length]);
     
     return (
       <FilterContext.Provider value={{ filters, groups, loading, error, loadFilters }}>
         {children}
       </FilterContext.Provider>
     );
   };
   ```

2. **Komponenten verwenden Filter-Context:**
   - `SavedFilterTags.tsx` verwendet Filter-Context
   - `Requests.tsx` verwendet Filter-Context
   - `Worktracker.tsx` verwendet Filter-Context

**Erwartete Verbesserung:**
- Filter werden nur einmal geladen
- Keine doppelten API-Calls
- Performance verbessert

**Risiko:** Mittel - Context muss korrekt implementiert werden

---

#### Lösung 2.4: Format-Inkonsistenzen beheben

**Was:**
- Einheitliches Format für sortDirections (immer Array)
- Migration beim Speichern (altes Format → neues Format)

**Wie:**
1. **Backend speichert immer Array:**
   ```typescript
   // backend/src/controllers/savedFilterController.ts
   const sortDirectionsJson = JSON.stringify(
     Array.isArray(sortDirections) 
       ? sortDirections 
       : [] // Fallback wenn nicht Array
   );
   ```

2. **Frontend erwartet immer Array:**
   ```typescript
   // frontend/src/components/SavedFilterTags.tsx
   const validSortDirections = Array.isArray(filter.sortDirections) 
     ? filter.sortDirections 
     : [];
   ```

**Erwartete Verbesserung:**
- Einheitliches Format
- Keine Migration-Logik mehr nötig
- Code wird einfacher

**Risiko:** Niedrig - Nur Format-Konvertierung

---

### Problem 3: Schema-Fehler - Dynamischer Schema-Name

#### Lösung 3.1: Schema-Name aus Umgebungsvariable

**Was:**
- Schema-Name aus Umgebungsvariable laden
- Fallback auf 'public' wenn nicht gesetzt

**Wie:**
1. **Umgebungsvariable hinzufügen:**
   ```bash
   # .env
   DATABASE_SCHEMA=public
   ```

2. **Code anpassen:**
   ```typescript
   // backend/src/routes/claudeRoutes.ts
   const schemaName = process.env.DATABASE_SCHEMA || 'public';
   
   const query = `
     SELECT column_name, data_type
     FROM information_schema.columns 
     WHERE table_schema = $1
   `;
   
   const result = await prisma.$queryRawUnsafe(query, schemaName);
   ```

**Erwartete Verbesserung:**
- Schema-Name ist konfigurierbar
- Funktioniert in allen Umgebungen
- Keine hardcoded Werte mehr

**Risiko:** Niedrig - Nur Umgebungsvariable hinzufügen

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: Kritische Fixes (SOFORT)

1. **Problem 3: Schema-Fehler beheben** (30 Minuten)
   - Umgebungsvariable hinzufügen
   - Code anpassen
   - **Impact:** Hoch - Behebt Fehler in bestimmten Umgebungen

2. **Problem 1.2: executeWithRetry aus READ-Operationen entfernen** (2 Stunden)
   - Alle READ-Operationen prüfen
   - executeWithRetry entfernen
   - **Impact:** Hoch - Reduziert Connection Pool Belastung

---

### Phase 2: Wichtige Verbesserungen (NÄCHSTE WOCHE)

3. **Problem 2.4: Format-Inkonsistenzen beheben** (1 Stunde)
   - Backend speichert immer Array
   - Frontend erwartet immer Array
   - **Impact:** Mittel - Vereinfacht Code

4. **Problem 2.2: Migration-Logik zentralisieren** (2 Stunden)
   - Migration-Funktion erstellen
   - Migration-Logik überall ersetzen
   - **Impact:** Mittel - Code wird wartbarer

---

### Phase 3: Langfristige Verbesserungen (SPÄTER)

5. **Problem 1.1: Intelligente Pool-Auswahl** (4 Stunden)
   - Pool-Status-Tracking implementieren
   - Intelligente Pool-Auswahl
   - **Impact:** Hoch - System wird stabiler, aber komplexer

6. **Problem 2.1: Filter-Datenstruktur vereinheitlichen** (3 Stunden)
   - TypeScript-Typen definieren
   - Helper-Funktionen erstellen
   - **Impact:** Mittel - Type-Safety, aber keine Performance-Verbesserung

7. **Problem 2.3: Doppelte Filter-Ladung beheben** (4 Stunden)
   - Filter-Context erstellen
   - Komponenten anpassen
   - **Impact:** Mittel - Performance-Verbesserung, aber größere Änderung

---

## ❓ FRAGEN ZUR KLÄRUNG

### Frage 1: Filter-Datenstruktur

**Frage:** Sollen Filter weiterhin als JSON-Strings in der DB gespeichert werden, oder soll das Prisma Schema angepasst werden?

**Option A:** JSON-Strings beibehalten (aktuell)
- ✅ Keine DB-Migration nötig
- ❌ Keine Type-Safety
- ❌ Fehleranfällig

**Option B:** Prisma Schema anpassen (wenn möglich)
- ✅ Type-Safety
- ✅ Keine JSON-Parsing nötig
- ❌ DB-Migration nötig
- ❌ Prisma unterstützt möglicherweise keine Arrays direkt

**Empfehlung:** Option A (JSON-Strings beibehalten, aber mit TypeScript-Typen und Helper-Funktionen)

---

### Frage 2: Pool-Status-Tracking

**Frage:** Wie genau soll der Pool-Status getrackt werden?

**Option A:** Schätzung basierend auf aktiven Queries
- ✅ Einfach zu implementieren
- ❌ Nicht 100% genau

**Option B:** Prisma Connection Pool Status abfragen
- ✅ Genau
- ❌ Prisma bietet möglicherweise keine API dafür

**Option C:** PostgreSQL direkt abfragen
- ✅ Genau
- ❌ Zusätzliche DB-Query nötig

**Empfehlung:** Option A (Schätzung) für erste Implementierung, später Option C wenn nötig

---

### Frage 3: Filter-Context

**Frage:** Soll ein Filter-Context erstellt werden, oder sollen Filter anders koordiniert werden?

**Option A:** Filter-Context erstellen
- ✅ Zentrale Verwaltung
- ✅ Keine doppelten API-Calls
- ❌ Größere Code-Änderung

**Option B:** Filter werden von einer Komponente geladen, andere verwenden Props
- ✅ Kleinere Änderung
- ❌ Immer noch doppelte API-Calls möglich

**Empfehlung:** Option A (Filter-Context) für langfristige Lösung

---

## 📊 ERWARTETE VERBESSERUNGEN

### Nach Phase 1:
- ✅ Schema-Fehler behoben
- ✅ 50-70% weniger executeWithRetry Aufrufe
- ✅ Connection Pool weniger belastet
- ✅ System wird schneller

### Nach Phase 2:
- ✅ Einheitliches Format für Filter
- ✅ Migration-Logik zentralisiert
- ✅ Code wird wartbarer

### Nach Phase 3:
- ✅ Intelligente Pool-Auswahl
- ✅ Type-Safety für Filter
- ✅ Keine doppelten Filter-Ladungen
- ✅ System wird stabiler und schneller

---

**Erstellt:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Nächster Schritt:** Fragen klären, dann Phase 1 starten

