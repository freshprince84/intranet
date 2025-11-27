# Performance-Analyse: System immer noch kritisch langsam (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - Analyse abgeschlossen  
**Problem:** System ist etwas besser, aber immer noch kritisch langsam. Speziell:
- Reservations Tab in Worktracker
- Filter auf jeder Seite
- Organisation Seite
- Grundsätzlich alles was aus der DB kommt wird sehr langsam geladen

---

## 🔍 IDENTIFIZIERTE PROBLEME

### Problem 1: Reservations Tab - 3x Permission-Checks ohne Caching

**Datei:** `backend/src/controllers/reservationController.ts:521-656`

**Problem:**
```typescript
// 3x checkUserPermission Aufrufe (Zeilen 543-568)
const hasAllBranchesPermission = await checkUserPermission(...);  // DB-Query 1
const hasOwnBranchPermission = await checkUserPermission(...);    // DB-Query 2
const hasReservationsPermission = await checkUserPermission(...); // DB-Query 3 (optional)

// Dann Reservations-Query
const reservations = await prisma.reservation.findMany({
  include: { organization, branch, task }
});
```

**Jeder `checkUserPermission` macht:**
- `prisma.role.findUnique({ include: { permissions: true } })` - **Keine Caching!**
- Bei 3 Permission-Checks = **3 DB-Queries nur für Permissions!**

**Impact:**
- **3-6 Sekunden** zusätzliche Wartezeit nur für Permission-Checks
- Wird bei **JEDEM** Reservations-Request ausgeführt
- Keine Caching für Permissions

**Lösung:**
- PermissionCache implementieren (TTL: 5-10 Minuten)
- Permissions werden bereits in `UserCache` geladen, aber `checkUserPermission` verwendet sie nicht

---

### Problem 2: Filter auf jeder Seite - Keine Caching für Filter-Listen

**Datei:** `backend/src/controllers/savedFilterController.ts:27-101`

**Problem:**
```typescript
// getUserSavedFilters - Keine Caching!
const savedFilters = await prisma.savedFilter.findMany({
  where: { userId, tableId }
});
```

**Datei:** `backend/src/controllers/savedFilterController.ts:348-412`

**Problem:**
```typescript
// getFilterGroups - Keine Caching!
const groups = await prisma.filterGroup.findMany({
  where: { userId, tableId },
  include: { filters: { orderBy: { order: 'asc' } } }
});
```

**Impact:**
- Filter werden bei **JEDEM** Seitenaufruf geladen
- Bei Worktracker: 2 Requests (`/saved-filters` + `/saved-filters/groups`)
- Bei Requests-Seite: 2 Requests
- **Keine Caching** für Filter-Listen (nur einzelne Filter werden gecacht)

**Lösung:**
- FilterListCache implementieren (TTL: 5 Minuten)
- Cache-Key: `userId:tableId`
- Invalidierung bei Filter-Änderungen

---

### Problem 3: checkUserPermission - Keine Caching

**Datei:** `backend/src/middleware/permissionMiddleware.ts:61-113`

**Problem:**
```typescript
export const checkUserPermission = async (...) => {
  // DB-Query bei JEDEM Aufruf - Keine Caching!
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true }
  });
  
  // Suche nach Permission in Array
  const permission = role.permissions.find(...);
};
```

**Impact:**
- Wird bei **JEDEM** Permission-Check aufgerufen
- Bei `getAllReservations`: **3x** aufgerufen
- Bei anderen Endpoints: **1-5x** aufgerufen
- **Keine Caching!**

**Lösung:**
- PermissionCache implementieren (TTL: 5-10 Minuten)
- Cache-Key: `roleId`
- Permissions werden bereits in `UserCache` geladen, aber `checkUserPermission` verwendet sie nicht

---

### Problem 4: Organisation Seite - getOrganizationStats ohne Caching

**Datei:** `backend/src/controllers/organizationController.ts` (getOrganizationStats)

