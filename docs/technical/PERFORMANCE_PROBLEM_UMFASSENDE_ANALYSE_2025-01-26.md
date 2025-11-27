# Performance-Problem: Umfassende Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Vollständige Analyse, NICHTS geändert  
**Zweck:** Alle Performance-Probleme identifizieren und dokumentieren

---

## 📋 USER-FEEDBACK

1. **Nach Login:** 20-30 Sekunden Ladeanzeige
2. **Organisation-Tab:** 4-5 Minuten für einen einzigen Eintrag, 3GB RAM
3. **Branches/Filter Tags:** Sehr langsam (besonders Filter Tags)
4. **Nach Seitenwechseln:** Wird nach ein paar Klicks unbenutzbar langsam
5. **Teilweise schnell:** Manchmal sehr schnell, dann wieder extrem langsam

---

## 🔍 PROBLEM 1: LOGIN-FLOW (20-30 SEKUNDEN)

### Was passiert nach Login?

**Frontend:** `frontend/src/pages/Login.tsx:40`
```typescript
await login(formData.username, formData.password);
// Navigation wird im useEffect behandelt, sobald user state aktualisiert ist
```

**Flow:**
1. **Login-Request** → `/auth/login`
2. **Navigation** → `/dashboard` (wenn user state aktualisiert)
3. **Context-Provider initialisieren** → 5+ parallele API-Calls

### 5+ Parallele API-Calls beim initialen Laden

**Quelle:** `docs/technical/PERFORMANCE_ANALYSE_INITIALES_LADEN_2025-01-22.md`

**1. AuthProvider** (`frontend/src/hooks/useAuth.tsx:72`)
- **API:** `/users/profile`
- **Backend:** `backend/src/controllers/userController.ts:213-316`
- **DB-Query:** `prisma.user.findUnique` mit Roles, Permissions, Settings, identificationDocuments
- **Middleware:** `authMiddleware` (UserCache) + `organizationMiddleware` (OrganizationCache)
- **Zeit:** 0.15-0.6s (geschätzt)

**2. WorktimeProvider** (`frontend/src/contexts/WorktimeContext.tsx:47-57`)
- **API:** `/api/worktime/active`
- **Backend:** `backend/src/controllers/worktimeController.ts`
- **DB-Query:** `prisma.workTime.findFirst` (aktive Worktime)
- **Middleware:** `authMiddleware` + `organizationMiddleware`
- **Cache:** ✅ WorktimeCache (5s TTL)
- **Zeit:** 0.01-0.2s (geschätzt)

**3. OrganizationProvider** (`frontend/src/contexts/OrganizationContext.tsx:51-58`)
- **API:** `/api/organizations/current`
- **Backend:** `backend/src/controllers/organizationController.ts:739`
- **DB-Query:** `organizationCache.get()` → `prisma.userRole.findFirst` + `prisma.usersBranches.findFirst`
- **Middleware:** `authMiddleware` + `organizationMiddleware`
- **Cache:** ✅ OrganizationCache (10 Min TTL)
- **Zeit:** 0.01-0.05s (geschätzt)

**4. BranchProvider** (`frontend/src/contexts/BranchContext.tsx:80-84`)
- **API:** `/api/branches/user`
- **Backend:** `backend/src/controllers/branchController.ts:167-214`
- **DB-Query:** `prisma.usersBranches.findMany` mit `getDataIsolationFilter`
- **Middleware:** `authMiddleware` + `organizationMiddleware`
- **Cache:** ❌ **KEIN CACHING!**
- **Zeit:** 0.1-0.3s (geschätzt)

**5. OnboardingContext** (`frontend/src/contexts/OnboardingContext.tsx:275`)
- **API:** `/api/users/onboarding/status`
- **Backend:** `backend/src/controllers/userController.ts`
- **DB-Query:** Onboarding-Status
- **Middleware:** `authMiddleware` + `organizationMiddleware`
- **Cache:** ❌ **KEIN CACHING!**
- **Zeit:** 0.05-0.2s (geschätzt)

**Gesamt-Zeit (geschätzt):** 0.32-1.35s (wenn alle parallel laufen)

**ABER:** User berichtet 20-30 Sekunden!

### Mögliche Ursachen für 20-30 Sekunden:

