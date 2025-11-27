# Performance-Problem: Vollständiger Lösungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - NICHTS geändert, nur Plan erstellt  
**Zweck:** Schritt-für-Schritt Plan zur Behebung aller Performance-Probleme

---

## 📋 ZUSAMMENFASSUNG DER ERKENNTNISSE

### Root Cause (bestätigt durch Server-Logs):

**Hauptproblem:** Connection Pool Exhaustion
- **Connection Pool ist voll (100/100)** bei nur 1 Benutzer
- **"Timed out fetching a new connection from the connection pool"** (Logs Zeile 652-655)
- **Viele "Can't reach database server" Fehler** (Logs Zeile 752-810)
- **Sehr langsame Queries:** 4-19 Sekunden (Logs Zeile 431, 517)

**Warum ist Pool voll?**
1. **Viele parallele Requests** pro Seitenaufruf (8-12)
2. **executeWithRetry blockiert** Verbindungen bei Retries
3. **executeWithRetry in READ-Operationen** (Caches) verschlimmert das Problem
4. **Nach mehreren Seitenwechseln** wird Pool voll

**Sekundäre Probleme:**
1. **Kein Caching** für Branches, Onboarding-Status
2. **Re-Render-Loops** im Frontend
3. **Memory Leaks** (Settings, Event-Listener)
4. **Doppelte API-Calls**
5. **Sehr langsame Queries** (OR-Bedingungen)

---

## 🎯 LÖSUNGSPLAN (Priorisiert)

### PHASE 1: SOFORTIGE ENTLASTUNG DES CONNECTION POOLS (PRIORITÄT 1) 🔴🔴🔴

**Zweck:** Connection Pool sofort entlasten, damit System wieder funktioniert

#### Schritt 1.1: executeWithRetry aus READ-Operationen entfernen

**Problem:** executeWithRetry in READ-Operationen blockiert Verbindungen bei vollem Pool

**Betroffene Dateien:**

**1. `backend/src/utils/organizationCache.ts` (2 Stellen)**
- **Zeile 30:** `executeWithRetry(() => prisma.userRole.findFirst(...))` → **ENTFERNEN**
- **Zeile 70:** `executeWithRetry(() => prisma.usersBranches.findFirst(...))` → **ENTFERNEN**

**Code-Änderung:**
```typescript
// Vorher:
const userRole = await executeWithRetry(() =>
  prisma.userRole.findFirst({...})
);

// Nachher:
const userRole = await prisma.userRole.findFirst({...});
```

**Begründung:**
- READ-Operationen blockieren nicht bei vollem Pool
- Sofortiger Fehler statt 6 Sekunden Wartezeit (3 Retries × 2 Sekunden)
- Weniger Retries = Weniger Überlastung

**2. `backend/src/services/userCache.ts` (1 Stelle)**
- **Zeile 47:** `executeWithRetry(() => prisma.user.findUnique(...))` → **ENTFERNEN**

**3. `backend/src/services/worktimeCache.ts` (1 Stelle)**
- **Zeile 47:** `executeWithRetry(() => prisma.workTime.findFirst(...))` → **ENTFERNEN**

**4. `backend/src/services/filterListCache.ts` (2 Stellen)**
- **Zeile 60:** `executeWithRetry(() => prisma.savedFilter.findMany(...))` → **ENTFERNEN**
- **Zeile 146:** `executeWithRetry(() => prisma.filterGroup.findMany(...))` → **ENTFERNEN**

**5. `backend/src/controllers/organizationController.ts` (1 Stelle)**
- **Zeile 766:** `executeWithRetry(() => prisma.organization.findUnique(...))` → **ENTFERNEN** (nur für Settings-Query, nicht für CREATE/UPDATE/DELETE)

**Gesamt:** 7 Stellen in 5 Dateien

**Erwartete Verbesserung:**
- **Weniger Retries** = Weniger Überlastung
- **Sofortiger Fehler** statt 6 Sekunden Wartezeit
- **Connection Pool wird weniger belastet**

---

#### Schritt 1.2: executeWithRetry-Logik optimieren (bereits implementiert, prüfen)

**Datei:** `backend/src/utils/prisma.ts:52-60`

