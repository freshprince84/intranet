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
11. [Header-Message-Komponenten](#header-message-komponenten)
12. [Scrollbars-Design](#scrollbars-design)
13. [Responsive Design](#responsive-design)
14. [Modals und Sidepanes](#modals-und-sidepanes)

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
  - Innenabstand (0.75rem an den Seiten, 1.5rem oben/unten)
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

### Standardisierte Box-Typen

Im System gibt es zwei Hauptvarianten von Boxen, die jeweils eigene Layouts und Strukturen haben:

#### 1. Standard-Box ohne Tabelle

Dieser Box-Typ wird für Komponenten ohne tabellarische Daten verwendet, wie die Zeiterfassungs-Box.

**Titelzeilenstruktur:**
- Höhe: 2.5rem (Desktop), 2rem (Mobile)
- Layout: Flex mit `justify-between` und `items-center`
- Abstand unten: 1rem (Desktop), 0.5rem (Mobile)

**Titelzeile linke Seite:**
- Titel H2 mit Icon links davor
- Icon: 1.5rem × 1.5rem (Desktop), 1.1rem × 1.1rem (Mobile)
- Icon-Abstand zum Text: 0.5rem (Desktop), 0.25rem (Mobile)
- Schriftgröße Titel: 1.25rem (Desktop), 1rem (Mobile)
- Schriftstärke: 600 (semibold)
- Einrückung vom linken Rand: 0.5rem (Mobile), 0 (Desktop) durch `pl-2 sm:pl-0`

**Titelzeile rechte Seite (optional):**
- Actionbuttons mit Abstand 0.5rem (Desktop), 0.4rem (Mobile) zwischen den Buttons
- Button-Größe: Konsistent mit den Komponenten in der Titelzeile links
- Suchfelder und Filter:
  - Höhe: 2rem (Desktop), 1.9rem (Mobile)
  - Rahmen: border-gray-300 (hellgrau)
  - Schriftgröße: 0.875rem (Desktop), 0.75rem (Mobile)
  - Breite: 200px (Desktop), 120px (Mobile)

**Beispiel-Code:**
```jsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold flex items-center">
      <ClockIcon className="h-6 w-6 mr-2" />
      Zeiterfassung
    </h2>
    <div className="flex items-center space-x-2">
      {/* Optionale Buttons */}
    </div>
  </div>
  
  {/* Box-Inhalt */}
  <div className="...">
    {/* Komponenten-spezifischer Inhalt */}
  </div>
</div>
```

**Responsives Verhalten:**
- Desktop (>640px): 
  - Padding: 1.5rem (24px) rundherum
  - Titel-Icon: 1.5rem (24px)
  - Titeltext: 1.25rem (20px)
  - Abstand zwischen Titelzeile und Inhalt: 1rem (16px)
  
- Mobile (≤640px):
  - Padding: 0.75rem (12px) links/rechts, 1.5rem oben, variabel unten
  - Titel-Icon: 1.1rem (17.6px)
  - Titeltext: 1rem (16px)
  - Abstand zwischen Titelzeile und Inhalt: 0.5rem (8px)
  - Abstand für Icons vom Rand: 0.25rem (4px) links, 0.4rem (6.4px) rechts

#### 2. Box mit Tabelle

Dieser Box-Typ wird für Komponenten mit tabellarischen Daten verwendet, wie Request-Box oder Task-Box.

**Titelzeilenstruktur:**
- Höhe: 3rem (Desktop), 2.5rem (Mobile)
- Layout: Flex mit `justify-between` und `items-center`
- Abstand unten: 1rem (Desktop), 0.5rem (Mobile)

**Titelzeile linke Seite:**
- Beinhaltet Titel H2 mit Icon und optionalen Aktionsbuttons (z.B. "Neu erstellen")
- Icon: 1.5rem × 1.5rem (Desktop), 1.1rem × 1.1rem (Mobile)
- Icon-Abstand zum Text: 0.5rem (Desktop), 0.25rem (Mobile)
- Schriftgröße Titel: 1.25rem (Desktop), 1rem (Mobile)
- Schriftstärke: 600 (semibold)
- "Neu erstellen"-Button: Links vom Titel mit Abstand von 0.5rem (Desktop), 0.25rem (Mobile) zum linken Rand

**Titelzeile rechte Seite:**
- Suchfeld: 200px (Desktop), 120px (Mobile) Breite
- Filter-Button und Spalten-Konfigurationsbutton
- Abstand zwischen Elementen: 0.5rem (Desktop), 0.4rem (Mobile)
- Abstand zum rechten Rand: 0.5rem (Desktop), 0.4rem (Mobile)

**Tabellenlayout:**
- Volle Breite innerhalb der Box
- Tabellenkopf: Hintergrund `bg-gray-50` (hellgrau)
- Header-Zellen: 0.75rem Schriftgröße, 500 Schriftstärke, dunkelgraue Farbe
- Hover-Effekt auf Zeilen
- Abstand in Zellen: 0.75rem oben/unten, 1rem links/rechts (Desktop), reduziert im Mobile-Modus

**Beispiel-Code:**
```jsx
<div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
            {canCreateTask && (
                <button
                    type="button"
                    onClick={handleCreateTask}
                    className="h-8 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md border border-transparent shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center justify-center"
                    title="Neues To Do erstellen"
                    aria-label="Neues To Do erstellen"
                >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Neu
                </button>
            )}
            <h2 className="text-xl font-semibold flex items-center">
                <ClipboardDocumentListIcon className="h-6 w-6 mr-2" />
                To Do's
            </h2>
        </div>
        <div className="flex space-x-2 items-center">
            <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded px-2 py-1 text-sm w-40"
            />
            <button 
                onClick={toggleStatusFilter}
                className="p-2 rounded-md"
            >
                <FunnelIcon className="h-5 w-5 text-gray-500" />
            </button>
            <button 
                onClick={toggleColumnSettings}
                className="p-2 rounded-md"
            >
                <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
            </button>
        </div>
    </div>
    
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Tabellen-Inhalt */}
        </table>
    </div>
</div>
```

**Responsives Verhalten der Tabellenbox:**
- Desktop (>640px): 
  - Box-Padding: 1.5rem (24px) rundherum
  - Titel-Icon: 1.5rem (24px)
  - Titeltext: 1.25rem (20px)
  - Suchfeld-Breite: 200px
  - Abstand zwischen Elementen in der Titelzeile: 0.5rem (8px)
  
- Mobile (≤640px):
  - Box-Padding: 0.75rem (12px) links/rechts, 1.5rem oben/unten
  - Titel-Icon: 1.1rem (17.6px)
  - Titeltext: 1rem (16px)
  - Suchfeld-Breite: 120px max
  - Abstand für "Neu erstellen"-Button vom linken Rand: 0.25rem (4px)
  - Abstand zwischen Elementen rechts: 0.4rem (6.4px)
  - Abstand zum rechten Rand für den letzten Button: 0.4rem (6.4px)
  - Tabellenzellen-Padding: links 0.75rem, rechts 0.5rem, vertikal reduziert

### Tabellenzellen in mobiler Ansicht

Im mobilen Modus werden Tabellenzellen speziell optimiert:

- Erste Spalte (Titel): 
  - Breite: 20% der Tabelle
  - Text-Umbruch aktiviert (word-wrap: break-word)
  - Schriftgröße: 0.75rem (12px)

- Status-Spalte:
  - Feste Breite: 60px
  - Optimierter Platz für Status-Badges

- Aktionen-Spalte:
  - Feste Breite: 70px
  - Vertikale Ausrichtung von Buttons (flex-direction: column)
  - Abstand zwischen Buttons: 0.5rem (8px)

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

Die Zeiterfassungs-Box auf der Worktracker-Seite dient als Referenzimplementierung für normale Boxen:

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

Die Tasks-Box auf der Worktracker-Seite und die Requests-Box auf der Dashboard-Seite dienen als Referenzimplementierungen für Boxen mit Tabellen.

```jsx
<div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
            {canCreateTask && (
                <button
                    type="button"
                    onClick={handleCreateTask}
                    className="h-8 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md border border-transparent shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center justify-center"
                    title="Neues To Do erstellen"
                    aria-label="Neues To Do erstellen"
                >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Neu
                </button>
            )}
            <h2 className="text-xl font-semibold flex items-center">
                <ClipboardDocumentListIcon className="h-6 w-6 mr-2" />
                To Do's
            </h2>
        </div>
        <div className="flex space-x-2 items-center">
            <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded px-2 py-1 text-sm w-40"
            />
            <button 
                onClick={toggleStatusFilter}
                className="p-2 rounded-md"
            >
                <FunnelIcon className="h-5 w-5 text-gray-500" />
            </button>
            <button 
                onClick={toggleColumnSettings}
                className="p-2 rounded-md"
            >
                <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
            </button>
        </div>
    </div>
    
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Tabellen-Inhalt */}
        </table>
    </div>
</div>
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

### Status-Badges in Tabellen

Alle Status-Badges in Tabellen müssen folgendem Muster entsprechen:

```jsx
<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)} status-col`}>
    {getStatusText(status, processType)}
</span>
```

Die Statusfarben werden über eine zentrale Funktion bestimmt:

```javascript
// Funktion zum Bestimmen der Status-Farbe
const getStatusColor = (status: string) => {
    switch(status) {
        // Task Status-Farben
        case 'open':
            return 'bg-yellow-100 text-yellow-800';
        case 'in_progress':
            return 'bg-blue-100 text-blue-800';
        case 'improval':
            return 'bg-red-100 text-red-800';
        case 'quality_control':
            return 'bg-purple-100 text-purple-800';
        case 'done':
            return 'bg-green-100 text-green-800';
            
        // Request Status-Farben
        case 'approval':
            return 'bg-orange-100 text-orange-800';
        case 'approved':
            return 'bg-green-100 text-green-800';
        case 'to_improve':
            return 'bg-red-100 text-red-800';
        case 'denied':
            return 'bg-gray-100 text-gray-800';
            
        // Fallback
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

// Funktion zum Bestimmen des Status-Textes
const getStatusText = (status: string, processType?: 'task' | 'request' | 'default') => {
    // Tasks
    if (processType === 'task') {
        switch(status) {
            case 'open': return 'Offen';
            case 'in_progress': return 'In Bearbeitung';
            case 'improval': return 'Zu verbessern';
            case 'quality_control': return 'Qualitätskontrolle';
            case 'done': return 'Erledigt';
            default: return status;
        }
    }
    
    // Requests
    if (processType === 'request') {
        switch(status) {
            case 'approval': return 'Zur Genehmigung';
            case 'approved': return 'Genehmigt';
            case 'to_improve': return 'Zu verbessern';
            case 'denied': return 'Abgelehnt';
            default: return status;
        }
    }
    
    // Default: Return capitalized status
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};
```

### Erweiterte Tabellenfunktionen

#### Tabellen-Filter-System

Alle Tabellen mit Filterfunktionalität müssen dem folgenden Standard entsprechen:

##### 1. Filter-Button und konditionales Panel

```jsx
{/* Filter-Button mit aktivem Indikator */}
<button
    className={`p-2 rounded-md border ${activeFilters > 0 ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
    title="Filter"
>
    <FunnelIcon className="h-5 w-5" />
    {activeFilters > 0 && (
        <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
            {activeFilters}
        </span>
    )}
</button>

{/* Konditionales Filter-Panel */}
{isFilterPanelOpen && (
    <FilterPane
        columns={availableColumns}
        onApply={applyFilterConditions}
        onReset={resetFilterConditions}
        savedConditions={currentConditions}
        savedOperators={currentOperators}
        tableId={TABLE_ID}
    />
)}

{/* Gespeicherte Filter */}
<SavedFilterTags
    tableId={TABLE_ID}
    onSelectFilter={applyFilterConditions}
    onReset={resetFilterConditions}
/>
```

##### 2. Filter-Komponenten

Das Filtersystem besteht aus drei Hauptkomponenten:

1. **FilterPane.tsx**: Container für Filterbedingungen
   - Verwaltet Filterbedingungen und logische Operatoren
   - Ermöglicht das Speichern von Filtern
   - Stellt Schnittstellen zum Anwenden und Zurücksetzen bereit

2. **FilterRow.tsx**: Einzelne Filterbedingung 
   - Rendert Spaltenauswahl, Operator und Wert-Eingabe
   - Passt Eingabefelder dynamisch an Datentypen an
   - Bietet Hinzufügen/Entfernen-Funktionalität

3. **SavedFilterTags.tsx**: Gespeicherte Filter anzeigen
   - Zeigt gespeicherte Filter als interaktive Tags
   - Ermöglicht das Löschen von Filtern
   - Visuelles Feedback für aktiv ausgewählte Filter

##### 3. Filterdaten-Struktur

```typescript
// Filterbedingung
interface FilterCondition {
  column: string;
  operator: string;
  value: string | number | Date | null;
}

// Logische Operatoren zwischen Bedingungen
type LogicalOperator = 'AND' | 'OR';

// Gespeicherter Filter
interface SavedFilter {
  id: number;
  name: string;
  tableId: string;
  conditions: FilterCondition[];
  operators: LogicalOperator[];
}
```

##### 4. Typsicherheit und Konsistenz

- Alle Filterbedingungen werden typisiert gespeichert
- Filter werden tabellenspezifisch durch tableId zugeordnet 
- Operatoren sind auf 'AND' | 'OR' beschränkt
- Eingabefelder passen sich dem Datentyp der Spalte an

#### Drag & Drop für Tabellenspalten

Alle Tabellen mit anpassbarer Spaltenanordnung müssen das folgende Drag & Drop-System implementieren:

##### 1. Spalten-Header mit Drag & Drop-Funktionalität

```jsx
<th 
    key={columnId}
    scope="col"
    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100' : ''}`}
    draggable={true}
    onDragStart={() => handleDragStart(columnId)}
    onDragOver={(e) => handleDragOver(e, columnId)}
    onDrop={(e) => handleDrop(e, columnId)}
    onDragEnd={handleDragEnd}
>
    <div className="flex items-center">
        {column.label}
        {/* Optional: Sortier-Icon */}
        {columnId !== 'actions' && (
            <button 
                onClick={() => handleSort(columnId)}
                className="ml-1 focus:outline-none"
            >
                <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
            </button>
        )}
    </div>
</th>
```

##### 2. Event-Handler für Drag & Drop

```typescript
// Spaltenordnung verwalten
const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

// Event-Handler für Drag & Drop
const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
};

const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
};

const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedColumn || draggedColumn === targetColumnId) return;
    
    const newColumnOrder = [...columnOrder];
    const draggedIndex = newColumnOrder.indexOf(draggedColumn);
    const targetIndex = newColumnOrder.indexOf(targetColumnId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        // Entferne die verschobene Spalte
        newColumnOrder.splice(draggedIndex, 1);
        // Füge sie an der neuen Position ein
        newColumnOrder.splice(targetIndex, 0, draggedColumn);
        
        setColumnOrder(newColumnOrder);
        
        // Optional: Speichere die neue Spaltenreihenfolge
        saveColumnOrder(newColumnOrder);
    }
    
    setDragOverColumn(null);
};

