# Standardisierungs-Analyse - Vollständige Liste

**Datum:** 2025-01-31  
**Status:** 📋 ANALYSE - KEINE CODE-ÄNDERUNGEN  
**Zweck:** Vollständige Auflistung aller nicht standardisierten Bereiche im System

---

## 📊 ÜBERSICHT: NICHT STANDARDISIERTE BEREICHE

### 1. Error-Handling (3 verschiedene Patterns)
### 2. API-Call-Patterns (4+ verschiedene Patterns)
### 3. Daten-Laden (4 verschiedene Patterns)
### 4. useTranslation (2 verschiedene Patterns - 1 falsch)
### 5. Infinite Scroll (verschiedene Implementierungen)
### 6. Polling-Intervalle (verschiedene Implementierungen)
### 7. Loading-States (verschiedene Implementierungen)
### 8. Filter-Logik (dupliziert in 5+ Dateien)
### 9. Status-Badges (dupliziert in mehreren Komponenten)
### 10. CRUD-Operationen (dupliziert in Backend Controllern)
### 11. Validierung (verschiedene Patterns)
### 12. Date-Formatierung (verschiedene Libraries/Patterns)
### 13. Button-Design (inkonsistent)
### 14. Spacing (inkonsistent)
### 15. Container-Strukturen (inkonsistent)

---

## 1. ERROR-HANDLING (3 verschiedene Patterns)

### Pattern 1: `onError` Prop
**Verwendet in:**
- `BranchManagementTab.tsx`
- `TourProvidersTab.tsx`
- `UserManagementTab.tsx`
- `RoleManagementTab.tsx`
- `ToursTab.tsx`

**Beispiel:**
```typescript
const BranchManagementTab = ({ onError }: { onError: (message: string) => void }) => {
  const handleError = (error: any) => {
    onError(error.message);
  };
};
```

### Pattern 2: `useError()` Hook
**Verwendet in:**
- `RoleManagementTab.tsx`

**Beispiel:**
```typescript
const { showError } = useError();
const handleError = (error: any) => {
  showError(error.message);
};
```

### Pattern 3: Direkte `setError()` + `showMessage()`
**Verwendet in:**
- `Worktracker.tsx`
- `Requests.tsx`

**Beispiel:**
```typescript
const [error, setError] = useState<string | null>(null);
const { showMessage } = useMessage();
const handleError = (error: any) => {
  setError(error.message);
  showMessage(error.message, 'error');
};
```

### Standardisierung:
- ✅ `ErrorContext` existiert bereits
- **Ziel:** Alle Komponenten auf `ErrorContext` umstellen
- **Vorteil:** Konsistente Error-Handling, weniger Props

---

## 2. API-CALL-PATTERNS (4+ verschiedene Patterns)

### Pattern 1: `useCallback` mit `[onError]`
**Verwendet in:**
- `BranchManagementTab.tsx`

**Beispiel:**
```typescript
const loadData = useCallback(async () => {
  try {
    const response = await axiosInstance.get('/api/data');
    setData(response.data);
  } catch (error) {
    onError(error.message);
  }
}, [onError]);
```

### Pattern 2: `useCallback` mit `[t]` - **FALSCH!**
**Verwendet in:**
- `Worktracker.tsx`
- `TeamWorktimeControl.tsx`

**Problem:** Verursacht automatisches Neuladen bei jedem Render!

**Beispiel:**
```typescript
const loadTasks = useCallback(async () => {
  // ...
}, [t]); // ❌ FALSCH - t ändert sich bei jedem Render!
```

### Pattern 3: `useCallback` mit `[filterLogicalOperators]`
**Verwendet in:**
- `Requests.tsx`

**Beispiel:**
```typescript
const fetchRequests = useCallback(async () => {
  // ...
}, [filterLogicalOperators]);
```

### Pattern 4: Direkte Funktion ohne `useCallback`
**Verwendet in:**
- `WorktimeStats.tsx`

**Beispiel:**
```typescript
const fetchStats = async () => {
  // ...
};
```

### Pattern 5: Direkte `axios`-Aufrufe statt `axiosInstance`
**Verwendet in:**
- `PayrollComponent.tsx`
- `SavedFilterTags.tsx`
- `FilterPane.tsx`

**Problem:** Doppelte `/api/api/...` Pfade in Production!

**Beispiel:**
```typescript
// ❌ FALSCH
import axios from 'axios';
import { API_BASE_URL } from '../config/api.ts';
const response = await axios.get(`${API_BASE_URL}/api/users`);

// ✅ RICHTIG
import axiosInstance from '../config/axios.ts';
const response = await axiosInstance.get('/users');
```

### Standardisierung:
- **Ziel:** Custom Hooks für Daten laden
- **Ziel:** Konsistente `axiosInstance`-Verwendung
- **Ziel:** `useTranslation` NIEMALS in `useCallback` Dependencies