**Aktueller Code:**
```typescript
// 🔴 KRITISCH: Connection Pool Timeout = Sofortiger Fehler, kein Retry!
if (
  error instanceof PrismaClientKnownRequestError &&
  error.message.includes('Timed out fetching a new connection from the connection pool')
) {
  console.error(`[Prisma] Connection Pool Timeout - Kein Retry! Pool ist voll.`);
  throw error; // Sofort werfen, kein Retry!
}
```

**Status:** ✅ Bereits implementiert

**Prüfen:** Funktioniert die Logik korrekt? (Logs zeigen "Connection Pool Timeout - Kein Retry!")

---

### PHASE 2: CACHING FÜR FEHLENDE ENDPOINTS (PRIORITÄT 1) 🔴🔴

**Zweck:** Reduziere DB-Queries durch Caching

#### Schritt 2.1: BranchCache implementieren

**Problem:** `/api/branches/user` hat kein Caching → Jeder Request macht DB-Query

**Datei:** `backend/src/controllers/branchController.ts:167-214`

**Vorgehen:**
1. **Neue Datei erstellen:** `backend/src/services/branchCache.ts`
2. **BranchCache implementieren** (ähnlich wie OrganizationCache)
3. **TTL:** 5-10 Minuten (Branches ändern sich selten)
4. **In `getUserBranches` verwenden**

**Code-Struktur:**
```typescript
class BranchCache {
  private cache: Map<number, BranchCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  async get(userId: number): Promise<Branch[] | null> {
    // Cache-Hit: Sofort zurückgeben
    // Cache-Miss: DB-Query + Cache speichern
  }

  invalidate(userId: number): void {
    this.cache.delete(userId);
  }
}
```

**Erwartete Verbesserung:**
- **Weniger DB-Queries** für Branches
- **Schnelleres Laden** beim initialen Laden
- **Connection Pool wird weniger belastet**

---

#### Schritt 2.2: OnboardingCache implementieren

**Problem:** `/api/users/onboarding/status` hat kein Caching → Jeder Request macht DB-Query

**Datei:** `backend/src/controllers/userController.ts` (getOnboardingStatus)

**Vorgehen:**
1. **Neue Datei erstellen:** `backend/src/services/onboardingCache.ts`
2. **OnboardingCache implementieren**
3. **TTL:** 5-10 Minuten (Onboarding-Status ändert sich selten)
4. **In `getOnboardingStatus` verwenden**

**Erwartete Verbesserung:**
- **Weniger DB-Queries** für Onboarding-Status
- **Schnelleres Laden** beim initialen Laden
- **Connection Pool wird weniger belastet**

---

#### Schritt 2.3: FilterListCache prüfen und sicherstellen, dass es verwendet wird

**Problem:** FilterListCache wurde implementiert, aber möglicherweise nicht verwendet

**Datei:** `backend/src/services/filterListCache.ts`

**Vorgehen:**
1. **Prüfen:** Wird FilterListCache in `getUserSavedFilters` und `getFilterGroups` verwendet?
2. **Falls nicht:** FilterListCache integrieren
3. **executeWithRetry entfernen** (siehe Schritt 1.1)

**Erwartete Verbesserung:**
- **Filter Tags laden schneller** (Cache-Hit statt DB-Query)
- **Weniger DB-Queries** für Filter
- **Connection Pool wird weniger belastet**

---

### PHASE 3: FRONTEND-OPTIMIERUNGEN (PRIORITÄT 2) 🔴

**Zweck:** Re-Render-Loops und Memory Leaks beheben

#### Schritt 3.1: Re-Render-Loops beheben

**Problem:** `filterConditions` ist Dependency in `useEffect`, wird aber in `useEffect` gesetzt

**Datei:** `frontend/src/components/Requests.tsx:582, 611`

**Code-Änderung:**
```typescript
// Vorher:
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId, filterConditions]); // ← filterConditions!

// Nachher:
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId]); // ← filterConditions entfernt!
```

**Gleiches Problem in `Worktracker.tsx`:** Zeile 913, 938

**Erwartete Verbesserung:**
- **Keine Re-Render-Loops** mehr
- **CPU nicht mehr auf 100%**
- **Weniger RAM-Verbrauch**

---

#### Schritt 3.2: Doppelte API-Calls für Filter entfernen

**Problem:** Worktracker.tsx und SavedFilterTags.tsx laden beide Filter

