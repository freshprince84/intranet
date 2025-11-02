# Erklärung: Controlled vs. Uncontrolled Mode (und Legacy Mode)

**Datum:** 31.10.2025  
**Kontext:** Filter-Tags in `SavedFilterTags.tsx`

## Was bedeutet "Controlled" vs. "Uncontrolled" Mode?

Diese Begriffe kommen aus React und beschreiben, **wer die Kontrolle über den State (Zustand) einer Komponente hat**.

### 🎛️ Controlled Component (gesteuerte Komponente)

**Bedeutung:** Die **Parent-Komponente** (die Komponente, die `SavedFilterTags` verwendet) hat die volle Kontrolle über den State.

**Wie funktioniert es?**
1. Die Parent-Komponente verwaltet den State (z.B. `selectedFilterId`, `activeFilterName`)
2. Die Parent-Komponente übergibt diese Werte als **Props** an `SavedFilterTags`
3. `SavedFilterTags` zeigt nur an, was die Parent-Komponente sagt
4. Wenn ein Filter geklickt wird, ruft `SavedFilterTags` eine Callback-Funktion auf (`onFilterChange`)
5. Die Parent-Komponente entscheidet, was passiert und aktualisiert ihren eigenen State

**Analogie:** Wie ein Radio-Sender und Empfänger
- Die Parent-Komponente ist der **Sender** (entscheidet)
- `SavedFilterTags` ist der **Empfänger** (zeigt nur an)

### 🔓 Uncontrolled Component (ungesteuerte Komponente)

**Bedeutung:** Die Komponente `SavedFilterTags` selbst verwaltet ihren eigenen internen State.

**Wie funktioniert es?**
1. `SavedFilterTags` verwaltet intern, welcher Filter aktiv ist
2. Die Parent-Komponente gibt nur Callbacks (`onSelectFilter`, `onReset`)
3. `SavedFilterTags` entscheidet selbst, welcher Filter gerade aktiv ist
4. Die Parent-Komponente weiß nicht, welcher Filter aktiv ist (hat keinen State dafür)

**Analogie:** Wie ein eigenständiges Gerät
- `SavedFilterTags` entscheidet selbst
- Die Parent-Komponente gibt nur Anweisungen, was bei einem Klick passieren soll

## Code-Beispiele aus unserem Projekt

### ✅ Controlled Mode Beispiel: `ConsultationList.tsx`

```typescript
// ConsultationList.tsx - Parent-Komponente

// 1. State wird in der PARENT-Komponente verwaltet
const [activeFilterName, setActiveFilterName] = useState<string>('Heute');
const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);

// 2. Callback-Funktion, die bei Filter-Änderungen aufgerufen wird
const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
  setActiveFilterName(name);      // Parent aktualisiert seinen State
  setSelectedFilterId(id);        // Parent aktualisiert seinen State
  applyFilterConditions(conditions, operators);
};

// 3. SavedFilterTags erhält alle State-Informationen als Props
<SavedFilterTags
  tableId={CONSULTATIONS_TABLE_ID}
  onSelectFilter={applyFilterConditions}
  onReset={resetFilterConditions}
  activeFilterName={activeFilterName}      // ✅ Parent übergibt State
  selectedFilterId={selectedFilterId}        // ✅ Parent übergibt State
  onFilterChange={handleFilterChange}       // ✅ Callback für State-Updates
/>
```

**Vorteil:** Parent-Komponente weiß immer, welcher Filter aktiv ist → kann den aktiven Filter blau markieren!

### ❌ Uncontrolled Mode Beispiel: `Requests.tsx`

```typescript
// Requests.tsx - Parent-Komponente

// 1. KEIN State für Filter-Name oder Filter-ID
// (Nur State für Filter-Bedingungen, aber nicht welcher Filter aktiv ist)

// 2. Nur Callback-Funktionen
const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
  // Filter wird angewendet, aber wir wissen nicht, welcher Filter das war
  setFilterConditions(conditions);
  setFilterLogicalOperators(operators);
  // ...
};

// 3. SavedFilterTags erhält KEINE State-Informationen
<SavedFilterTags
  tableId={REQUESTS_TABLE_ID}
  onSelectFilter={applyFilterConditions}    // ✅ Callback vorhanden
  onReset={resetFilterConditions}            // ✅ Callback vorhanden
  defaultFilterName="Aktuell"                // ⚠️ Nur Default-Name, aber kein State
  // ❌ KEIN activeFilterName
  // ❌ KEIN selectedFilterId
  // ❌ KEIN onFilterChange
/>
```

