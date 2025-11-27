# Performance-Test Anleitung (2025-01-26)

**Status:** ✅ Alle Phasen implementiert  
**Zweck:** System testen und Performance validieren

---

## 📋 VORBEREITUNG

### 1. Backend bauen und starten

```bash
cd backend
npm run build
# Server sollte automatisch neu starten (wenn PM2/Watch läuft)
# Oder manuell: pm2 restart intranet-backend --update-env
```

### 2. Logs überwachen

```bash
# PM2 Logs
pm2 logs intranet-backend --lines 100

# Oder in separatem Terminal:
tail -f ~/.pm2/logs/intranet-backend-out.log
```

---

## 🧪 TEST-SZENARIEN

### Test 1: Login und initiales Laden

**Ziel:** Prüfen ob Login-Flow schneller ist

**Vorgehen:**
1. Browser öffnen (Inkognito-Modus für sauberen Test)
2. Auf Login-Seite navigieren
3. Login durchführen
4. Zeit messen: Von Login-Button-Klick bis Dashboard geladen

**Erwartetes Ergebnis:**
- ✅ Login-Flow: < 5 Sekunden (vorher: 20-30 Sekunden)
- ✅ Keine "Connection Pool Timeout" Fehler in Logs
- ✅ Dashboard lädt vollständig

**Logs prüfen:**
```bash
# Sollte zeigen:
# - Cache-Hits für User/Organization
# - Keine "Connection Pool Timeout" Fehler
# - Timing-Logs für kritische Endpoints
```

---

### Test 2: Organisation-Tab laden

**Ziel:** Prüfen ob Organisation-Tab schneller lädt und weniger RAM verbraucht

**Vorgehen:**
1. Auf Organisation-Seite navigieren
2. Zeit messen: Von Seitenwechsel bis Tab vollständig geladen
3. Browser DevTools öffnen → Memory-Tab
4. RAM-Verbrauch prüfen

**Erwartetes Ergebnis:**
- ✅ Organisation-Tab: < 10 Sekunden (vorher: 4-5 Minuten)
- ✅ RAM-Verbrauch: < 100 MB (vorher: 3GB)
- ✅ Settings werden NICHT beim initialen Laden geladen (nur beim Bearbeiten)

**Logs prüfen:**
```bash
# Sollte zeigen:
# [getCurrentOrganization] ⏱️ Settings-Query: ... (nur wenn Edit-Modal geöffnet wird)
# [getAllBranches] ⏱️ Query: ...ms | Branches: ...
# [getUserBranches] ⏱️ Cache-Hit: ...ms | Branches: ...
```

---

### Test 3: Branches und Filter Tags

**Ziel:** Prüfen ob Branches und Filter Tags schnell laden

**Vorgehen:**
1. Auf Seite mit Branches navigieren (z.B. Dashboard)
2. Branches-Dropdown öffnen
3. Zeit messen: Von Klick bis Branches angezeigt
4. Auf Seite mit Filter Tags navigieren (z.B. Worktracker, Requests)
5. Filter Tags laden lassen

**Erwartetes Ergebnis:**
- ✅ Branches: < 1 Sekunde (vorher: sehr langsam)
- ✅ Filter Tags: < 1 Sekunde (vorher: 20+ Sekunden)
- ✅ Cache-Hits in Logs

**Logs prüfen:**
```bash
# Sollte zeigen:
# [getUserBranches] ⏱️ Cache-Hit: 2ms | Branches: 5
# [FilterListCache] Cache-Hit für ...
```

---

### Test 4: Requests/Tasks laden

**Ziel:** Prüfen ob Requests und Tasks schnell laden

**Vorgehen:**
1. Auf Requests-Seite navigieren
2. Zeit messen: Von Seitenwechsel bis Requests angezeigt
3. Auf Tasks-Seite navigieren
4. Zeit messen: Von Seitenwechsel bis Tasks angezeigt

**Erwartetes Ergebnis:**
- ✅ Requests: < 1 Sekunde für 20 Einträge (vorher: 19.67 Sekunden)
- ✅ Tasks: < 0.5 Sekunden für 20 Einträge (vorher: 4.36 Sekunden)
- ✅ Keine Re-Render-Loops (CPU sollte nicht auf 100% gehen)

**Logs prüfen:**
```bash
# Sollte zeigen:
# [getAllRequests] ✅ Query abgeschlossen: 20 Requests in 1234ms
# [getAllTasks] ✅ Query abgeschlossen: 20 Tasks in 456ms
```

**Browser prüfen:**
- CPU-Auslastung sollte niedrig sein (< 20%)
- RAM-Verbrauch sollte stabil bleiben
- Keine unendlichen Re-Renders in React DevTools

---

### Test 5: Seitenwechsel (Stress-Test)

**Ziel:** Prüfen ob System nach mehreren Seitenwechseln schnell bleibt

**Vorgehen:**
1. Zwischen verschiedenen Seiten wechseln (Dashboard → Requests → Tasks → Organisation → Dashboard)
2. Jeden Seitenwechsel 5-10x wiederholen
3. Performance bei jedem Wechsel prüfen

**Erwartetes Ergebnis:**
- ✅ System bleibt schnell (keine Verschlechterung)
- ✅ Connection Pool wird nicht voll
- ✅ Keine Memory Leaks (RAM bleibt stabil)

