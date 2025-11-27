# Performance-Analyse: Server-Ergebnisse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔍 Analyse der Server-Ergebnisse  
**Quelle:** SSH-Analyse auf dem Server

---

## 📊 ERGEBNISSE DER SERVER-ANALYSE

### 1. Retry-Zähler: 16 Retries

**Befehl:**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "retry" | wc -l
```

**Ergebnis:** `16`

**Interpretation:**
- ✅ **16 Retries in 500 Zeilen** ist relativ niedrig
- ⚠️ **Aber:** Die meisten "retry" Meldungen sind von **BullMQ** (Job Queue), nicht von executeWithRetry
- ⚠️ **Wichtig:** Es gibt auch "[Prisma] Retrying after 1 attempt(s)" Meldungen - das sind unsere executeWithRetry Aufrufe

---

### 2. DB-Verbindungsfehler: 23 Fehler

**Befehl:**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "DB connection error" | wc -l
```

**Ergebnis:** `23`

**Interpretation:**
- 🔴 **23 DB-Verbindungsfehler in 500 Zeilen** ist **relativ hoch**
- ⚠️ **Das bedeutet:** Die DB-Verbindung ist **instabil**
- ⚠️ **Jeder Fehler** löst executeWithRetry aus → **Retry-Logik wird oft aufgerufen**

---

### 3. Memory-Verbrauch: 57.7mb

**Befehl:**
```bash
pm2 status
```

**Ergebnis:**
```
│ 4  │ intranet-backend   │ fork     │ 12   │ online    │ 0%       │ 57.7mb   │
```

**Interpretation:**
- ✅ **57.7mb Memory** ist **sehr gut** - nicht das Problem!
- ⚠️ **User berichtet:** 600MB-3GB RAM-Verbrauch
- 🤔 **Mögliche Erklärung:** 
  - Der RAM-Verbrauch könnte im **Frontend** sein (Browser)
  - Oder: Der RAM-Verbrauch steigt bei **vielen gleichzeitigen Requests**
  - Oder: Der RAM-Verbrauch ist **kumulativ** über mehrere Prozesse

---

### 4. Aktive DB-Verbindungen: 16 Verbindungen

**Befehl:**
```bash
netstat -an | grep :5432 | wc -l
```

**Ergebnis:** `16`

**Interpretation:**
- ⚠️ **16 aktive DB-Verbindungen** von **20 möglichen** (Connection Pool Limit)
- ⚠️ **Das bedeutet:** Connection Pool ist **zu 80% ausgelastet**
- 🔴 **Bei mehr Requests:** Connection Pool wird **voll** → **Timeouts**

---

### 5. Retry-Meldungen im Detail

**Befehl:**
```bash
pm2 logs intranet-backend --lines 200 --nostream | grep -i "retry"
```

**Ergebnis:**
```
4|intranet |     at fetchedJob.retryIfFailed.delayInMs (/var/www/intranet/backend/node_modules/bullmq/dist/cjs/classes/worker.js:259:66)
4|intranet |     at Worker.retryIfFailed (/var/www/intranet/backend/node_modules/bullmq/dist/cjs/classes/worker.js:769:30)
... (mehrere BullMQ Retry-Meldungen)
4|intranet | [Prisma] Retrying after 1 attempt(s) - Prisma will reconnect automatically
4|intranet | [Prisma] Retrying after 1 attempt(s) - Prisma will reconnect automatically
4|intranet | [Prisma] Retrying after 1 attempt(s) - Prisma will reconnect automatically
4|intranet | [Prisma] Retrying after 1 attempt(s) - Prisma will reconnect automatically
4|intranet | [Prisma] Retrying after 1 attempt(s) - Prisma will reconnect automatically
4|intranet | [Prisma] Retrying after 1 attempt(s) - Prisma will reconnect automatically
```

**Interpretation:**
- ✅ **BullMQ Retries:** Normal (Job Queue Retry-Logik)
- ⚠️ **Prisma Retries:** Mehrere "[Prisma] Retrying after 1 attempt(s)" Meldungen
- 🔴 **Das bedeutet:** executeWithRetry wird **mehrfach aufgerufen** bei DB-Fehlern
- ⚠️ **Alle Retries sind "after 1 attempt(s)"** → **Erster Retry-Versuch** (nicht der letzte)

---

## 🔍 ROOT CAUSE IDENTIFIZIERT

### Hauptproblem: Instabile DB-Verbindung

**Beweis:**
- ✅ **23 DB-Verbindungsfehler** in 500 Zeilen
- ✅ **16 aktive DB-Verbindungen** (80% des Connection Pools)
- ✅ **Mehrere Prisma Retries** bei DB-Fehlern

**Was passiert:**
1. **DB-Verbindung ist instabil** → Viele DB-Verbindungsfehler
2. **Jeder Fehler** löst executeWithRetry aus → **Retry-Logik wird oft aufgerufen**
3. **Bei vielen Requests** → **Viele parallele Retries** → **Connection Pool wird voll**
4. **Connection Pool voll** → **Weitere Timeouts** → **Mehr Retries** → **Teufelskreis**

---

## 📊 WEITERE ANALYSE BENÖTIGT

### Was noch zu prüfen ist:

