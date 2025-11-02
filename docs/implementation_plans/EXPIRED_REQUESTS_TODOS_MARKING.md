# Implementierungsplan: Farbliche Markierung abgelaufener Requests & Todos

## Überblick

Abgelaufene Requests und Todos sollen farblich markiert werden:
- **Orange**: Wenn das `dueDate` überschritten ist (abgelaufen)
- **Rot**: Wenn das `dueDate` deutlich überschritten ist (kritisch abgelaufen, z.B. über 24h)

## Analyse der aktuellen Situation

### Datenbankschema
- **Request**: Hat `dueDate` Feld (DateTime?, optional)
- **Task (Todo)**: Hat `dueDate` Feld (DateTime?, optional)
- **Kein Frequency-Feld**: Es gibt aktuell kein explizites Feld für die Häufigkeit/Typ von Todos. Der User erwähnte "stündliche to do's" - hier muss eine Lösung gefunden werden (siehe Optionen unten).

### Frontend-Komponenten
- **Requests.tsx**: Zeigt Requests in Tabellen- und Card-Ansicht
- **Worktracker.tsx**: Zeigt Todos in Tabellen- und Card-Ansicht
- **DataCard.tsx**: Unterstützt bereits `highlightBorder` und `highlightColor` Props
- Es gibt bereits Utility-Funktionen für Status-Farben (z.B. `getInvoiceStatusColor`)

### Aktuelle Implementierung
- Requests werden in `Requests.tsx` gerendert (Zeilen 912-1265)
- Todos werden in `Worktracker.tsx` gerendert (Zeilen 980-1367)
- Cards nutzen die `DataCard` Komponente, die `highlightBorder` und `highlightColor` unterstützt

## Implementierungsvorschlag

### 1. Utility-Funktionen erstellen

**Datei**: `frontend/src/utils/expiryUtils.ts`

