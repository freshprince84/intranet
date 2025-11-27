# Organisation-Tab Problem: Analyse mit MESSUNGEN (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Analyse mit tatsächlichen Messungen  
**Problem:** Organisation-Tab dauert 4-5 Minuten, 3GB RAM-Verbrauch

---

## ⚠️ WICHTIG: KEINE ANNAHMEN - NUR TATSÄCHLICHE PROBLEME

**User-Feedback:**
- Organisation-Tab dauert 4-5 Minuten für einen einzigen Eintrag
- 3GB RAM-Verbrauch
- War vor ein paar Tagen noch kein Problem

---

## 🔍 TATSÄCHLICHE PROBLEME (AUS CODE-ANALYSE)

### Problem 1: executeWithRetry blockiert bei vollem Connection Pool

**Datei:** `backend/src/controllers/organizationController.ts:766`

**Code:**
```typescript
if (includeSettings && organization) {
  const orgWithSettings = await executeWithRetry(() =>
    prisma.organization.findUnique({
      where: { id: organization.id },
      select: {
        // ...
        settings: true // Settings nur wenn explizit angefragt
      }
    })
  );
}
```

**Problem:**
- `executeWithRetry` macht 3 Retries bei DB-Fehler
- Wenn Connection Pool voll ist, blockiert jeder Retry
- **Messung nötig:** Wie lange dauert jeder Retry?

**Frontend:** `frontend/src/components/organization/OrganizationSettings.tsx:47`
```typescript
const org = await organizationService.getCurrentOrganization(undefined, true);
```

**Problem:**
- Lädt Settings mit `includeSettings: true`
- Settings können 19.8 MB groß sein (laut Kommentar in `organizationCache.ts:40`)
- **Messung nötig:** Wie groß sind Settings tatsächlich?

---

### Problem 2: organizationCache verwendet executeWithRetry

**Datei:** `backend/src/utils/organizationCache.ts:30, 70`

**Code:**
```typescript
const userRole = await executeWithRetry(() =>
  prisma.userRole.findFirst({...})
);

const userBranch = await executeWithRetry(() =>
  prisma.usersBranches.findFirst({...})
);
```

**Problem:**
- `organizationCache.get()` wird vor `getCurrentOrganization` aufgerufen
- Wenn Connection Pool voll ist, blockieren beide `executeWithRetry` Calls
- **Messung nötig:** Wie lange dauert `organizationCache.get()` bei vollem Pool?

---

### Problem 3: 3GB RAM - Memory-Leak oder Re-Render-Loop?

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Code-Analyse:**
- `useState` für `organization` (Zeile 28) - kann 19.8 MB Settings enthalten
- `useState` für `stats` (Zeile 29)
- `useCallback` für `fetchOrganization` (Zeile 42) - leerer Dependency-Array
- `useEffect` mit `permissionsLoading` Dependency (Zeile 84)

**Mögliche Ursachen:**
1. **Settings bleiben im State** - 19.8 MB pro Aufruf
2. **Re-Render-Loop** - `fetchOrganization` wird mehrfach aufgerufen
3. **Memory-Leak** - State wird nicht gelöscht

**Messung nötig:**
- Wie oft wird `fetchOrganization` aufgerufen?
- Wie groß ist `organization.settings` tatsächlich?
- Gibt es Re-Render-Loops?

---

## 📊 MESSUNGEN DURCHFÜHREN

### Messung 1: executeWithRetry Retry-Zeiten

**Zweck:** Verstehen, wie lange `executeWithRetry` bei vollem Connection Pool blockiert

**Vorgehen:**
1. Server-Logs prüfen: Wie oft wird retried?
2. Timing-Logs hinzufügen: Wie lange dauert jeder Retry?

**Erwartung:**
- Retry 1: 1 Sekunde Delay
- Retry 2: 2 Sekunden Delay
- Retry 3: 3 Sekunden Delay
- **Gesamt:** 6 Sekunden + Query-Zeit

**ABER:** Wenn Connection Pool voll ist, kann jeder Retry länger dauern!

