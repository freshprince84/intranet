# System-Bereinigung: Schritt-für-Schritt Implementierung

**Datum:** 2025-01-31  
**Status:** 📋 IMPLEMENTIERUNGSPLAN  
**Zweck:** Konkrete Schritt-für-Schritt Anleitung zur Behebung aller identifizierten Probleme

---

## 🎯 ÜBERSICHT: IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: KRITISCH - Memory Leaks & Performance (Sofort)
1. Infinite Scroll begrenzen
2. Polling-Intervalle Cleanup
3. URL.createObjectURL() Cleanup
4. useTranslation Pattern fixen (verursacht Neuladen)

### Phase 2: WICHTIG - Console-Logs (Performance)
5. Console-Logs wrappen/entfernen (2702 Statements)

### Phase 3: CODE-QUALITÄT - Duplikation eliminieren
6. Legacy FilterState entfernen
7. Filter-Logik Duplikation eliminieren
8. API-Call-Patterns standardisieren

### Phase 4: STANDARDISIERUNG - Patterns vereinheitlichen
9. Error-Handling standardisieren
10. Daten-Laden standardisieren
11. Loading-States standardisieren

### Phase 5: AUFRÄUMEN - Überflüssiger Code
12. TODO/FIXME abarbeiten/entfernen
13. Backup-Dateien entfernen
14. Temporäre Dateien aufräumen

---

## 🔴 PHASE 1: MEMORY LEAKS & PERFORMANCE (KRITISCH)

### Schritt 1.1: Infinite Scroll begrenzen

**Problem:**
- Arrays werden bei Infinite Scroll kontinuierlich erweitert
- KEINE Begrenzung → Memory Leak
- Betrifft: Worktracker.tsx (Tasks, Reservations), Requests.tsx

**Lösung:**

#### 1.1.1 Worktracker.tsx - Tasks begrenzen

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Vorher:**
```typescript
setTasks(prev => [...prev, ...tasksWithAttachments]); // ❌ Keine Begrenzung!
```

**Nachher:**
```typescript
const MAX_TASKS = 1000; // Maximale Anzahl Tasks im Memory

setTasks(prev => {
  const newTasks = [...prev, ...tasksWithAttachments];
  // Wenn Maximum überschritten, entferne älteste Items
  if (newTasks.length > MAX_TASKS) {
    return newTasks.slice(-MAX_TASKS); // Behalte nur die letzten MAX_TASKS
  }
  return newTasks;
});
```

**Schritte:**
1. Konstante `MAX_TASKS = 1000` definieren
2. `setTasks` Logik anpassen
3. Gleiche Logik für `setReservations` anwenden
4. Testen: Infinite Scroll funktioniert weiterhin
5. Testen: Memory wächst nicht mehr kontinuierlich

#### 1.1.2 Requests.tsx - Requests begrenzen

**Datei:** `frontend/src/components/Requests.tsx`

**Vorher:**
```typescript
setRequests(prev => [...prev, ...requestsWithAttachments]); // ❌ Keine Begrenzung!
```

**Nachher:**
```typescript
const MAX_REQUESTS = 1000; // Maximale Anzahl Requests im Memory

setRequests(prev => {
  const newRequests = [...prev, ...requestsWithAttachments];
  if (newRequests.length > MAX_REQUESTS) {
    return newRequests.slice(-MAX_REQUESTS);
  }
  return newRequests;
});
```

**Schritte:**
1. Konstante `MAX_REQUESTS = 1000` definieren
2. `setRequests` Logik anpassen
3. Testen: Infinite Scroll funktioniert weiterhin

---

### Schritt 1.2: Polling-Intervalle Cleanup

**Problem:**
- Polling-Intervalle haben keine Cleanup-Funktionen
- Memory Leak durch nicht entfernte Intervalle

**Lösung:**

#### 1.2.1 WorktimeContext.tsx

**Datei:** `frontend/src/contexts/WorktimeContext.tsx`

**Vorher:**
```typescript
useEffect(() => {
  setInterval(checkTrackingStatus, 30000); // ❌ Kein Cleanup!
}, []);
```

**Nachher:**
```typescript
useEffect(() => {
  const intervalId = setInterval(checkTrackingStatus, 30000);
  
  // Cleanup-Funktion
  return () => {
    clearInterval(intervalId);
  };
}, [checkTrackingStatus]); // checkTrackingStatus sollte useCallback sein
```