**Datei:** `frontend/src/pages/Worktracker.tsx:919`

**Vorgehen:**
1. **Prüfen:** Lädt Worktracker.tsx Filter selbst?
2. **Falls ja:** Entfernen (SavedFilterTags lädt bereits)
3. **Gleiches für Requests.tsx**

**Erwartete Verbesserung:**
- **Weniger API-Calls** für Filter
- **Weniger DB-Queries**
- **Connection Pool wird weniger belastet**

---

#### Schritt 3.3: Settings nur laden wenn benötigt (Organisation-Tab)

**Problem:** Settings werden immer geladen (19.8 MB), bleiben im State (3GB RAM)

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx:47`

**Code-Änderung:**
```typescript
// Vorher:
const org = await organizationService.getCurrentOrganization(undefined, true);

// Nachher:
// Initial: Ohne Settings laden
const org = await organizationService.getCurrentOrganization(undefined, false);

// Nur beim Bearbeiten: Settings laden
const handleEdit = async () => {
  const orgWithSettings = await organizationService.getCurrentOrganization(undefined, true);
  // ...
};
```

**Zusätzlich:** Cleanup-Logik für Settings hinzufügen

**Code-Änderung:**
```typescript
useEffect(() => {
  return () => {
    // Cleanup: Settings aus State entfernen
    setOrganization(null);
  };
}, []);
```

**Erwartete Verbesserung:**
- **19.8 MB weniger** Memory-Verbrauch beim initialen Laden
- **Keine kumulativen Memory-Leaks**
- **3GB RAM → < 100 MB**

---

#### Schritt 3.4: Event-Listener Cleanup beheben

**Problem:** Event-Listener werden nicht entfernt → Memory Leak

**Datei:** `frontend/src/components/Requests.tsx:582`

**Code-Änderung:**
```typescript
// Vorher:
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId, filterConditions]);

