# DESIGN STANDARDS

Dieses Dokument definiert die verbindlichen Design-Standards für das Intranet-Projekt. Alle UI-Komponenten müssen diesen Standards entsprechen, um ein konsistentes Erscheinungsbild zu gewährleisten.

## Inhaltsverzeichnis

1. [Allgemeine Designprinzipien](#allgemeine-designprinzipien)
2. [Farbpalette](#farbpalette)
3. [Typografie](#typografie)
4. [Box-Design](#box-design)
5. [Tabellen-Design](#tabellen-design)
6. [Card-Design](#card-design)
7. [Page-Design](#page-design)
8. [Formulare und Eingabefelder](#formulare-und-eingabefelder)
9. [Buttons und Aktionselemente](#buttons-und-aktionselemente)
10. [Berechtigungsbasierte UI-Anpassung](#berechtigungsbasierte-ui-anpassung)
11. [Notification-Komponenten](#notification-komponenten)
12. [Header-Message-Komponenten](#header-message-komponenten)
13. [Scrollbars-Design](#scrollbars-design)
14. [Responsive Design](#responsive-design)
15. [Modals und Sidepanes](#modals-und-sidepanes)
16. [⚠️ KRITISCHE CHECKLISTE FÜR NEUE IMPLEMENTIERUNGEN](#-kritische-checkliste-für-neue-implementierungen)

## Allgemeine Designprinzipien

- **Konsistenz**: Alle Komponenten müssen konsistent über die gesamte Anwendung hinweg sein
- **Klarheit**: UI-Elemente müssen klar und intuitiv sein
- **Zugänglichkeit**: Alle Komponenten müssen für alle Benutzer zugänglich sein
- **Responsivität**: Die Anwendung muss auf allen Geräten gut funktionieren

### ⚠️ WICHTIG: Seitenhintergründe

**Seitenhintergründe sind IMMER einfarbig - keine Gradienten!**

- **Light Mode**: `bg-white` (weißer Hintergrund)
- **Dark Mode**: `dark:bg-gray-900` (dunkelgrauer Hintergrund)
- **Verboten**: `bg-gradient-*` Klassen für Seitenhintergründe (können vertikale Streifen verursachen)
- **Ausnahme**: Gradienten sind nur für spezifische UI-Elemente erlaubt (z.B. Buttons, Cards), NICHT für Seitenhintergründe

**Beispiel korrekt:**
```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  {/* Seiteninhalt */}
</div>
```

**Beispiel falsch:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
  {/* ❌ Gradient verursacht Streifen */}
</div>
```

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

**⚠️ KRITISCH: Alle Tabellen mit Filterfunktionalität MÜSSEN das FilterPane-System verwenden!**

**VERBOTEN:**
- ❌ Einfache Suchfelder mit `searchTerm` State
- ❌ Eigene Sortierung mit Select-Dropdowns
- ❌ Client-seitige Filterung ohne FilterPane

**ERFORDERLICH:**
- ✅ FilterPane-Komponente verwenden
- ✅ SavedFilterTags-Komponente verwenden
- ✅ Filter-Button mit FunnelIcon
- ✅ Controlled Mode für Filter-State

Alle Tabellen mit Filterfunktionalität müssen dem folgenden Standard entsprechen:

##### 1. Filter-Button und konditionales Panel

```jsx
{/* Filter-Button mit aktivem Indikator - IMMER RECHTS */}
<div className="flex items-center gap-2">
  <div className="relative">
    <button
      className={`p-2 rounded-md border ${filterConditions.length > 0 ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
      onClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}
      title="Filter"
    >
      <FunnelIcon className="h-5 w-5" />
      {filterConditions.length > 0 && (
        <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
          {filterConditions.length}
        </span>
      )}
    </button>
  </div>
</div>

{/* Konditionales Filter-Panel */}
{isFilterPaneOpen && (
  <div className="px-3 sm:px-4 md:px-6">
    <FilterPane
      columns={availableColumns}
      onApply={applyFilterConditions}
      onReset={resetFilterConditions}
      savedConditions={filterConditions}
      savedOperators={filterLogicalOperators}
      savedSortDirections={filterSortDirections}
      onSortDirectionsChange={setFilterSortDirections}
      tableId={TABLE_ID}
    />
  </div>
)}

{/* Gespeicherte Filter (Controlled Mode) */}
<div className="px-3 sm:px-4 md:px-6">
  <SavedFilterTags
    tableId={TABLE_ID}
    onSelectFilter={(conditions, operators, sortDirections) => applyFilterConditions(conditions, operators, sortDirections)}
    onReset={resetFilterConditions}
    activeFilterName={activeFilterName}
    selectedFilterId={selectedFilterId}
    onFilterChange={handleFilterChange}
    defaultFilterName={t('common.all', 'Alle')}
  />
</div>
```

**Referenz-Implementierungen (IMMER VERWENDEN!):**
- `frontend/src/pages/Cerebro.tsx` Zeile 149-200
- `frontend/src/pages/Worktracker.tsx` Zeile 3654-3683
- `frontend/src/components/teamWorktime/ActiveUsersList.tsx` Zeile 1067-1099

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
   - **Controlled Mode:** Visuelles Feedback für aktiv ausgewählte Filter (blaue Markierung)
   - **WICHTIG:** Alle Komponenten müssen den Controlled Mode verwenden (mit `activeFilterName`, `selectedFilterId`, `onFilterChange` Props)

##### 3. Filter State Management (Controlled Mode)

**WICHTIG:** Alle Komponenten müssen den Controlled Mode verwenden für visuelle Markierung des aktiven Filters.

```typescript
// 1. State-Variablen in der Parent-Komponente
const [activeFilterName, setActiveFilterName] = useState<string>('Aktuell'); // oder 'Heute', 'Alle', etc.
const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);

// 2. Filter Change Handler
const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
  setActiveFilterName(name);
  setSelectedFilterId(id);
  applyFilterConditions(conditions, operators);
};

// 3. Reset-Funktion erweitern
const resetFilterConditions = () => {
  setFilterConditions([]);
  setFilterLogicalOperators([]);
  setActiveFilterName('');
  setSelectedFilterId(null);
};

// 4. Initialen Default-Filter setzen
useEffect(() => {
  const setInitialFilter = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(TABLE_ID));
      const filters = response.data;
      
      const defaultFilter = filters.find((filter: any) => filter.name === 'Aktuell'); // oder 'Heute', 'Alle', etc.
      if (defaultFilter) {
        setActiveFilterName('Aktuell');
        setSelectedFilterId(defaultFilter.id);
        applyFilterConditions(defaultFilter.conditions, defaultFilter.operators);
      }
    } catch (error) {
      console.error('Fehler beim Setzen des initialen Filters:', error);
    }
  };

  setInitialFilter();
}, []);

// 5. SavedFilterTags mit allen Props verwenden
<SavedFilterTags
  tableId={TABLE_ID}
  onSelectFilter={applyFilterConditions}
  onReset={resetFilterConditions}
  activeFilterName={activeFilterName}      // ✅ Erforderlich für Controlled Mode
  selectedFilterId={selectedFilterId}      // ✅ Erforderlich für Controlled Mode
  onFilterChange={handleFilterChange}      // ✅ Erforderlich für Controlled Mode
  defaultFilterName="Aktuell"              // Optional: Standard-Filter-Name
/>
```

##### 4. Filterdaten-Struktur

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

##### 5. Typsicherheit und Konsistenz

- Alle Filterbedingungen werden typisiert gespeichert
- Filter werden tabellenspezifisch durch tableId zugeordnet 
- Operatoren sind auf 'AND' | 'OR' beschränkt
- Eingabefelder passen sich dem Datentyp der Spalte an
- **Controlled Mode:** Alle Komponenten verwenden `activeFilterName`, `selectedFilterId`, `onFilterChange` für konsistente visuelle Markierung

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

## Card-Design

Alle Card-basierten Darstellungen müssen dem folgenden Design entsprechen. Die Card-Ansicht bietet eine alternative Darstellung zu Tabellen und ist insbesondere für mobile Geräte und übersichtlichere Datenpräsentation optimiert.

### Card-Komponenten

Die Card-Ansicht verwendet wiederverwendbare Komponenten:

1. **DataCard** (`frontend/src/components/shared/DataCard.tsx`)
   - Standardisierte Card-Komponente für alle Daten-Cards
   - Unterstützt Header, Metadaten, Actions, expandable Content

2. **CardGrid** (`frontend/src/components/shared/CardGrid.tsx`)
   - Responsive Grid-Wrapper für Card-Layouts
   - Aktuell: Immer 1 Spalte (volle Breite pro Card)

### Basis-Card-Struktur

```css
/* Standard-Card */
.data-card {
  background-color: white;
  border-radius: 0.5rem;
  border: 1px solid #E5E7EB;
  padding: 1rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
}

.data-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Dark Mode */
.dark .data-card {
  background-color: #1F2937;
  border-color: #4B5563;
}
```

### Card-Design-Standards

#### Layout

- **Breite**: Immer volle Breite (1 Card pro Zeile für bessere Übersichtlichkeit)
- **Padding**: Responsive: `p-3 sm:p-4 md:p-5 lg:p-6`
- **Border-Radius**: `0.5rem` (8px)
- **Border**: `1px solid #E5E7EB` (Light) / `#4B5563` (Dark)
- **Abstand zwischen Cards**: `margin-top: 0.5rem !important` zwischen benachbarten Cards (definiert in `index.css`)
- **Overflow**: `overflow-hidden` auf der Card, um sicherzustellen, dass Inhalt innerhalb der Card bleibt

#### Header-Layout (Grid-System)

Der Card-Header verwendet ein **CSS Grid-Layout mit fixen Spaltenbreiten**, um cardübergreifende Bündigkeit zu gewährleisten:

```css
grid-template-columns: '200px 180px auto'
```

- **Spalte 1 (Titel)**: Fixe Breite `200px` - Titel wird bei Bedarf mit `truncate` abgeschnitten
- **Spalte 2 (Mitte)**: Fixe Breite `180px` - Für "Angefragt von" und "Verantwortlicher" (cardübergreifend bündig)
- **Spalte 3 (Rechts)**: `auto` - Für Datum und Status-Badge (passt sich dem Inhalt an, bleibt an ursprünglicher Position)

**Wichtig**: Die fixen Spaltenbreiten für Titel und Mitte stellen sicher, dass die Position von "Angefragt von" und "Verantwortlicher" unabhängig von der Titel-Länge ist, ähnlich einer unsichtbaren Tabelle. Datum & Status bleiben rechts an ihrer ursprünglichen Position.

#### Box-Shadows

**Card-Schatten** (rundherum):
- **Normal**: `shadow-sm` ≈ `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Hover**: `shadow-md` ≈ `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`

**Container-Box-Schatten** (bei Cards-Mode):
- **Gar kein Schatten** (da nur oben/unten technisch nicht möglich ist)
- Hintergrund wird transparent
- Padding wird entfernt

**Wichtig**: Die Container-Box (Wrapper) hat keinen Schatten in Cards-Mode, nur die Cards selbst haben Schatten.

#### Card-Struktur

Jede Card enthält folgende Bereiche:

1. **Header-Bereich**:
   - Titel (text-base bis text-xl, font-semibold)
   - Status-Badge (rechts oben)
   - Optional: Subtitle

2. **Metadaten-Bereich**:
   - Strukturiert nach Positionen: `left`, `main`, `right`, `full`
   - Icons optional (h-4 w-4)
   - Schriftgröße: text-xs bis text-base
   - Grid-Layout für Metadaten: 1/2/4 Spalten je nach Bildschirmgröße

3. **Action-Bereich**:
   - Buttons am unteren Rand
   - Trennlinie oben (border-top)
   - Rechtsbündige Ausrichtung

4. **Optional: Expandable Content**:
   - Für längere Inhalte (z.B. Beschreibungen)
   - Toggle-Button zum Ein-/Ausklappen

### Metadaten-Layout

Metadaten können in verschiedenen Bereichen platziert werden:

- **`left`**: Links im Header-Bereich (z.B. Niederlassung) - meist ausgeblendet
- **`main`**: Haupt-Metadaten-Bereich im Grid Header (z.B. "Angefragt von", erste Zeile)
  - **`main-second`**: Zweite Zeile im Grid Header (z.B. "Verantwortlicher")
  - Beide in der fixen mittleren Spalte (180px) für cardübergreifende Bündigkeit
  - **WICHTIG**: Metadaten mit `section: 'main'` und `section: 'main-second'` werden **NUR im Header** angezeigt, **NIEMALS** im unteren Metadaten-Bereich!
- **`right-inline`**: Rechts im Grid Header, inline mit Status (z.B. Datum) - **VERWENDEN für Datum/Fälligkeit neben Status**
- **`right`**: Rechts unter dem Header, bündig mit Status (z.B. Fälligkeit als Badge unter Status)
- **`full`**: Volle Breite (z.B. Beschreibung mit expandierbarem Inhalt)

**Kritische Implementierungsregeln**:
1. **`main` und `main-second` Metadaten**: Werden **NUR im Header** gerendert (DataCard.tsx Zeile 262-304). Die untere Metadaten-Sektion (Zeile 418-451) filtert diese explizit aus.
2. **Datum/Fälligkeit**: Sollte **immer `section: 'right-inline'`** verwenden (nicht `right`), um inline neben Status angezeigt zu werden, wie bei Requests implementiert.
3. **Box Shadow**: `shadow-sm` Klasse muss **aus dem HTML entfernt werden** bei Container-Wrappern. Die CSS-Regeln übernehmen die Entfernung in Cards-Mode automatisch.

#### Beschreibung mit expandierbarem Inhalt

Beschreibungen mit `descriptionContent` werden speziell behandelt:

1. **Erste Zeile**: Wird immer angezeigt, auf eine Zeile begrenzt (`line-clamp-1`)
2. **Expand/Collapse Pfeil**: 
   - Eingeklappt: `<` (text-base lg:text-lg xl:text-xl)
   - Ausgeklappt: `↓` (ChevronDownIcon, h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6)
   - Position: Ganz rechts, bündig mit anderen Elementen
3. **Einrückung der Folgelinien**: 
   - Berechnet dynamisch basierend auf der Label-Breite
   - Bündig mit dem **Inhalt** der ersten Zeile (nicht mit dem Label)
   - Formel: `marginLeft = labelWidth + 8px` (dynamisch via `offsetWidth`)

### Typografie

- **Titel**: 
  - Responsive Schriftgröße: `clamp(0.9375rem, 1.2vw + 0.5rem, 1.25rem)` (font-semibold)
  - Maximale Breite: `200px` (wird bei Bedarf mit `truncate` abgeschnitten)
- **Metadaten-Labels**: `text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl`, font-medium
- **Metadaten-Werte**: `text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl`, normal weight
- **Subtitle**: `text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl`, text-gray-500

**Wichtig**: Alle Text-Elemente (außer Titel) skalieren über alle Breakpoints bis `2xl:text-2xl` für größere Bildschirme.

### Responsive Design

- **Mobile (<640px)**:
  - Padding: p-3
  - Metadaten: 1 Spalte
  - Schriftgrößen: text-sm (Titel), text-xs (Metadaten)

- **Tablet (640px-1024px)**:
  - Padding: p-4
  - Metadaten: 2 Spalten
  - Schriftgrößen: text-base (Titel), text-sm (Metadaten)

- **Desktop (>1024px)**:
  - Padding: p-5 bis p-6
  - Metadaten: 4 Spalten
  - Schriftgrößen: text-lg bis text-xl (Titel), text-base lg:text-lg xl:text-xl 2xl:text-2xl (Metadaten)
- **Large Desktop (≥1536px)**:
  - Schriftgrößen skalieren weiter bis `2xl:text-2xl` für Metadaten

#### Status-Badge im Header

- **Position**: Rechts im Grid Header, in der dritten Spalte (`1fr`)
- **Overflow-Protection**: 
  - Status-Container hat `flex-shrink-0 min-w-0`
  - Card hat `overflow-hidden`
  - Status-Badge hat `whitespace-nowrap flex-shrink-0`
  - Buttons haben kompakte Padding (`p-0.5 sm:p-1 md:p-1.5`)
- **Schriftgröße**: Skaliert mit Metadaten (`text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl`)

### View-Mode Toggle

Alle Komponenten mit Card-Ansicht müssen einen Toggle-Button zwischen Tabellen- und Card-Ansicht bieten:

```jsx
<button
  className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
    viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
  }`}
  onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
  title={viewMode === 'table' ? 'Als Cards anzeigen' : 'Als Tabelle anzeigen'}
>
  {viewMode === 'table' ? (
    <Squares2X2Icon className="h-5 w-5" />
  ) : (
    <TableCellsIcon className="h-5 w-5" />
  )}
</button>
```

### Status-Badges in Cards

Status-Badges in Cards entsprechen denselben Standards wie in Tabellen (siehe [Status-Badges in Tabellen](#status-badges-in-tabellen)).

### Container-Box Design (bei Cards-Mode)

Wenn die Card-Ansicht aktiv ist, muss die Container-Box (Wrapper) folgende Eigenschaften haben:

- **Schatten**: Gar kein Schatten (`box-shadow: none`)
- **Border**: Entfernt (`border: none`)
- **Hintergrund**: Transparent (`background: transparent`)
- **Padding**: Entfernt (`padding: 0`)
- **Margin**: Entfernt (`margin: 0`)

**CSS-Klasse**: Container-Box muss eine CSS-Klasse mit `-wrapper` Suffix haben (z.B. `dashboard-requests-wrapper`) und die Klasse `cards-mode` erhalten, wenn Card-Ansicht aktiv ist.

### Implementierungsanleitung

Für detaillierte Anleitung zur Implementierung der Card-Ansicht siehe:
- **[Card-Ansicht Implementierungsanleitung](../implementation_guides/CARD_VIEW_IMPLEMENTATION_GUIDE.md)**

### Beispiel-Implementierung

Die Requests-Komponente dient als Referenz-Implementierung:
- `frontend/src/components/Requests.tsx`

### Card-Ansicht mit Edit-Button (Standard-Pattern)

**WICHTIG:** Alle Komponenten, die Daten bearbeitbar machen, müssen das Standard-Pattern für Card-Ansicht mit Edit-Button verwenden. Direkt editierbare Felder in der Ansicht sind NICHT erlaubt.

#### Standard-Pattern

1. **Card-Ansicht**: Zeigt Informationen schreibgeschützt in einer Card an
2. **Edit-Button**: Öffnet ein Edit-Sidepane für Bearbeitung
3. **Keine direkte Bearbeitung**: Felder in der Card-Ansicht sind NICHT direkt editierbar

#### Card-Struktur mit Edit-Button

```jsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow mb-6">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Icon className="h-5 w-5 mr-2" />
            {data.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {data.subtitle}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
            title={t('common.edit')}
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Informationen schreibgeschützt anzeigen */}
      <div className="space-y-3">
        {data.field1 && (
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('field.label')}:</span>
            <span className="ml-2 text-sm text-gray-900 dark:text-white">{data.field1}</span>
          </div>
        )}
        {/* Weitere Felder... */}
      </div>
    </div>
  </div>
</div>
```

#### Edit-Sidepane

Der Edit-Button öffnet ein Sidepane (Desktop) oder Modal (Mobile) für die Bearbeitung:

- **Standard-Pattern**: Wie `CreateTaskModal.tsx` / `CreateRequestModal.tsx`
- **Komponente**: EditOrganizationModal.tsx, EditRoleModal.tsx, etc.
- **Features**: 
  - Mobile (<640px): Modal
  - Desktop (≥640px, ≤1070px): Sidepane MIT Overlay
  - Large Desktop (>1070px): Sidepane OHNE Overlay

#### Referenz-Implementierungen

- **Card-Ansicht mit Edit-Button**: `frontend/src/components/RoleManagementTab.tsx` (RoleCard-Komponente)
- **Edit-Sidepane**: `frontend/src/components/organization/EditOrganizationModal.tsx`
- **Standard-Pattern**: `frontend/src/components/CreateTaskModal.tsx` / `CreateRequestModal.tsx`

#### Verbindliche Regel

**NIEMALS direkt editierbare Felder in der Hauptansicht verwenden!** Alle Bearbeitungen erfolgen über:
1. Card-Ansicht mit Infos (schreibgeschützt)
2. Edit-Button → Edit-Sidepane öffnet sich
3. Bearbeitung im Sidepane
4. Nach Speichern: Card-Ansicht aktualisiert sich

**Beispiele für korrekte Implementierung:**
- ✅ `RoleManagementTab.tsx` - Card-Ansicht mit Edit-Button
- ✅ `OrganizationSettings.tsx` - Card-Ansicht mit Edit-Button (NEU)
- ❌ NICHT erlaubt: Direkt editierbare Input-Felder in der Hauptansicht

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

### ⚠️ KRITISCH: Button-Design-Regel - KEIN TEXT IN BUTTONS!

**WICHTIGSTE REGEL FÜR ALLE BUTTONS:**
- **Buttons müssen IMMER Icon-only sein (OHNE sichtbaren Text)!**
- **Text gehört NUR ins `title` Attribut für Tooltips!**
- **Ausnahmen sind EXTREM selten und müssen explizit begründet werden!**

**Richtige Implementierung:**
```jsx
// ✅ RICHTIG: Icon-only Button mit Tooltip
<div className="relative group">
  <button
    onClick={handleSave}
    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
    title="Speichern"
  >
    <CheckIcon className="h-5 w-5" />
  </button>
  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
    Speichern
  </div>
</div>

// ❌ FALSCH: Button mit sichtbarem Text
<button
  onClick={handleSave}
  className="px-2 py-1 bg-blue-600 text-white rounded"
>
  Speichern
</button>
```

**Standard-Icons für häufige Aktionen:**
- **Speichern**: `CheckIcon` (blau, mit blauem Hintergrund `bg-blue-600`)
- **Abbrechen**: `XMarkIcon` (grau, transparent)
- **Löschen**: `TrashIcon` (rot, transparent)
- **Bearbeiten**: `PencilIcon` (blau, transparent)
- **Umbenennen**: `PencilIcon` (blau, transparent)
- **Hinzufügen**: `PlusIcon` (blau, transparent)
- **Entfernen**: `XMarkIcon` oder `TrashIcon` (rot, transparent)

**Diese Regel gilt für ALLE Buttons im gesamten System!**
- Modals
- Sidepanes
- Dropdown-Menüs
- Tabellen-Aktionen
- Formulare
- Überall!

**Bei jeder neuen Button-Implementierung:**
1. Prüfe: Hat der Button sichtbaren Text? → ENTFERNEN!
2. Prüfe: Ist ein passendes Icon vorhanden? → HINZUFÜGEN!
3. Prüfe: Ist der Text im `title` Attribut UND im Tooltip? → HINZUFÜGEN!
4. Prüfe: Entspricht der Style dem Standard? → ANPASSEN!

---

### ⚠️ KRITISCH: Create-Button Standard - IMMER LINKS, IMMER RUND, IMMER ICON-ONLY!

**WICHTIGSTE REGEL FÜR CREATE-BUTTONS:**
- **Create-Buttons müssen IMMER links positioniert sein!**
- **Create-Buttons müssen IMMER rund sein (`rounded-full`)!**
- **Create-Buttons müssen IMMER Icon-only sein (OHNE Text)!**
- **Create-Buttons haben IMMER weißen Hintergrund, blaues Icon, blauen Rand!**
- **Create-Buttons haben IMMER die Größe `p-1.5` mit `style={{ width: '30.19px', height: '30.19px' }}`!**

**Richtige Implementierung (Create-Button):**
```jsx
// ✅ RICHTIG: Create-Button links, rund, Icon-only
<div className="flex items-center">
  {canCreate && (
    <div className="relative group">
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
        style={{ width: '30.19px', height: '30.19px' }}
        aria-label={t('tasks.createTask')}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
        {t('tasks.createTask')}
      </div>
    </div>
  )}
</div>

// ❌ FALSCH: Create-Button rechts, mit Text, blauer Hintergrund
<div className="flex items-center justify-end">
  <button
    onClick={() => setIsCreateModalOpen(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
  >
    <PlusIcon className="h-5 w-5" />
    {t('tasks.createTask')}
  </button>
</div>
```

**Referenz-Implementierungen (IMMER VERWENDEN!):**
- `frontend/src/components/UserManagementTab.tsx` Zeile 738-752
- `frontend/src/pages/Worktracker.tsx` Zeile 2104-2115
- `frontend/src/components/cerebro/CerebroHeader.tsx` Zeile 100-114
- `frontend/src/components/ConsultationTracker.tsx` Zeile 499-508

**Bei jeder neuen Create-Button-Implementierung:**
1. Prüfe: Ist der Button LINKS positioniert? → KORRIGIEREN!
2. Prüfe: Ist der Button RUND (`rounded-full`)? → KORRIGIEREN!
3. Prüfe: Hat der Button KEINEN sichtbaren Text? → KORRIGIEREN!
4. Prüfe: Hat der Button weißen Hintergrund, blaues Icon, blauen Rand? → KORRIGIEREN!
5. Prüfe: Hat der Button die korrekte Größe? → KORRIGIEREN!
6. Prüfe: Wurde eine der Referenz-Implementierungen verwendet? → VERGLEICHEN!

### ⚠️ KRITISCH: Layout- und Positionierungsänderungen - STRENG VERBOTEN!

**WICHTIGSTE REGEL FÜR ALLE FIXES UND ÄNDERUNGEN:**
- **Buttons, Felder und UI-Elemente DÜRFEN NIEMALS verschoben werden!**
- **Layout-Änderungen (flex-wrap, grid-Änderungen, position-Änderungen) sind VERBOTEN!**
- **Die ursprüngliche Position und Anordnung MUSS IMMER beibehalten werden!**

**Verbotene Änderungen:**
```tsx
// ❌ VERBOTEN: flex-wrap hinzufügen (ändert Position bei Mobile)
<div className="flex items-center gap-1.5 flex-wrap">

// ❌ VERBOTEN: Breite ändern (verschiebt Elemente)
<input className="w-full sm:w-[200px]" />  // War: w-[200px]

// ❌ VERBOTEN: Grid-Layout ändern
<div className="grid grid-cols-1 sm:grid-cols-2">  // War: grid-cols-1

// ❌ VERBOTEN: Position-Änderungen
<div className="absolute left-0">  // War: relative
```

**Erlaubte Änderungen:**
```tsx
// ✅ ERLAUBT: Funktionalität hinzufügen (ohne Layout-Änderung)
<button onClick={handleClick}>  // War: onClick fehlte

// ✅ ERLAUBT: Sichtbarkeit ändern (ohne Position-Änderung)
{activeTab === 'reservations' && <FilterPane />}  // War: nur todos

// ✅ ERLAUBT: Inhalt ändern (ohne Layout-Änderung)
const checkInLink = generateLobbyPmsCheckInLink(...);  // War: window.location.origin

// ✅ ERLAUBT: Responsive Klassen hinzufügen (wenn Position gleich bleibt)
<button className="text-xs sm:text-sm">  // War: text-sm (nur für Konsistenz)
```

**Regeln für Fixes:**
1. **NUR Funktionalität ändern** - Keine Layout-Änderungen
2. **NUR Logik ändern** - Keine CSS-Klassen für Position/Layout
3. **NUR Inhalt ändern** - Keine Container-Struktur ändern

---

## ⚠️ KRITISCHE CHECKLISTE FÜR NEUE IMPLEMENTIERUNGEN

**Diese Checkliste MUSS bei JEDER neuen UI-Implementierung durchgegangen werden!**

### 1. Create-Button Checkliste

- [ ] **Position:** Create-Button ist LINKS positioniert (nicht rechts!)
- [ ] **Form:** Create-Button ist RUND (`rounded-full`)
- [ ] **Größe:** Create-Button hat `p-1.5` mit `style={{ width: '30.19px', height: '30.19px' }}`
- [ ] **Hintergrund:** Create-Button hat weißen Hintergrund (`bg-white dark:bg-gray-700`)
- [ ] **Icon:** Create-Button hat blaues Icon (`text-blue-600 dark:text-blue-400`)
- [ ] **Rand:** Create-Button hat blauen Rand (`border border-blue-200 dark:border-gray-600`)
- [ ] **Schatten:** Create-Button hat Schatten (`shadow-sm`)
- [ ] **Text:** Create-Button hat KEINEN sichtbaren Text (nur im Tooltip!)
- [ ] **Tooltip:** Create-Button hat Tooltip mit `group` und `absolute` positioning
- [ ] **Referenz:** Eine der Referenz-Implementierungen wurde verwendet:
  - `UserManagementTab.tsx` Zeile 738-752
  - `Worktracker.tsx` Zeile 2104-2115
  - `CerebroHeader.tsx` Zeile 100-114

### 2. Alle Buttons Checkliste

- [ ] **Text:** Button hat KEINEN sichtbaren Text
- [ ] **Icon:** Button hat ein passendes Icon
- [ ] **Tooltip:** Button hat `title` Attribut UND Tooltip-Div mit `group` pattern
- [ ] **Hintergrund:** Button hat KEINEN blauen Hintergrund (außer Speichern-Button in Sidepanes)
- [ ] **Style:** Button verwendet Standard-Styles (transparent mit Hover-Effekt)

### 3. Filter & Search Checkliste

- [ ] **FilterPane:** FilterPane-Komponente wird verwendet (nicht einfaches Suchfeld!)
- [ ] **SavedFilterTags:** SavedFilterTags-Komponente wird verwendet
- [ ] **Filter-Button:** Filter-Button mit `FunnelIcon` ist vorhanden
- [ ] **TableID:** `tableId` ist definiert (z.B. `const TABLE_ID = 'password-manager-table'`)
- [ ] **State Management:** Controlled Mode wird verwendet (`activeFilterName`, `selectedFilterId`, `onFilterChange`)
- [ ] **Column Evaluators:** Column Evaluators sind implementiert
- [ ] **getFieldValue:** `getFieldValue` Funktion ist implementiert
- [ ] **applyFilters:** `applyFilters` aus `filterLogic.ts` wird verwendet
- [ ] **Sortierung:** Sortierung erfolgt über FilterPane (nicht eigene Select-Dropdowns!)
- [ ] **Referenz:** Eine der Referenz-Implementierungen wurde verwendet:
  - `Cerebro.tsx` Zeile 32-200
  - `Worktracker.tsx` Zeile 280-1203
  - `ActiveUsersList.tsx` Zeile 121-1099

### 4. Layout-Positionierung Checkliste

- [ ] **Create-Button:** Create-Button ist LINKS (nicht rechts!)
- [ ] **Filter-Button:** Filter-Button ist RECHTS
- [ ] **Suchfeld:** Suchfeld ist im Header-Bereich (nicht in der Box!)
- [ ] **FilterPane:** FilterPane ist unter dem Header (nicht in der Box!)

### 5. Imports Checkliste

- [ ] **FilterPane:** `import FilterPane from './FilterPane.tsx'`
- [ ] **SavedFilterTags:** `import SavedFilterTags from './SavedFilterTags.tsx'`
- [ ] **FilterCondition:** `import { FilterCondition } from './FilterRow.tsx'`
- [ ] **applyFilters:** `import { applyFilters } from '../utils/filterLogic.ts'`
- [ ] **FunnelIcon:** `import { FunnelIcon } from '@heroicons/react/24/outline'`
- [ ] **useMemo:** `import { useMemo } from 'react'` (für Spalten-Definitionen)

### 6. Finale Prüfung

- [ ] **Alle Buttons:** Alle Buttons sind Icon-only
- [ ] **Create-Button:** Create-Button ist links, rund, weißer Hintergrund
- [ ] **Filter-System:** FilterPane-System ist implementiert
- [ ] **Layout:** Layout entspricht den Standards
- [ ] **Referenzen:** Referenz-Implementierungen wurden verwendet
- [ ] **Dokumentation:** Dokumentation wurde gelesen und verstanden

**Wenn auch nur EIN Punkt nicht erfüllt ist → STOPPEN und korrigieren!**
4. **Responsive Klassen nur für Konsistenz** - Nicht für Position-Änderungen

**Checkliste vor JEDEM Fix:**
- [ ] Werden Buttons verschoben? → VERBOTEN!
- [ ] Werden Felder verschoben? → VERBOTEN!
- [ ] Wird Layout geändert (flex-wrap, grid, position)? → VERBOTEN!
- [ ] Wird nur Funktionalität/Logik geändert? → ERLAUBT!
- [ ] Bleibt die ursprüngliche Position erhalten? → ERFORDERLICH!

**Diese Regel gilt für ALLE Fixes und Änderungen im gesamten System!**

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

**✨ NEUE FEATURES:**
- **Sanfte Animation:** Verbesserte Animation mit cubic-bezier Timing (350ms)
- **Topbar-Kompatibilität:** Sidepanes beginnen unter der Topbar (top-16) und überdecken diese nicht
- **Responsive Verhalten bei > 1070px:** Sidepane schiebt sich neben den Hauptinhalt statt ihn zu überlagern

#### Korrekte Sidepane-Struktur

**🎯 STANDARD-PATTERN für Create/Edit-Komponenten:** Alle Create/Edit-Komponenten implementieren das Standard-Sidepane-Pattern:

```jsx
import { useSidepane } from '../contexts/SidepaneContext.tsx';

// KORREKTES Sidepane-Pattern (Standard für Create/Edit)
// Für Desktop (ab 640px) - Sidepane
const MyComponent = ({ isOpen, onClose }) => {
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);

  // Überwache Bildschirmgröße
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth > 1070);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    return () => closeSidepane();
  }, [isOpen, openSidepane, closeSidepane]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Semi-transparenter Hintergrund - nur bei <= 1070px */}
      {!isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop" 
          aria-hidden="true" 
          onClick={onClose}
        />
      )}
      
      {/* Sidepane von rechts einfahren mit verbesserter Animation - beginnt unter der Topbar */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform transition-transform duration-350 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
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
};
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

**✅ Alle Sidepane-Komponenten (Standard-Pattern):**
- `CreateTaskModal.tsx` - Standard Sidepane Pattern
- `CreateRequestModal.tsx` - Standard Sidepane Pattern
- `EditTaskModal.tsx` - Standard Sidepane Pattern
- `EditRequestModal.tsx` - Standard Sidepane Pattern
- `CreateClientModal.tsx` - Standard Sidepane Pattern
- `EditClientModal.tsx` - Standard Sidepane Pattern
- `UserManagementTab.tsx` - Standard Sidepane Pattern (Benutzererstellung)
- `RoleManagementTab.tsx` - Standard Sidepane Pattern (Rollenerstellung/Bearbeitung)
- `CreateOrganizationModal.tsx` - Standard Sidepane Pattern
- `JoinOrganizationModal.tsx` - Standard Sidepane Pattern
- `ProcessJoinRequestModal.tsx` - Standard Sidepane Pattern
- `CreateTourModal.tsx` - Standard Sidepane Pattern (**⚠️ UMGESTELLT 2025-01-27: War fälschlicherweise als zentriertes Modal implementiert**)
- `EditTourModal.tsx` - Standard Sidepane Pattern (**⚠️ UMGESTELLT 2025-01-27: War fälschlicherweise als zentriertes Modal implementiert**)
- `CreateTourProviderModal.tsx` - Standard Sidepane Pattern (**⚠️ UMGESTELLT 2025-01-27: War fälschlicherweise als zentriertes Modal implementiert**)
- `EditTourProviderModal.tsx` - Standard Sidepane Pattern (**⚠️ UMGESTELLT 2025-01-27: War fälschlicherweise als zentriertes Modal implementiert**)

**⚠️ Alternative Sidepane-Struktur (für komplexere Bearbeitungen):**
Die folgenden Komponenten verwenden eine alternative, komplexere Struktur für sehr umfangreiche Bearbeitungsformen mit separatem Header-Bereich. Diese sollte NUR für spezielle Fälle verwendet werden, NICHT als Standard:
- `InvoiceManagementTab.tsx` - Alternative Sidepane-Struktur (Rechnungsbearbeitung)
- `MonthlyReportsTab.tsx` - Alternative Sidepane-Struktur (Client-Beratungen Sidepane)

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
2. **Desktop (≥640px, ≤1070px)**: Werden als Sidepanes von rechts eingeschoben MIT Overlay (überlagern den Hauptinhalt)
3. **Large Desktop (>1070px)**: Werden als Sidepanes von rechts eingeschoben OHNE Overlay (schieben sich neben den Hauptinhalt)

**Implementierung der Responsive-Erkennung:**
```jsx
const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);

useEffect(() => {
  const checkScreenSize = () => {
    setIsMobile(window.innerWidth < 640);
    setIsLargeScreen(window.innerWidth > 1070);
  };
  
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  
  return () => {
    window.removeEventListener('resize', checkScreenSize);
  };
}, []);
```

**Verhalten bei > 1070px:**
- Kein Overlay/Backdrop
- Sidepane beginnt unter der Topbar (top-16)
- Hauptinhalt verschiebt sich nach links (margin-right: 24rem)
- Hauptinhalt bleibt scrollbar und aktiv
- Hauptinhalt und Sidepane sind gleichzeitig sichtbar und nutzbar

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
   - **Sidepanes für Create/Edit:** `CreateTaskModal.tsx`, `CreateRequestModal.tsx`, `EditTaskModal.tsx`, `EditRequestModal.tsx`, `CreateTourModal.tsx`, `EditTourModal.tsx`, `CreateTourProviderModal.tsx`, `EditTourProviderModal.tsx`
   - **Modals für Bestätigungen:** `ClientSelectModal.tsx` (wenn als Bestätigung verwendet)

**⚠️ KRITISCH: Standards beachten!**

**WICHTIGER HINWEIS (2025-01-27):** Die Tour-Komponenten (`CreateTourModal.tsx`, `EditTourModal.tsx`, `CreateTourProviderModal.tsx`, `EditTourProviderModal.tsx`) wurden **fälschlicherweise als zentrierte Modals** implementiert und mussten auf das **Standard-Sidepane-Pattern** umgestellt werden.

**Bei zukünftigen Implementierungen:**
- **IMMER** zuerst die bestehenden Standards prüfen (`DESIGN_STANDARDS.md`, `CODING_STANDARDS.md`)
- **IMMER** das Standard-Sidepane-Pattern für Create/Edit-Komponenten verwenden
- **NIEMALS** zentrierte Modals für Create/Edit-Komponenten implementieren
- **Referenz-Komponenten** als Vorlage verwenden: `CreateRequestModal.tsx`, `CreateTaskModal.tsx`

**Diese Standards müssen eingehalten werden, um Konsistenz im System zu gewährleisten!**
   
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
- [ ] Importiere `useSidepane` aus `../contexts/SidepaneContext.tsx`
- [ ] Verwende CreateTaskModal/CreateRequestModal Pattern als Basis
- [ ] Dialog mit `relative z-50`
- [ ] Backdrop: Nur bei <= 1070px anzeigen (`{!isLargeScreen && <div className="sidepane-overlay sidepane-backdrop" ... />}`)
- [ ] Sidepane Panel: `fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container`
- [ ] Transform-Animation: `transform transition-transform duration-350 ease-out` mit inline style: `transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'`
- [ ] Zustand: `${isOpen ? 'translate-x-0' : 'translate-x-full'}`
- [ ] Header: `flex items-center justify-between p-4 border-b dark:border-gray-700`
- [ ] Content: `p-4 overflow-y-auto h-full`
- [ ] Sidepane-Status verwalten: `useEffect` mit `openSidepane()` und `closeSidepane()`
- [ ] Bildschirmgröße überwachen: `isLargeScreen` State für > 1070px
- [ ] Dark Mode Support für alle Elemente
- [ ] Mobile: Automatisch als Modal rendern (siehe Mobile-Pattern oben)

**Wichtig:**
- ✅ **Standard-Pattern verwenden:** CreateTaskModal/CreateRequestModal Pattern für alle Create/Edit-Komponenten
- ✅ **Konsistente Implementierung:** Alle neuen Create/Edit-Komponenten müssen dem gleichen Pattern folgen
- ✅ **Transform-Animation:** Der Standard verwendet `transform transition-transform duration-300 ease-in-out` für Sidepanes
- ❌ **Keine isolierten Lösungen:** Nicht eigene Patterns erfinden, immer Standard verwenden
- ❌ **Keine inkonsistenten Abweichungen:** Abweichungen nur mit ausdrücklicher Begründung