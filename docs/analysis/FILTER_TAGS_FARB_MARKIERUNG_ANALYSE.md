# Analyse: Filter-Tags farbliche Markierung

**Datum:** 31.10.2025  
**Status:** 🔴 Problem identifiziert  
**Komponente:** `SavedFilterTags.tsx`

## Problembeschreibung

Die Filter-Tags werden **nicht farblich markiert**, obwohl der Code eine blaue Markierung für aktive Filter vorsieht. Alle Filter-Tags werden gleich dargestellt (grau), unabhängig davon, welcher Filter aktiv ist.

## Browser-Tests durchgeführt

### Test 1: Dashboard - Requests-Seite
- **URL:** `http://localhost:3000/dashboard`
- **Filter gefunden:** 
  - "Aktuell" 
  - "Archiv"
- **Ergebnis:**
  - Beide Filter haben identische graue Styles: `bg-gray-100`, `text-gray-800`, `border-gray-300`
  - Kein Filter wird als "aktiv" markiert (keine blauen Farben)
  - JavaScript-Evaluierung bestätigt: `isBlue: false` für beide Filter

### Test 2: Worktracker-Seite
- **URL:** `http://localhost:3000/worktracker`
- **Filter gefunden:**
  - "Aktuell"
  - "Ich: offen"
  - "Rolle: Admin"
  - "User: Admin"
  - "Archiv"
- **Ergebnis:**
  - Alle Filter haben identische graue Styles
  - Keine visuelle Hervorhebung des aktiven Filters

### Test 3: Consultations-Seite (Controlled Mode - funktioniert ✅)
- **URL:** `http://localhost:3000/consultations`
- **Filter gefunden:**
  - "Heute" ✅ **BLAU MARKIERT** (aktiv)
  - "Woche" (grau, nicht aktiv)
  - "Patrick Ammann" (grau, nicht aktiv)
  - "Nicht abgerechnet" (grau, nicht aktiv)
  - "Archiv" (grau, nicht aktiv)
- **Ergebnis:**
  - **"Heute"-Filter ist korrekt blau markiert!**
  - JavaScript-Evaluierung bestätigt:
    - `backgroundColor: "rgb(219, 234, 254)"` (Blau: `bg-blue-100`)
    - `color: "rgb(30, 64, 175)"` (Dunkelblau: `text-blue-800`)
    - `borderColor: "rgb(147, 197, 253)"` (Blau: `border-blue-300`)
    - `isBlue: true` ✅
  - **Ursache:** Diese Komponente verwendet den **Controlled Mode** (mit `onFilterChange`, `selectedFilterId`, `activeFilterName`)

## Code-Analyse

### Problemquelle: `SavedFilterTags.tsx`

**Datei:** `frontend/src/components/SavedFilterTags.tsx`  
**Zeilen:** 416-425

```typescript
// Bestimme welcher Filter aktiv ist
const getActiveFilterId = () => {
  if (onFilterChange) {
    // Controlled component - verwende selectedFilterId prop
    return selectedFilterId;
  } else {
    // Uncontrolled - fallback auf internen State (legacy)
    return null; // In legacy mode nicht visuell hervorheben ⚠️
  }
};
```

### Kernproblem

1. **"Uncontrolled Component" Mode:**
   - Wenn `SavedFilterTags` OHNE `onFilterChange` Prop verwendet wird, wird es als "uncontrolled component" behandelt
   - In diesem Fall gibt `getActiveFilterId()` **immer `null` zurück**
   - Der Kommentar sagt explizit: "In legacy mode nicht visuell hervorheben"

2. **Aktuelle Verwendungen (alle "uncontrolled"):**
   - `Requests.tsx` (Zeile 875-880): Keine `onFilterChange`, `selectedFilterId`, oder `activeFilterName` Props
   - `Worktracker.tsx` (Zeilen 865-870, 1156-1161): Keine `onFilterChange`, `selectedFilterId`, oder `activeFilterName` Props
   - Andere Komponenten wahrscheinlich ebenfalls

3. **Conditional Rendering für aktive Filter:**
   - Zeile 450-451: Prüft `getActiveFilterId() === filter.id`
   - Wenn `getActiveFilterId()` immer `null` zurückgibt, ist die Bedingung nie `true`
   - Deshalb wird immer der "inaktive" Style angewendet (Zeile 452)

### Code-Abschnitte

