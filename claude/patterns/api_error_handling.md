# API-Fehlerbehandlungsmuster

Dieses Dokument beschreibt das standardisierte Muster für die Fehlerbehandlung bei API-Aufrufen im Intranet-Projekt.

## Musterbeschreibung

Das Muster stellt eine konsistente Fehlerbehandlung für API-Anfragen bereit, einschließlich:
- Zentralisierte Fehlerbehandlung
- Benutzerfreundliche Fehlermeldungen
- Fehlerprotokollierung
- Detaillierte Entwicklerinformationen im Debug-Modus

## Implementierungsbeispiel

### 1. Zentrale Fehlerbehandlungsfunktion

```typescript
// frontend/src/api/errorHandler.ts

import { toast } from 'react-toastify';
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export const handleApiError = (error: any): ApiError => {
  console.error('API Error:', error);
  
  let apiError: ApiError = {
    message: 'Ein unbekannter Fehler ist aufgetreten.'
  };
  
  if (error.isAxiosError) {
    const axiosError = error as AxiosError<any>;
    
    // Netzwerkfehler
    if (!axiosError.response) {
      apiError = {
        message: 'Verbindung zum Server fehlgeschlagen.',
        code: 'NETWORK_ERROR'
      };
    } 
    // Serverfehler mit Antwort
    else {
      const status = axiosError.response.status;
      const responseData = axiosError.response.data;
      
      // Versuche, eine strukturierte Fehlermeldung zu extrahieren
      if (responseData && responseData.error) {
        apiError = {
          message: responseData.error.message || 'Ein Serverfehler ist aufgetreten.',
          code: responseData.error.code,
          details: responseData.error.details
        };
      } 
      // Fallback für unstrukturierte Fehler
      else {
        // Fehlertyp basierend auf Statuscode
        switch (true) {
          case status === 401:
            apiError = {
              message: 'Nicht autorisiert. Bitte melden Sie sich an.',
              code: 'UNAUTHORIZED'
            };
            break;
          case status === 403:
            apiError = {
              message: 'Zugriff verweigert. Sie haben keine Berechtigung für diese Aktion.',
              code: 'FORBIDDEN'
            };
            break;
          case status === 404:
            apiError = {
              message: 'Die angeforderte Ressource wurde nicht gefunden.',
              code: 'NOT_FOUND'
            };
            break;
          case status >= 500:
            apiError = {
              message: 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
              code: 'SERVER_ERROR'
            };
            break;
          default:
            apiError = {
              message: 'Ein Fehler ist aufgetreten.',
              code: `HTTP_${status}`
            };
        }
      }
    }
  }
  
  // Fehlermeldung anzeigen (kann je nach Anwendungsfall auskommentiert werden)
  toast.error(apiError.message);
  
  return apiError;
};
```

### 2. Verwendung in API-Funktionen

```typescript
// frontend/src/api/worktimeApi.ts

import apiClient from './apiClient';
import { handleApiError } from './errorHandler';
import { WorktimeSession } from '../types/worktime';

export const startWorktime = async (userId: string, comment?: string): Promise<WorktimeSession> => {
  try {
    const response = await apiClient.post('/worktime/start', {
      userId,
      comment
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};
```

### 3. Verwendung in Komponenten

```typescript
// frontend/src/pages/Worktracker.tsx

// Mit Try-Catch-Block (explizite Fehlerbehandlung)
const startWorktime = async () => {
  try {
    setLoading(true);
    await worktimeApi.startWorktime(user.id, comment);
    setLoading(false);
    // Erfolgsmeldung anzeigen
    toast.success('Arbeitszeiterfassung gestartet');
  } catch (error) {
    // Fehler wurde bereits in API-Funktion behandelt
    setLoading(false);
    // Hier können zusätzliche komponentenspezifische Fehlerbehandlungen erfolgen
  }
};

// Alternative mit Promise-Kette
const stopWorktime = async () => {
  setLoading(true);
  worktimeApi.stopWorktime(currentSession.id, comment)
    .then(() => {
      toast.success('Arbeitszeiterfassung gestoppt');
    })
    .catch(() => {
      // Fehler wurde bereits in API-Funktion behandelt
      // Hier können zusätzliche komponentenspezifische Fehlerbehandlungen erfolgen
    })
    .finally(() => {
      setLoading(false);
    });
};
```

### 4. Backend-Fehlerstruktur

```typescript
// backend/src/types/error.ts

export interface ApiError {
  message: string;
  code: string;
  details?: any;
  stack?: string;
}

export const createApiError = (
  message: string,
  code: string,
  details?: any,
  includeStack = false
): ApiError => {
  const error: ApiError = {
    message,
    code,
    details
  };

  if (includeStack && process.env.NODE_ENV !== 'production') {
    error.stack = new Error().stack;
  }

  return error;
};
```

### 5. Backend-Fehlerbehandlungsmiddleware

```typescript
// backend/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { ApiError, createApiError } from '../types/error';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Wenn es bereits ein ApiError ist
  if ('code' in err) {
    const apiError = err as ApiError;
    return res.status(getStatusCodeForError(apiError.code)).json({
      error: apiError
    });
  }

  // Standardfehler umwandeln
  const apiError = createApiError(
    err.message || 'Ein unerwarteter Fehler ist aufgetreten.',
    'INTERNAL_SERVER_ERROR',
    undefined,
    true
  );

  return res.status(500).json({
    error: apiError
  });
};

// Hilfsfunktion zur Bestimmung des HTTP-Statuscodes
const getStatusCodeForError = (code: string): number => {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
      return 400;
    case 'CONFLICT':
      return 409;
    default:
      return 500;
  }
};
```

## Verwendungsrichtlinien

1. **Alle API-Aufrufe** sollten die zentrale Fehlerbehandlungsfunktion verwenden.
2. **Fehlermeldungen** sollten benutzerfreundlich und handlungsorientiert sein.
3. **Fehler-Logging** sollte detaillierte Informationen für Entwickler enthalten, aber keine sensiblen Daten in Produktionsumgebungen.
4. **Komponenten** sollten Ladezustände verwalten und angemessen auf Fehler reagieren.

## Vorteile

- **Konsistenz**: Einheitliche Fehlerbehandlung in der gesamten Anwendung
- **Benutzerfreundlichkeit**: Klare Fehlermeldungen für Benutzer
- **Entwicklerfreundlichkeit**: Detaillierte Fehlerinformationen für Debugging
- **Wartbarkeit**: Zentralisierte Fehlerlogik für einfache Aktualisierungen

## Bekannte Einschränkungen

- Bei komplexen API-Aufrufen mit mehreren Anfragen kann es schwierig sein, spezifische Fehler zuzuordnen.
- Offline-Szenarien erfordern möglicherweise zusätzliche Behandlung.

## Verbindung zu anderen Mustern

- **Ladezustandsmuster**: Arbeitet mit diesem Muster zusammen, um Benutzer über laufende Operationen zu informieren.
- **Toast-Benachrichtigungsmuster**: Verwendet für die Anzeige von Fehlermeldungen.
- **API-Client-Konfigurationsmuster**: Definiert grundlegende Konfiguration für API-Anfragen. 