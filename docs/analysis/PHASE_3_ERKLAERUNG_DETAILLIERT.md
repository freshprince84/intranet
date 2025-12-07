# Phase 3: Detaillierte Erklärung - WAS GENAU IST GEMEINT?

**Datum:** 2025-01-31  
**Zweck:** Genau erklären, was in Phase 3 gemeint ist und was NICHT entfernt wird

---

## 1. CARD-METADATEN-MAPPING - Was ist das genau?

### Was ist Card-Metadaten-Mapping?

**FAKT:** Cards zeigen Metadaten an (z.B. Titel, Status, Typ, Ersteller, Verantwortlicher, Niederlassung, Fälligkeit, Beschreibung).

**Problem:** Tabellen haben Spalten (z.B. `title`, `status`, `type`, `requestedByResponsible`, `branch`, `dueDate`), aber Cards haben Metadaten (z.B. `title`, `status`, `type`, `requestedBy`, `responsible`, `branch`, `dueDate`, `description`).

**Mapping-Funktionen:**
1. `tableToCardMapping` - Mappt Tabellen-Spalten zu Card-Metadaten
   - Beispiel: `'requestedByResponsible'` → `['requestedBy', 'responsible']` (1 Spalte → 2 Metadaten)
2. `getCardMetadataFromColumnOrder` - Konvertiert Tabellen-Spalten-Reihenfolge zu Card-Metadaten-Reihenfolge
3. `getHiddenCardMetadata` - Konvertiert versteckte Tabellen-Spalten zu versteckten Card-Metadaten
4. `cardMetadataOrder` - Reihenfolge der Card-Metadaten (abgeleitet von `columnOrder`)
5. `hiddenCardMetadata` - Versteckte Card-Metadaten (abgeleitet von `hiddenColumns`)
6. `visibleCardMetadata` - Sichtbare Card-Metadaten (alle minus versteckte)

### Warum existiert das?

**Zweck:** Cards sollen die gleichen Einstellungen wie Tabellen haben:
- Wenn eine Tabellen-Spalte ausgeblendet ist, soll das entsprechende Card-Metadatum auch ausgeblendet sein
- Die Reihenfolge der Card-Metadaten soll der Reihenfolge der Tabellen-Spalten entsprechen

### Was würde entfernt werden?

**Entfernt würde:**
- `tableToCardMapping` Objekt
- `cardToTableMapping` Objekt
- `getCardMetadataFromColumnOrder` Funktion
- `getHiddenCardMetadata` Funktion
- `cardMetadataOrder` useMemo
- `hiddenCardMetadata` useMemo
- `visibleCardMetadata` useMemo

**Was würde bleiben:**
- Cards würden ALLE Metadaten immer anzeigen (keine Sichtbarkeits-Logik)
- Cards würden Metadaten in fester Reihenfolge anzeigen (keine Reihenfolge-Logik)

### ❌ PROBLEM: Das würde die Funktionalität kaputt machen!

**Wenn entfernt:**
- Cards würden nicht mehr auf `hiddenColumns` reagieren
- Cards würden nicht mehr auf `columnOrder` reagieren
- Cards würden immer alle Metadaten anzeigen, auch wenn Tabellen-Spalten ausgeblendet sind

**FAZIT:** Card-Metadaten-Mapping ist **NOTWENDIG** für die Funktionalität! Sollte **NICHT** entfernt werden!

---

## 2. DRAG & DROP - Was ist das genau?

### Es gibt ZWEI verschiedene Drag & Drop:

#### A) Drag & Drop im TableColumnConfig Modal (onMoveColumn)

**Was ist das?**
- Im "Sortieren & Anzeigen" Modal kann man Spalten per Drag & Drop verschieben
- `onMoveColumn` Prop wird an `TableColumnConfig` übergeben
- Wird verwendet, um Spalten im Modal zu verschieben

**Code:** `Requests.tsx` Zeile 1136-1166
```typescript
onMoveColumn={viewMode === 'cards' 
  ? (dragIndex: number, hoverIndex: number) => {
      // Card-Metadaten-Reihenfolge ändern
      ...
    }
  : handleMoveColumn}
```

**Was würde entfernt werden:**
- `onMoveColumn` Prop in `TableColumnConfig` (bereits als "ENTFERNT" markiert)
- Die Logik, die `onMoveColumn` verwendet

**Was würde bleiben:**
- Drag & Drop direkt in Table-Headern (siehe B)

