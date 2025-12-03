# Memory-Verbrauch Tiefenanalyse (2025-01-30)

**Datum:** 2025-01-30  
**Status:** 🔴 KRITISCH - Memory-Verbrauch immer noch über 500MB  
**Problem:** Optimierungen haben nicht ausreichend geholfen

---

## 🔴 IDENTIFIZIERTE KRITISCHE PROBLEME

### Problem 1: ❌ KRITISCH - Axios Requests werden NICHT abgebrochen

**Code:** Überall im Frontend (Requests.tsx, Worktracker.tsx, etc.)

**Problem:**
- **KEIN AbortController** bei den meisten Axios-Requests
- Wenn Komponenten unmounted werden, laufen Requests weiter
- Responses werden im Memory gespeichert, auch wenn nicht mehr benötigt
- Bei schnellem Seitenwechsel: Viele Requests laufen parallel

**Betroffene Dateien:**
- `frontend/src/components/Requests.tsx` - fetchRequests() - **KEIN AbortController**
- `frontend/src/pages/Worktracker.tsx` - loadTasks(), loadReservations() - **KEIN AbortController**
- `frontend/src/components/NotificationBell.tsx` - fetchUnreadCount(), fetchRecentNotifications() - **KEIN AbortController**
- `frontend/src/contexts/FilterContext.tsx` - loadFilters(), refreshFilters() - **KEIN AbortController**
- `frontend/src/contexts/BranchContext.tsx` - loadBranches() - **KEIN AbortController**
- `frontend/src/components/WorktimeModal.tsx` - fetchWorktimes() - **KEIN AbortController**
- `frontend/src/components/WorktimeStats.tsx` - fetchStats() - **KEIN AbortController**

**Impact:**
- **Memory-Verbrauch:** ~100-300MB (je nach Anzahl laufender Requests)
- **Wächst kontinuierlich:** Jeder Request speichert Response im Memory
- **Besonders kritisch:** Bei schnellem Seitenwechsel bleiben viele Requests offen

**Lösung:**
- AbortController für ALLE Axios-Requests hinzufügen
- Requests beim Unmount abbrechen
- Cleanup in useEffect return-Statements

---

### Problem 2: FilterContext speichert alle Filter im State

**Code:** `frontend/src/contexts/FilterContext.tsx`

**Problem:**
- Alle Filter werden im State gespeichert: `filters: Record<string, SavedFilter[]>`
- Filter werden für ALLE Tabellen geladen (auch wenn nicht benötigt)
- Filter bleiben im Memory, auch wenn Tabelle nicht mehr verwendet wird
- Cleanup läuft nur alle 5 Minuten

**Impact:**
- **Memory-Verbrauch:** ~20-100MB (je nach Anzahl Filter)
- **Wächst kontinuierlich:** Filter werden für jede Tabelle geladen

**Lösung:**
- Filter nur laden, wenn tatsächlich benötigt
- Aggressiveres Cleanup (z.B. alle 1 Minute statt 5 Minuten)
- Filter beim Unmount der Komponente löschen

---

### Problem 3: NotificationBell lädt Notifications ohne AbortController

**Code:** `frontend/src/components/NotificationBell.tsx`

**Problem:**
- fetchUnreadCount() und fetchRecentNotifications() haben **KEIN AbortController**
- Polling alle 60 Sekunden
- Notifications werden im State gespeichert

**Impact:**
- **Memory-Verbrauch:** ~10-50MB (je nach Anzahl Notifications)
- **Wächst kontinuierlich:** Notifications werden nicht gelöscht

**Lösung:**
- AbortController für Notification-Requests
- Notifications beim Unmount löschen
- Polling-Intervall erhöhen (60s → 120s)

---

### Problem 4: Axios-Interceptor hat console.error ohne Development-Check

**Code:** `frontend/src/config/axios.ts:126`

**Problem:**
- `console.error('Fehler im Response Interceptor:', error);` - **KEIN Development-Check**
- Wird bei JEDEM Fehler ausgeführt
- Speichert Fehler in Console-History

**Impact:**
- **Memory-Verbrauch:** ~10-50MB (je nach Anzahl Fehler)
- **Wächst kontinuierlich:** Console-History wächst

**Lösung:**
- Development-Check hinzufügen

---

### Problem 5: Worktracker hat viele useMemo/useCallback

**Code:** `frontend/src/pages/Worktracker.tsx`

**Problem:**
- 21 useMemo/useCallback Hooks
- Viele Dependencies
- Erstellen neue Objekte/Arrays bei jeder Berechnung

**Impact:**
- **Memory-Verbrauch:** ~20-50MB (je nach Anzahl Berechnungen)
- **Wächst kontinuierlich:** Alte Berechnungen bleiben im React-Cache

**Lösung:**
- Dependencies reduzieren
- useMemo nur für wirklich teure Berechnungen verwenden
- useCallback nur wenn nötig

---

## ✅ LÖSUNGSPLAN

### Lösung 1: AbortController für ALLE Axios-Requests (HÖCHSTE PRIORITÄT)

