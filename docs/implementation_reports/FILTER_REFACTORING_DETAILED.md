# Filter-Refactoring - Detaillierte Planung

## Datum: 2025-01-21
## Status: ANALYSE ABGESCHLOSSEN - Bereit für Entscheidungen

---

## ✅ ANALYSE ERGEBNISSE

### Struktur-Analyse

#### 1. Zwei parallele Filter-Systeme

**Requests.tsx & Worktracker.tsx haben:**
- **SYSTEM 1 (NEU):** `filterConditions` + `filterLogicalOperators`
  - Wird von `FilterPane` verwendet ✅
  - Wird in Filter-Logik Zeilen 432-512 (Requests) / 502-673 (Worktracker) verwendet ✅
  - Aktives System! 🟢

- **SYSTEM 2 (ALT):** `filterState` + `activeFilters`
  - NUR als Fallback verwendet (Zeilen 513-557)
  - Wird NUR verwendet wenn `filterConditions.length === 0` 🔴
  - Inaktives System, aber Code existiert noch

**Schlüsselcode:**
```typescript
// In filteredAndSortedRequests / filteredAndSortedTasks
if (filterConditions.length > 0) {
    // NEUES SYSTEM - wird verwendet
} else {
    // ALTES SYSTEM - Fallback, wird NUR verwendet wenn kein neuer Filter aktiv ist
    if (activeFilters.title && ...) { ... }
    if (activeFilters.status !== 'all' && ...) { ... }
    // etc.
}
```

#### 2. applyFilterConditions Funktion

**Zweck:** Sync zwischen FilterPane (NEUES System) und Legacy States (ALTES System)

**Code:**
```typescript
const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    // NEUES SYSTEM setzen
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    
    // LEGACY STATES syncen (für getActiveFilterCount)
    const newFilterState: FilterState = { ... };
    conditions.forEach(condition => {
        if (condition.column === 'title' && condition.operator === 'contains') {
            newFilterState.title = condition.value as string || '';
        }
        // etc.
    });
    
    setActiveFilters(newFilterState);  // ⚠️ NUR FÜR getActiveFilterCount
    setFilterState(newFilterState);    // ⚠️ NUR FÜR getActiveFilterCount
};
```

**Verwendungszweck:** Nur für `getActiveFilterCount()` um anzuzeigen "X Filter aktiv"

---

### State-Status

#### Requests.tsx & Worktracker.tsx

| State | Wird gesetzt | Wird verwendet | Zweck |
|-------|-------------|----------------|-------|
| `filterConditions` | ✅ Ja (FilterPane) | ✅ Ja (Filter-Logik Zeilen 432-512) | **Hauptsystem** 🟢 |
| `filterLogicalOperators` | ✅ Ja (FilterPane) | ✅ Ja (Filter-Logik Zeilen 432-512) | **Hauptsystem** 🟢 |
| `activeFilters` | ⚠️ Ja (applyFilterConditions) | ⚠️ Nur für getActiveFilterCount + Fallback | **Entfernbarkeit prüfen** 🟡 |
| `filterState` | ⚠️ Ja (applyFilterConditions) | ❌ Nein | **KANN ENTFERNT WERDEN** 🔴 |

#### InvoiceManagementTab.tsx

| State | Wird gesetzt | Wird verwendet | Zweck |
|-------|-------------|----------------|-------|
| `filterConditions` | ✅ Ja (FilterPane) | ✅ Ja (Filter-Logik) | **Hauptsystem** 🟢 |
| `filterLogicalOperators` | ✅ Ja (FilterPane) | ✅ Ja (Filter-Logik) | **Hauptsystem** 🟢 |
| `activeFilters` | ❌ Nein | ❌ Nein | **NICHT VORHANDEN** ✅ |
| `filterState` | ❌ Nein | ❌ Nein | **NICHT VORHANDEN** ✅ |

---

### Verwendungs-Analyse

