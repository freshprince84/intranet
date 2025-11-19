# Schichtplaner: Doppeltes Laden beim Datumwechsel - Fix-Plan

## Problem-Analyse

### Aktueller Flow (mit Problem):

1. **User klickt auf "Vorherige Woche" Button:**
   - `handlePreviousWeek()` → `setCurrentWeek(subWeeks(currentWeek, 1))`
   - `currentWeek` State ändert sich

2. **React Re-Render:**
   - `currentWeek` ist Dependency von `fetchShifts` (useCallback)
   - `fetchShifts` wird neu erstellt
   - `useEffect([fetchShifts])` → `fetchShifts()` wird aufgerufen
   - **LADUNG 1**

3. **FullCalendar Reaktion:**
   - `weekStart` und `weekEnd` werden aus `currentWeek` berechnet
   - FullCalendar sieht Änderung → navigiert programmatisch
   - `datesSet` Event wird ausgelöst → `handleDatesSet()` wird aufgerufen

4. **handleDatesSet:**
   - Prüft, ob sich die Woche geändert hat
   - Ruft möglicherweise nochmal `setCurrentWeek` auf
   - Oder: FullCalendar's eigene Navigation-Buttons (prev/next/today) werden auch verwendet
   - **LADUNG 2** (wenn `setCurrentWeek` nochmal aufgerufen wird)

### Root Cause:

1. **Zwei Navigation-Systeme:**
   - Unsere eigenen Buttons (handlePreviousWeek, handleNextWeek, handleToday)
   - FullCalendar's eigene Buttons in `headerToolbar` (prev, next, today)

2. **Doppelte State-Updates:**
   - Unsere Buttons → `setCurrentWeek` → `fetchShifts` wird neu erstellt → `useEffect` → LADUNG
   - FullCalendar Navigation → `datesSet` → `handleDatesSet` → möglicherweise nochmal `setCurrentWeek` → LADUNG

3. **useCallback Dependency Problem:**
   - `fetchShifts` hat `currentWeek` als Dependency
   - Jede Änderung von `currentWeek` erstellt `fetchShifts` neu
   - `useEffect([fetchShifts])` reagiert auf jede neue Funktion

## Lösung

### Option 1: Ref-basierte Navigation-Tracking (Empfohlen)

**Vorteile:**
- Behält beide Navigation-Systeme
- Verhindert doppelte Updates
- Klare Trennung zwischen programmatischer und User-Navigation

**Implementierung:**
1. Ref hinzufügen, um zu tracken, ob Navigation programmatisch kommt
2. `fetchShifts` sollte die Woche als Parameter bekommen (nicht aus State lesen)
3. `useEffect` sollte direkt auf `currentWeek` reagieren
4. `handleDatesSet` sollte nur `setCurrentWeek` aufrufen, wenn Navigation NICHT programmatisch ist

### Option 2: FullCalendar Navigation deaktivieren

**Vorteile:**
- Einfacher
- Nur ein Navigation-System

**Nachteile:**
- User kann nicht FullCalendar's Buttons verwenden
- Weniger flexibel

### Option 3: useMemo für weekStart/weekEnd

**Vorteile:**
- Verhindert unnötige Re-Renders

**Nachteile:**
- Löst das Hauptproblem nicht (doppelte Ladevorgänge)

## Empfohlene Implementierung (Option 1)

### Schritt 1: Ref für Navigation-Tracking

```typescript
const isProgrammaticNavigation = useRef(false);
```

### Schritt 2: fetchShifts umbauen

```typescript
// fetchShifts sollte die Woche als Parameter bekommen
const fetchShifts = useCallback(async (week: Date) => {
  // ... fetch logic mit week statt currentWeek
}, [t]); // currentWeek NICHT als Dependency

// useEffect sollte direkt auf currentWeek reagieren
useEffect(() => {
  fetchShifts(currentWeek);
}, [currentWeek, fetchShifts]);
```

### Schritt 3: Navigation-Handler anpassen

```typescript
const handlePreviousWeek = () => {
  isProgrammaticNavigation.current = true;
  setCurrentWeek(subWeeks(currentWeek, 1));
  // Ref wird in handleDatesSet zurückgesetzt
};

const handleNextWeek = () => {
  isProgrammaticNavigation.current = true;
  setCurrentWeek(addWeeks(currentWeek, 1));
};

const handleToday = () => {
  isProgrammaticNavigation.current = true;
  setCurrentWeek(new Date());
};
```

### Schritt 4: handleDatesSet anpassen

```typescript
const handleDatesSet = (dateInfo: any) => {
  const currentView = calendarRef.current?.getApi().view.type;
  
  // View-Update
  if (currentView && currentView !== calendarView) {
    setCalendarView(currentView as 'timeGridWeek' | 'dayGridMonth');
  }
  
  // Week-Update nur wenn NICHT programmatisch
  if (currentView === 'timeGridWeek' && !isProgrammaticNavigation.current) {
    const newWeekStart = startOfWeek(dateInfo.start, { weekStartsOn: 1 });
    const currentWeekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    
    if (newWeekStart.getTime() !== currentWeekStart.getTime()) {
      setCurrentWeek(dateInfo.start);
    }
  }
  
  // Ref zurücksetzen
  isProgrammaticNavigation.current = false;
};
```

### Schritt 5: FullCalendar initialDate synchronisieren

```typescript
// initialDate sollte mit currentWeek synchronisiert werden
<FullCalendar
  // ...
  initialDate={currentWeek}
  // ...
/>
```

## Alternative: Vereinfachte Lösung

Wenn Option 1 zu komplex ist, kann man auch einfach:

1. FullCalendar's Navigation-Buttons deaktivieren:
```typescript
headerToolbar={{
  left: '', // Leer lassen
  center: 'title',
  right: '',
}}
```

2. `fetchShifts` umbauen (wie in Schritt 2)
3. `useEffect` direkt auf `currentWeek` reagieren lassen

## Testing

Nach Implementierung testen:
1. ✅ Klick auf "Vorherige Woche" → Nur 1 API-Call
2. ✅ Klick auf "Nächste Woche" → Nur 1 API-Call
3. ✅ Klick auf "Heute" → Nur 1 API-Call
4. ✅ Navigation über FullCalendar Buttons (wenn aktiviert) → Nur 1 API-Call
5. ✅ Kein "Zucken" beim Wechsel

## Nächste Schritte

1. Implementierung von Option 1 (Ref-basiert)
2. Testing
3. Falls Probleme: Alternative (FullCalendar Navigation deaktivieren)