#### B) Drag & Drop direkt in Table-Headern (handleDragStart, handleDragOver, handleDrop)

**Was ist das?**
- In der Table-Ansicht kann man Spalten direkt in den Table-Headern per Drag & Drop verschieben
- `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd` Funktionen
- `draggedColumn`, `dragOverColumn` States

**Code:** `Requests.tsx` Zeile 668-697
```typescript
const handleDragStart = (columnId: string) => {
  setDraggedColumn(columnId);
};

const handleDragOver = (e: React.DragEvent, columnId: string) => {
  e.preventDefault();
  if (draggedColumn && draggedColumn !== columnId) {
    setDragOverColumn(columnId);
  }
};

const handleDrop = (e: React.DragEvent, columnId: string) => {
  e.preventDefault();
  if (draggedColumn && draggedColumn !== columnId) {
    const dragIndex = settings.columnOrder.indexOf(draggedColumn);
    const hoverIndex = settings.columnOrder.indexOf(columnId);
    
    if (dragIndex > -1 && hoverIndex > -1) {
      handleMoveColumn(dragIndex, hoverIndex);
    }
  }
  setDraggedColumn(null);
  setDragOverColumn(null);
};
```

**Was würde entfernt werden:**
- `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd` Funktionen
- `draggedColumn`, `dragOverColumn` States

**Was würde bleiben:**
- Nichts - Table-Header Drag & Drop würde komplett weg sein!

### ❌ PROBLEM: Das würde die Funktionalität kaputt machen!

**Wenn entfernt:**
- Man könnte Spalten nicht mehr direkt in Table-Headern verschieben
- Das ist eine **GRUNDFUNKTIONALITÄT**!

**FAZIT:** Drag & Drop in Table-Headern ist **NOTWENDIG** für die Funktionalität! Sollte **NICHT** entfernt werden!

**Nur Drag & Drop im Modal könnte entfernt werden** (wenn das Modal kein Drag & Drop mehr haben soll), aber das ist eine separate Entscheidung.

---

## 3. AKTIVE FILTER (activeFilterName, selectedFilterId) - Was ist das genau?

### Was sind activeFilterName und selectedFilterId?

**FAKT:** Das sind States, die verfolgen, welcher Filter gerade aktiv ist:
- `activeFilterName` - Name des aktiven Filters (z.B. "Aktuell", "Alle", "Archiv")
- `selectedFilterId` - ID des gespeicherten Filters (wenn ein gespeicherter Filter aktiv ist)

**Code:** `Requests.tsx` Zeile 219-220
```typescript
const [activeFilterName, setActiveFilterName] = useState<string>('');
const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
```

### Wofür werden sie verwendet?

1. **UI-Anzeige:** `SavedFilterTags` zeigt an, welcher Filter-Tag aktiv ist (highlighted)
2. **Filter-Logik:** Prüfung, ob ein gespeicherter Filter aktiv ist (`selectedFilterId !== null`)
3. **Fallback-Logik:** Prüfung, ob ein Filter angewendet wurde (`selectedFilterId === null && filterConditions.length === 0`)

**Code:** `SavedFilterTags.tsx` verwendet `activeFilterName` und `selectedFilterId`:
```typescript
<SavedFilterTags
  activeFilterName={activeFilterName}
  selectedFilterId={selectedFilterId}
  ...
/>
```

### Was würde entfernt werden?

**Entfernt würde:**
- `activeFilterName` State
- `selectedFilterId` State
- Alle `setActiveFilterName` Aufrufe
- Alle `setSelectedFilterId` Aufrufe
- Alle Prüfungen auf `selectedFilterId`

**Was würde bleiben:**
- Filter würden nur über `filterConditions` State verwaltet
- Keine Anzeige, welcher Filter aktiv ist
- Keine Unterscheidung zwischen gespeicherten Filtern und direkten Bedingungen

### ❌ PROBLEM: Das würde die Funktionalität kaputt machen!

**Wenn entfernt:**
- `SavedFilterTags` könnte nicht mehr anzeigen, welcher Filter aktiv ist
- Man könnte nicht mehr unterscheiden zwischen gespeicherten Filtern und direkten Bedingungen
- Fallback-Logik würde nicht mehr funktionieren

**FAZIT:** `activeFilterName` und `selectedFilterId` sind **NOTWENDIG** für die Funktionalität! Sollten **NICHT** entfernt werden!

---

## 4. FALLBACK-TIMEOUT (Schritt 5) - Was ist das genau?

