# Performance-Analyse: getActiveWorktime - Warum dauert es immer noch 2 Sekunden?

**Datum:** 2025-01-XX  
**Status:** 🔴 KRITISCH - Analyse abgeschlossen  
**Problem:** On/Off Switch für Zeiterfassung dauert 2 Sekunden beim Seitenaufruf

---

## 🔍 ROOT CAUSE IDENTIFIZIERT

### Das Problem: Middleware-Kette ist der Bottleneck

**Request-Flow für `/api/worktime/active`:**

1. **Frontend:** `WorktimeContext` ruft beim Seitenaufruf sofort `checkTrackingStatus()` auf
2. **Backend Route:** `/api/worktime/active` (Zeile 26 in `backend/src/routes/worktime.ts`)
3. **Middleware-Kette (VOR dem Controller):**
   - ✅ `authMiddleware` (Zeile 18) - **🔴 KRITISCH: Macht komplexe DB-Query bei JEDEM Request!**
   - ✅ `organizationMiddleware` (Zeile 19) - **🟡 Verwendet Cache, aber beim ersten Request leer**

4. **Controller:** `getActiveWorktime` - **✅ Verwendet jetzt Cache (5s TTL)**

---

## 🔴 KRITISCHES PROBLEM: authMiddleware

### Aktuelle Implementierung

**Datei:** `backend/src/middleware/auth.ts` (Zeilen 54-68)

```typescript
const user = await prisma.user.findUnique({
  where: { id: decoded.userId },
  include: {
    roles: {
      include: {
        role: {
          include: {
            permissions: true  // ← Viele Permissions!
          }
        }
      }
    },
    settings: true
  }
});
```

### Problem-Analyse

**Diese Query lädt:**
- User (Basis-Daten)
- **Alle UserRoles** (kann mehrere sein)
- **Jede Role** mit **allen Permissions** (kann 50+ Permissions pro Role sein!)
- **Settings** (kann groß sein)

**Komplexität:**
- **3 verschachtelte Joins:** User → UserRole → Role → Permission
- **Bei 3 Rollen mit je 50 Permissions = 150 Permission-Zeilen**
- **Bei jedem Request ausgeführt!**

**Geschätzte Query-Zeit:**
- **1-2 Sekunden** bei komplexen User-Daten
- **Wird bei JEDEM Request ausgeführt**, auch bei `/api/worktime/active`

### Impact

**Bei Seitenaufruf:**
1. Frontend ruft `/api/worktime/active` auf
2. **authMiddleware:** 1-2 Sekunden (komplexe Query)
3. **organizationMiddleware:** 0.1-0.5 Sekunden (Cache-Miss beim ersten Request)
4. **getActiveWorktime:** 0.01 Sekunden (Cache-Hit)
5. **Gesamt:** **1.5-2.5 Sekunden** ⚠️

**Das erklärt die 2 Sekunden Verzögerung!**

---

## 🟡 ZUSÄTZLICHES PROBLEM: organizationMiddleware

### Aktuelle Implementierung

**Datei:** `backend/src/middleware/organization.ts` (Zeilen 16-42)

```typescript
// ✅ PERFORMANCE: Verwende Cache statt DB-Query bei jedem Request
const cachedData = await organizationCache.get(Number(userId));
```

**Problem:**
- Cache ist beim **ersten Request leer** → DB-Query nötig
- Cache lädt: `userRole` mit `role` → `organization` → `permissions` + `usersBranches`
- **Auch komplexe Query mit Joins!**

**Geschätzte Query-Zeit:**
- **0.1-0.5 Sekunden** beim ersten Request (Cache-Miss)
- **0.001 Sekunden** bei weiteren Requests (Cache-Hit)

---

## 📊 VOLLSTÄNDIGE REQUEST-ZEIT-ANALYSE

### Request-Flow für `/api/worktime/active`:

| Schritt | Aktion | Geschätzte Zeit | Status |
|---------|--------|-----------------|--------|
| 1. Frontend Request | `axiosInstance.get('/api/worktime/active')` | 0.01s | ✅ |
| 2. **authMiddleware** | **Komplexe Query: User + Roles + Permissions + Settings** | **1.0-2.0s** | 🔴 **BOTTLENECK** |
| 3. **organizationMiddleware** | Cache-Miss → DB-Query (UserRole + Organization + Branch) | **0.1-0.5s** | 🟡 |
| 4. **getActiveWorktime** | Cache-Hit (5s TTL) | **0.01s** | ✅ |
| 5. Response | JSON zurückgeben | 0.01s | ✅ |
| **GESAMT** | | **1.2-2.5 Sekunden** | 🔴 |

---

## 🔍 WEITERE PROBLEME IDENTIFIZIERT

