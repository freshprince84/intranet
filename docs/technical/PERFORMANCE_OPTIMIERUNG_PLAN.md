# Performance-Optimierung: Detaillierter Implementierungsplan

## Analyse-Ergebnisse

### ✅ Aktueller Stand

**Attachments:**
- ✅ Backend lädt Attachments bereits mit (`getAllRequests`, `getAllTasks` haben `attachments` im `include`)
- ✅ Frontend verwendet Attachments aus Response
- ✅ Attachments werden korrekt in Vorschauen angezeigt
- **KEINE ÄNDERUNG NÖTIG** - Attachments funktionieren bereits optimal

**Filtering:**
- ❌ **Client-seitiges Filtering**: Alle Daten werden geladen, dann im Frontend gefiltert
- ❌ **Keine Server-seitige Filterung**: Backend liefert ALLE Requests/Tasks
- ❌ **Standardfilter wird nach dem Laden angewendet**: Alle Daten sind bereits im Browser

---

## Identifizierte Performance-Probleme

### 🔴🔴 KRITISCH: Prisma Connection Pool Timeout

**Problem:**
- **Connection Pool zu klein**: Nur 5 Verbindungen (default)
- **Connection Pool Timeout**: 10 Sekunden
- **Fehler in Logs**: `Timed out fetching a new connection from the connection pool. (Current connection pool timeout: 10, connection limit: 5)`
- **Ursache**: Viele Prisma-Instanzen (71 Dateien) + viele gleichzeitige Requests = Pool erschöpft

**Impact:**
- **Server stürzt ab** oder wird unerreichbar
- **Requests schlagen fehl** mit Connection-Refused-Errors
- **Nginx-Fehler**: "connect() failed (111: Connection refused)" und "upstream prematurely closed connection"
- **Performance**: Server wird komplett blockiert

**Beweis aus Logs:**
```
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 10, connection limit: 5)
```

**Lösung:**
1. **Connection Pool erhöhen** (sofort):
   - Prisma Client mit größerem Pool konfigurieren
   - `connection_limit: 20-30` (statt 5)
   - `pool_timeout: 20` (statt 10)
2. **Prisma-Instanzen konsolidieren** (mittelfristig):
   - Zentrale Prisma-Instanz verwenden
   - Singleton-Pattern implementieren
   - Reduziert Pool-Verbrauch drastisch

**Geschätzte Verbesserung:**
- **Server-Stabilität**: Von instabil zu stabil
- **Request-Fehler**: Von vielen Fehlern auf 0
- **Performance**: Server blockiert nicht mehr

---

### 🔴 KRITISCH: NotificationSettings N+1 Problem

**Problem:**
- `isNotificationEnabled()` wird bei **JEDER** Notification-Erstellung aufgerufen
- Macht **2 Datenbank-Queries** pro Aufruf
- Bei 50 Notifications = **100 Datenbank-Queries** nur für Settings

**Impact:**
- **80-90% der Ladezeit** könnte durch diese Queries verursacht werden
- Jede Query dauert ~10-50ms
- Bei 50 Notifications = 1-2.5 Sekunden nur für Settings-Queries

**Lösung:**
- Settings **cachen** (in-memory Cache mit TTL)
- Settings nur **einmal pro Request** laden
- Cache invalidation beim Update

---

### 🟡 HOCH: Client-seitiges Filtering (alle Daten werden geladen)

**Problem:**
- Backend liefert **ALLE** Requests/Tasks (kann 1000+ sein)
- Frontend filtert clientseitig
- Standardfilter wird **nach dem Laden** angewendet

**Aktueller Flow:**
1. Frontend: `GET /api/requests` → Lädt ALLE Requests (z.B. 500 Requests)
2. Frontend: `GET /api/tasks` → Lädt ALLE Tasks (z.B. 1000 Tasks)
3. Frontend: Standardfilter wird gesetzt
4. Frontend: `filteredAndSortedTasks` filtert clientseitig (z.B. nur 50 Tasks anzeigen)

**Impact:**
- **Große JSON-Responses** (500 Requests + 1000 Tasks = sehr viel Daten)
- **Lange Übertragungszeiten** (mehrere MB Daten)
- **Hoher Memory-Verbrauch** im Browser
- **Unnötige Datenübertragung** (95% der Daten werden nie angezeigt)

