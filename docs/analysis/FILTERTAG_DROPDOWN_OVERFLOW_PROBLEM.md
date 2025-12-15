# Filtertag Dropdown Overflow Problem - Detaillierte Analyse

**Datum:** 2025-01-30  
**Status:** 🔴 Problem identifiziert - Root Cause gefunden

---

## 🔍 ROOT CAUSE IDENTIFIZIERT

### Das Problem

**Zeile 919 in `SavedFilterTags.tsx`:**
```tsx
<div ref={containerRef} className="flex items-center gap-1.5 sm:gap-2 mb-3 mt-1 overflow-x-auto overflow-y-hidden">
```

**Zeile 955-958 (Dropdown):**
```tsx
{openGroupDropdowns.has(group.id) && (
  <div 
    ref={(el) => setGroupDropdownRef(group.id, el)}
    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[200px]"
  >
```

### Warum das Dropdown nicht sichtbar ist

**FAKTEN:**
1. Container hat `overflow-x-auto overflow-y-hidden` (Zeile 919)
2. Dropdown ist `absolute` positioniert mit `top-full` (öffnet nach UNTEN)
3. `overflow-y-hidden` schneidet ALLES ab, was vertikal über den Container hinausgeht
4. `z-index` hilft hier NICHT - das Problem ist nicht der z-index, sondern das `overflow-y-hidden`!

**CSS-Regel:**
- Wenn ein Parent-Container `overflow-y-hidden` hat, werden alle `absolute` oder `fixed` positionierten Kinder, die außerhalb des Containers liegen, abgeschnitten
- `z-index` wirkt nur innerhalb des Stacking Context, aber wenn das Element durch `overflow` abgeschnitten wird, ist es einfach nicht sichtbar

### Warum z-index Erhöhung nicht geholfen hat

- `z-[100]` wurde bereits implementiert (Zeile 957)
- Das Problem ist NICHT der z-index
- Das Problem ist `overflow-y-hidden` auf dem Parent-Container
- Selbst mit `z-[9999]` würde das Dropdown nicht sichtbar sein, weil es durch `overflow-y-hidden` abgeschnitten wird

---

## 📍 CODE-STELLEN

### Problem-Stelle 1: Container mit overflow-y-hidden

**Datei:** `frontend/src/components/SavedFilterTags.tsx`  
**Zeile:** 919

```tsx
<div ref={containerRef} className="flex items-center gap-1.5 sm:gap-2 mb-3 mt-1 overflow-x-auto overflow-y-hidden">
```

**Problem:**
- `overflow-y-hidden` schneidet Dropdowns ab, die nach unten öffnen
- `overflow-x-auto` ist notwendig für horizontales Scrollen der Tags
- `overflow-y-hidden` verhindert vertikales Scrollen, aber schneidet auch Dropdowns ab

### Problem-Stelle 2: Dropdown mit absolute Position

**Datei:** `frontend/src/components/SavedFilterTags.tsx`  
**Zeile:** 955-958

```tsx
{openGroupDropdowns.has(group.id) && (
  <div 
    ref={(el) => setGroupDropdownRef(group.id, el)}
    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[200px]"
  >
```

**Problem:**
- `absolute` Position relativ zum nächsten `relative` Parent
- `top-full` öffnet nach unten
- Wird durch `overflow-y-hidden` auf Parent abgeschnitten

### Problem-Stelle 3: Parent-Container in Worktracker

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 2401

```tsx
<div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
  <SavedFilterTags ... />
</div>
```

**Status:** Kein overflow hier - nicht das Problem

### Problem-Stelle 4: Layout main Container

**Datei:** `frontend/src/components/Layout.tsx`  
**Zeile:** 57

```tsx
<main className={`flex-1 ${isMobile ? 'overflow-y-container' : 'overflow-y-auto'} ${
  isMobile ? 'px-4 pt-2 pb-4' : 'px-5 pt-3 pb-5'
} transition-all duration-300 ease-in-out sidepane-content-main`}>
```