#### activeFilters wird verwendet:
1. ✅ In `getActiveFilterCount()` (Zeilen 406-412 in Requests, 397-403 in Worktracker)
   - Zeigt Badge mit Anzahl aktiver Filter
   - Zählt ob `activeFilters.title`, `activeFilters.status`, etc. gesetzt sind
2. ✅ In Fallback-Filter-Logik (Zeilen 516-557 in Requests, 680-730 in Worktracker)
   - Wird NUR verwendet wenn `filterConditions.length === 0`
   - Nie aktiv da FilterPane immer `filterConditions` verwendet

**Entscheidung:** `activeFilters` COULD be removed, BUT getActiveFilterCount() needs updating

---

## Offene Fragen - DETAILLIERT

### ❓ Frage 1: activeFilters entfernen?

**Option A: Sofort entfernen**
- ✅ Pros: Weniger Code, keine Duplikation
- ❌ Cons: `getActiveFilterCount()` muss neu implementiert werden
- ❌ Cons: Fallback-Logik (Zeilen 513-557) wird nicht mehr funktionieren

**Option B: getActiveFilterCount() neu implementieren**
```typescript
const getActiveFilterCount = () => {
    // NEU: Zähle filterConditions
    return filterConditions.length + filterLogicalOperators.length;
};
```

**Option C: Behalten**
- ❌ Cons: Code-Duplikation bleibt
- ❌ Cons: Komplexität bleibt

**Empfehlung:** Option B (getActiveFilterCount neu implementieren + activeFilters entfernen)

---

### ❓ Frage 2: filterState entfernen?

**Code-Analyse:**
- `filterState` wird gesetzt (Zeile 390 in Requests.tsx)
- `filterState` wird NICHT verwendet (nur `activeFilters` wird verwendet)

**Fazit:** `filterState` kann sicher entfernt werden! ✅

---

### ❓ Frage 3: Fallback-Logik entfernen?

**Aktueller Code (Zeilen 513-557 in Requests.tsx):**
```typescript
} else {
    // Alte Filterkriterien
    if (activeFilters.title && ...) { ... }
    if (activeFilters.status !== 'all' && ...) { ... }
    // etc.
}
```

**Wann wird das verwendet?**
- Nur wenn `filterConditions.length === 0`
- FilterPane setzt aber IMMER `filterConditions` wenn ein Filter aktiv ist

**Fazit:** Fallback-Logik wird wahrscheinlich NIEMALS verwendet

**Entscheidung:** 
- ✅ ENTFERNEN - nie verwendet
- ✅ Oder nach Migration mit UI-Warnung

---

### ❓ Frage 4: UserRoleContext erstellen?

**Problemanalyse:**
FilterRow.tsx lädt bei JEDER Spaltenänderung neu:
```typescript
useEffect(() => {
    loadUsersAndRoles();  // API-Request
}, [condition.column]);  // Bei JEDEM Spaltenwechsel
```

**Optimierung:**
```typescript
// UserRoleContext - lädt EINMAL beim App-Start
const { users, roles, loading } = useUserRole();

// FilterRow - verwendet Context (kein API-Request)
const users = useUserRole().users;
const roles = useUserRole().roles;
```

**Vorteile:**
- ✅ Performance: 1 API-Request statt Dutzende
- ✅ Konsistenz: Alle Komponenten sehen gleiche Daten
- ✅ Weniger Code in FilterRow

**Nachteile:**
- ⚠️ Context muss in App.tsx eingebunden werden

**Empfehlung:** ✅ JA, erstellen

**Frage:** Soll der Context NUR Users/Roles enthalten oder auch Branches?

---

### ❓ Frage 5: SavedFilterTags vereinfachen?

**Aktuell:** 200+ Zeilen Responsive-Logik
- ResizeObserver
- Berechnung von Tag-Breiten
- Dropdown-Logik für überlaufende Tags

**Vereinfachung:**
```tsx
<div className="flex flex-wrap gap-2">
    {sortedFilters.map(filter => <FilterTag key={filter.id} filter={filter} />)}
</div>
```