1. **Connection Pool ist voll**
   - Alle 5 Requests benötigen DB-Verbindungen
   - Wenn Pool voll ist, warten Requests
   - `executeWithRetry` macht Retries → Mehr Wartezeit

2. **executeWithRetry blockiert**
   - `organizationCache.get()` verwendet `executeWithRetry` (Zeile 30, 70)
   - Wenn Connection Pool voll ist, blockiert jeder Retry
   - 3 Retries × 2 Sekunden = 6 Sekunden pro Request

3. **Sequenzielle Abhängigkeiten**
   - BranchProvider wartet auf User (Zeile 80: `if (!isLoading && user)`)
   - OnboardingContext wartet möglicherweise auf andere Contexts
   - **Summiert sich zu 20-30 Sekunden**

4. **Doppelte Middleware-Calls**
   - Jeder Request durchläuft `authMiddleware` + `organizationMiddleware`
   - `authMiddleware` → `userCache.get()` (kann DB-Query machen)
   - `organizationMiddleware` → `organizationCache.get()` (kann DB-Query machen)
   - **Bei 5 Requests = 10 Middleware-Calls**

---

## 🔍 PROBLEM 2: ORGANISATION-TAB (4-5 MINUTEN, 3GB RAM)

### Was passiert beim Öffnen des Organisation-Tabs?

**Frontend:** `frontend/src/components/organization/OrganizationSettings.tsx:47`
```typescript
const org = await organizationService.getCurrentOrganization(undefined, true);
```

**Backend:** `backend/src/controllers/organizationController.ts:766`
```typescript
if (includeSettings && organization) {
  const orgWithSettings = await executeWithRetry(() =>
    prisma.organization.findUnique({
      where: { id: organization.id },
      select: {
        // ...
        settings: true // Settings nur wenn explizit angefragt
      }
    })
  );
}
```

### Identifizierte Probleme:

**1. executeWithRetry blockiert bei vollem Connection Pool**
- **Zeile 766:** `executeWithRetry(() => prisma.organization.findUnique(...))`
- **Problem:** Wenn Connection Pool voll ist, blockiert jeder Retry
- **Zeit:** 3 Retries × 2 Sekunden = 6 Sekunden + Query-Zeit

**2. organizationCache.get() verwendet executeWithRetry**
- **Zeile 30, 70:** `executeWithRetry(() => prisma.userRole.findFirst(...))`
- **Problem:** Blockiert auch bei vollem Pool
- **Zeit:** 6 Sekunden + Query-Zeit

**3. Settings werden geladen (19.8 MB laut Kommentar)**
- **Zeile 47:** `getCurrentOrganization(undefined, true)` → `includeSettings: true`
- **Problem:** Settings können 19.8 MB groß sein
- **Impact:** 3GB RAM-Verbrauch (kumulativ bei mehreren Aufrufen)

**4. Doppeltes Laden: OrganizationContext + OrganizationSettings**
- **OrganizationContext:** Lädt Organisation ohne Settings (beim App-Start)
- **OrganizationSettings:** Lädt Organisation mit Settings (beim Tab-Öffnen)
- **Problem:** 2 separate API-Calls für dieselben Daten

**5. Keine Cleanup-Logik für große Datenstrukturen**
- **Zeile 28:** `const [organization, setOrganization] = useState<Organization | null>(null);`
- **Problem:** Settings bleiben im State, auch wenn Tab gewechselt wird
- **Impact:** Kumulativer Memory-Verbrauch

### Warum 4-5 Minuten?

**Mögliche Ursachen:**
1. **Connection Pool ist voll** → Requests warten
2. **executeWithRetry macht Retries** → 6 Sekunden pro Retry
3. **Settings-Query dauert lange** → 19.8 MB laden
4. **Kombination aller Faktoren** → 4-5 Minuten

---

## 🔍 PROBLEM 3: BRANCHES/FILTER TAGS (SEHR LANGSAM)

### Branches laden

**Frontend:** `frontend/src/contexts/BranchContext.tsx:80-84`
```typescript
useEffect(() => {
  if (!isLoading && user) {
    loadBranches();
  }
}, [isLoading, user]);
```

**Backend:** `backend/src/controllers/branchController.ts:167-214`
```typescript
const userBranches = await prisma.usersBranches.findMany({
  where: {
    userId: userId,
    branch: branchFilter  // ← Komplexer Filter mit getDataIsolationFilter
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
```