**Schritte:**
1. `setInterval` in Variable speichern
2. Cleanup-Funktion mit `clearInterval` hinzufügen
3. `checkTrackingStatus` mit `useCallback` wrappen
4. Testen: Interval wird beim Unmount entfernt

#### 1.2.2 NotificationBell.tsx

**Datei:** `frontend/src/components/NotificationBell.tsx`

**Vorher:**
```typescript
useEffect(() => {
  setInterval(fetchUnreadCount, 60000); // ❌ Kein Cleanup!
}, []);
```

**Nachher:**
```typescript
useEffect(() => {
  const intervalId = setInterval(fetchUnreadCount, 60000);
  
  return () => {
    clearInterval(intervalId);
  };
}, [fetchUnreadCount]);
```

**Schritte:**
1. Gleiche Logik wie WorktimeContext
2. `fetchUnreadCount` mit `useCallback` wrappen
3. Testen: Interval wird beim Unmount entfernt

#### 1.2.3 TeamWorktimeControl.tsx

**Datei:** `frontend/src/pages/TeamWorktimeControl.tsx`

**Vorher:**
```typescript
useEffect(() => {
  setInterval(fetchActiveUsers, 30000); // ❌ Kein Cleanup!
}, []);
```

**Nachher:**
```typescript
useEffect(() => {
  const intervalId = setInterval(fetchActiveUsers, 30000);
  
  return () => {
    clearInterval(intervalId);
  };
}, [fetchActiveUsers]);
```

**Schritte:**
1. Gleiche Logik wie andere
2. `fetchActiveUsers` mit `useCallback` wrappen
3. Testen: Interval wird beim Unmount entfernt

---

### Schritt 1.3: URL.createObjectURL() Cleanup

**Problem:**
- `URL.createObjectURL()` erstellt URLs, die nie aufgeräumt werden
- Memory Leak durch nicht freigegebene URLs

**Lösung:**

#### 1.3.1 MarkdownPreview.tsx

**Datei:** `frontend/src/components/MarkdownPreview.tsx`

**Vorher:**
```typescript
const getTemporaryFileUrl = (filename: string): string | null => {
  const url = URL.createObjectURL(blob); // ❌ Wird nie aufgeräumt!
  return url;
};
```

**Nachher:**
```typescript
const [createdUrls, setCreatedUrls] = useState<Set<string>>(new Set());

const getTemporaryFileUrl = (filename: string): string | null => {
  const url = URL.createObjectURL(blob);
  setCreatedUrls(prev => new Set(prev).add(url));
  return url;
};

// Cleanup beim Unmount
useEffect(() => {
  return () => {
    createdUrls.forEach(url => {
      URL.revokeObjectURL(url);
    });
  };
}, [createdUrls]);
```

**Schritte:**
1. State für erstellte URLs hinzufügen
2. Alle erstellten URLs tracken
3. Cleanup-Funktion mit `URL.revokeObjectURL()` hinzufügen
4. Testen: URLs werden beim Unmount freigegeben

---

### Schritt 1.4: useTranslation Pattern fixen

**Problem:**
- `useTranslation` wird in `useCallback` Dependencies verwendet
- Verursacht automatisches Neuladen bei jedem Render

**Lösung:**

#### 1.4.1 Worktracker.tsx

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Vorher:**
```typescript
const { t } = useTranslation();
const loadTasks = useCallback(async () => {
  // ...
  console.log(t('tasks.loaded'));
}, [t]); // ❌ FALSCH - t ändert sich bei jedem Render!
```

**Nachher:**
```typescript
const { t } = useTranslation();
const loadTasks = useCallback(async () => {
  // ...
  // t kann verwendet werden, aber NICHT in Dependencies
}, []); // ✅ RICHTIG - t wird verwendet, aber nicht in Dependencies
```

**Schritte:**
1. Alle `useCallback` mit `[t]` Dependency finden
2. `t` aus Dependencies entfernen
3. `t` kann weiterhin in Funktion verwendet werden
4. Testen: Keine automatischen Neuladungen mehr

#### 1.4.2 TeamWorktimeControl.tsx

**Datei:** `frontend/src/pages/TeamWorktimeControl.tsx`

**Vorher:**
```typescript
const { t } = useTranslation();
const fetchData = useCallback(async () => {
  // ...
}, [t]); // ❌ FALSCH
```