const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
};
```

##### 3. Persistenz der Spaltenanordnung

Die benutzerdefinierte Spaltenanordnung muss gespeichert werden, entweder:

- In der Benutzersitzung (localStorage)
- In der Datenbank (UserTableSettings)

```typescript
// Speichern der Einstellungen
const saveColumnOrder = async (columnOrder: string[]) => {
    try {
        // API-Aufruf zum Speichern der Benutzereinstellungen
        await axios.post(`${API_URL}/api/user-table-settings`, {
            tableId: TABLE_ID,
            columnOrder: JSON.stringify(columnOrder)
        });
    } catch (err) {
        console.error('Fehler beim Speichern der Spaltenanordnung:', err);
        // Alternativ: In localStorage speichern
        localStorage.setItem(`${TABLE_ID}_columnOrder`, JSON.stringify(columnOrder));
    }
};
```

##### 4. Visuelles Feedback

- Drag-Over-Zustand muss visuell hervorgehoben werden (z.B. mit bg-blue-100)
- Der Cursor sollte sich beim Drag & Drop entsprechend ändern
- Zugänglichkeitsinformationen sollten für Screenreader-Nutzer bereitgestellt werden

##### 5. Responsives Verhalten

- Auf mobilen Geräten sollten ggf. kürzere Labels verwendet werden
- Die Drag & Drop-Funktionalität sollte auf Touch-Geräten getestet werden
- Auf sehr kleinen Bildschirmen kann die Funktionalität optional deaktiviert werden

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

Alle Status-Badges in Tabellen müssen folgendem Muster entsprechen:

```jsx
<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)} status-col`}>
    {getStatusText(status, processType)}
</span>
```