// Nachher:
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, [requestsLoadingMore, requestsHasMore, selectedFilterId]); // ← filterConditions entfernt
```

**Erwartete Verbesserung:**
- **Keine Memory Leaks** durch Event-Listener
- **Weniger RAM-Verbrauch**

---

### PHASE 4: QUERY-OPTIMIERUNG (PRIORITÄT 2) 🔴

**Zweck:** Langsame Queries optimieren

#### Schritt 4.1: OR-Bedingungen in getAllRequests optimieren

**Problem:** Verschachtelte OR-Bedingungen → 19.67 Sekunden für 20 Requests (Logs Zeile 517)

**Datei:** `backend/src/controllers/requestController.ts:116-131`

**Aktueller Code:**
```typescript
baseWhereConditions.push({
  OR: [
    {
      isPrivate: false,
      organizationId: organizationId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      OR: [  // ← Verschachtelte OR!
        { requesterId: userId },
        { responsibleId: userId }
      ]
    }
  ]
});
```

**Vorgehen:**
1. **OR-Bedingungen umstrukturieren** (flacher machen)
2. **Indizes prüfen** (sind Indizes für `isPrivate`, `organizationId`, `requesterId`, `responsibleId` vorhanden?)
3. **Query-Performance messen** (vorher/nachher)

**Mögliche Optimierung:**
```typescript
// Flachere Struktur:
baseWhereConditions.push({
  OR: [
    {
      isPrivate: false,
      organizationId: organizationId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      requesterId: userId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      responsibleId: userId
    }
  ]
});
```

**Erwartete Verbesserung:**
- **19.67 Sekunden → < 1 Sekunde** (geschätzt)
- **Weniger Blocking** im Connection Pool
- **Bessere Index-Nutzung**

---

#### Schritt 4.2: OR-Bedingungen in getAllTasks optimieren

**Problem:** OR-Bedingungen → 4.36 Sekunden für 20 Tasks (Logs Zeile 431)

**Datei:** `backend/src/controllers/taskController.ts` (getAllTasks)

**Vorgehen:**
1. **OR-Bedingungen analysieren**
2. **Umstrukturieren** (flacher machen)
3. **Indizes prüfen**
4. **Query-Performance messen**

**Erwartete Verbesserung:**
- **4.36 Sekunden → < 0.5 Sekunden** (geschätzt)
- **Weniger Blocking** im Connection Pool

---

### PHASE 5: CONNECTION POOL KONFIGURATION (PRIORITÄT 3) 🟡

**Zweck:** Connection Pool für höhere Last optimieren

#### Schritt 5.1: Connection Pool-Größe prüfen

**Aktuell:** `connection_limit=100` (konfiguriert)

**Problem:** Pool ist trotzdem voll (100/100)

**Vorgehen:**
1. **PostgreSQL max_connections prüfen:**
   ```sql
   SHOW max_connections;
   ```
2. **Aktuelle Verbindungen prüfen:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
3. **Falls nötig:** `max_connections` erhöhen (aber nur wenn wirklich nötig!)

**ABER:** Pool-Größe erhöhen hilft nicht, wenn das Problem woanders liegt!

**Erwartete Verbesserung:**
- **Mehr Verbindungen möglich** (aber nur wenn wirklich nötig)
- **ABER:** Hauptproblem ist nicht die Pool-Größe, sondern die Überlastung!

---

#### Schritt 5.2: Connection Pool Timeout prüfen

**Aktuell:** `pool_timeout=20` (konfiguriert)

**Status:** ✅ Bereits optimiert (20 Sekunden)

**Prüfen:** Ist das ausreichend?

---

### PHASE 6: MONITORING & VALIDIERUNG (PRIORITÄT 3) 🟡

**Zweck:** Performance überwachen und validieren

#### Schritt 6.1: Timing-Logs hinzufügen

**Zweck:** Performance messen, nicht annehmen

**Datei:** `backend/src/controllers/organizationController.ts:766`

**Code-Änderung:**
```typescript
if (includeSettings && organization) {
  const settingsStart = Date.now();
  const orgWithSettings = await prisma.organization.findUnique({...});
  const settingsDuration = Date.now() - settingsStart;
  console.log(`[getCurrentOrganization] Settings-Query took ${settingsDuration}ms`);
  
  // Settings-Größe messen
  const settingsSize = JSON.stringify(orgWithSettings.settings).length;
  console.log(`[getCurrentOrganization] Settings size: ${settingsSize} bytes (${(settingsSize / 1024 / 1024).toFixed(2)} MB)`);
}
```

**Gleiches für:**
- `organizationCache.get()`
- `getAllRequests`
- `getAllTasks`
- `getUserBranches`

**Erwartete Verbesserung:**
- **Performance messen** statt annehmen
- **Bottlenecks identifizieren**

---

#### Schritt 6.2: Connection Pool-Nutzung überwachen

**Zweck:** Verstehen, wie viele Verbindungen tatsächlich genutzt werden

**Vorgehen:**
1. **PostgreSQL-Query:**
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'intranet';
   ```
2. **Logging hinzufügen:** Wie viele Verbindungen werden gleichzeitig genutzt?
3. **Trends analysieren:** Wann wird Pool voll?

**Erwartete Verbesserung:**
- **Verstehen** warum Pool voll ist
- **Proaktive Maßnahmen** ergreifen

---

## 📊 IMPLEMENTIERUNGS-REIHENFOLGE

### Woche 1: Sofortige Entlastung (PHASE 1 + 2)

**Tag 1-2:**
1. ✅ executeWithRetry aus READ-Operationen entfernen (Schritt 1.1)
2. ✅ BranchCache implementieren (Schritt 2.1)
3. ✅ OnboardingCache implementieren (Schritt 2.2)
4. ✅ FilterListCache prüfen (Schritt 2.3)

**Erwartete Verbesserung:**
- **Connection Pool wird weniger belastet**
- **System wird wieder funktionsfähig**
- **Login-Flow: 20-30 Sekunden → < 5 Sekunden** (geschätzt)

---

### Woche 2: Frontend-Optimierungen (PHASE 3)

**Tag 3-4:**
1. ✅ Re-Render-Loops beheben (Schritt 3.1)
2. ✅ Doppelte API-Calls entfernen (Schritt 3.2)
3. ✅ Settings nur laden wenn benötigt (Schritt 3.3)
4. ✅ Event-Listener Cleanup (Schritt 3.4)

**Erwartete Verbesserung:**
- **Keine Re-Render-Loops** mehr
- **Weniger RAM-Verbrauch** (3GB → < 100 MB)
- **Weniger API-Calls**

---

### Woche 3: Query-Optimierung (PHASE 4)

