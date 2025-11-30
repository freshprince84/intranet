# Performance-Problem: Aktuell KRITISCH (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ GELÖST (2025-01-29) - Hauptproblem identifiziert und behoben  
**Problem:** Connection Pool erhöhen hat nicht geholfen, alles lädt extrem langsam

## ⚠️ WICHTIG: HAUPTPROBLEM GELÖST (2025-01-29)

**✅ Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: Cache-TTLs sind ZU KURZ ⭐⭐⭐

**UserCache: 30 Sekunden**
- **Problem:** Nach 30 Sekunden = Cache-Miss → DB-Query
- **Impact:** Bei jedem Request nach 30s = DB-Query
- **Lösung:** TTL auf **5-10 Minuten** erhöhen

**WorktimeCache: 5 Sekunden**
- **Problem:** Sehr kurz, aber wird alle 30 Sekunden gepollt
- **Impact:** Cache-Miss alle 5 Sekunden → DB-Query
- **Lösung:** TTL auf **30-60 Sekunden** erhöhen (gleich wie Polling-Intervall)

**OrganizationCache: 2 Minuten**
- **Problem:** Könnte länger sein
- **Impact:** Cache-Miss alle 2 Minuten → DB-Query
- **Lösung:** TTL auf **10-15 Minuten** erhöhen

---

### Problem 2: Häufiges Polling ohne Cache ⭐⭐

**Polling-Endpoints:**
- `/api/worktime/active`: Alle 30 Sekunden (WorktimeContext)
- `/api/notifications/unread/count`: Alle 60 Sekunden
- `/api/team/worktime/active-users`: Alle 30 Sekunden

**Problem:**
- WorktimeCache hat nur 5 Sekunden TTL → Cache-Miss bei jedem Poll
- NotificationCount hat **KEINEN Cache** → Jeder Poll = DB-Query
- ActiveUsers hat **KEINEN Cache** → Jeder Poll = DB-Query

**Impact:**
- Bei 1 Benutzer: 2-3 DB-Queries alle 30-60 Sekunden
- Bei 10 Benutzern: 20-30 DB-Queries alle 30-60 Sekunden
- **System wird langsam**

---

### Problem 3: Zu viele parallele Requests beim Seitenladen ⭐⭐

**Beim initialen Laden:**
- 8-12 parallele API-Requests
- Jeder Request braucht DB-Verbindung
- Connection Pool wird schnell voll

**Problem:**
- Frontend macht zu viele parallele Requests
- Keine Sequenzierung
- Keine Request-Batching

---

### Problem 4: Fehlende Caches ⭐

**Fehlende Caches:**
- **BranchCache** - `/api/branches/user` wird bei jedem Request aufgerufen
- **OnboardingCache** - `/api/users/onboarding/status` wird bei jedem Request aufgerufen
- **NotificationCountCache** - `/api/notifications/unread/count` wird alle 60 Sekunden gepollt
- **ActiveUsersCache** - `/api/team/worktime/active-users` wird alle 30 Sekunden gepollt

**Impact:**
- Jeder Request = DB-Query
- System wird langsam

---

## 💡 SOFORT-LÖSUNGEN

### Lösung 1: Cache-TTLs erhöhen (SOFORT) ⭐⭐⭐

**Datei:** `backend/src/services/userCache.ts`

**Änderung:**
```typescript
// VORHER:
private readonly TTL_MS = 30 * 1000; // 30 Sekunden

// NACHHER:
private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten
```

**Datei:** `backend/src/services/worktimeCache.ts`

**Änderung:**
```typescript
// VORHER:
private readonly TTL_MS = 5 * 1000; // 5 Sekunden

// NACHHER:
private readonly TTL_MS = 30 * 1000; // 30 Sekunden (gleich wie Polling-Intervall)
```

**Datei:** `backend/src/utils/organizationCache.ts`

**Änderung:**
```typescript
// VORHER:
private readonly TTL_MS = 2 * 60 * 1000; // 2 Minuten

// NACHHER:
private readonly TTL_MS = 10 * 60 * 1000; // 10 Minuten
```

**Erwartete Verbesserung:**
- **90-95% weniger DB-Queries** bei Cache-Hits
- System wird **deutlich schneller**

---

### Lösung 2: Fehlende Caches implementieren (KURZFRISTIG) ⭐⭐

**BranchCache implementieren:**
- TTL: 10 Minuten
- Reduziert DB-Queries für `/api/branches/user`

**OnboardingCache implementieren:**
- TTL: 10 Minuten
- Reduziert DB-Queries für `/api/users/onboarding/status`

**NotificationCountCache implementieren:**
- TTL: 30-60 Sekunden
- Reduziert DB-Queries für `/api/notifications/unread/count`

**ActiveUsersCache implementieren:**
- TTL: 30 Sekunden
- Reduziert DB-Queries für `/api/team/worktime/active-users`

---

### Lösung 3: Polling-Intervalle optimieren (KURZFRISTIG) ⭐

**Problem:**
- Polling zu häufig (alle 30-60 Sekunden)
- Jeder Poll = DB-Query (wenn kein Cache)

**Lösung:**
- Polling-Intervalle erhöhen (30s → 60s, 60s → 120s)
- Oder: WebSockets für Echtzeit-Updates

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher (Cache-TTLs zu kurz):
- UserCache: Cache-Miss alle 30 Sekunden → DB-Query
- WorktimeCache: Cache-Miss alle 5 Sekunden → DB-Query
- OrganizationCache: Cache-Miss alle 2 Minuten → DB-Query
- **Gesamt:** Viele DB-Queries → System langsam

### Nachher (Cache-TTLs erhöht):
- UserCache: Cache-Miss alle 5 Minuten → **90% weniger DB-Queries**
- WorktimeCache: Cache-Miss alle 30 Sekunden → **Gleich wie Polling-Intervall**
- OrganizationCache: Cache-Miss alle 10 Minuten → **80% weniger DB-Queries**
- **Gesamt:** **90-95% weniger DB-Queries** → System deutlich schneller

---

## 🔍 NÄCHSTE SCHRITTE

1. **Cache-TTLs erhöhen** (SOFORT) - Code-Änderung
2. **Fehlende Caches implementieren** (KURZFRISTIG)
3. **Polling-Intervalle optimieren** (KURZFRISTIG)
4. **Server Logs analysieren** - Um weitere Probleme zu finden

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System immer noch extrem langsam  
**Nächster Schritt:** Cache-TTLs erhöhen + Fehlende Caches implementieren

