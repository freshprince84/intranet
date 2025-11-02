# Card-Design Vorschläge für Tabellen

## Übersicht

Dieses Dokument enthält detaillierte Vorschläge für die Umstellung von Tabellen auf Card-basierte Darstellungen für folgende Listen:
- Requests
- To Do's (Tasks)
- Workcenter
- Beratungsrechnungen
- Monatsabrechnungen
- Lohnabrechnungen (hat bereits Karten, keine Tabelle)

## Allgemeine Card-Design-Prinzipien

### Basis-Card-Struktur

```css
/* Standard-Card */
.card {
  background-color: white;
  border-radius: 0.5rem;
  border: 1px solid #E5E7EB;
  padding: 1rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s, transform 0.2s;
}

.card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* Dark Mode */
.dark .card {
  background-color: #1F2937;
  border-color: #4B5563;
}
```

### Responsive Grid-Layout

- **Mobile (<640px)**: 1 Spalte
- **Tablet (640px-1024px)**: 2 Spalten
- **Desktop (>1024px)**: 3 Spalten
- **Large Desktop (>1280px)**: 4 Spalten (optional)

### Card-Komponenten

Jede Card sollte enthalten:
1. **Header-Bereich**: Titel/Identifikation + Status-Badge
2. **Hauptinhalt**: Wichtigste Informationen (2-4 Zeilen)
3. **Metadaten**: Zusätzliche Infos (Datum, Personen, etc.)
4. **Action-Bereich**: Aktionen (bearbeiten, löschen, etc.)

---

## 1. Requests - Card-Design

### Aktuelle Tabellenspalten
- Titel
- Status
- Angefragt von / Verantwortlicher
- Niederlassung
- Fälligkeit
- Aktionen