**Geschätzte Verbesserung:**
- Bei Standardfilter "Aktuell" (z.B. nur 50 von 1000 Tasks):
  - **Datenübertragung**: Von ~5MB auf ~250KB (95% Reduktion)
  - **Ladezeit**: Von ~3-5 Sekunden auf ~0.5-1 Sekunde (80-90% Verbesserung)

---

## Detaillierter Implementierungsplan

### Phase 0: Connection Pool erhöhen (KRITISCH - SOFORT) 🔴🔴

#### 0.1 Prisma Client konfigurieren

**Datei:** `backend/src/utils/prisma.ts` (neu erstellen oder vorhandene anpassen)

**Änderungen:**
- Connection Pool erhöhen: `connection_limit: 20-30`
- Pool Timeout erhöhen: `pool_timeout: 20`
- Singleton-Pattern implementieren

**Code:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection Pool erhöhen
    // Standard: connection_limit: 5, pool_timeout: 10
    // Erhöht auf: connection_limit: 20, pool_timeout: 20
    // WICHTIG: Diese Einstellungen müssen in DATABASE_URL gesetzt werden!
    // Format: postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**WICHTIG**: Connection Pool Einstellungen müssen in `DATABASE_URL` gesetzt werden:
```
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20"
```

#### 0.2 Alle Prisma-Instanzen ersetzen

**Problem:** 71 Dateien erstellen eigene Prisma-Instanzen

**Lösung:**
- Zentrale Prisma-Instanz verwenden
- Alle `new PrismaClient()` durch `import { prisma } from '../utils/prisma'` ersetzen

**Geschätzte Zeit:** 2-3 Stunden (kann schrittweise gemacht werden)
**Priorität:** Hoch, aber kann nach Connection Pool Fix gemacht werden

---

### Phase 1: NotificationSettings Caching (KRITISCH) 🔴

#### 1.1 Cache-Service erstellen

**Neue Datei:** `backend/src/services/notificationSettingsCache.ts`

**Funktionalität:**
- In-memory Cache für User Settings und System Settings
- TTL: 5 Minuten
- Cache invalidation beim Update

**Code-Struktur:**
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 5 Minuten in ms
}

class NotificationSettingsCache {
  private userSettingsCache: Map<number, CacheEntry<any>> = new Map();
  private systemSettingsCache: CacheEntry<any> | null = null;
  
  async getUserSettings(userId: number): Promise<any> {
    // Prüfe Cache
    // Falls abgelaufen oder nicht vorhanden: Lade von DB
    // Speichere in Cache
  }
  
  async getSystemSettings(): Promise<any> {
    // Prüfe Cache
    // Falls abgelaufen oder nicht vorhanden: Lade von DB
    // Speichere in Cache
  }
  
  invalidateUserSettings(userId: number): void {
    // Cache löschen
  }
  
  invalidateSystemSettings(): void {
    // Cache löschen
  }
}
```

#### 1.2 `isNotificationEnabled` anpassen

**Datei:** `backend/src/controllers/notificationController.ts`

**Änderungen:**
- Cache-Service verwenden statt direkte DB-Queries
- Settings nur einmal pro Request laden (falls mehrere Notifications für denselben User)

**Code-Änderung:**
```typescript
import { NotificationSettingsCache } from '../services/notificationSettingsCache';

const cache = new NotificationSettingsCache();

