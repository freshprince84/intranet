# CODING STANDARDS

Dieses Dokument definiert die verbindlichen Coding-Standards für das Intranet-Projekt. Alle Entwickler müssen diese Standards einhalten, um eine konsistente Codequalität zu gewährleisten.

## Inhaltsverzeichnis

1. [Allgemeine Richtlinien](#allgemeine-richtlinien)
2. [TypeScript-Standards](#typescript-standards)
3. [React Best Practices](#react-best-practices)
4. [HTTP-Client-Standards](#http-client-standards)
5. [Zeitzonenbehandlung](#zeitzonenbehandlung)
6. [Fehlerbehandlung](#fehlerbehandlung)
7. [Kommentare und Dokumentation](#kommentare-und-dokumentation)
8. [Testing](#testing)
9. [Performance](#performance)
10. [DRY-Implementierung für UI-Komponenten](#dry-implementierung-für-ui-komponenten)

## Allgemeine Richtlinien

- **Konsistenz**: Halte dich an die bestehenden Muster und Konventionen im Code
- **Lesbarkeit**: Schreibe lesbaren und selbsterklärenden Code
- **Einfachheit**: Bevorzuge einfache Lösungen gegenüber komplexen
- **DRY (Don't Repeat Yourself)**: Vermeide Codeduplizierung
- **KISS (Keep It Simple, Stupid)**: Halte den Code so einfach wie möglich
- **YAGNI (You Aren't Gonna Need It)**: Implementiere nur Funktionen, die tatsächlich benötigt werden

## TypeScript-Standards

### Import-Pfade Regeln

**Frontend-Imports (MIT .ts/.tsx Endung):**
```typescript
// RICHTIG für FRONTEND:
import Button from '../components/Button.tsx';
import { someFunction } from '../utils/helpers.ts';
import api from './apiClient.ts';

// FALSCH für FRONTEND:
import Button from '../components/Button';
import { someFunction } from '../utils/helpers';
import api from './apiClient';
```

**Backend-Imports (OHNE .ts Endung):**
```typescript
// RICHTIG für BACKEND:
import express from 'express';
import { someFunction } from '../utils/helpers';
import * as controller from '../controllers/myController';

// FALSCH für BACKEND:
import express from 'express';
import { someFunction } from '../utils/helpers.ts';
import * as controller from '../controllers/myController.ts';
```

### Typdefinitionen

- **Explizite Typen für Props**: Definiere immer explizite Typen für Komponenten-Props
  ```typescript
  interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }
  
  const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
    // ...
  };
  ```

- **useState mit Typparameter**: Verwende den Typparameter für useState
  ```typescript
  // RICHTIG
  const [value, setValue] = useState<string>('');
  
  // FALSCH
  const [value, setValue] = useState('');
  ```

- **Interfaces vs. Types**: Bevorzuge Interfaces für bessere Erweiterbarkeit
  ```typescript
  // BEVORZUGT
  interface User {
    id: number;
    name: string;
  }
  
  // WENIGER BEVORZUGT
  type User = {
    id: number;
    name: string;
  };
  ```

- **Enums für konstante Werte**: Verwende Enums für konstante Werte
  ```typescript
  enum TaskStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    DONE = 'done',
    TO_CHECK = 'to_check'
  }
  ```

### Namenskonventionen

- **PascalCase** für Komponenten, Interfaces, Types, Enums
- **camelCase** für Variablen, Funktionen, Methoden
- **UPPER_CASE** für Konstanten
- **kebab-case** für CSS-Klassen und Dateinamen

## React Best Practices

### Funktionale Komponenten

Verwende funktionale Komponenten mit Hooks statt Klassenkomponenten:

```typescript
// RICHTIG
const MyComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>{count}</div>
  );
};

// FALSCH
class MyComponent extends React.Component {
  state = {
    count: 0
  };
  
  render() {
    return (
      <div>{this.state.count}</div>
    );
  }
}
```

### Hooks

- **useCallback** für Funktionen, die als Props übergeben werden oder in Abhängigkeitsarrays verwendet werden
  ```typescript
  const handleClick = useCallback(() => {
    // ...
  }, [dependency1, dependency2]);
  ```

- **useMemo** für teure Berechnungen
  ```typescript
  const expensiveValue = useMemo(() => {
    return computeExpensiveValue(a, b);
  }, [a, b]);
  ```

- **useEffect** mit korrekten Abhängigkeiten
  ```typescript
  useEffect(() => {
    // Effekt
    return () => {
      // Cleanup
    };
  }, [dependency1, dependency2]); // Alle Abhängigkeiten angeben
  ```

### Vermeidung von Prop Drilling

Verwende Context oder State Management für tief verschachtelte Props:

```typescript
// Context erstellen
const UserContext = createContext<User | null>(null);

// Provider in einer höheren Komponente
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <UserContext.Provider value={user}>
      <MainContent />
    </UserContext.Provider>
  );
};

// Verwendung in einer tiefer verschachtelten Komponente
const UserProfile: React.FC = () => {
  const user = useContext(UserContext);
  
  if (!user) return null;
  
  return (
    <div>{user.name}</div>
  );
};
```

## HTTP-Client-Standards

### Verwendung von axios

Das Projekt verwendet **axios** als primären HTTP-Client. Die Verwendung von `fetch` ist nur in Ausnahmefällen erlaubt, wenn spezifische Funktionen benötigt werden, die axios nicht bietet.

### Zentrale API-Konfiguration

Alle API-Aufrufe müssen über die zentrale Konfiguration in `frontend/src/config/api.ts` erfolgen:

```typescript
// RICHTIG
import { API_URL, API_ENDPOINTS } from '../config/api.ts';
import { axiosInstance } from '../utils/axiosConfig.ts';

// API-Aufruf mit axiosInstance
const fetchData = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.USERS.GET_ALL);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
```

### axiosInstance vs. direktes axios

Verwende immer die konfigurierte `axiosInstance` statt direktem `axios`:

```typescript
// RICHTIG
import { axiosInstance } from '../utils/axiosConfig.ts';

const response = await axiosInstance.get('/users');

// FALSCH
import axios from 'axios';

const response = await axios.get('/users');
```

Die `axiosInstance` ist mit den korrekten Basis-URL, Timeouts, Interceptors und Fehlerbehandlung vorkonfiguriert.

### API-Endpunkte

Verwende die definierten API_ENDPOINTS-Konstanten statt hartcodierter URLs:

```typescript
// RICHTIG
import { API_ENDPOINTS } from '../config/api.ts';

const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE);

// FALSCH
const response = await axiosInstance.get('/api/worktime/active');
```

### Fehlerbehandlung bei API-Aufrufen

Implementiere immer eine angemessene Fehlerbehandlung bei API-Aufrufen:

```typescript
try {
  const response = await axiosInstance.get(API_ENDPOINTS.USERS.GET_ALL);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Der Server hat mit einem Fehlerstatuscode geantwortet
      console.error('Server error:', error.response.status, error.response.data);
      
      // Spezifische Fehlerbehandlung basierend auf Statuscode
      if (error.response.status === 401) {
        // Nicht authentifiziert
        handleUnauthenticated();
      } else if (error.response.status === 403) {
        // Nicht autorisiert
        handleUnauthorized();
      } else {
        // Andere Serverfehler
        handleServerError(error.response.data);
      }
    } else if (error.request) {
      // Die Anfrage wurde gesendet, aber keine Antwort erhalten
      console.error('Network error:', error.request);
      handleNetworkError();
    } else {
      // Fehler beim Einrichten der Anfrage
      console.error('Request setup error:', error.message);
      handleRequestSetupError();
    }
  } else {
    // Nicht-Axios-Fehler
    console.error('Unexpected error:', error);
    handleUnexpectedError();
  }
}
```

### Authentifizierung

Für authentifizierte Anfragen muss der Authorization-Header korrekt gesetzt sein:

```typescript
// Dies wird automatisch von axiosInstance gehandhabt, aber bei Bedarf:
const token = localStorage.getItem('token');
if (token) {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
```

## Zeitzonenbehandlung

Die korrekte Behandlung von Zeitzonen ist kritisch für die Zeiterfassung. Folge diesen Richtlinien:

### Lokale Systemzeit verwenden

```typescript
// RICHTIG - Korrigiert für Zeitzonenverschiebung
const correctedDate = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);

// FALSCH - Führt zu Zeitzonenverschiebungen
const wrongDate = new Date().toISOString();
```

### ISO-Strings ohne 'Z'

```typescript
// RICHTIG - Entfernt das 'Z' am Ende
const correctIsoString = isoString.endsWith('Z') 
  ? isoString.substring(0, isoString.length - 1)
  : isoString;

// FALSCH - Behält das 'Z' bei
const wrongIsoString = new Date().toISOString();
```

Weitere Details zur Zeitzonenbehandlung findest du im Dokument [MODUL_ZEITERFASSUNG.md](MODUL_ZEITERFASSUNG.md).

## Fehlerbehandlung

### Try-Catch-Blöcke

Verwende try-catch-Blöcke für asynchrone Operationen und Operationen, die fehlschlagen können:

```typescript
try {
  const result = await riskyOperation();
  handleSuccess(result);
} catch (error) {
  handleError(error);
} finally {
  cleanup();
}
```

### Fehlertypen

Unterscheide zwischen verschiedenen Fehlertypen für eine spezifischere Behandlung:

```typescript
try {
  // ...
} catch (error) {
  if (error instanceof ValidationError) {
    handleValidationError(error);
  } else if (error instanceof NetworkError) {
    handleNetworkError(error);
  } else {
    handleGenericError(error);
  }
}
```

### Benutzerfreundliche Fehlermeldungen

Zeige benutzerfreundliche Fehlermeldungen an, nicht technische Details:

```typescript
try {
  // ...
} catch (error) {
  // RICHTIG
  setErrorMessage('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
  
  // FALSCH
  setErrorMessage(`Error: ${error.message}, Stack: ${error.stack}`);
  
  // Logge technische Details für Debugging
  console.error('Technical error details:', error);
}
```

## Kommentare und Dokumentation

### Kommentare

- Kommentiere komplexe Logik und Algorithmen
- Erkläre, warum etwas gemacht wird, nicht was gemacht wird
- Verwende JSDoc für Funktionen und Komponenten

```typescript
/**
 * Berechnet die Gesamtarbeitszeit für einen bestimmten Tag.
 * 
 * @param worktimes - Array von Worktime-Objekten
 * @param date - Das Datum, für das die Arbeitszeit berechnet werden soll
 * @returns Die Gesamtarbeitszeit in Minuten
 */
const calculateTotalWorktime = (worktimes: Worktime[], date: Date): number => {
  // ...
};
```

### TODO-Kommentare

Verwende TODO-Kommentare für zukünftige Verbesserungen, aber vermeide es, sie im Produktionscode zu belassen:

```typescript
// TODO: Implementiere Paginierung für große Datensätze
```

## Testing

### Unit Tests

Schreibe Unit-Tests für kritische Funktionen und Komponenten:

```typescript
describe('calculateTotalWorktime', () => {
  it('should return 0 for empty worktimes array', () => {
    expect(calculateTotalWorktime([], new Date())).toBe(0);
  });
  
  it('should calculate total worktime correctly', () => {
    const worktimes = [
      { startTime: '2023-05-15T08:00:00', endTime: '2023-05-15T12:00:00' },
      { startTime: '2023-05-15T13:00:00', endTime: '2023-05-15T17:00:00' }
    ];
    expect(calculateTotalWorktime(worktimes, new Date('2023-05-15'))).toBe(480);
  });
});
```

### Mocking

Verwende Mocks für externe Abhängigkeiten in Tests:

```typescript
jest.mock('../api/worktimeApi', () => ({
  fetchWorktimes: jest.fn().mockResolvedValue([
    { id: 1, startTime: '2023-05-15T08:00:00', endTime: '2023-05-15T17:00:00' }
  ])
}));
```

## Performance

### Memoization

Verwende Memoization für teure Berechnungen:

```typescript
const memoizedValue = useMemo(() => {
  return expensiveCalculation(a, b);
}, [a, b]);
```

### Virtualisierung

Verwende Virtualisierung für lange Listen:

```typescript
import { FixedSizeList } from 'react-window';

const MyList = ({ items }) => (
  <FixedSizeList
    height={500}
    width={500}
    itemCount={items.length}
    itemSize={50}
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </FixedSizeList>
);
```

### Code-Splitting

Verwende Code-Splitting für große Komponenten:

```typescript
const LazyComponent = React.lazy(() => import('./LazyComponent'));

const MyComponent = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <LazyComponent />
  </React.Suspense>
);
```

## DRY-Implementierung für UI-Komponenten

### Zentrale Hilfsfunktionen für Tabellen-Komponenten

#### Status-Farben und -Texte

Um das DRY-Prinzip ("Don't Repeat Yourself") einzuhalten, müssen Status-Farben und -Texte in einer zentralen Utility-Datei definiert werden:

```typescript
// src/utils/statusUtils.ts

/**
 * Gibt die CSS-Klasse für einen Status zurück
 */
export const getStatusColor = (status: string): string => {
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

/**
 * Gibt den übersetzten Status-Text zurück
 */
export const getStatusText = (status: string, processType?: 'task' | 'request' | 'default'): string => {
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

/**
 * Rendert ein Status-Badge
 */
export const StatusBadge = ({ status, processType }: { status: string, processType?: 'task' | 'request' | 'default' }) => (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)} status-col`}>
        {getStatusText(status, processType)}
    </span>
);
```

#### Aktions-Buttons in Tabellen

Für Aktions-Buttons (Bearbeiten, Löschen, Anzeigen) sollte ebenfalls eine wiederverwendbare Komponente erstellt werden:

```typescript
// src/components/common/ActionButton.tsx
import React from 'react';
import { ComponentType, SVGProps } from 'react';

interface ActionButtonProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    label: string;
    onClick: () => void;
    color: 'blue' | 'red' | 'green' | 'gray';
    disabled?: boolean;
}

/**
 * Wiederverwendbare Komponente für Aktions-Buttons in Tabellen
 */
export const ActionButton: React.FC<ActionButtonProps> = ({ 
    icon: Icon, 
    label, 
    onClick, 
    color,
    disabled = false
}) => {
    // Farb-Mapping
    const colorClasses = {
        blue: 'hover:text-blue-600 hover:bg-blue-50',
        red: 'hover:text-red-600 hover:bg-red-50',
        green: 'hover:text-green-600 hover:bg-green-50',
        gray: 'hover:text-gray-700 hover:bg-gray-100'
    };
    
    return (
        <button
            onClick={onClick}
            className={`text-gray-500 p-1 rounded-full ${colorClasses[color]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={label}
            title={label}
            disabled={disabled}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
};

/**
 * Sammlung von Standard-Aktionsbuttons für Tabellen
 */
export const TableActions = ({ 
    item, 
    onEdit, 
    onDelete, 
    onView,
    canEdit = false,
    canDelete = false,
    canView = false,
    editIcon,
    deleteIcon,
    viewIcon
}) => {
    return (
        <div className="flex items-center space-x-2">
            {canEdit && (
                <ActionButton
                    icon={editIcon}
                    label="Bearbeiten"
                    onClick={() => onEdit(item)}
                    color="blue"
                />
            )}
            {canDelete && (
                <ActionButton
                    icon={deleteIcon}
                    label="Löschen"
                    onClick={() => onDelete(item)}
                    color="red"
                />
            )}
            {canView && (
                <ActionButton
                    icon={viewIcon}
                    label="Anzeigen"
                    onClick={() => onView(item)}
                    color="green"
                />
            )}
        </div>
    );
};

### Verwendung der zentralen Komponenten

Beispiel für die Verwendung der Status- und Aktionskomponenten in einer Tabelle:

```tsx
import { StatusBadge } from '@/utils/statusUtils';
import { TableActions } from '@/components/common/ActionButton';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

const TaskTable = ({ tasks }) => {
    // Berechtigungsprüfungen
    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('task', 'write');
    const canDelete = hasPermission('task', 'delete');
    const canView = hasPermission('task', 'read');
    
    // Handler-Funktionen
    const handleEdit = (task) => { /* ... */ };
    const handleDelete = (task) => { /* ... */ };
    const handleView = (task) => { /* ... */ };
    
    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead>
                {/* Tabellenkopf */}
            </thead>
            <tbody>
                {tasks.map(task => (
                    <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>
                            <StatusBadge status={task.status} processType="task" />
                        </td>
                        <td>
                            <TableActions
                                item={task}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onView={handleView}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                canView={canView}
                                editIcon={PencilIcon}
                                deleteIcon={TrashIcon}
                                viewIcon={EyeIcon}
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
```

Diese DRY-Implementierung bietet folgende Vorteile:

1. **Konsistenz**: Alle Status-Badges und Aktions-Buttons haben ein einheitliches Erscheinungsbild
2. **Wartbarkeit**: Änderungen müssen nur an einer Stelle vorgenommen werden
3. **Erweiterbarkeit**: Neue Status oder Aktionen können zentral hinzugefügt werden
4. **Typsicherheit**: TypeScript-Unterstützung für bessere Entwicklererfahrung
5. **Wiederverwendbarkeit**: Die Komponenten können in allen Tabellen verwendet werden

---

Diese Coding-Standards müssen von allen Entwicklern eingehalten werden. Bei Fragen oder Unklarheiten wende dich an das Entwicklungsteam. 