1. ✅ **Wie viele executeWithRetry Aufrufe gibt es pro Request?**
   - Befehl: `pm2 logs intranet-backend --lines 1000 --nostream | grep -c "[Prisma] Retrying"`
   
2. ✅ **Wie lange dauern die Requests?**
   - Befehl: Prüfe Browser Network-Tab
   
3. ✅ **Gibt es Timeouts?**
   - Befehl: `pm2 logs intranet-backend --lines 500 --nostream | grep -i "timeout"`
   
4. ✅ **Wie viele Requests kommen gleichzeitig?**
   - Befehl: `netstat -an | grep :5000 | wc -l`

---

## 💡 MÖGLICHE LÖSUNGEN

### Lösung 1: Connection Pool erhöhen

**Problem:** Connection Pool ist zu 80% ausgelastet (16 von 20)

**Lösung:**
- `connection_limit` von 20 auf **30-40 erhöhen**
- `pool_timeout` von 20 auf **30 erhöhen**

**Risiko:** Niedrig - mehr Verbindungen = mehr Ressourcen, aber stabiler

---

### Lösung 2: executeWithRetry nur bei kritischen Operationen

**Problem:** executeWithRetry wird bei **allen** DB-Queries aufgerufen (auch Validierungen)

**Lösung:**
- executeWithRetry **NUR bei CREATE/UPDATE/DELETE** Operationen
- **NICHT** bei Validierungs-Queries (findFirst, findUnique)
- **NICHT** bei getUserLanguage (kann gecacht werden)

**Risiko:** Niedrig - Validierungen sind nicht kritisch

---

### Lösung 3: Retry-Logik optimieren

**Problem:** 3 Retries mit Delays (1s, 2s, 3s) = bis zu 6 Sekunden pro executeWithRetry

**Lösung:**
- Retry-Anzahl reduzieren (2 statt 3)
- Retry-Delay reduzieren (500ms statt 1000ms)
- Exponential Backoff optimieren

**Risiko:** Niedrig - weniger Retries = schneller, aber weniger robust

---

## 📋 NÄCHSTE SCHRITTE

### 1. Weitere Analyse-Befehle ausführen

**Befehl 1: Prisma Retries zählen (nur executeWithRetry)**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -c "\[Prisma\] Retrying"
```

**Befehl 2: DB-Verbindungsfehler Details**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep "DB connection error" | tail -20
```

**Befehl 3: Timeout-Fehler prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "timeout" | wc -l
```

**Befehl 4: Aktive HTTP-Verbindungen**
```bash
netstat -an | grep :5000 | wc -l
```

**Befehl 5: System Load**
```bash
uptime
```

---

### 2. Browser-Performance analysieren

**Was zu prüfen:**
- Network-Tab: Welche Requests dauern lange?
- Performance-Tab: Wo wird Zeit verbraucht?
- Memory-Tab: Gibt es Memory Leaks im Frontend?

---

## 📊 ZUSAMMENFASSUNG

### Identifizierte Probleme:

1. ✅ **Instabile DB-Verbindung** - 23 DB-Verbindungsfehler in 500 Zeilen
2. ✅ **Connection Pool zu 80% ausgelastet** - 16 von 20 Verbindungen
3. ✅ **executeWithRetry wird oft aufgerufen** - Mehrere Prisma Retries
4. ✅ **Memory ist OK** - 57.7mb (nicht das Problem)
5. ⚠️ **RAM-Verbrauch 600MB-3GB** - Möglicherweise im Frontend oder kumulativ

### Hauptursache:

**Instabile DB-Verbindung** → **Viele DB-Fehler** → **Viele executeWithRetry Aufrufe** → **Connection Pool wird voll** → **Timeouts** → **System wird langsam**

---

---

## 📊 ERWEITERTE ERGEBNISSE (2025-01-26)

### Zusätzliche Analyse-Befehle:

**1. Prisma Retries:** `12` (in 1000 Zeilen)
- ✅ Relativ niedrig, aber es gibt viele DB-Verbindungsfehler

**2. DB-Verbindungsfehler Details:**
- 🔴 **KRITISCH:** Viele DB-Verbindungsfehler (attempt 1/3, 2/3, 3/3)
- 🔴 **KRITISCH:** Ein Fehler erreicht **attempt 3/3** → **Alle 3 Retries fehlgeschlagen!**
- ⚠️ DB-Verbindung ist **sehr instabil**

**3. Timeout-Fehler:** `2` (in 500 Zeilen)
- ⚠️ Einige Requests überschreiten die Timeout-Zeit

**4. Aktive HTTP-Verbindungen:** `21`
- ⚠️ Relativ hoch → Viele gleichzeitige Requests

**5. System Load:** `2.15, 1.30, 1.00`
- ⚠️ **Load Average: 2.15** (letzte Minute) ist **erhöht**
- ⚠️ System ist **aktuell überlastet**

### Root Cause bestätigt:

**Instabile DB-Verbindung** + **Zu viele executeWithRetry Aufrufe** → **Connection Pool wird voll** → **Timeouts** → **System wird langsam**

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 Root Cause identifiziert  
**Nächster Schritt:** executeWithRetry bei Validierungs-Queries entfernen