async function isNotificationEnabled(
  userId: number,
  type: NotificationType,
  relatedEntityType?: string
): Promise<boolean> {
  // Lade Settings aus Cache (nicht direkt von DB)
  const userSettings = await cache.getUserSettings(userId);
  const systemSettings = await cache.getSystemSettings();
  
  // Rest bleibt gleich...
}
```

#### 1.3 Cache invalidation beim Update

**Datei:** `backend/src/controllers/settingsController.ts`

**Änderungen:**
- Cache invalidation beim Update von User/System Settings

**Code-Änderung:**
```typescript
// Nach Update:
cache.invalidateUserSettings(userId);
// oder
cache.invalidateSystemSettings();
```

**Risiken:**
- ⚠️ **Cache-Konsistenz**: Settings könnten veraltet sein (max. 5 Min)
- ✅ **Mitigation**: TTL von 5 Min ist akzeptabel (Settings ändern sich selten)
- ⚠️ **Memory-Leak**: Cache könnte wachsen (bei vielen Usern)
- ✅ **Mitigation**: TTL sorgt für automatische Bereinigung

**Geschätzte Verbesserung:**
- **Datenbank-Queries**: Von 100 auf 2-4 (95-98% Reduktion)
- **Ladezeit**: Von 1-2.5 Sekunden auf ~0.1 Sekunden (90-95% Verbesserung)

---

### Phase 2: Server-seitiges Filtering für Standardfilter (HOCH) 🟡

#### 2.1 Backend: Filter-Parameter unterstützen

**Datei:** `backend/src/controllers/requestController.ts`

**Änderungen:**
- Query-Parameter für Filter unterstützen
- Standardfilter "Aktuell" und "Archiv" server-seitig anwenden

**Neue Query-Parameter:**
- `filterId`: ID des gespeicherten Filters
- `filterConditions`: JSON-String mit Filter-Bedingungen (für komplexe Filter)
- `limit`: Maximale Anzahl Ergebnisse (optional, default: 1000)

**Code-Änderung:**
```typescript
export const getAllRequests = async (req: Request, res: Response) => {
  // ... existing code ...
  
  // Filter-Parameter aus Query lesen
  const filterId = req.query.filterId as string | undefined;
  const filterConditions = req.query.filterConditions 
    ? JSON.parse(req.query.filterConditions as string) 
    : undefined;
  const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 1000;
  
  // Wenn Filter-ID angegeben: Lade Filter von DB
  let whereConditions: any[] = [];
  if (filterId) {
    const savedFilter = await prisma.savedFilter.findUnique({
      where: { id: parseInt(filterId, 10) }
    });
    if (savedFilter) {
      const conditions = JSON.parse(savedFilter.conditions);
      const operators = JSON.parse(savedFilter.operators);
      whereConditions = convertFilterConditionsToPrismaWhere(
        conditions,
        operators,
        'request' // Entity-Typ für spezielle Logik
      );
    }
  } else if (filterConditions) {
    // Direkte Filter-Bedingungen
    whereConditions = convertFilterConditionsToPrismaWhere(
      filterConditions.conditions,
      filterConditions.operators,
      'request'
    );
  }
  
  // Kombiniere Isolation-Filter mit Filter-Bedingungen
  const whereClause: Prisma.RequestWhereInput = {
    AND: [
      isolationFilter,
      // ... existing private/public logic ...
      ...(whereConditions.length > 0 ? [whereConditions] : [])
    ]
  };
  
  const requests = await prisma.request.findMany({
    where: whereClause,
    take: limit, // Limit hinzufügen
    include: {
      // ... existing includes ...
      attachments: {
        orderBy: { uploadedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // ... rest bleibt gleich ...
};
```

**Neue Hilfsfunktion:** `convertFilterConditionsToPrismaWhere`
- Konvertiert Filter-Bedingungen in Prisma `where`-Klauseln
- Unterstützt alle Operatoren: `equals`, `notEquals`, `contains`, `before`, `after`, etc.
- **WICHTIG**: Komplexe Filter (z.B. User/Role-Filter, __TODAY__) werden unterstützt

**Filter-Komplexität-Analyse:**

**✅ Server-seitig umsetzbar:**
- `equals`, `notEquals` → Prisma `equals`, `not`
- `contains` → Prisma `contains` (für Strings)
- `startsWith` → Prisma `startsWith`
- `endsWith` → Prisma `endsWith`
- `before`, `after` → Prisma `lt`, `gt` (für Dates)
- `greaterThan`, `lessThan` → Prisma `gt`, `lt` (für Numbers)
- Status-Filter → Direktes Prisma `equals`
- Branch-Filter → Prisma `branch.name` oder `branchId`

**⚠️ Komplex, aber umsetzbar:**
- User/Role-Filter (`user-{id}`, `role-{id}`) → Prisma `OR` mit `responsibleId`/`roleId`
- Datum-Filter mit `__TODAY__` → Dynamisch auflösen zu aktuellem Datum
- UND/ODER-Verknüpfungen → Prisma `AND`/`OR` Arrays

**❌ Nicht server-seitig umsetzbar (Fallback auf Client):**
- Sehr komplexe verschachtelte Filter (mehrere Ebenen)
- Filter mit berechneten Werten (z.B. "Alter > 30" basierend auf Geburtsdatum)
- Filter mit externen Daten (z.B. "User ist in bestimmter Organisation")

**Implementierung:**
```typescript
// Neue Datei: backend/src/utils/filterToPrisma.ts
export function convertFilterConditionsToPrismaWhere(
  conditions: FilterCondition[],
  operators: ('AND' | 'OR')[],
  entityType: 'request' | 'task'
): any {
  if (conditions.length === 0) return {};
  
  // Einfache Filter: Direkt umsetzbar
  const prismaConditions = conditions.map((cond, index) => {
    switch (cond.column) {
      case 'status':
        return cond.operator === 'equals'
          ? { status: cond.value }
          : { status: { not: cond.value } };
      
      case 'title':
        if (cond.operator === 'equals') return { title: cond.value };
        if (cond.operator === 'contains') return { title: { contains: cond.value, mode: 'insensitive' } };
        if (cond.operator === 'startsWith') return { title: { startsWith: cond.value, mode: 'insensitive' } };
        if (cond.operator === 'endsWith') return { title: { endsWith: cond.value, mode: 'insensitive' } };
        return {};
      
      case 'dueDate':
        const dateValue = cond.value === '__TODAY__' 
          ? new Date().toISOString().split('T')[0]
          : cond.value;
        if (cond.operator === 'equals') {
          const startOfDay = new Date(dateValue);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(dateValue);
          endOfDay.setHours(23, 59, 59, 999);
          return { dueDate: { gte: startOfDay, lte: endOfDay } };
        }
        if (cond.operator === 'before') return { dueDate: { lt: new Date(dateValue) } };
        if (cond.operator === 'after') return { dueDate: { gt: new Date(dateValue) } };
        return {};
      
      case 'responsible':
        // Unterstützt user-{id} und role-{id}
        if (typeof cond.value === 'string' && cond.value.startsWith('user-')) {
          const userId = parseInt(cond.value.replace('user-', ''), 10);
          return entityType === 'task' 
            ? { responsibleId: userId }
            : { responsibleId: userId };
        }
        if (typeof cond.value === 'string' && cond.value.startsWith('role-')) {
          const roleId = parseInt(cond.value.replace('role-', ''), 10);
          return entityType === 'task'
            ? { roleId: roleId }
            : {}; // Requests haben keine roleId
        }
        return {};
      
      case 'branch':
        // Branch-Name oder Branch-ID
        if (typeof cond.value === 'string') {
          return { branch: { name: { contains: cond.value, mode: 'insensitive' } } };
        }
        return {};
      
      default:
        return {};
    }
  });
  
  // UND/ODER-Verknüpfungen
  if (operators.length === 0 || operators.every(op => op === 'AND')) {
    // Alle UND: Kombiniere mit AND
    return { AND: prismaConditions.filter(c => Object.keys(c).length > 0) };
  } else if (operators.every(op => op === 'OR')) {
    // Alle ODER: Kombiniere mit OR
    return { OR: prismaConditions.filter(c => Object.keys(c).length > 0) };
  } else {
    // Gemischte Verknüpfungen: Komplex, aber umsetzbar
    // Gruppiere nach Operator-Sequenz
    const grouped: any[] = [];
    let currentGroup: any[] = [prismaConditions[0]];
    
    for (let i = 1; i < prismaConditions.length; i++) {
      const operator = operators[i - 1];
      if (operator === 'AND') {
        currentGroup.push(prismaConditions[i]);
      } else {
        // ODER: Aktuelle Gruppe abschließen, neue Gruppe starten
        if (currentGroup.length > 0) {
          grouped.push(currentGroup.length === 1 ? currentGroup[0] : { AND: currentGroup });
        }
        currentGroup = [prismaConditions[i]];
      }
    }
    
    if (currentGroup.length > 0) {
      grouped.push(currentGroup.length === 1 ? currentGroup[0] : { AND: currentGroup });
    }
    
    return grouped.length === 1 ? grouped[0] : { OR: grouped };
  }
}
```

#### 2.2 Backend: Task Controller anpassen

**Datei:** `backend/src/controllers/taskController.ts`

**Änderungen:**
- Gleiche Filter-Parameter wie Requests
- Gleiche Hilfsfunktion verwenden

#### 2.3 Frontend: Standardfilter beim Laden anwenden

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
- Standardfilter **vor** dem Laden der Daten setzen
- Filter-ID oder Filter-Bedingungen an API-Request anhängen
- Nur gefilterte Daten laden

**Code-Änderung:**
```typescript
const loadTasks = async (filterId?: number, filterConditions?: FilterCondition[]) => {
  try {
    setLoading(true);
    
    // Baue Query-Parameter
    const params: any = {};
    if (filterId) {
      params.filterId = filterId;
    } else if (filterConditions && filterConditions.length > 0) {
      params.filterConditions = JSON.stringify({
        conditions: filterConditions,
        operators: filterLogicalOperators
      });
    }
    
    // Lade nur gefilterte Tasks
    const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, { params });
    const tasksData = response.data;
    
    // ... rest bleibt gleich ...
  }
};

// Beim Mount: Standardfilter setzen, dann laden
useEffect(() => {
  const setInitialFilterAndLoad = async () => {
    // 1. Standardfilter setzen
    const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(TODOS_TABLE_ID));
    const filters = response.data;
    const aktuellFilter = filters.find((filter: any) => filter.name === 'Aktuell');
    
    if (aktuellFilter) {
      // 2. Tasks mit Standardfilter laden
      await loadTasks(aktuellFilter.id);
      
      // 3. Filter-State setzen
      setActiveFilterName(t('tasks.filters.current'));
      setSelectedFilterId(aktuellFilter.id);
      applyFilterConditions(aktuellFilter.conditions, aktuellFilter.operators);
    } else {
      // Fallback: Alle Tasks laden
      await loadTasks();
    }
  };
  
  setInitialFilterAndLoad();
}, []);
```

#### 2.4 Frontend: Hintergrund-Laden der restlichen Daten

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
- Nach dem Laden des Standardfilters: Restliche Daten im Hintergrund laden
- Daten in separatem State speichern (z.B. `allTasks`)
- Beim Filter-Wechsel: Daten aus Cache verwenden, falls vorhanden

**Code-Änderung:**
```typescript
const [allTasks, setAllTasks] = useState<Task[]>([]); // Alle Tasks (für Filter-Wechsel)

const loadTasks = async (filterId?: number, filterConditions?: FilterCondition[], background = false) => {
  // ... existing code ...
  
  if (background) {
    // Hintergrund-Laden: Speichere in allTasks
    setAllTasks(tasksWithAttachments);
  } else {
    // Vordergrund-Laden: Zeige sofort an
    setTasks(tasksWithAttachments);
  }
};

// Nach Standardfilter-Laden: Restliche Daten im Hintergrund laden
useEffect(() => {
  if (tasks.length > 0 && allTasks.length === 0) {
    // Lade alle Tasks im Hintergrund (ohne Filter)
    loadTasks(undefined, undefined, true);
  }
}, [tasks]);
```

**Risiken:**
- ⚠️ **Filter-Komplexität**: Nicht alle Filter können server-seitig umgesetzt werden
- ✅ **Mitigation**: Fallback auf client-seitiges Filtering für komplexe Filter
- ⚠️ **Daten-Konsistenz**: Daten könnten sich während Hintergrund-Laden ändern
- ✅ **Mitigation**: Beim Filter-Wechsel: Daten neu laden, falls älter als 30 Sekunden
- ⚠️ **Memory-Verbrauch**: Alle Daten werden trotzdem geladen (nur später)
- ✅ **Mitigation**: Memory-Verbrauch ist akzeptabel (moderne Browser können das)

**Geschätzte Verbesserung:**
- **Initiale Ladezeit**: Von 3-5 Sekunden auf 0.5-1 Sekunde (80-90% Verbesserung)
- **Datenübertragung**: Von ~5MB auf ~250KB initial (95% Reduktion)
- **Filter-Wechsel**: Instant (Daten bereits geladen)

---

### Phase 3: Requests Component anpassen

**Datei:** `frontend/src/components/Requests.tsx`

**Änderungen:**
- Gleiche Logik wie Worktracker
- Standardfilter "Aktuell" beim Laden anwenden
- Restliche Daten im Hintergrund laden

---

## Zusätzliche Probleme aus Log-Analyse

### 🔴🔴 KRITISCH: Server-Instabilität durch Connection Pool

**Probleme:**
1. **Connection Pool Timeout**: Prisma kann keine Verbindungen mehr holen
2. **Connection Refused**: Backend wird unerreichbar (Nginx-Fehler)
3. **Upstream Prematurely Closed**: Backend schließt Verbindungen vorzeitig
4. **Upstream Timeout**: Backend antwortet zu langsam (z.B. LobbyPMS Sync)

**Ursache:**
- Zu viele Prisma-Instanzen (71 Dateien) verbrauchen alle 5 Connection Pool Slots
- Gleichzeitige Requests blockieren sich gegenseitig
- Server wird unerreichbar

**Lösung:**
- **Sofort**: Connection Pool erhöhen (siehe Phase 0)
- **Mittelfristig**: Prisma-Instanzen konsolidieren

---

### 🟡 MITTEL: LobbyPMS Sync Timeout

**Problem:**
- LobbyPMS Sync-Requests dauern zu lange (>60 Sekunden)
- Nginx Timeout: "upstream timed out (110: Connection timed out)"
- Blockiert andere Requests

**Lösung:**
- Sync-Requests in Background-Jobs verschieben
- Oder: Timeout erhöhen für Sync-Endpoints
- Oder: Async-Sync mit Status-Endpoint

---

### 🟢 NIEDRIG: Favicon.ico 404-Fehler

**Problem:**
- Viele 404-Fehler für `/favicon.ico`
- Nicht kritisch, aber unnötige Logs

**Lösung:**
- Favicon.ico zum Frontend-Build hinzufügen
- Oder: Nginx-Konfiguration anpassen (404 ignorieren)

---

## Implementierungsreihenfolge

### Schritt 0: Connection Pool erhöhen (KRITISCH - SOFORT) 🔴🔴

1. Prisma Client konfigurieren (Connection Pool erhöhen)
2. Server neu starten
3. Testen

**Geschätzte Zeit:** 5-10 Minuten
**Risiko:** Niedrig
**Impact:** Server wird stabil (von instabil zu stabil)

### Schritt 1: NotificationSettings Cache (KRITISCH)
1. Cache-Service erstellen
2. `isNotificationEnabled` anpassen
3. Cache invalidation implementieren
4. Testen

**Geschätzte Zeit:** 1-2 Stunden
**Risiko:** Niedrig
**Impact:** 80-90% Verbesserung der Notification-Performance

### Schritt 2: Server-seitiges Filtering (HOCH)
1. Backend: Filter-Parameter unterstützen
2. Backend: Hilfsfunktion `convertFilterConditionsToPrismaWhere`
3. Frontend: Standardfilter beim Laden anwenden
4. Frontend: Hintergrund-Laden implementieren
5. Testen

**Geschätzte Zeit:** 4-6 Stunden
**Risiko:** Mittel (Filter-Komplexität)
**Impact:** 80-90% Verbesserung der initialen Ladezeit

### Schritt 3: Requests Component anpassen
1. Gleiche Logik wie Worktracker
2. Testen

**Geschätzte Zeit:** 2-3 Stunden
**Risiko:** Niedrig
**Impact:** Konsistente Performance über alle Tabellen

---

## Risiken und Mitigationen

### Risiko 1: Filter-Komplexität
**Problem:** Nicht alle Filter können server-seitig umgesetzt werden
**Mitigation:**
- Fallback auf client-seitiges Filtering
- Komplexe Filter (z.B. mit verschachtelten Bedingungen) client-seitig filtern

### Risiko 2: Daten-Konsistenz
**Problem:** Daten könnten sich während Hintergrund-Laden ändern
**Mitigation:**
- Beim Filter-Wechsel: Daten neu laden, falls älter als 30 Sekunden
- Oder: Optimistic UI (zeige sofort, aktualisiere im Hintergrund)

### Risiko 3: Memory-Verbrauch
**Problem:** Alle Daten werden trotzdem geladen (nur später)
**Mitigation:**
- Memory-Verbrauch ist akzeptabel (moderne Browser können das)
- Optional: Pagination für Hintergrund-Daten (nur erste 500 Items)

### Risiko 4: Cache-Konsistenz (NotificationSettings)
**Problem:** Settings könnten veraltet sein (max. 5 Min)
**Mitigation:**
- TTL von 5 Min ist akzeptabel (Settings ändern sich selten)
- Cache invalidation beim Update

### Risiko 5: Funktionalitätsverlust
**Problem:** Attachments oder Filter könnten nicht mehr funktionieren
**Mitigation:**
- **KEINE ÄNDERUNGEN an Attachment-Logik** (funktioniert bereits optimal)
- **Fallback auf client-seitiges Filtering** für komplexe Fälle
- **Umfangreiche Tests** vor Deployment

---

## Geschätzte Gesamtverbesserung

### Aktuell:
- **Server-Stabilität**: ❌ Instabil (Connection Pool Timeouts, Server-Crashes)
- **Ladezeit**: ~15-20 Sekunden (bei 50 Requests, 100 Tasks)
- **Datenbank-Queries**: ~100+ (NotificationSettings)
- **HTTP-Requests**: ~2 (Requests + Tasks, aber große Responses)
- **Request-Fehler**: Viele "Connection Refused" und "Upstream Prematurely Closed"

### Nach Phase 0 (Connection Pool erhöhen):
- **Server-Stabilität**: ✅ Stabil (keine Connection Pool Timeouts mehr)
- **Request-Fehler**: Von vielen auf 0
- **Server-Crashes**: Keine mehr

### Nach Phase 0 + 1 (Connection Pool + NotificationSettings Cache):
- **Ladezeit**: ~3-5 Sekunden (80-90% Verbesserung)
- **Datenbank-Queries**: ~2-4 (95-98% Reduktion)
- **Server-Stabilität**: ✅ Stabil

### Nach Phase 0 + 1 + 2 (Connection Pool + Cache + Server-seitiges Filtering):
- **Initiale Ladezeit**: ~0.5-1 Sekunde (95% Verbesserung)
- **Datenübertragung**: Von ~5MB auf ~250KB initial (95% Reduktion)
- **Filter-Wechsel**: Instant (Daten bereits geladen)
- **Server-Stabilität**: ✅ Stabil

---

## Test-Plan

### Phase 1 Tests:
1. ✅ NotificationSettings werden gecacht
2. ✅ Cache invalidation funktioniert
3. ✅ Performance-Verbesserung messbar

### Phase 2 Tests:
1. ✅ Standardfilter wird server-seitig angewendet
2. ✅ Nur gefilterte Daten werden geladen
3. ✅ Hintergrund-Laden funktioniert
4. ✅ Filter-Wechsel ist instant
5. ✅ Attachments funktionieren weiterhin
6. ✅ Komplexe Filter funktionieren (Fallback)

### Phase 3 Tests:
1. ✅ Requests Component funktioniert gleich wie Worktracker
2. ✅ Konsistente Performance über alle Tabellen

---

## Nächste Schritte

1. ✅ **Plan erstellt** - Detaillierte Analyse abgeschlossen
2. ✅ **Log-Analyse abgeschlossen** - Kritische Probleme identifiziert
3. ⏳ **Warten auf Bestätigung** - Keine Änderungen vorgenommen
4. ⏳ **Implementierung starten** - Nach Bestätigung

## Priorität der Implementierung

**SOFORT (kritisch für Server-Stabilität):**
1. Phase 0: Connection Pool erhöhen (5-10 Min)
   - Verhindert Server-Crashes
   - Macht Server wieder erreichbar

**DANN (kritisch für Performance):**
2. Phase 1: NotificationSettings Cache (1-2 Stunden)
   - Reduziert Datenbank-Queries drastisch
   - Verbessert Ladezeit um 80-90%

**DANN (hoch für Performance):**
3. Phase 2: Server-seitiges Filtering (4-6 Stunden)
   - Reduziert Datenübertragung um 95%
   - Verbessert initiale Ladezeit um 80-90%

**SPÄTER (optional):**
4. Phase 3: Requests Component anpassen (2-3 Stunden)
   - Konsistente Performance über alle Tabellen