Die Statusfarben werden über eine zentrale Funktion bestimmt:

```javascript
// Funktion zum Bestimmen der Status-Farbe
const getStatusColor = (status: string) => {
    switch(status) {
        // Task Status-Farben
        case 'open':
            return 'bg-yellow-100 text-yellow-800';
        case 'in_progress':
            return 'bg-blue-100 text-blue-800';
        case 'improval':
            return 'bg-red-100 text-red-800';
        case 'quality_control':
            return 'bg-purple-100 text-purple-800';
        case 'done':
            return 'bg-green-100 text-green-800';
            
        // Request Status-Farben
        case 'approval':
            return 'bg-orange-100 text-orange-800';
        case 'approved':
            return 'bg-green-100 text-green-800';
        case 'to_improve':
            return 'bg-red-100 text-red-800';
        case 'denied':
            return 'bg-gray-100 text-gray-800';
            
        // Fallback
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

// Funktion zum Bestimmen des Status-Textes
const getStatusText = (status: string, processType?: 'task' | 'request' | 'default') => {
    // Tasks
    if (processType === 'task') {
        switch(status) {
            case 'open': return 'Offen';
            case 'in_progress': return 'In Bearbeitung';
            case 'improval': return 'Zu verbessern';
            case 'quality_control': return 'Qualitätskontrolle';
            case 'done': return 'Erledigt';
            default: return status;
        }
    }
    
    // Requests
    if (processType === 'request') {
        switch(status) {
            case 'approval': return 'Zur Genehmigung';
            case 'approved': return 'Genehmigt';
            case 'to_improve': return 'Zu verbessern';
            case 'denied': return 'Abgelehnt';
            default: return status;
        }
    }
    
    // Default: Return capitalized status
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};
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

### Standardeingabefelder

Alle Eingabefelder müssen dem folgenden Design entsprechen:

```css
.input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #D1D5DB;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  outline: none;
}

