# Memory Leaks und Performance Fixes - Vollständige Dokumentation

**Datum:** 2025-12-11  
**Status:** ✅ Alle Fixes implementiert und getestet  
**Priorität:** 🔴 KRITISCH - Diese Fehler dürfen NIE wieder gemacht werden!

---

## 📋 EXECUTIVE SUMMARY

Dieses Dokument dokumentiert **alle kritischen Memory Leaks und Performance-Probleme** die am 11.12.2025 behoben wurden. Diese Probleme führten zu:

- **Frontend Memory:** 1.6 GB RAM nach wenigen Minuten
- **Backend Memory:** 832 MB → Crash → 502 Bad Gateway
- **Seitenladezeiten:** 30+ Sekunden oder Timeout
- **Backend Restarts:** 20+ pro Stunde

**Alle Fixes sind langfristige Lösungen** - keine Workarounds!

---

## 🔴 FRONTEND MEMORY LEAKS

### 1. IntersectionObserver Memory Leak (Requests.tsx, Worktracker.tsx)

**Problem:**
- `fetchRequests` und `loadTasks` hatten `filterLogicalOperators` als Dependency in `useCallback`
- Bei jedem Filter-Change wurde `fetchRequests` neu erstellt
- Neue `IntersectionObserver` Instanzen wurden erstellt, alte nicht disconnected
- **Resultat:** 8,097 Detached `<div>`, 5,108 Detached `<span>`, 2,572 Detached SVG

**Lösung:**
```typescript
// ❌ VORHER (FALSCH):
const fetchRequests = useCallback(async (...) => {
  // ...
}, [filterLogicalOperators]); // Dependency führt zu Re-Creation!

// ✅ NACHHER (RICHTIG):
const filterLogicalOperatorsRef = useRef(filterLogicalOperators);
useEffect(() => {
  filterLogicalOperatorsRef.current = filterLogicalOperators;
}, [filterLogicalOperators]);

const fetchRequests = useCallback(async (...) => {
  const operators = filterLogicalOperatorsRef.current; // Ref verwenden!
  // ...
}, []); // Keine Dependencies!
```

**Dateien:**
- `frontend/src/components/Requests.tsx`
- `frontend/src/pages/Worktracker.tsx`

**Dokumentation:** `docs/technical/MEMORY_LEAK_FETCHREQUESTS_FIX_2025-12-11.md`

---

### 2. Timer Memory Leaks (5 Komponenten)

**Problem:**
- `setTimeout`/`setInterval` wurden ohne Cleanup verwendet
- Bei Unmount blieben Timer aktiv → Memory Leak
- **35+ Timer ohne Cleanup** gefunden!

**Lösung:**
```typescript
// ❌ VORHER (FALSCH):
useEffect(() => {
  setTimeout(() => {
    // ...
  }, 100);
  // Kein Cleanup!
}, []);

// ✅ NACHHER (RICHTIG):
useEffect(() => {
  const timeoutId = setTimeout(() => {
    // ...
  }, 100);
  
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, []);
```

**Betroffene Dateien:**
1. `frontend/src/components/SavedFilterTags.tsx` - 2 verschachtelte setTimeout ohne Cleanup
2. `frontend/src/components/Header.tsx` - timeoutRef ohne Unmount-Cleanup
3. `frontend/src/components/MonthlyReportsTab.tsx` - Highlight-Timer ohne Cleanup
4. `frontend/src/components/LifecycleView.tsx` - Async Timer ohne Mounted-Check
5. `frontend/src/components/OnboardingTour.tsx` - Dismiss-Timer ohne Cleanup

**Regel:** **JEDER** `setTimeout`/`setInterval` MUSS ein Cleanup haben!

---

### 3. Image Lazy Loading (MarkdownPreview.tsx)

**Problem:**
- Alle Bilder wurden sofort geladen (auch außerhalb Viewport)
- **281 MB "Bilder-Cache"** im Browser

**Lösung:**
```typescript
// ✅ NACHHER:
<img src={src} alt={alt} loading="lazy" />
```

**Datei:** `frontend/src/components/MarkdownPreview.tsx`

---

## 🔴 BACKEND MEMORY LEAKS

### 1. Analytics Controller - Attachments laden

**Problem:**
- `analyticsController.ts` lud bei **jeder Query** alle `attachments` (Binary-Daten!)
- Bei vielen Tasks/Requests = **hunderte MB** Memory
- Attachments enthalten Bilder/PDFs - massive Datenmengen

**Lösung:**
```typescript
// ❌ VORHER (FALSCH):
include: {
  attachments: {
    orderBy: { uploadedAt: 'desc' }
  }
}

// ✅ NACHHER (RICHTIG):
select: {
  // Nur benötigte Felder
  id: true,
  title: true,
  status: true,
  _count: {
    select: { attachments: true } // Nur Count, keine Binary-Daten!
  }
}
```

