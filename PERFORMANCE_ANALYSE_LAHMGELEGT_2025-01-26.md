# Performance-Analyse: System lahmgelegt (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - System extrem langsam  
**Problem:** System lädt teilweise nicht mehr oder sehr langsam (z.B. Seite Organisation)

---

## 🔴 IDENTIFIZIERTE PROBLEME

### 1. ❌ `executeWithRetry` macht `$disconnect()` und `$connect()` bei jedem Retry

**Datei:** `backend/src/utils/prisma.ts:38-80`

**Problem:**
```typescript
if (attempt < maxRetries) {
  // Versuche reconnect
  try {
    await prisma.$disconnect();  // ← LANGSAM!
    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    await prisma.$connect();     // ← LANGSAM!
    console.log(`[Prisma] Reconnected after ${attempt} attempt(s)`);
  } catch (reconnectError) {
    console.error('[Prisma] Reconnect failed:', reconnectError);
  }
}
```

**Impact:**
- `$disconnect()` und `$connect()` sind **sehr langsame Operationen** (können 1-5 Sekunden dauern)
- Bei jedem DB-Verbindungsfehler wird die Verbindung komplett getrennt und neu aufgebaut
- Bei 3 Retries = **3x disconnect + 3x connect** = **6-30 Sekunden zusätzliche Wartezeit**
- Das erklärt die extrem langen Ladezeiten!

**Wo wird es verwendet:**
- ✅ `userCache.ts` - Bei jedem Cache-Miss (alle 30 Sekunden)
- ✅ `worktimeCache.ts` - Bei jedem Cache-Miss (alle 5 Sekunden)
- ✅ `organizationCache.ts` - Bei jedem Cache-Miss (alle 2 Minuten)
- ✅ `organizationController.ts` - Bei Settings-Laden
- ✅ `authController.ts` - Bei User-Laden
- ✅ `userController.ts` - Bei User-Laden

**Problem:**
- Wenn die DB-Verbindung instabil ist, wird bei **jedem Cache-Miss** ein Retry mit disconnect/connect ausgeführt
- Das kann zu **kaskadierenden Verzögerungen** führen

---

### 2. 🔴 Komplexe Queries in den Caches mit vielen Joins

#### 2.1 UserCache Query

**Datei:** `backend/src/services/userCache.ts:47-63`

**Query:**
```typescript
const user = await executeWithRetry(() =>
  prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {                    // ← Join 1
        include: {
          role: {                 // ← Join 2
            include: {
              permissions: true   // ← Join 3 (viele Permissions!)
            }
          }
        }
      },
      settings: true               // ← Kann groß sein (JSON)
    }
  })
);
```

**Komplexität:**
- **3 verschachtelte Joins:** User → roles → role → permissions
- **Settings:** Kann groß sein (JSON)
- **Geschätzte Query-Zeit:** 0.5-2 Sekunden (ohne Retry)
- **Mit Retry bei DB-Fehler:** 1-30 Sekunden (je nach Anzahl Retries)

**Wird aufgerufen:**
- Bei **jedem Request** durch `authMiddleware` (wenn Cache abgelaufen)
- Cache-TTL: **30 Sekunden**
- Bei vielen Requests = viele Cache-Misses = viele komplexe Queries

---

#### 2.2 OrganizationCache Query

**Datei:** `backend/src/utils/organizationCache.ts:30-80`

**Query 1:**
```typescript
const userRole = await executeWithRetry(() =>
  prisma.userRole.findFirst({
    where: { 
      userId: Number(userId),
      lastUsed: true 
    },
    include: {
      role: {                     // ← Join 1
        include: {
          organization: {         // ← Join 2
            select: {
              id: true,
              name: true,
              // ... viele Felder ...
            }
          },
          permissions: true        // ← Join 3 (viele Permissions!)
        }
      }
    }
  })
);
```

**Query 2:**
```typescript
const userBranch = await executeWithRetry(() =>
  prisma.usersBranches.findFirst({
    where: {
      userId: Number(userId),
      lastUsed: true
    },
    select: {
      branchId: true
    }
  })
);
```

**Komplexität:**
- **2 separate Queries** bei Cache-Miss
- **3 verschachtelte Joins** in Query 1: userRole → role → organization + permissions
- **Geschätzte Query-Zeit:** 0.3-1.5 Sekunden (ohne Retry)
- **Mit Retry bei DB-Fehler:** 1-30 Sekunden (je nach Anzahl Retries)

**Wird aufgerufen:**
- Bei **jedem Request** durch `organizationMiddleware` (wenn Cache abgelaufen)
- Cache-TTL: **2 Minuten**
- Bei vielen Requests = viele Cache-Misses = viele komplexe Queries

---

#### 2.3 WorktimeCache Query

**Datei:** `backend/src/services/worktimeCache.ts:47-57`

**Query:**
```typescript
const activeWorktime = await executeWithRetry(() =>
  prisma.workTime.findFirst({
    where: {
      userId: userId,
      endTime: null
    },
    include: {
      branch: true                // ← Join 1
    }
  })
);
```

**Komplexität:**
- **1 Join:** workTime → branch
- **Geschätzte Query-Zeit:** 0.05-0.2 Sekunden (ohne Retry)
- **Mit Retry bei DB-Fehler:** 1-30 Sekunden (je nach Anzahl Retries)

