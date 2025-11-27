# Performance-Analyse: System extrem langsam nach executeWithRetry Implementierung (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System extrem langsam nach Neustart  
**Problem:** Seiten laden nicht mehr (auch nach 2 Minuten nicht), RAM-Verbrauch 600MB-3GB+

---

## 🔴🔴🔴 PROBLEM-BESCHREIBUNG

**Nach Neustart:**
- ✅ System läuft wieder
- ❌ **Extrem langsam** - Seiten laden nicht mehr (auch nach 2 Minuten nicht)
- ❌ **Hoher RAM-Verbrauch** - 600MB bis über 3GB
- ❌ **Teils gar nicht mehr ladend** - Timeouts

**Vorher (vor executeWithRetry Implementierung):**
- System war langsam, aber funktionierte
- RAM-Verbrauch war hoch, aber nicht so extrem

**Nachher (nach executeWithRetry Implementierung):**
- System ist **noch langsamer**
- RAM-Verbrauch ist **noch höher**
- Seiten laden **gar nicht mehr**

---

## 🔍 ANALYSE: WAS KÖNNTE DAS PROBLEM SEIN?

### Mögliche Ursache 1: Zu viele executeWithRetry Aufrufe pro Request

**createTask macht jetzt:**
1. `executeWithRetry(() => prisma.user.findFirst(...))` - responsibleUser
2. `executeWithRetry(() => prisma.user.findFirst(...))` - qualityControlUser
3. `executeWithRetry(() => prisma.task.create(...))` - task erstellen
4. `getUserLanguage(responsibleId)` - **INTERN: executeWithRetry** (1-2 DB-Queries, je nach Cache)
5. `createNotificationIfEnabled(...)` - **INTERN: executeWithRetry** (1 DB-Query) ✅ IMPLEMENTIERT
6. `getUserLanguage(qualityControlId)` - **INTERN: executeWithRetry** (1-2 DB-Queries, je nach Cache)
7. `createNotificationIfEnabled(...)` - **INTERN: executeWithRetry** (1 DB-Query) ✅ IMPLEMENTIERT

**Gesamt: 3 direkte + 4 indirekte = 7 executeWithRetry Aufrufe pro createTask!**

**⚠️ KRITISCH:**
- `getUserLanguage` macht **1-2 executeWithRetry Aufrufe** (je nach Cache-Status)
- `createNotificationIfEnabled` macht **1 executeWithRetry Aufruf** (prisma.notification.create)
- Bei Cache-Miss in getUserLanguage = **2 executeWithRetry Aufrufe** (User.language Query + User mit Roles Query)
- **Gesamt: 3 direkte + 2-4 indirekte = 5-7 executeWithRetry Aufrufe pro createTask!**

**Problem:**
- Wenn DB-Verbindung instabil ist → **Jeder executeWithRetry kann 3 Retries machen**
- Bei 7 executeWithRetry Aufrufen = **21 potenzielle Retries**
- Jeder Retry hat Delay (1s, 2s, 3s) = **Bis zu 6 Sekunden pro executeWithRetry**
- Gesamt: **7 × 6 Sekunden = 42 Sekunden** bei DB-Fehlern! ⚠️

---

### Mögliche Ursache 2: Verschachtelte executeWithRetry Aufrufe

**createTask Flow:**
```typescript
// 1. executeWithRetry (responsibleUser)
await executeWithRetry(() => prisma.user.findFirst(...));

// 2. executeWithRetry (qualityControlUser)
await executeWithRetry(() => prisma.user.findFirst(...));

// 3. executeWithRetry (task.create)
await executeWithRetry(() => prisma.task.create(...));

// 4. getUserLanguage - INTERN: executeWithRetry
const userLang = await getUserLanguage(taskData.responsibleId);
  // → executeWithRetry(() => prisma.user.findUnique(...))
  // → executeWithRetry(() => prisma.user.findUnique(...)) // Falls User.language leer

// 5. createNotificationIfEnabled - INTERN: executeWithRetry
await createNotificationIfEnabled({...});
  // → executeWithRetry(() => prisma.notification.create(...))

// 6. getUserLanguage - INTERN: executeWithRetry
const userLang = await getUserLanguage(taskData.qualityControlId);
  // → executeWithRetry(() => prisma.user.findUnique(...))
  // → executeWithRetry(() => prisma.user.findUnique(...)) // Falls User.language leer

// 7. createNotificationIfEnabled - INTERN: executeWithRetry
await createNotificationIfEnabled({...});
  // → executeWithRetry(() => prisma.notification.create(...))
```