**Nachher:**
```typescript
const { t } = useTranslation();
const fetchData = useCallback(async () => {
  // ...
}, []); // ✅ RICHTIG
```

**Schritte:**
1. Gleiche Logik wie Worktracker.tsx
2. Alle betroffenen Dateien durchgehen
3. Testen: Keine automatischen Neuladungen mehr

---

## 📝 PHASE 2: CONSOLE-LOGS (PERFORMANCE)

### Schritt 2.1: Console-Log Utility erstellen

**Zweck:** Zentrale Funktion zum Wrappen von Console-Logs

**Datei:** `frontend/src/utils/logger.ts` (NEU)

**Inhalt:**
```typescript
/**
 * Logger Utility - Wrappt console.log Statements für Production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    // Warnungen immer anzeigen
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // Fehler immer anzeigen
    console.error(...args);
  }
};
```

**Schritte:**
1. Datei `frontend/src/utils/logger.ts` erstellen
2. Logger-Funktionen implementieren
3. Exportieren

---

### Schritt 2.2: apiClient.ts Console-Logs wrappen

**Datei:** `frontend/src/api/apiClient.ts`

**Vorher:**
```typescript
console.log('DEBUGAUSGABE API-Client: Vollständige Request URL:', fullUrl);
console.log('DEBUGAUSGABE API-Client: Request-Methode:', config.method?.toUpperCase());
// ... 31 console.log Statements
```

**Nachher:**
```typescript
import { logger } from '../utils/logger.ts';

logger.log('DEBUGAUSGABE API-Client: Vollständige Request URL:', fullUrl);
logger.log('DEBUGAUSGABE API-Client: Request-Methode:', config.method?.toUpperCase());
// ... alle console.log durch logger.log ersetzen
```

**Schritte:**
1. `logger` importieren
2. Alle `console.log` durch `logger.log` ersetzen
3. Alle `console.debug` durch `logger.debug` ersetzen
4. `console.error` behalten (oder durch `logger.error` ersetzen)
5. Testen: In Development funktioniert, in Production nicht

---

### Schritt 2.3: Worktracker.tsx Console-Logs wrappen

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Vorher:**
```typescript
console.log('Tasks geladen:', tasks.length);
// ... 25 console.log Statements
```

**Nachher:**
```typescript
import { logger } from '../utils/logger.ts';

logger.log('Tasks geladen:', tasks.length);
// ... alle console.log durch logger.log ersetzen
```

**Schritte:**
1. `logger` importieren
2. Alle `console.log` durch `logger.log` ersetzen
3. Testen: Funktionalität bleibt erhalten

---

### Schritt 2.4: Weitere Dateien systematisch durchgehen

**Priorität nach Anzahl:**
1. `RoleManagementTab.tsx` - 39 Statements
2. `UserManagementTab.tsx` - 37 Statements
3. `ConsultationList.tsx` - 30 Statements
4. `SavedFilterTags.tsx` - 21 Statements
5. `CreateTaskModal.tsx` - 12 Statements
6. ... (alle anderen Dateien)

**Schritte für jede Datei:**
1. `logger` importieren
2. Alle `console.log` durch `logger.log` ersetzen
3. Alle `console.debug` durch `logger.debug` ersetzen
4. `console.error` und `console.warn` behalten (oder durch `logger.error`/`logger.warn` ersetzen)
5. Testen: Funktionalität bleibt erhalten

---

### Schritt 2.5: Backend Console-Logs

**Problem:** Backend hat 1862 console.log Statements

**Lösung:**

