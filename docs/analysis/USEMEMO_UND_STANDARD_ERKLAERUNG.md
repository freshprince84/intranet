# useMemo und Standard-Erklärung

## Datum: 2025-01-30

---

## 1. WAS IST useMemo?

### 1.1 Definition

`useMemo` ist ein React Hook, der **berechnete Werte zwischenspeichert** (memoization).

**Syntax:**
```typescript
const memoizedValue = useMemo(() => {
  // Berechnung
  return berechneterWert;
}, [dependency1, dependency2]); // Dependency-Array
```

### 1.2 Wie funktioniert useMemo?

1. **Erste Berechnung:** Bei erstem Render wird die Funktion ausgeführt und das Ergebnis gespeichert
2. **Wiederverwendung:** Bei weiteren Renders wird das gespeicherte Ergebnis wiederverwendet
3. **Neuberechnung:** Nur wenn sich eine Dependency im Array ändert, wird die Funktion erneut ausgeführt

**Beispiel:**
```typescript
// OHNE useMemo (wird bei jedem Render neu berechnet):
const sortConfig = settings.sortConfig || { key: 'dueDate', direction: 'asc' };

// MIT useMemo (wird nur neu berechnet wenn settings.sortConfig sich ändert):
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings.sortConfig]);
```

### 1.3 Warum useMemo verwenden?

**Problem ohne useMemo:**
- Bei jedem Render wird ein **neues Objekt** erstellt
- Neue Objekte haben **neue Referenzen** (auch wenn Werte gleich sind)
- Andere `useMemo`/`useCallback` mit diesem Objekt als Dependency werden **unnötig neu berechnet**
- **Performance-Problem:** Kaskadeneffekt von Neuberechnungen

**Lösung mit useMemo:**
- Objekt wird nur neu erstellt, wenn sich die Dependency tatsächlich ändert
- **Stabile Referenz** zwischen Renders (wenn Dependency unverändert)
- Andere `useMemo`/`useCallback` werden **nicht unnötig neu berechnet**
- **Performance-Verbesserung:** Weniger Neuberechnungen

### 1.4 Wichtige Regel: Dependency-Array

**❌ FALSCH:**
```typescript
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings]); // ❌ GANZES Objekt als Dependency
```

**Problem:**
- `settings` ist ein Objekt, das sich bei **jeder Änderung** ändert (neue Referenz)
- Auch wenn nur `settings.columnOrder` sich ändert (nicht `settings.sortConfig`), wird `sortConfig` neu berechnet
- **Unnötige Neuberechnungen!**

**✅ RICHTIG:**
```typescript
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings.sortConfig]); // ✅ NUR die spezifische Property
```

**Vorteil:**
- `sortConfig` wird nur neu berechnet, wenn `settings.sortConfig` sich tatsächlich ändert
- Änderungen an anderen `settings`-Properties (z.B. `columnOrder`) lösen keine Neuberechnung aus
- **Optimale Performance!**

---

## 2. WARUM BESTEHEN DIE UNTERSCHIEDE?

### 2.1 Unterschiede in useMemo Dependencies

| Komponente | Dependency | Status |
|------------|------------|--------|
| **Requests** | `[settings.sortConfig]` | ✅ **KORREKT** |
| **Reservations** | `[reservationsSettings.sortConfig]` | ✅ **KORREKT** |
| **To-Do's (vorher)** | `[tasksSettings]` | ❌ **FALSCH** |
| **To-Do's (jetzt)** | `[tasksSettings.sortConfig]` | ✅ **KORREKT** |

**Warum der Unterschied?**

1. **Requests:** Wurde früher implementiert oder unabhängig entwickelt → **korrekte Dependency** von Anfang an
2. **Reservations:** Wurde später implementiert → **korrekte Dependency** von Anfang an
3. **To-Do's:** Wurde möglicherweise kopiert/refactored → **falsche Dependency** durch Copy-Paste-Fehler

**FAKT:** To-Do's hatte `[tasksSettings]` statt `[tasksSettings.sortConfig]` - das war ein **Fehler**, der jetzt korrigiert wurde.

---

### 2.2 Unterschiede in UI-Implementierung

| Komponente | onClick auf | Button | aria-label | Status |
|------------|-------------|--------|------------|--------|
| **Requests** | `<th>` | ❌ Nein | ❌ Nein | ⚠️ **ALT** |
| **To-Do's** | `<button>` | ✅ Ja | ✅ Ja | ✅ **NEU** |
| **Reservations** | `<button>` | ✅ Ja | ✅ Ja | ✅ **NEU** |

**Warum der Unterschied?**

