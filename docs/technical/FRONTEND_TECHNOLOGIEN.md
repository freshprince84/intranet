# Frontend-Technologien

Dieses Dokument beschreibt die im Frontend des Intranet-Projekts verwendeten Technologien, Frameworks und Bibliotheken.

## Überblick

Das Frontend des Intranet-Projekts basiert auf React mit TypeScript und verwendet moderne Technologien für eine responsive, benutzerfreundliche Oberfläche.

## Haupttechnologien

- **React**: JavaScript-Bibliothek für die Benutzeroberfläche
- **TypeScript**: Typisierte Erweiterung von JavaScript
- **Tailwind CSS**: Utility-First CSS-Framework
- **Axios**: HTTP-Client für API-Aufrufe
- **React Router**: Routing-Bibliothek für die Navigation
- **Headless UI**: Barrierefreie UI-Komponenten
- **Heroicons**: Icon-Bibliothek

## TypeScript Best Practices

### Typisierung

- Immer explizite Typen für Komponenten-Props definieren
  ```typescript
  interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }
  
  const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
    // Implementierung
  };
  ```

- useState Hook mit Typparameter verwenden
  ```typescript
  const [value, setValue] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  ```

- Für API-Aufrufe die typisierten Funktionen aus den API-Clients verwenden
  ```typescript
  import { getUsers } from '../api/userApi.ts';
  
  const fetchUsers = async () => {
    const users = await getUsers();
    setUsers(users);
  };
  ```

- Nach Möglichkeit Interfaces statt Types verwenden für bessere Erweiterbarkeit
  ```typescript
  // Besser:
  interface User {
    id: number;
    name: string;
  }
  
  // Weniger flexibel:
  type User = {
    id: number;
    name: string;
  };
  ```

## Import-Pfade Regeln

### Frontend-Imports (MIT .ts/.tsx Endung)

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

### API-Konfiguration

Die API-URL wird dynamisch basierend auf dem aktuellen Hostname generiert:

```javascript
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? window.location.hostname === 'localhost'
    ? 'http://localhost:5000'  // Lokale Entwicklung auf localhost
    : `http://${window.location.hostname}:5000`  // Entwicklung über IP
  : 'http://localhost:5000';    // Produktionsumgebung
```

Alle API-Aufrufe verwenden die zentrale Konfiguration aus `frontend/src/config/api.ts`.

## UI-Komponenten

Das Frontend verwendet eine Reihe von UI-Komponenten, die auf Tailwind CSS, Headless UI und Heroicons basieren:

- **Buttons**: Verschiedene Stile je nach Wichtigkeit der Aktion
- **Modals**: Für Dialoge und Aktionsbestätigungen
- **Forms**: Einheitlich gestaltete Formulare
- **Tables**: Sortierbare und filterbare Tabellen
- **Cards**: Für Informationsblöcke und Dashboard-Elemente
- **Navigation**: Responsive Navigation für Desktop und Mobile

Alle UI-Komponenten folgen einem einheitlichen Design-System, das in DESIGN_STANDARDS.md dokumentiert ist. 