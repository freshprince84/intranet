# Filter-System Standards

Dieses Dokument beschreibt die aktuellen Standards für die Implementierung von Filtern im System.

## Aktueller Standard (Stand: 2024)

### 1. Zentrale Filter-Logik verwenden

**Alle Filter müssen die zentrale `applyFilters` Funktion aus `filterLogic.ts` verwenden:**

```typescript
import { applyFilters, evaluateDateCondition, evaluateUserRoleCondition } from '../utils/filterLogic.ts';

// In der Filterlogik:
const columnEvaluators: any = {
  'columnId': (item: ItemType, cond: FilterCondition) => {
    // Spezifische Evaluierungslogik
    return evaluateUserRoleCondition(...) || evaluateDateCondition(...) || ...
  }
};

const getFieldValue = (item: ItemType, columnId: string): any => {
  switch (columnId) {
    case 'columnId': return item.field;
    default: return (item as any)[columnId];
  }
};

filtered = applyFilters(
  filtered,
  filterConditions,
  filterLogicalOperators,
  getFieldValue,
  columnEvaluators
);
```

### 2. Datumsfelder mit __TODAY__ Unterstützung

**Alle Datumsfelder müssen `evaluateDateCondition` verwenden, das `__TODAY__` unterstützt:**

```typescript
'dueDate': (item: ItemType, cond: FilterCondition) => {
  return evaluateDateCondition(item.dueDate, cond);
}
```

Die `evaluateDateCondition` Funktion:
- Unterstützt `__TODAY__` als dynamischen Wert (wird zum aktuellen Datum aufgelöst)
- Normalisiert Datumswerte auf Mitternacht für genaue Vergleiche
- Unterstützt Operatoren: `equals`, `before`, `after`

### 3. Dropdowns für Enum/Referenz-Felder

**Folgende Feldtypen müssen Dropdowns verwenden (nicht freie Texteingabe):**

#### a) Typ-Felder (type)
- **Requests**: `vacation`, `improvement_suggestion`, `sick_leave`, `employment_certificate`, `other`
- Implementiert in `FilterRow.tsx` Zeile 320-339

#### b) Branch-Felder (branch)
- Lädt alle Branches von API (`/branches`)
- Zeigt Branch-Namen als Optionen
- Implementiert in `FilterRow.tsx` Zeile 341-363

#### c) Status-Felder (status)
- Automatisch erkannt basierend auf Tabellentyp
- Request-Status: `approval`, `approved`, `to_improve`, `denied`
- Task-Status: `open`, `in_progress`, `improval`, `quality_control`, `done`
- Invoice-Status: `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED`
- Implementiert in `FilterRow.tsx` Zeile 182-230

#### d) Benutzer/Rollen-Felder
- `requestedBy`, `responsible`, `qualityControl`, `responsibleAndQualityControl`
- Lädt Benutzer von API (`/users/dropdown`)
- Lädt Rollen von API (`/roles`) für entsprechende Felder
- Format: `user-{id}` oder `role-{id}`
- Implementiert in `FilterRow.tsx` Zeile 233-298

### 4. Spalten-Reihenfolge

**Standard-Reihenfolge für Requests (als Referenz):**
1. Titel (title)
2. Typ (type)
3. De (requestedBy) - ohne Doppelpunkt
4. Para (responsible) - ohne Doppelpunkt
5. Datum (dueDate)
6. Status (status)
7. Branch (branch)

### 5. FilterLogicalOperator Komponente

**Standards für das UND/ODER-Dropdown:**
- Breite: 42px (fest)
- Vertikaler Abstand: `my-4`
- Icons: PlusIcon (+) für UND, ∨ für ODER
- Übersetzungen über i18n: `filter.logicalOperators.and` / `filter.logicalOperators.or`
- Position: Links ausgerichtet mit `pl-[180px]` (entspricht Breite der ersten Spalte)

### 6. FilterRow Layout

**Feste Spaltenbreiten für vertikale Bündigkeit:**
- Spalten-Auswahl: `w-[180px]`
- Operator: `w-[140px]`
- Wert-Eingabe: `flex-1` (flexibel)
- Aktions-Buttons: `w-[60px]` (Löschen + Hinzufügen)
- Platzhalter für fehlende Buttons: `w-[28px]`
- Abstände: `gap-2` zwischen Spalten

## Implementierungs-Checkliste

Bei der Implementierung neuer Filter oder der Anpassung bestehender Filter:

- [ ] Verwendet `applyFilters` mit `columnEvaluators`
- [ ] Datumsfelder verwenden `evaluateDateCondition`
- [ ] Benutzer/Rollen-Felder verwenden `evaluateUserRoleCondition`
- [ ] Enum-Felder (type, status) haben Dropdowns
- [ ] Branch-Felder haben Dropdowns
- [ ] Spalten sind in logischer Reihenfolge sortiert
- [ ] Labels ohne unnötige Doppelpunkte
- [ ] FilterLogicalOperator verwendet i18n-Übersetzungen
- [ ] FilterRow verwendet feste Spaltenbreiten

## Referenz-Implementierung

**Vollständige Standard-Implementierung:** `frontend/src/components/Requests.tsx`

Dies ist die Referenz-Implementierung, die alle Standards erfüllt.