.input-field:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Dark Mode */
.dark .input-field {
  background-color: #374151;
  border-color: #4B5563;
  color: #F9FAFB;
}
```

### Eingabefeldgrößen

- **XS**: Höhe 24px, Padding 0.25rem, Schriftgröße 0.75rem
- **SM**: Höhe 32px, Padding 0.375rem, Schriftgröße 0.875rem (Standard)
- **MD**: Höhe 40px, Padding 0.5rem, Schriftgröße 1rem
- **LG**: Höhe 48px, Padding 0.75rem, Schriftgröße 1.125rem

### Suchfeld-Design

Alle Suchfelder in der Anwendung müssen ein konsistentes Design aufweisen, um die Benutzerfreundlichkeit zu verbessern und ein einheitliches Erscheinungsbild zu gewährleisten.

#### Standard-Suchfeld-Design

Suchfelder sollten folgendes Design haben:

```css
.search-field {
  width: 200px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #D1D5DB;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  color: #111827;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.search-field:focus {
  outline: none;
  ring-width: 2px;
  ring-color: #3B82F6;
  border-color: #3B82F6;
}

/* Dark Mode */
.dark .search-field {
  background-color: #1F2937;
  border-color: #4B5563;
  color: #F9FAFB;
}
```

#### Tailwind CSS Klassen für Suchfelder

Für ein Standard-Suchfeld sollten folgende Tailwind-Klassen verwendet werden:

```css
w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white
```

#### Responsive Anpassung

- **Desktop**: Feste Breite 200px
- **Mobile**: Skaliert auf 100% Breite oder minimale Breite von 120px

#### Platzierung in Komponenten

Suchfelder sollten konsistent platziert werden:

- **In Tabellen-Boxen**: Rechtsbündig in der Titelzeile, neben Filter- und Einstellungs-Buttons
- **In anderen Komponenten**: Je nach Kontext, aber mit konsistentem Abstand zu anderen Elementen (8px)

#### Beispiel-Implementierung

Die Suchleiste in der Workcenter-Box dient als Referenzimplementierung:

```jsx
<input
  type="text"
  className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
  placeholder="Suchen..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

