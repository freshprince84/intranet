# Filter-Standard Definition

**Datum:** 2025-02-01  
**Status:** Finale Definition

---

## Standard-Pattern für Filter-Laden

### Was ist der Standard?

**Standard-Pattern für ALLE Komponenten mit Filtern:**

```typescript
useEffect(() => {
  const initialize = async () => {
    // 1. Filter laden (wartet auf State-Update)
    const filters = await loadFilters(TABLE_ID);
    
    // 2. Default-Filter anwenden (IMMER vorhanden!)
    const defaultFilter = filters.find(f => f.name === defaultFilterName);
    if (defaultFilter) {
      await handleFilterChange(
        defaultFilter.name, 
        defaultFilter.id, 
        defaultFilter.conditions, 
        defaultFilter.operators
      );
      return; // Daten werden durch handleFilterChange geladen
    }
    
    // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
    await fetchData(undefined, undefined);
  };
  
  initialize();
}, []);
```

### Wo ist der Standard beschrieben?

1. **`docs/implementation_plans/FILTER_LADEN_STANDARD_VEREINFACHUNG_FINAL.md`** (Zeile 163-192)
   - Standard-Pattern Definition
   - Implementierungsreihenfolge
   - Vorteile

2. **`docs/implementation_plans/FILTER_LADEN_ANALYSE_FAKTEN.md`** (Zeile 300-400)
   - Korrekte Lösung
   - Phase 1-4 Details
   - Was wurde übersehen

### Wie funktioniert der Standard?

1. **FilterContext:** `loadFilters` gibt `Promise<SavedFilter[]>` zurück
   - Wartet auf State-Update (nächster Render-Zyklus)
   - Prüft `filtersRef.current[tableId]` nach State-Update

2. **Komponenten:** Verwenden Standard-Pattern
   - `await loadFilters(TABLE_ID)` - wartet auf tatsächliches Laden
   - `filters.find(f => f.name === defaultFilterName)` - findet Default-Filter
   - `await handleFilterChange(...)` - wendet Filter an und lädt Daten

3. **SavedFilterTags:** Wird optional (nur UI)
   - Komponenten wenden Default-Filter selbst an
   - SavedFilterTags zeigt nur Filter-Tags an

---

## Default-Filter Mapping

### Aktuelle Default-Filter (bleiben so wie sie sind):

| Komponente | Table ID | Default Filter Name |
|------------|----------|---------------------|
| Requests.tsx | `requests-table` | `"Aktuell"` |
| Worktracker.tsx (todos) | `worktracker-todos` | `"Aktuell"` |
| Worktracker.tsx (reservations) | `worktracker-reservations` | `"Hoy"` |
| Cerebro.tsx | `CEREBRO_ARTICLES` | `"Alle Artikel"` |
| ToursTab.tsx | - | `"Aktuell"` |
| RoleManagementTab.tsx | - | `"Alle"` |
| TodoAnalyticsTab.tsx | - | `"Alle"` |
| ActiveUsersList.tsx | - | `"Aktive"` |
| JoinRequestsList.tsx | - | `"Alle"` |
| MyJoinRequestsList.tsx | - | `"Alle"` |
| BranchManagementTab.tsx | - | `"Alle"` |
| PasswordManagerTab.tsx | - | `"Alle Einträge"` |
| RequestAnalyticsTab.tsx | - | `"Alle"` |
| InvoiceManagementTab.tsx | `invoice-management` | **KEIN Default-Filter** |

---

## Seed-Prüfung: Default-Filter

### ✅ Was bereits im Seed ist (backend/prisma/seed.ts):

**Zeile 1546-1801:** `createStandardFilters` Funktion

1. **`worktracker-todos`:**
   - ✅ "Aktuell" (status != 'done')
   - ✅ "Archiv" (status == 'done')

2. **`requests-table`:**
   - ✅ "Aktuell" (status != 'approved' AND status != 'denied')
   - ✅ "Archiv" (status == 'approved' OR status == 'denied')

3. **`worktracker-reservations`:**
   - ✅ "Hoy" (checkInDate == '__TODAY__')

### ❌ Was im Seed FEHLT (muss hinzugefügt werden):

1. **`CEREBRO_ARTICLES`:**
   - ❌ "Alle Artikel" (keine Bedingungen)

2. **ToursTab.tsx:**
   - ❌ Table ID unbekannt
   - ❌ "Aktuell" Filter

3. **`roles-table` (RoleManagementTab.tsx):**
   - ❌ "Alle" (keine Bedingungen)

4. **TodoAnalyticsTab.tsx:**
   - ❌ Table ID unbekannt
   - ❌ "Alle" Filter

