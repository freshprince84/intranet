# Automatisches Neuladen - Risikoanalyse

**Erstellt:** 2025-01-31  
**Status:** 📋 RISIKOANALYSE  
**Ziel:** Vollständige Risikoanalyse für Standardisierungsplan

---

## 📚 ALLE GELESENEN DOKUMENTE

### Hauptdokumentation
1. ✅ `README.md` - Projektübersicht
2. ✅ `docs/claude/readme.md` - Claude-spezifische Informationen
3. ✅ `docs/core/CODING_STANDARDS.md` - Coding-Standards (useCallback, useEffect, Fehlerbehandlung)
4. ✅ `docs/claude/patterns/api_error_handling.md` - API-Fehlerbehandlungsmuster

### Technische Dokumentation (Performance & Memory)
5. ✅ `docs/technical/MEMORY_VERBRAUCH_500MB_ANALYSE_2025-01-30.md` - Memory-Analyse
6. ✅ `docs/technical/MEMORY_LEAK_KONTINUIERLICHES_WACHSTUM_2025-01-30.md` - Memory Leak Analyse
7. ✅ `docs/technical/MEMORY_LEAK_FIX_INFINITE_SCROLL_2025-01-30.md` - **KRITISCH:** Intersection Observer Fix
8. ✅ `docs/technical/PERFORMANCE_FIX_HEADER_SIDEBAR_RELOAD_2025-01-22.md` - Performance Fix Pattern

### Implementation Plans
9. ✅ `docs/implementation_plans/AUTOMATISCHES_NEULADEN_STANDARDISIERUNGSPLAN_2025-01-31.md` - Original-Plan
10. ✅ `docs/implementation_plans/AUTOMATISCHES_NEULADEN_PLAN_PRUEFUNG_2025-01-31.md` - Plan-Prüfung

### Code-Analyse
11. ✅ `frontend/src/contexts/ErrorContext.tsx` - ErrorContext Implementierung
12. ✅ `frontend/src/hooks/useErrorHandling.ts` - useErrorHandling Hook
13. ✅ `frontend/src/contexts/MessageContext.tsx` - MessageContext Implementierung
14. ✅ `frontend/src/hooks/useMessage.ts` - useMessage Hook
15. ✅ `frontend/src/contexts/WorktimeContext.tsx` - Polling Pattern
16. ✅ `frontend/src/components/NotificationBell.tsx` - Polling Pattern

---

## 🔴 RISIKEN: WAS KÖNNTE KAPUTTGEHEN?

### Risiko 1: Breaking Changes bei ErrorContext Migration

**Risiko:** 🔴 **HOCH**

**Was könnte passieren:**
- Komponenten die `onError` Prop erwarten, bekommen sie nicht mehr
- Fehlerbehandlung funktioniert nicht mehr
- Fehlermeldungen werden nicht angezeigt

**Betroffene Komponenten:**
- `BranchManagementTab.tsx`
- `TourProvidersTab.tsx`
- `UserManagementTab.tsx`
- `ToursTab.tsx`

**Lösung:**
- ✅ Schrittweise Migration (eine Komponente nach der anderen)
- ✅ ErrorContext ist bereits vorhanden und getestet (RoleManagementTab verwendet es)
- ✅ Testen nach jeder Migration

**Mitigation:**
- ⚠️ **WICHTIG:** Nicht alle Komponenten auf einmal ändern
- ⚠️ **WICHTIG:** Nach jeder Migration testen
- ⚠️ **WICHTIG:** ErrorContext ist bereits in App.tsx eingebunden

---

### Risiko 2: `t` aus Dependencies entfernen - Stale Closures

**Risiko:** 🟡 **MITTEL**

**Was könnte passieren:**
- `t` wird in `useCallback` verwendet, aber nicht in Dependencies
- Bei Sprachwechsel wird alte Übersetzung verwendet (stale closure)
- Fehlermeldungen werden in alter Sprache angezeigt

**Beispiel:**
```typescript
// ❌ PROBLEM: t wird verwendet, aber nicht in Dependencies
const loadData = useCallback(async () => {
  const errorMessage = t('errors.loadError'); // ← Alte Übersetzung!
}, []); // ← t nicht in Dependencies

// Sprachwechsel: DE → EN
// loadData verwendet immer noch deutsche Übersetzung!
```

**Lösung:**
- ✅ `t` funktioniert trotzdem (wird bei jedem Render neu erstellt)
- ⚠️ **ABER:** Bei Sprachwechsel könnte alte Übersetzung verwendet werden
- ✅ **Alternative:** Fehlermeldungen aus ErrorContext (wenn ErrorContext sie bereitstellt)