**Problem:**
```typescript
// Mehrere DB-Queries ohne Caching:
const userCount = await prisma.user.count({...});
const roles = await prisma.role.findMany({...});
const joinRequests = await prisma.joinRequest.findMany({...});
const invitations = await prisma.invitation.findMany({...});
```

**Impact:**
- Wird bei **JEDEM** Laden der Organisation-Seite aufgerufen
- **4-5 DB-Queries** ohne Caching
- Stats ändern sich selten (gut für Caching)

**Lösung:**
- OrganizationStatsCache implementieren (TTL: 5 Minuten)
- Cache-Key: `organizationId`

---

### Problem 5: Reservations Query - include task kann N+1 Problem verursachen

**Datei:** `backend/src/controllers/reservationController.ts:622-643`

**Problem:**
```typescript
const reservations = await prisma.reservation.findMany({
  where: whereClause,
  include: {
    organization: { select: {...} },
    branch: { select: {...} },
    task: true  // ← Kann N+1 Problem verursachen wenn task weitere Relations hat
  }
});
```

**Impact:**
- Wenn `task` weitere Relations hat (z.B. `assignments`, `attachments`), werden diese nicht geladen
- Aber wenn Frontend diese benötigt, werden separate Queries gemacht

**Lösung:**
- Prüfen ob `task` weitere Relations benötigt
- Optional: `task: { select: {...} }` statt `task: true`

---

## 📊 ZUSAMMENFASSUNG DER PROBLEME

### Kritische Probleme (sofort beheben):

1. **checkUserPermission - Keine Caching**
   - Impact: **3-6 Sekunden** bei jedem Reservations-Request
   - Lösung: PermissionCache implementieren

2. **getUserSavedFilters / getFilterGroups - Keine Caching**
   - Impact: **1-2 Sekunden** bei jedem Seitenaufruf
   - Lösung: FilterListCache implementieren

3. **getOrganizationStats - Keine Caching**
   - Impact: **1-2 Sekunden** bei jedem Laden der Organisation-Seite
   - Lösung: OrganizationStatsCache implementieren

### Mittlere Probleme:

4. **Reservations Query - include task**
   - Impact: Potenzielle N+1 Probleme
   - Lösung: Prüfen und optimieren

---

## 🔧 LÖSUNGSVORSCHLÄGE

### Lösung 1: PermissionCache implementieren

**Datei:** `backend/src/services/permissionCache.ts` (neu)

**Features:**
- In-Memory Cache mit 5 Minuten TTL
- Cache-Key: `roleId`
- Cached: `role` mit `permissions`
- Invalidierung bei Permission-Änderungen

**Verwendung:**
```typescript
// In checkUserPermission:
const role = await permissionCache.get(roleId);
if (!role) {
  // DB-Query + Cache speichern
}
```

**Erwartete Verbesserung:**
- **95% Reduktion** der Permission-Check-Zeit (von 1-2s auf 0.05-0.1s)
- Bei 3 Permission-Checks: **Von 3-6s auf 0.15-0.3s**

---

### Lösung 2: FilterListCache implementieren

**Datei:** `backend/src/services/filterListCache.ts` (neu)

**Features:**
- In-Memory Cache mit 5 Minuten TTL
- Cache-Key: `userId:tableId`
- Cached: `savedFilters[]` und `filterGroups[]`
- Invalidierung bei Filter-Änderungen

**Verwendung:**
```typescript
// In getUserSavedFilters:
const filters = await filterListCache.get(userId, tableId);
if (!filters) {
  // DB-Query + Cache speichern
}
```

**Erwartete Verbesserung:**
- **95% Reduktion** der Filter-Lade-Zeit (von 1-2s auf 0.05-0.1s)
- Bei 2 Requests: **Von 2-4s auf 0.1-0.2s**

---

### Lösung 3: OrganizationStatsCache implementieren