### Labels

Alle Beschriftungen müssen dem folgenden Design entsprechen:

```css
/* Label */
label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

/* Dark Mode */
.dark label {
  color: #D1D5DB;
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

/* Actions-Buttons (Neu erstellen, Listen anzeigen, Bearbeiten) */
.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  background-color: white;
  color: #3B82F6;
  border: 1px solid #93C5FD;
  border-radius: 9999px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: background-color 150ms, border-color 150ms;
}

.btn-action:hover {
  background-color: #EFF6FF;
  border-color: #3B82F6;
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

.dark .btn-action {
  background-color: #1F2937;
  color: #60A5FA;
  border-color: #2563EB;
}

.dark .btn-action:hover {
  background-color: #2D3748;
  border-color: #60A5FA;
}
```

### Button-Verwendungszwecke

- **Primäre Buttons** (`btn-primary`): Hauptaktionen wie "Speichern", "Bestätigen" oder "Senden"
- **Sekundäre Buttons** (`btn-secondary`): Weniger wichtige Aktionen wie "Abbrechen" oder "Zurück"
- **Gefährliche Aktionen** (`btn-danger`): Kritische Operationen wie "Löschen" oder "Zurücksetzen"
- **Icon-Buttons** (`btn-icon`): Einfache Aktionen ohne Textbeschriftung
- **Action-Buttons** (`btn-action`): Für folgende Aktionen:
  - "Neu erstellen" oder "Hinzufügen" Funktionen (mit Plus-Icon)
  - Listen oder Details anzeigen (mit Listen- oder Augen-Icon)
  - Bearbeiten (mit Stift-Icon)

Alle Action-Buttons (`btn-action`) haben folgende Eigenschaften:
- Weißer Hintergrund (im Light Mode)
- Blaues Icon
- Blauer Rand
- Runde Form (border-radius: 9999px)
- Leichter Schatten für 3D-Effekt

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

### Implementierungsbeispiel

```jsx
<div className={`notification notification-${type}`}>
  <div className="notification-icon">
    {icon}
  </div>
  <div className="notification-content">
    <h3 className="notification-title">{title}</h3>
    <p className="notification-message">{message}</p>
  </div>
  <button className="notification-close" onClick={onClose}>
    <XIcon />
  </button>
</div>
```

## Header-Message-Komponenten

Header-Messages dienen zur temporären Anzeige von Feedback und System-Meldungen im Header-Bereich. Sie verwenden eine einheitliche Darstellung in Abhängigkeit vom Meldungstyp.

```css
/* Basis für Header-Meldungen */
.message-container {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin: 0 1rem;
  animation: fadeInOut 3s forwards;
  position: relative;
  min-width: 200px;
  max-width: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Animation für Erscheinen und Verschwinden */
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
}

/* Typ-spezifische Styles */
.message-success {
  background-color: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #047857;
}

.message-error {
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
  color: #B91C1C;
}

.message-warning {
  background-color: #FFFBEB;
  border: 1px solid #FEF3C7;
  color: #B45309;
}

.message-info {
  background-color: #EFF6FF;
  border: 1px solid #BFDBFE;
  color: #1D4ED8;
}

.message-default {
  background-color: #F3F4F6;
  border: 1px solid #E5E7EB;
  color: #374151;
}

/* Dark Mode */
.dark .message-success {
  background-color: #064E3B;
  border-color: #047857;
  color: #A7F3D0;
}

.dark .message-error {
  background-color: #7F1D1D;
  border-color: #B91C1C;
  color: #FECACA;
}

.dark .message-warning {
  background-color: #78350F;
  border-color: #B45309;
  color: #FEF3C7;
}

.dark .message-info {
  background-color: #1E3A8A;
  border-color: #1D4ED8;
  color: #BFDBFE;
}

.dark .message-default {
  background-color: #374151;
  border-color: #4B5563;
  color: #E5E7EB;
}
```

### Implementierungsbeispiel

