# RAM-Problem: Verbleibende Punkte - Implementierungsplan

**Datum:** 2025-01-31  
**Status:** 📋 PLAN FÜR VERBLEIBENDE PUNKTE  
**Zweck:** Konkreter Plan für die noch offenen Memory-Probleme

---

## 📊 AKTUELLER STATUS

### ✅ Bereits implementiert (Code-verifiziert):
1. ✅ Infinite Scroll Begrenzung (MAX_TASKS, MAX_RESERVATIONS, MAX_REQUESTS = 1000)
2. ✅ URL.createObjectURL() Cleanup (5 Dateien behoben)
3. ✅ Polling-Intervalle Cleanup (bereits korrekt)
4. ✅ Filter-Sortierung entfernt
5. ✅ useTranslation Pattern Fix
6. ✅ FilterPane JSON.stringify() Optimierung (shallow comparison)
7. ✅ FilterContext TTL und Limits (60 Min TTL, Limits vorhanden)
8. ✅ Worktracker Filter-States Cleanup (bewusst entfernt - React macht automatisches Cleanup)

### ⚠️ Verbleibende Probleme:
1. 🔄 Console.log Migration (~91% noch zu migrieren)
2. ⚠️ FilterContext TTL ist 60 Minuten (statt 10 Minuten) - bewusste Entscheidung
3. ⚠️ useMemo/useCallback Dependencies optimieren
4. ⚠️ Mapping-Chaos vereinfachen (niedrige Priorität)

---

## 🎯 PRIORITÄT 1: Console.log Migration abschließen 🔴 HOCH

### Problem:
- Nur ~9% der Statements migriert (~250 von 2702)
- Migration läuft, aber noch nicht abgeschlossen
- Memory wächst weiter, bis Migration abgeschlossen

### Aktueller Stand:
- ✅ Logger.ts erstellt
- ✅ ~250+ Statements bereits gewrappt (~9%)
- ⏸️ ~2450 Statements noch zu migrieren (91%)

### Lösung:

#### Schritt 1: Frontend-Dateien systematisch durchgehen

**Top 10 Frontend-Dateien (noch zu migrieren):**
1. ⏸️ Worktracker.tsx - 11 Statements (laut Dokumentation bereits teilweise migriert)
2. ⏸️ CreateTaskModal.tsx - 12 Statements
3. ⏸️ NotificationBell.tsx - 9 Statements
4. ⏸️ Requests.tsx - 8 Statements
5. ⏸️ FilterPane.tsx - 4 Statements
6. ⏸️ Weitere 142 Dateien im Frontend

**Vorgehen:**
1. Datei öffnen
2. Alle `console.log/debug/info` → `logger.log/debug/info` ersetzen
3. Alle `console.error/warn` → `logger.error/warn` ersetzen
4. Logger import hinzufügen: `import { logger } from '../utils/logger.ts';`
5. Prüfen: Keine `console.*` Statements mehr (außer in logger.ts)

#### Schritt 2: Backend-Dateien systematisch durchgehen

**Top 10 Backend-Dateien (noch zu migrieren):**
1. ⏸️ Strukturiertes Logging einrichten (Winston/Pino)
2. ⏸️ Oder: Wrapper-Funktion erstellen
3. ⏸️ Top 10 Backend-Dateien durchgehen

**Vorgehen:**
1. Strukturiertes Logging einrichten (Winston/Pino empfohlen)
2. Oder: Wrapper-Funktion erstellen (ähnlich wie Frontend logger.ts)
3. Alle `console.*` Statements ersetzen
4. Prüfen: Keine `console.*` Statements mehr (außer in Logger)

#### Schritt 3: Validierung

**Tests:**
1. Development Build: Logs sollten sichtbar sein
2. Production Build: Logs sollten NICHT sichtbar sein (außer error/warn)
3. Memory prüfen: Console-History sollte nicht mehr wachsen

**Erwartete Verbesserung:**
- Memory-Verbrauch: 10-50MB Reduktion
- Console-History: Wächst nicht mehr kontinuierlich

---

## 🎯 PRIORITÄT 2: FilterContext TTL reduzieren? 🟡 MITTEL

### Problem:
- TTL ist 60 Minuten (statt 10 Minuten wie geplant)
- Filter bleiben länger im Memory

### Aktueller Code:
```typescript
const FILTER_CACHE_TTL_MS = 60 * 60 * 1000; // 60 Minuten (erhöht von 10 auf 60 Minuten, damit Filter nicht verschwinden)
```

### Entscheidung nötig:
**Sollen Filter nach 10 oder 60 Minuten verschwinden?**

**Option 1: TTL auf 10-15 Minuten reduzieren**
- **Vorteil:** 5-20MB Memory-Reduktion
- **Nachteil:** Filter verschwinden schneller (müssen neu geladen werden)

**Option 2: TTL bei 60 Minuten belassen**
- **Vorteil:** Filter bleiben länger verfügbar (bessere UX)
- **Nachteil:** 5-20MB mehr Memory-Verbrauch

**Empfehlung:** TTL bei 60 Minuten belassen (bessere UX, Memory-Impact ist gering)

### Lösung (wenn TTL reduziert werden soll):

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** 75

**Änderung:**
```typescript
// Vorher:
const FILTER_CACHE_TTL_MS = 60 * 60 * 1000; // 60 Minuten

// Nachher:
const FILTER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minuten (Kompromiss zwischen Memory und UX)
```

**Erwartete Verbesserung:**
- Memory-Verbrauch: 5-20MB Reduktion

---

## 🎯 PRIORITÄT 3: useMemo/useCallback Dependencies optimieren 🟡 MITTEL