#### Option 1: Wrappen mit Environment-Check
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  console.log('Debug-Info:', data);
}
```

#### Option 2: Strukturiertes Logging (empfohlen)
- Winston oder Pino verwenden
- Log-Level konfigurieren
- In Production nur Error/Warn

**Schritte:**
1. Entscheidung: Wrappen oder strukturiertes Logging?
2. Wenn Wrappen: Script erstellen zum automatischen Wrappen
3. Wenn strukturiertes Logging: Winston/Pino einrichten
4. Datei für Datei durchgehen
5. Testen: Logs funktionieren in Development, nicht in Production

---

## 🔄 PHASE 3: CODE-DUPLIKATION ELIMINIEREN

### Schritt 3.1: Legacy FilterState entfernen

**Problem:**
- Altes Filter-System existiert parallel zu neuem System
- Legacy-Code wird NIE verwendet (nur als Fallback, der nie ausgelöst wird)

**Lösung:**

#### 3.1.1 Requests.tsx

**Datei:** `frontend/src/components/Requests.tsx`

**Zu entfernen:**
1. `FilterState` Interface (falls vorhanden)
2. `filterState` State
3. `activeFilters` State
4. `applyFilterConditions` Funktion (Sync-Logik)
5. `applyFilters` Funktion (wird NIE aufgerufen)
6. Fallback-Logik (Zeilen mit `activeFilters`)

**Zu behalten:**
- `filterConditions` State
- `filterLogicalOperators` State
- `FilterPane` Komponente
- `SavedFilterTags` Komponente

**Schritte:**
1. Datei öffnen
2. Alle Legacy-Code-Stellen identifizieren
3. Legacy-Code entfernen
4. `getActiveFilterCount()` vereinfachen → `return filterConditions.length`
5. Testen: Filter funktionieren weiterhin

#### 3.1.2 Worktracker.tsx

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Schritte:**
1. Gleiche Logik wie Requests.tsx
2. Legacy-Code entfernen
3. Testen: Filter funktionieren weiterhin

#### 3.1.3 ActiveUsersList.tsx & RoleManagementTab.tsx

**Schritte:**
1. Gleiche Logik wie Requests.tsx
2. Legacy-Code entfernen
3. Testen: Filter funktionieren weiterhin

**WICHTIG:** `UserWorktimeTable.tsx` NICHT ändern - verwendet noch altes System!

---

### Schritt 3.2: Filter-Logik Duplikation eliminieren

**Problem:**
- Filter-Logik ist in 5+ Dateien dupliziert
- 85% identischer Code

**Lösung:**

#### 3.2.1 Prüfen: filterLogic.ts wird verwendet?

**Datei:** `frontend/src/utils/filterLogic.ts`

**Prüfung:**
1. Datei öffnen
2. Prüfen: Enthält alle benötigten Funktionen?
3. Prüfen: Wird bereits verwendet?

#### 3.2.2 Requests.tsx auf filterLogic.ts umstellen

**Datei:** `frontend/src/components/Requests.tsx`

**Vorher:**
```typescript
// Duplizierte Filter-Logik (Zeilen 432-560)
const applyFilters = (items: Request[], conditions: FilterCondition[]) => {
  // ... 128 Zeilen duplizierter Code
};
```

**Nachher:**
```typescript
import { applyFilters } from '../utils/filterLogic.ts';

// Duplizierte Logik entfernen, filterLogic.ts verwenden
const filteredRequests = applyFilters(requests, filterConditions);
```

**Schritte:**
1. `filterLogic.ts` importieren
2. Duplizierte Filter-Logik entfernen
3. `applyFilters` aus `filterLogic.ts` verwenden
4. Testen: Filter funktionieren identisch

#### 3.2.3 Weitere Dateien umstellen

**Dateien:**
- `Worktracker.tsx`
- `InvoiceManagementTab.tsx`
- `ConsultationList.tsx`
- `ActiveUsersList.tsx`

**Schritte:**
1. Gleiche Logik wie Requests.tsx
2. Duplizierte Logik entfernen
3. `filterLogic.ts` verwenden
4. Testen: Filter funktionieren identisch

---

### Schritt 3.3: API-Call-Patterns standardisieren

**Problem:**
- Verschiedene Patterns für API-Calls
- Direkte `axios`-Aufrufe statt `axiosInstance`

**Lösung:**

#### 3.3.1 PayrollComponent.tsx

**Datei:** `frontend/src/components/PayrollComponent.tsx`

**Vorher:**
```typescript
import axios from 'axios';
import { API_BASE_URL } from '../config/api.ts';
const response = await axios.get(`${API_BASE_URL}/api/users`); // ❌ Doppelte /api/api/...
```

**Nachher:**
```typescript
import axiosInstance from '../config/axios.ts';
const response = await axiosInstance.get('/users'); // ✅ Richtig
```

**Schritte:**
1. `axios` Import entfernen
2. `API_BASE_URL` Import entfernen
3. `axiosInstance` importieren
4. Alle `axios.get(`${API_BASE_URL}/api/...`)` durch `axiosInstance.get('/...')` ersetzen
5. Testen: API-Calls funktionieren

#### 3.3.2 SavedFilterTags.tsx

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

**Schritte:**
1. Gleiche Logik wie PayrollComponent.tsx
2. Alle direkten `axios`-Aufrufe durch `axiosInstance` ersetzen
3. Testen: API-Calls funktionieren

#### 3.3.3 Weitere Dateien

**Dateien mit direkten axios-Aufrufen finden:**
```bash
grep -r "axios.get\|axios.post\|axios.put\|axios.delete" frontend/src --include="*.tsx" --include="*.ts"
```

**Schritte:**
1. Alle Dateien mit direkten axios-Aufrufen finden
2. Jede Datei auf `axiosInstance` umstellen
3. Testen: API-Calls funktionieren

---

## 🎯 PHASE 4: STANDARDISIERUNG

### Schritt 4.1: Error-Handling standardisieren

**Problem:**
- 3 verschiedene Error-Handling-Patterns

**Lösung:**

#### 4.1.1 ErrorContext prüfen

**Datei:** `frontend/src/contexts/ErrorContext.tsx`

**Prüfung:**
1. Datei öffnen
2. Prüfen: Enthält `showError` Funktion?
3. Prüfen: Wird bereits verwendet?

#### 4.1.2 BranchManagementTab.tsx umstellen

**Datei:** `frontend/src/components/BranchManagementTab.tsx`

**Vorher:**
```typescript
const BranchManagementTab = ({ onError }: { onError: (message: string) => void }) => {
  const handleError = (error: any) => {
    onError(error.message);
  };
};
```

**Nachher:**
```typescript
import { useError } from '../contexts/ErrorContext.tsx';