**Problem:**
- **Verschachtelte executeWithRetry Aufrufe** können zu **kaskadierenden Verzögerungen** führen
- Wenn die erste DB-Query fehlschlägt → Retry → Delay → Dann nächste Query → Retry → Delay → ...
- **Gesamtzeit kann exponentiell wachsen**

---

### Mögliche Ursache 3: Memory Leaks durch executeWithRetry

**Mögliche Probleme:**
1. **Zu viele Promise-Objekte** - Jeder executeWithRetry erstellt Promise-Objekte
2. **Timeout-Objekte nicht aufgeräumt** - `setTimeout` in executeWithRetry könnte Memory Leaks verursachen
3. **Error-Objekte nicht aufgeräumt** - `lastError` wird gespeichert, könnte Memory Leaks verursachen
4. **Zu viele parallele Requests** - Wenn viele Requests gleichzeitig kommen, könnte jeder Request mehrere executeWithRetry Aufrufe machen

**RAM-Verbrauch:**
- **600MB-3GB+** ist extrem hoch für ein Node.js Backend
- Normalerweise sollte ein Node.js Backend **100-500MB** RAM verwenden
- **3GB+** deutet auf **Memory Leaks** hin

---

### Mögliche Ursache 4: Connection Pool wird überlastet

**Problem:**
- **Zu viele parallele DB-Queries** mit executeWithRetry
- Jeder executeWithRetry kann **3 Retries** machen
- Bei vielen gleichzeitigen Requests = **Connection Pool wird überlastet**
- Requests warten auf freie Verbindungen → **Timeouts**

**Connection Pool:**
- `connection_limit=20` (ausreichend für normale Last)
- Aber: Wenn viele Requests gleichzeitig kommen und jeder mehrere executeWithRetry Aufrufe macht = **Connection Pool wird schnell voll**

---

### Mögliche Ursache 5: Retry-Logik blockiert das System

**Problem:**
- Auch ohne disconnect/connect kann die Retry-Logik das System blockieren
- **Delays (1s, 2s, 3s)** halten Requests offen
- Bei vielen gleichzeitigen Requests = **Viele Requests warten auf Retries**
- **Event Loop wird blockiert** → System wird langsam

---

## 📊 ANALYSE: WIE VIELE executeWithRetry AUFRUFE GIBT ES?

### createTask:
- **3 direkte executeWithRetry Aufrufe**
- **4 indirekte executeWithRetry Aufrufe** (getUserLanguage × 2, createNotificationIfEnabled × 2)
- **Gesamt: 7 executeWithRetry Aufrufe**

### updateTask:
- **6 direkte executeWithRetry Aufrufe**
- **Potenzielle indirekte executeWithRetry Aufrufe** (getUserLanguage, createNotificationIfEnabled)
- **Gesamt: 6+ executeWithRetry Aufrufe**

### createRequest:
- **4 direkte executeWithRetry Aufrufe**
- **Potenzielle indirekte executeWithRetry Aufrufe** (getUserLanguage, createNotificationIfEnabled)
- **Gesamt: 4+ executeWithRetry Aufrufe**

### savedFilterController:
- **15+ executeWithRetry Aufrufe** in verschiedenen Funktionen

**Gesamt: 30+ executeWithRetry Aufrufe wurden implementiert!**

---

## 🔍 NÄCHSTE SCHRITTE FÜR DETAILLIERTE ANALYSE

### 1. Server-Logs prüfen

**Was zu prüfen:**
- Wie oft wird `[Prisma] DB connection error` geloggt?
- Wie oft wird `[Prisma] Retrying after` geloggt?
- Gibt es viele parallele Retries?
- Gibt es Timeouts?

**Logs prüfen:**
```bash
pm2 logs intranet-backend --lines 200 | grep -i "prisma\|retry\|error\|timeout"
```

---

### 2. Browser-Performance analysieren

**Was zu prüfen:**
- Network-Tab: Welche Requests dauern lange?
- Performance-Tab: Wo wird Zeit verbracht?
- Memory-Tab: Gibt es Memory Leaks im Frontend?

**Browser-Tools:**
- Chrome DevTools → Network Tab
- Chrome DevTools → Performance Tab
- Chrome DevTools → Memory Tab

---

### 3. executeWithRetry Aufrufe zählen

**Was zu prüfen:**
- Wie viele executeWithRetry Aufrufe werden pro Request gemacht?
- Gibt es verschachtelte executeWithRetry Aufrufe?
- Werden executeWithRetry Aufrufe parallel oder sequenziell gemacht?