**Probleme:**
1. **❌ KEIN CACHING!** → Jeder Request macht DB-Query
2. **Komplexer Filter** mit `getDataIsolationFilter` (kann langsam sein)
3. **Keine executeWithRetry** → Aber wenn Connection Pool voll ist, blockiert trotzdem

### Filter Tags laden

**Frontend:** `frontend/src/components/SavedFilterTags.tsx:208-250`
```typescript
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    
    // Lade Filter und Gruppen parallel
    const [filtersResponse, groupsResponse] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
    ]);
    
    setSavedFilters(filters);
    setFilterGroups(groups);
  };
  
  fetchData();
}, [tableId]);
```

**Backend-Endpoints:**

**1. getUserSavedFilters** (`backend/src/controllers/savedFilterController.ts:27-101`)
- **DB-Query:** `prisma.savedFilter.findMany({ where: { userId, tableId } })`
- **Cache:** ❌ **KEIN CACHING!** (FilterListCache wurde implementiert, aber möglicherweise nicht verwendet)
- **JSON-Parsing:** Parst `conditions`, `operators`, `sortDirections` bei jedem Request

**2. getFilterGroups** (`backend/src/controllers/savedFilterController.ts:348-412`)
- **DB-Query:** `prisma.filterGroup.findMany({ where: { userId, tableId }, include: { filters } })`
- **Cache:** ❌ **KEIN CACHING!** (FilterListCache wurde implementiert, aber möglicherweise nicht verwendet)
- **JSON-Parsing:** Parst `conditions`, `operators`, `sortDirections` für jeden Filter bei jedem Request

**Probleme:**
1. **❌ KEIN CACHING!** → 2 DB-Queries bei jedem Seitenaufruf
2. **Doppelte Requests:** `Worktracker.tsx` lädt Filter auch selbst (Zeile 919)
3. **JSON-Parsing** bei jedem Request (kann bei vielen Filtern langsam sein)
4. **Keine executeWithRetry** → Aber wenn Connection Pool voll ist, blockiert trotzdem

**Impact:**
- **3-6 Sekunden** nur für FilterTags beim Seitenaufruf
- **Doppelte DB-Queries** für Filter

---

## 🔍 PROBLEM 4: NACH SEITENWECHSELN (WIRD LANGSAM)

### Was passiert bei Seitenwechseln?

**Quelle:** `docs/technical/PERFORMANCE_PROBLEM_SYSTEMWEIT_KRITISCH_2025-01-26.md`

**Identifizierte Probleme:**

**1. Re-Render-Loops durch useEffect-Abhängigkeiten**
- **Datei:** `frontend/src/components/Requests.tsx:582, 611`
- **Problem:** `filterConditions` ist Dependency in `useEffect`, wird aber in `useEffect` gesetzt
- **Impact:** Endloser Re-Render-Loop → CPU auf 100%, PC läuft heiß, 800MB RAM

**2. Doppelte API-Calls**
- **Worktracker.tsx:** Lädt Filter selbst (Zeile 919)
- **SavedFilterTags.tsx:** Lädt Filter auch (Zeile 208)
- **Impact:** Doppelte DB-Queries

**3. Zu viele useEffect/useState/useMemo/useCallback**
- **Requests.tsx:** **35** useEffect/useState/useMemo/useCallback
- **Worktracker.tsx:** **95** useEffect/useState/useMemo/useCallback
- **Impact:** Hoher Memory-Verbrauch, viele Re-Renders

**4. Keine Cleanup-Funktionen**
- **Datei:** `frontend/src/components/Requests.tsx:582`
- **Problem:** Event-Listener werden nicht entfernt → Memory Leak
- **Impact:** Viele Event-Listener im Memory

**5. Connection Pool wird voll**
- **Nach mehreren Seitenwechseln:** Viele Requests → Pool wird voll
- **Impact:** Neue Requests müssen warten → System wird langsam

---

## 🔍 PROBLEM 5: CONNECTION POOL IST VOLL

### Warum ist Connection Pool voll bei nur 1 Benutzer?

**Quelle:** `docs/technical/CONNECTION_POOL_VOLL_EINZELNER_BENUTZER_2025-01-26.md`