**Mitigation:**
- ⚠️ **WICHTIG:** Testen mit Sprachwechsel
- ⚠️ **WICHTIG:** Prüfen ob ErrorContext Übersetzungen unterstützt
- ⚠️ **WICHTIG:** Falls nötig, `i18n.language` als Dependency (aber nicht `t`)

---

### Risiko 3: State-Dependencies entfernen (falsch verstanden)

**Risiko:** 🔴 **KRITISCH**

**Was könnte passieren:**
- Entwickler entfernt `filterLogicalOperators` aus Dependencies (falsch!)
- Filter-Änderungen werden nicht erkannt
- Daten werden nicht neu geladen wenn Filter sich ändert

**Beispiel:**
```typescript
// ❌ FALSCH: filterLogicalOperators entfernt
const fetchData = useCallback(async () => {
  // verwendet filterLogicalOperators
}, []); // ← filterLogicalOperators fehlt!

// Filter ändert sich → fetchData wird nicht neu erstellt → Daten werden nicht neu geladen!
```

**Lösung:**
- ✅ **WICHTIG:** State-Dependencies MÜSSEN bleiben
- ✅ Nur `t`, `onError`, `showMessage` sollen entfernt werden
- ✅ Dokumentation klarstellen: "NUR echte State-Dependencies"

**Mitigation:**
- ⚠️ **KRITISCH:** Plan klarstellen - State-Dependencies MÜSSEN bleiben
- ⚠️ **KRITISCH:** Code-Review prüft ob State-Dependencies vorhanden sind
- ⚠️ **KRITISCH:** Tests prüfen ob Filter-Änderungen funktionieren

---

### Risiko 4: Polling-Intervalle triggern weiterhin Re-Renders

**Risiko:** 🟡 **MITTEL**

**Was könnte passieren:**
- Polling-Intervalle (WorktimeContext, NotificationBell) lösen weiterhin State-Updates aus
- State-Update → Komponente rendert neu
- Auch wenn Dependencies korrekt sind, könnte es zu Re-Renders kommen

**Aktueller Zustand:**
- ✅ WorktimeContext: Polling alle 30s (nur wenn Seite sichtbar)
- ✅ NotificationBell: Polling alle 60s (nur wenn Seite sichtbar)
- ✅ TeamWorktimeControl: Polling alle 30s (nur wenn Seite offen)

**Lösung:**
- ✅ Polling-Intervalle sind bereits optimiert (Page Visibility API)
- ✅ Polling ist notwendig (für Live-Updates)
- ⚠️ **ABER:** Re-Renders durch Polling sind OK, solange keine Daten neu geladen werden

**Mitigation:**
- ⚠️ **WICHTIG:** Prüfen ob Polling zu unerwarteten Daten-Neuladungen führt
- ⚠️ **WICHTIG:** Polling sollte nur State aktualisieren, nicht Daten neu laden

---

### Risiko 5: Intersection Observer Endlosschleife (bereits gefixt)

**Risiko:** ✅ **NIEDRIG** (bereits gefixt)

**Was war das Problem:**
- Intersection Observer hatte `tasks.length` in Dependencies
- Jeder Load → `tasks.length` ändert sich → Neuer Observer → Endlosschleife

**Status:**
- ✅ **BEREITS GEFIXT** (2025-01-30)
- ✅ `tasks.length` aus Dependencies entfernt
- ✅ `useRef` für aktuelle Werte verwendet

**Mitigation:**
- ✅ **KEIN RISIKO:** Problem ist bereits gelöst
- ⚠️ **WICHTIG:** Nicht rückgängig machen!

---

### Risiko 6: AbortController fehlt bei API-Calls

**Risiko:** 🟡 **MITTEL**

**Was könnte passieren:**
- Komponente wird unmountet während API-Call läuft
- API-Call läuft weiter → Memory Leak
- Race Condition: Alte Response überschreibt neue Daten

**Aktueller Zustand:**
- ✅ Einige Komponenten verwenden bereits AbortController (useAuth, OrganizationContext)
- ❌ Viele Komponenten verwenden AbortController NICHT

**Lösung:**
- ⚠️ **OPTIONAL:** AbortController für alle API-Calls hinzufügen
- ⚠️ **ABER:** Nicht Teil des aktuellen Plans (könnte später gemacht werden)

**Mitigation:**
- ⚠️ **WICHTIG:** Prüfen ob AbortController in betroffenen Komponenten vorhanden ist
- ⚠️ **WICHTIG:** Falls nicht, als separate Phase planen

---

### Risiko 7: `showMessage` in TourProvidersTab

**Risiko:** 🟡 **NIEDRIG**