### Was ist der Fallback-Timeout?

**FAKT:** Ein `setTimeout`, der nach 800ms einen Fallback auslöst, wenn kein Filter angewendet wurde.

**Code:** `Requests.tsx` Zeile 568-583
```typescript
if (!filtersLoading && requests.length === 0 && !initialLoadAttemptedRef.current && selectedFilterId === null && filterConditions.length === 0) {
  // Warte 800ms, damit SavedFilterTags Zeit hat, Default-Filter anzuwenden
  const timeoutId = setTimeout(() => {
    // Prüfe nochmal, ob inzwischen ein Filter angewendet wurde oder ob bereits geladen wurde
    if (selectedFilterId === null && filterConditions.length === 0 && requests.length === 0 && !initialLoadAttemptedRef.current) {
      // Fallback: Lade Requests ohne Filter
      fetchRequests(undefined, undefined, false, 20, 0);
    }
  }, 800);
  
  return () => clearTimeout(timeoutId);
}
```

### Wofür ist das nötig?

**Zweck:** Wenn `SavedFilterTags` den Default-Filter nicht anwendet (z.B. Bug), soll nach 800ms ein Fallback ausgelöst werden, der Requests ohne Filter lädt.

**Problem:** Das ist ein **Workaround** für ein Problem, das eigentlich behoben werden sollte.

### Was würde entfernt werden?

**Entfernt würde:**
- `setTimeout` Fallback (800ms)
- `clearTimeout` Cleanup

**Was würde bleiben:**
- Nichts - wenn `SavedFilterTags` den Default-Filter nicht anwendet, würde nichts geladen werden

### ⚠️ PROBLEM: Das könnte die Funktionalität kaputt machen!

**Wenn entfernt:**
- Wenn `SavedFilterTags` den Default-Filter nicht anwendet (Bug), würde nichts geladen werden
- Die Seite würde leer bleiben

**FAZIT:** Der Fallback-Timeout ist ein **Workaround**. Wenn `SavedFilterTags` immer den Default-Filter anwendet, ist er nicht nötig. Aber wenn es einen Bug gibt, würde die Seite leer bleiben.

**LÖSUNG:** Statt den Fallback zu entfernen, sollte das Problem behoben werden, dass `SavedFilterTags` den Default-Filter nicht immer anwendet.

---

## 5. CLEANUP USEEFFECTS (Schritt 6) - Was ist das genau?

### Was sind Cleanup useEffects?

**FAKT:** Explizite Cleanup-Logik in `useEffect`, die Arrays beim Unmount löscht.

**Code:** `Requests.tsx` Zeile 585
```typescript
// ❌ ENTFERNT: Cleanup useEffect - React macht automatisches Cleanup, manuelles Löschen ist überflüssig (Phase 3)
```

**FAKT:** Es gibt bereits einen Kommentar, dass das entfernt wurde. Es scheint, dass es bereits entfernt wurde.

### Wofür ist das nötig?

**Zweck:** React macht automatisches Cleanup, wenn ein Component unmounted wird. Explizites Löschen von Arrays ist normalerweise nicht nötig.

**Problem:** Wenn es bereits entfernt wurde, gibt es nichts mehr zu entfernen.

### Was würde entfernt werden?

**Entfernt würde:**
- Nichts - es ist bereits entfernt (laut Kommentar)

**FAZIT:** Schritt 6 ist bereits erledigt. Es gibt nichts mehr zu entfernen.

---

## 📊 ZUSAMMENFASSUNG

### ❌ Sollte NICHT entfernt werden:

1. **Card-Metadaten-Mapping** - NOTWENDIG für Card-Sichtbarkeit und Reihenfolge
2. **Drag & Drop in Table-Headern** - NOTWENDIG für Spalten verschieben (Grundfunktionalität)
3. **activeFilterName, selectedFilterId** - NOTWENDIG für Filter-Anzeige und Logik

### ⚠️ Könnte entfernt werden (aber mit Risiko):

4. **Fallback-Timeout** - Workaround, sollte durch Bug-Fix ersetzt werden
5. **Drag & Drop im Modal** - Wenn Modal kein Drag & Drop mehr haben soll

### ✅ Bereits entfernt:

6. **Cleanup useEffects** - Bereits entfernt (laut Kommentar)

---

**Erstellt:** 2025-01-31  
**Status:** 📋 ERKLÄRUNG - KEINE ÄNDERUNGEN

