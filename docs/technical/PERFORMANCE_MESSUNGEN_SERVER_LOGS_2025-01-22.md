# Performance-Messungen: Server-Logs (2025-01-22)

**Datum:** 2025-01-22  
**Status:** ✅ Messungen durchgeführt  
**Quelle:** Server-Logs (pm2 logs intranet-backend)

---

## 📊 GEMESSENE QUERY-ZEITEN

### `/api/requests` (getAllRequests)

**Messwerte aus Logs:**
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 11ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 17ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 16ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 35ms`

**Statistik:**
- **Minimum:** 11ms
- **Maximum:** 35ms
- **Durchschnitt:** ~19.75ms
- **Anzahl Requests:** 50 (Standard-Limit)

**Fakt:** Query-Zeiten sind sehr schnell (11-35ms).

---

### `/api/tasks` (getAllTasks)

**Messwerte aus Logs:**
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 119ms`
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 13ms`
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 13ms`

**Statistik:**
- **Minimum:** 13ms
- **Maximum:** 119ms
- **Durchschnitt:** ~48.33ms
- **Anzahl Tasks:** 50 (Standard-Limit)

**Fakt:** Query-Zeiten sind schnell (13-119ms), ein Ausreißer bei 119ms.

---

## 📊 CACHE-STATUS

### FilterCache

**Messwerte aus Logs:**
- `[FilterCache] 💾 Cache-Miss für Filter 204 - aus DB geladen und gecacht`
- `[FilterCache] 💾 Cache-Miss für Filter 206 - aus DB geladen und gecacht`
- `[FilterCache] ✅ Cache-Hit für Filter 204`

**Fakt:** FilterCache funktioniert (Cache-Miss und Cache-Hit).

---

## 🔍 ANALYSE

### Query-Performance

**getAllRequests:**
- **Query-Zeit:** 11-35ms
- **Status:** ✅ Sehr schnell
- **Problem:** Query-Zeit ist NICHT das Problem

**getAllTasks:**
- **Query-Zeit:** 13-119ms
- **Status:** ✅ Schnell (ein Ausreißer bei 119ms)
- **Problem:** Query-Zeit ist NICHT das Hauptproblem

**Fazit:** Database-Queries sind schnell. Das Problem liegt woanders.

---

### Mögliche Ursachen für LCP 8.26s

**1. Network-Latenz**
- Query-Zeit: 11-119ms
- Network-Latenz: Unbekannt (muss gemessen werden)
- **Mögliche Ursache:** Hohe Network-Latenz zwischen Browser und Server

**2. Frontend-Rendering**
- Query-Zeit: 11-119ms
- Rendering-Zeit: Unbekannt (muss gemessen werden)
- **Mögliche Ursache:** Langsames React-Rendering

**3. Sequenzielle Requests**
- Requests-Komponente: Filter → Requests (blockierend)
- Worktracker: Filter → Tasks (blockierend)
- **Mögliche Ursache:** Blockierende sequenzielle Requests

**4. Andere Endpoints**
- Context-Provider: 5 parallele Requests
- Query-Zeiten: Unbekannt (muss gemessen werden)
- **Mögliche Ursache:** Langsame Context-Provider Requests

---

## 📋 ZUSAMMENFASSUNG: FAKTEN

### Gemessen (Server-Logs)

**getAllRequests:**
- ✅ Query-Zeit: 11-35ms (sehr schnell)
- ✅ Anzahl: 50 Requests
- ✅ FilterCache: Funktioniert

**getAllTasks:**
- ✅ Query-Zeit: 13-119ms (schnell, ein Ausreißer)
- ✅ Anzahl: 50 Tasks
- ✅ FilterCache: Funktioniert

### Nicht gemessen (benötigt weitere Messungen)

- ⏳ Network-Latenz (Browser → Server)
- ⏳ Frontend-Rendering-Zeit
- ⏳ Context-Provider Request-Zeiten
- ⏳ Gesamt-Request-Dauer (Browser DevTools)

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Server-Logs gemessen  
**Nächste Aktion:** Browser DevTools Network-Tab für Gesamt-Request-Dauer

