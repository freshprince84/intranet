# Login-Problem alvillat - Fix

**Datum:** 2025-01-31  
**Status:** 🔴 ROOT CAUSE IDENTIFIZIERT  
**Problem:** Pool-Status-Tracking Bug - `activeQueries` Counter wächst kontinuierlich

---

## 🔴 ROOT CAUSE IDENTIFIZIERT

### Problem:
**Pool-Status-Tracking Bug** - Der `activeQueries` Counter wird erhöht, aber `releasePoolQuery()` wird nicht immer aufgerufen.

### Beweis aus Logs:
```
[Prisma] Intelligente Pool-Auswahl: Pool 1/10 (aktive Queries: 800, Durchschnitt: 799.1)
[Prisma] Intelligente Pool-Auswahl: Pool 2/10 (aktive Queries: 800, Durchschnitt: 799.2)
...
```

**Das ist unmöglich!** Jeder Pool sollte max. 10 aktive Queries haben (connectionLimit = 10), nicht 800!

### Ursache im Code:
```typescript
// backend/src/utils/prisma.ts:132-174
poolStatuses[bestPoolIndex].activeQueries++;  // ← Wird erhöht
// ...
return result.finally(() => {
  releasePoolQuery(poolIndex);  // ← Wird NUR aufgerufen wenn Promise
});
```

**Problem:**
- Wenn Queries fehlschlagen, wird `releasePoolQuery()` nicht aufgerufen
- Wenn Queries nicht als Promise erkannt werden, wird `releasePoolQuery()` nicht aufgerufen
- Der Counter wächst kontinuierlich → zeigt irgendwann 800 statt der tatsächlichen Anzahl

---

## 🔧 LÖSUNG

### Option 1: Pool-Status-Tracking deaktivieren (SOFORT)

**Problem:** Das Tracking ist fehlerhaft und verursacht das Problem.

**Lösung:** Zurück zu Round-Robin (einfacher, funktioniert immer).

**Datei:** `backend/src/utils/prisma.ts`

**Änderung:**
```typescript
// VORHER: Intelligente Pool-Auswahl (fehlerhaft)
const getPrismaPool = (): PrismaClient => {
  // ... komplexe Logik mit activeQueries Tracking ...
};

// NACHHER: Einfaches Round-Robin (funktioniert immer)
let currentPoolIndex = 0;
const getPrismaPool = (): PrismaClient => {
  const pool = prismaPools[currentPoolIndex];
  currentPoolIndex = (currentPoolIndex + 1) % prismaPools.length;
  return pool;
};
```

### Option 2: Pool-Status-Tracking fixen (LANGFRISTIG)

**Problem:** `releasePoolQuery()` wird nicht immer aufgerufen.

**Lösung:** Robustes Error-Handling und Timeout für Counter-Reset.

**Datei:** `backend/src/utils/prisma.ts`

**Änderung:**
```typescript
// Timeout für Query-Tracking (max. 30 Sekunden)
const QUERY_TIMEOUT_MS = 30000;

// Wrapper für async Operations mit Timeout
if (result && typeof result.then === 'function') {
  const timeoutId = setTimeout(() => {
    // Query dauert zu lange → Counter zurücksetzen
    releasePoolQuery(poolIndex);
  }, QUERY_TIMEOUT_MS);
  
  return result
    .finally(() => {
      clearTimeout(timeoutId);
      releasePoolQuery(poolIndex);
    })
    .catch((error) => {
      // Bei Fehler: Counter zurücksetzen
      releasePoolQuery(poolIndex);
      throw error;
    });
}
```

### Option 3: Counter regelmäßig zurücksetzen (NOTFALL)

**Problem:** Counter wächst kontinuierlich.

**Lösung:** Counter alle 60 Sekunden zurücksetzen.

**Datei:** `backend/src/utils/prisma.ts`

**Änderung:**
```typescript
// Counter-Reset alle 60 Sekunden
setInterval(() => {
  poolStatuses.forEach(status => {
    // Setze auf 0 wenn Counter unrealistisch hoch ist (> 100)
    if (status.activeQueries > 100) {
      console.warn(`[Prisma] Pool-Status-Reset: activeQueries war ${status.activeQueries}, setze auf 0`);
      status.activeQueries = 0;
    }
  });
}, 60000);
```

---

## 🎯 EMPFOHLENE LÖSUNG

**Option 1 (Round-Robin)** ist die beste Lösung:
- ✅ Einfach und robust
- ✅ Keine fehleranfällige Tracking-Logik
- ✅ Funktioniert immer
- ✅ Keine Performance-Nachteile (10 Pools sind genug für Lastverteilung)

---

## 📋 IMPLEMENTIERUNG

### Schritt 1: Code ändern

**Datei:** `backend/src/utils/prisma.ts`

**Änderung:** Ersetze `getPrismaPool()` Funktion (Zeilen 103-143) durch einfaches Round-Robin:

```typescript
// ✅ PERFORMANCE: Round-Robin Pool-Auswahl (einfach und robust)
let currentPoolIndex = 0;
const getPrismaPool = (): PrismaClient => {
  const pool = prismaPools[currentPoolIndex];
  currentPoolIndex = (currentPoolIndex + 1) % prismaPools.length;
  return pool;
};
```

**Entferne:**
- `poolStatuses` Array (Zeilen 89-99)
- `releasePoolQuery()` Funktion (Zeilen 145-150)
- Komplexe Pool-Auswahl-Logik

**Vereinfache Proxy:**
```typescript
const prismaProxy = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const pool = getPrismaPool();
    return (pool as any)[prop];
  }
});
```

### Schritt 2: Build und Deploy

```bash
cd backend
npm run build
pm2 restart intranet-backend
```

---

## ⚠️ WICHTIGE HINWEISE

- **Server-Neustart nur nach Absprache**
- **Backup vor Änderungen** (Git commit)
- **Testen nach Deploy** - Login sollte jetzt funktionieren

---

## 📊 ERWARTETE ERGEBNISSE

### Nach Fix sollte sein:
- ✅ Keine "aktive Queries: 800" Logs mehr
- ✅ Login funktioniert von allen Geräten
- ✅ Keine "Can't reach database server" Fehler mehr
- ✅ System läuft stabil

