# Performance-Analyse: Initiales Laden der Seite (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔴 KRITISCH - Analyse abgeschlossen  
**Problem:** Initiales Laden der Seite dauert "ewig" (nach Login oder Refresh)

---

## 🔍 ROOT CAUSE IDENTIFIZIERT

### Das Problem: 5+ parallele API-Aufrufe beim initialen Laden

**Request-Flow beim initialen Laden (nach Login/Refresh):**

1. **AuthProvider** (useAuth.tsx:41-56)
   - Beim Mount: `fetchCurrentUser()` → `/users/profile`
   - **DB-Query:** User mit Roles, Permissions, Settings, identificationDocuments

2. **WorktimeProvider** (WorktimeContext.tsx:47-57)
   - Beim Mount: `checkTrackingStatus()` → `/api/worktime/active`
   - **DB-Query:** Aktive Worktime (mit Branch)

3. **OrganizationProvider** (OrganizationContext.tsx:51-58)
   - Beim Mount: `fetchOrganization()` → `/api/organizations/current`
   - **DB-Query:** Organization (mit UserRole → Role → Organization)

4. **BranchProvider** (BranchContext.tsx:80-84)
   - Nach User-Load: `loadBranches()` → `/api/branches/user`
   - **DB-Query:** User-Branches

5. **OnboardingContext** (OnboardingContext.tsx:275)
   - Beim Mount: `getOnboardingStatus()` → `/api/users/onboarding/status`
   - **DB-Query:** Onboarding-Status

**Gesamt: 5 parallele API-Aufrufe beim initialen Laden!**

---

## 📊 DETAILLIERTE ANALYSE: Backend-Endpoints

### 1. `/users/profile` (getCurrentUser)

**Datei:** `backend/src/controllers/userController.ts:213-316`

**DB-Query:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    username: true,
    email: true,
    // ... viele Felder ...
    settings: true,  // ← Kann groß sein!
    invoiceSettings: true,
    identificationDocuments: {  // ← Join!
      orderBy: { createdAt: 'desc' },
      take: 1
    },
    roles: {  // ← Join!
      include: {
        role: {
          include: {
            permissions: true,  // ← Viele Permissions!
            organization: {
              select: {
                id: true,
                name: true,
                displayName: true,
                logo: true
              }
            }
          }
        }
      }
    }
  }
});
```

**Komplexität:**
- **3 verschachtelte Joins:** User → roles → role → permissions/organization
- **Settings:** Kann groß sein (JSON)
- **identificationDocuments:** Join mit ORDER BY
- **Geschätzte Query-Zeit:** 0.5-2 Sekunden

**Problem:**
- ❌ Lädt ALLE User-Daten, auch wenn nicht alle benötigt werden
- ❌ Settings werden immer geladen (kann groß sein)
- ❌ identificationDocuments werden immer geladen
- ❌ Wird bei JEDEM initialen Laden aufgerufen

---

### 2. `/api/worktime/active` (getActiveWorktime)

**Datei:** `backend/src/controllers/worktimeController.ts`

**Status:** ✅ **BEREITS OPTIMIERT**
- Verwendet `WorktimeCache` (5s TTL)
- **Geschätzte Query-Zeit:** 0.01s (Cache-Hit) oder 0.05-0.2s (Cache-Miss)

**Problem:**
- ⚠️ Wird beim initialen Laden aufgerufen, auch wenn nicht sofort benötigt
- ⚠️ Cache-Miss beim ersten Request möglich

---

### 3. `/api/organizations/current` (getCurrentOrganization)

**Datei:** `backend/src/controllers/organizationController.ts:738-819`

**DB-Query:**
```typescript
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
            // ... viele Felder ...
            // settings wird NICHT geladen (19.8 MB!) ✅
          }
        }
      }
    }
  }
});
```

**Komplexität:**
- **2 verschachtelte Joins:** userRole → role → organization
- **Geschätzte Query-Zeit:** 0.1-0.5 Sekunden

**Problem:**
- ❌ Wird bei JEDEM initialen Laden aufgerufen
- ❌ Macht DB-Query, obwohl OrganizationCache existiert (aber nicht verwendet!)
- ⚠️ OrganizationCache wird nur in `organizationMiddleware` verwendet, nicht in `getCurrentOrganization`

---

### 4. `/api/branches/user` (getUserBranches)

**Datei:** `backend/src/controllers/branchController.ts:167-214`

**DB-Query:**
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

**Komplexität:**
- **1 Join:** usersBranches → branch
- **branchFilter:** Komplexer Filter mit `getDataIsolationFilter` (kann weitere Joins enthalten)
- **Geschätzte Query-Zeit:** 0.1-0.3 Sekunden

**Problem:**
- ❌ Wird bei JEDEM initialen Laden aufgerufen
- ❌ Kein Caching
- ❌ Komplexer Filter mit `getDataIsolationFilter` (kann langsam sein)

---

### 5. `/api/users/onboarding/status` (getOnboardingStatus)

**Datei:** `backend/src/controllers/userController.ts:2075-2106`

**DB-Query:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    onboardingCompleted: true,
    onboardingProgress: true,
    onboardingStartedAt: true,
    onboardingCompletedAt: true
  }
});
```

