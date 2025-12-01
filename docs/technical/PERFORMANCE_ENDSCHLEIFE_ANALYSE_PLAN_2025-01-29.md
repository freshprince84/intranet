# Performance: Endlosschleife - Analyse-Plan (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - KEINE CODE-ÄNDERUNGEN  
**Kritikalität:** 🔴 KRITISCH - RAM steigt auf 700MB+, tausende Logs pro Minute

---

## ⚠️ WICHTIG: NUR ANALYSE - KEINE ÄNDERUNGEN

**Vorgehen:**
1. ✅ Problem identifizieren
2. ✅ Root Cause analysieren
3. ✅ Plan erstellen
4. ⏸️ **WARTEN auf Bestätigung**
5. ⏸️ **DANN erst umsetzen**

---

## 🔴 PROBLEM-BESCHREIBUNG

### Symptome:
- **Dashboard öffnen → sofort 700MB RAM & steigend**
- **Tausende Log-Einträge pro Minute**
- **Browser Console lässt sich kaum öffnen**
- **System wird unbrauchbar**

### Beobachtungen:
- Problem tritt auf, sobald Dashboard geöffnet wird
- RAM steigt kontinuierlich, auch ohne User-Interaktion
- Logs sind hauptsächlich "DEBUGAUSGABE API-Client" Einträge

---

## 🔍 IDENTIFIZIERTE PROBLEM-QUELLEN

### 1. **Exzessives Logging in `apiClient.ts`** ⚠️🔴

**Datei:** `frontend/src/api/apiClient.ts`

**Problem:**
- **Jeder API-Request** loggt mehrere Zeilen:
  - `DEBUGAUSGABE API-Client: Vollständige Request URL`
  - `DEBUGAUSGABE API-Client: Request-Methode`
  - `DEBUGAUSGABE API-Client: Request-Headers`
  - `DEBUGAUSGABE API-Client: Request-Daten`
  - `DEBUGAUSGABE API-Client: Token vorhanden`
  - `DEBUGAUSGABE API-Client: Response erhalten`
  - `DEBUGAUSGABE API-Client: Fehler im Response Interceptor`

**Impact:**
- Bei 100 API-Requests = **700+ Log-Einträge**
- Bei Endlosschleife = **Tausende Log-Einträge pro Minute**
- Browser speichert alle Logs im Memory → **RAM steigt**

---

### 2. **ClaudeConsole fängt ALLE Logs ab** ⚠️🔴

**Datei:** `frontend/src/utils/claudeConsole.ts`

**Problem:**
- `claudeConsole.ts` überschreibt **ALLE** `console.log/warn/error` Methoden (Zeile 74-95)
- **Jeder** `console.log` wird:
  1. An Browser-Console gesendet
  2. An WebSocket gesendet (wenn verbunden)
  3. Im Buffer gespeichert (wenn nicht verbunden)

**Impact:**
- **Doppelte Speicherung:** Browser-Console + WebSocket-Buffer
- **Serialisierung:** Komplexe Objekte werden mit `stringify` serialisiert → zusätzlicher Memory-Verbrauch
- **Buffer wächst:** Wenn WebSocket nicht verbunden, wächst Buffer auf 1000 Einträge

---

### 3. **Mögliche Endlosschleife in useEffect Hooks** ⚠️🔴

**Zu prüfen:**
- Welche `useEffect` Hooks laufen kontinuierlich?
- Welche API-Requests werden wiederholt aufgerufen?
- Gibt es State-Updates, die Re-Renders triggern?

**Vermutung:**
- `SavedFilterTags` lädt Filter
- `Worktracker` lädt Filter
- Beide triggern sich möglicherweise gegenseitig

---

## 📊 ANALYSE-SCHRITTE

### Schritt 1: Logging-Volumen messen

**Fragen:**
1. Wie viele `console.log` Statements werden pro Sekunde ausgeführt?
2. Welche Komponenten loggen am meisten?
3. Wie groß ist der Browser-Console-Buffer?

**Methoden:**
- Browser DevTools → Performance Tab → Memory Profiling
- Browser DevTools → Console → Log-Count
- Network Tab → Request-Count

