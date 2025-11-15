# Filter Cleanup Plan

## Datum: 2025-01-21
## Ziel: Legacy Code entfernen ohne Funktionalität zu beschädigen

---

## Betroffene Dateien

### 1. Vollständig Legacy (kann entfernt werden) ✅
**Requests.tsx & Worktracker.tsx & ActiveUsersList.tsx & RoleManagementTab.tsx**

**Legacy Code:**
- `FilterState` Interface
- `filterState` State
- `activeFilters` State
- `applyFilterConditions` Funktion (Sync-Logik)
- `applyFilters` Funktion (wird NIE aufgerufen)
- Fallback Filter-Logik (wird NUR verwendet wenn `filterConditions.length === 0`)

**Aktive Code:**
- ✅ `filterConditions` + `filterLogicalOperators` (neues System)
- ✅ `FilterPane` verwendet NEUES System
- ✅ `SavedFilterTags` verwendet NEUES System

**Änderungen in diesen 4 Dateien:**
- Entferne Legacy Interface, States, Funktionen
- Entferne Fallback-Logik (Zeilen mit `activeFilters`)
- Aktualisiere `getActiveFilterCount()` → `return filterConditions.length`

**Geschätzte Reduktion:** ~150-200 Zeilen pro Datei = **~600-800 Zeilen**

---

### 2. NOCH NICHT migriert (NICHT anfassen! ⚠️)
**UserWorktimeTable.tsx**

**WICHTIG:** Diese Datei verwendet NOCH das alte System ohne Fallback!
- `filterState` ist hier aktiv genutzt
- Hat KEIN neues System (`filterConditions`)
- Hat KEIN `FilterPane`

**Entscheidung:** NICHT ändern - nur beobachten für spätere Migration

---

## Sicherheitsprüfung ✅

### Prüfung ob Legacy entfernt werden kann:

**Requests.tsx:**
- ✅ `filterConditions` aktiv (Zeilen 432-512)
- ✅ `filterState`/`activeFilters` NUR als Fallback (Zeilen 514-557)
- ✅ Fallback wird NIE ausgelöst (FilterPane setzt immer filterConditions)
- ✅ `applyFilters()` wird NIE aufgerufen

**Worktracker.tsx:**
- ✅ `filterConditions` aktiv (Zeilen 502-680)
- ✅ `filterState`/`activeFilters` NUR als Fallback (Zeilen 680-730)
- ✅ Gleiche Bedingung wie Requests.tsx

**Ergebnis: SICHER ZU ENTFERNEN!**

---

## Implementierungsreihenfolge

1. ✅ Requests.tsx (größter Code-Killer, ~150 Zeilen)
2. ✅ Worktracker.tsx (~170 Zeilen)
3. ✅ ActiveUsersList.tsx (~50 Zeilen)
4. ✅ RoleManagementTab.tsx (~50 Zeilen)
5. ⏳ UserWorktimeTable.tsx NICHT anfassen (noch nicht migriert)

---

## Funktionsprüfung nach Cleanup

Nach dem Cleanup MUSS getestet werden:
- ✅ Filter erstellen (FilterPane)
- ✅ Filter anwenden (SavedFilterTags)
- ✅ Filter speichern
- ✅ Filter löschen
- ✅ "Archiv"/"Aktuell" Standardfilter
- ✅ Reset-Funktion
- ✅ Filter-Count Anzeige