**Tag 5-6:**
1. ✅ OR-Bedingungen in getAllRequests optimieren (Schritt 4.1)
2. ✅ OR-Bedingungen in getAllTasks optimieren (Schritt 4.2)
3. ✅ Indizes prüfen und optimieren

**Erwartete Verbesserung:**
- **19.67 Sekunden → < 1 Sekunde** (getAllRequests)
- **4.36 Sekunden → < 0.5 Sekunden** (getAllTasks)
- **Weniger Blocking** im Connection Pool

---

### Woche 4: Monitoring & Validierung (PHASE 5 + 6)

**Tag 7-8:**
1. ✅ Connection Pool-Konfiguration prüfen (Schritt 5.1)
2. ✅ Timing-Logs hinzufügen (Schritt 6.1)
3. ✅ Connection Pool-Nutzung überwachen (Schritt 6.2)
4. ✅ Performance validieren

**Erwartete Verbesserung:**
- **Performance messen** statt annehmen
- **Proaktive Maßnahmen** ergreifen

---

## 📋 DETAILLIERTE IMPLEMENTIERUNGS-ANLEITUNG

### Schritt 1.1: executeWithRetry aus READ-Operationen entfernen

**Datei 1: `backend/src/utils/organizationCache.ts`**

**Zeile 30:**
```typescript
// Vorher:
const userRole = await executeWithRetry(() =>
  prisma.userRole.findFirst({
    where: { 
      userId: Number(userId),
      lastUsed: true 
    },
    include: {
      role: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              displayName: true,
              domain: true,
              logo: true,
              isActive: true,
              maxUsers: true,
              subscriptionPlan: true,
              country: true,
              nit: true,
              createdAt: true,
              updatedAt: true
            }
          },
          permissions: true
        }
      }
    }
  })
);

// Nachher:
const userRole = await prisma.userRole.findFirst({
  where: { 
    userId: Number(userId),
    lastUsed: true 
  },
  include: {
    role: {
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true,
            domain: true,
            logo: true,
            isActive: true,
            maxUsers: true,
            subscriptionPlan: true,
            country: true,
            nit: true,
            createdAt: true,
            updatedAt: true
          }
        },
        permissions: true
      }
    }
  }
});
```

**Zeile 70:**
```typescript
// Vorher:
const userBranch = await executeWithRetry(() =>
  prisma.usersBranches.findFirst({
    where: {
      userId: Number(userId),
      lastUsed: true
    },
    select: {
      branchId: true
    }
  })
);

// Nachher:
const userBranch = await prisma.usersBranches.findFirst({
  where: {
    userId: Number(userId),
    lastUsed: true
  },
  select: {
    branchId: true
  }
});
```

**Import entfernen (falls nicht mehr benötigt):**
```typescript
// Vorher:
import { prisma, executeWithRetry } from './prisma';

// Nachher:
import { prisma } from './prisma';
```

**Datei 2: `backend/src/services/userCache.ts`**

**Zeile 47:**
```typescript
// Vorher:
const user = await executeWithRetry(() =>
  prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              organization: true,
              permissions: true
            }
          }
        }
      },
      identificationDocuments: true,
      settings: true
    }
  })
);

// Nachher:
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    roles: {
      include: {
        role: {
          include: {
            organization: true,
            permissions: true
          }
        }
      }
    },
    identificationDocuments: true,
    settings: true
  }
});
```

**Datei 3: `backend/src/services/worktimeCache.ts`**

**Zeile 47:**
```typescript
// Vorher:
const activeWorktime = await executeWithRetry(() =>
  prisma.workTime.findFirst({
    where: {
      userId: userId,
      endTime: null
    },
    include: {
      branch: true
    }
  })
);

// Nachher:
const activeWorktime = await prisma.workTime.findFirst({
  where: {
    userId: userId,
    endTime: null
  },
  include: {
    branch: true
  }
});
```

**Datei 4: `backend/src/services/filterListCache.ts`**