---

### Schritt 2: API-Request-Pattern analysieren

**Fragen:**
1. Welche API-Endpoints werden wiederholt aufgerufen?
2. Wie oft werden sie pro Sekunde aufgerufen?
3. Gibt es eine Endlosschleife in API-Requests?

**Methoden:**
- Browser DevTools → Network Tab → Filter nach Endpoint
- Backend-Logs prüfen → Request-Frequenz
- React DevTools → Component Profiler → Re-Render-Count

---

### Schritt 3: useEffect Hooks analysieren

**Fragen:**
1. Welche `useEffect` Hooks haben fehlende oder falsche Dependencies?
2. Welche `useEffect` Hooks laufen bei jedem Render?
3. Gibt es State-Updates, die Re-Renders triggern?

**Methoden:**
- React DevTools → Profiler → Record Re-Renders
- Code-Review → Alle `useEffect` Hooks prüfen
- Console → `useEffect` Dependencies loggen

---

### Schritt 4: Memory-Leaks identifizieren

**Fragen:**
1. Welche Objekte bleiben im Memory?
2. Gibt es Event-Listener, die nicht aufgeräumt werden?
3. Gibt es WebSocket-Verbindungen, die nicht geschlossen werden?

**Methoden:**
- Browser DevTools → Memory Tab → Heap Snapshot
- Browser DevTools → Performance Tab → Memory Timeline
- Code-Review → Event-Listener Cleanup prüfen

---

## 🎯 HYPOTHESEN

### Hypothese 1: Logging ist Hauptproblem
- **Wahrscheinlichkeit:** 80%
- **Begründung:** Tausende Log-Einträge pro Minute → Browser speichert alle → RAM steigt
- **Lösung:** Debug-Logging deaktivieren oder reduzieren

### Hypothese 2: Endlosschleife in API-Requests
- **Wahrscheinlichkeit:** 60%
- **Begründung:** RAM steigt kontinuierlich → deutet auf wiederholte Requests hin
- **Lösung:** Endlosschleife identifizieren und beheben

### Hypothese 3: Memory-Leak in ClaudeConsole
- **Wahrscheinlichkeit:** 40%
- **Begründung:** WebSocket-Buffer wächst, Objekte werden nicht freigegeben
- **Lösung:** Buffer-Größe reduzieren, Objekte früher freigeben

---

## 📝 NÄCHSTE SCHRITTE

### 1. Sofort-Analyse (ohne Code-Änderungen):
- [ ] Browser DevTools → Console → Log-Count prüfen
- [ ] Browser DevTools → Network Tab → Request-Count prüfen
- [ ] Browser DevTools → Memory Tab → Heap Snapshot erstellen
- [ ] React DevTools → Profiler → Re-Render-Count prüfen

### 2. Code-Review (ohne Änderungen):
- [ ] `apiClient.ts` → Alle `console.log` Statements zählen
- [ ] `claudeConsole.ts` → Buffer-Größe und Serialisierung prüfen
- [ ] `Worktracker.tsx` → Alle `useEffect` Hooks prüfen
- [ ] `SavedFilterTags.tsx` → Alle `useEffect` Hooks prüfen

### 3. Plan erstellen:
- [ ] Problem-Ranking (welches Problem ist am kritischsten?)
- [ ] Lösungs-Strategie (welche Lösung hat größten Impact?)
- [ ] Implementierungs-Plan (welche Änderungen sind nötig?)

### 4. Bestätigung einholen:
- [ ] Plan dem Benutzer vorlegen
- [ ] Auf Bestätigung warten
- [ ] **DANN erst umsetzen**

---

## ⚠️ WICHTIGE REGELN

1. **KEINE Code-Änderungen ohne Plan**
2. **KEINE Code-Änderungen ohne Bestätigung**
3. **NUR Analyse und Dokumentation**
4. **Plan muss vollständig sein, bevor Umsetzung beginnt**

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 ANALYSE - KEINE CODE-ÄNDERUNGEN  
**Nächster Schritt:** Browser DevTools-Analyse durchführen

