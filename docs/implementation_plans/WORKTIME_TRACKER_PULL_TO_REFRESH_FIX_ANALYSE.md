# WorktimeTracker Pull-to-Refresh Problem - Analyse und Planung

## Problemstellung

Auf Mobile: Wenn das Bottom Sheet ausgefahren ist nach oben und man es nach unten swipen will, wird manchmal die komplette Seite nach unten gezogen und somit die komplette Seite neu geladen (Pull-to-Refresh Verhalten des Browsers).

## Aktuelle Implementierung

### Touch-Handler (WorktimeTracker.tsx, Zeilen 424-452)

**Aktueller Code:**
```tsx
const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
};

const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentY.current = e.touches[0].clientY;
};

const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const deltaY = touchCurrentY.current - touchStartY.current;
    const threshold = 50; // Minimum swipe distance
    
    if (deltaY < -threshold) {
        // Swipe up - expand
        setIsExpanded(true);
    } else if (deltaY > threshold) {
        // Swipe down - collapse
        setIsExpanded(false);
    }
    
    touchStartY.current = 0;
    touchCurrentY.current = 0;
};
```

### Problem-Analyse

**Warum passiert Pull-to-Refresh?**

1. **Fehlende `preventDefault()` Aufrufe:**
   - Die Touch-Events werden nicht als "verarbeitet" markiert
   - Der Browser interpretiert vertikale Swipe-Gesten als Pull-to-Refresh
   - Besonders wenn der Touch am oberen Rand des Viewports startet

2. **Keine Unterscheidung zwischen Sheet-Scroll und Sheet-Drag:**
   - Wenn der User innerhalb des ausgefahrenen Sheets scrollt, wird das als normale Scroll-Geste behandelt
   - Wenn der User am oberen Rand des Sheets (oder am Handle) swipet, sollte es als Drag-Geste behandelt werden
   - Aktuell werden alle Touches gleich behandelt

3. **Keine Prüfung der Scroll-Position:**
   - Wenn der Scroll-Container des Sheets nicht am oberen Rand ist, sollte ein vertikaler Swipe das Sheet scrollen, nicht das Sheet verschieben
   - Nur wenn der Scroll-Container am oberen Rand ist UND der User nach unten swipet, sollte das Sheet collapsed werden

4. **Body-Scroll wird nicht verhindert:**
   - Während des Draggings sollte der Body-Scroll verhindert werden
   - Aktuell kann der Body-Scroll parallel zum Sheet-Drag aktiv sein

## Root Cause

**Hauptproblem:** Die Touch-Events werden nicht richtig abgefangen und das Standard-Browser-Verhalten (Pull-to-Refresh) wird nicht verhindert. Besonders wenn:
- Der Touch am oberen Rand des Viewports startet
- Der Scroll-Container des Sheets am oberen Rand ist
- Der User nach unten swipet

## Lösung

### Option 1: PreventDefault + Scroll-Position-Prüfung (Empfohlen)

**Änderungen:**

1. **`preventDefault()` in Touch-Handlern:**
   - In `handleTouchStart`: Nur wenn Touch am Handle oder am oberen Rand des Sheets startet
   - In `handleTouchMove`: Nur wenn wir im Dragging-Modus sind

2. **Scroll-Position prüfen:**
   - Prüfen, ob der Scroll-Container am oberen Rand ist (`scrollTop === 0`)
   - Nur dann erlauben wir das Sheet-Drag nach unten
   - Wenn nicht am oberen Rand, erlauben wir normales Scrollen

3. **Body-Scroll während Drag verhindern:**
   - `document.body.style.overflow = 'hidden'` während des Draggings
   - Zurücksetzen in `handleTouchEnd`

4. **Touch-Action CSS Property:**
   - `touch-action: pan-y` auf dem Handle
   - `touch-action: pan-y` auf dem Sheet-Container (nur wenn expanded)

### Option 2: Separate Handle-Bereich für Drag (Alternative)

**Änderungen:**

1. **Nur Handle-Bereich für Drag verwenden:**
   - Touch-Events nur auf dem Handle-Div registrieren
   - Rest des Sheets erlaubt normales Scrollen

2. **Vorteil:** Einfacher, weniger Konflikte
3. **Nachteil:** User muss genau auf dem Handle swipen

## Empfohlene Lösung: Option 1 (Verbessert)

**Implementierung:**

### 1. Touch-Handler mit preventDefault und Scroll-Prüfung