---

### Messung 2: Settings-Größe

**Zweck:** Verstehen, wie groß Settings tatsächlich sind

**Vorgehen:**
1. Backend-Log hinzufügen: `console.log('Settings size:', JSON.stringify(organization.settings).length)`
2. Frontend-Log hinzufügen: `console.log('Settings size:', JSON.stringify(org.settings).length)`

**Erwartung:**
- Kommentar sagt 19.8 MB
- **Messung nötig:** Ist das tatsächlich so?

---

### Messung 3: organizationCache.get() Timing

**Zweck:** Verstehen, wie lange `organizationCache.get()` bei vollem Connection Pool dauert

**Vorgehen:**
1. Timing-Log hinzufügen: `const start = Date.now(); ... const duration = Date.now() - start;`
2. Server-Logs prüfen: Wie lange dauert `organizationCache.get()`?

**Erwartung:**
- Cache-Hit: < 1ms
- Cache-Miss + DB-Query: 100-500ms (normal)
- Cache-Miss + DB-Query + Connection Pool voll: **???** (Messung nötig!)

---

### Messung 4: Frontend Re-Render-Loops

**Zweck:** Verstehen, ob es Re-Render-Loops gibt

**Vorgehen:**
1. React DevTools Profiler verwenden
2. `console.log` in `fetchOrganization` hinzufügen: `console.log('fetchOrganization called')`
3. `console.log` in `useEffect` hinzufügen: `console.log('useEffect triggered')`

**Erwartung:**
- `fetchOrganization` sollte nur 1x aufgerufen werden
- **Messung nötig:** Wird es mehrfach aufgerufen?

---

### Messung 5: Memory-Verbrauch

**Zweck:** Verstehen, warum 3GB RAM verwendet werden

**Vorgehen:**
1. Chrome DevTools Memory Profiler verwenden
2. Heap Snapshot vor/nach Laden der Organisation-Seite
3. Prüfen: Was belegt den meisten Speicher?

**Erwartung:**
- Settings: 19.8 MB (laut Kommentar)
- **Messung nötig:** Was belegt die restlichen 2.98 GB?

---

## 🔴 KRITISCHE FRAGEN (OHNE ANTWORTEN - MESSUNGEN NÖTIG)

### Frage 1: Warum dauert es 4-5 Minuten?

**Mögliche Ursachen:**
1. `executeWithRetry` blockiert bei vollem Connection Pool
2. `organizationCache.get()` blockiert bei vollem Connection Pool
3. Settings-Query dauert sehr lange (19.8 MB laden)

**Messung nötig:**
- Wie lange dauert jeder Schritt?
- Wo ist der Bottleneck?

---

### Frage 2: Warum 3GB RAM?

**Mögliche Ursachen:**
1. Settings sind größer als 19.8 MB
2. Re-Render-Loop lädt Settings mehrfach
3. Memory-Leak: State wird nicht gelöscht
4. Andere Komponenten belegen Speicher

**Messung nötig:**
- Was belegt den meisten Speicher?
- Gibt es Re-Render-Loops?

---

### Frage 3: Was hat sich geändert?

**Mögliche Änderungen:**
1. `executeWithRetry` wurde hinzugefügt
2. Connection Pool ist voll
3. Settings wurden größer?

**Messung nötig:**
- Wann wurde `executeWithRetry` hinzugefügt?
- Wann begann das Problem?

---

## 📋 PLAN: MESSUNGEN DURCHFÜHREN

### Schritt 1: Timing-Logs hinzufügen

**Datei:** `backend/src/controllers/organizationController.ts`