const BranchManagementTab = () => {
  const { showError } = useError();
  
  const handleError = (error: any) => {
    showError(error.message);
  };
};
```

**Schritte:**
1. `onError` Prop entfernen
2. `useError` Hook verwenden
3. `showError` statt `onError` verwenden
4. Testen: Error-Handling funktioniert

#### 4.1.3 Weitere Komponenten umstellen

**Komponenten:**
- `TourProvidersTab.tsx`
- `UserManagementTab.tsx`
- `RoleManagementTab.tsx`
- `ToursTab.tsx`
- `Worktracker.tsx`
- `Requests.tsx`

**Schritte:**
1. Gleiche Logik wie BranchManagementTab.tsx
2. `onError` Props entfernen
3. `useError` Hook verwenden
4. Testen: Error-Handling funktioniert

---

### Schritt 4.2: Daten-Laden standardisieren

**Problem:**
- 4 verschiedene Patterns für Daten laden

**Lösung:**

#### 4.2.1 Custom Hook erstellen

**Datei:** `frontend/src/hooks/useDataLoader.ts` (NEU)

**Inhalt:**
```typescript
import { useState, useCallback } from 'react';
import { useError } from '../contexts/ErrorContext.tsx';

export function useDataLoader<T>(
  loadFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { showError } = useError();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadFunction();
      setData(result);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  return { data, loading, load };
}
```

**Schritte:**
1. Datei `frontend/src/hooks/useDataLoader.ts` erstellen
2. Hook implementieren
3. Exportieren

#### 4.2.2 Komponenten umstellen

**Beispiel: BranchManagementTab.tsx**

**Vorher:**
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const response = await axiosInstance.get('/api/data');
    setData(response.data);
  } catch (error) {
    onError(error.message);
  } finally {
    setLoading(false);
  }
}, [onError]);
```

**Nachher:**
```typescript
import { useDataLoader } from '../hooks/useDataLoader.ts';

const loadFunction = async () => {
  const response = await axiosInstance.get('/api/data');
  return response.data;
};

const { data, loading, load: loadData } = useDataLoader(loadFunction, []);
```

**Schritte:**
1. `useDataLoader` Hook verwenden
2. Alte Logik entfernen
3. Testen: Daten laden funktioniert

---

## 🧹 PHASE 5: AUFRÄUMEN

### Schritt 5.1: TODO/FIXME abarbeiten

**Schritte:**
1. Alle TODO/FIXME auflisten:
   ```bash
   grep -r "TODO\|FIXME\|XXX\|HACK" frontend/src backend/src --include="*.ts" --include="*.tsx"
   ```
2. Jeden TODO prüfen:
   - Noch relevant?
   - Kann abgearbeitet werden?
   - Sollte entfernt werden?