**Tatsache:**
- **1 Seitenaufruf** = 8-12 parallele API-Requests
- **Jeder Request** benötigt 1-3 DB-Verbindungen
- **Gesamt:** 8-36 Verbindungen pro Seitenaufruf
- **Connection Pool:** 100 Verbindungen (konfiguriert)
- **Problem:** Bei mehreren Seitenwechseln wird Pool voll

**Beispiel: Worktracker-Seite beim Öffnen:**
1. AuthProvider → `/users/profile` (0-2 Verbindungen)
2. WorktimeProvider → `/api/worktime/active` (0-1 Verbindungen)
3. OrganizationProvider → `/api/organizations/current` (0-1 Verbindungen)
4. BranchProvider → `/api/branches/user` (1 Verbindung)
5. OnboardingContext → `/api/users/onboarding/status` (1 Verbindung)
6. Worktracker → `/saved-filters/worktracker-todos` (1 Verbindung)
7. Worktracker → `/api/tasks?filterId=X` (1-3 Verbindungen)
8. SavedFilterTags → `/saved-filters/{tableId}` (1 Verbindung)
9. SavedFilterTags → `/saved-filters/groups/{tableId}` (1 Verbindung)

**Gesamt:** 5-12 Verbindungen pro Seitenaufruf

**Bei 3 Seitenwechseln:** 15-36 Verbindungen
**Bei 10 Seitenwechseln:** 50-120 Verbindungen → **Pool ist voll!**

### executeWithRetry verschlimmert das Problem

**Problem:**
- `executeWithRetry` macht Retries bei DB-Fehler
- Wenn Connection Pool voll ist, blockiert jeder Retry
- **3 Retries × 2 Sekunden = 6 Sekunden** pro Request
- **Mehr Retries = Mehr Requests = Pool wird voller**

---

## 📊 ZUSAMMENFASSUNG ALLER PROBLEME

### Backend-Probleme:

1. **❌ Connection Pool ist voll** (100/100 bei nur 1 Benutzer)
2. **❌ executeWithRetry blockiert** bei vollem Pool
3. **❌ Kein Caching für Branches** (`/api/branches/user`)
4. **❌ Kein Caching für Onboarding-Status** (`/api/users/onboarding/status`)
5. **❌ FilterListCache möglicherweise nicht verwendet** (Filter Tags)
6. **❌ Settings werden immer geladen** (19.8 MB, Organisation-Tab)
7. **❌ Doppelte API-Calls** (OrganizationContext + OrganizationSettings)

### Frontend-Probleme:

1. **❌ Re-Render-Loops** durch `filterConditions` Dependency
2. **❌ Doppelte API-Calls** für Filter (Worktracker + SavedFilterTags)
3. **❌ Zu viele useEffect/useState/useMemo/useCallback** (35-95 pro Komponente)
4. **❌ Keine Cleanup-Funktionen** (Event-Listener, Memory Leaks)
5. **❌ Settings bleiben im State** (3GB RAM, Organisation-Tab)

### Systemweite Probleme:

1. **❌ 5+ parallele API-Calls** beim initialen Laden
2. **❌ Jeder Request durchläuft Middleware** (authMiddleware + organizationMiddleware)
3. **❌ Connection Pool wird nach mehreren Seitenwechseln voll**
4. **❌ executeWithRetry verschlimmert Pool-Exhaustion**

---

## 🔴 ROOT CAUSE HYPOTHESE

**Hauptproblem:** Connection Pool Exhaustion

**Warum:**
1. **Viele parallele Requests** pro Seitenaufruf (8-12)
2. **executeWithRetry blockiert** Verbindungen bei Retries
3. **Nach mehreren Seitenwechseln** wird Pool voll
4. **Neue Requests warten** → System wird langsam

**Sekundäre Probleme:**
1. **Kein Caching** für Branches, Onboarding-Status
2. **Re-Render-Loops** im Frontend
3. **Memory Leaks** (Settings, Event-Listener)
4. **Doppelte API-Calls**

---

## ⚠️ WICHTIG: NUR ANALYSE - NICHTS GEÄNDERT

**Status:** Analyse abgeschlossen  
**Nächster Schritt:** Lösungen vorschlagen basierend auf dieser Analyse

**Regel:** "2 x messen, 1 x schneiden!"

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Vollständige Analyse abgeschlossen  
**Nächster Schritt:** Lösungen vorschlagen