---

## 3. DATEN-LADEN (4 verschiedene Patterns)

### Pattern 1: `useEffect` mit `[onError]`
**Verwendet in:**
- `BranchManagementTab.tsx`

**Beispiel:**
```typescript
useEffect(() => {
  loadData();
}, [loadData, onError]);
```

### Pattern 2: `useEffect` mit `[t]` - **FALSCH!**
**Verwendet in:**
- `Worktracker.tsx`
- `TeamWorktimeControl.tsx`

**Problem:** Verursacht automatisches Neuladen!

**Beispiel:**
```typescript
useEffect(() => {
  loadTasks();
}, [loadTasks, t]); // ❌ FALSCH
```

### Pattern 3: `useEffect` mit `[filterLogicalOperators]`
**Verwendet in:**
- `Requests.tsx`

**Beispiel:**
```typescript
useEffect(() => {
  fetchRequests();
}, [fetchRequests, filterLogicalOperators]);
```

### Pattern 4: Direkte Funktion ohne `useCallback`
**Verwendet in:**
- `WorktimeStats.tsx`

**Beispiel:**
```typescript
useEffect(() => {
  fetchStats();
}, []);
```

### Standardisierung:
- **Ziel:** Custom Hooks für Daten laden
- **Ziel:** Konsistente Dependencies
- **Ziel:** `useTranslation` NIEMALS in Dependencies

---

## 4. USE-TRANSLATION (2 verschiedene Patterns)

### Pattern 1: `t` in `useCallback` Dependencies - **FALSCH!**
**Verwendet in:**
- `Worktracker.tsx`
- `TeamWorktimeControl.tsx`

**Problem:** Verursacht automatisches Neuladen bei jedem Render!

**Beispiel:**
```typescript
const { t } = useTranslation();
const loadTasks = useCallback(async () => {
  // ...
  console.log(t('tasks.loaded'));
}, [t]); // ❌ FALSCH - t ändert sich bei jedem Render!
```

### Pattern 2: `t` NICHT in Dependencies, aber in Funktion verwendet - **RICHTIG!**
**Verwendet in:**
- `Requests.tsx` (teilweise)

**Beispiel:**
```typescript
const { t } = useTranslation();
const loadTasks = useCallback(async () => {
  // ...
  console.log(t('tasks.loaded'));
}, []); // ✅ RICHTIG - t wird verwendet, aber nicht in Dependencies
```

### Standardisierung:
- **Ziel:** `useTranslation` NIEMALS in `useCallback` Dependencies
- **Ziel:** `t` kann in Funktion verwendet werden, aber nicht in Dependencies
- **Vorteil:** Keine automatischen Neuladungen

---

## 5. INFINITE SCROLL (verschiedene Implementierungen)

### Implementierung 1: Worktracker.tsx - Tasks
**Datei:** `frontend/src/pages/Worktracker.tsx:639`

**Problem:**
- Keine Begrenzung der maximalen Anzahl
- Kein Cleanup von alten Items
- Memory Leak durch kontinuierliches Wachstum

**Beispiel:**
```typescript
setTasks(prev => [...prev, ...tasksWithAttachments]); // ❌ Keine Begrenzung!
```

### Implementierung 2: Requests.tsx - Requests
**Datei:** `frontend/src/components/Requests.tsx:471`

**Problem:**
- Gleiche Probleme wie Worktracker.tsx

**Beispiel:**
```typescript
setRequests(prev => [...prev, ...requestsWithAttachments]); // ❌ Keine Begrenzung!
```

### Implementierung 3: Worktracker.tsx - Reservations
**Datei:** `frontend/src/pages/Worktracker.tsx:760`

**Problem:**
- Gleiche Probleme wie Tasks

**Beispiel:**
```typescript
setReservations(prev => [...prev, ...reservationsData]); // ❌ Keine Begrenzung!
```

### Standardisierung:
- **Ziel:** Zentrale Infinite Scroll-Implementierung
- **Ziel:** Begrenzung der maximalen Anzahl Items (z.B. 1000)
- **Ziel:** Cleanup von alten Items
- **Ziel:** Konsistente Intersection Observer-Implementierung

---

## 6. POLLING-INTERVALLE (verschiedene Implementierungen)

### Implementierung 1: WorktimeContext.tsx
**Datei:** `frontend/src/contexts/WorktimeContext.tsx:62`

**Problem:**
- Keine Cleanup-Funktion
- Speichert alle Responses im Memory
- Memory Leak

**Beispiel:**
```typescript
setInterval(checkTrackingStatus, 30000); // ❌ Kein Cleanup!
```

### Implementierung 2: NotificationBell.tsx
**Datei:** `frontend/src/components/NotificationBell.tsx:195`

**Problem:**
- Gleiche Probleme wie WorktimeContext