**Problem:** `SavedFilterTags` weiß nicht, welcher Filter aktiv ist (weil die Parent-Komponente es nicht verwaltet) → kann keinen Filter blau markieren!

## Was ist "Legacy Mode"?

**"Legacy"** bedeutet wörtlich **"Erbe/Altlast"** - es ist ein alter, veralteter Code-Stil.

### Warum heißt es "Legacy Mode"?

1. **Früher** wurde `SavedFilterTags` wahrscheinlich nur im "Uncontrolled Mode" verwendet
2. **Später** wurde der "Controlled Mode" hinzugefügt (für bessere Funktionalität)
3. Der **alte "Uncontrolled Mode"** wurde beibehalten für **Rückwärtskompatibilität**
4. Damit alte Komponenten weiterhin funktionieren, ohne sie alle umschreiben zu müssen

### Warum "Legacy Mode nicht visuell hervorheben"?

Im Code steht (Zeile 423):
```typescript
return null; // In legacy mode nicht visuell hervorheben
```

**Ursache:**
- Im alten Code wurde wahrscheinlich nie eine visuelle Hervorhebung gebraucht
- Um keine Breaking Changes zu verursachen (dass alte Komponenten kaputt gehen), wurde bewusst `null` zurückgegeben
- Die visuelle Markierung wurde nur für den neuen "Controlled Mode" implementiert

## Vergleich: Controlled vs. Uncontrolled

| Aspekt | Controlled Mode | Uncontrolled Mode |
|--------|----------------|------------------|
| **State-Verwaltung** | Parent-Komponente | `SavedFilterTags` selbst |
| **Props benötigt** | `onFilterChange`, `selectedFilterId`, `activeFilterName` | `onSelectFilter`, `onReset` |
| **Visuelle Markierung** | ✅ Funktioniert | ❌ Funktioniert nicht (Legacy) |
| **Komplexität** | Höher (State in Parent) | Niedriger (kein State nötig) |
| **Flexibilität** | Höher (Parent hat volle Kontrolle) | Niedriger (nur Callbacks) |

## Warum funktioniert die Markierung nicht?

### Im Uncontrolled/Legacy Mode:

```typescript
const getActiveFilterId = () => {
  if (onFilterChange) {
    // Controlled component - funktioniert ✅
    return selectedFilterId;
  } else {
    // Uncontrolled/Legacy - gibt immer null zurück ❌
    return null; // In legacy mode nicht visuell hervorheben
  }
};
```

**Ergebnis:**
- `getActiveFilterId()` gibt immer `null` zurück
- `getActiveFilterId() === filter.id` ist immer `false`
- Der blaue Style wird nie angewendet
- Alle Filter werden grau dargestellt

### Im Controlled Mode:

```typescript
const getActiveFilterId = () => {
  if (onFilterChange) {
    // Controlled component - funktioniert ✅
    return selectedFilterId;  // z.B. 5 (die ID des "Heute"-Filters)
  }
  // ...
};
```

**Ergebnis:**
- `getActiveFilterId()` gibt die tatsächliche Filter-ID zurück (z.B. `5`)
- `getActiveFilterId() === filter.id` ist `true` für den aktiven Filter
- Der blaue Style wird angewendet: `bg-blue-100 text-blue-800 border-blue-300`
- Der aktive Filter wird blau dargestellt ✅

## Zusammenfassung

- **Controlled Mode:** Parent-Komponente hat die Kontrolle → State wird als Props übergeben → Markierung funktioniert ✅
- **Uncontrolled Mode:** `SavedFilterTags` verwaltet State selbst → keine State-Props → Markierung funktioniert nicht ❌
- **Legacy Mode:** Alte Implementierung ohne visuelle Markierung → beibehalten für Rückwärtskompatibilität

## Lösung

Um die Markierung auch im "Uncontrolled Mode" zu ermöglichen, müsste man:

1. **Option A:** Alle Komponenten auf "Controlled Mode" umstellen (State in Parent-Komponente)
2. **Option B:** `getActiveFilterId()` im "Uncontrolled Mode" implementieren (internen State verfolgen)
3. **Option C:** Standard-Filter automatisch als aktiv markieren (wenn `defaultFilterName` gesetzt ist)