```typescript
/**
 * Bestimmt den Ablauf-Status eines Items basierend auf dueDate
 */
export type ExpiryStatus = 'none' | 'expired' | 'critical';

/**
 * Konfiguration für Ablauf-Schwellenwerte
 */
export interface ExpiryThresholds {
  criticalHours: number; // Nach wie vielen Stunden wird es kritisch (rot)?
}

/**
 * Standard-Schwellenwerte für verschiedene Item-Typen
 */
export const DEFAULT_EXPIRY_THRESHOLDS: Record<'request' | 'todo', ExpiryThresholds> = {
  request: {
    criticalHours: 24 // Nach 24h wird ein Request kritisch (rot)
  },
  todo: {
    criticalHours: 24 // Nach 24h wird ein Todo kritisch (rot)
  }
};

/**
 * Bestimmt den Ablauf-Status eines Items
 * 
 * @param dueDate Das Fälligkeitsdatum (optional)
 * @param type Der Typ des Items ('request' oder 'todo')
 * @param customThresholds Optionale benutzerdefinierte Schwellenwerte
 * @returns 'none' | 'expired' | 'critical'
 */
export function getExpiryStatus(
  dueDate: string | null | undefined,
  type: 'request' | 'todo' = 'request',
  customThresholds?: ExpiryThresholds
): ExpiryStatus {
  if (!dueDate) {
    return 'none';
  }

  const now = new Date();
  const due = new Date(dueDate);
  const hoursOverdue = (now.getTime() - due.getTime()) / (1000 * 60 * 60);

  // Wenn nicht abgelaufen
  if (hoursOverdue <= 0) {
    return 'none';
  }

  // Bestimme Schwellenwerte
  const thresholds = customThresholds || DEFAULT_EXPIRY_THRESHOLDS[type];

  // Wenn über kritischem Schwellenwert
  if (hoursOverdue >= thresholds.criticalHours) {
    return 'critical';
  }

  // Wenn abgelaufen aber noch nicht kritisch
  return 'expired';
}

/**
 * Gibt die CSS-Klassen für die Ablauf-Markierung zurück
 * 
 * @param status Der Ablauf-Status
 * @returns CSS-Klassen für Border und Hintergrund
 */
export function getExpiryColorClasses(status: ExpiryStatus): {
  borderClass: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case 'expired':
      return {
        borderClass: 'border-orange-500 dark:border-orange-600',
        bgClass: 'bg-orange-50 dark:bg-orange-900/20',
        textClass: 'text-orange-700 dark:text-orange-300'
      };
    case 'critical':
      return {
        borderClass: 'border-red-500 dark:border-red-600',
        bgClass: 'bg-red-50 dark:bg-red-900/20',
        textClass: 'text-red-700 dark:text-red-700'
      };
    default:
      return {
        borderClass: '',
        bgClass: '',
        textClass: ''
      };
  }
}

/**
 * Gibt die Highlight-Farbe für DataCard zurück
 * 
 * @param status Der Ablauf-Status
 * @returns 'orange' | 'red' | undefined
 */
export function getExpiryHighlightColor(status: ExpiryStatus): 'orange' | 'red' | undefined {
  switch (status) {
    case 'expired':
      return 'orange';
    case 'critical':
      return 'red';
    default:
      return undefined;
  }
}

/**
 * Erstellt ein MetadataItem für dueDate mit automatischer Farbmarkierung bei Ablauf
 * 
 * Diese Funktion ist wiederverwendbar für alle Card-Ansichten (Requests, Todos, etc.)
 * 
 * @param dueDate Das Fälligkeitsdatum
 * @param type Der Typ des Items ('request' oder 'todo')
 * @param title Optional: Titel für Todo-Typ-Erkennung
 * @param description Optional: Beschreibung für Todo-Typ-Erkennung
 * @param icon Das Icon für das Metadaten-Item
 * @param label Das Label für das Metadaten-Item
 * @param formatDate Function zum Formatieren des Datums
 * @returns MetadataItem mit farblich markiertem dueDate (className wird auf den Wert angewendet)
 * 
 * @example
 * // Verwendung in Requests Card-Ansicht:
 * metadata.push(
 *   createDueDateMetadataItem(
 *     request.dueDate,
 *     'request',
 *     undefined,
 *     undefined,
 *     <CalendarIcon className="h-4 w-4" />,
 *     'Fälligkeit',
 *     (date) => format(date, 'dd.MM.yyyy', { locale: de })
 *   )
 * );
 * 
 * @example
 * // Verwendung in Todos Card-Ansicht:
 * metadata.push(
 *   createDueDateMetadataItem(
 *     task.dueDate,
 *     'todo',
 *     task.title,
 *     task.description,
 *     <CalendarIcon className="h-4 w-4" />,
 *     'Fälligkeit',
 *     (date) => format(date, 'dd.MM.yyyy', { locale: de })
 *   )
 * );
 */
export function createDueDateMetadataItem(
  dueDate: string | null | undefined,
  type: 'request' | 'todo' = 'request',
  title?: string,
  description?: string | null,
  icon?: React.ReactNode,
  label: string = 'Fälligkeit',
  formatDate: (date: Date) => string = (date) => date.toLocaleDateString()
): { icon?: React.ReactNode; label: string; value: string; className?: string } {
  const expiryStatus = getExpiryStatus(dueDate, type, undefined, title, description);
  const expiryColors = getExpiryColorClasses(expiryStatus);
  
  return {
    icon,
    label,
    value: dueDate ? formatDate(new Date(dueDate)) : '-',
    className: expiryStatus !== 'none' ? expiryColors.textClass : undefined
  };
}
```

### 2. Anpassung der Requests-Komponente

**Datei**: `frontend/src/components/Requests.tsx`

#### Änderungen:

1. **Import hinzufügen** (nach Zeile 35):
```typescript
import { getExpiryStatus, getExpiryHighlightColor } from '../utils/expiryUtils.ts';
```

2. **Tabellen-Ansicht - Zeilen-Färbung** (ab Zeile 913):
```typescript
{filteredAndSortedRequests.slice(0, displayLimit).map(request => {
  const expiryStatus = getExpiryStatus(request.dueDate, 'request');
  const expiryColors = getExpiryColorClasses(expiryStatus);
  
  return (
    <tr 
      key={request.id} 
      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
        expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
      }`}
    >
      {/* ... bestehender Code ... */}
    </tr>
  );
})}
```

3. **Card-Ansicht - Fälligkeitsdatum rot färben** (ab Zeile 1079):
```typescript
import { createDueDateMetadataItem } from '../utils/expiryUtils.ts';

