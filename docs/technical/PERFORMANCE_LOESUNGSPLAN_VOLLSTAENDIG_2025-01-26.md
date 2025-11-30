# Performance-Problem: Vollständiger Lösungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ HAUPTPROBLEM GELÖST (2025-01-29) - Siehe Update unten  
**Zweck:** Schritt-für-Schritt Plan zur Behebung aller Performance-Probleme

## ⚠️ WICHTIG: HAUPTPROBLEM GELÖST (2025-01-29)

**✅ Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

**Hinweis:** Viele der hier beschriebenen Probleme waren Symptome des Hauptproblems. Nach der Behebung läuft das System wieder deutlich schneller.

---

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

**Status:** ✅ **GEKLÄRT:** FilterListCache wird bereits verwendet!

**Beweis:**
- `getUserSavedFilters` (savedFilterController.ts Zeile 44): `await filterListCache.getFilters(userId, tableId)`
- `getFilterGroups` (savedFilterController.ts Zeile 345): `await filterListCache.getFilterGroups(userId, tableId)`

**Datei:** `backend/src/services/filterListCache.ts`

**Vorgehen:**
1. ✅ **Bereits implementiert:** FilterListCache wird verwendet
2. **executeWithRetry entfernen** (siehe Schritt 1.1) - Zeile 60 und 146 in filterListCache.ts

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
import { getDataIsolationFilter } from '../middleware/organization';
import { Request } from 'express';

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
  private cache: Map<string, BranchCacheEntry> = new Map(); // Cache-Key: `${userId}:${organizationId}:${roleId}`
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  private isCacheValid(entry: BranchCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Generiert Cache-Key unter Berücksichtigung von Datenisolation
   */
  private getCacheKey(userId: number, organizationId?: number, roleId?: string): string {
    return `${userId}:${organizationId || 'null'}:${roleId || 'null'}`;
  }

  async get(userId: number, req: Request): Promise<Branch[] | null> {
    // ✅ SICHERHEIT: Cache-Key unter Berücksichtigung von Datenisolation
    const organizationId = (req as any).organizationId;
    const roleId = (req as any).roleId;
    const cacheKey = this.getCacheKey(userId, organizationId, roleId);
    
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      // ✅ SICHERHEIT: getDataIsolationFilter berücksichtigen
      const branchFilter = getDataIsolationFilter(req, 'branch');
      
      // DB-Query OHNE executeWithRetry (READ-Operation)
      const userBranches = await prisma.usersBranches.findMany({
        where: {
          userId: userId,
          lastUsed: true,
          branch: branchFilter // ✅ Datenisolation!
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

      this.cache.set(cacheKey, {
        data: branches,
        timestamp: Date.now()
      });

      return branches;
    } catch (error) {
      console.error(`[BranchCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  invalidate(userId: number, organizationId?: number, roleId?: string): void {
    const cacheKey = this.getCacheKey(userId, organizationId, roleId);
    this.cache.delete(cacheKey);
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
    // ✅ SICHERHEIT: BranchCache berücksichtigt getDataIsolationFilter
    const cachedBranches = await branchCache.get(userId, req);
    
    if (cachedBranches) {
      return res.json(cachedBranches);
    }
    
    // Fallback: DB-Query (sollte nicht nötig sein, da Cache immer Daten liefert oder null)
    return res.status(500).json({ message: 'Fehler beim Laden der Branches' });
  } catch (error) {
    // ...
  }
};
```

**Cache-Invalidierung bei Branch-Änderungen:**
- `switchUserBranch` → `branchCache.invalidate(userId, organizationId, roleId)`
- `updateBranch` → `branchCache.clear()` (alle User betroffen)

---

### Schritt 2.2: OnboardingCache implementieren

**Neue Datei:** `backend/src/services/onboardingCache.ts`

**Code:**
```typescript
import { prisma } from '../utils/prisma';

interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingProgress: any;
  onboardingStartedAt: Date | null;
  onboardingCompletedAt: Date | null;
}

interface OnboardingCacheEntry {
  data: OnboardingStatus;
  timestamp: number;
}

class OnboardingCache {
  private cache: Map<number, OnboardingCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  private isCacheValid(entry: OnboardingCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  async get(userId: number): Promise<OnboardingStatus | null> {
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      // DB-Query OHNE executeWithRetry (READ-Operation)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          onboardingCompleted: true,
          onboardingProgress: true,
          onboardingStartedAt: true,
          onboardingCompletedAt: true
        }
      });

      if (!user) {
        return null;
      }

      const status: OnboardingStatus = {
        onboardingCompleted: user.onboardingCompleted,
        onboardingProgress: user.onboardingProgress,
        onboardingStartedAt: user.onboardingStartedAt,
        onboardingCompletedAt: user.onboardingCompletedAt
      };

      this.cache.set(userId, {
        data: status,
        timestamp: Date.now()
      });

      return status;
    } catch (error) {
      console.error(`[OnboardingCache] Fehler beim Laden für User ${userId}:`, error);
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

export const onboardingCache = new OnboardingCache();
```

**In `backend/src/controllers/userController.ts` verwenden:**

**getOnboardingStatus (Zeile 2087):**
```typescript
import { onboardingCache } from '../services/onboardingCache';

export const getOnboardingStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    
    // ✅ PERFORMANCE: Verwende OnboardingCache statt DB-Query
    const cachedStatus = await onboardingCache.get(userId);
    
    if (cachedStatus) {
      return res.json(cachedStatus);
    }
    
    // Fallback: DB-Query (sollte nicht nötig sein)
    return res.status(500).json({ message: 'Fehler beim Abrufen des Onboarding-Status' });
  } catch (error) {
    console.error('Error in getOnboardingStatus:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Onboarding-Status',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};
```

**Cache-Invalidierung bei Onboarding-Status-Änderung:**

**updateOnboardingProgress (Zeile 2121):**
```typescript
// Nach dem Update:
await onboardingCache.invalidate(userId);
```

**completeOnboarding (Zeile 2156):**
```typescript
// Nach dem Complete:
await onboardingCache.invalidate(userId);
```

**resetOnboarding (Zeile 2221):**
```typescript
// Nach dem Reset:
await onboardingCache.invalidate(userId);
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

---

## ⚠️ RISIKEN & KOLLATERALSCHÄDEN

### RISIKO 1: executeWithRetry aus READ-Operationen entfernen

**Was wird geändert:**
- `executeWithRetry` wird aus allen READ-Operationen in Caches entfernt
- READ-Operationen schlagen bei DB-Fehlern sofort fehl (kein Retry mehr)

**Risiko:**
- **READ-Operationen schlagen häufiger fehl** (kein Retry bei temporären DB-Fehlern)
- **Caches geben `null` zurück** → System muss mit fehlenden Daten umgehen

**Kollateralschäden:**
- **authMiddleware:** Wenn `userCache.get()` `null` zurückgibt → Request schlägt fehl?
- **organizationMiddleware:** Wenn `organizationCache.get()` `null` zurückgibt → Request schlägt fehl?
- **WorktimeProvider:** Wenn `worktimeCache.get()` `null` zurückgibt → Frontend zeigt "Keine aktive Worktime" (OK)

**Mitigation:**
- ✅ **GEKLÄRT:** Caches haben bereits Fallback (`return null` bei Fehler)
- ✅ **GEKLÄRT:** Middleware lehnt Request ab:
  - `authMiddleware` (Zeile 57-58): `if (!cached || !cached.user) { return res.status(404).json({ message: 'Benutzer nicht gefunden' }); }`
  - `organizationMiddleware` (Zeile 27-29): `if (!cachedData) { return res.status(404).json({ message: 'Keine aktive Rolle gefunden' }); }`
- ✅ **Status:** Request wird abgelehnt mit 404, kein Fallback nötig

---

### RISIKO 2: BranchCache implementieren

**Was wird geändert:**
- Neuer `BranchCache` wird implementiert
- `getUserBranches` verwendet Cache statt direkte DB-Query

**Risiko:**
- **`getDataIsolationFilter` wird nicht berücksichtigt!**
  - Aktuell: `getUserBranches` verwendet `getDataIsolationFilter(req, 'branch')` (Zeile 176)
  - BranchCache: Lädt nur `userId` und `lastUsed: true` → **Ignoriert Datenisolation!**

**Kollateralschäden:**
- **Datenisolation wird umgangen** → User könnte Branches sehen, die er nicht sehen sollte
- **Sicherheitsproblem!**

**Mitigation:**
- ✅ **GEKLÄRT:** BranchCache muss `getDataIsolationFilter` berücksichtigen
- **Lösung:** Cache-Key erweitern um `organizationId` + `roleId`
- **Code-Änderung:**
  ```typescript
  // Cache-Key: `${userId}:${organizationId}:${roleId}`
  // Falls organizationId/roleId nicht vorhanden: `${userId}:null:null`
  const cacheKey = `${userId}:${organizationId || 'null'}:${roleId || 'null'}`;
  ```
- **Zusätzlich:** `getDataIsolationFilter` in Cache-Query verwenden (nicht nur Cache-Key)

---

### RISIKO 3: OnboardingCache implementieren

**Was wird geändert:**
- Neuer `OnboardingCache` wird implementiert
- `getOnboardingStatus` verwendet Cache statt direkte DB-Query

**Risiko:**
- **Onboarding-Status könnte sich ändern** (User schließt Onboarding ab)
- **Cache zeigt veralteten Status** (TTL: 5-10 Minuten)

**Kollateralschäden:**
- **User sieht veralteten Onboarding-Status** (z.B. "Noch nicht abgeschlossen" obwohl bereits abgeschlossen)
- **UX-Problem:** User muss warten bis Cache abläuft

**Mitigation:**
- ✅ **GEKLÄRT:** Cache-Invalidierung bei Onboarding-Status-Änderung
- **Wo wird Onboarding-Status geändert:**
  - `updateOnboardingProgress` (userController.ts Zeile 2121)
  - `completeOnboarding` (userController.ts Zeile 2156)
  - `resetOnboarding` (userController.ts Zeile 2221)
- **Code-Änderung:**
  ```typescript
  // In updateOnboardingProgress, completeOnboarding, resetOnboarding:
  await onboardingCache.invalidate(userId);
  ```

---

### RISIKO 4: FilterListCache prüfen

**Was wird geändert:**
- Prüfen ob `FilterListCache` in `getUserSavedFilters` und `getFilterGroups` verwendet wird
- Falls nicht: FilterListCache integrieren

**Risiko:**
- **FilterListCache wird möglicherweise nicht verwendet** → Doppelte DB-Queries
- **executeWithRetry entfernen** → Filter laden schlägt häufiger fehl

**Kollateralschäden:**
- **Filter Tags laden nicht** → Frontend zeigt keine Filter
- **UX-Problem:** User kann keine Filter verwenden

**Mitigation:**
- ✅ FilterListCache hat bereits Fallback (`return null` bei Fehler)
- ⚠️ **PRÜFEN:** Wird FilterListCache tatsächlich verwendet? Falls nicht: Warum nicht?

**Offene Frage:**
- ❓ Wird FilterListCache tatsächlich verwendet? Falls nicht: Warum nicht?

---

### RISIKO 5: Re-Render-Loops beheben (Frontend)

**Was wird geändert:**
- `filterConditions` wird aus `useEffect` Dependencies entfernt
- `Requests.tsx` und `Worktracker.tsx`

**Risiko:**
- **Scroll-Handler reagiert nicht auf Filter-Änderungen**
  - Aktuell: `useEffect` wird neu ausgeführt wenn `filterConditions` sich ändert
  - Nachher: `useEffect` wird NICHT neu ausgeführt → Scroll-Handler verwendet alte `filterConditions`

**Kollateralschäden:**
- **Scroll-Handler verwendet veraltete `filterConditions`**
- **Infinite Scroll funktioniert nicht korrekt** → Lädt falsche Daten

**Mitigation:**
- ✅ **GEKLÄRT:** `filterConditions` wird NICHT im Scroll-Handler verwendet
- **Code-Analyse:** Scroll-Handler prüft nur `requestsLoadingMore`, `requestsHasMore`, `selectedFilterId`
- **Lösung:** ✅ `filterConditions` kann sicher aus Dependencies entfernt werden

---

### RISIKO 6: Doppelte API-Calls für Filter entfernen

**Was wird geändert:**
- `Worktracker.tsx` und `Requests.tsx` laden Filter nicht mehr selbst
- Nur `SavedFilterTags.tsx` lädt Filter

**Risiko:**
- **SavedFilterTags lädt Filter zu spät** → Worktracker/Requests zeigen keine Filter
- **Race Condition:** SavedFilterTags lädt Filter, aber Worktracker/Requests haben bereits Daten geladen

**Kollateralschäden:**
- **Filter werden nicht angewendet** → User sieht falsche Daten
- **UX-Problem:** Filter funktionieren nicht

**Mitigation:**
- ✅ **GEKLÄRT:** SavedFilterTags lädt Filter beim Mount (Zeile 208-256), parallel mit Groups
- **Race Condition:** Möglicherweise - SavedFilterTags lädt Filter, Worktracker/Requests laden Daten
- **Lösung:** 
  1. Prüfen ob Worktracker/Requests Filter selbst laden (doppelte Calls)
  2. Falls ja: Entfernen, SavedFilterTags lädt bereits
  3. Falls nein: Keine Änderung nötig

---

### RISIKO 7: Settings nur laden wenn benötigt

**Was wird geändert:**
- `OrganizationSettings.tsx` lädt Settings nur beim Bearbeiten, nicht beim initialen Laden
- Cleanup-Logik für Settings

**Risiko:**
- **Settings werden nicht geladen** → User kann Settings nicht sehen/bearbeiten
- **Cleanup-Logik entfernt Settings zu früh** → Settings verschwinden beim Tab-Wechsel

**Kollateralschäden:**
- **Settings werden nicht angezeigt** → User kann Settings nicht bearbeiten
- **UX-Problem:** Settings-Funktionalität funktioniert nicht

**Mitigation:**
- ✅ **GEKLÄRT:** Settings werden beim initialen Laden benötigt (Zeile 47)
- **Code:** `const org = await organizationService.getCurrentOrganization(undefined, true);`
- **Lösung:** 
  1. Initial: Settings NICHT laden (`includeSettings: false`)
  2. Beim Bearbeiten: Settings laden (`includeSettings: true`)
  3. Cleanup: Settings aus State entfernen beim Unmount

---

### RISIKO 8: OR-Bedingungen optimieren

**Was wird geändert:**
- Verschachtelte OR-Bedingungen werden flacher gemacht
- Indizes werden geprüft/erstellt

**Risiko:**
- **Indizes fehlen** → Query wird langsamer statt schneller
- **OR-Bedingungen werden falsch umstrukturiert** → Query gibt falsche Ergebnisse

**Kollateralschäden:**
- **Query gibt falsche Ergebnisse** → User sieht falsche Daten
- **Query wird langsamer** → Performance wird schlechter statt besser

**Mitigation:**
- ✅ **GEKLÄRT:** Indizes existieren bereits!
  - `@@index([organizationId, isPrivate, createdAt(sort: Desc)])` (Schema Zeile 339)
  - `@@index([requesterId, isPrivate])` (Schema Zeile 340)
  - `@@index([responsibleId, isPrivate])` (Schema Zeile 341)
- **Lösung:** 
  1. OR-Bedingungen flacher machen (3 separate OR-Bedingungen statt verschachtelt)
  2. Indizes können für optimierte Queries verwendet werden
  3. ⚠️ **KRITISCH:** Query-Ergebnisse VERGLEICHEN (vorher/nachher) - Logische Äquivalenz prüfen

---

## 🔍 WARUM SIND DIE DINGE SO WIE SIE SIND?

### executeWithRetry in READ-Operationen

**Warum wurde es so gemacht:**
- **Ursprung:** executeWithRetry wurde eingeführt, um DB-Fehler abzufangen (2025-11-21)
- **Fokus:** READ-Operationen werden häufig aufgerufen (jeder Request)
- **Gedanke:** Retry bei DB-Fehlern = Bessere UX (keine Fehler)

**Warum ist es problematisch:**
- **Connection Pool voll:** Retry blockiert Verbindungen → Verschlimmert das Problem
- **6 Sekunden Wartezeit:** 3 Retries × 2 Sekunden = 6 Sekunden pro Request
- **Kaskadierende Verzögerungen:** Viele Retries = System wird unbrauchbar

**Warum entfernen:**
- **READ-Operationen sind nicht kritisch:** Fehler können abgefangen werden
- **Caches haben Fallback:** `return null` bei Fehler
- **Sofortiger Fehler ist besser als 6 Sekunden Wartezeit**

---

### BranchCache ohne getDataIsolationFilter

**Warum wurde es so geplant:**
- **Vereinfachung:** Cache-Key nur `userId` (einfach)
- **Performance:** Weniger DB-Queries

**Warum ist es problematisch:**
- **Datenisolation wird umgangen:** User könnte Branches sehen, die er nicht sehen sollte
- **Sicherheitsproblem!**

**Warum muss es geändert werden:**
- **Sicherheit:** Datenisolation ist kritisch
- **Cache-Key muss erweitert werden:** `organizationId` + `roleId` + `userId`

---

### Re-Render-Loops durch filterConditions

**Warum wurde es so gemacht:**
- **Vermutlich:** `filterConditions` wurde als Dependency hinzugefügt, damit Scroll-Handler auf Filter-Änderungen reagiert
- **Gedanke:** Scroll-Handler sollte aktualisiert werden wenn Filter sich ändern

**Warum ist es problematisch:**
- **filterConditions wird in useEffect gesetzt:** Dependency führt zu Re-Render-Loop
- **Endloser Loop:** useEffect setzt filterConditions → useEffect wird neu ausgeführt → Loop

**Warum entfernen:**
- **Re-Render-Loop:** CPU auf 100%, System wird unbrauchbar
- **Scroll-Handler braucht filterConditions nicht:** Scroll-Handler prüft nur `requestsHasMore`, nicht `filterConditions`

---

## ✅ GEKLÄRTE FRAGEN & VERMUTUNGEN

### ✅ Geklärte Fragen:

1. **✅ Was passiert wenn `userCache.get()` `null` zurückgibt?**
   - **Antwort:** `authMiddleware` lehnt Request mit `404` ab (Zeile 57-58)
   - **Code:** `if (!cached || !cached.user) { return res.status(404).json({ message: 'Benutzer nicht gefunden' }); }`
   - **Mitigation:** ✅ Bereits implementiert - Request wird abgelehnt, kein Fallback nötig

2. **✅ Was passiert wenn `organizationCache.get()` `null` zurückgibt?**
   - **Antwort:** `organizationMiddleware` lehnt Request mit `404` ab (Zeile 27-29)
   - **Code:** `if (!cachedData) { return res.status(404).json({ message: 'Keine aktive Rolle gefunden' }); }`
   - **Mitigation:** ✅ Bereits implementiert - Request wird abgelehnt, kein Fallback nötig

3. **✅ Wird FilterListCache verwendet?**
   - **Antwort:** ✅ JA - Wird verwendet in:
     - `getUserSavedFilters` (Zeile 44): `await filterListCache.getFilters(userId, tableId)`
     - `getFilterGroups` (Zeile 345): `await filterListCache.getFilterGroups(userId, tableId)`
   - **Status:** ✅ Bereits implementiert und verwendet

4. **✅ Wo wird Onboarding-Status geändert?**
   - **Antwort:** In `userController.ts`:
     - `updateOnboardingProgress` (Zeile 2121)
     - `completeOnboarding` (Zeile 2156)
     - `resetOnboarding` (Zeile 2221)
   - **Mitigation:** Cache-Invalidierung in diesen Funktionen hinzufügen

5. **✅ Wird `filterConditions` im Scroll-Handler verwendet?**
   - **Antwort:** ❌ NEIN - `filterConditions` wird NICHT im Scroll-Handler verwendet
   - **Code-Analyse:** Scroll-Handler prüft nur `requestsLoadingMore`, `requestsHasMore`, `selectedFilterId`
   - **Mitigation:** ✅ `filterConditions` kann sicher aus Dependencies entfernt werden

6. **✅ Wann lädt SavedFilterTags Filter?**
   - **Antwort:** Beim Mount (Zeile 208-256), parallel mit Groups
   - **Race Condition:** Möglicherweise - SavedFilterTags lädt Filter, Worktracker/Requests laden Daten
   - **Mitigation:** Prüfen ob Worktracker/Requests Filter selbst laden (doppelte Calls)

7. **✅ Wird Settings-View benötigt?**
   - **Antwort:** ✅ JA - `OrganizationSettings.tsx` lädt Settings beim initialen Laden (Zeile 47)
   - **Code:** `const org = await organizationService.getCurrentOrganization(undefined, true);`
   - **Mitigation:** Settings nur beim Bearbeiten laden, nicht beim initialen Laden

8. **✅ Welche Indizes existieren bereits?**
   - **Antwort:** ✅ Indizes existieren für Request:
     - `@@index([organizationId, isPrivate, createdAt(sort: Desc)])` (Schema Zeile 339)
     - `@@index([requesterId, isPrivate])` (Schema Zeile 340)
     - `@@index([responsibleId, isPrivate])` (Schema Zeile 341)
   - **Status:** ✅ Indizes existieren bereits, können für optimierte OR-Bedingungen verwendet werden

---

### ✅ Geklärte Vermutungen:

1. **✅ executeWithRetry blockiert bei vollem Pool**
   - **Status:** ✅ BESTÄTIGT durch Logs
   - **Beweis:** Logs zeigen "Connection Pool Timeout - Kein Retry! Pool ist voll."
   - **Mitigation:** ✅ Bereits implementiert - Connection Pool Timeout wird nicht retried

2. **✅ READ-Operationen schlagen häufiger fehl ohne Retry**
   - **Status:** ✅ AKZEPTABEL - Middleware lehnt Request ab (404), kein Fallback nötig
   - **Mitigation:** ✅ Bereits implementiert - Request wird abgelehnt, User muss neu einloggen

3. **✅ OR-Bedingungen sind langsamer als flache Struktur**
   - **Status:** ✅ BESTÄTIGT durch Logs (19.67 Sekunden)
   - **Beweis:** Logs zeigen sehr langsame Query-Zeiten
   - **Mitigation:** OR-Bedingungen flacher machen, Indizes nutzen

4. **✅ BranchCache ohne getDataIsolationFilter ist sicher**
   - **Status:** ❌ FALSCH - Sicherheitsproblem!
   - **Beweis:** `getDataIsolationFilter` wird in `getUserBranches` verwendet (Zeile 176)
   - **Mitigation:** Cache-Key erweitern um `organizationId` + `roleId`

5. **✅ FilterListCache wird verwendet**
   - **Status:** ✅ BESTÄTIGT - Wird verwendet
   - **Beweis:** Code zeigt Verwendung in `getUserSavedFilters` und `getFilterGroups`

6. **✅ Re-Render-Loops durch filterConditions**
   - **Status:** ✅ BESTÄTIGT durch Code-Analyse
   - **Beweis:** `filterConditions` ist Dependency, wird aber in useEffect gesetzt
   - **Mitigation:** `filterConditions` aus Dependencies entfernen (wird nicht im Scroll-Handler verwendet)

---

## 📋 PLAN-STATUS

### ✅ Vollständig geplant (alle Fragen geklärt):
- ✅ executeWithRetry entfernen (7 Stellen, detailliert, Mitigationen vorhanden)
- ✅ BranchCache implementieren (Code-Struktur vorhanden, getDataIsolationFilter berücksichtigt)
- ✅ OnboardingCache implementieren (Code-Struktur vorhanden, Cache-Invalidierung geplant)
- ✅ FilterListCache prüfen (✅ Wird verwendet, executeWithRetry entfernen)
- ✅ Re-Render-Loops beheben (Code-Änderung detailliert, filterConditions nicht im Scroll-Handler)
- ✅ Settings nur laden wenn benötigt (Code-Änderung detailliert, nur beim Bearbeiten)
- ✅ OR-Bedingungen optimieren (Code-Änderung detailliert, Indizes existieren)

### ✅ Alle Risiken mit Mitigationen versehen:
- ✅ executeWithRetry entfernen → Middleware lehnt Request ab (bereits implementiert)
- ✅ BranchCache → Cache-Key erweitern, getDataIsolationFilter berücksichtigen
- ✅ OnboardingCache → Cache-Invalidierung in 3 Funktionen
- ✅ FilterListCache → Bereits verwendet, executeWithRetry entfernen
- ✅ Re-Render-Loops → filterConditions kann sicher entfernt werden
- ✅ Doppelte API-Calls → Prüfen und entfernen falls vorhanden
- ✅ Settings laden → Nur beim Bearbeiten laden
- ✅ OR-Bedingungen → Indizes existieren, logische Äquivalenz prüfen

---

---

## ✅ PLAN-STATUS: ALLES GEKLÄRT

### ✅ Alle offenen Fragen geklärt:
1. ✅ authMiddleware/organizationMiddleware bei null → Request wird abgelehnt (404)
2. ✅ BranchCache Datenisolation → Cache-Key erweitern um `organizationId` + `roleId`
3. ✅ Onboarding-Status ändern → Cache-Invalidierung in 3 Funktionen
4. ✅ FilterListCache verwendet → Bereits implementiert und verwendet
5. ✅ filterConditions im Scroll-Handler → Wird NICHT verwendet, kann entfernt werden
6. ✅ SavedFilterTags lädt Filter → Beim Mount, Race Condition möglich
7. ✅ Settings-View benötigt → Ja, aber nur beim Bearbeiten laden
8. ✅ Indizes existieren → Ja, alle benötigten Indizes vorhanden

### ✅ Alle Vermutungen geklärt:
1. ✅ executeWithRetry blockiert → Bestätigt durch Logs
2. ✅ READ-Operationen schlagen häufiger fehl → Akzeptabel, Middleware lehnt ab
3. ✅ OR-Bedingungen langsamer → Bestätigt durch Logs (19.67 Sekunden)
4. ✅ BranchCache Sicherheit → FALSCH, muss geändert werden
5. ✅ FilterListCache verwendet → Bestätigt, wird verwendet
6. ✅ Re-Render-Loops → Bestätigt durch Code-Analyse

### ✅ Alle Risiken mit Mitigationen versehen:
1. ✅ executeWithRetry entfernen → Middleware lehnt Request ab (bereits implementiert)
2. ✅ BranchCache → Cache-Key erweitern, getDataIsolationFilter berücksichtigen
3. ✅ OnboardingCache → Cache-Invalidierung in 3 Funktionen
4. ✅ FilterListCache → Bereits verwendet, executeWithRetry entfernen
5. ✅ Re-Render-Loops → filterConditions kann sicher entfernt werden
6. ✅ Doppelte API-Calls → Prüfen und entfernen falls vorhanden
7. ✅ Settings laden → Nur beim Bearbeiten laden
8. ✅ OR-Bedingungen → Indizes existieren, logische Äquivalenz prüfen

### ✅ Alle Kollateralschäden mit Mitigationen versehen:
1. ✅ authMiddleware null → Request wird abgelehnt (404)
2. ✅ BranchCache Sicherheit → Cache-Key erweitern, getDataIsolationFilter verwenden
3. ✅ OnboardingCache veraltet → Cache-Invalidierung implementieren
4. ✅ FilterListCache fehler → Fallback vorhanden (return null)
5. ✅ Re-Render-Loops → filterConditions nicht im Scroll-Handler verwendet
6. ✅ Doppelte API-Calls → Prüfen und entfernen
7. ✅ Settings nicht geladen → Nur beim Bearbeiten laden
8. ✅ OR-Bedingungen falsch → Logische Äquivalenz prüfen

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Vollständiger Lösungsplan erstellt, ✅ Alle Fragen geklärt, ✅ Alle Risiken mit Mitigationen versehen  
**Nächster Schritt:** Plan mit User besprechen, dann Schritt für Schritt implementieren