### Card-Vorschlag

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {filteredRequests.map(request => (
    <div 
      key={request.id}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header mit Titel und Status */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 pr-2 line-clamp-2">
          {request.title}
        </h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)} flex-shrink-0`}>
          {getStatusText(request.status, 'request')}
        </span>
      </div>

      {/* Beschreibung Icon (falls vorhanden) */}
      {request.description && (
        <div className="mb-3">
          <InformationCircleIcon className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Hauptinhalt */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <UserIcon className="h-3 w-3 mr-1" />
          <span className="font-medium">Angefr.:</span>
          <span className="ml-1">{request.requestedBy.firstName} {request.requestedBy.lastName}</span>
        </div>
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <UserIcon className="h-3 w-3 mr-1" />
          <span className="font-medium">Verantw.:</span>
          <span className="ml-1">{request.responsible.firstName} {request.responsible.lastName}</span>
        </div>
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
          <span>{request.branch.name}</span>
        </div>
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <CalendarIcon className="h-3 w-3 mr-1" />
          <span className="font-medium">Fällig:</span>
          <span className="ml-1">{format(new Date(request.dueDate), 'dd.MM.yyyy')}</span>
        </div>
      </div>

      {/* Action-Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* Status-Buttons */}
        {request.status === 'approval' && hasPermission('requests', 'write', 'table') && (
          <>
            <button
              onClick={() => handleStatusChange(request.id, 'approved')}
              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
              title="Genehmigen"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleStatusChange(request.id, 'denied')}
              className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
              title="Ablehnen"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </>
        )}
        {hasPermission('requests', 'write', 'table') && (
          <button
            onClick={() => handleEdit(request)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="Bearbeiten"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  ))}
</div>
```

### Besondere Features
- **Hover-Effekt**: Leichte Schattenverstärkung und leichte Bewegung nach oben
- **Line-Clamp**: Titel auf 2 Zeilen begrenzt mit "..."
- **Status-Badge**: Oben rechts positioniert
- **Icons**: Kleine Icons vor jedem Metadaten-Feld für bessere Lesbarkeit

---

## 2. To Do's (Tasks) - Card-Design

### Aktuelle Tabellenspalten
- Titel
- Status
- Verantwortlich / Qualitätskontrolle
- Niederlassung
- Fälligkeitsdatum
- Aktionen

### Card-Vorschlag

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {filteredTasks.map(task => (
    <div 
      key={task.id}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header mit Titel und Status */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 pr-2 line-clamp-2">
          {task.title}
        </h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)} flex-shrink-0`}>
          {getStatusText(task.status, 'task')}
        </span>
      </div>

      {/* Beschreibung Icon (falls vorhanden) */}
      {task.description && (
        <div className="mb-3">
          <InformationCircleIcon className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Hauptinhalt */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <UserIcon className="h-3 w-3 mr-1" />
          <span className="font-medium">Verantw.:</span>
          <span className="ml-1">
            {task.responsible 
              ? `${task.responsible.firstName} ${task.responsible.lastName}`
              : task.role 
              ? task.role.name
              : '-'
            }
          </span>
        </div>
        {task.qualityControl && (
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <ShieldCheckIcon className="h-3 w-3 mr-1" />
            <span className="font-medium">QK:</span>
            <span className="ml-1">{task.qualityControl.firstName} {task.qualityControl.lastName}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
          <span>{task.branch.name}</span>
        </div>
        {task.dueDate && (
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-3 w-3 mr-1" />
            <span className="font-medium">Fällig:</span>
            <span className="ml-1">{format(new Date(task.dueDate), 'dd.MM.yyyy')}</span>
          </div>
        )}
      </div>

      {/* Action-Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* Status-Buttons */}
        <div className="status-buttons">
          {renderStatusButtons(task)}
        </div>
        {hasPermission('tasks', 'write', 'table') && (
          <button
            onClick={() => handleEdit(task)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="Bearbeiten"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
        {hasPermission('tasks', 'both', 'table') && (
          <button
            onClick={() => handleCopyTask(task)}
            className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400"
            title="Kopieren"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  ))}
</div>
```

### Besondere Features
- **Zweispaltige Personenanzeige**: Verantwortlicher und Qualitätskontrolle getrennt
- **Flexible Zuständigkeit**: Unterstützt sowohl Personen als auch Rollen
- **Status-Buttons**: Vollständige Status-Workflow-Buttons am unteren Rand

---

## 3. Workcenter - Card-Design

### Aktuelle Tabellenspalten
- Name
- Startzeit
- Arbeitszeit
- Pausen
- Niederlassung
- Aktionen

### Card-Vorschlag

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {filteredUsers.map(group => (
    <div 
      key={group.user.id}
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-shadow ${
        group.hasActiveWorktime 
          ? 'border-green-500 dark:border-green-600' 
          : 'border-gray-300 dark:border-gray-700'
      }`}
    >
      {/* Header mit Name und Aktivitätsindikator */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {group.user.firstName} {group.user.lastName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{group.user.username}</p>
        </div>
        {group.hasActiveWorktime && (
          <div className="flex-shrink-0">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Hauptinhalt - Zeitinformationen */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            Start:
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {format(group.startTime, 'HH:mm')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            Arbeitszeit:
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {formatDistanceToNow(new Date(Date.now() - group.totalDuration), { locale: de, addSuffix: false })}
          </span>
        </div>
        {group.totalPauseTime > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              Pausen:
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatDistanceToNow(new Date(Date.now() - group.totalPauseTime), { locale: de, addSuffix: false })}
            </span>
          </div>
        )}
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
          <BuildingOfficeIcon className="h-3 w-3 mr-1" />
          <span>{group.branch.name}</span>
        </div>
      </div>

      {/* Action-Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        {group.hasActiveWorktime && (
          <button
            onClick={() => handleOpenStopModal(group)}
            className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
            title="Zeiterfassung stoppen"
          >
            <StopIcon className="h-4 w-4" />
          </button>
        )}
        {hasPermission('team_worktime_control', 'both', 'page') && (
          <button
            onClick={() => handleOpenEditModal(group)}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title="Zeiterfassungen bearbeiten"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  ))}
</div>
```

### Besondere Features
- **Aktiver Status-Highlight**: Grüner Rahmen und pulsierender Punkt für aktive Zeiterfassung
- **Zeitanzeige**: Hervorgehobene Arbeitszeit in der Mitte
- **Dynamische Zeitberechnung**: Zeigt aktuelle Dauer für laufende Zeiterfassungen

---

## 4. Beratungsrechnungen - Card-Design

### Aktuelle Tabellenspalten
- Expand (Details)
- Rechnungsnummer
- Kunde
- Rechnungsdatum
- Fälligkeitsdatum
- Betrag
- Status
- Aktionen

### Card-Vorschlag

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {filteredInvoices.map(invoice => (
    <div 
      key={invoice.id}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header mit Rechnungsnummer und Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
            {invoice.invoiceNumber}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {format(new Date(invoice.issueDate), 'dd.MM.yyyy', { locale: de })}
          </p>
        </div>
        <div className="flex-shrink-0 ml-2">
          {getStatusBadge(invoice.status)}
        </div>
      </div>

      {/* Hauptinhalt */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <span className="font-medium text-gray-900 dark:text-white">
            {invoice.client.name}
          </span>
          {invoice.client.company && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              ({invoice.client.company})
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Fällig:
          </span>
          <span className={`font-medium ${
            new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}>
            {format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de })}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Betrag:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {invoice.currency} {Number(invoice.total).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Action-Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => openEditSidepane(invoice)}
          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400"
          title="Bearbeiten"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        {canDownloadInvoices && (
          <button
            onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
            className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400"
            title="PDF herunterladen"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
          </button>
        )}
        {canEditInvoices && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
          <button
            onClick={() => handleMarkAsPaid(invoice.id)}
            className="p-1.5 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400"
            title="Als bezahlt markieren"
          >
            <CurrencyDollarIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  ))}
</div>
```

### Besondere Features
- **Hervorgehobener Betrag**: Große, fetter Betrag als visueller Fokuspunkt
- **Fälligkeitsdatum-Warnung**: Rote Farbe bei überfälligen Rechnungen
- **Expandable Details**: Könnte durch Klick auf die Card geöffnet werden (Modal/Sidepane)

---

## 5. Monatsabrechnungen - Card-Design

### Aktuelle Tabellenspalten
- Expand (Details)
- Berichtsnummer
- Zeitraum
- Empfänger
- Stunden
- Status
- Aktionen

### Card-Vorschlag

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {reports.map(report => (
    <div 
      key={report.id}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header mit Berichtsnummer und Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
            {report.reportNumber}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {format(new Date(report.generatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
          </p>
        </div>
        <div className="flex-shrink-0 ml-2">
          <div className="flex items-center">
            {getStatusIcon(report.status)}
            <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
              {getStatusText(report.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Hauptinhalt */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Zeitraum:
          </span>
          <span className="font-medium text-gray-900 dark:text-white text-xs text-right">
            {format(new Date(report.periodStart), 'dd.MM.yyyy', { locale: de })}<br />
            - {format(new Date(report.periodEnd), 'dd.MM.yyyy', { locale: de })}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Empfänger:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">
            {report.recipient}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Stunden:</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {Number(report.totalHours).toFixed(2)} h
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {report.items?.length || 0} Positionen
        </div>
      </div>

      {/* Action-Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => downloadPDF(report)}
          className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400"
          title="PDF herunterladen"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => toggleExpanded(report.id)}
          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400"
          title="Details anzeigen"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedRows.has(report.id) ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expandable Details */}
      {expandedRows.has(report.id) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            {report.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="text-gray-900 dark:text-white">{item.clientName}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {Number(item.totalHours).toFixed(2)} h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ))}
</div>
```

### Besondere Features
- **Expandable Cards**: Details können in der Card selbst ausgeklappt werden
- **Hervorgehobene Stunden**: Große, blaue Stunden-Anzeige als Hauptmetrik
- **Positionen-Übersicht**: Anzahl der Positionen als zusätzliche Info

---

## 6. Lohnabrechnungen

**Status**: Hat bereits Card-Design (keine Tabelle vorhanden)

Die aktuelle Implementierung in `PayrollComponent.tsx` verwendet bereits ein Card-basiertes Design mit 4 Karten für:
- Arbeitsstunden
- Bruttolohn
- Abzüge
- Nettolohn

**Keine Änderung erforderlich** - Das Design ist bereits optimal.

---

## Weitere gefundene Tabellen

Bei der Analyse wurden weitere Tabellen im System gefunden:

### Clients (Consultations)
- **Datei**: `ConsultationList.tsx`
- **Status**: Könnte auch auf Cards umgestellt werden
- **Aktuelle Darstellung**: Liste/Table

### Users (UserManagement)
- **Datei**: `UserManagementTab.tsx`
- **Status**: Könnte auch auf Cards umgestellt werden
- **Aktuelle Darstellung**: Tabelle

### Roles (UserManagement)
- **Datei**: `RoleManagementTab.tsx`
- **Status**: Könnte auch auf Cards umgestellt werden
- **Aktuelle Darstellung**: Tabelle

---

## Implementierungsvorschläge

### 1. Gemeinsame Card-Komponente erstellen

```tsx
// components/shared/DataCard.tsx
interface DataCardProps {
  title: string;
  status?: {
    label: string;
    color: string;
  };
  metadata: Array<{
    icon?: React.ReactNode;
    label: string;
    value: string | React.ReactNode;
  }>;
  actions?: React.ReactNode;
  expandable?: {
    isExpanded: boolean;
    content: React.ReactNode;
    onToggle: () => void;
  };
  onClick?: () => void;
}
```

### 2. Responsive Grid-Wrapper

```tsx
// components/shared/CardGrid.tsx
interface CardGridProps {
  children: React.ReactNode;
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
    largeDesktop: number;
  };
}
```

### 3. Filter- und Suchfunktionalität beibehalten

- Alle bestehenden Filter und Suchfunktionen müssen auch bei Card-Ansicht funktionieren
- Filter-UI kann oberhalb des Grids platziert werden
- Gespeicherte Filter-Tags bleiben unverändert

### 4. Toggle zwischen Tabellen- und Card-Ansicht

**Vorschlag**: Ein Toggle-Button in der Header-Zeile jeder Liste:

```tsx
<button
  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
  className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
  title={viewMode === 'table' ? 'Als Cards anzeigen' : 'Als Tabelle anzeigen'}
>
  {viewMode === 'table' ? (
    <Squares2X2Icon className="h-5 w-5" />
  ) : (
    <TableCellsIcon className="h-5 w-5" />
  )}
</button>
```

Dies ermöglicht es Benutzern, zwischen beiden Ansichten zu wechseln, je nach Präferenz und Kontext.

---

## Vorteile der Card-Ansicht

1. **Bessere Mobile-Erfahrung**: Cards funktionieren auf kleinen Bildschirmen besser als horizontales Scrollen
2. **Visuelle Hierarchie**: Wichtige Informationen können besser hervorgehoben werden
3. **Scanbarkeit**: Einzelne Einträge sind leichter zu scannen
4. **Flexibilität**: Einfacher, unterschiedliche Informationen für verschiedene Entitäten hervorzuheben
5. **Moderne UX**: Cards sind ein etabliertes Pattern in modernen Web-Anwendungen

---

## Migration-Strategie

### Phase 1: Gemeinsame Komponenten
- `DataCard.tsx` erstellen
- `CardGrid.tsx` erstellen
- Design-Tokens definieren

### Phase 2: Erste Umstellung (Requests)
- Requests-Komponente auf Cards umstellen
- Toggle zwischen Tabellen- und Card-Ansicht implementieren
- Feedback sammeln

### Phase 3: Weitere Umstellungen
- To Do's
- Workcenter
- Beratungsrechnungen
- Monatsabrechnungen

### Phase 4: Optionale Erweiterungen
- Clients
- Users
- Roles

---

## Design-Konsistenz

Alle Cards müssen folgenden Standards entsprechen:

- **Padding**: 1rem (16px)
- **Border-Radius**: 0.5rem (8px)
- **Border**: 1px solid #E5E7EB (Light) / #4B5563 (Dark)
- **Shadow**: `shadow-sm` mit `hover:shadow-md`
- **Spacing**: Gap von 1rem (16px) zwischen Cards
- **Typography**: Konsistent mit Design-Standards
- **Dark Mode**: Vollständige Unterstützung

---

## Nächste Schritte

1. ✅ Vorschläge erstellt
2. ⏳ Feedback einholen
3. ⏳ Gemeinsame Komponenten implementieren
4. ⏳ Erste Komponente (Requests) umstellen
5. ⏳ Weitere Komponenten schrittweise migrieren