5. **`workcenter-table` (ActiveUsersList.tsx):**
   - ❌ "Aktive" (hasActiveWorktime == 'true')
   - ❌ "Alle" (keine Bedingungen)

6. **`join-requests-table` (JoinRequestsList.tsx):**
   - ❌ "Alle" (keine Bedingungen)

7. **`my-join-requests-table` (MyJoinRequestsList.tsx):**
   - ❌ "Alle" (keine Bedingungen)

8. **`branches-table` (BranchManagementTab.tsx):**
   - ❌ "Alle" (keine Bedingungen)

9. **PasswordManagerTab.tsx:**
   - ❌ Table ID unbekannt
   - ❌ "Alle Einträge" Filter

10. **RequestAnalyticsTab.tsx:**
    - ❌ Table ID unbekannt
    - ❌ "Alle" Filter

11. **`invoice-management` (InvoiceManagementTab.tsx):**
    - ❌ KEIN Default-Filter (sollte bleiben so)

---

## Was muss bei Komponenten 5-13 auf Standard umgestellt werden?

### Komponenten 5-13 (alle außer Requests, Worktracker, Cerebro, ConsultationList, ConsultationTracker):

**Was muss geändert werden:**

1. **FilterContext verwenden:**
   - `useFilterContext()` Hook importieren
   - `loadFilters` aus FilterContext verwenden

2. **Standard-Pattern implementieren:**
   - `useEffect` mit `async initialize()` Funktion
   - `await loadFilters(TABLE_ID)` aufrufen
   - Default-Filter finden und anwenden
   - `handleFilterChange` aufrufen (lädt Daten)

3. **Workarounds entfernen:**
   - Keine Timeouts
   - Keine Refs für "initial load attempted"
   - Keine komplexe useEffect-Logik

4. **SavedFilterTags:**
   - `defaultFilterName` Prop beibehalten (wie aktuell)
   - SavedFilterTags wird nur für UI verwendet
   - Komponente wendet Default-Filter selbst an (Standard-Pattern)

### Beispiel-Umstellung:

**VORHER (aktuell):**
```typescript
// Verlässt sich auf SavedFilterTags
<SavedFilterTags
  tableId={TABLE_ID}
  defaultFilterName="Alle"
  onFilterChange={handleFilterChange}
/>
```

**NACHHER (Standard-Pattern):**
```typescript
const filterContext = useFilterContext();
const { loadFilters } = filterContext;

useEffect(() => {
  const initialize = async () => {
    const filters = await loadFilters(TABLE_ID);
    const defaultFilter = filters.find(f => f.name === 'Alle');
    if (defaultFilter) {
      await handleFilterChange(
        defaultFilter.name, 
        defaultFilter.id, 
        defaultFilter.conditions, 
        defaultFilter.operators
      );
      return;
    }
    await fetchData(undefined, undefined);
  };
  initialize();
}, []);

// SavedFilterTags bleibt für UI
<SavedFilterTags
  tableId={TABLE_ID}
  defaultFilterName="Alle"
  onFilterChange={handleFilterChange}
/>
```

---

## InvoiceManagementTab.tsx - Prüfung

**Status:** ✅ Geprüft

**Fakten:**
- Verwendet `SavedFilterTags` (Zeile 717-724)
- **KEIN `defaultFilterName` Prop** (Zeile 723)
- Verwendet `handleFilterChange` (Zeile 420-424)
- Lädt Daten mit `loadInvoices()` (Zeile 289-301)
- **KEIN FilterContext** verwendet (kein `useFilterContext` Hook)

**Fazit:**
- InvoiceManagementTab.tsx hat **KEINEN Default-Filter**
- Muss **NICHT** auf Standard umgestellt werden (kein Default-Filter)
- Kann so bleiben wie es ist

---

## Zusammenfassung

### Standard ist definiert in:
- `docs/implementation_plans/FILTER_LADEN_STANDARD_VEREINFACHUNG_FINAL.md`
- `docs/implementation_plans/FILTER_LADEN_ANALYSE_FAKTEN.md`

### Default-Filter bleiben so wie sie sind:
- Alle Default-Filter-Namen bleiben unverändert
- Seed muss erweitert werden für fehlende Default-Filter

### Was muss geändert werden:
- **Komponenten 5-13:** Standard-Pattern implementieren
- **Seed:** Fehlende Default-Filter hinzufügen
- **FilterContext:** Promise zurückgeben, das auf State-Update wartet

### Was bleibt unverändert:
- **ConsultationList.tsx:** Wird nicht angefasst (speziell)
- **ConsultationTracker.tsx:** Wird nicht angefasst (speziell)
- **InvoiceManagementTab.tsx:** Hat keinen Default-Filter, bleibt so