```jsx
const HeaderMessage = () => {
  const { message } = useMessage();
  
  if (!message) return null;
  
  const getMessageClassName = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 border border-green-400 text-green-700';
      case 'error': return 'bg-red-100 border border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border border-yellow-400 text-yellow-700';
      case 'info': return 'bg-blue-100 border border-blue-400 text-blue-700';
      default: return 'bg-gray-100 border border-gray-400 text-gray-700';
    }
  };
  
  return (
    <div 
      className={`message-container px-4 py-3 rounded mx-4 flex items-center justify-center ${getMessageClassName(message.type)}`}
      style={{
        animation: 'fadeInOut 3s forwards',
        position: 'relative',
        animationFillMode: 'forwards'
      }}
    >
      {message.content}
    </div>
  );
};
```

### Richtlinien für Header-Messages

1. **Platzierung**: Header-Messages müssen im Header zwischen Logo und Benachrichtigungen platziert werden
2. **Timing**: Die Anzeigedauer beträgt genau 3 Sekunden
3. **Typen**: Es müssen die Standard-Typen success, error, warning, info und default verwendet werden
4. **Design**: Die Meldungen folgen dem etablierten Farbschema mit hellem Hintergrund, farbigem Rand und farbigem Text
5. **Inhalt**: Texte sollten kurz und präzise sein (idealerweise 5-10 Wörter)
6. **Singular**: Es darf zu jedem Zeitpunkt nur eine Meldung angezeigt werden
7. **State-Management**: Verwende den zentralen MessageContext/useMessage-Hook für die Verwaltung

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

### Box-Layout im Mobilen Modus (max-width: 640px)

Im mobilen Modus (Smartphones) gelten folgende Designregeln für Boxen:

- Boxen erstrecken sich über die gesamte Bildschirmbreite ohne Rahmen und Abrundungen
- Optimierte Abstände zu den Bildschirmrändern für bessere Benutzererfahrung:
  - Außenabstand (Padding) der Boxen: 0.75rem links und rechts
  - Innenabstand in Titelzeilen mit Buttons: 0.75rem links und rechts
  - Button-Abstand vom linken Rand: mindestens 0.25rem
  - Buttons am rechten Rand: mindestens 0.4rem Abstand zum Bildschirmrand
- Konsistente Größen und Abstände für UI-Elemente:
  - Abstände zwischen Elementen in Titelzeilen: 0.5rem
  - Abstände zwischen Buttons in einer Gruppe: 0.4rem

Diese Anpassungen verbessern die Benutzererfahrung auf kleinen Bildschirmen, indem Elemente nicht zu dicht am Rand platziert werden und genügend Platz zum Antippen bieten.

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

## Modals und Sidepanes

Die Anwendung verwendet zwei Haupttypen von temporären UI-Komponenten für interaktive Eingaben:

### 1. Modals (Dialog-Fenster)

Modals werden für wichtige Interaktionen verwendet, bei denen der Benutzer seine Aufmerksamkeit auf eine bestimmte Aufgabe konzentrieren soll.

#### Standard-Modal-Struktur

Für kleinere bis mittlere Inhalte:

```css
/* Overlay für Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

/* Modal-Container */
.modal-container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  overflow-y: auto;
}

/* Dark Mode */
.dark .modal-container {
  background-color: #1F2937;
}
```

#### Modal-Scroll-Struktur für große Inhalte

**⚠️ WICHTIG:** Für Modals mit viel Inhalt (z.B. RoleManagement, InvoiceDetails) muss eine spezielle Scroll-Struktur verwendet werden, damit Buttons immer erreichbar bleiben:

```jsx
// KORREKTE Scroll-Struktur für große Modals
<Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl modal-scroll-container">
  {/* Header - immer sichtbar */}
  <div className="modal-scroll-header">
    <div className="flex items-center justify-between mb-6">
      <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
        Modal Titel
      </Dialog.Title>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
        <XMarkIcon className="h-6 w-6" />
      </button>
    </div>
  </div>
  
  {/* Content - scrollbar */}
  <div className="modal-scroll-content">
    {/* Langer Inhalt hier */}
  </div>
  
  {/* Footer - immer sichtbar */}
  <div className="modal-scroll-footer">
    <div className="flex items-center justify-end space-x-3">
      <button onClick={onClose}>Abbrechen</button>
      <button type="submit">Speichern</button>
    </div>
  </div>
</Dialog.Panel>
```

```css
/* CSS für Modal-Scroll-Struktur */
.modal-scroll-container {
  max-height: calc(100vh - 2rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-scroll-header {
  flex-shrink: 0;
  padding: 1.5rem 1.5rem 0 1.5rem;
}

.modal-scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.modal-scroll-footer {
  flex-shrink: 0;
  padding: 0 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid theme('colors.gray.200');
  margin-top: 1rem;
}

.dark .modal-scroll-footer {
  border-top-color: theme('colors.gray.700');
}

/* Mobile-spezifische Korrekturen */
@media (max-width: 640px) {
  .modal-scroll-container {
    max-height: calc(100vh - 1rem);
}

  .modal-scroll-content {
    padding-bottom: 2rem; /* Extra Platz für Mobile */}
}
```