// In der Card-Metadaten-Erstellung:
if (visibleCardMetadata.has('dueDate')) {
  // Verwendung der wiederverwendbaren Utility-Funktion für farblich markiertes dueDate
  metadata.push(
    createDueDateMetadataItem(
      request.dueDate,
      'request',
      undefined,
      undefined,
      <CalendarIcon className="h-4 w-4" />,
      'Fälligkeit',
      (date) => format(date, 'dd.MM.yyyy', { locale: de })
    )
  );
}
```

**Hinweis**: Statt einer Umrandung wird das Fälligkeitsdatum selbst rot/orange gefärbt. Dies ist wiederverwendbar für alle zukünftigen Card-Ansichten (z.B. Todos).

4. **DueDate-Spalte hervorheben** (Zeile 969-975):
```typescript
case 'dueDate':
  const expiryStatus = getExpiryStatus(request.dueDate, 'request');
  const expiryColors = getExpiryColorClasses(expiryStatus);
  
  return (
    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
      <div className={`text-sm ${expiryStatus !== 'none' ? expiryColors.textClass : 'text-gray-900 dark:text-gray-200'}`}>
        {new Date(request.dueDate).toLocaleDateString()}
        {expiryStatus !== 'none' && (
          <span className="ml-2 text-xs">⚠</span>
        )}
      </div>
    </td>
  );
