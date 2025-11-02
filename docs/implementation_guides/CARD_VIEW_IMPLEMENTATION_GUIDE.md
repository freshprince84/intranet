# Card-Ansicht Implementierungsanleitung

## Übersicht

Diese Anleitung beschreibt, wie die Card-Ansicht für andere Boxen/Tabellen im Intranet-System implementiert wird. Die Card-Ansicht wurde zuerst für die Requests-Komponente implementiert und dient als Referenz für alle weiteren Implementierungen.

**Referenz-Implementierung**: `frontend/src/components/Requests.tsx`

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Schritt-für-Schritt Anleitung](#schritt-für-schritt-anleitung)
3. [Technische Details](#technische-details)
4. [Box-Shadow-System](#box-shadow-system)
5. [Filter und Sortierung](#filter-und-sortierung)
6. [Metadaten ein-/ausblenden](#metadaten-ein-ausblenden)
7. [Troubleshooting](#troubleshooting)

---

## Voraussetzungen

### Benötigte Komponenten

Die folgenden wiederverwendbaren Komponenten sind bereits implementiert und müssen verwendet werden:

1. **DataCard** (`frontend/src/components/shared/DataCard.tsx`)
   - Standardisierte Card-Komponente mit Header, Metadaten, Actions
   - Unterstützt Status-Badges, expandable Content, Hover-Effekte

2. **CardGrid** (`frontend/src/components/shared/CardGrid.tsx`)
   - Responsive Grid-Wrapper für Cards
   - Aktuell: Immer 1 Spalte (volle Breite pro Card)

3. **useTableSettings Hook** (`frontend/src/hooks/useTableSettings.ts`)
   - Verwaltet Tabellen- und Card-Einstellungen
   - Unterstützt View-Mode (table/cards), Spaltenkonfiguration, Filter

### Benötigte Dependencies

- `@heroicons/react` - Icons
- `date-fns` - Datumsformatierung
- `react` - React Hooks

---

## Schritt-für-Schritt Anleitung

### Schritt 1: View-Mode State hinzufügen

Verwende den `useTableSettings` Hook, um den View-Mode zu verwalten:

```typescript
import { useTableSettings } from '../hooks/useTableSettings.ts';

// In deiner Komponente
const {
  settings,
  isLoading: isLoadingSettings,
  updateViewMode,
  updateVisibleCardMetadata,
  updateCardColumnOrder,
  updateCardSortDirections
} = useTableSettings('your_table_id', {
  defaultColumnOrder: ['title', 'status', /* ... */],
  defaultHiddenColumns: [],
  defaultViewMode: 'cards', // oder 'table'
  defaultVisibleCardMetadata: ['title', 'status', /* ... */],
  defaultCardColumnOrder: ['title', 'status', /* ... */],
  defaultCardSortDirections: { title: 'asc', /* ... */ }
});

const viewMode = settings.viewMode || 'cards';
```

### Schritt 2: View-Mode Toggle Button hinzufügen

Füge einen Toggle-Button in die Header-Zeile ein:

```tsx
import { Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline';

// In der Header-Zeile
<button
  className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
    viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
  }`}
  onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
  title={viewMode === 'table' ? 'Als Cards anzeigen' : 'Als Tabelle anzeigen'}
>
  {viewMode === 'table' ? (
    <Squares2X2Icon className="h-5 w-5" />
  ) : (
    <TableCellsIcon className="h-5 w-5" />
  )}
</button>
```

### Schritt 3: Card-Ansicht implementieren

Erstelle die Card-Ansicht parallel zur Tabellen-Ansicht:

```tsx
import DataCard, { MetadataItem } from './shared/DataCard.tsx';
import CardGrid from './shared/CardGrid.tsx';

// In der Render-Logik
{viewMode === 'table' ? (
  // Tabellen-Ansicht (bestehend)
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      {/* Tabellen-Inhalt */}
    </table>
  </div>
) : (
  // Card-Ansicht - OHNE Box-Schattierung, Cards auf voller Breite
  <div className="-mx-6">
    {filteredData.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <YourIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
        <div className="text-sm">Keine Einträge gefunden</div>
      </div>
    ) : (
      <CardGrid>
        {filteredData.slice(0, displayLimit).map(item => {
          // Metadaten sammeln
          const metadata: MetadataItem[] = [];
          
          // Beispiel: Metadaten hinzufügen
          if (visibleCardMetadata.has('title')) {
            metadata.push({
              icon: <YourIcon className="h-4 w-4" />,
              label: 'Titel',
              value: item.title,
              section: 'main'
            });
          }
          
          // Action-Buttons zusammenstellen
          const actionButtons = (
            <div className="flex items-center space-x-2">
              {/* Deine Action-Buttons */}
            </div>
          );
          
          return (
            <DataCard
              key={item.id}
              title={item.title}
              status={{
                label: getStatusText(item.status),
                color: getStatusColor(item.status),
                // Optional: Status-Navigation
                onPreviousClick: previousStatus ? () => handleStatusChange(item.id, previousStatus) : undefined,
                onNextClick: nextStatus ? () => handleStatusChange(item.id, nextStatus) : undefined
              }}
              metadata={metadata}
              actions={actionButtons}
            />
          );
        })}
      </CardGrid>
    )}
  </div>
)}
```

### Schritt 4: Container-Box CSS-Klasse hinzufügen

Füge die CSS-Klasse für die Container-Box hinzu, damit die Box-Shadow-Regeln greifen:

```tsx
// In der Parent-Komponente (z.B. Dashboard.tsx)
// WICHTIG: shadow-sm NICHT hier hinzufügen - wird durch CSS-Regeln entfernt!
<div className="your-wrapper-class bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full">
  <YourComponent />
</div>
```

**WICHTIG**: 
- Die CSS-Klasse muss mit `-wrapper` enden (z.B. `dashboard-tasks-wrapper`), damit die CSS-Regeln greifen.
- **`shadow-sm` NICHT im HTML hinzufügen** - die CSS-Regeln entfernen den Shadow automatisch in Cards-Mode.
- Wenn `shadow-sm` im HTML steht, kann es zu Problemen kommen, da die CSS-Regeln manchmal nicht alle Varianten abdecken.

### Schritt 5: CSS-Klasse für Cards-Mode setzen

In deiner Komponente: Setze die CSS-Klasse für Cards-Mode auf die Container-Box:

```typescript
// In deiner Komponente
useEffect(() => {
  // WICHTIG: querySelectorAll verwenden, wenn mehrere Wrapper vorhanden sind
  // (z.B. Mobile/Desktop Varianten, verschiedene Tabs)
  const wrappers = document.querySelectorAll('.your-wrapper-class');
  wrappers.forEach(wrapper => {
    if (viewMode === 'cards') {
      wrapper.classList.add('cards-mode');
    } else {
      wrapper.classList.remove('cards-mode');
    }
  });
}, [viewMode]);
```

**KRITISCH**: 
- **IMMER `querySelectorAll` verwenden**, nicht `querySelector`!
- Viele Komponenten haben mehrere Wrapper-Container (Mobile/Desktop, verschiedene Tabs)
- `querySelector` findet nur den ersten Container, die CSS-Regeln greifen dann nicht auf alle Wrapper!

### Schritt 6: CSS-Regeln hinzufügen

Füge die CSS-Regeln in `frontend/src/index.css` hinzu (im Mobile-Bereich und Desktop-Bereich):

```css
/* Mobile (< 640px) */
@media (max-width: 640px) {
  /* Container-Box bei Cards-Mode: Schattierung und Border entfernen */
  .your-wrapper-class.cards-mode {
    box-shadow: none !important;
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* Entferne alle Schatten von der Container-Box in Cards-Mode */
  .your-wrapper-class.cards-mode.bg-white,
  .your-wrapper-class.cards-mode.bg-white.rounded-lg,
  /* ... weitere Varianten */
  {
    box-shadow: none !important;
    border: none !important;
  }
  
  /* Cards-Container: Keine seitlichen Ränder */
  .your-wrapper-class.cards-mode > div {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  
  /* Cards selbst: Eigene Schattierung BEHALTEN (rundherum) */
  .your-wrapper-class.cards-mode [class*="bg-white"].rounded-lg[class*="shadow"],
  .your-wrapper-class.cards-mode [class*="dark:bg-gray-800"].rounded-lg[class*="shadow"] {
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100% !important;
  }
}

/* Desktop (≥ 641px) */
@media (min-width: 641px) {
  /* Container-Box bei Cards-Mode: Gar kein Schatten */
  .your-wrapper-class.cards-mode.bg-white,
  .your-wrapper-class.cards-mode.bg-white.rounded-lg,
  /* ... weitere Varianten */
  {
    box-shadow: none !important;
  }
}
```

---

## Technische Details

### Metadaten-Struktur

Die `MetadataItem` Interface unterstützt verschiedene Layout-Positionen:

```typescript
interface MetadataItem {
  icon?: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
  descriptionContent?: string; // Für expandierbare Beschreibung
  section?: 'left' | 'main' | 'right' | 'full'; // Position im Layout
}
```

**Section-Optionen**:
- `left`: Links im Header-Bereich (z.B. Niederlassung)
- `main`: Haupt-Metadaten im Grid Header - **ERSTE Zeile** (z.B. "Angefragt von", "Responsable")
  - **WICHTIG**: Wird **NUR im Header** angezeigt, nicht im unteren Metadaten-Bereich!
- `main-second`: Haupt-Metadaten im Grid Header - **ZWEITE Zeile** (z.B. "Responsable", "Control de calidad")
  - **WICHTIG**: Wird **NUR im Header** angezeigt, nicht im unteren Metadaten-Bereich!
- `right-inline`: Rechts im Grid Header, **inline mit Status** (z.B. Datum/Fälligkeit) - **VERWENDEN für Datum neben Status!**
- `right`: Rechts unter dem Header, bündig mit Status (z.B. Fälligkeit als Badge)
- `full`: Volle Breite (z.B. Beschreibung)

**Kritische Implementierungsregeln**:
1. **Metadaten mit `section: 'main'` oder `section: 'main-second'`** werden automatisch aus dem unteren Metadaten-Bereich herausgefiltert (DataCard.tsx Zeile 398, 421, 428). Sie erscheinen **NUR im Header**.
2. **Datum/Fälligkeit**: Sollte **immer `section: 'right-inline'`** verwenden (nicht `right`), um inline neben Status angezeigt zu werden - wie bei Requests implementiert.
3. **Anordnung gleich wie Requests**: "Responsable" und "Control de calidad" sollten genau wie "Solicitado por" und "Responsable" bei Requests angeordnet sein:
   - Erste Zeile: `section: 'main'` (z.B. "Responsable")
   - Zweite Zeile: `section: 'main-second'` (z.B. "Control de calidad")

### Status-Navigation

Die DataCard unterstützt Status-Navigation mit Pfeilen:

```typescript
status={{
  label: getStatusText(item.status),
  color: getStatusColor(item.status),
  onPreviousClick: previousStatus ? () => handleStatusChange(item.id, previousStatus) : undefined,
  onNextClick: nextStatus ? () => handleStatusChange(item.id, nextStatus) : undefined
}}
```

### Expandable Content

Für längere Inhalte (z.B. Beschreibungen):

```typescript
metadata.push({
  icon: <InformationCircleIcon className="h-4 w-4" />,
  label: 'Beschreibung',
  value: '', // Nicht verwendet bei descriptionContent
  descriptionContent: item.description, // Für expandierbare Beschreibung
  section: 'full'
});
```

---

## Box-Shadow-System

### Design-Prinzipien

1. **Container-Box (bei Cards-Mode)**:
   - **Gar kein Schatten** (da nur oben/unten technisch nicht möglich ist)
   - Hintergrund wird transparent
   - Padding wird entfernt

2. **Cards (DataCard)**:
   - **Rundherum Schatten**: `shadow-sm` (normal) und `hover:shadow-md` (hover)
   - Schatten bleiben immer erhalten

### CSS-Implementierung

Die Box-Shadow-Regeln befinden sich in:
- **Mobile**: `frontend/src/index.css` Zeilen ~593-632
- **Desktop**: `frontend/src/index.css` Zeilen ~1018-1029

**Wichtig**: 
- Container-Box CSS-Klasse muss mit `-wrapper` enden
- CSS-Regeln müssen für Mobile und Desktop beide implementiert werden
- Cards behalten ihre eigenen Schatten (werden nicht entfernt)

### Beispiel CSS-Klassen

```
dashboard-requests-wrapper (Requests)
dashboard-tasks-wrapper (Tasks/To Do's)
workcenter-wrapper (Workcenter)
```

---

## Filter und Sortierung

### Filter-System

Das Filter-System funktioniert für beide Ansichten identisch:

```typescript
// Filter State
const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);

// Gefilterte Daten
const filteredData = useMemo(() => {
  let filtered = data;
  
  // Suche
  if (searchTerm) {
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Filter-Bedingungen
  filterConditions.forEach((condition, index) => {
    // Filter-Logik
  });
  
  return filtered;
}, [data, searchTerm, filterConditions, filterLogicalOperators]);
```

### Sortierung

Für Cards-Mode: Multi-Sortierung basierend auf Card-Metadaten-Reihenfolge:

```typescript
// Sortierung basierend auf viewMode
const sortedData = useMemo(() => {
  if (viewMode === 'cards') {
    // Multi-Sortierung basierend auf cardColumnOrder und cardSortDirections
    const sorted = [...filteredData];
    // Sortiere nach cardColumnOrder
    return sorted;
  } else {
    // Tabellen-Sortierung
    return filteredData.sort((a, b) => {
      // Sortierungs-Logik
    });
  }
}, [filteredData, viewMode, cardColumnOrder, cardSortDirections]);
```

---

## Metadaten ein-/ausblenden

### Verwalten sichtbarer Metadaten

Verwende `visibleCardMetadata` Set für Card-Metadaten:

```typescript
const [visibleCardMetadata, setVisibleCardMetadata] = useState<Set<string>>(
  new Set(settings.visibleCardMetadata || defaultCardMetadata)
);

// Toggle Metadaten-Sichtbarkeit
const toggleMetadataVisibility = (metadataId: string) => {
  const newSet = new Set(visibleCardMetadata);
  if (newSet.has(metadataId)) {
    newSet.delete(metadataId);
  } else {
    newSet.add(metadataId);
  }
  setVisibleCardMetadata(newSet);
  updateVisibleCardMetadata(Array.from(newSet));
};
```

### Mapping Card-Metadaten ↔ Tabellen-Spalten

Wenn Card-Metadaten auf Tabellen-Spalten gemappt werden müssen:

```typescript
const cardToTableMapping: Record<string, string> = {
  'requestedBy': 'requestedByResponsible',
  'responsible': 'requestedByResponsible',
  'branch': 'branch',
  'dueDate': 'dueDate',
  // ...
};

// Beim Toggle: Card-Metadaten-ID → Tabellen-Spalten-ID
const tableColumnId = cardToTableMapping[metadataId];
if (tableColumnId) {
  toggleColumnVisibility(tableColumnId);
}
```

### TableColumnConfig Integration

Verwende `TableColumnConfig` für beide Ansichten:

```tsx
<TableColumnConfig
  columns={viewMode === 'cards'
    ? cardMetadataColumns  // Card-Metadaten
    : availableColumns}    // Tabellen-Spalten
  visibleColumns={viewMode === 'cards'
    ? Array.from(visibleCardMetadata)
    : visibleColumnIds}
  columnOrder={viewMode === 'cards'
    ? cardMetadataOrder
    : settings.columnOrder}
  onToggleColumnVisibility={(columnId) => {
    if (viewMode === 'cards') {
      // Card-Metadaten-Logik
    } else {
      // Tabellen-Spalten-Logik
    }
  }}
  // ... weitere Props
/>
```

---

## Troubleshooting

### Problem: Container-Box hat noch Schatten in Cards-Mode

**Lösung**: 
1. Prüfe, ob die CSS-Klasse mit `-wrapper` endet
2. **Prüfe, ob `querySelectorAll` verwendet wird** (nicht `querySelector`) - es gibt oft mehrere Wrapper!
3. Prüfe, ob `cards-mode` Klasse gesetzt wird: `wrapper.classList.add('cards-mode')` auf **ALLE Wrapper**
4. Prüfe, ob CSS-Regeln für Mobile und Desktop beide vorhanden sind
5. **Entferne `shadow-sm` aus dem HTML** - die CSS-Regeln übernehmen die Entfernung automatisch

### Problem: Cards haben keinen Schatten

**Lösung**:
1. Prüfe, ob `DataCard` die Klasse `shadow-sm` hat
2. Prüfe, ob keine CSS-Regel alle Schatten in Cards-Mode entfernt
3. Verwende `[class*="shadow"]` Selektoren in CSS, um nur Cards mit Schatten zu targeten

### Problem: Filter/Sortierung funktionieren nicht

**Lösung**:
1. Prüfe, ob `filteredData` und `sortedData` beide für Cards-Mode verwendet werden
2. Prüfe, ob Filter-Logik für beide Ansichten identisch ist
3. Prüfe, ob `viewMode` in `useMemo` Dependencies enthalten ist

### Problem: Metadaten werden nicht angezeigt/ausgeblendet

**Lösung**:
1. Prüfe, ob `visibleCardMetadata.has(metadataId)` korrekt geprüft wird
2. Prüfe, ob `updateVisibleCardMetadata` aufgerufen wird
3. Prüfe, ob Settings korrekt geladen werden

---

## Checkliste für neue Implementierung

- [ ] `useTableSettings` Hook integriert
- [ ] View-Mode Toggle Button hinzugefügt
- [ ] Card-Ansicht implementiert (parallel zur Tabelle)
- [ ] Container-Box CSS-Klasse hinzugefügt (`-wrapper` Suffix)
- [ ] **`querySelectorAll` verwendet** (nicht `querySelector`) für `cards-mode` Klasse
- [ ] **`shadow-sm` aus HTML entfernt** (wird durch CSS-Regeln entfernt)
- [ ] CSS-Regeln für Mobile und Desktop hinzugefügt
- [ ] Filter funktionieren für beide Ansichten
- [ ] Sortierung funktioniert für beide Ansichten
- [ ] Metadaten ein-/ausblenden funktioniert
- [ ] **Metadaten-Sections korrekt**: `main`/`main-second` nur im Header, `right-inline` für Datum
- [ ] **Anordnung gleich wie Requests**: Erste Zeile `main`, zweite Zeile `main-second`
- [ ] TableColumnConfig für beide Ansichten konfiguriert
- [ ] Dark Mode Support vollständig
- [ ] Responsive Design getestet (Mobile/Desktop)

---

## Referenz-Implementierungen

### Vollständige Implementierung
- **Requests**: `frontend/src/components/Requests.tsx`
  - Zeigt alle Features: Filter, Sortierung, Metadaten-Verwaltung, Status-Navigation

### Komponenten
- **DataCard**: `frontend/src/components/shared/DataCard.tsx`
- **CardGrid**: `frontend/src/components/shared/CardGrid.tsx`
- **useTableSettings**: `frontend/src/hooks/useTableSettings.ts`

### CSS
- **Box-Shadow-Regeln**: `frontend/src/index.css` Zeilen ~593-632 (Mobile) und ~1018-1029 (Desktop)

---

## Weitere Ressourcen

- **Design-Standards**: `docs/core/DESIGN_STANDARDS.md` - Card-Design Sektion
- **Implementierungsbericht**: `docs/implementation_reports/CARD_DESIGN_IMPLEMENTATION.md`
- **Vorschläge**: `docs/implementation_plans/CARD_DESIGN_VORSCHLAEGE.md`

