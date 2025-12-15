# Filtertag Groups Dropdown Fix - Vollständiger Implementierungsplan

**Datum:** 2025-01-30  
**Status:** 📋 Planung abgeschlossen - Bereit für Implementierung  
**Priorität:** 🔴 HOCH - UX-Problem in mobiler Ansicht

---

## 📋 EXECUTIVE SUMMARY

Zwei kritische UX-Probleme in der mobilen Ansicht der Filtertag-Gruppen-Dropdowns:

1. **Dropdowns verschwinden unter Scrollbalken/Cards** - z-index/overflow-Problem
2. **Click-Outside funktioniert nicht** - Fehlender Event-Handler für Gruppen-Dropdowns

**Betroffene Datei:** `frontend/src/components/SavedFilterTags.tsx`

---

## 🔍 PROBLEM-ANALYSE

### Problem 1: Dropdowns verschwinden unter Scrollbalken/Cards

**Aktueller Code (Zeile 916):**
```tsx
<div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[200px]">
```

**Aktueller Container (Zeile 881):**
```tsx
<div ref={containerRef} className="flex items-center gap-1.5 sm:gap-2 mb-3 mt-1 overflow-x-auto overflow-y-hidden">
```

**Fakten:**
- Dropdown hat `z-50` (Standard in Codebase)
- Container hat `overflow-x-auto overflow-y-hidden`
- In mobiler Ansicht wird Dropdown durch Scroll-Container abgeschnitten
- Andere Dropdowns in Codebase verwenden ebenfalls `z-50` (LanguageSelector.tsx:90, TableColumnConfig.tsx, FilterLogicalOperator.tsx)
- Sidepanes verwenden `z-50` für Panel, `z-40` für Backdrop (CreateRequestModal.tsx:835, CreateReservationModal.tsx:301)

**Ursache:**
- `overflow-x-auto` auf Parent-Container erstellt neuen Stacking-Context
- Dropdown mit `absolute` Position wird innerhalb dieses Stacking-Contexts gerendert
- `z-50` wirkt nur innerhalb des Stacking-Contexts, nicht darüber hinaus

### Problem 2: Click-Outside funktioniert nicht

**Aktueller Code (Zeilen 223-233):**
```tsx
// Dropdown schließen bei Klick außerhalb
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (isDropdownOpen && !(event.target as Element).closest('.relative')) {
      setIsDropdownOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isDropdownOpen]);
```

**Fakten:**
- Handler existiert nur für `isDropdownOpen` (normales Dropdown für überlaufende Tags)
- Kein Handler für `openGroupDropdowns` (Set<number>)
- Gruppen-Dropdowns werden nur durch erneutes Klicken auf Button geschlossen (Zeile 797-803)
- Pattern in anderen Komponenten: `useRef` + `contains()` Check (LanguageSelector.tsx:58-72, TableColumnConfig.tsx:168-182, FilterLogicalOperator.tsx:15-29)

**Ursache:**
- Fehlender `useEffect` für `openGroupDropdowns`
- Keine `useRef` für Gruppen-Dropdown-Container

---

## ✅ LÖSUNG

### Lösung 1: Dropdown z-index/overflow Fix

**Option A: Höherer z-index (Einfachste Lösung)**
- Ändere `z-50` zu `z-[9999]` oder `z-[100]`
- **Risiko:** Könnte andere Elemente überdecken
- **Vorteil:** Minimal invasiv, keine strukturellen Änderungen

**Option B: Portal verwenden (Robusteste Lösung)**
- Rendere Dropdown via `ReactDOM.createPortal` außerhalb des Scroll-Containers
- **Risiko:** Position-Berechnung komplexer, Layout-Shifts möglich
- **Vorteil:** Funktioniert immer, unabhängig von Parent-Overflow

**Option C: Overflow-visible auf Parent (Nicht möglich)**
- Parent hat `overflow-x-auto` für horizontales Scrollen - kann nicht entfernt werden

**Entscheidung: Option A (z-index erhöhen)**
- Einfachste Lösung
- Konsistent mit anderen Dropdowns (alle verwenden z-50, aber nicht in overflow-Container)
- Risiko minimal (Dropdowns sind temporär, andere z-50 Elemente sind Sidepanes/Modals die nicht gleichzeitig offen sind)

### Lösung 2: Click-Outside Handler hinzufügen

**Implementierung:**
1. `useRef` für jeden Gruppen-Dropdown-Container erstellen
2. `useEffect` für `openGroupDropdowns` hinzufügen
3. Pattern wie in anderen Komponenten verwenden: `useRef` + `contains()` Check