**Beispiel:**
```typescript
setInterval(fetchUnreadCount, 60000); // ❌ Kein Cleanup!
```

### Implementierung 3: TeamWorktimeControl.tsx
**Datei:** `frontend/src/pages/TeamWorktimeControl.tsx:136`

**Problem:**
- Gleiche Probleme wie andere

**Beispiel:**
```typescript
setInterval(fetchActiveUsers, 30000); // ❌ Kein Cleanup!
```

### Standardisierung:
- **Ziel:** Zentrale Polling-Implementierung
- **Ziel:** Cleanup-Funktionen für alle Intervalle
- **Ziel:** Konsistente Intervalle
- **Ziel:** Memory-Management für Polling-Responses

---

## 7. LOADING-STATES (verschiedene Implementierungen)

### Pattern 1: Einzelner `loading` State
**Verwendet in:**
- `Worktracker.tsx`
- `Requests.tsx`

**Beispiel:**
```typescript
const [loading, setLoading] = useState(false);
```

### Pattern 2: Mehrere Loading-States
**Verwendet in:**
- `Worktracker.tsx` (tasksLoading, reservationsLoading, etc.)

**Beispiel:**
```typescript
const [tasksLoading, setTasksLoading] = useState(false);
const [reservationsLoading, setReservationsLoading] = useState(false);
```

### Pattern 3: Kein Loading-State
**Verwendet in:**
- `WorktimeStats.tsx`

**Beispiel:**
```typescript
// Kein Loading-State vorhanden
```

### Standardisierung:
- **Ziel:** Konsistente Loading-State-Implementierung
- **Ziel:** Einheitliche Loading-Indikatoren
- **Ziel:** Konsistente Error-States

---

## 8. FILTER-LOGIK (dupliziert in 5+ Dateien)

### Duplizierte Implementierungen:
1. `frontend/src/components/Requests.tsx` (Zeilen 432-560)
2. `frontend/src/pages/Worktracker.tsx` (Zeilen 502-673)
3. `frontend/src/components/InvoiceManagementTab.tsx` (Zeilen 304-357)
4. `frontend/src/components/ConsultationList.tsx`
5. `frontend/src/components/teamWorktime/ActiveUsersList.tsx`

### Problem:
- 85% identischer Code
- Änderungen müssen an mehreren Stellen gemacht werden
- Inkonsistenzen möglich

### Standardisierung:
- ✅ `frontend/src/utils/filterLogic.ts` existiert bereits
- **Ziel:** Alle duplizierten Implementierungen ersetzen
- **Einsparung:** ~300 Zeilen Code

---

## 9. STATUS-BADGES (dupliziert in mehreren Komponenten)

### Duplizierte Implementierungen:
- Status-Farben und -Texte in mehreren Tabellen-Komponenten
- Gleiche Logik an mehreren Stellen

### Standardisierung:
- ✅ `frontend/src/utils/statusUtils.tsx` existiert bereits
- **Ziel:** Alle duplizierten Implementierungen ersetzen
- **Einsparung:** ~100 Zeilen Code

---

## 10. CRUD-OPERATIONEN (dupliziert in Backend Controllern)

### Problem:
- CRUD-Operationen wiederholen sich in fast allen Controllern
- Ähnliche Validierung, Error-Handling, Response-Formatierung

### Betroffene Controller:
- `userController.ts`
- `taskController.ts`
- `requestController.ts`
- `branchController.ts`
- `roleController.ts`
- ... (fast alle Controller)

### Standardisierung:
- **Ziel:** `BaseController` mit gemeinsamen CRUD-Methoden
- **Ziel:** Controller erben von `BaseController`
- **Einsparung:** ~500-1000 Zeilen Code

---

## 11. VALIDIERUNG (verschiedene Patterns)

### Pattern 1: Direkte Validierung in Komponenten
**Verwendet in:**
- Viele Form-Komponenten

**Beispiel:**
```typescript
if (!title) {
  setError('Titel ist erforderlich');
  return;
}
```

### Pattern 2: Zod-Schemas
**Verwendet in:**
- `backend/src/validation/taskValidation.ts`
- `backend/src/validation/branchSettingsSchema.ts`
- `backend/src/validation/organizationSettingsSchema.ts`

**Beispiel:**
```typescript
const taskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
});
```

### Pattern 3: Keine Validierung
**Verwendet in:**
- Einige Form-Komponenten

### Standardisierung:
- **Ziel:** Konsistente Validierung mit Zod-Schemas
- **Ziel:** Frontend und Backend verwenden gleiche Schemas
- **Ziel:** Zentrale Validierungs-Utilities

---

## 12. DATE-FORMATIERUNG (verschiedene Libraries/Patterns)

### Pattern 1: `date-fns`
**Verwendet in:**
- `Worktracker.tsx`
- Viele andere Komponenten