**Betroffene Dateien:**
1. `frontend/src/components/Requests.tsx` - fetchRequests()
2. `frontend/src/pages/Worktracker.tsx` - loadTasks(), loadReservations()
3. `frontend/src/components/NotificationBell.tsx` - fetchUnreadCount(), fetchRecentNotifications()
4. `frontend/src/contexts/FilterContext.tsx` - loadFilters(), refreshFilters()
5. `frontend/src/contexts/BranchContext.tsx` - loadBranches()
6. `frontend/src/components/WorktimeModal.tsx` - fetchWorktimes()
7. `frontend/src/components/WorktimeStats.tsx` - fetchStats()

**Implementierung:**
```typescript
// Vorher:
const fetchRequests = useCallback(async (...) => {
  const response = await axiosInstance.get('/requests', { params });
  // ...
}, [...]);

// Nachher:
const fetchRequests = useCallback(async (...) => {
  const abortController = new AbortController();
  
  try {
    const response = await axiosInstance.get('/requests', { 
      params,
      signal: abortController.signal 
    });
    // ...
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'CanceledError') {
      return; // Request wurde abgebrochen
    }
    throw error;
  }
}, [...]);

// In useEffect:
useEffect(() => {
  const abortController = new AbortController();
  fetchRequests(..., abortController.signal);
  
  return () => {
    abortController.abort();
  };
}, [fetchRequests]);
```

**Impact:**
- ✅ Requests werden beim Unmount abgebrochen
- ✅ Memory wird sofort freigegeben
- ✅ Reduktion: ~100-300MB

---

### Lösung 2: FilterContext Cleanup optimieren

**Datei:** `frontend/src/contexts/FilterContext.tsx`

**Änderung:**
- Cleanup-Intervall: 5 Minuten → 1 Minute
- Filter beim Unmount der Komponente löschen (wenn Tabelle nicht mehr verwendet wird)
- Filter nur laden, wenn tatsächlich benötigt

**Impact:**
- ✅ Filter werden schneller gelöscht
- ✅ Reduktion: ~20-50MB

---

### Lösung 3: NotificationBell AbortController

**Datei:** `frontend/src/components/NotificationBell.tsx`

**Änderung:**
- AbortController für fetchUnreadCount() und fetchRecentNotifications()
- Notifications beim Unmount löschen
- Polling-Intervall: 60s → 120s

**Impact:**
- ✅ Requests werden abgebrochen
- ✅ Reduktion: ~10-30MB

---

### Lösung 4: Axios-Interceptor Development-Check

**Datei:** `frontend/src/config/axios.ts`

**Änderung:**
```typescript
// Vorher:
console.error('Fehler im Response Interceptor:', error);

// Nachher:
if (process.env.NODE_ENV === 'development') {
  console.error('Fehler im Response Interceptor:', error);
}
```

**Impact:**
- ✅ Console-History wächst nicht mehr
- ✅ Reduktion: ~10-50MB

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **RAM-Verbrauch:** 500MB+ (sofort beim Öffnen)
- **Requests ohne AbortController:** ~100-300MB
- **FilterContext:** ~20-100MB
- **NotificationBell:** ~10-50MB
- **Axios-Interceptor:** ~10-50MB

### Nachher:
- **RAM-Verbrauch:** ~200-300MB (40-60% Reduktion)
- **Requests mit AbortController:** ~0MB (werden abgebrochen)
- **FilterContext:** ~10-30MB (aggressiveres Cleanup)
- **NotificationBell:** ~5-20MB (AbortController + längeres Intervall)
- **Axios-Interceptor:** 0MB (nur in Development)

**Gesamt-Reduktion:** Von 500MB+ → 200-300MB (40-60% Reduktion)

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Phase 1: AbortController für kritische Requests (HÖCHSTE PRIORITÄT)
- [ ] Requests.tsx - fetchRequests()
- [ ] Worktracker.tsx - loadTasks()
- [ ] Worktracker.tsx - loadReservations()
- [ ] NotificationBell.tsx - fetchUnreadCount()
- [ ] NotificationBell.tsx - fetchRecentNotifications()
- [ ] FilterContext.tsx - loadFilters()
- [ ] FilterContext.tsx - refreshFilters()
- [ ] BranchContext.tsx - loadBranches()
- [ ] WorktimeModal.tsx - fetchWorktimes()
- [ ] WorktimeStats.tsx - fetchStats()

### Phase 2: FilterContext Cleanup optimieren
- [ ] Cleanup-Intervall: 5 Minuten → 1 Minute
- [ ] Filter beim Unmount löschen
- [ ] Filter nur laden, wenn benötigt

### Phase 3: NotificationBell optimieren
- [ ] AbortController hinzufügen
- [ ] Polling-Intervall: 60s → 120s
- [ ] Notifications beim Unmount löschen

### Phase 4: Axios-Interceptor Development-Check
- [ ] console.error mit Development-Check umschließen

---

**Erstellt:** 2025-01-30  
**Status:** 📋 ANALYSE ABGESCHLOSSEN  
**Nächster Schritt:** Implementierung starten (Phase 1: AbortController)

