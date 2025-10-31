# Filter-Refactoring - Entscheidungen

## Datum: 2025-01-21
## Status: FINALE ENTSCHEIDUNGEN GETROFFEN

---

## Entscheidungsmatrix

### ❌ Frage 1: Legacy FilterState entfernen?
**Antwort:** ✅ ENTFERNEN
- `filterState` Interface entfernen
- `activeFilters` State entfernen
- `getActiveFilterCount()` neu implementieren (zählt `filterConditions.length`)
- Fallback-Logik (Zeilen 513-557) entfernen

### ❌ Frage 2: fallback-Logik entfernen?
**Antwort:** ✅ ENTFERNEN
- Code Zeilen 513-557 in Requests.tsx entfernen
- Code Zeilen 680-730 in Worktracker.tsx entfernen
- Wird nie verwendet (FilterPane setzt immer filterConditions)

### ❌ Frage 3: UserRoleContext erstellen?
**Antwort:** ✅ NICHT ERSTELLEN
- **WICHTIG:** Code-Logik bleibt unverändert!
- Performance-Optimierung wird NICHT durchgeführt
- FilterRow lädt weiterhin bei jeder Spaltenänderung
- **Begründung:** User will Funktionalität NICHT verändern

### ✅ Frage 4: SavedFilterTags Layout?
**Antwort:** Dropdown bei Platzmangel (wie in Mobile App)
- Letzter Tag rechts: "mehr"
- In Dropdown: alle Filter ohne Platz
- **Referenz:** Bereits in Mobile App (app/) umgesetzt
- **Vorschlag:** Von app/ abschauen

### ✅ Frage 5: Consultation-Logik trennen?
**Antwort:** ✅ TRENNEN
- Erstelle `ConsultationFilterTags.tsx`
- Behält Consultation-spezifische Logik (Recent Clients, Auto-Cleanup)
- SavedFilterTags.tsx wird generisch (ohne Consultation-Logik)

---

## Implementierungsplan (ANPASSUNG)

### Nicht zu implementieren:
- ❌ UserRoleContext (Frage 3 - NICHT erstellen)
- ❌ FilterRow Performance-Optimierung
- ❌ SavedFilterTags Layout-Änderung (behält bestehende Logik)

### Zu implementieren:
- ✅ Phase 1: `filterLogic.ts` erstellen
- ✅ Phase 2: Legacy States entfernen
- ✅ Phase 3: SavedFilterTags vereinfachen (Code-Reduktion OHNE Funktionalitätsänderung)
- ✅ Phase 4: Consultation-Logik trennen

---

## Aktualisiert: Phase 1 - Zentrale Filter-Logik

**Ziel:** 
- Erstelle `frontend/src/utils/filterLogic.ts`
- Reduziere Code-Duplikation
- **KEINE Funktionalitätsänderung**

**Schritte:**
1. Erstelle `filterLogic.ts` mit:
   - `evaluateCondition()` - Operator-Logik
   - `applyFilters()` - Filter-Anwendung
2. Implementiere Column-Mapping-System
3. Teste mit Beispiel

**Code-Beispiel:**

```typescript
// frontend/src/utils/filterLogic.ts

export interface FilterCondition {
  column: string;
  operator: string;
  value: string | number | Date | null;
}

/**
 * Zentrale Operator-Auswertung
 */
export const evaluateCondition = (
  fieldValue: any,
  condition: FilterCondition
): boolean => {
  const { operator, value } = condition;
  
  // Handle special cases first
  if (operator === 'equals' && fieldValue === value) return true;
  if (operator === 'notEquals' && fieldValue !== value) return true;
  
  // Convert to strings for text operations
  const strField = String(fieldValue || '').toLowerCase();
  const strValue = String(value || '').toLowerCase();

  switch (operator) {
    case 'contains':
      return strField.includes(strValue);
    case 'startsWith':
      return strField.startsWith(strValue);
    case 'endsWith':
      return strField.endsWith(strValue);
    case 'after':
      return new Date(fieldValue) > new Date(value as string);
    case 'before':
      return new Date(fieldValue) < new Date(value as string);
    default:
      return true;
  }
};

/**
 * Wende Filter auf Items an
 */
export const applyFilters = <T>(
  items: T[],
  conditions: FilterCondition[],
  operators: ('AND' | 'OR')[],
  getFieldValue: (item: T, columnId: string) => any
): T[] => {
  if (conditions.length === 0) return items;

  return items.filter(item => {
    let result = true;

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const fieldValue = getFieldValue(item, condition.column);
      const conditionMet = evaluateCondition(fieldValue, condition);

      if (i === 0) {
        result = conditionMet;
      } else {
        const operator = operators[i - 1];
        result = operator === 'AND' ? result && conditionMet : result || conditionMet;
      }
    }

    return result;
  });
};
```

---

## Aktualisiert: Phase 2-3 - Legacy States entfernen

**Änderungen in Requests.tsx:**
1. Entferne `FilterState` Interface (Zeile 58-66)
2. Entferne `filterState` State (Zeile 89-97)
3. Entferne `activeFilters` State (Zeile 98-106)
4. Aktualisiere `getActiveFilterCount()`:
   ```typescript
   const getActiveFilterCount = () => {
       return filterConditions.length;
   };
   ```
5. Entferne Fallback-Logik (Zeilen 513-557)
6. Entferne `applyFilterConditions` Sync-Logik (Zeilen 352-391)
7. Ersetze Filter-Logik Zeilen 432-560 mit `applyFilters()`
8. Implementiere `getFieldValue` für Request

**Änderungen in Worktracker.tsx:**
- Gleiche Schritte wie Requests.tsx
- Eigene `getFieldValue` für Task

---

## Nächste Schritte

1. ✅ Entscheidungen dokumentiert
2. ⏳ Starte Phase 1 (filterLogic.ts erstellen)
3. ⏳ Phase 2 (Requests.tsx refactoren)
4. ⏳ Phase 3 (Worktracker.tsx refactoren)
5. ⏳ Phase 4 (Consultation-Logik trennen)

**Geschätzte Code-Reduktion:** ~700 Zeilen




