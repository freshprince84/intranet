# Performance-Test: Befehle zum Ausführen (2025-01-26)

**Status:** ✅ Alle Optimierungen implementiert  
**Zweck:** System testen und Performance validieren

---

## 📋 SCHRITT 1: BACKEND BAUEN

```bash
cd /var/www/intranet/backend
npm run build
```

**Erwartetes Ergebnis:**
- ✅ Keine TypeScript-Fehler
- ✅ Build erfolgreich

**Bei Fehlern:** Fehlermeldung senden

---

## 📋 SCHRITT 2: SERVER NEU STARTEN

```bash
cd /var/www/intranet
pm2 restart intranet-backend --update-env
```

**Erwartetes Ergebnis:**
- ✅ Server startet erfolgreich
- ✅ Keine Fehler beim Start

**Prüfen:**
```bash
pm2 status
```

**Sollte zeigen:**
- `intranet-backend` Status: `online`

---

## 📋 SCHRITT 3: LOGS ÜBERWACHEN (In separatem Terminal)

```bash
pm2 logs intranet-backend --lines 50
```

**Lass dieses Terminal offen** - wir beobachten die Logs während der Tests.

**Was wir sehen sollten:**
- ✅ Cache-Hits für User/Organization
- ✅ Timing-Logs für kritische Endpoints
- ✅ Keine "Connection Pool Timeout" Fehler
- ✅ Pool-Monitoring-Logs

---

## 📋 SCHRITT 4: SYSTEM TESTEN

### Test 1: Login-Flow

**Vorgehen:**
1. Browser öffnen (Inkognito-Modus)
2. Auf Login-Seite navigieren: `https://65.109.228.106.nip.io/`
3. Login durchführen
4. **Zeit messen:** Von Login-Button-Klick bis Dashboard geladen

**Erwartetes Ergebnis:**
- ✅ Login-Flow: < 5 Sekunden (vorher: 20-30 Sekunden)
- ✅ Dashboard lädt vollständig
- ✅ Keine Fehler in Browser-Console

**In Logs prüfen:**
```bash
# Sollte zeigen:
# - Cache-Hits für User/Organization
# - Keine "Connection Pool Timeout" Fehler
# - Timing-Logs
```

**Rückmeldung:**
- ⏱️ **Login-Zeit:** _____ Sekunden
- ✅ **Erfolgreich:** Ja / Nein
- 📝 **Fehler:** (falls vorhanden)

---

### Test 2: Organisation-Tab

**Vorgehen:**
1. Auf Organisation-Seite navigieren
2. **Zeit messen:** Von Seitenwechsel bis Tab vollständig geladen
3. Browser DevTools öffnen (F12) → Memory-Tab
4. RAM-Verbrauch notieren

**Erwartetes Ergebnis:**
- ✅ Organisation-Tab: < 10 Sekunden (vorher: 4-5 Minuten)
- ✅ RAM-Verbrauch: < 100 MB (vorher: 3GB)
- ✅ Settings werden NICHT beim initialen Laden geladen

**In Logs prüfen:**
```bash
# Sollte zeigen:
# [getAllBranches] ⏱️ Query: ...ms | Branches: ...
# [getUserBranches] ⏱️ Cache-Hit: ...ms | Branches: ...
# KEINE Settings-Query beim initialen Laden
```

**Rückmeldung:**
- ⏱️ **Lade-Zeit:** _____ Sekunden
- 💾 **RAM-Verbrauch:** _____ MB
- ✅ **Erfolgreich:** Ja / Nein

---

### Test 3: Branches laden

**Vorgehen:**
1. Auf Seite mit Branches navigieren (z.B. Dashboard)
2. Branches-Dropdown öffnen
3. **Zeit messen:** Von Klick bis Branches angezeigt

**Erwartetes Ergebnis:**
- ✅ Branches: < 1 Sekunde (vorher: sehr langsam)
- ✅ Cache-Hit in Logs

**Rückmeldung:**
- ⏱️ **Lade-Zeit:** _____ Sekunden
- ✅ **Erfolgreich:** Ja / Nein

---

### Test 4: Filter Tags laden

**Vorgehen:**
1. Auf Seite mit Filter Tags navigieren (z.B. Worktracker oder Requests)
2. **Zeit messen:** Von Seitenwechsel bis Filter Tags angezeigt

**Erwartetes Ergebnis:**
- ✅ Filter Tags: < 1 Sekunde (vorher: 20+ Sekunden)
- ✅ Cache-Hit in Logs

**Rückmeldung:**
- ⏱️ **Lade-Zeit:** _____ Sekunden
- ✅ **Erfolgreich:** Ja / Nein

---

### Test 5: Requests laden

**Vorgehen:**
1. Auf Requests-Seite navigieren
2. **Zeit messen:** Von Seitenwechsel bis Requests angezeigt
3. Anzahl geladener Requests notieren

**Erwartetes Ergebnis:**
- ✅ Requests: < 1 Sekunde für 20 Einträge (vorher: 19.67 Sekunden)
- ✅ Timing-Log in Logs

**In Logs prüfen:**
```bash
# Sollte zeigen:
# [getAllRequests] ✅ Query abgeschlossen: 20 Requests in 1234ms
```

**Rückmeldung:**
- ⏱️ **Lade-Zeit:** _____ Sekunden
- 📊 **Anzahl Requests:** _____
- ✅ **Erfolgreich:** Ja / Nein

---

### Test 6: Tasks laden

**Vorgehen:**
1. Auf Tasks-Seite navigieren (Worktracker)
2. **Zeit messen:** Von Seitenwechsel bis Tasks angezeigt
3. Anzahl geladener Tasks notieren