**Was könnte passieren:**
- TourProvidersTab verwendet sowohl `onError` als auch `showMessage`
- Wenn `onError` entfernt wird, könnte `showMessage` allein nicht ausreichen
- Doppelte Fehlerbehandlung könnte gewollt sein

**Aktueller Code:**
```typescript
onError(errorMessage);
showMessage(errorMessage, 'error'); // ← Doppelte Fehlerbehandlung
```

**Lösung:**
- ✅ `showMessage` ist stabil (useCallback in MessageContext)
- ✅ `showMessage` kann bleiben, aber NICHT in Dependencies
- ⚠️ **ABER:** Prüfen ob doppelte Fehlerbehandlung gewollt ist

**Mitigation:**
- ⚠️ **WICHTIG:** Prüfen ob `showMessage` wirklich nötig ist
- ⚠️ **WICHTIG:** ErrorContext zeigt Fehler bereits an (fixed top-right)
- ⚠️ **WICHTIG:** Vielleicht ist `showMessage` redundant?

---

### Risiko 8: Lokaler `error` State vs ErrorContext

**Risiko:** 🟡 **NIEDRIG**

**Was könnte passieren:**
- Worktracker, Requests verwenden lokalen `error` State
- Wenn zu ErrorContext migriert wird, könnte lokale Fehleranzeige fehlen
- Fehler werden nur global angezeigt, nicht lokal in Komponente

**Aktueller Zustand:**
- ⚠️ Worktracker: Lokaler `error` State (zeigt Fehler lokal an)
- ⚠️ Requests: Lokaler `error` State (zeigt Fehler lokal an)
- ✅ ErrorContext: Zeigt Fehler global an (fixed top-right)

**Lösung:**
- ⚠️ **OPTIONAL:** Lokaler State kann bleiben, wenn gewünscht
- ⚠️ **ABER:** Dependencies müssen korrekt sein (kein `t`)
- ✅ **ALTERNATIVE:** Beide verwenden (ErrorContext + lokaler State)

**Mitigation:**
- ⚠️ **WICHTIG:** Prüfen ob lokale Fehleranzeige gewünscht ist
- ⚠️ **WICHTIG:** Falls ja, beide Patterns verwenden
- ⚠️ **WICHTIG:** Falls nein, zu ErrorContext migrieren

---

### Risiko 9: Custom Hook zu komplex

**Risiko:** 🟡 **NIEDRIG**

**Was könnte passieren:**
- Custom Hook `useDataLoader` wird zu komplex
- Viele Komponenten haben spezielle Anforderungen (Pagination, Filter, etc.)
- Hook wird unwartbar

**Lösung:**
- ✅ **OPTIONAL:** Custom Hook ist Nice-to-Have, nicht zwingend
- ✅ Einheitliches Pattern ist wichtiger als Custom Hook
- ⚠️ **ABER:** Falls Hook zu komplex wird, nicht verwenden

**Mitigation:**
- ⚠️ **WICHTIG:** Custom Hook ist optional
- ⚠️ **WICHTIG:** Falls zu komplex, Pattern ohne Hook verwenden
- ⚠️ **WICHTIG:** Pattern ist wichtiger als Hook

---

### Risiko 10: React Strict Mode (Development)

**Risiko:** 🟢 **NIEDRIG**

**Was könnte passieren:**
- React Strict Mode führt zu doppelten Renders in Development
- Könnte zu Verwirrung führen (warum wird 2x gerendert?)
- Könnte zu doppelten API-Calls führen (wenn nicht korrekt gehandhabt)

**Lösung:**
- ✅ React Strict Mode ist nur in Development aktiv
- ✅ Production ist nicht betroffen
- ✅ AbortController verhindert doppelte API-Calls

**Mitigation:**
- ⚠️ **WICHTIG:** In Development testen
- ⚠️ **WICHTIG:** Prüfen ob doppelte API-Calls auftreten
- ⚠️ **WICHTIG:** Falls ja, AbortController verwenden

---

## 🎯 WAS HABEN WIR VERGESSEN / ÜBERSEHEN?

### 1. ✅ Intersection Observer Pattern (bereits gefixt)

**Status:** ✅ **BEREITS GEFIXT** (2025-01-30)
- `tasks.length` aus Dependencies entfernt
- `useRef` für aktuelle Werte verwendet
- **KEIN RISIKO:** Problem ist bereits gelöst

---

### 2. ⚠️ AbortController Pattern

**Status:** ⚠️ **NICHT TEIL DES PLANS**
- Einige Komponenten verwenden AbortController bereits
- Viele Komponenten verwenden AbortController NICHT
- **RISIKO:** Memory Leaks bei Unmount während API-Call

