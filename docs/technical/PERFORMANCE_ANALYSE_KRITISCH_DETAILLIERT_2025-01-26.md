# Performance-Analyse: System extrem langsam - Detaillierte Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Detaillierte Analyse  
**Problem:** Seiten laden nicht mehr (auch nach 2 Minuten nicht), RAM-Verbrauch 600MB-3GB+

---

## 🔴🔴🔴 ROOT CAUSE IDENTIFIZIERT

### Problem: Zu viele executeWithRetry Aufrufe pro Request

**createTask macht:**
1. ✅ `executeWithRetry(() => prisma.user.findFirst(...))` - responsibleUser (Validierung)
2. ✅ `executeWithRetry(() => prisma.user.findFirst(...))` - qualityControlUser (Validierung)
3. ✅ `executeWithRetry(() => prisma.task.create(...))` - task erstellen
4. ✅ `getUserLanguage(responsibleId)` - **INTERN: 1-2 executeWithRetry Aufrufe**
   - Cache-Hit: **0 executeWithRetry Aufrufe** ✅
   - Cache-Miss: **1-2 executeWithRetry Aufrufe** (User.language Query + ggf. User mit Roles Query)
5. ✅ `createNotificationIfEnabled(...)` - **INTERN: 1 executeWithRetry Aufruf** (prisma.notification.create)
6. ✅ `getUserLanguage(qualityControlId)` - **INTERN: 1-2 executeWithRetry Aufrufe**
7. ✅ `createNotificationIfEnabled(...)` - **INTERN: 1 executeWithRetry Aufruf**

**Gesamt pro createTask:**
- **Best Case (alle Caches Hit):** 3 direkte + 2 indirekte = **5 executeWithRetry Aufrufe**
- **Worst Case (alle Caches Miss):** 3 direkte + 6 indirekte = **9 executeWithRetry Aufrufe**

**Bei DB-Fehlern:**
- Jeder executeWithRetry kann **3 Retries** machen
- Jeder Retry hat Delay (1s, 2s, 3s) = **Bis zu 6 Sekunden pro executeWithRetry**
- **Worst Case: 9 × 6 Sekunden = 54 Sekunden** bei DB-Fehlern! ⚠️

---

## 🔴 PROBLEM 1: executeWithRetry bei Validierungs-Queries

**Problem:**
- `prisma.user.findFirst` für Validierung (responsibleUser, qualityControlUser)
- Diese Queries sind **nicht kritisch** - können auch ohne Retry funktionieren
- **Aber:** executeWithRetry wird trotzdem aufgerufen

**Impact:**
- Bei DB-Fehlern: **2 zusätzliche executeWithRetry Aufrufe** pro createTask
- Bei vielen Requests = **Viele parallele Retries** = System wird langsam

**Lösung:**
- executeWithRetry **NUR bei kritischen Operationen** (CREATE/UPDATE/DELETE)
- **NICHT** bei Validierungs-Queries (findFirst, findUnique)

---

## 🔴 PROBLEM 2: getUserLanguage macht 1-2 executeWithRetry Aufrufe

**Problem:**
- `getUserLanguage` macht **1-2 executeWithRetry Aufrufe** (je nach Cache-Status)
- Cache-Hit: **0 executeWithRetry Aufrufe** ✅
- Cache-Miss: **1-2 executeWithRetry Aufrufe** (User.language Query + ggf. User mit Roles Query)

**Code:**
```typescript
// 1. Cache prüfen (schnell!)
const cached = userLanguageCache.get(userId);
if (cached !== null) {
  return cached; // ✅ Kein executeWithRetry
}

// 2. User.language Query (executeWithRetry)
const user = await executeWithRetry(() =>
  prisma.user.findUnique({ where: { id: userId }, select: { language: true } })
);

// 3. Falls User.language leer: User mit Roles Query (executeWithRetry)
const userWithRoles = await executeWithRetry(() =>
  prisma.user.findUnique({ where: { id: userId }, select: { roles: {...} } })
);
```

**Impact:**
- Bei Cache-Miss: **1-2 executeWithRetry Aufrufe** pro getUserLanguage
- Bei createTask: **2-4 executeWithRetry Aufrufe** (getUserLanguage × 2)
- Bei vielen Requests = **Viele parallele Retries** = System wird langsam

**Lösung:**
- getUserLanguage Cache-TTL erhöhen (aktuell 10 Minuten)
- Oder: executeWithRetry **NUR bei kritischen Fehlern** (nicht bei Cache-Miss)

---

## 🔴 PROBLEM 3: createNotificationIfEnabled macht executeWithRetry

**Problem:**
- `createNotificationIfEnabled` macht **1 executeWithRetry Aufruf** (prisma.notification.create)
- Notifications sind **nicht kritisch** - können auch asynchron gemacht werden
- **Aber:** executeWithRetry wird trotzdem aufgerufen

**Code:**
```typescript
const notification = await executeWithRetry(() =>
  prisma.notification.create({ data: {...} })
);
```

**Impact:**
- Bei createTask: **2 executeWithRetry Aufrufe** (createNotificationIfEnabled × 2)
- Bei vielen Requests = **Viele parallele Retries** = System wird langsam