**Logs prüfen:**
```bash
# Sollte zeigen:
# - Keine "Connection Pool Timeout" Fehler
# - Cache-Hits werden häufiger (nach erstem Laden)
# - Timing-Logs zeigen konsistente Performance
```

---

### Test 6: Connection Pool-Monitoring

**Ziel:** Prüfen ob Connection Pool-Monitoring funktioniert

**Vorgehen:**
1. Mehrere Seiten gleichzeitig öffnen (mehrere Tabs)
2. Logs beobachten
3. Pool-Status prüfen

**Erwartetes Ergebnis:**
- ✅ Pool-Monitoring loggt bei hoher Auslastung (> 80%)
- ✅ Keine "Connection Pool Timeout" Fehler
- ✅ Pool-Status wird bei Timeout geloggt

**Logs prüfen:**
```bash
# Sollte zeigen:
# [PoolMonitor] ℹ️ Connection Pool: 15/20 (75.0%)
# [PoolMonitor] ⚠️ Connection Pool hoch ausgelastet: 18/20 (90.0%)
```

---

## 📊 PERFORMANCE-METRIKEN

### Vorher (Baseline):
- ❌ Login-Flow: 20-30 Sekunden
- ❌ Organisation-Tab: 4-5 Minuten, 3GB RAM
- ❌ Branches/Filter Tags: 20+ Sekunden
- ❌ getAllRequests: 19.67 Sekunden für 20 Requests
- ❌ getAllTasks: 4.36 Sekunden für 20 Tasks
- ❌ Connection Pool: Voll (100/100) bei 1 Benutzer
- ❌ CPU: 100% (Re-Render-Loops)
- ❌ RAM: 800MB+ nach Dashboard-Laden

### Nachher (Erwartet):
- ✅ Login-Flow: < 5 Sekunden
- ✅ Organisation-Tab: < 10 Sekunden, < 100 MB RAM
- ✅ Branches/Filter Tags: < 1 Sekunde
- ✅ getAllRequests: < 1 Sekunde für 20 Requests
- ✅ getAllTasks: < 0.5 Sekunden für 20 Tasks
- ✅ Connection Pool: Normal (< 50%) bei 1 Benutzer
- ✅ CPU: < 20% (keine Re-Render-Loops)
- ✅ RAM: < 100 MB nach Dashboard-Laden

---

## 🔍 FEHLERSUCHE

### Problem: System ist immer noch langsam

**Prüfen:**
1. **Logs prüfen:**
   ```bash
   pm2 logs intranet-backend --lines 200 | grep -i "error\|timeout\|pool"
   ```

2. **Connection Pool prüfen:**
   ```bash
   # Auf Server:
   netstat -an | grep :5432 | grep ESTABLISHED | wc -l
   ```

3. **Browser DevTools prüfen:**
   - Network-Tab: Welche Requests sind langsam?
   - Performance-Tab: Gibt es Re-Render-Loops?
   - Memory-Tab: Gibt es Memory Leaks?

### Problem: Connection Pool Timeout

**Prüfen:**
1. **Pool-Status in Logs:**
   ```bash
   pm2 logs intranet-backend | grep "PoolMonitor"
   ```

2. **PostgreSQL-Verbindungen prüfen:**
   ```bash
   # Auf Server:
   sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';"
   ```

### Problem: Cache funktioniert nicht

**Prüfen:**
1. **Cache-Logs prüfen:**
   ```bash
   pm2 logs intranet-backend | grep "Cache-Hit\|Cache-Miss"
   ```

2. **Cache-Implementierung prüfen:**
   - BranchCache verwendet?
   - FilterListCache verwendet?
   - TTLs korrekt?

---

## ✅ ERFOLGS-KRITERIEN

**System ist erfolgreich optimiert, wenn:**
- ✅ Alle Tests bestehen
- ✅ Performance-Metriken erreicht werden
- ✅ Keine kritischen Fehler in Logs
- ✅ Connection Pool bleibt unter 80% Auslastung
- ✅ CPU und RAM bleiben stabil

---

## 📝 TEST-PROTOKOLL

**Datum:** _______________  
**Tester:** _______________  
**Umgebung:** _______________

| Test | Status | Zeit (vorher) | Zeit (nachher) | Notizen |
|------|--------|---------------|----------------|---------|
| Login-Flow | ⬜ | 20-30s | ___s | |
| Organisation-Tab | ⬜ | 4-5min | ___s | |
| Branches | ⬜ | 20+s | ___s | |
| Filter Tags | ⬜ | 20+s | ___s | |
| Requests laden | ⬜ | 19.67s | ___s | |
| Tasks laden | ⬜ | 4.36s | ___s | |
| Seitenwechsel | ⬜ | - | - | |
| Connection Pool | ⬜ | 100/100 | ___/___ | |

**Gesamtbewertung:** ⬜ Erfolgreich | ⬜ Teilweise | ⬜ Fehlgeschlagen

---

## 🚀 NÄCHSTE SCHRITTE

Nach erfolgreichem Test:
1. ✅ Performance-Metriken dokumentieren
2. ✅ Zusammenfassung aller Änderungen erstellen
3. ✅ Monitoring einrichten (optional)
4. ✅ Weitere Optimierungen planen (falls nötig)