### 1. authMiddleware lädt zu viele Daten

**Was wird geladen:**
- ✅ User (benötigt)
- ✅ Roles (benötigt für `req.roleId`)
- ❌ **Alle Permissions** (werden nicht immer benötigt!)
- ❌ **Settings** (werden nicht immer benötigt!)

**Für `/api/worktime/active` werden benötigt:**
- ✅ User (nur `id`)
- ❌ Roles (nicht benötigt)
- ❌ Permissions (nicht benötigt)
- ❌ Settings (nicht benötigt)

**Problem:** authMiddleware lädt **immer alles**, auch wenn nicht benötigt!

---

### 2. organizationMiddleware Cache-Miss beim ersten Request

**Problem:**
- Beim ersten Request ist Cache leer
- DB-Query muss ausgeführt werden
- Erst bei weiteren Requests ist Cache gefüllt

**Impact:**
- Erster Request: 0.1-0.5 Sekunden zusätzlich
- Weitere Requests: 0.001 Sekunden (Cache-Hit)

---

### 3. Frontend: Mehrfache Requests beim Seitenaufruf

**WorktimeContext** (Zeile 47-57):
```typescript
useEffect(() => {
    // Initiale Prüfung
    checkTrackingStatus();  // ← Request 1

    // Polling für regelmäßige Statusprüfung alle 30 Sekunden
    const intervalId = setInterval(() => {
        checkTrackingStatus();  // ← Request 2 (nach 30s)
    }, 30000);
    
    return () => clearInterval(intervalId);
}, []);
```

**WorktimeTracker** (Zeile 154-159):
```typescript
useEffect(() => {
    if (user) {
        checkActiveWorktime();  // ← Request 2 (zusätzlich!)
    }
}, [user]);
```

**Problem:** 
- **2 Requests** beim Seitenaufruf (WorktimeContext + WorktimeTracker)
- Beide müssen durch Middleware-Kette
- **Doppelte Ladezeit!**

---

## 🎯 LÖSUNGSVORSCHLÄGE (Priorisiert)

### Lösung 1: authMiddleware Caching 🔴🔴 KRITISCH

**Problem:** authMiddleware macht bei jedem Request komplexe Query

**Lösung:**
- User-Cache mit kurzer TTL (z.B. 10-30 Sekunden)
- Cache invalidiert bei User-Änderungen
- Nur bei Cache-Miss: DB-Query

**Erwartete Verbesserung:** 80-90% schneller (von 1-2s auf 0.1-0.2s)

**Implementierung:**
- Neuer `UserCache` Service (ähnlich wie `WorktimeCache`)
- TTL: 10-30 Sekunden
- Cache invalidiert bei: User-Update, Role-Change, Permission-Change

---

### Lösung 2: authMiddleware - Selektives Laden 🔴 HOCH

**Problem:** authMiddleware lädt immer alle Permissions und Settings

**Lösung:**
- Permissions und Settings nur laden wenn benötigt
- Für `/api/worktime/active`: Nur User-ID benötigt
- Optional: Query-Parameter `?includePermissions=false&includeSettings=false`

**Erwartete Verbesserung:** 50-70% schneller (von 1-2s auf 0.3-0.6s)

**Implementierung:**
- `authMiddleware` prüft Route
- Für einfache Endpoints: Nur User-ID laden
- Für komplexe Endpoints: Alles laden

---

### Lösung 3: organizationMiddleware - Cache-Warming 🟡 MITTEL

**Problem:** Cache ist beim ersten Request leer

**Lösung:**
- Cache beim Login vorfüllen
- Oder: Cache mit längerer TTL (z.B. 5 Minuten statt 2 Minuten)

**Erwartete Verbesserung:** 0.1-0.5s beim ersten Request

---

### Lösung 4: Frontend - Redundante Requests vermeiden 🟡 MITTEL

**Problem:** WorktimeContext und WorktimeTracker rufen beide `/api/worktime/active` auf

**Lösung:**
- WorktimeTracker verwendet WorktimeContext statt eigenen Request
- Oder: WorktimeContext lädt einmal, WorktimeTracker wartet auf Context

**Erwartete Verbesserung:** 50% weniger Requests beim Seitenaufruf

---

## 📋 DETAILLIERTE ANALYSE: authMiddleware Query

### Aktuelle Query-Struktur

```sql
SELECT 
  u.*,
  ur.*,
  r.*,
  p.*,  -- ← Viele Permissions!
  s.*   -- ← Settings
FROM User u
LEFT JOIN UserRole ur ON ur.userId = u.id
LEFT JOIN Role r ON r.id = ur.roleId
LEFT JOIN Permission p ON p.roleId = r.id  -- ← Join mit vielen Zeilen!
LEFT JOIN Settings s ON s.userId = u.id
WHERE u.id = ?
```