**Datei:** `backend/src/controllers/analyticsController.ts`

**Betroffene Funktionen:**
- `getTodosByUserForDate`
- `getRequestsByUserForDate`
- `getTodosChronological`
- `getRequestsChronological`

**Regel:** **NIEMALS** Attachments in Analytics/List-Queries laden! Nur `_count` verwenden!

---

### 2. CacheCleanupService

**Status:** ✅ Bereits implementiert, aber prüfen ob aktiv

**Datei:** `backend/src/services/cacheCleanupService.ts`

**Alle Caches müssen sich registrieren:**
```typescript
cacheCleanupService.register({
  name: 'FilterCache',
  cleanup: () => filterCache.cleanup(),
  getStats: () => filterCache.getStats()
});
```

**Registrierte Caches:**
- `worktimeCache`
- `userLanguageCache`
- `filterCache`
- `onboardingCache`
- `userCache`
- `filterListCache`
- `notificationSettingsCache`
- `branchCache`
- `organizationCache`

**Jeder Cache MUSS haben:**
- `MAX_SIZE` Limit
- `cleanup()` Methode
- `getStats()` Methode

---

## 🔴 BACKEND PERFORMANCE

### 1. Node.js Heap-Limit zu niedrig

**Problem:**
- Default Heap-Limit (~512 MB) war zu niedrig
- Backend crashte bei 700 MB → PM2 Restart → 502 Fehler
- Heap Usage: 94% bei nur 60 MB Heap!

**Lösung:**
```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'intranet-backend',
    script: 'dist/index.js',
    cwd: '/var/www/intranet/backend',
    node_args: '--max-old-space-size=768', // ✅ Heap-Limit erhöht!
    max_memory_restart: '700M', // PM2 restartet bei 700 MB
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

**Server-Konfiguration:**
```bash
# PM2 komplett neu starten (wichtig!)
pm2 delete intranet-backend
pm2 kill
pm2 start /var/www/intranet/backend/ecosystem.config.js
pm2 save
```

**Regel:** **IMMER** `ecosystem.config.js` verwenden, nicht `pm2 start dist/index.js` direkt!

---

### 2. Prisma Connection Limit

**Problem:**
- Hardcoded `connection_limit: 25` in `prisma.ts` überschrieb `.env` Werte
- `.env` hatte `connection_limit=100` (zu hoch!)

**Lösung:**
```typescript
// ❌ VORHER (FALSCH):
const connectionLimit = 25; // Hardcoded!
const urlWithPool = modifyDatabaseUrl(databaseUrl, connectionLimit);
export const prisma = new PrismaClient({
  datasources: { db: { url: urlWithPool } }
});

// ✅ NACHHER (RICHTIG):
export const prisma = new PrismaClient({
  // Nutzt DATABASE_URL direkt - Werte werden dort konfiguriert
});
```

**Datei:** `backend/src/utils/prisma.ts`

**DATABASE_URL Format:**
```
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=10&pool_timeout=30&connect_timeout=30"
```

**Regel:** **NIEMALS** Connection-Limits hardcoden! Immer aus `.env` lesen!

---

## 🔴 FRONTEND PERFORMANCE

### 1. Request Deduplication - lifecycle-roles

**Problem:**
- `usePermissions()` Hook wurde von **6-8 Komponenten** gleichzeitig verwendet
- Jede Komponente rief `/organizations/current/lifecycle-roles` auf
- **6-8 parallele Requests** die jeweils 10-19 Sekunden dauerten!

**Lösung:**
```typescript
// Globaler Cache mit Request Deduplication
let lifecycleRolesCache: {
  data: any;
  timestamp: number;
  promise: Promise<any> | null;
} = {
  data: null,
  timestamp: 0,
  promise: null
};
const LIFECYCLE_ROLES_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

