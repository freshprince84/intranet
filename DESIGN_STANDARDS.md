# DESIGN STANDARDS

Dieses Dokument definiert die verbindlichen Design-Standards für das Intranet-Projekt. Alle UI-Komponenten müssen diesen Standards entsprechen, um ein konsistentes Erscheinungsbild zu gewährleisten.

## Inhaltsverzeichnis

1. [Allgemeine Designprinzipien](#allgemeine-designprinzipien)
2. [Farbpalette](#farbpalette)
3. [Typografie](#typografie)
4. [Box-Design](#box-design)
5. [Tabellen-Design](#tabellen-design)
6. [Page-Design](#page-design)
7. [Formulare und Eingabefelder](#formulare-und-eingabefelder)
8. [Buttons und Aktionselemente](#buttons-und-aktionselemente)
9. [Berechtigungsbasierte UI-Anpassung](#berechtigungsbasierte-ui-anpassung)
10. [Notification-Komponenten](#notification-komponenten)
11. [Scrollbars-Design](#scrollbars-design)
12. [Responsive Design](#responsive-design)

## Allgemeine Designprinzipien

- **Konsistenz**: Alle Komponenten müssen konsistent über die gesamte Anwendung hinweg sein
- **Klarheit**: UI-Elemente müssen klar und intuitiv sein
- **Zugänglichkeit**: Alle Komponenten müssen für alle Benutzer zugänglich sein
- **Responsivität**: Die Anwendung muss auf allen Geräten gut funktionieren

## Farbpalette

### Primärfarben
- **Blau**: `#3B82F6` (Buttons, Links, Hervorhebungen)
- **Grün**: `#10B981` (Erfolg, positive Aktionen)
- **Rot**: `#EF4444` (Fehler, Warnungen, Löschaktionen)
- **Gelb**: `#F59E0B` (Warnungen, Hinweise)

### Neutralfarben
- **Weiß**: `#FFFFFF` (Hintergrund von Boxen)
- **Hellgrau**: `#F9FAFB` (Hintergrund von Tabellenkopfzeilen)
- **Mittelgrau**: `#E5E7EB` (Rahmen, Trennlinien)
- **Dunkelgrau**: `#6B7280` (Sekundärtext)
- **Schwarz**: `#111827` (Primärtext)

### Dark Mode Farben
- **Dunkel-Hintergrund**: `#1F2937` (Ersetzt Weiß)
- **Dunkel-Hellgrau**: `#374151` (Ersetzt Hellgrau)
- **Dunkel-Mittelgrau**: `#4B5563` (Ersetzt Mittelgrau)
- **Dunkel-Text**: `#F9FAFB` (Ersetzt Schwarz/Dunkelgrau)

## Typografie

### Schriftfamilie
- **Primär**: Inter, system-ui, sans-serif
- **Monospace**: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace (für Code)

### Schriftgrößen
- **xs**: 0.75rem (12px) - Kleine Hinweise, Badges
- **sm**: 0.875rem (14px) - Sekundärer Text, Tabellenzellen
- **base**: 1rem (16px) - Standardtext
- **lg**: 1.125rem (18px) - Wichtiger Text
- **xl**: 1.25rem (20px) - Überschriften in Boxen
- **2xl**: 1.5rem (24px) - Seitenüberschriften

### Schriftstärken
- **normal**: 400 - Standardtext
- **medium**: 500 - Hervorgehobener Text, Tabellenkopfzeilen
- **semibold**: 600 - Überschriften
- **bold**: 700 - Wichtige Hervorhebungen

## Box-Design

Alle Hauptcontainer auf Seiten müssen dem folgenden Design entsprechen:

```css
/* Standard-Box */
.content-box {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
.dark .content-box {
  background-color: #1F2937;
}
```

### Box-Display-Regeln

- **Desktop-Ansicht** (>640px):
  - Weißer Hintergrund
  - Abgerundete Ecken (0.5rem)
  - **Kein Rahmen**
  - Leichter Schatten (0 2px 4px rgba(0, 0, 0, 0.1))
  - Innenabstand (1.5rem)

- **Mobile-Ansicht** (≤640px):
  - Weißer Hintergrund
  - Keine abgerundeten Ecken
  - Kein Rahmen
  - Kein Schatten
  - Innenabstand (0.5rem an den Seiten, 1.5rem oben/unten)
  - Volle Bildschirmbreite

### System-Boxen
Die folgenden Boxen sind offiziell im System definiert:

#### Hauptboxen
1. **Dashboard/Arbeitszeitstatistik Box**
   - Zeigt Wochenstatistiken der Arbeitszeit als interaktives Diagramm
   - Exportfunktion für Arbeitszeitdaten als Excel-Datei
   - Farbliche Unterscheidung zwischen Zeiten unter (blau) und über (rot) der Sollarbeitszeit
2. **Dashboard/Requests Box**
3. **Worktracker/Zeiterfassung Box**
4. **Worktracker/To Do's Box**
5. **Settings Box**
6. **UserManagement Box**
7. **Profile Box**
8. **NotificationList Box**
9. **Workcenter Box** 
10. **Lohnabrechnung Box**

#### Authentifizierungsboxen (separat gelistet)
- **Login Box**
- **Register Box**

### Box-Header Standard

```css
/* Box-Header mit Icon */
.box-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.box-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.box-header svg {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.5rem;
  color: #111827;
}

/* Dark Mode */
.dark .box-header h2,
.dark .box-header svg {
  color: #F9FAFB;
}
```

### Beispiel-Implementierung

Die Zeiterfassungs-Box auf der Worktracker-Seite dient als Referenzimplementierung:

```jsx
<div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
            <ClockIcon className="h-6 w-6 mr-2" />
            Zeiterfassung
        </h2>
        {/* Weitere Inhalte */}
    </div>
    {/* Box-Inhalt */}
</div>
```

## Tabellen-Design

Alle Tabellen müssen dem folgenden Design entsprechen:

```css
/* Äußerer Container */
.table-container {
  overflow-x: auto;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

/* Tabelle selbst */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

/* Tabellenkopf */
thead {
  background-color: #f9fafb;
}

/* Kopfzellen */
th {
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.05em;
}

/* Datenzellen */
td {
  padding: 1rem 1.5rem;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;
}

/* Zebrastreifen */
tr:nth-child(even) {
  background-color: #f9fafb;
}

/* Hover-Effekt */
tbody tr:hover {
  background-color: #f3f4f6;
}

/* Dark Mode */
.dark thead {
  background-color: #374151;
}

.dark th {
  color: #9CA3AF;
}

.dark td {
  border-bottom-color: #4B5563;
}

.dark tr:nth-child(even) {
  background-color: #283141;
}

.dark tbody tr:hover {
  background-color: #374151;
}
```

### Status-Badges in Tabellen

```css
/* Status-Indikator */
.status-badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Status-Farben */
.status-open { background-color: #FEF3C7; color: #92400E; }
.status-in-progress { background-color: #DBEAFE; color: #1E40AF; }
.status-done { background-color: #D1FAE5; color: #065F46; }
.status-to-check { background-color: #FEE2E2; color: #991B1B; }

/* Dark Mode */
.dark .status-open { background-color: #78350F; color: #FEF3C7; }
.dark .status-in-progress { background-color: #1E3A8A; color: #DBEAFE; }
.dark .status-done { background-color: #064E3B; color: #D1FAE5; }
.dark .status-to-check { background-color: #7F1D1D; color: #FEE2E2; }
```

### Beispiel-Implementierung

Die Tasks-Tabelle auf der Worktracker-Seite und die Requests-Tabelle auf der Dashboard-Seite dienen als Referenzimplementierungen.

```jsx
<div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
            <ClipboardDocumentListIcon className="h-6 w-6 mr-2" />
            To Do's
        </h2>
        {/* Filter und Suchoptionen */}
    </div>
    
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Titel
                    </th>
                    {/* Weitere Spaltenüberschriften */}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {/* Tabellenzeilen */}
            </tbody>
        </table>
    </div>
</div>
```

## Page-Design

Alle Hauptseiten müssen dem folgenden Layout entsprechen:

```css
/* Hauptcontainer */
.page-container {
  padding: 1rem;
}

/* Abstand zu Headerleiste */
.page-content {
  margin-top: 0.5rem;
}

@media (min-width: 768px) {
  .page-container {
    padding: 1.5rem;
  }
  
  /* Größerer Abstand auf Desktop */
  .page-content {
    margin-top: 1rem;
  }
}

/* Responsives Layout */
.page-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .page-grid {
    grid-template-columns: 2fr 1fr;
  }
}
```

### Page-Padding-Standards

Die folgenden Padding-Werte sind für verschiedene Containertypen definiert:

- **Mobile Ansicht** (< 640px):
  - Hauptcontainer: `padding-top: 0.5rem` 
  - Main-Tag: `padding: 0.5rem 0.75rem`
  
- **Tablet Ansicht** (640px - 1023px):
  - Hauptcontainer: `padding-top: 1rem`
  - Main-Tag: `padding: 0.75rem 1rem`
  
- **Desktop Ansicht** (≥ 1024px):
  - Hauptcontainer: `padding-top: 1rem`
  - Main-Tag: `padding: 0.75rem 1.25rem`

### Beispiel-Implementierung

Die Worktracker-Seite dient als Referenzimplementierung für das Page-Design, insbesondere für den Abstand zwischen der obersten Box und der Headerleiste.

```jsx
<div className="container mx-auto py-6">
    <div className="mb-6">
        <WorktimeTracker />
    </div>
    
    <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full">
        {/* Seiteninhalt */}
    </div>
</div>
```

## Formulare und Eingabefelder

```css
/* Label */
label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

/* Eingabefeld */
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="date"],
textarea,
select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #D1D5DB;
  border-radius: 0.375rem;
  background-color: white;
  font-size: 0.875rem;
  color: #111827;
}

/* Fokus-Zustand */
input:focus,
textarea:focus,
select:focus {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
  ring-color: #3B82F6;
  border-color: #3B82F6;
}

/* Fehler-Zustand */
.input-error {
  border-color: #EF4444;
}

.error-message {
  color: #EF4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

/* Dark Mode */
.dark label {
  color: #D1D5DB;
}

.dark input,
.dark textarea,
.dark select {
  background-color: #1F2937;
  border-color: #4B5563;
  color: #F9FAFB;
}
```

## Buttons und Aktionselemente

```css
/* Primärer Button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: #3B82F6;
  color: white;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: background-color 150ms;
}

.btn-primary:hover {
  background-color: #2563EB;
}

/* Sekundärer Button */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: white;
  color: #111827;
  font-weight: 500;
  border: 1px solid #D1D5DB;
  border-radius: 0.375rem;
  transition: background-color 150ms;
}

.btn-secondary:hover {
  background-color: #F3F4F6;
}

/* Gefährliche Aktion */
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: #EF4444;
  color: white;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: background-color 150ms;
}

.btn-danger:hover {
  background-color: #DC2626;
}

/* Icon-Button */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background-color: transparent;
  color: #6B7280;
  border-radius: 0.375rem;
  transition: background-color 150ms, color 150ms;
}

.btn-icon:hover {
  background-color: #F3F4F6;
  color: #111827;
}

/* Dark Mode */
.dark .btn-secondary {
  background-color: #1F2937;
  color: #F9FAFB;
  border-color: #4B5563;
}

.dark .btn-secondary:hover {
  background-color: #374151;
}

.dark .btn-icon {
  color: #9CA3AF;
}

.dark .btn-icon:hover {
  background-color: #374151;
  color: #F9FAFB;
}
```

## Berechtigungsbasierte UI-Anpassung

Die UI muss basierend auf den Berechtigungen des Benutzers angepasst werden. Verwende dafür den `hasPermission`-Hook:

```jsx
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {/* Nur anzeigen, wenn der Benutzer die entsprechende Berechtigung hat */}
      {hasPermission('entity', 'write', 'entityType') && (
        <button className="btn-primary">
          Neue Entität erstellen
        </button>
      )}
      
      {/* Schreibgeschützte Ansicht für Benutzer mit nur Leseberechtigung */}
      {hasPermission('entity', 'read', 'entityType') && !hasPermission('entity', 'write', 'entityType') && (
        <div className="text-gray-500">
          Schreibgeschützte Ansicht
        </div>
      )}
    </div>
  );
};
```

## Notification-Komponenten

Alle Benachrichtigungen müssen dem folgenden Design entsprechen:

```css
/* Basis-Notification */
.notification {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

/* Info-Notification */
.notification-info {
  background-color: #EFF6FF;
  border-left: 4px solid #3B82F6;
}

/* Erfolgs-Notification */
.notification-success {
  background-color: #ECFDF5;
  border-left: 4px solid #10B981;
}

/* Warn-Notification */
.notification-warning {
  background-color: #FFFBEB;
  border-left: 4px solid #F59E0B;
}

/* Fehler-Notification */
.notification-error {
  background-color: #FEF2F2;
  border-left: 4px solid #EF4444;
}

/* Notification-Icon */
.notification-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
}

/* Notification-Inhalt */
.notification-content {
  flex-grow: 1;
}

.notification-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.notification-message {
  font-size: 0.875rem;
  color: #4B5563;
}

/* Schließen-Button */
.notification-close {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: #6B7280;
  cursor: pointer;
}

/* Dark Mode */
.dark .notification-info {
  background-color: #1E3A8A;
  border-left-color: #3B82F6;
}

.dark .notification-success {
  background-color: #064E3B;
  border-left-color: #10B981;
}

.dark .notification-warning {
  background-color: #78350F;
  border-left-color: #F59E0B;
}

.dark .notification-error {
  background-color: #7F1D1D;
  border-left-color: #EF4444;
}

.dark .notification-message {
  color: #D1D5DB;
}

.dark .notification-close {
  color: #9CA3AF;
}
```

## Scrollbars-Design

Alle Scrollbars im System müssen ein modernes, schlankes Design verwenden:

```css
/* Basis-Styling für alle Scrollbars im System */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Dark Mode Scrollbar */
.dark ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
```

### Scrollbar-Layout-Prinzipien

- **Mobile Ansicht**: Normale Scrollbar für die gesamte Seite, falls der Inhalt zu groß ist
- **Tablet und Desktop Ansicht**: Keine Scrollbar für die gesamte Seite (fixed height container)
  - Boxen mit zu viel Inhalt haben interne Scrollbars
  - Wenn zu viele Boxen vorhanden sind, ist die Hauptseite scrollbar
  - Dies verbessert das visuelle Erscheinungsbild auf großen Bildschirmen

### Container-Klassen für Scrollbars

Für Container mit Scrollbars müssen folgende Klassen verwendet werden:

1. **Vertikale Scrollbars**:
   ```jsx
   <div className="overflow-y-container">
     {/* Content */}
   </div>
   ```

2. **Horizontale Scrollbars für Tabellen**:
   ```jsx
   <div className="table-scroll-container">
     <table>
       {/* Tabellen-Inhalt */}
     </table>
   </div>
   ```

3. **Scrollbare Box-Inhalte** (für Tablets und größer):
   ```jsx
   <div className="box-content-scrollable">
     {/* Box-Inhalt, der potenziell zu hoch ist */}
   </div>
   ```

### Richtlinien für Scrollbars

- Verwende nur dann Scrollbars, wenn es absolut notwendig ist
- Bevorzuge vertikales Scrollen gegenüber horizontalem Scrollen, besonders auf mobilen Geräten
- Stelle sicher, dass der Inhalt mit einer Breite von mindestens 10px vom rechten Rand entfernt ist, um Platz für die Scrollbar zu lassen
- Verwende `scrollbar-gutter: stable`, um Layout-Shifts zu vermeiden
- Teste das Scroll-Verhalten sowohl mit Maus als auch mit Touch-Geräten
- Bei Tablet und Desktop (≥768px) sollte die gesamte Seite ohne äußere Scrollbar angezeigt werden
  - Header-Leiste bleibt fixiert am oberen Rand
  - Bei Tablet ist ein Footer-Menü unten fixiert
  - Bei Desktop sollte ein Abstand unter der letzten Box sein

## Responsive Design

Die Anwendung muss auf allen Geräten gut funktionieren. Verwende die folgenden Breakpoints:

- **sm**: 640px (Smartphones im Querformat)
- **md**: 768px (Tablets)
- **lg**: 1024px (Laptops)
- **xl**: 1280px (Desktop)
- **2xl**: 1536px (Große Bildschirme)

```css
/* Beispiel für responsive Anpassungen */
.responsive-container {
  padding: 1rem;
}

@media (min-width: 640px) {
  .responsive-container {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .responsive-container {
    padding: 2rem;
  }
}
```

Für komplexere Layouts verwende Grid oder Flexbox:

```css
/* Responsive Grid */
.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .grid-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

Diese Design-Standards müssen in allen Komponenten des Intranet-Projekts eingehalten werden, um ein konsistentes Erscheinungsbild zu gewährleisten. Bei Fragen oder Unklarheiten wende dich an das Entwicklungsteam. 