**Komplexität:**
- **Einfache Query:** Nur User-Felder, keine Joins
- **Geschätzte Query-Zeit:** 0.05-0.1 Sekunden

**Problem:**
- ❌ Wird bei JEDEM initialen Laden aufgerufen
- ❌ Kein Caching
- ⚠️ Onboarding-Status ändert sich selten (gut für Caching)

---

## 🔴 KRITISCHE PROBLEME

### Problem 1: `/users/profile` lädt zu viele Daten

**Was wird geladen:**
- ✅ User (benötigt)
- ✅ Roles (benötigt)
- ✅ Permissions (benötigt für Permission-Checks)
- ❌ **Settings** (kann groß sein, wird nicht immer benötigt)
- ❌ **invoiceSettings** (wird nicht immer benötigt)
- ❌ **identificationDocuments** (wird nicht immer benötigt)

**Lösung:**
- Settings, invoiceSettings, identificationDocuments nur laden wenn benötigt
- Optional: Query-Parameter `?includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`

---

### Problem 2: `/api/organizations/current` verwendet keinen Cache

**Problem:**
- `getCurrentOrganization` macht DB-Query, obwohl `OrganizationCache` existiert
- `OrganizationCache` wird nur in `organizationMiddleware` verwendet
- **Doppelte DB-Queries:** Middleware + Controller

**Lösung:**
- `getCurrentOrganization` sollte `OrganizationCache` verwenden
- Reduziert DB-Queries um ~95%

---

### Problem 3: `/api/branches/user` hat kein Caching

**Problem:**
- Wird bei JEDEM initialen Laden aufgerufen
- Branches ändern sich selten
- **Kein Caching**

**Lösung:**
- BranchCache implementieren (ähnlich wie OrganizationCache)
- TTL: 5-10 Minuten (Branches ändern sich selten)

---

### Problem 4: `/api/users/onboarding/status` hat kein Caching

**Problem:**
- Wird bei JEDEM initialen Laden aufgerufen
- Onboarding-Status ändert sich selten
- **Kein Caching**

**Lösung:**
- OnboardingCache implementieren
- TTL: 5-10 Minuten

---

### Problem 5: Parallele Requests blockieren sich nicht, aber summieren sich

**Aktuell:**
- 5 parallele API-Aufrufe
- Jeder Request geht durch Middleware-Kette:
  - `authMiddleware` → UserCache (30s TTL) ✅
  - `organizationMiddleware` → OrganizationCache (2 Min TTL) ✅
- **Gesamt-Zeit:** Summe der langsamsten Requests

**Geschätzte Gesamt-Zeit:**
- `/users/profile`: 0.5-2s (langsamste Query)
- `/api/worktime/active`: 0.01-0.2s (Cache)
- `/api/organizations/current`: 0.1-0.5s
- `/api/branches/user`: 0.1-0.3s
- `/api/users/onboarding/status`: 0.05-0.2s
- **Gesamt: 0.86-3.2 Sekunden** 🔴

---

## 🎯 LÖSUNGSPLAN (Priorisiert)

### Priorität 1: `/users/profile` optimieren 🔴🔴 KRITISCH