**Zeile 60:**
```typescript
// Vorher:
const filters = await executeWithRetry(() =>
  prisma.savedFilter.findMany({
    where: {
      userId: userId,
      tableId: tableId
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
);

// Nachher:
const filters = await prisma.savedFilter.findMany({
  where: {
    userId: userId,
    tableId: tableId
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

**Zeile 146:**
```typescript
// Vorher:
const groups = await executeWithRetry(() =>
  prisma.filterGroup.findMany({
    where: {
      userId: userId,
      tableId: tableId
    },
    include: {
      filters: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
);

// Nachher:
const groups = await prisma.filterGroup.findMany({
  where: {
    userId: userId,
    tableId: tableId
  },
  include: {
    filters: {
      orderBy: {
        createdAt: 'desc'
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

**Datei 5: `backend/src/controllers/organizationController.ts`**

**Zeile 766:**
```typescript
// Vorher:
if (includeSettings && organization) {
  const orgWithSettings = await executeWithRetry(() =>
    prisma.organization.findUnique({
      where: { id: organization.id },
      select: {
        id: true,
        name: true,
        displayName: true,
        domain: true,
        logo: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        country: true,
        nit: true,
        createdAt: true,
        updatedAt: true,
        settings: true
      }
    })
  );
  
  if (orgWithSettings) {
    organization = orgWithSettings;
    const { decryptApiSettings } = await import('../utils/encryption');
    organization.settings = decryptApiSettings(organization.settings as any);
  }
}

// Nachher:
if (includeSettings && organization) {
  const orgWithSettings = await prisma.organization.findUnique({
    where: { id: organization.id },
    select: {
      id: true,
      name: true,
      displayName: true,
      domain: true,
      logo: true,
      isActive: true,
      maxUsers: true,
      subscriptionPlan: true,
      country: true,
      nit: true,
      createdAt: true,
      updatedAt: true,
      settings: true
    }
  });
  
  if (orgWithSettings) {
    organization = orgWithSettings;
    const { decryptApiSettings } = await import('../utils/encryption');
    organization.settings = decryptApiSettings(organization.settings as any);
  }
}
```

**WICHTIG:** executeWithRetry bleibt für CREATE/UPDATE/DELETE-Operationen!

---

### Schritt 2.1: BranchCache implementieren

**Neue Datei:** `backend/src/services/branchCache.ts`

**Code:**
```typescript
import { prisma } from '../utils/prisma';

interface Branch {
  id: number;
  name: string;
  lastUsed?: boolean;
}

interface BranchCacheEntry {
  data: Branch[];
  timestamp: number;
}

class BranchCache {
  private cache: Map<number, BranchCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  private isCacheValid(entry: BranchCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  async get(userId: number): Promise<Branch[] | null> {
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      // DB-Query OHNE executeWithRetry (READ-Operation)
      const userBranches = await prisma.usersBranches.findMany({
        where: {
          userId: userId,
          lastUsed: true
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          branch: {
            name: 'asc'
          }
        }
      });

      const branches = userBranches.map(ub => ({
        id: ub.branch.id,
        name: ub.branch.name,
        lastUsed: ub.lastUsed
      }));

      this.cache.set(userId, {
        data: branches,
        timestamp: Date.now()
      });

      return branches;
    } catch (error) {
      console.error(`[BranchCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    
    for (const entry of this.cache.values()) {
      if ((now - entry.timestamp) < this.TTL_MS) {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      validEntries
    };
  }
}

export const branchCache = new BranchCache();
```

**In `backend/src/controllers/branchController.ts` verwenden:**

**Zeile 167-214:**
```typescript
// Vorher:
export const getUserBranches = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as any).userId as string, 10);
    
    const branchFilter = getDataIsolationFilter(req as any, 'branch');
    
    const userBranches = await prisma.usersBranches.findMany({
      where: {
        userId: userId,
        branch: branchFilter
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        branch: {
          name: 'asc'
        }
      }
    });
    
    const branches = userBranches.map(ub => ({
      id: ub.branch.id,
      name: ub.branch.name,
      lastUsed: ub.lastUsed
    }));
    
    res.json(branches);
  } catch (error) {
    // ...
  }
};

// Nachher:
import { branchCache } from '../services/branchCache';

export const getUserBranches = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as any).userId as string, 10);
    
    // ✅ PERFORMANCE: Verwende BranchCache statt DB-Query
    const cachedBranches = await branchCache.get(userId);
    
    if (cachedBranches) {
      return res.json(cachedBranches);
    }
    
    // Fallback: DB-Query (sollte nicht nötig sein)
    const branchFilter = getDataIsolationFilter(req as any, 'branch');
    
    const userBranches = await prisma.usersBranches.findMany({
      where: {
        userId: userId,
        branch: branchFilter
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        branch: {
          name: 'asc'
        }
      }
    });
    
    const branches = userBranches.map(ub => ({
      id: ub.branch.id,
      name: ub.branch.name,
      lastUsed: ub.lastUsed
    }));
    
    res.json(branches);
  } catch (error) {
    // ...
  }
};
```

**Cache-Invalidierung bei Branch-Änderungen:**
- `switchUserBranch` → `branchCache.invalidate(userId)`
- `updateBranch` → `branchCache.clear()` (alle User betroffen)

---

### Schritt 2.2: OnboardingCache implementieren

**Neue Datei:** `backend/src/services/onboardingCache.ts`

**Code:** (ähnlich wie BranchCache)

**In `backend/src/controllers/userController.ts` verwenden:**

**getOnboardingStatus:**
```typescript
import { onboardingCache } from '../services/onboardingCache';