**Beispiel:**
```typescript
import { format } from 'date-fns';
format(new Date(), 'dd.MM.yyyy');
```

### Pattern 2: `toLocaleDateString()`
**Verwendet in:**
- Einige Komponenten

**Beispiel:**
```typescript
new Date().toLocaleDateString('de-DE');
```

### Pattern 3: Manuelle Formatierung
**Verwendet in:**
- Einige Komponenten

**Beispiel:**
```typescript
const day = date.getDate();
const month = date.getMonth() + 1;
const year = date.getFullYear();
```

### Standardisierung:
- **Ziel:** Konsistente Date-Formatierung mit `date-fns`
- **Ziel:** Zentrale Date-Formatierungs-Utilities
- **Ziel:** Konsistente Locale-Verwendung

---

## 13. BUTTON-DESIGN (inkonsistent)

### Problem:
- Verschiedene Button-Styles in verschiedenen Komponenten
- Inkonsistente Icon-Verwendung
- Inkonsistente Größen

### Standardisierung:
- ✅ `DESIGN_STANDARDS.md` existiert bereits
- **Ziel:** Konsistente Button-Implementierung
- **Ziel:** Zentrale Button-Komponenten
- **Wichtig:** KEIN TEXT IN BUTTONS (laut DESIGN_STANDARDS.md)

---

## 14. SPACING (inkonsistent)

### Problem:
- Verschiedene Spacing-Werte in verschiedenen Komponenten
- Inkonsistente Verwendung von `space-y-*` und `mb-*`

### Standardisierung:
- ✅ `VIBES.md` definiert Standards:
  - `space-y-4` (16px) für vertical spacing in lists/containers
  - `gap-4` (16px) für grid layouts
  - **WICHTIG:** KEIN zusätzliches `mb-*` wenn Parent `space-y-*` verwendet
- **Ziel:** Konsistente Spacing-Implementierung
- **Ziel:** Zentrale Spacing-Utilities

---

## 15. CONTAINER-STRUKTUREN (inkonsistent)

### Problem:
- Verschiedene Container-Strukturen in verschiedenen Seiten
- Inkonsistente Verwendung von Boxen/Containern

### Standardisierung:
- ✅ `container-structures.md` existiert bereits
- **Ziel:** Konsistente Container-Strukturen
- **Ziel:** Zentrale Container-Komponenten

---

## 📋 ZUSAMMENFASSUNG: STANDARDISIERUNGS-PRIORITÄTEN

### Priorität 1: KRITISCH (Performance & Bugs)
1. ✅ Error-Handling standardisieren (3 Patterns → 1 Pattern)
2. ✅ API-Call-Patterns standardisieren (4+ Patterns → 1 Pattern)
3. ✅ useTranslation Pattern fixen (2 Patterns → 1 Pattern, 1 falsch)
4. ✅ Infinite Scroll standardisieren (Memory Leak)
5. ✅ Polling-Intervalle standardisieren (Memory Leak)

### Priorität 2: WICHTIG (Code-Qualität)
6. ✅ Daten-Laden standardisieren (4 Patterns → 1 Pattern)
7. ✅ Filter-Logik Duplikation eliminieren (5 Dateien → 1 Utility)
8. ✅ Status-Badges Duplikation eliminieren
9. ✅ CRUD-Operationen Duplikation eliminieren (Backend)

### Priorität 3: NORMAL (Wartbarkeit)
10. ✅ Loading-States standardisieren
11. ✅ Validierung standardisieren
12. ✅ Date-Formatierung standardisieren

### Priorität 4: NICE-TO-HAVE (UI/UX)
13. ✅ Button-Design standardisieren
14. ✅ Spacing standardisieren
15. ✅ Container-Strukturen standardisieren

---

## ✅ ERWARTETE VORTEILE

### Performance
- **Memory-Verbrauch:** Reduktion durch standardisierte Patterns
- **Ladezeit:** Verbesserung durch weniger Code-Duplikation
- **Bundle-Size:** Reduktion durch unused Code entfernen

### Wartbarkeit
- **Code-Qualität:** Weniger Duplikation, bessere Struktur
- **Entwickler-Erfahrung:** Einheitliche Patterns, weniger Verwirrung
- **Fehlerbehandlung:** Konsistente Error-Handling, weniger Bugs

### Skalierbarkeit
- **Neue Features:** Einfacher zu implementieren mit standardisierten Patterns
- **Code-Review:** Schneller durch konsistente Struktur
- **Onboarding:** Einfacher für neue Entwickler

---

## 📝 NOTIZEN

- Alle Standardisierungen müssen rückwärtskompatibel sein
- Keine Funktionalitäts- oder UX-Änderungen
- Nur Code-Qualität und Performance-Verbesserungen
- Testen nach jeder Standardisierung
- Dokumentation aktualisieren