### Problem:
- Viele Dependencies in useMemo (z.B. `filteredAndSortedTasks` hat 15 Dependencies)
- React Cache behält alte Werte

### Betroffene Dateien:
1. Worktracker.tsx - `filteredAndSortedTasks` (15 Dependencies laut Dokumentation)
2. Requests.tsx - `filteredAndSortedRequests` (viele Dependencies)
3. Weitere Komponenten mit vielen useMemo Dependencies

### Lösung:

#### Schritt 1: Dependencies analysieren

**Für jede useMemo/useCallback:**
1. Prüfen: Welche Dependencies sind wirklich nötig?
2. Prüfen: Können Dependencies zusammengefasst werden?
3. Prüfen: Können Dependencies durch Refs ersetzt werden?

#### Schritt 2: Dependencies reduzieren

**Beispiel: Worktracker.tsx - `filteredAndSortedTasks`**

**Aktuell (laut Dokumentation):**
```typescript
const filteredAndSortedTasks = useMemo(() => {
  // ... Filter- und Sortierlogik
}, [
  tasks,
  filterConditions,
  filterLogicalOperators,
  tableSortConfig,
  viewMode,
  cardMetadataOrder,
  visibleCardMetadata,
  // ... weitere Dependencies
]); // 15 Dependencies
```

**Optimierung:**
1. Prüfen: Welche Dependencies ändern sich wirklich?
2. Prüfen: Können einige Dependencies durch Refs ersetzt werden?
3. Prüfen: Können Dependencies zusammengefasst werden?

#### Schritt 3: useMemo nur für teure Berechnungen

**Regel:**
- useMemo nur verwenden, wenn Berechnung teuer ist (> 1ms)
- useMemo nicht für einfache Berechnungen verwenden

**Erwartete Verbesserung:**
- Memory-Verbrauch: 5-20MB Reduktion
- Performance: Weniger Re-Berechnungen

---

## 🎯 PRIORITÄT 4: Mapping-Chaos vereinfachen 🟢 NIEDRIG

### Problem:
- 6 verschiedene Mapping-Objekte in Worktracker.tsx
- Komplexe Helfer-Funktionen

### Betroffene Dateien:
1. Worktracker.tsx - 6 Mapping-Objekte (Tasks, Reservations, Tour Bookings × 2)
2. Requests.tsx - 2 Mapping-Objekte

### Lösung:

#### Schritt 1: Mapping-Objekte analysieren

**Für jedes Mapping-Objekt:**
1. Prüfen: Wird es wirklich benötigt?
2. Prüfen: Können Mapping-Objekte zusammengefasst werden?
3. Prüfen: Können Helfer-Funktionen vereinfacht werden?

#### Schritt 2: Mapping-Objekte vereinfachen

**Option 1: Zentrale Mapping-Funktion**
- Eine zentrale Funktion für alle Mapping-Operationen
- Reduziert Code-Duplikation

**Option 2: Mapping-Objekte konsolidieren**
- Ähnliche Mapping-Objekte zusammenfassen
- Reduziert Anzahl der Objekte

**Erwartete Verbesserung:**
- Memory-Verbrauch: 2-5MB Reduktion
- Code-Qualität: Bessere Wartbarkeit

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Priorität 1: Console.log Migration
- [ ] Frontend-Dateien systematisch durchgehen (Top 10)
- [ ] Backend-Dateien systematisch durchgehen (Top 10)
- [ ] Strukturiertes Logging einrichten (Backend)
- [ ] Validierung: Development vs. Production
- [ ] Memory prüfen: Console-History sollte nicht mehr wachsen

### Priorität 2: FilterContext TTL
- [ ] Entscheidung: TTL reduzieren oder belassen?
- [ ] Wenn reduziert: TTL auf 15 Minuten setzen
- [ ] Validierung: Filter bleiben verfügbar

### Priorität 3: useMemo/useCallback Dependencies
- [ ] Dependencies analysieren (Worktracker.tsx, Requests.tsx)
- [ ] Dependencies reduzieren
- [ ] useMemo nur für teure Berechnungen
- [ ] Validierung: Performance und Memory

### Priorität 4: Mapping-Chaos vereinfachen
- [ ] Mapping-Objekte analysieren
- [ ] Mapping-Objekte vereinfachen
- [ ] Validierung: Code-Qualität

---

## 📊 ERWARTETE VERBESSERUNGEN

### Vorher (aktuell):
- **Memory-Verbrauch:** ~236-950MB
- **Console.log History:** ~10-50MB (wächst kontinuierlich)
- **FilterContext:** ~25-70MB (60 Min TTL)
- **useMemo/useCallback:** ~10-50MB (viele Dependencies)

### Nachher (nach Implementierung):
- **Memory-Verbrauch:** ~200-850MB (15-10% Reduktion)
- **Console.log History:** ~0-5MB (nur in Development)
- **FilterContext:** ~20-60MB (wenn TTL reduziert wird)
- **useMemo/useCallback:** ~5-30MB (optimierte Dependencies)

**Gesamt-Reduktion:** ~36-100MB (15-10% Reduktion)

---

## ⚠️ WICHTIGE HINWEISE

1. **Nicht alles auf einmal ändern** - Schritt für Schritt vorgehen
2. **Nach jedem Schritt testen** - Funktionalität muss erhalten bleiben
3. **Commits pro Priorität** - Jede Priorität in separatem Commit
4. **Dokumentation aktualisieren** - Nach jeder Änderung Docs aktualisieren
5. **Memory messen** - Vorher/nachher Memory-Snapshots erstellen

---

**Erstellt:** 2025-01-31  
**Status:** 📋 PLAN FÜR VERBLEIBENDE PUNKTE  
**Nächster Schritt:** Priorität 1 - Console.log Migration fortsetzen