#### Standard-Modal mit Tailwind CSS

Für kleinere Modals mit wenig Inhalt:

```jsx
<Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
  {/* Kopfbereich des Modals */}
  <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
    <Dialog.Title className="text-lg font-semibold dark:text-white">
      Modaltitel
    </Dialog.Title>
    <button
      onClick={onClose}
      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
    >
      <XMarkIcon className="h-6 w-6" />
    </button>
  </div>
  
  {/* Inhalt des Modals */}
  <div className="p-4">
    {/* Fehlermeldung (falls vorhanden) */}
    {error && (
      <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
        {error}
      </div>
    )}
    
    {/* Formularelemente */}
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Eingabefeld
      </label>
      <input
        type="text"
        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
      />
    </div>
    
    {/* Buttons */}
    <div className="flex justify-end mt-4 gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
      >
        Abbrechen
      </button>
      <button
        type="submit"
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
      >
        Bestätigen
      </button>
    </div>
  </div>
</Dialog.Panel>
```

### 2. Sidepanes (Seitenleisten)

Sidepanes werden für interaktive Eingaben verwendet, die den Benutzer nicht vollständig unterbrechen sollen. Sie schieben sich von der rechten Seite ein und lassen den Rest der Seite sichtbar.

#### Korrekte Sidepane-Struktur

**🎯 STANDARD-PATTERN für Create/Edit-Komponenten:** CreateTaskModal, CreateRequestModal, EditTaskModal und EditRequestModal implementieren das Standard-Sidepane-Pattern:

```jsx
// KORREKTES Sidepane-Pattern (Standard für Create/Edit)
// Für Desktop (ab 640px) - Sidepane
return (
  <Dialog open={isOpen} onClose={onClose} className="relative z-50">
    {/* Semi-transparenter Hintergrund für den Rest der Seite */}
    <div 
      className="fixed inset-0 bg-black/10 transition-opacity" 
      aria-hidden="true" 
      onClick={onClose}
    />
    
    {/* Sidepane von rechts einfahren */}
    <div 
      className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <Dialog.Title className="text-lg font-semibold dark:text-white">
          Sidepane Titel
        </Dialog.Title>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="p-4 overflow-y-auto h-full">
        {/* Formular-Inhalt hier */}
      </div>
    </div>
  </Dialog>
);
```

**Mobile (unter 640px) - Modal:**
```jsx
// Für Mobile (unter 640px) - klassisches Modal
if (isMobile) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold dark:text-white">
              Modal Titel
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4">
            {/* Formular-Inhalt hier */}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

**✅ Standard-Referenzen:**
- `CreateTaskModal.tsx` - Desktop Sidepane Pattern (Zeilen 538-605)
- `CreateRequestModal.tsx` - Desktop Sidepane Pattern (Zeilen 608-781)
- `EditTaskModal.tsx` - Desktop Sidepane Pattern (Zeilen 1008-1045)
- `EditRequestModal.tsx` - Desktop Sidepane Pattern (Zeilen 801-838)

**⚠️ Alternative Sidepane-Struktur (für komplexere Bearbeitungen):**
Die `InvoiceManagementTab.tsx` verwendet eine alternative, komplexere Struktur für sehr umfangreiche Bearbeitungsformen mit separatem Header-Bereich. Diese sollte NUR für spezielle Fälle verwendet werden, NICHT als Standard.

#### CSS für Sidepanes

```css
/* Sidepane-Struktur für korrekten Scroll */
.sidepane-container {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: 50;
}

.sidepane-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.sidepane-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(107, 114, 128, 0.75);
  transition: opacity 300ms ease-in-out;
}

.sidepane-panel-container {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  padding-left: 2.5rem;
  max-width: 100%;
  display: flex;
}

.sidepane-panel {
  width: 100vw;
  max-width: 32rem; /* 512px - anpassbar je nach Bedarf */
}

.sidepane-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: white;
  box-shadow: -4px 0 15px -3px rgba(0, 0, 0, 0.1);
  overflow-y: scroll;
}

.sidepane-header {
  padding: 1rem 1.5rem;
  background-color: #F9FAFB;
  flex-shrink: 0;
}

.sidepane-body {
  flex: 1;
  padding: 1rem 1.5rem;
}

/* Dark Mode */
.dark .sidepane-content {
  background-color: #1F2937;
}

.dark .sidepane-header {
  background-color: #374151;
}

.dark .sidepane-backdrop {
  background-color: rgba(107, 114, 128, 0.75);
}
```

#### Responsive Verhalten

**Wichtig:** Alle Sidepane-Komponenten müssen responsive sein:

1. **Mobile (<640px)**: Werden automatisch als Modals dargestellt (siehe Mobile-Modal-Pattern oben)
2. **Desktop (≥640px)**: Werden als Sidepanes von rechts eingeschoben

**Implementierung der Responsive-Erkennung:**
```jsx
const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

