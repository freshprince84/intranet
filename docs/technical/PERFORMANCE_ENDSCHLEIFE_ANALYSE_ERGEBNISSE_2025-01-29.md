# Performance: Endlosschleife - Analyse-Ergebnisse (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE ABGESCHLOSSEN - KEINE CODE-ÄNDERUNGEN  
**Kritikalität:** 🔴 KRITISCH - RAM steigt auf 700MB+, tausende Logs pro Minute

---

## 📊 CODE-ANALYSE-ERGEBNISSE

### 1. Exzessives Logging in `apiClient.ts` ⚠️🔴

**Datei:** `frontend/src/api/apiClient.ts`

**Gefunden:**
- **31 `console.log` Statements** in einem einzigen File
- **Jeder API-Request** loggt **7+ Zeilen:**
  1. `DEBUGAUSGABE API-Client: Vollständige Request URL`
  2. `DEBUGAUSGABE API-Client: Request-Methode`
  3. `DEBUGAUSGABE API-Client: Request-Headers`
  4. `DEBUGAUSGABE API-Client: Request-Daten`
  5. `DEBUGAUSGABE API-Client: Token vorhanden`
  6. `DEBUGAUSGABE API-Client: Response erhalten`
  7. `DEBUGAUSGABE API-Client: Fehler im Response Interceptor` (bei Fehlern)

**Impact-Berechnung:**
- Bei **100 API-Requests** = **700+ Log-Einträge**
- Bei **1000 API-Requests** = **7000+ Log-Einträge**
- Bei Endlosschleife (z.B. 10 Requests/Sekunde) = **4200+ Log-Einträge pro Minute**

**Problem:**
- Browser speichert **alle** Log-Einträge im Memory
- Jeder Log-Eintrag enthält **komplexe Objekte** (Headers, Data, etc.)
- **Serialisierung** durch `claudeConsole.ts` → zusätzlicher Memory-Verbrauch

---

### 2. ClaudeConsole fängt ALLE Logs ab ⚠️🔴

**Datei:** `frontend/src/utils/claudeConsole.ts`

**Gefunden:**
- `claudeConsole.ts` überschreibt **ALLE** `console.log/warn/error` Methoden (Zeile 74-95)
- **Jeder** `console.log` wird:
  1. An Browser-Console gesendet (im Memory gespeichert)
  2. An WebSocket gesendet (wenn verbunden)
  3. Im Buffer gespeichert (wenn nicht verbunden, max 1000 Einträge)

**Serialisierung:**
- Komplexe Objekte werden mit `stringify` serialisiert (Zeile 115-138)
- **Jeder Log-Eintrag** wird vollständig serialisiert → zusätzlicher Memory-Verbrauch
- Buffer wächst auf **1000 Einträge** → **zusätzliche 10-50MB Memory**

**Problem:**
- **Doppelte Speicherung:** Browser-Console + WebSocket-Buffer
- **Keine Begrenzung** der Browser-Console-Logs
- **Keine Cleanup-Mechanismus** für alte Logs

---

### 3. Dashboard lädt mehrere Komponenten ⚠️

**Datei:** `frontend/src/pages/Dashboard.tsx`

**Gefunden:**
- Dashboard rendert:
  1. `WorktimeStats` → macht API-Requests
  2. `Requests` → macht API-Requests + lädt Filter
  3. `AppDownload` → macht möglicherweise API-Requests

**Problem:**
- Alle Komponenten laden **sofort beim Mount**
- Jeder API-Request erzeugt **7+ Log-Einträge**
- **Keine Lazy-Loading** oder **Debouncing**

---

### 4. useEffect Hooks in Worktracker.tsx ⚠️

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Gefundene useEffect Hooks:**
1. **Zeile 939-985:** `setInitialTodoFilter` → lädt Filter + Tasks
   - Dependencies: `[activeTab, hasPermission, loadTasks, applyFilterConditions, initialFilterLoading]`
   - **Problem:** `loadTasks` und `applyFilterConditions` könnten sich ändern → erneuter Aufruf

2. **Zeile 814-846:** `setInitialReservationFilter` → lädt Filter + Reservations
   - Dependencies: `[activeTab, hasPermission, loadReservations, applyReservationFilterConditions, initialReservationFilterLoading]`
   - **Problem:** Gleiche Dependencies-Probleme

3. **Zeile 1804-1833:** Infinite Scroll für Tasks
   - Dependencies: `[activeTab, tasksHasMore, tasksLoadingMore, loading, tasks.length, selectedFilterId, filterConditions, loadTasks]`
   - **Problem:** `filterConditions` ändert sich → Observer wird neu erstellt

4. **Zeile 1836-1865:** Infinite Scroll für Reservations
   - Dependencies: `[activeTab, reservationsHasMore, reservationsLoadingMore, reservationsLoading, reservations.length, reservationSelectedFilterId, reservationFilterConditions, loadReservations]`
   - **Problem:** Gleiche Dependencies-Probleme

**Vermutung:**
- `filterConditions` ändert sich → Infinite Scroll Observer wird neu erstellt
- Observer triggert möglicherweise erneut → Endlosschleife möglich

---

