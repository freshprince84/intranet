# Container-Strukturen und Abstände

## Übersicht

Dieses Dokument definiert die **konsistenten Container-Strukturen** für alle Seiten und Boxen im Intranet-Projekt. Diese Standards müssen bei der Erstellung neuer Seiten oder Komponenten strikt eingehalten werden, um einheitliche Abstände zur Top-Leiste und konsistente Darstellung zu gewährleisten.

## Standard-Seitenstruktur

Jede Seite muss folgende Struktur haben:

```tsx
return (
  <div className="min-h-screen dark:bg-gray-900">
    <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
      {/* Seiteninhalt */}
    </div>
  </div>
);
```

### Erklärung der Klassen

1. **Äußerer Wrapper**: `min-h-screen dark:bg-gray-900`
   - `min-h-screen`: Stellt sicher, dass die Seite mindestens die volle Bildschirmhöhe einnimmt
   - `dark:bg-gray-900`: Hintergrundfarbe für Dark Mode (konsistent mit der Top-Leiste)
   - **WICHTIG**: Hintergrund ist IMMER einfarbig (`bg-white dark:bg-gray-900`), KEINE Gradienten! Gradienten verursachen vertikale Streifen und sind für Seitenhintergründe verboten.

2. **Container**: `max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6`
   - `max-w-7xl`: Maximale Breite des Inhalts
   - `mx-auto`: Zentriert den Container horizontal
   - `py-0`: Kein vertikales Padding (wird durch -mt kompensiert)
   - `px-2`: Horizontales Padding auf Mobile
   - `-mt-6 sm:-mt-3 lg:-mt-3`: Negativer Margin oben für korrekten Abstand zur Top-Leiste (responsive)
   - `sm:px-4 lg:px-6`: Responsive horizontales Padding

## Standard-Box-Struktur

Alle Boxen (weiße Container mit Inhalt) müssen folgende Klassen haben:

```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Box-Inhalt */}
</div>
```

### Erklärung der Box-Klassen

1. **Hintergrund**: `bg-white dark:bg-gray-800`
   - Weißer Hintergrund im Light Mode
   - Grauer Hintergrund im Dark Mode

2. **Rahmen**: `rounded-lg border border-gray-300 dark:border-gray-700`
   - Abgerundete Ecken (`rounded-lg`)
   - Rahmen im Light Mode (`border-gray-300`)
   - Rahmen im Dark Mode (`dark:border-gray-700`)

3. **Padding**: `p-6`
   - Konsistentes Padding von 1.5rem (24px) auf allen Seiten

## Seiten mit Tabs

Für Seiten mit Tab-Navigation gilt zusätzlich:

```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Header */}
  <div className="flex items-center mb-6">
    {/* Header-Inhalt */}
  </div>
  
  {/* Tab-Navigation */}
  <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
    <nav className="-mb-px flex space-x-8">
      {/* Tab-Buttons */}
    </nav>
  </div>
  
  {/* Tab-Content */}
  <div className="mt-6">
    {/* Tab-Inhalt */}
  </div>
</div>
```

### Wichtige Regeln für Tabs

- **Tab-Border**: `border-b border-gray-200 dark:border-gray-700 mb-6`
- **Tab-Content**: `mt-6` (nicht `pt-0`!)
- **Keine negativen Margins**: Tabs sollten NICHT `-mx-6 px-6` haben, um die volle Breite zu nutzen

## Seiten mit mehreren Boxen

Für Seiten mit mehreren Boxen (z.B. Dashboard, Consultations):

```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    <div className="space-y-6">
      {/* Box 1 */}
      <BoxComponent />
      
      {/* Box 2 */}
      <BoxComponent />
    </div>
  </div>
</div>
```

### Wichtige Regeln

- **Abstand zwischen Boxen**: `space-y-6` auf dem Container
- **Jede Box**: Muss die Standard-Box-Klassen haben (`bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`)

## Komponenten-Boxen

Komponenten, die als Boxen verwendet werden (z.B. `ConsultationTracker`, `ConsultationList`), müssen die Standard-Box-Klassen direkt haben:

```tsx
// ✅ RICHTIG
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Komponenten-Inhalt */}
</div>

// ❌ FALSCH - Kein shadow, keine border-Konsistenz
<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
  {/* Komponenten-Inhalt */}
</div>
```

## Verbotene Patterns

Folgende Patterns sind **NICHT erlaubt** und müssen entfernt werden:

1. **Unnötige Wrapper**:
   ```tsx
   // ❌ FALSCH
   <div className="py-1">
     <div className="bg-white ... p-6">
   ```

2. **Inkonsistente Padding-Klassen**:
   ```tsx
   // ❌ FALSCH
   <div className="bg-white ... pt-0 pb-1">
   <div className="bg-white ... sm:p-6">
   ```

3. **Fehlender äußerer Wrapper**:
   ```tsx
   // ❌ FALSCH
   <div className="max-w-7xl mx-auto ...">
     {/* Fehlt: min-h-screen dark:bg-gray-900 */}
   ```

4. **Tab-Content mit pt-0**:
   ```tsx
   // ❌ FALSCH
   <div className="pt-0">
     {/* Tab-Content */}
   ```

5. **Tab-Header mit negativen Margins**:
   ```tsx
   // ❌ FALSCH
   <div className="border-b ... -mx-6 px-6">
     {/* Tabs sollten keine negativen Margins haben */}
   ```

## Checkliste für neue Seiten

Beim Erstellen einer neuen Seite:

- [ ] Äußerer Wrapper: `min-h-screen dark:bg-gray-900`
- [ ] Container: `max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6`
- [ ] Boxen: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`
- [ ] Tab-Content: `mt-6` (nicht `pt-0`)
- [ ] Keine unnötigen Wrapper (`py-1`, `pt-0`, etc.)
- [ ] Keine negativen Margins auf Tab-Headern (`-mx-6 px-6`)

## Beispiele

### Beispiel 1: Einfache Seite mit einer Box

```tsx
const MyPage: React.FC = () => {
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-6">Meine Seite</h2>
          {/* Inhalt */}
        </div>
      </div>
    </div>
  );
};
```

### Beispiel 2: Seite mit Tabs

```tsx
const MyPageWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tab1');
  
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <h2 className="text-xl font-semibold">Meine Seite</h2>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              {/* Tab-Buttons */}
            </nav>
          </div>
          
          {/* Tab-Content */}
          <div className="mt-6">
            {/* Tab-Inhalt */}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Beispiel 3: Seite mit mehreren Boxen

```tsx
const MyPageWithMultipleBoxes: React.FC = () => {
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="space-y-6">
          {/* Box 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Box 1</h2>
            {/* Inhalt */}
          </div>
          
          {/* Box 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Box 2</h2>
            {/* Inhalt */}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Ausnahmen

### Cerebro-Seite

Die Cerebro-Seite hat eine spezielle Layout-Struktur mit Sidebar und benötigt daher eine andere Container-Struktur. Diese Ausnahme ist dokumentiert in der Komponente selbst.

### Login/Register-Seiten

Login- und Register-Seiten haben eine zentrierte Layout-Struktur und verwenden daher eine andere Container-Struktur:

```tsx
<div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
  <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
    {/* Login/Register-Inhalt */}
  </div>
</div>
```

## Wartung

Diese Dokumentation muss aktualisiert werden, wenn:
- Neue Seiten-Strukturen hinzugefügt werden
- Container-Standards geändert werden
- Neue Ausnahmen hinzugefügt werden

## Verweise

- [VIBES.md](../../VIBES.md) - Coding-Stil und Best Practices
- [README.md](../README.md) - Claude-spezifische Übersicht