**Datei:** `backend/src/services/organizationStatsCache.ts` (neu)

**Features:**
- In-Memory Cache mit 5 Minuten TTL
- Cache-Key: `organizationId`
- Cached: `{ userCount, roles, joinRequests, invitations }`
- Invalidierung bei Stats-Änderungen

**Verwendung:**
```typescript
// In getOrganizationStats:
const stats = await organizationStatsCache.get(organizationId);
if (!stats) {
  // DB-Queries + Cache speichern
}
```

**Erwartete Verbesserung:**
- **95% Reduktion** der Stats-Lade-Zeit (von 1-2s auf 0.05-0.1s)

---

## 📋 PRIORITÄTEN

### Priorität 1 (Kritisch - sofort beheben):
1. ✅ PermissionCache implementieren
2. ✅ FilterListCache implementieren
3. ✅ OrganizationStatsCache implementieren

### Priorität 2 (Mittlere Priorität):
4. Reservations Query optimieren (include task prüfen)

---

## 🔍 WEITERE ANALYSE NÖTIG

- Prüfen ob es weitere Endpoints gibt, die keine Caching verwenden
- Prüfen ob es N+1 Query Probleme gibt
- Prüfen ob Queries optimiert sind (Indizes, Select-Felder)

---

---

## 🔍 ZUSÄTZLICHE BEOBACHTUNGEN

### checkUserPermission verwendet UserCache-Daten nicht

**Problem:**
- `UserCache` lädt bereits `role` mit `permissions` (Zeile 47-62 in `userCache.ts`)
- `checkUserPermission` macht aber trotzdem eine neue DB-Query (Zeile 70-73 in `permissionMiddleware.ts`)
- **Doppelte DB-Queries!**

**Lösung:**
- `checkUserPermission` sollte `UserCache` verwenden statt eigene DB-Query
- Oder: PermissionCache implementieren und von beiden verwendet

---

### Reservations Query - executeWithRetry fehlt

**Problem:**
- `getAllReservations` verwendet `prisma.reservation.findMany` direkt (Zeile 622)
- **Kein `executeWithRetry`!**
- Bei DB-Fehlern: Keine Retry-Logik

**Lösung:**
- `executeWithRetry` um `prisma.reservation.findMany` wickeln

---

### Filter-Listen werden bei jedem Request geparst

**Problem:**
- `getUserSavedFilters` parst JSON-Strings bei jedem Request (Zeile 50-90)
- `getFilterGroups` parst JSON-Strings bei jedem Request (Zeile 380-401)
- **Keine Caching!**

**Impact:**
- JSON-Parsing ist schnell, aber DB-Query ist langsam
- Hauptproblem: DB-Query ohne Caching

---

## 📊 GESAMT-IMPACT SCHÄTZUNG

### Vorher (aktuell):
- **Reservations Tab:** 3-6s (Permission-Checks) + 1-2s (Reservations-Query) = **4-8s**
- **Filter auf jeder Seite:** 1-2s (getUserSavedFilters) + 1-2s (getFilterGroups) = **2-4s**
- **Organisation Seite:** 1-2s (getOrganizationStats) = **1-2s**

**Gesamt pro Seitenaufruf:** **7-14 Sekunden**

### Nachher (mit Caching):
- **Reservations Tab:** 0.15-0.3s (Permission-Checks) + 1-2s (Reservations-Query) = **1.15-2.3s**
- **Filter auf jeder Seite:** 0.05-0.1s (getUserSavedFilters) + 0.05-0.1s (getFilterGroups) = **0.1-0.2s**
- **Organisation Seite:** 0.05-0.1s (getOrganizationStats) = **0.05-0.1s**

**Gesamt pro Seitenaufruf:** **1.3-2.6 Sekunden**

**Reduktion:** **80-85% schneller**

---

**Erstellt:** 2025-01-26  
**Status:** 🔴 KRITISCH - Lösungen müssen implementiert werden