**Code:**
```typescript
export const getCurrentOrganization = async (req: Request, res: Response) => {
  const startTotal = Date.now();
  
  try {
    const userId = req.userId;
    
    // Timing: organizationCache.get()
    const cacheStart = Date.now();
    const cachedData = await organizationCache.get(Number(userId));
    const cacheDuration = Date.now() - cacheStart;
    console.log(`[getCurrentOrganization] organizationCache.get() took ${cacheDuration}ms`);
    
    // ...
    
    if (includeSettings && organization) {
      // Timing: Settings-Query
      const settingsStart = Date.now();
      const orgWithSettings = await executeWithRetry(() =>
        prisma.organization.findUnique({...})
      );
      const settingsDuration = Date.now() - settingsStart;
      console.log(`[getCurrentOrganization] Settings-Query took ${settingsDuration}ms`);
      
      // Timing: Settings-Größe
      const settingsSize = JSON.stringify(orgWithSettings.settings).length;
      console.log(`[getCurrentOrganization] Settings size: ${settingsSize} bytes (${(settingsSize / 1024 / 1024).toFixed(2)} MB)`);
      
      // ...
    }
    
    const totalDuration = Date.now() - startTotal;
    console.log(`[getCurrentOrganization] Total took ${totalDuration}ms`);
    
    res.json(organization);
  } catch (error) {
    // ...
  }
};
```

---

### Schritt 2: Frontend-Logs hinzufügen

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Code:**
```typescript
const fetchOrganization = useCallback(async () => {
  console.log('[OrganizationSettings] fetchOrganization called');
  const start = Date.now();
  
  try {
    setLoading(true);
    setError(null);
    
    const orgStart = Date.now();
    const org = await organizationService.getCurrentOrganization(undefined, true);
    const orgDuration = Date.now() - orgStart;
    console.log(`[OrganizationSettings] getCurrentOrganization took ${orgDuration}ms`);
    
    // Settings-Größe
    if (org.settings) {
      const settingsSize = JSON.stringify(org.settings).length;
      console.log(`[OrganizationSettings] Settings size: ${settingsSize} bytes (${(settingsSize / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    setOrganization(org);
    
    // ...
    
    const totalDuration = Date.now() - start;
    console.log(`[OrganizationSettings] fetchOrganization total took ${totalDuration}ms`);
  } catch (err: any) {
    // ...
  }
}, []);
```

---

### Schritt 3: useEffect-Logs hinzufügen

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Code:**
```typescript
useEffect(() => {
  console.log('[OrganizationSettings] useEffect triggered', { permissionsLoading, hasInitialLoadRef: hasInitialLoadRef.current });
  
  if (permissionsLoading) {
    return;
  }

  if (hasInitialLoadRef.current) {
    return;
  }

  const hasPermission = canViewOrganization();
  if (hasPermission) {
    hasInitialLoadRef.current = true;
    fetchOrganization();
  } else {
    setError(t('organization.noPermission'));
    setLoading(false);
    hasInitialLoadRef.current = true;
  }
}, [permissionsLoading]);
```

---

### Schritt 4: Server-Logs prüfen

**Befehl (auf Server):**
```bash
pm2 logs intranet-backend --lines 100 | grep -E "getCurrentOrganization|organizationCache|Settings"
```

**Erwartung:**
- Timing-Informationen für jeden Schritt
- Settings-Größe
- Retry-Informationen

---

### Schritt 5: Browser-Logs prüfen

**Vorgehen:**
1. Chrome DevTools öffnen
2. Console-Tab öffnen
3. Organisation-Tab öffnen
4. Logs prüfen: Timing-Informationen, Re-Render-Loops

---

### Schritt 6: Memory Profiler verwenden

**Vorgehen:**
1. Chrome DevTools öffnen
2. Memory-Tab öffnen
3. Heap Snapshot vor Laden der Organisation-Seite
4. Organisation-Tab öffnen
5. Heap Snapshot nach Laden
6. Vergleich: Was belegt den meisten Speicher?

---

## ⚠️ WICHTIG: KEINE LÖSUNGEN OHNE MESSUNGEN!

**Status:** Plan erstellt  
**Nächster Schritt:** Messungen durchführen, dann Lösungen vorschlagen

**Regel:** "2 x messen, 1 x schneiden!"

---

**Erstellt:** 2025-01-26  
**Status:** Plan erstellt, Messungen nötig  
**Nächster Schritt:** Messungen durchführen