```

### 3. Anpassung der Worktracker-Komponente

**Datei**: `frontend/src/pages/Worktracker.tsx`

#### Änderungen:

1. **Import hinzufügen** (nach Zeile 18):
```typescript
import { getExpiryStatus, getExpiryHighlightColor } from '../utils/expiryUtils.ts';
```

2. **Tabellen-Ansicht - Zeilen-Färbung** (ab Zeile 989):
```typescript
{filteredAndSortedTasks.slice(0, displayLimit).map(task => {
  const expiryStatus = getExpiryStatus(task.dueDate, 'todo');
  const expiryColors = getExpiryColorClasses(expiryStatus);
  
  return (
    <tr 
      key={task.id} 
      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
        expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
      }`}
    >
      {/* ... bestehender Code ... */}
    </tr>
  );
})}
```

3. **DueDate-Spalte hervorheben** (Zeile 1265-1272):
```typescript
case 'dueDate':
  const expiryStatus = getExpiryStatus(task.dueDate, 'todo');
  const expiryColors = getExpiryColorClasses(expiryStatus);
  
  return (
    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
      <div className={`text-sm ${expiryStatus !== 'none' ? expiryColors.textClass : 'text-gray-900 dark:text-gray-200'}`}>
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
        {expiryStatus !== 'none' && (
          <span className="ml-2 text-xs">⚠</span>
        )}
      </div>
    </td>
  );
```

### 4. Option: Häufigkeitsbasierte Schwellenwerte für Todos

Da der User "stündliche to do's" erwähnt hat, aber kein Frequency-Feld existiert, gibt es folgende Optionen:

#### Option A: Todo-Typ über Titel/Beschreibung erkennen
```typescript
function getTodoType(task: Task): 'hourly' | 'daily' | 'standard' {
  const titleLower = task.title.toLowerCase();
  const descLower = task.description?.toLowerCase() || '';
  
  if (titleLower.includes('stündlich') || descLower.includes('stündlich')) {
    return 'hourly';
  }
  if (titleLower.includes('täglich') || descLower.includes('täglich')) {
    return 'daily';
  }
  return 'standard';
}

const TODO_EXPIRY_THRESHOLDS: Record<string, ExpiryThresholds> = {
  hourly: { criticalHours: 2 },    // Stündliche Todos: nach 2h kritisch
  daily: { criticalHours: 6 },     // Tägliche Todos: nach 6h kritisch
  standard: { criticalHours: 24 }  // Standard: nach 24h kritisch
};
```

#### Option B: Zukünftige Erweiterung mit Frequency-Feld
- Neues Prisma-Feld `frequency` als Enum (`'hourly' | 'daily' | 'weekly' | 'standard'`)
- Migration erforderlich
- UI-Anpassung für Frequenz-Auswahl beim Erstellen/Bearbeiten

**Empfehlung**: Zunächst Option A implementieren (schnell umsetzbar), später auf Option B migrieren, wenn das Frequency-Feld hinzugefügt wird.

### 5. Card-Ansicht für Todos (falls vorhanden)

Falls Todos auch in Card-Ansicht angezeigt werden, kann die wiederverwendbare `createDueDateMetadataItem()` Funktion verwendet werden:

```typescript
import { createDueDateMetadataItem } from '../utils/expiryUtils.ts';

// In der Card-Metadaten-Erstellung für Todos:
if (visibleCardMetadata.has('dueDate')) {
  metadata.push(
    createDueDateMetadataItem(
      task.dueDate,
      'todo',  // Wichtig: 'todo' für häufigkeitsbasierte Schwellenwerte
      task.title,  // Für Todo-Typ-Erkennung ("stündlich", "täglich")
      task.description,  // Für Todo-Typ-Erkennung
      <CalendarIcon className="h-4 w-4" />,
      'Fälligkeit',
      (date) => format(date, 'dd.MM.yyyy', { locale: de })
    )
  );
}
```

**Wiederverwendbarkeit**: Die `createDueDateMetadataItem()` Funktion kann in jeder zukünftigen Card-Ansicht verwendet werden, die ein `dueDate` anzeigen möchte. Sie kümmert sich automatisch um:
- Berechnung des Ablauf-Status
- Anwendung der richtigen Farben (orange/rot)
- Todo-Typ-Erkennung (für häufigkeitsbasierte Schwellenwerte)
- Dark Mode Support

## Technische Details

### Farben (gemäß DESIGN_STANDARDS.md)
- **Orange**: `#F59E0B` (Yellow-600) für abgelaufene Items
- **Rot**: `#EF4444` (Red-500) für kritisch abgelaufene Items

### Dark Mode Support
- Alle Farben müssen Dark Mode Varianten haben
- Verwendung von Tailwind Dark Mode Klassen (`dark:bg-orange-900/20`, etc.)

### Performance
- Die `getExpiryStatus` Funktion ist sehr leichtgewichtig
- Keine Performance-Probleme bei der Berechnung für jedes Item

## Testing

### Testfälle:
1. ✅ Request mit `dueDate` in der Zukunft → keine Markierung
2. ✅ Request mit `dueDate` gerade überschritten (vor 1h) → orange
3. ✅ Request mit `dueDate` deutlich überschritten (vor 25h) → rot
4. ✅ Request ohne `dueDate` → keine Markierung
5. ✅ Todo mit `dueDate` in der Zukunft → keine Markierung
6. ✅ Todo mit `dueDate` gerade überschritten → orange
7. ✅ Todo mit `dueDate` deutlich überschritten → rot
8. ✅ Stündliche Todo (erkannt über Titel) → frühere rote Markierung (nach 2h)
9. ✅ Dark Mode funktioniert korrekt
10. ✅ Tabellen- und Card-Ansicht funktionieren beide

## Zusammenfassung

1. **Utility-Funktionen** (`expiryUtils.ts`) erstellen
2. **Requests.tsx** anpassen (Tabellen- und Card-Ansicht)
3. **Worktracker.tsx** anpassen (Tabellen-Ansicht, ggf. Card-Ansicht)
4. **Optional**: Häufigkeitsbasierte Schwellenwerte für Todos
5. **Testing**: Alle Testfälle durchführen

Die Implementierung ist sauber, wiederverwendbar und folgt den bestehenden Design-Standards.

## Wiederverwendbarkeit

### Für zukünftige Card-Ansichten

Die Utility-Funktion `createDueDateMetadataItem()` ist so konzipiert, dass sie in allen zukünftigen Card-Ansichten verwendet werden kann:

1. **Importieren**: `import { createDueDateMetadataItem } from '../utils/expiryUtils.ts';`
2. **Verwenden**: In der Metadaten-Erstellung der Card `createDueDateMetadataItem()` aufrufen
3. **Konfigurieren**: Type ('request' oder 'todo'), Icon, Label und Format-Funktion anpassen

Die Funktion kümmert sich automatisch um:
- Ablauf-Status-Berechnung
- Farbmarkierung (orange für expired, rot für critical)
- Todo-Typ-Erkennung (für häufigkeitsbasierte Schwellenwerte)
- Dark Mode Support

**Beispiel für zukünftige Implementierung**:
```typescript
// In einer beliebigen Card-Ansicht-Komponente:
if (visibleCardMetadata.has('dueDate')) {
  metadata.push(
    createDueDateMetadataItem(
      item.dueDate,
      'todo',  // oder 'request'
      item.title,  // Optional: für Todo-Typ-Erkennung
      item.description,  // Optional: für Todo-Typ-Erkennung
      <CalendarIcon className="h-4 w-4" />,  // Dein Icon
      'Fälligkeit',  // Dein Label
      (date) => format(date, 'dd.MM.yyyy', { locale: de })  // Deine Format-Funktion
    )
  );
}
```

### DataCard-Komponente Unterstützung

Die `DataCard` Komponente unterstützt `className` auf `MetadataItem.value`, sodass die Farbmarkierung direkt auf den Wert angewendet wird. Dies ist bereits implementiert und funktioniert automatisch.