3. Relevante TODOs abarbeiten
4. Veraltete TODOs entfernen

---

### Schritt 5.2: Backup-Dateien entfernen

**Dateien:**
- `frontend/src/components/teamWorktime/UserWorktimeTable.tsx.backup`
- `backend/prisma/schema.prisma.backup`
- `frontend/src/components/auth/ExtendedRegistration.tsx~`

**Schritte:**
1. Prüfen: Enthalten wichtige Informationen?
2. Falls nicht: Entfernen
3. Falls ja: In Backup-Verzeichnis verschieben oder in Git-History behalten

---

### Schritt 5.3: Temporäre Dateien aufräumen

**Schritte:**
1. Alle temporären Dateien im Root auflisten
2. Prüfen: Enthalten wichtige Informationen?
3. Falls ja: In `docs/analysis/` oder `docs/technical/` verschieben
4. Falls nein: Entfernen
5. `.gitignore` aktualisieren für zukünftige temporäre Dateien

---

## ✅ TEST-STRATEGIE

### Nach jedem Schritt:
1. **Funktionalität testen:** Alle Features müssen identisch funktionieren
2. **Performance testen:** Memory-Verbrauch sollte nicht steigen
3. **Console prüfen:** Keine neuen Fehler in Console
4. **Browser testen:** In Development und Production testen

### Nach jeder Phase:
1. **Vollständiger Test:** Alle betroffenen Features testen
2. **Memory-Profil:** Memory-Verbrauch prüfen
3. **Performance-Profil:** Ladezeiten prüfen
4. **Commit:** Änderungen committen mit aussagekräftiger Message

---

## 📋 CHECKLISTE

### Phase 1: Memory Leaks
- [ ] Infinite Scroll begrenzen (Worktracker.tsx, Requests.tsx)
- [ ] Polling-Intervalle Cleanup (WorktimeContext, NotificationBell, TeamWorktimeControl)
- [ ] URL.createObjectURL() Cleanup (MarkdownPreview.tsx)
- [ ] useTranslation Pattern fixen (Worktracker.tsx, TeamWorktimeControl.tsx)

### Phase 2: Console-Logs
- [ ] Logger Utility erstellen
- [ ] apiClient.ts Console-Logs wrappen
- [ ] Worktracker.tsx Console-Logs wrappen
- [ ] Top 10 Dateien Console-Logs wrappen
- [ ] Backend Console-Logs wrappen

### Phase 3: Code-Duplikation
- [ ] Legacy FilterState entfernen (Requests, Worktracker, ActiveUsersList, RoleManagementTab)
- [ ] Filter-Logik Duplikation eliminieren
- [ ] API-Call-Patterns standardisieren

### Phase 4: Standardisierung
- [ ] Error-Handling standardisieren
- [ ] Daten-Laden standardisieren
- [ ] Loading-States standardisieren

### Phase 5: Aufräumen
- [ ] TODO/FIXME abarbeiten/entfernen
- [ ] Backup-Dateien entfernen
- [ ] Temporäre Dateien aufräumen

---

## ⚠️ WICHTIGE HINWEISE

1. **Schritt für Schritt:** Nicht alles auf einmal ändern
2. **Testen nach jedem Schritt:** Funktionalität muss erhalten bleiben
3. **Commits pro Phase:** Jede Phase in separatem Commit
4. **Dokumentation aktualisieren:** Nach jeder Änderung Docs aktualisieren
5. **User-Feedback:** Nach größeren Änderungen User-Feedback einholen

---

## 🚀 STARTEN

**Empfohlene Reihenfolge:**
1. **Phase 1.1:** Infinite Scroll begrenzen (kritisch, einfach)
2. **Phase 1.2:** Polling-Intervalle Cleanup (kritisch, einfach)
3. **Phase 1.3:** URL.createObjectURL() Cleanup (kritisch, einfach)
4. **Phase 1.4:** useTranslation Pattern fixen (kritisch, wichtig)
5. **Phase 2:** Console-Logs (Performance, viele Dateien)
6. **Phase 3:** Code-Duplikation (Code-Qualität)
7. **Phase 4:** Standardisierung (Wartbarkeit)
8. **Phase 5:** Aufräumen (Nice-to-have)

**Nach jeder Phase:**
- Testen
- Committen
- Weiter zur nächsten Phase