export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as any).userId as string, 10);
    
    // ✅ PERFORMANCE: Verwende OnboardingCache statt DB-Query
    const cachedStatus = await onboardingCache.get(userId);
    
    if (cachedStatus) {
      return res.json(cachedStatus);
    }
    
    // Fallback: DB-Query
    // ...
  } catch (error) {
    // ...
  }
};
```

---

### Schritt 3.1: Re-Render-Loops beheben

**Datei:** `frontend/src/components/Requests.tsx:582`

**Code-Änderung:**
```typescript
// Vorher:
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100 &&
      !requestsLoadingMore &&
      requestsHasMore &&
      !selectedFilterId
    ) {
      loadMoreRequests();
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId, filterConditions]); // ← filterConditions!

// Nachher:
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100 &&
      !requestsLoadingMore &&
      requestsHasMore &&
      !selectedFilterId
    ) {
      loadMoreRequests();
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, [requestsLoadingMore, requestsHasMore, selectedFilterId]); // ← filterConditions entfernt!
```

**Gleiches für `Worktracker.tsx`:** Zeile 913, 938

---

### Schritt 3.2: Doppelte API-Calls für Filter entfernen

**Datei:** `frontend/src/pages/Worktracker.tsx:919`

**Code prüfen:**
```typescript
// Prüfen: Lädt Worktracker.tsx Filter selbst?
// Falls ja: Entfernen (SavedFilterTags lädt bereits)
```

**Gleiches für `Requests.tsx`**

---

### Schritt 3.3: Settings nur laden wenn benötigt

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx:47`

**Code-Änderung:**
```typescript
// Vorher:
const fetchOrganization = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    const org = await organizationService.getCurrentOrganization(undefined, true); // ← includeSettings: true
    setOrganization(org);
    // ...
  } catch (err: any) {
    // ...
  }
}, []);

// Nachher:
const fetchOrganization = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    // Initial: Ohne Settings laden
    const org = await organizationService.getCurrentOrganization(undefined, false); // ← includeSettings: false
    setOrganization(org);
    // ...
  } catch (err: any) {
    // ...
  }
}, []);

// Nur beim Bearbeiten: Settings laden
const handleEdit = async () => {
  const orgWithSettings = await organizationService.getCurrentOrganization(undefined, true);
  setOrganization(orgWithSettings);
  setIsEditModalOpen(true);
};

// Cleanup-Logik hinzufügen
useEffect(() => {
  return () => {
    // Cleanup: Settings aus State entfernen
    setOrganization(null);
  };
}, []);
```

---

### Schritt 4.1: OR-Bedingungen in getAllRequests optimieren

**Datei:** `backend/src/controllers/requestController.ts:116-131`

**Code-Änderung:**
```typescript
// Vorher:
baseWhereConditions.push({
  OR: [
    {
      isPrivate: false,
      organizationId: organizationId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      OR: [  // ← Verschachtelte OR!
        { requesterId: userId },
        { responsibleId: userId }
      ]
    }
  ]
});

// Nachher:
// Flachere Struktur für bessere Index-Nutzung
baseWhereConditions.push({
  OR: [
    {
      isPrivate: false,
      organizationId: organizationId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      requesterId: userId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      responsibleId: userId
    }
  ]
});
```