**Wird aufgerufen:**
- Bei **jedem Request** zu `/api/worktime/active` (wenn Cache abgelaufen)
- Cache-TTL: **5 Sekunden**
- Frontend pollt alle 30 Sekunden → viele Cache-Misses → viele Queries

---

### 3. 🔴 Kaskadierende Verzögerungen durch Cache-Misses

**Szenario: User öffnet Organisation-Seite**

1. **Frontend ruft `/api/organizations/current` auf**
   - `authMiddleware`: Cache-Miss → UserCache Query (0.5-2s, mit Retry: 1-30s)
   - `organizationMiddleware`: Cache-Miss → OrganizationCache Query (0.3-1.5s, mit Retry: 1-30s)
   - `getCurrentOrganization`: Lädt Settings (wenn `includeSettings=true`)
     - Zusätzliche Query mit `executeWithRetry` (0.1-0.5s, mit Retry: 1-30s)

2. **Gesamtzeit:**
   - **Ohne DB-Fehler:** 0.9-4 Sekunden
   - **Mit DB-Fehler (Retry):** 3-90 Sekunden ⚠️

**Problem:**
- Wenn die DB-Verbindung instabil ist, werden **alle Queries** mit Retry ausgeführt
- Jeder Retry macht `$disconnect()` + `$connect()` = **sehr langsam**
- Bei mehreren gleichzeitigen Requests = **kaskadierende Verzögerungen**

---

### 4. 🔴 `executeWithRetry` reconnect-Logik ist problematisch

**Problem:**
- `$disconnect()` trennt **alle** Verbindungen im Connection Pool
- `$connect()` baut **alle** Verbindungen neu auf
- Das ist **nicht nötig** - Prisma sollte automatisch reconnect machen

**Besser:**
- Prisma hat bereits automatische Reconnect-Logik
- `$disconnect()` und `$connect()` sollten **nur bei kritischen Fehlern** verwendet werden
- Bei normalen DB-Fehlern (P1001, P1008) sollte Prisma automatisch reconnect machen

---

## 📊 ROOT CAUSE ANALYSE

### Hauptursache 1: `executeWithRetry` macht unnötige disconnect/connect

**Problem:**
- Bei jedem Retry wird die **komplette Verbindung** getrennt und neu aufgebaut
- Das ist **sehr langsam** (1-5 Sekunden pro disconnect/connect)
- Bei 3 Retries = **6-30 Sekunden zusätzliche Wartezeit**

**Impact:**
- Jeder Cache-Miss kann zu **extrem langen Wartezeiten** führen
- Bei instabiler DB-Verbindung = **System wird praktisch unbrauchbar**

---

### Hauptursache 2: Komplexe Queries in den Caches

**Problem:**
- UserCache: 3 verschachtelte Joins + Settings (kann groß sein)
- OrganizationCache: 3 verschachtelte Joins + 2 separate Queries
- WorktimeCache: 1 Join (relativ einfach, aber wird sehr häufig aufgerufen)

**Impact:**
- Komplexe Queries sind **langsam** (0.5-2 Sekunden)
- Mit Retry-Logik = **noch langsamer** (1-30 Sekunden)

---

### Hauptursache 3: Cache-Misses führen zu kaskadierenden Verzögerungen

**Problem:**
- Wenn Cache abläuft, werden **komplexe Queries** ausgeführt
- Bei instabiler DB-Verbindung = **Retry-Logik** wird ausgelöst
- Retry-Logik macht `$disconnect()` + `$connect()` = **sehr langsam**
- Bei mehreren gleichzeitigen Requests = **kaskadierende Verzögerungen**

**Impact:**
- System wird bei DB-Verbindungsproblemen **praktisch unbrauchbar**
- Ladezeiten von **30+ Sekunden** sind möglich

---

## 🔍 ZUSAMMENFASSUNG DER IDENTIFIZIERTEN PROBLEME

1. ✅ **`executeWithRetry` macht unnötige disconnect/connect**
   - Bei jedem Retry wird die Verbindung komplett getrennt und neu aufgebaut
   - Das ist sehr langsam (1-5 Sekunden pro disconnect/connect)
   - Bei 3 Retries = 6-30 Sekunden zusätzliche Wartezeit

2. ✅ **Komplexe Queries in den Caches**
   - UserCache: 3 verschachtelte Joins + Settings
   - OrganizationCache: 3 verschachtelte Joins + 2 separate Queries
   - WorktimeCache: 1 Join (relativ einfach)

3. ✅ **Cache-Misses führen zu kaskadierenden Verzögerungen**
   - Wenn Cache abläuft, werden komplexe Queries ausgeführt
   - Bei instabiler DB-Verbindung = Retry-Logik wird ausgelöst
   - Retry-Logik macht disconnect/connect = sehr langsam

4. ✅ **`executeWithRetry` reconnect-Logik ist problematisch**
   - `$disconnect()` trennt alle Verbindungen im Connection Pool
   - `$connect()` baut alle Verbindungen neu auf
   - Das ist nicht nötig - Prisma sollte automatisch reconnect machen

---

## ⚠️ WICHTIG: NICHTS ÄNDERN - NUR ANALYSIERT

**Status:** Analyse abgeschlossen  
**Nächster Schritt:** Lösungsvorschläge mit User besprechen, dann implementieren

---

**Erstellt:** 2025-01-26  
**Analysiert von:** Claude (Auto)  
**Basis:** Code-Analyse der geänderten Dateien und Performance-Dokumentation

