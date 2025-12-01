# Performance: FilterTags detaillierte Analyse (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - DB-Query ist schnell, Problem liegt woanders  
**Erkenntnis:** DB-Query dauert nur 0.379ms - Problem liegt NICHT bei der Datenbank!

---

## 📊 ERGEBNISSE

### 1. DB-Query ist SEHR schnell ✅

**Query-Plan (EXPLAIN ANALYZE):**
```
Execution Time: 0.379 ms
```

**Details:**
- **Bitmap Index Scan** verwendet (optimal!)
- **Index:** `SavedFilter_userId_tableId_name_key`
- **Rows:** 62 Filter
- **Planning Time:** 0.993 ms
- **Execution Time:** 0.379 ms

**Fazit:** ✅ DB-Query ist NICHT das Problem! (0.379ms ist extrem schnell)

---

### 2. Keine FilterListCache Logs in Backend-Logs ⚠️

**Beobachtung:**
- Backend-Logs zeigen viele `getAllTasks` Queries
- **ABER:** Keine `FilterListCache` Logs (Cache-Miss, Cache-Hit, "aus DB geladen")
- **Mögliche Ursachen:**
  1. FilterTags werden nicht geladen (unwahrscheinlich)
  2. Logs werden nicht erfasst
  3. Requests kommen nicht an

---

### 3. Browser ist im Offline-Modus ⚠️🔴

**Aus dem Screenshot:**
- Network-Tab zeigt "Offline" Modus
- **Keine Network-Requests sichtbar**
- **Das erklärt warum keine Requests zu sehen sind!**

**Lösung:**
1. Browser auf "Online" stellen (Dropdown von "Offline" auf "Online")
2. Network-Log leeren
3. Seite neu laden
4. FilterTags-Requests beobachten

---

## 🔍 PROBLEM-ANALYSE

### Warum dauern FilterTags 2-3 Sekunden?

**Bekannt:**
1. ✅ DB-Query ist schnell (0.379ms)
2. ✅ Filter sind klein (< 500 bytes)
3. ✅ Cache funktioniert (viele Cache-Hits in früheren Logs)
4. ⚠️ Browser ist im Offline-Modus (keine Requests sichtbar)

**Mögliche Ursachen:**

1. **Network-Latenz** (Server ↔ Frontend)
   - Request-Zeit: 2-3 Sekunden?
   - **Zu prüfen:** Browser Network-Tab (wenn Online)

2. **Doppelte Requests** (Frontend)
   - Filter-Liste UND Filter-Gruppen werden beide geladen
   - **Wenn sequenziell:** 2x langsam
   - **Zu prüfen:** Browser Network-Tab

3. **Häufige Cache-Invalidierungen**
   - Jede Invalidierung = Cache-Miss beim nächsten Request
   - **Zu prüfen:** Cache-Invalidierung-Logs

4. **JSON-Parsing im Frontend**
   - Frontend parst JSON-Response
   - **Wenn langsam:** 2-3 Sekunden?
   - **Zu prüfen:** Browser Performance-Tab

5. **React Re-Renders**
   - Viele Re-Renders beim Laden der FilterTags
   - **Zu prüfen:** React DevTools Profiler

---

## 🔧 NÄCHSTE SCHRITTE

### 1. Browser auf Online stellen und Network-Requests prüfen

**Schritte:**
1. Browser DevTools öffnen
2. Network-Tab → Dropdown "Offline" → "Online" wählen
3. Network-Log leeren (🗑️ Icon)
4. Seite neu laden
5. Nach `/saved-filters` filtern
6. Prüfen:
   - Werden beide Endpoints aufgerufen? (`/saved-filters/{tableId}` und `/saved-filters/groups/{tableId}`)
   - Wie lange dauern die Requests? (Spalte "Time")
   - Werden sie parallel oder sequenziell aufgerufen?
   - Wie groß sind die Responses? (Spalte "Size")

---

### 2. Cache-Invalidierung analysieren

**Befehl:**
```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 5000 --nostream | grep -E "Cache invalidiert" | tail -100
```

**Was prüft es:**
- Wie oft wird Cache invalidiert?
- Welche TableIds werden am häufigsten invalidiert?
- Warum wird so oft invalidiert?

---

### 3. FilterListCache Logs aktivieren/prüfen

**Problem:** Keine FilterListCache Logs in Backend-Logs sichtbar

**Mögliche Ursachen:**
1. Logs werden nicht erfasst (Log-Level zu hoch?)
2. Requests kommen nicht an
3. FilterTags werden nicht geladen

**Zu prüfen:**
```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "saved-filter\|FilterListCache" | tail -50
```

---

### 4. React Performance Profiler (Frontend)

**Schritte:**
1. React DevTools öffnen
2. Profiler-Tab
3. Recording starten
4. Seite neu laden / FilterTags öffnen
5. Recording stoppen
6. Prüfen:
   - Wie lange dauert das Rendering?
   - Gibt es viele Re-Renders?
   - Welche Komponenten sind langsam?

---

## 📊 FAZIT

### ✅ Was funktioniert:
1. **DB-Query ist sehr schnell** (0.379ms)
2. **Filter sind klein** (< 500 bytes)
3. **Cache funktioniert** (viele Cache-Hits)

### ⚠️ Problem:
**FilterTags dauern 2-3 Sekunden trotz schneller DB-Query**

**Wahrscheinlichste Ursachen:**
1. **Network-Latenz** (Server ↔ Frontend) - zu prüfen im Browser
2. **Doppelte Requests** (Frontend) - zu prüfen im Browser
3. **React Re-Renders** (Frontend) - zu prüfen mit React DevTools

**Nächster Schritt:**
- Browser auf "Online" stellen
- Network-Requests prüfen
- Request-Zeiten messen

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 ANALYSE - DB-Query ist schnell, Problem liegt im Frontend/Network  
**Nächster Schritt:** Browser Network-Tab prüfen (wenn Online)