useEffect(() => {
  const checkScreenSize = () => {
    setIsMobile(window.innerWidth < 640);
  };
  
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  
  return () => {
    window.removeEventListener('resize', checkScreenSize);
  };
}, []);
```

### Verwendungsrichtlinien

1. **Modals vs. Sidepanes**:
   - **Modals** werden für kritische Aufgaben verwendet, die die volle Aufmerksamkeit des Benutzers erfordern, wie z.B. Bestätigungsdialoge, Löschvorgänge oder einfache Formulare.
   - **Sidepanes** werden für umfangreiche Bearbeitungsaufgaben verwendet, bei denen der Benutzer den Kontext der Hauptansicht benötigt, wie z.B. komplexe Formulare, Detailansichten oder umfangreiche Konfigurationen.

2. **Responsive Verhalten - PRÄZISE REGELN**:
   - **Mobile (<640px)**: ALLE Create/Edit-Komponenten werden als **Modals** dargestellt
   - **Desktop (≥640px)**: 
     - **Create/Edit-Komponenten** (Task, Request, Client erstellen/bearbeiten) → **Sidepane**
     - **Bestätigungsdialoge/Löschvorgänge** → **Modal**

3. **Standard-Implementierungen**:
   
   **✅ KORREKTE Referenzen (Standard-Pattern):**
   - **Sidepanes für Create/Edit:** `CreateTaskModal.tsx`, `CreateRequestModal.tsx`, `EditTaskModal.tsx`, `EditRequestModal.tsx`
   - **Modals für Bestätigungen:** `ClientSelectModal.tsx` (wenn als Bestätigung verwendet)
   
   **⚠️ Alternative Implementierung (für sehr komplexe Fälle):**
   - `InvoiceManagementTab.tsx` - verwendet alternative Sidepane-Struktur mit separatem Header-Bereich (NUR für spezielle Fälle)
   
   **❌ Zu korrigieren:**
   - `CreateClientModal.tsx` - sollte Sidepane sein, nicht Modal (auf Standard-Pattern umstellen)
   - `CreateOrganizationModal.tsx` - sollte Sidepane sein und HeadlessUI verwenden

4. **Filter in Tabellen**:
   - Filter für Tabelleninhalte müssen als Pane direkt unter dem Filter-Button erscheinen, NICHT als separates Modal.
   - Das Filter-Pane soll sich ohne die Seite zu blockieren öffnen und den Context der Seite erhalten.
   - Die Requests-Komponente in Dashboard dient als Referenzimplementierung für dieses Verhalten.
   - Alle Tabellenfilter im System müssen diesem Standard folgen.

5. **Mobile-Layout-Beachtung**:
   - Beachte, dass in der Worktracker-Komponente die To Do's-Box und Zeiterfassung im mobilen Modus die Plätze tauschen.
   - Die To Do's-Box wird oben angezeigt und die Zeiterfassung-Box am unteren Bildschirmrand.
   - Bei Layout-Änderungen ist besondere Vorsicht geboten, um diese Funktionalität nicht zu beeinträchtigen.

### Implementierungs-Checkliste

Beim Erstellen neuer Modals/Sidepanes:

**Modal-Checkliste:**
- [ ] Verwende `Dialog.Panel` mit korrekter max-width
- [ ] Bei großem Inhalt: Modal-Scroll-Struktur implementieren
- [ ] Header/Footer fixiert, Content scrollbar
- [ ] Dark Mode Support für alle Elemente
- [ ] Mobile: Anpassung der Größe und Abstände

**Sidepane-Checkliste (Standard-Pattern für Create/Edit):**
- [ ] Verwende CreateTaskModal/CreateRequestModal Pattern als Basis
- [ ] Dialog mit `relative z-50`
- [ ] Backdrop mit `fixed inset-0 bg-black/10 transition-opacity`
- [ ] Sidepane Panel: `fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl`
- [ ] Transform-Animation: `transform transition-transform duration-300 ease-in-out`
- [ ] Zustand: `${isOpen ? 'translate-x-0' : 'translate-x-full'}`
- [ ] Header: `flex items-center justify-between p-4 border-b dark:border-gray-700`
- [ ] Content: `p-4 overflow-y-auto h-full`
- [ ] Dark Mode Support für alle Elemente
- [ ] Mobile: Automatisch als Modal rendern (siehe Mobile-Pattern oben)

**Wichtig:**
- ✅ **Standard-Pattern verwenden:** CreateTaskModal/CreateRequestModal Pattern für alle Create/Edit-Komponenten
- ✅ **Konsistente Implementierung:** Alle neuen Create/Edit-Komponenten müssen dem gleichen Pattern folgen
- ✅ **Transform-Animation:** Der Standard verwendet `transform transition-transform duration-300 ease-in-out` für Sidepanes
- ❌ **Keine isolierten Lösungen:** Nicht eigene Patterns erfinden, immer Standard verwenden
- ❌ **Keine inkonsistenten Abweichungen:** Abweichungen nur mit ausdrücklicher Begründung