**Zeile 447-453:** Conditional Styling
```typescript
className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors flex-shrink-0 ${
  filter.isPlaceholder
    ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 animate-pulse cursor-default'
    : getActiveFilterId() === filter.id  // ⚠️ Diese Bedingung ist nie true im uncontrolled mode
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'  // ✅ Blauer Style (wird nie angewendet)
      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'  // ❌ Grauer Style (wird immer angewendet)
} ${!filter.isPlaceholder && isStandardFilter(filter.name) ? 'font-bold' : ''}`}
```

## Vergleich: Controlled vs. Uncontrolled

### Controlled Component (funktioniert)
- **Beispiel:** `ConsultationList.tsx` (Zeile 987-994)
- **Props:** `onFilterChange`, `selectedFilterId`, `activeFilterName`
- **Verhalten:** Aktiver Filter wird korrekt mit blauen Farben markiert

### Uncontrolled Component (funktioniert nicht)
- **Beispiele:** `Requests.tsx`, `Worktracker.tsx`
- **Props:** Nur `onSelectFilter`, `onReset`, `defaultFilterName`
- **Verhalten:** KEINE visuelle Hervorhebung des aktiven Filters

## Browser-Evaluierungsergebnisse

### Dashboard Requests Filter-Tags:
```json
[
  {
    "text": "Aktuell",
    "classes": "... bg-gray-100 dark:bg-gray-700 text-gray-800 ...",
    "backgroundColor": "rgb(243, 244, 246)",  // Grau
    "color": "rgb(31, 41, 55)",  // Dunkelgrau
    "borderColor": "rgb(209, 213, 219)",  // Grau
    "isBlue": false
  },
  {
    "text": "Archiv",
    "classes": "... bg-gray-100 dark:bg-gray-700 text-gray-800 ...",
    "backgroundColor": "rgb(243, 244, 246)",  // Grau
    "color": "rgb(31, 41, 55)",  // Dunkelgrau
    "borderColor": "rgb(209, 213, 219)",  // Grau
    "isBlue": false
  }
]
```

## Design-Standard

Laut `DESIGN_STANDARDS.md`:
- **Primärfarbe Blau:** `#3B82F6` (Buttons, Links, Hervorhebungen)
- Aktive Filter sollten mit blauen Farben markiert werden
- Standard-Filter haben `font-bold`

## Fazit

### Hauptproblem
Die Komponente `SavedFilterTags` hat zwei Modi:
1. **Controlled Mode:** ✅ **Funktioniert korrekt mit visueller Markierung** (siehe Consultations-Seite)
2. **Uncontrolled Mode:** ❌ Markiert keine Filter als aktiv (gibt `null` zurück)

### Bestätigung durch Browser-Tests
- ✅ **ConsultationList.tsx (Controlled Mode):** Funktioniert perfekt - "Heute"-Filter ist blau markiert
- ❌ **Requests.tsx (Uncontrolled Mode):** Funktioniert NICHT - alle Filter grau
- ❌ **Worktracker.tsx (Uncontrolled Mode):** Funktioniert NICHT - alle Filter grau

### Lösung erforderlich
1. **Option A:** Alle Komponenten auf "Controlled Mode" umstellen (benötigt State-Management)
2. **Option B:** `getActiveFilterId()` auch im "Uncontrolled Mode" implementieren (z.B. durch Tracking des zuletzt angeklickten Filters)
3. **Option C:** Standard-Filter (`defaultFilterName`) automatisch als aktiv markieren, wenn kein anderer Filter aktiv ist

### Betroffene Komponenten
- ✅ `ConsultationList.tsx` - Funktioniert (Controlled Mode)
- ❌ `Requests.tsx` - Funktioniert NICHT (Uncontrolled Mode)
- ❌ `Worktracker.tsx` - Funktioniert NICHT (Uncontrolled Mode)
- ❓ Weitere Komponenten müssen geprüft werden

## Empfehlung

**Option B** ist wahrscheinlich die beste Lösung:
- Minimal-invasive Änderung
- Funktioniert mit bestehendem Code (keine Breaking Changes)
- Tracking des aktiven Filters über internen State im "Uncontrolled Mode"

## Weitere Untersuchungen erforderlich

1. Prüfen aller anderen Verwendungen von `SavedFilterTags`
2. Bestimmen, welcher Filter standardmäßig aktiv sein sollte
3. Prüfen, ob es einen Default-Filter gibt, der automatisch angewendet wird