**Code-Analyse:**
- `createTask` macht 7 executeWithRetry Aufrufe
- `updateTask` macht 6+ executeWithRetry Aufrufe
- `createRequest` macht 4+ executeWithRetry Aufrufe

---

### 4. Memory Leaks prüfen

**Was zu prüfen:**
- Gibt es Memory Leaks durch executeWithRetry?
- Werden Promise-Objekte richtig aufgeräumt?
- Werden Timeout-Objekte richtig aufgeräumt?
- Werden Error-Objekte richtig aufgeräumt?

**Memory-Analyse:**
- Node.js Memory Profiling
- Heap Snapshots
- Memory Leak Detection

---

### 5. Connection Pool Status prüfen

**Was zu prüfen:**
- Wie viele Verbindungen werden verwendet?
- Gibt es Connection Pool Timeouts?
- Werden Verbindungen richtig freigegeben?

**Connection Pool Monitoring:**
- Prisma Query Logging
- Database Connection Monitoring
- Connection Pool Statistics

---

## ⚠️ MÖGLICHE LÖSUNGEN (NUR ANALYSE, NOCH NICHT UMSETZEN!)

### Lösung 1: executeWithRetry nur bei kritischen Operationen

**Was:**
- executeWithRetry nur bei **CREATE/UPDATE/DELETE** Operationen
- **NICHT** bei Validierungs-Queries (findFirst, findUnique)
- **NICHT** bei getUserLanguage (kann gecacht werden)
- **NICHT** bei createNotificationIfEnabled (kann asynchron gemacht werden)

**Vorteil:**
- Weniger executeWithRetry Aufrufe pro Request
- Schnellere Requests
- Weniger Memory-Verbrauch

---

### Lösung 2: getUserLanguage cachen

**Was:**
- getUserLanguage verwendet bereits `userLanguageCache`
- Aber: executeWithRetry wird trotzdem bei Cache-Miss aufgerufen
- **Problem:** Cache-Miss führt zu executeWithRetry

**Lösung:**
- Cache-TTL erhöhen
- Oder: executeWithRetry nur bei kritischen Fehlern

---

### Lösung 3: createNotificationIfEnabled asynchron machen

**Was:**
- createNotificationIfEnabled wird synchron aufgerufen
- **Problem:** Blockiert Request, auch wenn Notification nicht kritisch ist

**Lösung:**
- createNotificationIfEnabled asynchron machen (fire-and-forget)
- Oder: executeWithRetry entfernen (Notifications sind nicht kritisch)

---

### Lösung 4: executeWithRetry nur bei DB-Verbindungsfehlern

**Was:**
- executeWithRetry wird aktuell bei **allen** DB-Fehlern aufgerufen
- **Problem:** Auch bei nicht-kritischen Fehlern (z.B. Validation-Fehler)

**Lösung:**
- executeWithRetry nur bei **DB-Verbindungsfehlern** (P1001, P1008)
- **NICHT** bei anderen Fehlern (z.B. P2002 - Unique Constraint)

---

### Lösung 5: Retry-Logik optimieren

**Was:**
- Aktuell: 3 Retries mit Delays (1s, 2s, 3s)
- **Problem:** Bei vielen parallelen Requests = Viele Retries = System wird langsam

**Lösung:**
- Retry-Anzahl reduzieren (2 statt 3)
- Retry-Delay reduzieren (500ms statt 1000ms)
- Exponential Backoff optimieren

---

## 📋 ZUSAMMENFASSUNG

### Identifizierte Probleme:

1. **Zu viele executeWithRetry Aufrufe pro Request** (7+ bei createTask)
2. **Verschachtelte executeWithRetry Aufrufe** (getUserLanguage, createNotificationIfEnabled)
3. **Mögliche Memory Leaks** (RAM-Verbrauch 600MB-3GB+)
4. **Connection Pool könnte überlastet sein** (zu viele parallele Queries)
5. **Retry-Logik blockiert das System** (Delays halten Requests offen)

### Nächste Schritte:

1. ✅ **Server-Logs prüfen** - Wie oft wird retried?
2. ✅ **Browser-Performance analysieren** - Welche Requests dauern lange?
3. ✅ **executeWithRetry Aufrufe zählen** - Wie viele pro Request?
4. ✅ **Memory Leaks prüfen** - Gibt es Memory Leaks?
5. ✅ **Connection Pool Status prüfen** - Wird Connection Pool überlastet?

---

**Erstellt:** 2025-01-26  
**Status:** 🔍 Analyse in Arbeit  
**Nächster Schritt:** Server-Logs und Browser-Performance analysieren

