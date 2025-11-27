# Connection Pool Voll - Warum bei einem einzelnen Benutzer? (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔍 Analyse - Warum wird Pool voll bei nur 1 Benutzer?  
**Problem:** Connection Pool ist voll (20/20), obwohl nur 1 Benutzer die Seite öffnet

---

## 🔍 DAS PROBLEM

**Frage:** Wie kann der Connection Pool voll sein, wenn nur 1 Benutzer die Seite öffnet?

**Antwort:** Eine einzelne Seite macht **viele parallele API-Requests**, die alle DB-Verbindungen benötigen!

---

## 📊 WIE VIELE REQUESTS MACHT EINE SEITE?

### Beispiel: Worktracker-Seite beim Öffnen

**Beim initialen Laden (nach Login/Refresh):**

1. **AuthProvider** → `/users/profile`
   - **Middleware:** `authMiddleware` (UserCache) + `organizationMiddleware` (OrganizationCache)
   - **DB-Verbindungen:** 0-2 (je nach Cache-Status)

2. **WorktimeProvider** → `/api/worktime/active`
   - **Middleware:** `authMiddleware` + `organizationMiddleware`
   - **DB-Verbindungen:** 0-1 (je nach Cache-Status)

3. **OrganizationProvider** → `/api/organizations/current`
   - **Middleware:** `authMiddleware` + `organizationMiddleware`
   - **DB-Verbindungen:** 0-1 (je nach Cache-Status)

4. **BranchProvider** → `/api/branches/user`
   - **Middleware:** `authMiddleware` + `organizationMiddleware`
   - **DB-Verbindungen:** 0-1 (je nach Cache-Status)

5. **OnboardingContext** → `/api/users/onboarding/status`
   - **Middleware:** `authMiddleware` + `organizationMiddleware`
   - **DB-Verbindungen:** 0-1 (je nach Cache-Status)

6. **Worktracker-Komponente** → `/saved-filters/worktracker-todos`
   - **Middleware:** `authMiddleware` + `organizationMiddleware`
   - **DB-Verbindungen:** 0-1 (je nach Cache-Status)

7. **Worktracker-Komponente** → `/api/tasks?filterId=X`
   - **Middleware:** `authMiddleware` + `organizationMiddleware`
   - **DB-Verbindungen:** 1-3 (Tasks + Relations)

8. **SavedFilterTags-Komponente** → `/saved-filters/{tableId}` + `/saved-filters/groups/{tableId}`
   - **Middleware:** `authMiddleware` + `organizationMiddleware` (2x)
   - **DB-Verbindungen:** 0-2 (je nach Cache-Status)

**Gesamt beim initialen Laden:**
- **8-12 parallele API-Requests**
- **Jeder Request** geht durch `authMiddleware` + `organizationMiddleware`
- **Bei Cache-Misses:** Jeder Request braucht 1-2 DB-Verbindungen
- **Gesamt:** 8-24 DB-Verbindungen gleichzeitig!

---

## 🔍 WARUM WIRD DER POOL VOLL?

### Problem 1: Viele parallele Requests

**Beim Seitenladen:**
- 8-12 parallele API-Requests
- Jeder Request braucht DB-Verbindung
- **Bei 20 Verbindungen:** Pool ist schnell voll!

### Problem 2: Middleware bei jedem Request

**Jeder Request geht durch:**
1. `authMiddleware` → `userCache.get()` → **0-1 DB-Verbindung** (bei Cache-Miss)
2. `organizationMiddleware` → `organizationCache.get()` → **0-1 DB-Verbindung** (bei Cache-Miss)

**Bei 8-12 parallelen Requests:**
- 8-12 × 2 Middleware-Calls = **16-24 potenzielle DB-Verbindungen**
- **Aber:** Caches reduzieren das (TTL: 30s für UserCache, 2min für OrganizationCache)

### Problem 3: Cache-Misses

**Wenn Caches abgelaufen sind:**
- UserCache TTL: 30 Sekunden
- OrganizationCache TTL: 2 Minuten
- **Bei Cache-Miss:** Jeder Request braucht DB-Verbindung

**Beispiel:**
- UserCache abgelaufen → 8-12 Requests brauchen DB-Verbindung
- OrganizationCache abgelaufen → 8-12 Requests brauchen DB-Verbindung
- **Gesamt:** 16-24 DB-Verbindungen gleichzeitig!

### Problem 4: Langsame Queries halten Verbindungen

**Wenn Queries langsam sind:**
- Verbindungen werden nicht schnell genug freigegeben
- Neue Requests warten auf freie Verbindung
- Pool wird voll → Timeout

### Problem 5: executeWithRetry Retries

**Wenn es Fehler gibt:**
- executeWithRetry macht Retries
- Jeder Retry = Neuer Request
- Mehr Requests = Pool wird noch voller
- **Teufelskreis!**