const loadLifecycleRoles = async () => {
  const now = Date.now();
  
  // 1. Cache prüfen
  if (lifecycleRolesCache.data && (now - lifecycleRolesCache.timestamp) < LIFECYCLE_ROLES_CACHE_TTL) {
    setLifecycleRoles(lifecycleRolesCache.data);
    return;
  }

  // 2. Request Deduplication - wenn bereits ein Request läuft, warte darauf
  if (lifecycleRolesCache.promise) {
    const data = await lifecycleRolesCache.promise;
    setLifecycleRoles(data);
    return;
  }

  // 3. Neuer Request
  lifecycleRolesCache.promise = axiosInstance.get('/organizations/current/lifecycle-roles')
    .then(response => {
      lifecycleRolesCache.data = response.data.lifecycleRoles;
      lifecycleRolesCache.timestamp = Date.now();
      lifecycleRolesCache.promise = null;
      return response.data.lifecycleRoles;
    })
    .catch(error => {
      lifecycleRolesCache.promise = null;
      throw error;
    });

  const data = await lifecycleRolesCache.promise;
  setLifecycleRoles(data);
};
```

**Datei:** `frontend/src/hooks/usePermissions.ts`

**Regel:** **IMMER** Request Deduplication für API-Calls die von mehreren Komponenten verwendet werden!

---

## 📋 CHECKLISTE FÜR NEUE IMPLEMENTIERUNGEN

### Frontend

- [ ] **JEDER** `setTimeout`/`setInterval` hat Cleanup in `useEffect` return
- [ ] **JEDER** `IntersectionObserver` wird in Cleanup `disconnect()`ed
- [ ] **JEDER** `addEventListener` wird in Cleanup `removeEventListener`ed
- [ ] **JEDER** `useCallback` hat korrekte Dependencies (oder `useRef` für State)
- [ ] **ALLE** Bilder haben `loading="lazy"` wenn außerhalb Viewport
- [ ] **KEINE** doppelten API-Calls - Request Deduplication für gemeinsame Hooks
- [ ] **KEINE** großen Datenmengen in State - Pagination verwenden

### Backend

- [ ] **KEINE** Attachments in List/Analytics Queries - nur `_count`
- [ ] **ALLE** Queries haben Pagination (`take`/`skip`)
- [ ] **ALLE** Caches haben `MAX_SIZE` und `cleanup()`
- [ ] **ALLE** Caches registrieren sich beim `CacheCleanupService`
- [ ] **KEINE** hardcoded Connection-Limits - immer aus `.env`
- [ ] **ALLE** `findMany` Queries haben Limits

### Server-Konfiguration

- [ ] **IMMER** `ecosystem.config.js` verwenden (nicht `pm2 start` direkt)
- [ ] **IMMER** `node_args: '--max-old-space-size=768'` setzen
- [ ] **IMMER** `max_memory_restart: '700M'` setzen
- [ ] **IMMER** `pm2 save` nach Änderungen
- [ ] **IMMER** `DATABASE_URL` mit `connection_limit=10` (nicht höher!)

---

## 🚀 DEPLOYMENT CHECKLIST

### Nach Code-Änderungen:

```bash
# 1. Lokal committen
git add -A
git commit -m "Beschreibung"
git push

# 2. Auf Server
cd /var/www/intranet
git pull

# 3. Backend bauen
cd backend
npm run build

# 4. Frontend bauen
cd ../frontend
npm run build

# 5. PM2 neu starten (wichtig: --update-env wenn .env geändert)
pm2 restart intranet-backend --update-env

# 6. Nginx reload
sudo systemctl reload nginx

# 7. Prüfen
pm2 status
pm2 logs intranet-backend --lines 20
```

### Bei PM2 Config-Änderungen:

```bash
# 1. PM2 komplett neu starten (wichtig!)
pm2 delete intranet-backend
pm2 kill
pm2 start /var/www/intranet/backend/ecosystem.config.js
pm2 save

# 2. Prüfen ob node_args gesetzt sind
pm2 show intranet-backend | grep -i "interpreter\|args"
```

---

## 📊 MONITORING

### Frontend Memory prüfen:

1. Browser DevTools → Memory → Heap Snapshot
2. Prüfe auf:
   - Detached DOM Elements (sollte < 100 sein)
   - Detached SVG Elements (sollte < 50 sein)
   - Timer-Referenzen

### Backend Memory prüfen:

```bash
# PM2 Status
pm2 status

# PM2 Monitor
pm2 monit

# Heap Usage prüfen
pm2 show intranet-backend | grep -i "heap"
```

### Network Requests prüfen:

1. Browser DevTools → Network
2. Prüfe auf:
   - Doppelte Requests (gleicher Endpoint mehrfach)
   - Langsame Requests (> 5 Sekunden)
   - Failed Requests (502, 504)

---

## 🔗 VERWANDTE DOKUMENTATION

- `docs/technical/MEMORY_LEAK_FETCHREQUESTS_FIX_2025-12-11.md` - IntersectionObserver Fix
- `docs/technical/FILTER_OR_OPERATOR_FIX_2025-12-11.md` - Filter Logic Fix
- `docs/technical/PERFORMANCE_ANALYSE_VOLLSTAENDIG.md` - Allgemeine Performance-Analyse

---

## ⚠️ WICHTIGE REGELN

1. **NIEMALS** Attachments in Analytics/List-Queries laden
2. **NIEMALS** Timer ohne Cleanup verwenden
3. **NIEMALS** Observer ohne disconnect verwenden
4. **NIEMALS** hardcoded Connection-Limits verwenden
5. **IMMER** Request Deduplication für gemeinsame API-Calls
6. **IMMER** `ecosystem.config.js` für PM2 verwenden
7. **IMMER** Pagination für große Datenmengen

**Diese Fehler dürfen NIE wieder gemacht werden!**