```tsx
const handleTouchStart = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const target = e.target as HTMLElement;
    
    // Prüfe ob Touch am Handle oder am oberen Rand des Sheets startet
    const isHandle = target.closest('.worktime-handle') !== null;
    const isTopOfSheet = sheetRef.current && 
        sheetRef.current.scrollTop === 0 && 
        touchY < (sheetRef.current.getBoundingClientRect().top + 100); // 100px Toleranz
    
    if (isHandle || (isExpanded && isTopOfSheet)) {
        touchStartY.current = touchY;
        isDragging.current = true;
        // Verhindere Pull-to-Refresh
        e.preventDefault();
        // Verhindere Body-Scroll während Drag
        document.body.style.overflow = 'hidden';
    }
};

const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    touchCurrentY.current = e.touches[0].clientY;
    
    // Verhindere Pull-to-Refresh während Drag
    e.preventDefault();
};

const handleTouchEnd = () => {
    if (!isDragging.current) return;
    
    // Body-Scroll wieder erlauben
    document.body.style.overflow = '';
    
    isDragging.current = false;
    
    const deltaY = touchCurrentY.current - touchStartY.current;
    const threshold = 50; // Minimum swipe distance
    
    if (deltaY < -threshold) {
        // Swipe up - expand
        setIsExpanded(true);
    } else if (deltaY > threshold) {
        // Swipe down - collapse
        setIsExpanded(false);
    }
    
    touchStartY.current = 0;
    touchCurrentY.current = 0;
};
```

### 2. CSS touch-action Property

```tsx
{/* Mobile Handle - Lasche zum Hochziehen */}
<div 
    className="w-full flex flex-col items-center sm:hidden touch-none h-[48px] justify-center worktime-handle"
    style={{ touchAction: 'pan-y' }}
>
    {/* ... */}
</div>
```

### 3. Scroll-Container Prüfung

```tsx
{/* Main Content Container */}
<div 
    className="p-4 sm:p-0 pt-0 overflow-y-auto sm:overflow-visible"
    onTouchStart={(e) => {
        // Wenn nicht am oberen Rand, erlaube normales Scrollen
        const container = e.currentTarget;
        if (container.scrollTop > 0) {
            // Normales Scrollen erlauben, kein Sheet-Drag
            return;
        }
    }}
>
    {/* ... */}
</div>
```

### 4. Cleanup bei Unmount

```tsx
useEffect(() => {
    return () => {
        // Stelle sicher, dass Body-Scroll wieder aktiv ist
        document.body.style.overflow = '';
    };
}, []);
```

## Alternative: Vereinfachte Lösung (Option 2)

**Nur Handle-Bereich für Drag:**

```tsx
{/* Mobile Handle - Lasche zum Hochziehen */}
<div 
    className="w-full flex flex-col items-center sm:hidden h-[48px] justify-center worktime-handle"
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    style={{ touchAction: 'pan-y' }}
>
    {/* ... */}
</div>

{/* Main Content Container - normales Scrollen */}
<div className="p-4 sm:p-0 pt-0 overflow-y-auto sm:overflow-visible">
    {/* ... */}
</div>
```

**Vorteil:** Einfacher, weniger Code
**Nachteil:** User muss genau auf dem Handle swipen

## Empfehlung

**Option 1 (Verbessert)** ist besser, weil:
- User kann am oberen Rand des ausgefahrenen Sheets swipen
- Bessere UX, da größerer Touch-Bereich
- Verhindert Pull-to-Refresh zuverlässig
- Erlaubt normales Scrollen, wenn nicht am oberen Rand

## Zusammenfassung

**Problem:**
- Pull-to-Refresh wird ausgelöst, wenn User das ausgefahrene Sheet nach unten swipen will
- Fehlende `preventDefault()` Aufrufe
- Keine Unterscheidung zwischen Sheet-Scroll und Sheet-Drag

**Lösung:**
- `preventDefault()` in Touch-Handlern (nur wenn relevant)
- Scroll-Position prüfen (nur am oberen Rand erlauben Sheet-Drag)
- Body-Scroll während Drag verhindern
- CSS `touch-action` Property verwenden
- Cleanup bei Unmount

**Erwartetes Ergebnis:**
- Pull-to-Refresh wird verhindert
- Sheet-Drag funktioniert am Handle und am oberen Rand
- Normales Scrollen funktioniert, wenn nicht am oberen Rand
- Bessere UX