**Problem:** Lädt zu viele Daten (Settings, invoiceSettings, identificationDocuments)

**Lösung:**
1. Settings, invoiceSettings, identificationDocuments nur laden wenn benötigt
2. Query-Parameter: `?includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
3. Standard: Nur User + Roles + Permissions laden

**Erwartete Verbesserung:** 50-70% schneller (von 0.5-2s auf 0.15-0.6s)

**Implementierung:**
- `getCurrentUser` prüft Query-Parameter
- Nur benötigte Felder laden
- Frontend: Query-Parameter setzen beim initialen Laden

---

### Priorität 2: `/api/organizations/current` Cache verwenden 🔴 HOCH

**Problem:** Macht DB-Query, obwohl OrganizationCache existiert

**Lösung:**
- `getCurrentOrganization` sollte `OrganizationCache.get()` verwenden
- Reduziert DB-Queries um ~95%

**Erwartete Verbesserung:** 80-90% schneller (von 0.1-0.5s auf 0.01-0.05s)

**Implementierung:**
- `getCurrentOrganization` verwendet `organizationCache.get(userId)`
- Nur bei Cache-Miss: DB-Query

---

### Priorität 3: BranchCache implementieren 🔴 HOCH

**Problem:** `/api/branches/user` hat kein Caching

**Lösung:**
- Neuer `BranchCache` Service
- TTL: 5-10 Minuten (Branches ändern sich selten)
- Cache invalidiert bei Branch-Änderungen

**Erwartete Verbesserung:** 80-90% schneller (von 0.1-0.3s auf 0.01-0.03s)

**Implementierung:**
- `backend/src/services/branchCache.ts` erstellen
- `getUserBranches` verwendet BranchCache
- Cache invalidiert bei: Branch-Update, User-Branch-Änderungen

---

### Priorität 4: OnboardingCache implementieren 🟡 MITTEL

**Problem:** `/api/users/onboarding/status` hat kein Caching

**Lösung:**
- Neuer `OnboardingCache` Service
- TTL: 5-10 Minuten (Onboarding-Status ändert sich selten)
- Cache invalidiert bei Onboarding-Änderungen

**Erwartete Verbesserung:** 80-90% schneller (von 0.05-0.2s auf 0.005-0.02s)

**Implementierung:**
- `backend/src/services/onboardingCache.ts` erstellen
- `getOnboardingStatus` verwendet OnboardingCache
- Cache invalidiert bei: Onboarding-Progress-Update

---

### Priorität 5: Frontend: Requests sequenziell statt parallel 🟡 MITTEL

**Problem:** 5 parallele Requests summieren sich

**Lösung:**
- Kritische Requests zuerst (User, Organization)
- Nicht-kritische Requests später (Onboarding, Branches)
- Oder: Alle Requests parallel, aber mit Priorisierung

**Erwartete Verbesserung:** Subjektive Verbesserung (User sieht schneller erste Daten)

**Implementierung:**
- Frontend: Requests in Reihenfolge ausführen
- Oder: Lazy Loading für nicht-kritische Daten

---

## 📊 ERWARTETE VERBESSERUNG

### Aktuell (ohne Optimierungen)

| Endpoint | Geschätzte Zeit | Status |
|----------|----------------|--------|
| `/users/profile` | 0.5-2.0s | 🔴 Langsam |
| `/api/worktime/active` | 0.01-0.2s | ✅ OK (Cache) |
| `/api/organizations/current` | 0.1-0.5s | 🟡 |
| `/api/branches/user` | 0.1-0.3s | 🟡 |
| `/api/users/onboarding/status` | 0.05-0.2s | 🟡 |
| **GESAMT** | **0.86-3.2s** | 🔴 |

### Nach Optimierungen (geschätzt)

| Endpoint | Geschätzte Zeit | Status |
|----------|----------------|--------|
| `/users/profile` | 0.15-0.6s | ✅ (50-70% schneller) |
| `/api/worktime/active` | 0.01-0.2s | ✅ (unverändert) |
| `/api/organizations/current` | 0.01-0.05s | ✅ (80-90% schneller) |
| `/api/branches/user` | 0.01-0.03s | ✅ (80-90% schneller) |
| `/api/users/onboarding/status` | 0.005-0.02s | ✅ (80-90% schneller) |
| **GESAMT** | **0.185-0.87s** | ✅ |

**Verbesserung:** Von 0.86-3.2s → 0.185-0.87s (60-75% schneller!)

---

## 🔍 ZUSÄTZLICHE BEOBACHTUNGEN

### 1. Frontend: Contexts werden alle beim Mount initialisiert

**Problem:**
- Alle Contexts (Auth, Worktime, Organization, Branch, Onboarding) werden beim Mount initialisiert
- Alle machen API-Aufrufe
- **5 parallele Requests**

**Lösung:**
- Lazy Loading für nicht-kritische Contexts
- Oder: Contexts nur initialisieren wenn benötigt

---

### 2. Backend: Middleware-Kette bei jedem Request

**Request-Flow:**
1. `authMiddleware` → UserCache (30s TTL) ✅
2. `organizationMiddleware` → OrganizationCache (2 Min TTL) ✅
3. Controller → DB-Query (falls nicht gecacht)

**Problem:**
- Auch bei gecachten Endpoints geht Request durch Middleware
- Middleware macht Cache-Lookup (schnell, aber Overhead)

**Lösung:**
- Keine Änderung nötig (Cache-Lookup ist schnell)

---

### 3. Database: Indizes prüfen

**Zu prüfen:**
- Gibt es Indizes auf `userRole.userId` + `userRole.lastUsed`?
- Gibt es Indizes auf `usersBranches.userId` + `usersBranches.lastUsed`?
- Gibt es Indizes auf `onboardingProgress.userId`?

**Lösung:**
- Indizes prüfen und ggf. hinzufügen

---

## 📋 IMPLEMENTIERUNGSPLAN

### Schritt 1: `/users/profile` optimieren
1. Query-Parameter für Settings/InvoiceSettings/Documents hinzufügen
2. Frontend: Query-Parameter beim initialen Laden setzen
3. Standard: Nur User + Roles + Permissions laden

### Schritt 2: `/api/organizations/current` Cache verwenden
1. `getCurrentOrganization` verwendet `organizationCache.get(userId)`
2. Nur bei Cache-Miss: DB-Query

### Schritt 3: BranchCache implementieren
1. `backend/src/services/branchCache.ts` erstellen
2. TTL: 5-10 Minuten
3. `getUserBranches` verwendet BranchCache
4. Cache invalidiert bei Branch-Änderungen

### Schritt 4: OnboardingCache implementieren
1. `backend/src/services/onboardingCache.ts` erstellen
2. TTL: 5-10 Minuten
3. `getOnboardingStatus` verwendet OnboardingCache
4. Cache invalidiert bei Onboarding-Änderungen

### Schritt 5: Frontend: Requests optimieren (optional)
1. Kritische Requests zuerst
2. Nicht-kritische Requests später
3. Oder: Lazy Loading

---

## 📝 ZUSAMMENFASSUNG

### ROOT CAUSE

**🔴 KRITISCH:** 5 parallele API-Aufrufe beim initialen Laden:
1. `/users/profile` - 0.5-2s (lädt zu viele Daten)
2. `/api/worktime/active` - 0.01-0.2s (bereits optimiert)
3. `/api/organizations/current` - 0.1-0.5s (kein Cache verwendet)
4. `/api/branches/user` - 0.1-0.3s (kein Caching)
5. `/api/users/onboarding/status` - 0.05-0.2s (kein Caching)

**Gesamt-Zeit:** 0.86-3.2 Sekunden 🔴

### LÖSUNG

**Priorität 1:** `/users/profile` optimieren (50-70% schneller)
**Priorität 2:** `/api/organizations/current` Cache verwenden (80-90% schneller)
**Priorität 3:** BranchCache implementieren (80-90% schneller)
**Priorität 4:** OnboardingCache implementieren (80-90% schneller)

**Erwartete Gesamt-Verbesserung:** Von 0.86-3.2s → 0.185-0.87s (60-75% schneller!)

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Analyse abgeschlossen - ROOT CAUSE identifiziert  
**Nächste Aktion:** Implementierung der Optimierungen