**Indizes prüfen:**
```sql
-- Prüfen ob Indizes vorhanden sind:
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Request' 
AND indexdef LIKE '%isPrivate%' OR indexdef LIKE '%organizationId%' OR indexdef LIKE '%requesterId%' OR indexdef LIKE '%responsibleId%';

-- Falls nicht vorhanden: Indizes erstellen
CREATE INDEX idx_request_isprivate_org ON "Request"(isPrivate, organizationId);
CREATE INDEX idx_request_requester ON "Request"(requesterId);
CREATE INDEX idx_request_responsible ON "Request"(responsibleId);
```

---

## 📊 ERWARTETE VERBESSERUNGEN

### Vorher (aktuell):
- ❌ Connection Pool ist voll (100/100) bei nur 1 Benutzer
- ❌ Login-Flow: 20-30 Sekunden
- ❌ Organisation-Tab: 4-5 Minuten, 3GB RAM
- ❌ Branches/Filter Tags: Sehr langsam
- ❌ Nach Seitenwechseln: Wird unbenutzbar langsam
- ❌ getAllRequests: 19.67 Sekunden für 20 Requests
- ❌ getAllTasks: 4.36 Sekunden für 20 Tasks

### Nachher (nach Implementierung):
- ✅ Connection Pool wird weniger belastet
- ✅ Login-Flow: < 5 Sekunden (geschätzt)
- ✅ Organisation-Tab: < 10 Sekunden, < 100 MB RAM (geschätzt)
- ✅ Branches/Filter Tags: < 1 Sekunde (geschätzt)
- ✅ Nach Seitenwechseln: Bleibt schnell
- ✅ getAllRequests: < 1 Sekunde (geschätzt)
- ✅ getAllTasks: < 0.5 Sekunden (geschätzt)

**Gesamt-Verbesserung:**
- **Performance:** 80-95% schneller (geschätzt)
- **Connection Pool:** Von voll (100/100) → Normal (< 50%)
- **RAM-Verbrauch:** Von 3GB → < 100 MB (Organisation-Tab)
- **Fehler:** Von vielen → Wenige

---

## ⚠️ WICHTIG: IMPLEMENTIERUNGS-REIHENFOLGE

**Regel:** "2 x messen, 1 x schneiden!"

**Vorgehen:**
1. **PHASE 1 + 2 zuerst** (Sofortige Entlastung)
2. **Nach jeder Phase testen** (Performance messen)
3. **Dann PHASE 3** (Frontend-Optimierungen)
4. **Dann PHASE 4** (Query-Optimierung)
5. **Dann PHASE 5 + 6** (Monitoring)

**NICHT:** Alles auf einmal ändern!

---

## 📋 CHECKLISTE

### PHASE 1: Sofortige Entlastung
- [ ] executeWithRetry aus organizationCache entfernen (2 Stellen)
- [ ] executeWithRetry aus userCache entfernen (1 Stelle)
- [ ] executeWithRetry aus worktimeCache entfernen (1 Stelle)
- [ ] executeWithRetry aus filterListCache entfernen (2 Stellen)
- [ ] executeWithRetry aus organizationController entfernen (1 Stelle, nur Settings-Query)
- [ ] BranchCache implementieren
- [ ] OnboardingCache implementieren
- [ ] FilterListCache prüfen und sicherstellen, dass es verwendet wird

### PHASE 2: Frontend-Optimierungen
- [ ] Re-Render-Loops in Requests.tsx beheben
- [ ] Re-Render-Loops in Worktracker.tsx beheben
- [ ] Doppelte API-Calls für Filter entfernen
- [ ] Settings nur laden wenn benötigt (Organisation-Tab)
- [ ] Cleanup-Logik für Settings hinzufügen
- [ ] Event-Listener Cleanup beheben

### PHASE 3: Query-Optimierung
- [ ] OR-Bedingungen in getAllRequests optimieren
- [ ] OR-Bedingungen in getAllTasks optimieren
- [ ] Indizes prüfen und optimieren

### PHASE 4: Monitoring
- [ ] Timing-Logs hinzufügen
- [ ] Connection Pool-Nutzung überwachen
- [ ] Performance validieren

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Vollständiger Lösungsplan erstellt  
**Nächster Schritt:** Plan mit User besprechen, dann Schritt für Schritt implementieren