**Was passiert:**
- Tags werden bei wenig Platz umbrechen (neue Zeile)
- Scrollen erforderlich wenn viele Tags

**Alternativ:**
```tsx
<div className="flex gap-2 overflow-x-auto">
    {sortedFilters.map(filter => <FilterTag key={filter.id} filter={filter} />)}
</div>
```

**Tags horizontal scrollbar statt wrap**

**Empfehlung:** Flexbox mit Overflow-X (horizontal scrollbar)

**Frage:** Welches Layout bevorzugst du?

---

### ❓ Frage 6: Consultation-Logik trennen?

**Aktuelle Situation:**
SavedFilterTags.tsx (529 Zeilen) enthält:
- Generische Filter-Tags: Zeilen 1-250 (≈250 Zeilen)
- Consultation-Logik: Zeilen 50-96, 253-289 (≈100 Zeilen)

**Trennungs-Vorschlag:**

**Option A: Beide behalten**
- SavedFilterTags.tsx hat weiterhin beide Logiken
- Komplexität bleibt

**Option B: Separate Komponenten**
```typescript
// SavedFilterTags.tsx - nur generisch (≈250 Zeilen)
// ConsultationFilterTags.tsx - erweitert SavedFilterTags (≈80 Zeilen)
```

**Empfehlung:** ✅ Option B (Separate Komponenten)

**Frage:** Soll Trennung erfolgen?

---

### ❓ Frage 7: filterLogic.ts - Wie implementieren?

**Option A: Generisch für alle Tabellen**
```typescript
// Problem: Jede Tabelle hat andere Struktur
export const applyFilters = (items, conditions, operators, getFieldValue) => {
    // ...
};

// Verwendung in Requests.tsx:
const getFieldValue = (request: Request, columnId: string) => {
    switch (columnId) {
        case 'branch': return request.branch.name;
        case 'requestedBy': return `${request.requestedBy.firstName} ${request.requestedBy.lastName}`;
        // ...
    }
};

filteredRequests = applyFilters(requests, filterConditions, filterLogicalOperators, getFieldValue);
```

**Option B: Tabelle-spezifisch**
```typescript
// Einen Wrapper pro Tabelle
export const applyRequestFilters = (requests, conditions, operators) => {
    return applyFilters(requests, conditions, operators, (req, col) => {
        switch (col) {
            case 'branch': return req.branch.name;
            case 'requestedBy': return `${req.requestedBy.firstName} ${req.requestedBy.lastName}`;
            // ...
        }
    });
};
```

**Empfehlung:** Option A (generisch mit getFieldValue als Parameter)

**Vorteil:** Wiederverwendbar für ALLE Tabellen
**Implementierung:** getFieldValue als Mapping-Funktion

---

## Finale Entscheidungspunkt

### Vor Phase 1 zu klären:

1. ❓ activeFilters + filterState entfernen? → ✅ JA (mit getActiveFilterCount() Update)
2. ❓ Fallback-Logik entfernen? → ✅ JA (nie verwendet)
3. ❓ UserRoleContext erstellen? → ✅ JA (Performance)
4. ❓ UserRoleContext: Nur Users/Roles oder auch Branches? → ❓
5. ❓ SavedFilterTags: Flexbox-wrap oder Overflow-X? → ❓
6. ❓ Consultation-Logik trennen? → ✅ JA
7. ❓ filterLogic.ts: Struktur-Option A oder B? → ✅ Option A

### Offene Entscheidungen:
- [ ] ❓ Frage 4: Context-Inhalt (nur Users/Roles oder auch Branches?)
- [ ] ❓ Frage 5: SavedFilterTags Layout (wrap oder scroll?)

---

## WARTE AUF DEINE ENTWICKLUNGEN

Bitte beantworte die 2 offenen Fragen (4 & 5), dann kann ich mit Phase 1 starten.

- [ ] ✅ Der Rest ist geklärt
- [ ] ⏳ Frage 4 & 5 offen
