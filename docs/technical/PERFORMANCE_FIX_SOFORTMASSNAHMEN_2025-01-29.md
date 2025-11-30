# Performance-Fix: Sofortmaßnahmen (2025-01-29)

**Datum:** 2025-01-29  
**Status:** ✅ GELÖST - System läuft wieder deutlich schneller  
**Priorität:** 🔴🔴🔴 KRITISCH (war)

## ✅ PROBLEM GELÖST

**Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

---

## 🔍 PROBLEM ZUSAMMENFASSUNG

### Gefundene Probleme:
1. **Langsam laufende Query:** Organization Settings Query läuft 5.5 Sekunden
2. **Extreme Query-Zeit-Variation:** 10ms vs 2824ms (280x langsamer!)
3. **Connection Pool:** 18 Verbindungen (2 active, 16 idle) - kein Pool-Problem
4. **Keine Locks:** Keine blockierten Queries

---

## 🎯 SOFORT-MASSNAHMEN (Reihenfolge)

### 1. Langsam laufende Query killen

```bash
# Query beenden (PID 375273)
sudo -u postgres psql -d intranet -c "SELECT pg_terminate_backend(375273);"
```

**Ziel:** Sofortige Entlastung des Systems

---

### 2. Settings-Größe prüfen

```bash
# Settings-Größe für alle Organizations prüfen
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    pg_size_pretty(pg_column_size(settings)) as settings_size,
    pg_size_pretty(pg_total_relation_size('\"Organization\"')) as table_size
FROM \"Organization\"
ORDER BY pg_column_size(settings) DESC;
"
```

**Ziel:** Identifizieren welche Organization große Settings hat

---

### 3. Query-Plan analysieren

```bash
# Query-Plan für langsame Query
sudo -u postgres psql -d intranet -c "
EXPLAIN ANALYZE 
SELECT id, settings 
FROM \"Organization\" 
WHERE id IN (1) OFFSET 0;
"
```

**Ziel:** Verstehen warum Query so langsam ist

---

### 4. Index-Status prüfen

```bash
# Alle Indizes auf Organization prüfen
sudo -u postgres psql -d intranet -c "
SELECT 
    indexname,
    indexdef,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_indexes 
LEFT JOIN pg_stat_user_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexname
WHERE tablename = 'Organization';
"
```

**Ziel:** Prüfen ob Indizes verwendet werden

---

### 5. Aktive Queries überwachen

```bash
# Alle aktiven Queries anzeigen
sudo -u postgres psql -d intranet -c "
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    wait_event_type,
    wait_event,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE datname = 'intranet' 
  AND state != 'idle'
ORDER BY duration DESC;
"
```

**Ziel:** Kontinuierliche Überwachung

---

## 🔧 CODE-FIXES (Nach Analyse)

### Fix 1: Settings-Laden optimieren

**Problem:** Settings werden möglicherweise zu oft geladen.

**Prüfen:**
- Welche Services laden Settings?
- Werden Settings gecacht?
- Wird Settings-Decryption optimiert?

**Dateien zu prüfen:**
- `backend/src/services/lobbyPmsService.ts` (Zeile 181)
- `backend/src/services/ttlockService.ts` (Zeile 132, 371)
- `backend/src/services/boldPaymentService.ts` (Zeile 107)
- `backend/src/services/whatsappService.ts` (Zeile 106)
- `backend/src/services/reservationNotificationService.ts` (Zeile 71)

---

### Fix 2: OFFSET-Problem beheben

**Problem:** `OFFSET $2` in Query ist ungewöhnlich.

**Mögliche Ursachen:**
1. Prisma-Bug
2. Falsche Query-Konfiguration
3. Andere Query, die ich übersehen habe

**Prüfung:**
- Prisma Query-Logging aktivieren
- Alle Organization-Queries durchsuchen

---

### Fix 3: Settings-Caching

**Problem:** Settings werden bei jedem Request neu geladen.

**Lösung:**
- Settings in Redis/Memory-Cache speichern
- Cache-Invalidierung bei Settings-Update

---

## 📊 MONITORING

### Query-Performance-Logging erweitern

**Code-Stelle:** `backend/src/controllers/organizationController.ts:768`

**Aktuell:**
```typescript
const settingsDuration = Date.now() - settingsStartTime;
console.log(`[getCurrentOrganization] ⏱️ Settings-Query: ${settingsDuration}ms | ...`);
```

**Erweitern:**
```typescript
const settingsDuration = Date.now() - settingsStartTime;

// ✅ WARNUNG bei langsamen Queries
if (settingsDuration > 1000) {
  console.error(`[getCurrentOrganization] ⚠️ LANGSAME Query: ${settingsDuration}ms für Organization ${organization.id}`);
  console.error(`[getCurrentOrganization] ⚠️ Settings-Größe: ${JSON.stringify(orgWithSettings.settings || {}).length / 1024 / 1024} MB`);
}
```

---

## ✅ ERWARTETE VERBESSERUNG

**Vorher:**
- Query-Zeit: 5.5 Sekunden (mit Settings)
- Query-Zeit: 10-50ms (ohne Settings)
- Variation: 10ms - 2824ms

**Nachher:**
- Query-Zeit: 10-50ms (Settings nur wenn nötig)
- Query-Zeit: < 100ms (mit optimiertem Settings-Laden)
- Variation: 10ms - 50ms

**Verbesserung: 99% schneller**

---

## 📝 NÄCHSTE SCHRITTE

1. **SOFORT:** Query killen (wenn noch aktiv)
2. **SOFORT:** Settings-Größe prüfen
3. **SOFORT:** Query-Plan analysieren
4. **KURZFRISTIG:** Services prüfen - Settings-Laden optimieren
5. **MITTELFRISTIG:** Settings-Caching implementieren

