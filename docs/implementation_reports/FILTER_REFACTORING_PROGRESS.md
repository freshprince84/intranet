# Filter-Refactoring - Fortschrittsprotokoll

## Datum: 2025-01-21
## Status: IN ARBEIT

### Ziel
Refaktorisierung der Filter-Funktionalität zur Eliminierung von Code-Duplikation und Verbesserung der Wartbarkeit.

---

## Analyse-Phase (Abgeschlossen)

### Gefundene Probleme

#### 1. ✅ Massive Code-Duplikation (85% identisch)
**Betroffene Dateien:**
- `frontend/src/components/Requests.tsx` (Zeilen 432-509)
- `frontend/src/pages/Worktracker.tsx` (Zeilen 502-673)
- `frontend/src/components/InvoiceManagementTab.tsx` (Zeilen 304-357)
- `frontend/src/components/ConsultationList.tsx`
- `frontend/src/components/teamWorktime/ActiveUsersList.tsx`

**Identifizierte Operatoren:**
- Text: `equals`, `contains`, `startsWith`, `endsWith`
- Status: `equals`, `notEquals`
- Datum: `equals`, `before`, `after`
- Zahlen: `greater_than`, `less_than`
- Spezial: User/Role Formatierung `user-{id}`, `role-{id}`

#### 2. ✅ Legacy FilterState parallel existierend
**Betroffen:**
- `Requests.tsx`: 3 States (`filterState`, `activeFilters`, `filterConditions`)
- `Worktracker.tsx`: 3 States (`filterState`, `activeFilters`, `filterConditions`)

#### 3. ✅ FilterRow lädt User/Roles bei jeder Spaltenänderung
**Problem:** API-Request bei jedem Wechsel der Spalte

#### 4. ✅ SavedFilterTags überkompliziert
**Problem:** 200+ Zeilen komplexe Responsive-Logik

---

## Phase 1: Zentrale Filter-Logik

### Ziel
Erstelle `frontend/src/utils/filterLogic.ts` mit wiederverwendbarer Filter-Logik

### Implementierungsplan

```typescript
// frontend/src/utils/filterLogic.ts

export interface FilterCondition {
  column: string;
  operator: string;
  value: string | number | Date | null;
}

/**
 * Zentrale Funktion zur Auswertung einer einzelnen Filterbedingung
 */
export const evaluateCondition = (
  fieldValue: any,
  condition: FilterCondition
): boolean => {
  const { operator, value } = condition;
  const strField = String(fieldValue || '').toLowerCase();
  const strValue = String(value || '').toLowerCase();

  switch (operator) {
    // Text-Operatoren
    case 'equals':
      return strField === strValue;
    
    case 'contains':
      return strField.includes(strValue);
    
    case 'startsWith':
      return strField.startsWith(strValue);
    
    case 'endsWith':
      return strField.endsWith(strValue);
    
    // Status-Operatoren
    case 'notEquals':
      return strField !== strValue;
    
    // Datum-Operatoren
    case 'after':
      return new Date(fieldValue) > new Date(value as string);
    
    case 'before':
      return new Date(fieldValue) < new Date(value as string);
    
    // Zahlen-Operatoren
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    
    case 'less_than':
      return Number(fieldValue) < Number(value);
    
    default:
      return true; // Unbekannter Operator = keine Filterung
  }
};

/**
 * Wende Filterbedingungen auf ein Array von Items an
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

      // Logische Verknüpfung
      if (i === 0) {
        result = conditionMet;
      } else {
        const operator = operators[i - 1];
        result = operator === 'AND' 
          ? result && conditionMet 
          : result || conditionMet;
      }
    }

    return result;
  });
};
```

### Nächste Schritte
- [ ] Implementiere `filterLogic.ts`
- [ ] Ersetze Filter-Logik in `Requests.tsx`
- [ ] Ersetze Filter-Logik in `Worktracker.tsx`
- [ ] Teste Filter-Funktionalität

---

## Nicht Ändern / Noch Offen

### Fragen vor der Umsetzung:
1. Legacy FilterState entfernen? (`filterState`, `activeFilters`)
   - Risiko: Alte Filter könnten noch in Benutzer-Sessions aktiv sein
   - Empfehlung: Migration für 1 Woche beibehalten

2. Consultation-spezifische Logik auslagern?
   - Betrifft: Recent Clients, Auto-Cleanup
   - Empfehlung: Ja, in separate `ConsultationFilterTags.tsx`

3. Simplified Tag-Anzeige implementieren?
   - Betrifft: 200+ Zeilen komplexe Responsive-Logik
   - Empfehlung: CSS Flexbox verwenden

---

## Aktion: Warte auf Bestätigung

Vor der Implementierung der Phase 1 brauche ich deine Bestätigung zu:

1. Soll `filterLogic.ts` erstellt werden?
2. Soll die Legacy FilterState entfernt werden oder für Migration behalten?
3. Welche Komponenten sollen zuerst refactored werden (Priorität)?

[Pause - warte auf Anweisung]