**Status:** Hat `overflow-y-container` oder `overflow-y-auto` - könnte zusätzliches Problem sein, aber nicht die Hauptursache

---

## ✅ LÖSUNGSOPTIONEN

### Option 1: Portal verwenden (BESTE LÖSUNG)

**Vorgehen:**
- Rendere Dropdown via `ReactDOM.createPortal` außerhalb des `overflow-y-hidden` Containers
- Berechne Position des Buttons und rendere Dropdown an dieser Position
- Dropdown wird direkt unter dem `body` oder einem Container ohne `overflow` gerendert

**Vorteile:**
- Funktioniert immer, unabhängig von Parent-Overflow
- Keine Änderung an Container-Struktur nötig
- Standard-Lösung für dieses Problem

**Nachteile:**
- Position-Berechnung komplexer (getBoundingClientRect)
- Eventuell Layout-Shifts wenn Position neu berechnet wird

**Implementierung:**
```tsx
import { createPortal } from 'react-dom';

// In Komponente:
const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
const buttonRef = useRef<HTMLButtonElement>(null);

const handleToggleDropdown = (groupId: number) => {
  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
  }
  toggleGroupDropdown(groupId);
};

// Render:
{openGroupDropdowns.has(group.id) && dropdownPosition && createPortal(
  <div 
    style={{
      position: 'fixed',
      top: dropdownPosition.top,
      left: dropdownPosition.left,
      zIndex: 100
    }}
    className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]"
  >
    {/* Dropdown content */}
  </div>,
  document.body
)}
```

### Option 2: Dropdown nach oben öffnen (EINFACHSTE LÖSUNG)

**Vorgehen:**
- Prüfe ob genug Platz nach unten ist
- Wenn nicht, öffne Dropdown nach oben (`bottom-full` statt `top-full`)

**Vorteile:**
- Einfach zu implementieren
- Keine strukturellen Änderungen
- Funktioniert in den meisten Fällen

**Nachteile:**
- Funktioniert nicht wenn auch nach oben kein Platz ist
- Dropdown könnte immer noch abgeschnitten werden

**Implementierung:**
```tsx
const [openUpward, setOpenUpward] = useState(false);
const buttonRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  if (openGroupDropdowns.has(group.id) && buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUpward(spaceBelow < 200 && spaceAbove > spaceBelow);
  }
}, [openGroupDropdowns, group.id]);

// Render:
<div 
  className={`absolute ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 ...`}
>
```

### Option 3: Container-Struktur ändern (KOMPLEX)

**Vorgehen:**
- Dropdown-Container außerhalb des `overflow-y-hidden` Containers rendern
- Button bleibt im Container, Dropdown wird außerhalb gerendert

**Vorteile:**
- Kein Portal nötig
- Einfache Positionierung

**Nachteile:**
- Strukturelle Änderungen nötig
- Komplexer, da Container-Struktur geändert werden muss

---

## 🎯 EMPFEHLUNG

**Option 1 (Portal)** ist die beste Lösung, weil:
1. Standard-Lösung für dieses Problem
2. Funktioniert immer, unabhängig von Parent-Overflow
3. Keine Änderung an Container-Struktur nötig
4. Wird in vielen UI-Libraries verwendet (z.B. Radix UI, Headless UI)

**Option 2 (Nach oben öffnen)** als Fallback, wenn Portal zu komplex ist.

---

## 📊 ZUSAMMENFASSUNG

**Root Cause:**
- `overflow-y-hidden` auf Container (Zeile 919) schneidet Dropdowns ab
- `z-index` hilft nicht, weil Problem nicht z-index ist, sondern overflow

**Betroffene Code-Stellen:**
1. Zeile 919: Container mit `overflow-y-hidden`
2. Zeile 955-958: Dropdown mit `absolute top-full`

**Lösung:**
- Portal verwenden (Option 1) ODER
- Dropdown nach oben öffnen wenn kein Platz nach unten (Option 2)

