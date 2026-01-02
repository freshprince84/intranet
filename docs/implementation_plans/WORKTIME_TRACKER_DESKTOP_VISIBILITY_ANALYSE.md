# WorktimeTracker Desktop Sichtbarkeit - Analyse und Planung

## Problemstellung

Der WorktimeTracker ist auf Bildschirmen größer als Mobile (Desktop/Tablet) nicht mehr sichtbar. Dies ist das umgekehrte Problem wie vorher (vorher war er auf Mobile nicht sichtbar).

## Aktuelle Implementierung

### WorktimeTracker.tsx (Zeilen 454-468)

**Aktueller className:**
```tsx
className={`
    bg-white dark:bg-gray-800 
    sm:rounded-lg sm:border sm:border-gray-300 sm:dark:border-gray-700 sm:p-6 sm:mb-6 
    fixed left-0 right-0 rounded-t-xl border-t border-gray-300 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
    transition-all duration-300 ease-in-out z-40
    sm:static sm:shadow-none sm:z-auto
    ${isExpanded ? 'bottom-[60px] max-h-[70vh]' : 'bottom-[60px] max-h-[48px] overflow-hidden'}
`}
```

### Problem-Analyse

**Auf Mobile (funktioniert):**
- `fixed left-0 right-0` - Element ist fixiert
- `bottom-[60px]` - Position 60px über dem Bottom
- `max-h-[48px]` oder `max-h-[70vh]` - Höhenbegrenzung
- `overflow-hidden` - Versteckt Inhalt wenn collapsed

**Auf Desktop (funktioniert NICHT):**
- `sm:static` - Ändert `fixed` zu `static` (gut)
- `sm:shadow-none` - Entfernt Shadow (gut)
- `sm:z-auto` - Setzt z-index auf auto (gut)
- **ABER:** Die Template-String-Bedingung `${isExpanded ? 'bottom-[60px] max-h-[70vh]' : 'bottom-[60px] max-h-[48px] overflow-hidden'}` wird **IMMER** angewendet, auch auf Desktop

**Das bedeutet auf Desktop:**
- `static` Position (gut)
- **ABER:** `bottom-[60px]` bleibt aktiv (schlecht - verschiebt Element nach unten, außerhalb des Viewports)
- **ABER:** `max-h-[48px]` oder `max-h-[70vh]` bleibt aktiv (schlecht - begrenzt Höhe unnötig)
- **ABER:** `overflow-hidden` bleibt aktiv wenn nicht expanded (schlecht - versteckt Inhalt)

### Worktracker.tsx Rendering (Zeilen 3614-3623)

**Aktuelles Rendering:**
```tsx
{/* Mobile: Zeiterfassung fixiert über dem Footermenü */}
<div className="worktracker-worktime-box-mobile block sm:hidden">
    <WorktimeTracker />
</div>

{/* Desktop: Zeiterfassung normaler Flow mit order Property */}
<div className="worktracker-worktime-box-desktop hidden sm:block mb-8">
    <WorktimeTracker />
</div>
```

**Problem:** Beide Instanzen verwenden die gleiche Komponente mit den gleichen problematischen Klassen.

## Root Cause

Die Mobile-spezifischen Klassen (`bottom-[60px]`, `max-h-*`, `overflow-hidden`) werden auf **allen** Bildschirmgrößen angewendet, weil sie nicht mit `sm:` Präfix versehen sind. Auf Desktop wird zwar `fixed` zu `static` geändert, aber die Positionierungs- und Höhenklassen bleiben aktiv und verursachen das Problem.

## Lösung

### Option 1: Responsive Klassen für Mobile-only Properties (Empfohlen)

**Änderung in WorktimeTracker.tsx:**

```tsx
className={`
    bg-white dark:bg-gray-800 
    sm:rounded-lg sm:border sm:border-gray-300 sm:dark:border-gray-700 sm:p-6 sm:mb-6 
    fixed left-0 right-0 rounded-t-xl border-t border-gray-300 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
    transition-all duration-300 ease-in-out z-40
    sm:static sm:shadow-none sm:z-auto
    ${isExpanded 
        ? 'bottom-[60px] max-h-[70vh] sm:bottom-auto sm:max-h-none' 
        : 'bottom-[60px] max-h-[48px] overflow-hidden sm:bottom-auto sm:max-h-none sm:overflow-visible'
    }
`}
```

**Erklärung:**
- `sm:bottom-auto` - Entfernt `bottom-[60px]` auf Desktop
- `sm:max-h-none` - Entfernt Höhenbegrenzung auf Desktop
- `sm:overflow-visible` - Entfernt `overflow-hidden` auf Desktop

### Option 2: Separate Mobile/Desktop Rendering (Alternative)

**Änderung in WorktimeTracker.tsx:**

```tsx
// Mobile Bottom Sheet State
const [isExpanded, setIsExpanded] = useState(false);
const isMobile = window.innerWidth < 640; // Tailwind's sm breakpoint

// ... rest of component ...

return (
    <>
        {/* Mobile Version */}
        <div className={`block sm:hidden ${/* mobile classes */}`}>
            {/* Mobile content */}
        </div>
        
        {/* Desktop Version */}
        <div className={`hidden sm:block ${/* desktop classes */}`}>
            {/* Desktop content */}
        </div>
    </>
);
```

**Nachteil:** Dupliziert Code, nicht empfohlen.

## Empfohlene Lösung: Option 1

**Vorteile:**
- Minimaler Code-Change
- Keine Code-Duplikation
- Nutzt Tailwind's responsive System korrekt
- Einfach zu warten

**Implementierung:**

1. **WorktimeTracker.tsx Zeile 463 ändern:**
   ```tsx
   ${isExpanded 
       ? 'bottom-[60px] max-h-[70vh] sm:bottom-auto sm:max-h-none' 
       : 'bottom-[60px] max-h-[48px] overflow-hidden sm:bottom-auto sm:max-h-none sm:overflow-visible'
   }
   ```

2. **Zusätzlich:** Mobile Handle sollte nur auf Mobile sichtbar sein (bereits implementiert mit `sm:hidden`)

3. **Zusätzlich:** Touch-Handler sollten nur auf Mobile aktiv sein:
   ```tsx
   onTouchStart={isMobile ? handleTouchStart : undefined}
   onTouchMove={isMobile ? handleTouchMove : undefined}
   onTouchEnd={isMobile ? handleTouchEnd : undefined}
   ```
   Oder einfach die Handler auf Mobile beschränken (bereits durch `sm:hidden` auf dem Handle-Div).

## Zusammenfassung

**Problem:**
- Mobile-spezifische Klassen (`bottom-[60px]`, `max-h-*`, `overflow-hidden`) werden auf Desktop angewendet
- Auf Desktop wird `fixed` zu `static` geändert, aber Position/Höhe bleiben problematisch

**Lösung:**
- Responsive Klassen hinzufügen: `sm:bottom-auto sm:max-h-none sm:overflow-visible`
- Diese überschreiben die Mobile-Klassen auf Desktop

**Erwartetes Ergebnis:**
- **Mobile:** Fixed Bottom Sheet mit korrekter Position und Höhenbegrenzung
- **Desktop:** Static Position, normale Höhe, kein Overflow-Hidden, vollständig sichtbar