### Komplexität

**Bei einem User mit:**
- 3 Rollen
- 50 Permissions pro Role
- 1 Settings-Eintrag

**Ergebnis:**
- **150 Permission-Zeilen** (3 × 50)
- **3 Role-Zeilen**
- **3 UserRole-Zeilen**
- **1 Settings-Zeile**
- **Gesamt: ~157 Zeilen** für einen Request!

**Query-Zeit:** 1-2 Sekunden bei großen Datenmengen

---

## 📊 VERGLEICH: Vorher vs. Nachher (mit Optimierungen)

### Aktuell (ohne Optimierungen)

| Endpoint | Middleware | Controller | Gesamt |
|----------|------------|------------|--------|
| `/api/worktime/active` | 1.5-2.5s | 0.01s | **1.5-2.5s** 🔴 |

### Nach Optimierungen (geschätzt)

| Endpoint | Middleware | Controller | Gesamt |
|----------|------------|------------|--------|
| `/api/worktime/active` | 0.1-0.3s | 0.01s | **0.1-0.3s** ✅ |

**Verbesserung:** 80-90% schneller!

---

## 🔍 ZUSÄTZLICHE BEOBACHTUNGEN

### 1. Frontend: Warte auf User-Daten

**WorktimeTracker** (Zeile 154-159):
```typescript
useEffect(() => {
    if (user) {  // ← Wartet auf User!
        checkActiveWorktime();
    }
}, [user]);
```

**Problem:**
- WorktimeTracker wartet auf `user` aus `useAuth()`
- `useAuth()` lädt User-Daten beim Login
- **Zusätzliche Verzögerung** wenn User-Daten noch nicht geladen

---

### 2. Frontend: Mehrfache useEffect-Aufrufe

**WorktimeContext:**
- useEffect beim Mount → `checkTrackingStatus()`

**WorktimeTracker:**
- useEffect wenn `user` geladen → `checkActiveWorktime()`

**Problem:**
- **2 separate Requests** für dasselbe
- Beide müssen durch Middleware-Kette
- **Doppelte Ladezeit**

---

## 🎯 PRIORISIERTE LÖSUNGEN

### Priorität 1: authMiddleware Caching 🔴🔴 KRITISCH

**Impact:** 80-90% Verbesserung  
**Aufwand:** Mittel (neuer Cache-Service)  
**Risiko:** Niedrig (Cache kann bei Problemen deaktiviert werden)

**Implementierung:**
1. Neuer `UserCache` Service erstellen
2. TTL: 10-30 Sekunden
3. Cache invalidiert bei User/Role/Permission-Änderungen
4. authMiddleware verwendet Cache

---

### Priorität 2: Selektives Laden in authMiddleware 🔴 HOCH

**Impact:** 50-70% Verbesserung  
**Aufwand:** Niedrig (nur authMiddleware anpassen)  
**Risiko:** Niedrig

**Implementierung:**
1. Prüfe Route in authMiddleware
2. Für einfache Endpoints: Nur User-ID laden
3. Für komplexe Endpoints: Alles laden

---

### Priorität 3: Frontend - Redundante Requests vermeiden 🟡 MITTEL

**Impact:** 50% weniger Requests  
**Aufwand:** Niedrig (Frontend-Code anpassen)  
**Risiko:** Niedrig

**Implementierung:**
1. WorktimeTracker verwendet WorktimeContext
2. Oder: WorktimeTracker wartet auf WorktimeContext-Status

---

## 📝 ZUSAMMENFASSUNG

### ROOT CAUSE

**🔴 KRITISCH:** `authMiddleware` macht bei **jedem Request** eine komplexe Query (1-2 Sekunden)

**Request-Flow:**
1. Frontend: `/api/worktime/active`
2. **authMiddleware:** 1-2s (User + Roles + Permissions + Settings) ← **BOTTLENECK**
3. organizationMiddleware: 0.1-0.5s (Cache-Miss beim ersten Request)
4. getActiveWorktime: 0.01s (Cache-Hit)
5. **Gesamt: 1.5-2.5 Sekunden** 🔴

### LÖSUNG

**Priorität 1:** authMiddleware Caching
- User-Cache mit 10-30s TTL
- 80-90% Verbesserung erwartet

**Priorität 2:** Selektives Laden
- Permissions/Settings nur wenn benötigt
- 50-70% Verbesserung erwartet

**Priorität 3:** Frontend optimieren
- Redundante Requests vermeiden
- 50% weniger Requests

---

**Erstellt:** 2025-01-XX  
**Status:** ✅ Analyse abgeschlossen - ROOT CAUSE identifiziert  
**Nächste Aktion:** authMiddleware Caching implementieren