### 5. useEffect Hooks in SavedFilterTags.tsx ⚠️

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

**Gefundene useEffect Hooks:**
1. **Zeile 212-256:** Lädt Filter und Gruppen
   - Dependencies: `[tableId, defaultFilterName, activeFilterName, onFilterChange, onSelectFilter]`
   - **Problem:** `onFilterChange` und `onSelectFilter` könnten sich ändern → erneuter Aufruf

2. **Zeile 277-283:** Expose `refreshFilters` auf `window`
   - Dependencies: `[refreshFilters]`
   - **Problem:** `refreshFilters` ändert sich → erneuter Aufruf

3. **Zeile 206-208:** Lädt Recent Clients
   - Dependencies: `[loadRecentClients]`
   - **Problem:** `loadRecentClients` ändert sich → erneuter Aufruf

**Vermutung:**
- Wenn `onFilterChange` sich ändert → Filter werden neu geladen
- Filter-Laden triggert möglicherweise `onFilterChange` → Endlosschleife möglich

---

## 🎯 ROOT CAUSE HYPOTHESEN

### Hypothese 1: Logging ist Hauptproblem (Wahrscheinlichkeit: 90%)

**Begründung:**
- **31 console.log Statements** in `apiClient.ts`
- **Jeder API-Request** erzeugt **7+ Log-Einträge**
- Browser speichert **alle** Logs im Memory
- Bei vielen API-Requests → **tausende Log-Einträge** → **RAM steigt**

**Beweis:**
- Problem tritt auf, sobald Dashboard geöffnet wird
- Logs sind hauptsächlich "DEBUGAUSGABE API-Client" Einträge
- Browser Console lässt sich kaum öffnen (zu viele Logs)

**Lösung:**
- Debug-Logging in `apiClient.ts` **deaktivieren** oder **reduzieren**
- Nur in Development-Mode loggen
- Oder: Logging-Level einstellen (nur Errors/Warnings)

---

### Hypothese 2: Endlosschleife in API-Requests (Wahrscheinlichkeit: 60%)

**Begründung:**
- RAM steigt **kontinuierlich** → deutet auf wiederholte Requests hin
- `useEffect` Hooks haben möglicherweise **falsche Dependencies**
- `filterConditions` ändert sich → Observer wird neu erstellt → möglicherweise erneuter Request

**Beweis:**
- Müssen Browser-Console-Befehle ausführen, um zu bestätigen

**Lösung:**
- `useEffect` Dependencies korrigieren
- `useCallback` für stabile Referenzen verwenden
- Loading-States verhindern doppelte Requests

---

### Hypothese 3: Memory-Leak in ClaudeConsole (Wahrscheinlichkeit: 40%)

**Begründung:**
- WebSocket-Buffer wächst auf **1000 Einträge**
- Objekte werden nicht freigegeben
- Serialisierung erzeugt zusätzliche Objekte

**Beweis:**
- Müssen Memory-Profiling durchführen

**Lösung:**
- Buffer-Größe reduzieren
- Objekte früher freigeben
- Oder: ClaudeConsole in Production deaktivieren

---

## 📝 NÄCHSTE SCHRITTE

### 1. Browser-Console-Befehle ausführen ⏸️

**Datei:** `docs/technical/PERFORMANCE_ENDSCHLEIFE_BROWSER_BEFEHLE_2025-01-29.md`

**Befehle:**
1. Log-Count messen (pro Sekunde)
2. API-Request-Count messen
3. DEBUGAUSGABE-Logs zählen
4. Memory-Usage messen
5. WebSocket-Verbindung prüfen

**Erwartete Ergebnisse:**
- Wenn > 100 Logs/Sekunde → Hypothese 1 bestätigt
- Wenn > 100 API-Requests/10s → Hypothese 2 bestätigt
- Wenn > 10 MB Memory-Wachstum/20s → Hypothese 3 bestätigt

---

### 2. Lösungs-Plan erstellen ⏸️

**Nach Browser-Analyse:**
1. Problem-Ranking (welches Problem ist am kritischsten?)
2. Lösungs-Strategie (welche Lösung hat größten Impact?)
3. Implementierungs-Plan (welche Änderungen sind nötig?)

**Mögliche Lösungen:**
1. **Debug-Logging deaktivieren** (schnell, großer Impact)
2. **useEffect Dependencies korrigieren** (mittel, mittlerer Impact)
3. **ClaudeConsole optimieren** (langsam, kleiner Impact)

---

### 3. Bestätigung einholen ⏸️

**Vor Umsetzung:**
1. Plan dem Benutzer vorlegen
2. Auf Bestätigung warten
3. **DANN erst umsetzen**

---

## ⚠️ WICHTIGE REGELN

1. **KEINE Code-Änderungen ohne Plan**
2. **KEINE Code-Änderungen ohne Bestätigung**
3. **NUR Analyse und Dokumentation**
4. **Plan muss vollständig sein, bevor Umsetzung beginnt**

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 ANALYSE ABGESCHLOSSEN - KEINE CODE-ÄNDERUNGEN  
**Nächster Schritt:** Browser-Console-Befehle ausführen und Ergebnisse dokumentieren