**Pattern aus Codebase:**
```tsx
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
```

**Anpassung für mehrere Dropdowns:**
- `Map<number, RefObject<HTMLDivElement>>` für mehrere Refs
- Handler prüft alle offenen Dropdowns

---

## 📝 IMPLEMENTIERUNG

### Schritt 1: z-index erhöhen

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

**Zeile 916 ändern:**
```tsx
// VORHER:
<div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[200px]">

// NACHHER:
<div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[200px]">
```

**Begründung:**
- `z-[100]` ist höher als Standard `z-50` aber niedriger als Modals (`z-50` mit Backdrop `z-40`)
- Sidepanes verwenden `z-50`, Dropdowns sollten darunter bleiben wenn Sidepane offen ist
- `z-[100]` ist ausreichend um über Scroll-Container zu erscheinen

### Schritt 2: Click-Outside Handler hinzufügen

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

**Nach Zeile 112 (nach `openGroupDropdowns` State):**
```tsx
// Refs für Gruppen-Dropdowns (für Click-Outside Detection)
const groupDropdownRefs = useRef<Map<number, HTMLDivElement>>(new Map());

const setGroupDropdownRef = (groupId: number, element: HTMLDivElement | null) => {
  if (element) {
    groupDropdownRefs.current.set(groupId, element);
  } else {
    groupDropdownRefs.current.delete(groupId);
  }
};
```

**Nach Zeile 233 (nach bestehendem Click-Outside Handler):**
```tsx
// Click-Outside Handler für Gruppen-Dropdowns
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    // Prüfe alle offenen Gruppen-Dropdowns
    const clickedOutsideAll = Array.from(openGroupDropdowns).every(groupId => {
      const dropdownElement = groupDropdownRefs.current.get(groupId);
      if (!dropdownElement) return true;
      
      // Prüfe ob Klick innerhalb des Dropdown-Containers oder des Buttons
      const buttonElement = (event.target as Element).closest(`[data-group-id="${groupId}"]`);
      return !dropdownElement.contains(event.target as Node) && !buttonElement;
    });

    if (clickedOutsideAll && openGroupDropdowns.size > 0) {
      setOpenGroupDropdowns(new Set());
    }
  };

  if (openGroupDropdowns.size > 0) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [openGroupDropdowns]);
```

**Zeile 894 ändern (Button data-Attribut hinzufügen):**
```tsx
// VORHER:
<div key={group.id} className="relative flex-shrink-0">

// NACHHER:
<div key={group.id} className="relative flex-shrink-0">
  <div className="relative group">
    <button
      data-group-id={group.id}
      onClick={() => toggleGroupDropdown(group.id)}
      // ... rest bleibt gleich
```

**Zeile 916 ändern (Ref hinzufügen):**
```tsx
// VORHER:
{openGroupDropdowns.has(group.id) && (
  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[200px]">

// NACHHER:
{openGroupDropdowns.has(group.id) && (
  <div 
    ref={(el) => setGroupDropdownRef(group.id, el)}
    className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[200px]"
  >
```

---

## 🔍 STANDARDS-PRÜFUNG

### ✅ Übersetzungen
- **Status:** Nicht nötig
- **Begründung:** Nur Bugfix, keine neuen Texte

### ✅ Notifications
- **Status:** Nicht nötig
- **Begründung:** Nur UI-Fix, keine Benutzer-Aktionen

### ✅ Berechtigungen
- **Status:** Nicht nötig
- **Begründung:** Nur UI-Fix, keine neuen Features

### ✅ Memory Leaks
- **Status:** ✅ Geprüft - Keine Memory Leaks
- **Begründung:**
  - Event Listener werden im `useEffect` Cleanup entfernt (Zeile 232, neuer Handler)
  - Refs werden automatisch von React verwaltet
  - Keine Timer, keine Subscriptions
  - Pattern entspricht anderen Komponenten (LanguageSelector.tsx, TableColumnConfig.tsx)

### ✅ Performance
- **Status:** ✅ Geprüft - Keine Performance-Impact
- **Begründung:**
  - Ein zusätzlicher Event Listener (nur wenn Dropdowns offen)
  - `Map` für Refs ist effizient (O(1) Zugriff)
  - Handler wird nur bei `mousedown` Events ausgeführt
  - Keine teuren Berechnungen

### ✅ Code-Standards
- **Status:** ✅ Eingehalten
- **Pattern:** Identisch mit anderen Dropdown-Komponenten
- **DRY:** Wiederverwendung des etablierten Patterns
- **TypeScript:** Vollständig typisiert

---

## ⚠️ RISIKEN