**Empfehlung:**
- ⚠️ **OPTIONAL:** Als separate Phase planen
- ⚠️ **WICHTIG:** Prüfen ob betroffene Komponenten AbortController haben

---

### 3. ⚠️ Polling-Intervalle Cleanup

**Status:** ✅ **BEREITS OPTIMIERT**
- WorktimeContext: Page Visibility API + Cleanup
- NotificationBell: Page Visibility API + Cleanup
- **KEIN RISIKO:** Polling ist bereits optimiert

---

### 4. ⚠️ `showMessage` vs ErrorContext

**Status:** ⚠️ **UNKLAR**
- TourProvidersTab verwendet beide
- ErrorContext zeigt Fehler bereits an
- **FRAGE:** Ist `showMessage` redundant?

**Empfehlung:**
- ⚠️ **WICHTIG:** Prüfen ob `showMessage` wirklich nötig ist
- ⚠️ **WICHTIG:** Falls redundant, entfernen

---

### 5. ⚠️ Sprachwechsel (i18n.language)

**Status:** ⚠️ **POTENTIELLES PROBLEM**
- `t` wird aus Dependencies entfernt
- Bei Sprachwechsel könnte alte Übersetzung verwendet werden
- **RISIKO:** Stale Closures bei Sprachwechsel

**Empfehlung:**
- ⚠️ **WICHTIG:** Testen mit Sprachwechsel
- ⚠️ **WICHTIG:** Falls Problem, `i18n.language` als Dependency (aber nicht `t`)

---

### 6. ⚠️ Lokaler `error` State vs ErrorContext

**Status:** ⚠️ **UNKLAR**
- Worktracker, Requests verwenden lokalen State
- ErrorContext zeigt Fehler global an
- **FRAGE:** Soll lokale Fehleranzeige bleiben?

**Empfehlung:**
- ⚠️ **WICHTIG:** Prüfen ob lokale Fehleranzeige gewünscht ist
- ⚠️ **WICHTIG:** Falls ja, beide Patterns verwenden
- ⚠️ **WICHTIG:** Falls nein, zu ErrorContext migrieren

---

## 📊 RISIKO-BEWERTUNG ZUSAMMENFASSUNG

### 🔴 KRITISCH (Sofort beheben):
1. **State-Dependencies entfernen (falsch verstanden)** - Entwickler könnte `filterLogicalOperators` entfernen

### 🟡 MITTEL (Prüfen & Testen):
2. **`t` aus Dependencies entfernen - Stale Closures** - Bei Sprachwechsel
3. **AbortController fehlt** - Memory Leaks bei Unmount
4. **Polling-Intervalle** - Könnten zu unerwarteten Re-Renders führen
5. **`showMessage` vs ErrorContext** - Redundanz?
6. **Lokaler `error` State** - Soll bleiben oder migrieren?

### 🟢 NIEDRIG (Wahrscheinlich OK):
7. **Breaking Changes bei ErrorContext** - Schrittweise Migration
8. **Custom Hook zu komplex** - Optional
9. **React Strict Mode** - Nur Development

### ✅ KEIN RISIKO (Bereits gelöst):
10. **Intersection Observer Endlosschleife** - Bereits gefixt (2025-01-30)

### 🔴 KRITISCH (Übersehen - NEU):
11. **Filter werden automatisch neu geladen** - `filterContext` in Dependencies
12. **Filter verschwinden nach 10 Minuten** - Cleanup-Intervall löscht Filter

---

## ✅ MITIGATION-STRATEGIEN

### 1. Schrittweise Migration
- ✅ Nicht alle Komponenten auf einmal ändern
- ✅ Eine Komponente nach der anderen
- ✅ Nach jeder Migration testen

### 2. Klare Dokumentation
- ✅ Plan klarstellen: "NUR echte State-Dependencies"
- ✅ Beispiele zeigen: Was MUSS bleiben, was soll entfernt werden
- ✅ Code-Review Checkliste

### 3. Tests
- ✅ Testen mit Sprachwechsel
- ✅ Testen mit Filter-Änderungen
- ✅ Testen mit Polling-Intervallen
- ✅ Testen mit Unmount während API-Call

### 4. Code-Review
- ✅ Prüfen ob State-Dependencies vorhanden sind
- ✅ Prüfen ob `t`, `onError`, `showMessage` entfernt wurden
- ✅ Prüfen ob ErrorContext korrekt verwendet wird

---

**Erstellt:** 2025-01-31  
**Status:** 📋 RISIKOANALYSE ABGESCHLOSSEN  
**Nächste Aktion:** Plan finalisieren mit Risiko-Mitigation