**Lösung:**
- createNotificationIfEnabled **asynchron machen** (fire-and-forget)
- Oder: executeWithRetry **entfernen** (Notifications sind nicht kritisch)

---

## 🔴 PROBLEM 4: Verschachtelte executeWithRetry Aufrufe

**Problem:**
- `createTask` ruft `getUserLanguage` auf → **INTERN: executeWithRetry**
- `createTask` ruft `createNotificationIfEnabled` auf → **INTERN: executeWithRetry**
- **Verschachtelte executeWithRetry Aufrufe** können zu **kaskadierenden Verzögerungen** führen

**Flow:**
```
createTask
  → executeWithRetry (responsibleUser) ✅
  → executeWithRetry (qualityControlUser) ✅
  → executeWithRetry (task.create) ✅
  → getUserLanguage(responsibleId)
    → executeWithRetry (User.language) ⚠️ VERSCHACHTELT
    → executeWithRetry (User mit Roles) ⚠️ VERSCHACHTELT (falls User.language leer)
  → createNotificationIfEnabled(...)
    → executeWithRetry (notification.create) ⚠️ VERSCHACHTELT
  → getUserLanguage(qualityControlId)
    → executeWithRetry (User.language) ⚠️ VERSCHACHTELT
    → executeWithRetry (User mit Roles) ⚠️ VERSCHACHTELT (falls User.language leer)
  → createNotificationIfEnabled(...)
    → executeWithRetry (notification.create) ⚠️ VERSCHACHTELT
```

**Impact:**
- Wenn die erste DB-Query fehlschlägt → Retry → Delay → Dann nächste Query → Retry → Delay → ...
- **Gesamtzeit kann exponentiell wachsen**
- Bei vielen Requests = **Viele parallele Retries** = System wird langsam

---

## 🔴 PROBLEM 5: Memory Leaks durch executeWithRetry

**Mögliche Probleme:**
1. **Zu viele Promise-Objekte** - Jeder executeWithRetry erstellt Promise-Objekte
2. **Timeout-Objekte nicht aufgeräumt** - `setTimeout` in executeWithRetry könnte Memory Leaks verursachen
3. **Error-Objekte nicht aufgeräumt** - `lastError` wird gespeichert, könnte Memory Leaks verursachen
4. **Zu viele parallele Requests** - Wenn viele Requests gleichzeitig kommen, könnte jeder Request mehrere executeWithRetry Aufrufe machen

**RAM-Verbrauch:**
- **600MB-3GB+** ist extrem hoch für ein Node.js Backend
- Normalerweise sollte ein Node.js Backend **100-500MB** RAM verwenden
- **3GB+** deutet auf **Memory Leaks** hin

**Mögliche Ursachen:**
- `setTimeout` in executeWithRetry wird nicht aufgeräumt
- `lastError` wird gespeichert, aber nie gelöscht
- Zu viele Promise-Objekte werden erstellt, aber nie aufgeräumt

---

## 🔴 PROBLEM 6: Connection Pool wird überlastet

**Problem:**
- **Zu viele parallele DB-Queries** mit executeWithRetry
- Jeder executeWithRetry kann **3 Retries** machen
- Bei vielen gleichzeitigen Requests = **Connection Pool wird überlastet**
- Requests warten auf freie Verbindungen → **Timeouts**

**Connection Pool:**
- `connection_limit=20` (ausreichend für normale Last)
- Aber: Wenn viele Requests gleichzeitig kommen und jeder mehrere executeWithRetry Aufrufe macht = **Connection Pool wird schnell voll**

**Beispiel:**
- 10 gleichzeitige Requests
- Jeder Request macht 5-9 executeWithRetry Aufrufe
- **Gesamt: 50-90 parallele DB-Queries**
- Connection Pool: **20 Verbindungen** → **30-70 Queries warten** → **Timeouts**

---

## 📊 ZUSAMMENFASSUNG

### Identifizierte Probleme:

1. ✅ **Zu viele executeWithRetry Aufrufe pro Request** (5-9 bei createTask)
2. ✅ **executeWithRetry bei Validierungs-Queries** (nicht kritisch)
3. ✅ **getUserLanguage macht 1-2 executeWithRetry Aufrufe** (bei Cache-Miss)
4. ✅ **createNotificationIfEnabled macht executeWithRetry** (nicht kritisch)
5. ✅ **Verschachtelte executeWithRetry Aufrufe** (kaskadierende Verzögerungen)
6. ✅ **Mögliche Memory Leaks** (RAM-Verbrauch 600MB-3GB+)
7. ✅ **Connection Pool wird überlastet** (zu viele parallele Queries)

### Nächste Schritte:

1. ✅ **Server-Logs prüfen** - Wie oft wird retried?
2. ✅ **Browser-Performance analysieren** - Welche Requests dauern lange?
3. ✅ **executeWithRetry Aufrufe reduzieren** - Nur bei kritischen Operationen
4. ✅ **Memory Leaks prüfen** - Gibt es Memory Leaks?
5. ✅ **Connection Pool Status prüfen** - Wird Connection Pool überlastet?

---

**Erstellt:** 2025-01-26  
**Status:** 🔍 Analyse abgeschlossen  
**Nächster Schritt:** Lösungen identifizieren (NICHT implementieren!)