**Erwartetes Ergebnis:**
- ✅ Tasks: < 0.5 Sekunden für 20 Einträge (vorher: 4.36 Sekunden)
- ✅ Timing-Log in Logs

**In Logs prüfen:**
```bash
# Sollte zeigen:
# [getAllTasks] ✅ Query abgeschlossen: 20 Tasks in 456ms
```

**Rückmeldung:**
- ⏱️ **Lade-Zeit:** _____ Sekunden
- 📊 **Anzahl Tasks:** _____
- ✅ **Erfolgreich:** Ja / Nein

---

### Test 7: Seitenwechsel (Stress-Test)

**Vorgehen:**
1. Zwischen verschiedenen Seiten wechseln:
   - Dashboard → Requests → Tasks → Organisation → Dashboard
2. Jeden Seitenwechsel 5-10x wiederholen
3. Performance bei jedem Wechsel prüfen

**Erwartetes Ergebnis:**
- ✅ System bleibt schnell (keine Verschlechterung)
- ✅ Keine "Connection Pool Timeout" Fehler
- ✅ RAM bleibt stabil

**Rückmeldung:**
- ✅ **Erfolgreich:** Ja / Nein
- 📝 **Probleme:** (falls vorhanden)

---

### Test 8: Connection Pool-Monitoring

**Vorgehen:**
1. Mehrere Seiten gleichzeitig öffnen (mehrere Tabs)
2. Logs beobachten

**In Logs prüfen:**
```bash
# Sollte zeigen:
# [PoolMonitor] ℹ️ Connection Pool: 15/20 (75.0%)
# ODER
# [PoolMonitor] ⚠️ Connection Pool hoch ausgelastet: 18/20 (90.0%)
```

**Rückmeldung:**
- 📊 **Pool-Auslastung:** _____ / _____ (_____%)
- ✅ **Erfolgreich:** Ja / Nein

---

## 📋 SCHRITT 5: LOGS AUSWERTEN

### Timing-Logs prüfen

```bash
pm2 logs intranet-backend --lines 200 | grep "⏱️\|Query abgeschlossen"
```

**Sollte zeigen:**
- Timing-Logs für alle kritischen Endpoints
- Query-Dauern sollten < 1 Sekunde sein

### Cache-Hits prüfen

```bash
pm2 logs intranet-backend --lines 200 | grep "Cache-Hit\|Cache-Miss"
```

**Sollte zeigen:**
- Viele Cache-Hits (nach erstem Laden)
- Cache-Miss nur beim ersten Laden

### Fehler prüfen

```bash
pm2 logs intranet-backend --lines 200 | grep -i "error\|timeout\|pool"
```

**Sollte zeigen:**
- ✅ Keine "Connection Pool Timeout" Fehler
- ✅ Keine kritischen Fehler

### Pool-Monitoring prüfen

```bash
pm2 logs intranet-backend --lines 200 | grep "PoolMonitor"
```

**Sollte zeigen:**
- Pool-Status-Logs
- Auslastung sollte < 80% sein

---

## 📋 SCHRITT 6: PERFORMANCE-METRIKEN SAMMELN

**Fülle diese Tabelle aus:**

| Test | Zeit (vorher) | Zeit (nachher) | Verbesserung | Status |
|------|---------------|----------------|--------------|--------|
| Login-Flow | 20-30s | _____s | _____% | ⬜ |
| Organisation-Tab | 4-5min | _____s | _____% | ⬜ |
| Branches | 20+s | _____s | _____% | ⬜ |
| Filter Tags | 20+s | _____s | _____% | ⬜ |
| Requests laden | 19.67s | _____s | _____% | ⬜ |
| Tasks laden | 4.36s | _____s | _____% | ⬜ |
| Connection Pool | 100/100 | _____/_____ | _____% | ⬜ |
| RAM (Org-Tab) | 3GB | _____MB | _____% | ⬜ |

---

## 📋 SCHRITT 7: ZUSAMMENFASSUNG

**Bitte sende mir:**
1. ✅ Alle Test-Ergebnisse (Zeiten, Status)
2. ✅ Log-Auswertung (Timing-Logs, Cache-Hits, Fehler)
3. ✅ Performance-Metriken (Tabelle)
4. ✅ Probleme/Fehler (falls vorhanden)

---

## 🔍 BEI PROBLEMEN

### Problem: System ist immer noch langsam

**Prüfen:**
```bash
# Logs prüfen
pm2 logs intranet-backend --lines 200 | grep -i "error\|timeout\|pool"

# Connection Pool prüfen
netstat -an | grep :5432 | grep ESTABLISHED | wc -l
```

**Rückmeldung:** Fehlermeldungen senden

### Problem: Connection Pool Timeout

**Prüfen:**
```bash
# Pool-Status in Logs
pm2 logs intranet-backend | grep "PoolMonitor"

# PostgreSQL-Verbindungen prüfen
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';"
```

**Rückmeldung:** Pool-Status senden

### Problem: Cache funktioniert nicht

**Prüfen:**
```bash
# Cache-Logs prüfen
pm2 logs intranet-backend | grep "Cache-Hit\|Cache-Miss"
```

**Rückmeldung:** Cache-Logs senden

---

## ✅ ERFOLGS-KRITERIEN

**System ist erfolgreich optimiert, wenn:**
- ✅ Alle Tests bestehen
- ✅ Performance-Metriken erreicht werden
- ✅ Keine kritischen Fehler in Logs
- ✅ Connection Pool bleibt unter 80% Auslastung
- ✅ CPU und RAM bleiben stabil

---

**Viel Erfolg beim Testen! 🚀**