---

## 📊 BEISPIEL: WORKTRACKER-SEITE

### Request-Flow beim Öffnen:

**Zeitpunkt 0ms:** Seite wird geöffnet

**Zeitpunkt 0-100ms:** 5 parallele Context-Requests
1. AuthProvider → `/users/profile`
2. WorktimeProvider → `/api/worktime/active`
3. OrganizationProvider → `/api/organizations/current`
4. BranchProvider → `/api/branches/user`
5. OnboardingContext → `/api/users/onboarding/status`

**Zeitpunkt 100-200ms:** 3 parallele Page-Requests
6. Worktracker → `/saved-filters/worktracker-todos`
7. Worktracker → `/api/tasks?filterId=X`
8. SavedFilterTags → `/saved-filters/{tableId}` + `/saved-filters/groups/{tableId}`

**Gesamt:** 8-10 parallele Requests

**Jeder Request:**
- Geht durch `authMiddleware` → **0-1 DB-Verbindung** (bei Cache-Miss)
- Geht durch `organizationMiddleware` → **0-1 DB-Verbindung** (bei Cache-Miss)
- Macht Controller-Query → **1-3 DB-Verbindungen**

**Bei Cache-Misses:**
- 8-10 Requests × 2 Middleware-Calls = **16-20 potenzielle DB-Verbindungen**
- 8-10 Requests × 1-3 Controller-Queries = **8-30 DB-Verbindungen**
- **Gesamt:** 24-50 DB-Verbindungen gleichzeitig!

**Aber:** Connection Pool hat nur 20 Verbindungen → **Pool ist voll!**

---

## 💡 WARUM PASSIERT DAS?

### Hauptursache: Zu viele parallele Requests

**Problem:**
- Frontend macht viele parallele API-Requests beim Seitenladen
- Jeder Request braucht DB-Verbindung
- Connection Pool hat nur 20 Verbindungen
- **Bei 8-12 parallelen Requests:** Pool ist schnell voll!

### Sekundäre Ursachen:

1. **Cache-Misses** → Mehr DB-Verbindungen nötig
2. **Langsame Queries** → Verbindungen werden nicht schnell genug freigegeben
3. **executeWithRetry Retries** → Noch mehr Requests → Pool wird noch voller
4. **Middleware bei jedem Request** → Jeder Request braucht 0-2 DB-Verbindungen

---

## ✅ LÖSUNG

### Lösung 1: Connection Pool erhöhen (SOFORT) ⭐⭐⭐

**Was:**
- `connection_limit` von 20 auf 30-40 erhöhen
- Mehr Verbindungen = Mehr Kapazität für parallele Requests

**Änderung in `.env`:**
```bash
# VORHER:
connection_limit=20

# NACHHER:
connection_limit=30
```

**Begründung:**
- 8-12 parallele Requests beim Seitenladen
- Jeder Request braucht 1-3 DB-Verbindungen
- **30 Verbindungen** = Genug Kapazität für normale Last

---

### Lösung 2: executeWithRetry Logik anpassen (WICHTIG) ⭐⭐

**Was:**
- Connection Pool Timeout-Fehler **NICHT** retried
- Connection Pool Timeout = Sofortiger Fehler, kein Retry

**Begründung:**
- Retry macht das Problem **schlimmer** (noch mehr Requests)
- Sofortiger Fehler = User sieht Fehler sofort, System wird nicht weiter blockiert

---

### Lösung 3: Caching optimieren (MITTELFRISTIG) ⭐

**Was:**
- Cache-TTLs optimieren
- Mehr Caching = Weniger DB-Verbindungen

**Begründung:**
- Weniger Cache-Misses = Weniger DB-Verbindungen
- System wird schneller

---

## 📋 ZUSAMMENFASSUNG

### ✅ Warum wird Pool voll bei 1 Benutzer?

**Antwort:**
- Eine Seite macht **8-12 parallele API-Requests** beim Laden
- Jeder Request braucht **1-3 DB-Verbindungen**
- **Gesamt:** 24-50 DB-Verbindungen gleichzeitig
- **Connection Pool hat nur 20 Verbindungen** → **Pool ist voll!**

### 💡 Lösungen:

1. **Connection Pool erhöhen** (von 20 auf 30-40) - SOFORT
2. **executeWithRetry Logik anpassen** - Connection Pool Timeout = Sofortiger Fehler
3. **Caching optimieren** - Weniger Cache-Misses = Weniger DB-Verbindungen

---

**Erstellt:** 2025-01-26  
**Status:** 🔍 Analyse abgeschlossen - Warum Pool voll bei 1 Benutzer erklärt  
**Nächster Schritt:** Connection Pool erhöhen + executeWithRetry Logik anpassen