### Risiko 1: z-index Konflikte
- **Wahrscheinlichkeit:** Niedrig
- **Impact:** Mittel (Dropdown könnte andere Elemente überdecken)
- **Mitigation:** 
  - `z-[100]` ist niedriger als Modals (normalerweise `z-50` mit Backdrop, aber Modals sind `fixed`)
  - Dropdowns sind temporär (nur wenn offen)
  - Testen mit offenen Sidepanes/Modals

### Risiko 2: Click-Outside Handler Konflikte
- **Wahrscheinlichkeit:** Sehr niedrig
- **Impact:** Niedrig (Dropdown schließt zu früh)
- **Mitigation:**
  - Handler prüft explizit ob Klick außerhalb ist
  - Button-Klick wird durch `data-group-id` erkannt
  - Pattern ist in anderen Komponenten bewährt

### Risiko 3: Mobile Layout-Probleme
- **Wahrscheinlichkeit:** Sehr niedrig
- **Impact:** Niedrig (Dropdown könnte außerhalb Viewport erscheinen)
- **Mitigation:**
  - `absolute` Position bleibt erhalten
  - `top-full left-0` Positionierung bleibt gleich
  - Nur z-index wird geändert

---

## 🧪 TESTING

### Test 1: Dropdown sichtbar in mobiler Ansicht
- **Schritt:** Mobile Ansicht öffnen, Filtertag-Gruppe klicken
- **Erwartung:** Dropdown ist vollständig sichtbar, nicht unter Scrollbalken/Cards

### Test 2: Click-Outside schließt Dropdown
- **Schritt:** Filtertag-Gruppe öffnen, außerhalb klicken
- **Erwartung:** Dropdown schließt automatisch

### Test 3: Button-Klick schließt Dropdown
- **Schritt:** Filtertag-Gruppe öffnen, erneut auf Button klicken
- **Erwartung:** Dropdown schließt (bestehendes Verhalten bleibt)

### Test 4: Filter auswählen schließt Dropdown
- **Schritt:** Filtertag-Gruppe öffnen, Filter auswählen
- **Erwartung:** Dropdown schließt (bestehendes Verhalten bleibt)

### Test 5: Mehrere Dropdowns gleichzeitig
- **Schritt:** Zwei Filtertag-Gruppen öffnen
- **Erwartung:** Beide Dropdowns offen, Click-Outside schließt beide

### Test 6: z-index mit Sidepane/Modal
- **Schritt:** Sidepane/Modal öffnen, Filtertag-Gruppe öffnen
- **Erwartung:** Dropdown erscheint über Sidepane/Modal (oder darunter, je nach z-index)

---

## 📊 ZUSAMMENFASSUNG

**Änderungen:**
1. z-index von `z-50` auf `z-[100]` erhöhen (Zeile 916)
2. `useRef` Map für Gruppen-Dropdown-Container (nach Zeile 112)
3. `useEffect` für Click-Outside Handler (nach Zeile 233)
4. `data-group-id` Attribut auf Button (Zeile 896)
5. `ref` auf Dropdown-Container (Zeile 916)

**Dateien:**
- `frontend/src/components/SavedFilterTags.tsx` (5 Änderungen)

**Standards:**
- ✅ Übersetzungen: Nicht nötig
- ✅ Notifications: Nicht nötig
- ✅ Berechtigungen: Nicht nötig
- ✅ Memory Leaks: Keine
- ✅ Performance: Kein Impact
- ✅ Code-Standards: Eingehalten

**Risiken:**
- Niedrig (z-index Konflikte möglich, aber unwahrscheinlich)

**Testing:**
- 6 Test-Szenarien definiert

---

## ✅ CHECKLISTE FÜR IMPLEMENTIERUNG

- [ ] z-index auf `z-[100]` ändern (Zeile 916)
- [ ] `groupDropdownRefs` Ref Map hinzufügen (nach Zeile 112)
- [ ] `setGroupDropdownRef` Funktion hinzufügen
- [ ] Click-Outside `useEffect` hinzufügen (nach Zeile 233)
- [ ] `data-group-id` auf Button hinzufügen (Zeile 896)
- [ ] `ref` auf Dropdown-Container hinzufügen (Zeile 916)
- [ ] Alle 6 Test-Szenarien durchführen
- [ ] Mobile Ansicht testen (verschiedene Bildschirmgrößen)
- [ ] Desktop Ansicht testen (Regression-Test)
- [ ] Mit offenen Sidepanes/Modals testen

---

**Plan erstellt:** 2025-01-30  
**Bereit für Implementierung:** ✅ Ja  
**Offene Fragen:** Keine