1. **Requests:** Wurde früher implementiert → **alte Implementierung** ohne Accessibility-Features
2. **To-Do's/Reservations:** Wurden später implementiert → **neue Implementierung** mit Accessibility-Features

**FAKT:** Requests verwendet die **alte Implementierung**, To-Do's/Reservations verwenden die **neue Implementierung**.

---

## 3. WAS IST DER STANDARD?

### 3.1 Standard für useMemo Dependencies

**✅ STANDARD:**
```typescript
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings.sortConfig]); // ✅ NUR die spezifische Property
```

**Regel:**
- **IMMER** nur die spezifische Property als Dependency verwenden
- **NIEMALS** das ganze Objekt als Dependency verwenden
- **AUSNAHME:** Nur wenn die gesamte Berechnung von mehreren Properties abhängt

**Beispiele:**

**✅ KORREKT:**
```typescript
// Nur sortConfig wird verwendet
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings.sortConfig]);

// Mehrere Properties werden verwendet
const combinedConfig = useMemo(() => {
  return {
    sort: settings.sortConfig,
    view: settings.viewMode
  };
}, [settings.sortConfig, settings.viewMode]); // ✅ Beide Properties
```

**❌ FALSCH:**
```typescript
// Ganzes Objekt als Dependency
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings]); // ❌ GANZES Objekt
```

---

### 3.2 Standard für UI-Implementierung (Table Header Sortierung)

**✅ STANDARD (NEU):**
```typescript
<th>
  <div className="flex items-center">
    {column.label}
    {sortKey && (
      <button 
        type="button"
        onClick={() => handleSort(sortKey)}
        aria-label={...}
        title={...}
      >
        {sortKey && sortConfig.key === sortKey ? (
          sortConfig.direction === 'asc' ? '↑' : '↓'
        ) : (
          <ArrowsUpDownIcon />
        )}
      </button>
    )}
  </div>
</th>
```

**Warum dieser Standard?**

1. **Accessibility:** `<button>` ist semantisch korrekt für interaktive Elemente
2. **Keyboard-Navigation:** Button kann mit Tab fokussiert werden
3. **Screen-Reader:** `aria-label` und `title` helfen Screen-Readern
4. **Visualisierung:** Icon-Fallback für bessere UX

**⚠️ ALT (NICHT MEHR STANDARD):**
```typescript
<th onClick={sortKey ? () => handleSort(sortKey) : undefined}>
  <div>
    {column.label}
    {sortKey && sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
  </div>
</th>
```

**Warum nicht mehr Standard?**

1. **Keine Accessibility:** Kein `aria-label`, kein `title`
2. **Schlechte Keyboard-Navigation:** `<th>` ist nicht fokussierbar
3. **Screen-Reader-Probleme:** Screen-Reader verstehen nicht, dass `<th>` klickbar ist

---

## 4. ZUSAMMENFASSUNG

### 4.1 useMemo Standard

**✅ KORREKT:**
- Dependency: `[settings.sortConfig]` (nur spezifische Property)
- Verwendet für: Stabilisierung von Objekten, die in anderen `useMemo`/`useCallback` verwendet werden

**❌ FALSCH:**
- Dependency: `[settings]` (ganzes Objekt)
- Problem: Unnötige Neuberechnungen bei jeder Settings-Änderung

### 4.2 UI-Implementierung Standard

**✅ STANDARD (NEU):**
- `<button>` innerhalb `<th>`
- `type="button"` Attribut
- `aria-label` und `title` Attribute
- Icon-Fallback für Visualisierung

**⚠️ ALT (NICHT MEHR STANDARD):**
- `<th onClick>` direkt
- Keine Accessibility-Attribute
- Einfache Visualisierung ohne Icon-Fallback

### 4.3 Aktueller Status

| Komponente | useMemo Dependency | UI-Implementierung | Status |
|------------|-------------------|-------------------|--------|
| **Requests** | ✅ Korrekt | ⚠️ Alt | ⚠️ **UI muss aktualisiert werden** |
| **To-Do's** | ✅ Korrekt (nach Fix) | ✅ Neu | ✅ **Standard-konform** |
| **Reservations** | ✅ Korrekt | ✅ Neu | ✅ **Standard-konform** |

---

## 5. EMPFEHLUNGEN

### 5.1 useMemo

**Alle Komponenten sollten verwenden:**
```typescript
const sortConfig = useMemo(() => {
  return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [settings.sortConfig]); // ✅ NUR die spezifische Property
```

### 5.2 UI-Implementierung

**Alle Komponenten sollten verwenden:**
- `<button>` innerhalb `<th>`
- `aria-label` und `title` Attribute
- Icon-Fallback für Visualisierung

**Requests sollte aktualisiert werden** auf den neuen Standard.

---

**ENDE DER ERKLÄRUNG**
