# API-REFERENZ

Diese Dokumentation bietet eine vollständige Referenz aller API-Endpunkte des Intranet-Systems sowie Best Practices für die Integration zwischen Frontend und Backend.

## Inhaltsverzeichnis

1. [API-Konfiguration und Integration](#api-konfiguration-und-integration)
2. [Best Practices für API-Integration](#best-practices-für-api-integration)
3. [Allgemeine Informationen](#allgemeine-informationen)
4. [Authentifizierung](#authentifizierung)
5. [Benutzer-API](#benutzer-api)
6. [Zeiterfassungs-API](#zeiterfassungs-api)
7. [Clients API](#clients-api)
8. [Consultations API](#consultations-api)
9. [Task-API](#task-api)
10. [Request-API](#request-api)
11. [Benachrichtigungs-API](#benachrichtigungs-api)
12. [Cerebro-API](#cerebro-api)
13. [Lohnabrechnung-API](#lohnabrechnung-api)
14. [Filter-API](#filter-api)
15. [Fehlerbehandlung](#fehlerbehandlung)
16. [Dokumentenerkennung und Identifikationsdokumente](#dokumentenerkennung-und-identifikationsdokumente)

## API-Konfiguration und Integration

### Server-Konfiguration
- Backend läuft auf Port 5000 (http://localhost:5000)
- Frontend läuft auf Port 3000 (http://localhost:3000)
- Prisma Studio läuft auf Port 5555 (http://localhost:5555)
- Zugriff ist auch über IP-Adresse möglich

### ⚠️ Wichtige Hinweise zur API-Nutzung
- API-Aufrufe erfolgen über die zentrale Konfiguration in `frontend/src/config/api.ts`
- Bei Import der API-Konfiguration **muss** die vollständige Dateiendung angegeben werden:
  ```typescript
  // KORREKT:
  import { API_URL } from '../config/api.ts';
  
  // FALSCH (führt zu Kompilierungsfehlern):
  import { API_URL } from '../config/api';
  ```
- API-Endpunkte werden OHNE /api aufgerufen, z.B.:
  ```javascript
  // Korrekt
  ${API_URL}/worktime/stats
  ${API_URL}/requests
  
  // NICHT mehr verwendet
  ${API_URL}/api/worktime/stats
  ${API_URL}/api/requests
  ```

### Unterstützte HTTP-Methoden
Das Backend unterstützt folgende HTTP-Methoden für API-Anfragen:
- `GET`: Zum Abrufen von Daten
- `POST`: Zum Erstellen neuer Ressourcen
- `PUT`: Zum vollständigen Aktualisieren von Ressourcen
- `DELETE`: Zum Löschen von Ressourcen
- `PATCH`: Zum teilweisen Aktualisieren von Ressourcen (z.B. Status-Updates)
- `OPTIONS`: Für CORS-Preflight-Anfragen

**Anwendungsbeispiele:**
- `GET /api/tasks`: Alle Tasks abrufen
- `POST /api/tasks`: Neuen Task erstellen
- `PUT /api/tasks/1`: Task mit ID 1 vollständig aktualisieren
- `PATCH /api/tasks/1`: Task mit ID 1 teilweise aktualisieren (z.B. nur Status ändern)
- `DELETE /api/tasks/1`: Task mit ID 1 löschen

## Best Practices für API-Integration

### 1. Typsicherheit zwischen Frontend und Backend

- Zentralisieren Sie globale Interface-Erweiterungen in Typ-Dateien
- Importieren Sie diese Typen in allen relevanten Dateien
- Vermeiden Sie Namespace-Konflikte bei globalen Erweiterungen

#### 1.1. Problem: TypeScript-Interface-Konflikte

Ein häufiges Problem ist die Inkonsistenz zwischen Typdefinitionen im Frontend und Backend, insbesondere bei globalen Namespace-Erweiterungen.

**Beispiel für Konflikt:**
```typescript
// In auth.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        roles: string[];
      };
    }
  }
}

// In permissionMiddleware.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
      };
    }
  }
}
```

#### 1.2. Lösung: Zentralisierte Typdefinitionen

**Konsolidieren Sie globale Interface-Erweiterungen** - Definieren Sie alle Erweiterungen eines Interfaces an einem Ort:

```typescript
// In types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        roles: string[];
      };
      userId?: string;
      roleId?: string;
      userPermissions?: any[];
    }
  }
}
```

### 2. Robuste API-Verarbeitung im Frontend

#### 2.1. Problem: Ungeschützte Zugriffe auf API-Antworten

Der häufigste Frontend-Fehler ist der ungeschützte Zugriff auf Eigenschaften von API-Antworten:

```typescript
// Problematischer Code
const response = await api.getNotifications();
setNotifications(response.data);  // Fehler, wenn response.data undefiniert ist

// Noch problematischer
notifications.length  // Fehler, wenn notifications undefiniert ist
```

#### 2.2. Lösung: Defensive Programmierung

**API-Ebene absichern**: Immer gültige Fallback-Werte zurückgeben:

```typescript
// In notificationApi.ts
getNotifications: async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
    
    // Robuste Datenverarbeitung
    return {
      data: Array.isArray(response.data) ? response.data : 
            (response.data?.notifications || []),
      total: response.data?.pagination?.total || 0,
      page: response.data?.pagination?.page || page,
      limit: response.data?.pagination?.limit || limit,
      pages: response.data?.pagination?.pages || 1
    };
  } catch (error) {
    console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
    // Bei Fehler einen konsistenten Rückgabewert liefern
    return { data: [], total: 0, page, limit, pages: 1 };
  }
}
```

### 3. Konsistente Feldnamen

- Verwenden Sie die exakten Prisma-Feldnamen im Frontend
- Etablieren Sie einen klaren Prozess für Schemaänderungen

### 4. Standardisierte API-Antwortformate

- Listen-Antworten: `{ data: items[], meta: { total, page, limit, pages } }`
- Einzelne Ressourcen: `{ data: item, meta: { ... } }`
- Fehlermeldungen: `{ error: 'Fehlermeldung', details: { ... } }`

### 5. Fehlerbehandlung

- Implementieren Sie konsistente Fehlerbehandlung im Frontend
- Bieten Sie benutzerfreundliche Fehlermeldungen
- Loggen Sie Fehler für Debugging-Zwecke

## Allgemeine Informationen

### Basis-URL

Die API ist unter folgender Basis-URL erreichbar:

```
http://localhost:5000
```

In Produktionsumgebungen kann die URL variieren. Die API-URL wird dynamisch basierend auf dem aktuellen Hostname generiert:

```javascript
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? window.location.hostname === 'localhost'
    ? 'http://localhost:5000'  // Lokale Entwicklung auf localhost
    : `http://${window.location.hostname}:5000`  // Entwicklung über IP
  : '';   // Produktionsumgebung - leer für relative Pfade

// Vollständige API-URL
export const API_URL = process.env.NODE_ENV === 'development'
  ? `${API_BASE_URL}/api`  // Entwicklung: vollständige URL
  : '/api';  // Produktion: nur /api als Präfix für Nginx
```

### Anfrage- und Antwortformat

Alle API-Anfragen und -Antworten verwenden das JSON-Format. Der Content-Type-Header sollte auf `application/json` gesetzt werden.

### Statusantworten

Die API verwendet standardmäßige HTTP-Statuscodes:

- `200 OK`: Erfolgreiche Anfrage
- `201 Created`: Ressource erfolgreich erstellt
- `400 Bad Request`: Ungültige Anfrage (z.B. fehlende oder ungültige Parameter)
- `401 Unauthorized`: Authentifizierung erforderlich
- `403 Forbidden`: Keine Berechtigung für diese Aktion
- `404 Not Found`: Ressource nicht gefunden
- `500 Internal Server Error`: Serverfehler

### Erfolgsantworten

Erfolgreiche Antworten haben folgendes Format:

```json
{
  "success": true,
  "data": { ... }
}
```

### Fehlerantworten

Fehlerantworten haben folgendes Format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Fehlerbeschreibung",
    "details": { ... }
  }
}
```

## Authentifizierung

Die API verwendet JWT (JSON Web Tokens) für die Authentifizierung. Das Token muss in allen authentifizierten Anfragen im Authorization-Header mitgeschickt werden:

```
Authorization: Bearer {token}
```

### Login

**Endpunkt**: `POST /api/auth/login`

**Beschreibung**: Authentifiziert einen Benutzer und gibt ein JWT-Token zurück.

**Request-Body**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User",
      "role": {
        "id": 1,
        "name": "Administrator"
      }
    }
  }
}
```

### Registrierung

**Endpunkt**: `POST /api/auth/register`

**Beschreibung**: Registriert einen neuen Benutzer. Der Benutzer erhält automatisch eine E-Mail mit seinen Anmeldeinformationen. Bei der Registrierung wird dem Benutzer die Hamburger-Rolle zugewiesen, sodass er keiner Organisation angehört. Nach der Registrierung kann der Benutzer entweder einer bestehenden Organisation beitreten oder eine eigene Organisation erstellen.

**Request-Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "username": "newuser",
  "first_name": "New",
  "last_name": "User"
}
```

**Hinweise**:
- `username` ist optional. Wenn nicht angegeben, wird die E-Mail-Adresse als Benutzername verwendet.
- `first_name` und `last_name` sind optional.

**Response**:
```json
{
  "message": "Benutzer erfolgreich erstellt",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "newuser",
    "email": "newuser@example.com",
    "firstName": "New",
    "lastName": "User",
    "roles": [
      {
        "role": {
          "id": 999,
          "name": "Hamburger",
          "permissions": [...]
        },
        "lastUsed": true
      }
    ]
  }
}
```

**E-Mail-Versand**:
- Nach erfolgreicher Registrierung wird automatisch eine E-Mail an die angegebene E-Mail-Adresse versendet.
- Die E-Mail enthält:
  - Willkommensnachricht
  - Benutzername
  - E-Mail-Adresse
  - Passwort (⚠️ Sicherheitshinweis: Bitte ändern Sie das Passwort nach dem ersten Login)
  - Informationen über die nächsten Schritte (Organisation beitreten/erstellen)

**Konfiguration**:
Die E-Mail-Funktion erfordert SMTP-Konfiguration in der `.env`-Datei:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
```

Falls keine SMTP-Konfiguration vorhanden ist, wird eine Warnung geloggt, aber die Registrierung schlägt nicht fehl.

### Token verifizieren

**Endpunkt**: `GET /api/auth/verify`

**Beschreibung**: Verifiziert das JWT-Token und gibt Benutzerinformationen zurück.

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User",
      "role": {
        "id": 1,
        "name": "Administrator"
      }
    }
  }
}
```

## Benutzer-API

### Benutzer abrufen

**Endpunkt**: `GET /api/users`

**Beschreibung**: Ruft eine Liste aller Benutzer ab (erfordert Administratorrechte).

**Query-Parameter**:
- `page`: Seitennummer (optional, Standard: 1)
- `limit`: Anzahl der Einträge pro Seite (optional, Standard: 10)
- `search`: Suchbegriff für Username/Name (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com",
        "role": {
          "id": 1,
          "name": "Administrator"
        }
      },
      // Weitere Benutzer...
    ],
    "pagination": {
      "total": 42,
      "pages": 5,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

### Benutzer nach ID abrufen

**Endpunkt**: `GET /api/users/:id`

**Beschreibung**: Ruft einen Benutzer anhand seiner ID ab.

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com",
      "role": {
        "id": 1,
        "name": "Administrator"
      },
      "branch": {
        "id": 1,
        "name": "Hauptniederlassung"
      }
    }
  }
}
```

### Benutzer erstellen

**Endpunkt**: `POST /api/users`

**Beschreibung**: Erstellt einen neuen Benutzer (erfordert Administratorrechte).

**Request-Body**:
```json
{
  "username": "newuser",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "email": "newuser@example.com",
  "roleId": 2,
  "branchId": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "username": "newuser",
      "firstName": "New",
      "lastName": "User",
      "email": "newuser@example.com",
      "role": {
        "id": 2,
        "name": "Mitarbeiter"
      },
      "branch": {
        "id": 1,
        "name": "Hauptniederlassung"
      }
    }
  }
}
```

### Benutzer aktualisieren

**Endpunkt**: `PUT /api/users/:id`

**Beschreibung**: Aktualisiert einen bestehenden Benutzer.

**Request-Body**:
```json
{
  "firstName": "Updated",
  "lastName": "User",
  "email": "updated@example.com",
  "roleId": 3,
  "branchId": 2
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "username": "newuser",
      "firstName": "Updated",
      "lastName": "User",
      "email": "updated@example.com",
      "role": {
        "id": 3,
        "name": "Manager"
      },
      "branch": {
        "id": 2,
        "name": "Zweigstelle"
      }
    }
  }
}
```

### Benutzer löschen

**Endpunkt**: `DELETE /api/users/:id`

**Beschreibung**: Löscht einen Benutzer.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Benutzer erfolgreich gelöscht"
  }
}
```

## Zeiterfassungs-API

### Aktive Zeiterfassung abrufen

**Endpunkt**: `GET /api/worktime/active`

**Beschreibung**: Ruft die aktive Zeiterfassung des aktuellen Benutzers ab.

**Response**:
```json
{
  "success": true,
  "data": {
    "active": true,
    "worktime": {
      "id": 456,
      "userId": 123,
      "branchId": 1,
      "startTime": "2023-05-15T08:30:00.000",
      "endTime": null,
      "startComment": "Projektarbeit",
      "endComment": null,
      "branch": {
        "id": 1,
        "name": "Hauptniederlassung"
      }
    }
  }
}
```

### Zeiterfassung starten

**Endpunkt**: `POST /api/worktime/start`

**Beschreibung**: Startet eine neue Zeiterfassung für den aktuellen Benutzer.

**Request-Body**:
```json
{
  "branchId": 1,
  "comment": "Projektarbeit"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "worktime": {
      "id": 456,
      "userId": 123,
      "branchId": 1,
      "startTime": "2023-05-15T08:30:00.000",
      "endTime": null,
      "startComment": "Projektarbeit",
      "endComment": null,
      "branch": {
        "id": 1,
        "name": "Hauptniederlassung"
      }
    }
  }
}
```

### Zeiterfassung beenden

**Endpunkt**: `POST /api/worktime/stop`

**Beschreibung**: Beendet die aktive Zeiterfassung des aktuellen Benutzers.

**Request-Body**:
```json
{
  "comment": "Projekt abgeschlossen"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "worktime": {
      "id": 456,
      "userId": 123,
      "branchId": 1,
      "startTime": "2023-05-15T08:30:00.000",
      "endTime": "2023-05-15T17:30:00.000",
      "startComment": "Projektarbeit",
      "endComment": "Projekt abgeschlossen",
      "branch": {
        "id": 1,
        "name": "Hauptniederlassung"
      }
    }
  }
}
```

### Zeiterfassungen für einen Tag abrufen

**Endpunkt**: `GET /api/worktime/day`

**Beschreibung**: Ruft alle Zeiterfassungen für einen bestimmten Tag ab.

**Query-Parameter**:
- `date`: Datum im Format YYYY-MM-DD (erforderlich)
- `userId`: Benutzer-ID (optional, Standard: aktueller Benutzer)

**Response**:
```json
{
  "success": true,
  "data": {
    "worktimes": [
      {
        "id": 455,
        "userId": 123,
        "branchId": 1,
        "startTime": "2023-05-15T08:30:00.000",
        "endTime": "2023-05-15T12:00:00.000",
        "startComment": "Morgenarbeit",
        "endComment": "Mittagspause",
        "branch": {
          "id": 1,
          "name": "Hauptniederlassung"
        }
      },
      {
        "id": 456,
        "userId": 123,
        "branchId": 1,
        "startTime": "2023-05-15T13:00:00.000",
        "endTime": "2023-05-15T17:30:00.000",
        "startComment": "Nachmittagsarbeit",
        "endComment": "Feierabend",
        "branch": {
          "id": 1,
          "name": "Hauptniederlassung"
        }
      }
    ]
  }
}
```

### Zeiterfassungen für einen Zeitraum abrufen

**Endpunkt**: `GET /api/worktime/range`

**Beschreibung**: Ruft alle Zeiterfassungen für einen bestimmten Zeitraum ab.

**Query-Parameter**:
- `startDate`: Startdatum im Format YYYY-MM-DD (erforderlich)
- `endDate`: Enddatum im Format YYYY-MM-DD (erforderlich)
- `userId`: Benutzer-ID (optional, Standard: aktueller Benutzer)
- `branchId`: Niederlassungs-ID (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "worktimes": [
      // Liste von Zeiterfassungen wie im vorherigen Beispiel
    ],
    "summary": {
      "totalDuration": "40:15:00",
      "totalDays": 5,
      "averagePerDay": "08:03:00"
    }
  }
}
```

### Zeiterfassung aktualisieren

**Endpunkt**: `PUT /api/worktime/:id`

**Beschreibung**: Aktualisiert eine bestehende Zeiterfassung.

**Request-Body**:
```json
{
  "startTime": "2023-05-15T08:45:00.000",
  "endTime": "2023-05-15T17:15:00.000",
  "startComment": "Aktualisierte Morgenarbeit",
  "endComment": "Aktualisierter Feierabend"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "worktime": {
      "id": 456,
      "userId": 123,
      "branchId": 1,
      "startTime": "2023-05-15T08:45:00.000",
      "endTime": "2023-05-15T17:15:00.000",
      "startComment": "Aktualisierte Morgenarbeit",
      "endComment": "Aktualisierter Feierabend",
      "branch": {
        "id": 1,
        "name": "Hauptniederlassung"
      }
    }
  }
}
```

### Zeiterfassung löschen

**Endpunkt**: `DELETE /api/worktime/:id`

**Beschreibung**: Löscht eine Zeiterfassung.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Zeiterfassung erfolgreich gelöscht"
  }
}
```

## Clients API

### Alle Clients abrufen

**Endpunkt**: `GET /api/clients`

**Beschreibung**: Ruft alle Clients ab.

**Response**:
```json
[
  {
    "id": 1,
    "name": "Max Mustermann",
    "company": "Musterfirma GmbH",
    "email": "max@musterfirma.de",
    "phone": "+49 123 456789",
    "address": "Musterstraße 1, 12345 Musterstadt",
    "notes": "Wichtiger Kunde",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
]
```

### Einzelnen Client abrufen

**Endpunkt**: `GET /api/clients/:id`

**Beschreibung**: Ruft einen einzelnen Client mit seinen letzten 10 Beratungen ab.

**Response**:
```json
{
  "id": 1,
  "name": "Max Mustermann", 
  "company": "Musterfirma GmbH",
  "email": "max@musterfirma.de",
  "phone": "+49 123 456789",
  "address": "Musterstraße 1, 12345 Musterstadt",
  "notes": "Wichtiger Kunde",
  "isActive": true,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z",
  "recentConsultations": [
    {
      "id": 5,
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T11:30:00Z",
      "notes": "Erstberatung erfolgreich"
    }
  ]
}
```

### Neuen Client erstellen

**Endpunkt**: `POST /api/clients`

**Beschreibung**: Erstellt einen neuen Client.

**Request-Body**:
```json
{
  "name": "Max Mustermann",
  "company": "Musterfirma GmbH",
  "email": "max@musterfirma.de",
  "phone": "+49 123 456789",
  "address": "Musterstraße 1, 12345 Musterstadt",
  "notes": "Wichtiger Kunde"
}
```

**Response**:
```json
{
  "id": 2,
  "name": "Max Mustermann",
  "company": "Musterfirma GmbH",
  "email": "max@musterfirma.de",
  "phone": "+49 123 456789",
  "address": "Musterstraße 1, 12345 Musterstadt",
  "notes": "Wichtiger Kunde",
  "isActive": true,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

### Client aktualisieren

**Endpunkt**: `PUT /api/clients/:id`

**Beschreibung**: Aktualisiert einen bestehenden Client.

**Request-Body**:
```json
{
  "name": "Max Mustermann Updated",
  "email": "max.updated@musterfirma.de",
  "notes": "Sehr wichtiger Kunde"
}
```

**Response**:
```json
{
  "id": 1,
  "name": "Max Mustermann Updated",
  "company": "Musterfirma GmbH",
  "email": "max.updated@musterfirma.de",
  "phone": "+49 123 456789",
  "address": "Musterstraße 1, 12345 Musterstadt",
  "notes": "Sehr wichtiger Kunde",
  "isActive": true,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T15:30:00Z"
}
```

### Client löschen

**Endpunkt**: `DELETE /api/clients/:id`

**Beschreibung**: Löscht einen Client.

**Response**:
```json
{
  "message": "Client erfolgreich gelöscht"
}
```

### Zuletzt beratene Clients

**Endpunkt**: `GET /api/clients/recent`

**Beschreibung**: Ruft die 10 zuletzt beratenen Clients des aktuellen Benutzers ab.

**Response**:
```json
[
  {
    "id": 1,
    "name": "Max Mustermann",
    "company": "Musterfirma GmbH",
    "lastConsultation": "2024-01-15T11:30:00Z"
  },
  {
    "id": 3,
    "name": "Anna Beispiel",
    "company": null,
    "lastConsultation": "2024-01-14T16:00:00Z"
  }
]
```

## Consultations API

### Alle Beratungen abrufen

**Endpunkt**: `GET /api/consultations`

**Beschreibung**: Ruft alle Beratungen des aktuellen Benutzers ab.

**Query-Parameter**:
- `clientId` (optional): Filtert nach Client
- `from` (optional): Start-Datum (ISO 8601)
- `to` (optional): End-Datum (ISO 8601)

**Response**:
```json
[
  {
    "id": 5,
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:30:00Z",
    "notes": "Erstberatung erfolgreich",
    "userId": 1,
    "branchId": 1,
    "clientId": 1,
    "branch": {
      "id": 1,
      "name": "Hauptniederlassung"
    },
    "client": {
      "id": 1,
      "name": "Max Mustermann",
      "company": "Musterfirma GmbH"
    },
    "taskLinks": [
      {
        "id": 1,
        "taskId": 10,
        "task": {
          "id": 10,
          "title": "Follow-up Beratung"
        }
      }
    ]
  }
]
```

### Beratung starten

**Endpunkt**: `POST /api/consultations/start`

**Beschreibung**: Startet eine neue Beratung.

**Request-Body**:
```json
{
  "branchId": 1,
  "clientId": 1,
  "notes": "Erste Notizen",
  "startTime": "2024-01-15T10:00:00Z"
}
```

**Response**:
```json
{
  "id": 6,
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": null,
  "notes": "Erste Notizen",
  "userId": 1,
  "branchId": 1,
  "clientId": 1,
  "branch": {
    "id": 1,
    "name": "Hauptniederlassung"
  },
  "client": {
    "id": 1,
    "name": "Max Mustermann",
    "company": "Musterfirma GmbH"
  }
}
```

### Beratung beenden

**Endpunkt**: `POST /api/consultations/stop`

**Beschreibung**: Beendet die aktive Beratung.

**Request-Body**:
```json
{
  "notes": "Finale Notizen",
  "endTime": "2024-01-15T11:30:00Z"
}
```

**Response**:
```json
{
  "id": 6,
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:30:00Z",
  "notes": "Finale Notizen",
  "userId": 1,
  "branchId": 1,
  "clientId": 1,
  "branch": {
    "id": 1,
    "name": "Hauptniederlassung"
  },
  "client": {
    "id": 1,
    "name": "Max Mustermann",
    "company": "Musterfirma GmbH"
  }
}
```

### Notizen einer Beratung aktualisieren

**Endpunkt**: `PATCH /api/consultations/:id/notes`

**Beschreibung**: Aktualisiert die Notizen einer Beratung.

**Request-Body**:
```json
{
  "notes": "Aktualisierte Notizen"
}
```

**Response**:
```json
{
  "id": 6,
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:30:00Z",
  "notes": "Aktualisierte Notizen",
  "userId": 1,
  "branchId": 1,
  "clientId": 1
}
```

### Task mit Beratung verknüpfen

**Endpunkt**: `POST /api/consultations/:id/link-task`

**Beschreibung**: Verknüpft einen Task mit einer Beratung.

**Request-Body**:
```json
{
  "taskId": 123
}
```

**Response**:
```json
{
  "id": 1,
  "workTimeId": 6,
  "taskId": 123,
  "createdAt": "2024-01-15T12:00:00Z",
  "task": {
    "id": 123,
    "title": "Follow-up Beratung",
    "status": "open"
  },
  "workTime": {
    "id": 6,
    "client": {
      "id": 1,
      "name": "Max Mustermann"
    }
  }
}
```

### Neuen Task für Beratung erstellen

**Endpunkt**: `POST /api/consultations/:id/create-task`

**Beschreibung**: Erstellt einen neuen Task für eine Beratung.

**Request-Body**:
```json
{
  "title": "Follow-up Beratung",
  "description": "Details zum Follow-up",
  "dueDate": "2024-01-22T10:00:00Z",
  "branchId": 1,
  "qualityControlId": 2
}
```

**Response**:
```json
{
  "task": {
    "id": 124,
    "title": "Follow-up Beratung",
    "description": "Details zum Follow-up",
    "dueDate": "2024-01-22T10:00:00Z",
    "status": "open",
    "branchId": 1,
    "qualityControlId": 2
  },
  "link": {
    "id": 2,
    "workTimeId": 6,
    "taskId": 124
  }
}
```

## Task-API

### Tasks abrufen

**Endpunkt**: `GET /api/tasks`

**Beschreibung**: Ruft eine Liste von Tasks ab.

**Query-Parameter**:
- `page`: Seitennummer (optional, Standard: 1)
- `limit`: Anzahl der Einträge pro Seite (optional, Standard: 10)
- `status`: Filtere nach Status (optional, z.B. "open", "in_progress", "completed")
- `assignedTo`: Filtere nach zugewiesenem Benutzer (optional)
- `priority`: Filtere nach Priorität (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 789,
        "title": "Aufgabe 1",
        "description": "Beschreibung der Aufgabe",
        "status": "in_progress",
        "priority": "high",
        "dueDate": "2023-06-01T00:00:00.000Z",
        "assignedTo": {
          "id": 123,
          "username": "user123",
          "firstName": "Max",
          "lastName": "Mustermann"
        },
        "createdBy": {
          "id": 1,
          "username": "admin"
        },
        "createdAt": "2023-05-10T10:30:00.000Z",
        "updatedAt": "2023-05-15T14:20:00.000Z"
      },
      // Weitere Tasks...
    ],
    "pagination": {
      "total": 25,
      "pages": 3,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

### Task erstellen

**Endpunkt**: `POST /api/tasks`

**Beschreibung**: Erstellt einen neuen Task.

**Request-Body**:
```json
{
  "title": "Neue Aufgabe",
  "description": "Beschreibung der neuen Aufgabe",
  "status": "open",
  "priority": "medium",
  "dueDate": "2023-06-15T00:00:00.000Z",
  "assignedToId": 123
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 790,
      "title": "Neue Aufgabe",
      "description": "Beschreibung der neuen Aufgabe",
      "status": "open",
      "priority": "medium",
      "dueDate": "2023-06-15T00:00:00.000Z",
      "assignedTo": {
        "id": 123,
        "username": "user123",
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "createdBy": {
        "id": 1,
        "username": "admin"
      },
      "createdAt": "2023-05-16T09:45:00.000Z",
      "updatedAt": "2023-05-16T09:45:00.000Z"
    }
  }
}
```

### Task aktualisieren

**Endpunkt**: `PUT /api/tasks/:id`

**Beschreibung**: Aktualisiert einen bestehenden Task.

**Request-Body**:
```json
{
  "status": "completed",
  "description": "Aktualisierte Beschreibung"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 790,
      "title": "Neue Aufgabe",
      "description": "Aktualisierte Beschreibung",
      "status": "completed",
      "priority": "medium",
      "dueDate": "2023-06-15T00:00:00.000Z",
      "assignedTo": {
        "id": 123,
        "username": "user123",
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "createdBy": {
        "id": 1,
        "username": "admin"
      },
      "createdAt": "2023-05-16T09:45:00.000Z",
      "updatedAt": "2023-05-16T10:15:00.000Z"
    }
  }
}
```

### Task-Anhänge

#### Anhänge eines Tasks abrufen

**Endpunkt**: `GET /api/tasks/:taskId/attachments`

**Beschreibung**: Ruft alle Anhänge eines bestimmten Tasks ab.

**Response**:
```json
[
  {
    "id": 1,
    "taskId": 790,
    "fileName": "dokument.pdf",
    "fileType": "application/pdf",
    "fileSize": 2048576,
    "filePath": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.pdf",
    "uploadedAt": "2023-05-16T10:20:00.000Z"
  },
  {
    "id": 2,
    "taskId": 790,
    "fileName": "screenshot.png",
    "fileType": "image/png",
    "fileSize": 1024000,
    "filePath": "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b.png",
    "uploadedAt": "2023-05-16T10:25:00.000Z"
  }
]
```

#### Anhang zu einem Task hinzufügen

**Endpunkt**: `POST /api/tasks/:taskId/attachments`

**Beschreibung**: Fügt einen Anhang zu einem Task hinzu.

**Request**: Multipart/form-data mit Feld 'file' für die Datei

**Response**:
```json
{
  "id": 3,
  "taskId": 790,
  "fileName": "neues_dokument.docx",
  "fileType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "fileSize": 1536000,
  "filePath": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.docx",
  "uploadedAt": "2023-05-16T11:30:00.000Z"
}
```

#### Anhang herunterladen

**Endpunkt**: `GET /api/tasks/:taskId/attachments/:attachmentId`

**Beschreibung**: Lädt einen bestimmten Anhang herunter.

**Response**: Die Datei wird als Download zurückgegeben.

#### Anhang löschen

**Endpunkt**: `DELETE /api/tasks/:taskId/attachments/:attachmentId`

**Beschreibung**: Löscht einen bestimmten Anhang eines Tasks.

**Response**:
```json
{
  "message": "Anhang erfolgreich gelöscht"
}
```

## Request-API

### Requests abrufen

**Endpunkt**: `GET /api/requests`

**Beschreibung**: Ruft eine Liste von Requests ab.

**Query-Parameter**:
- `page`: Seitennummer (optional, Standard: 1)
- `limit`: Anzahl der Einträge pro Seite (optional, Standard: 10)
- `status`: Filtere nach Status (optional)
- `userId`: Filtere nach Benutzer (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 345,
        "title": "Request 1",
        "description": "Beschreibung des Requests",
        "status": "pending",
        "priority": "high",
        "userId": 123,
        "user": {
          "id": 123,
          "username": "user123",
          "firstName": "Max",
          "lastName": "Mustermann"
        },
        "assignedTo": {
          "id": 1,
          "username": "admin"
        },
        "createdAt": "2023-05-14T11:20:00.000Z",
        "updatedAt": "2023-05-14T11:20:00.000Z"
      },
      // Weitere Requests...
    ],
    "pagination": {
      "total": 15,
      "pages": 2,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

### Request erstellen

**Endpunkt**: `POST /api/requests`

**Beschreibung**: Erstellt einen neuen Request.

**Request-Body**:
```json
{
  "title": "Neuer Request",
  "description": "Beschreibung des neuen Requests",
  "priority": "medium",
  "assignedToId": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "request": {
      "id": 346,
      "title": "Neuer Request",
      "description": "Beschreibung des neuen Requests",
      "status": "pending",
      "priority": "medium",
      "userId": 123,
      "user": {
        "id": 123,
        "username": "user123",
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "assignedTo": {
        "id": 1,
        "username": "admin"
      },
      "createdAt": "2023-05-16T13:30:00.000Z",
      "updatedAt": "2023-05-16T13:30:00.000Z"
    }
  }
}
```

### Request aktualisieren

**Endpunkt**: `PUT /api/requests/:id`

**Beschreibung**: Aktualisiert einen bestehenden Request.

**Request-Body**:
```json
{
  "status": "approved",
  "comment": "Request genehmigt"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "request": {
      "id": 346,
      "title": "Neuer Request",
      "description": "Beschreibung des neuen Requests",
      "status": "approved",
      "comment": "Request genehmigt",
      "priority": "medium",
      "userId": 123,
      "user": {
        "id": 123,
        "username": "user123",
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "assignedTo": {
        "id": 1,
        "username": "admin"
      },
      "createdAt": "2023-05-16T13:30:00.000Z",
      "updatedAt": "2023-05-16T14:45:00.000Z"
    }
  }
}
```

### Request-Anhänge

#### Anhänge eines Requests abrufen

**Endpunkt**: `GET /api/requests/:requestId/attachments`

**Beschreibung**: Ruft alle Anhänge eines bestimmten Requests ab.

**Response**:
```json
[
  {
    "id": 1,
    "requestId": 123,
    "fileName": "anfrage.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "filePath": "7b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.pdf",
    "uploadedAt": "2023-05-20T09:15:00.000Z"
  },
  {
    "id": 2,
    "requestId": 123,
    "fileName": "bild.jpg",
    "fileType": "image/jpeg",
    "fileSize": 512000,
    "filePath": "5ec0bd7f-11c0-43da-975e-2a8ad9ebae0b.jpg",
    "uploadedAt": "2023-05-20T09:20:00.000Z"
  }
]
```

#### Anhang zu einem Request hinzufügen

**Endpunkt**: `POST /api/requests/:requestId/attachments`

**Beschreibung**: Fügt einen Anhang zu einem Request hinzu.

**Request**: Multipart/form-data mit Feld 'file' für die Datei

**Response**:
```json
{
  "id": 3,
  "requestId": 123,
  "fileName": "zusatzinfo.docx",
  "fileType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "fileSize": 768000,
  "filePath": "2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.docx",
  "uploadedAt": "2023-05-20T10:45:00.000Z"
}
```

#### Anhang herunterladen

**Endpunkt**: `GET /api/requests/:requestId/attachments/:attachmentId`

**Beschreibung**: Lädt einen bestimmten Anhang herunter.

**Response**: Die Datei wird als Download zurückgegeben.

#### Anhang löschen

**Endpunkt**: `DELETE /api/requests/:requestId/attachments/:attachmentId`

**Beschreibung**: Löscht einen bestimmten Anhang eines Requests.

**Response**:
```json
{
  "message": "Anhang erfolgreich gelöscht"
}
```

## Benachrichtigungs-API

### Benachrichtigungen abrufen

**Endpunkt**: `GET /api/notifications`

**Beschreibung**: Ruft die Benachrichtigungen des aktuellen Benutzers ab.

**Query-Parameter**:
- `page`: Seitennummer (optional, Standard: 1)
- `limit`: Anzahl der Einträge pro Seite (optional, Standard: 10)
- `read`: Filtere nach Lesestatus (optional, true/false)

**Response**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 567,
        "userId": 123,
        "type": "task_assigned",
        "title": "Neue Aufgabe zugewiesen",
        "message": "Dir wurde die Aufgabe 'Neue Aufgabe' zugewiesen",
        "read": false,
        "entityId": 790,
        "entityType": "task",
        "createdAt": "2023-05-16T09:45:00.000Z"
      },
      // Weitere Benachrichtigungen...
    ],
    "pagination": {
      "total": 8,
      "pages": 1,
      "currentPage": 1,
      "limit": 10
    },
    "unreadCount": 3
  }
}
```

### Benachrichtigung als gelesen markieren

**Endpunkt**: `PUT /api/notifications/:id/read`

**Beschreibung**: Markiert eine bestimmte Benachrichtigung als gelesen.

**Response**:
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": 567,
      "userId": 123,
      "type": "task_assigned",
      "title": "Neue Aufgabe zugewiesen",
      "message": "Dir wurde die Aufgabe 'Neue Aufgabe' zugewiesen",
      "read": true,
      "entityId": 790,
      "entityType": "task",
      "createdAt": "2023-05-16T09:45:00.000Z",
      "updatedAt": "2023-05-16T15:20:00.000Z"
    }
  }
}
```

### Alle Benachrichtigungen als gelesen markieren

**Endpunkt**: `PUT /api/notifications/read-all`

**Beschreibung**: Markiert alle Benachrichtigungen des aktuellen Benutzers als gelesen.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Alle Benachrichtigungen wurden als gelesen markiert",
    "count": 3
  }
}
```

## Cerebro-API

### Artikel abrufen

**Endpunkt**: `GET /api/cerebro/articles`

**Beschreibung**: Ruft eine Liste von Cerebro-Artikeln ab.

**Query-Parameter**:
- `page`: Seitennummer (optional, Standard: 1)
- `limit`: Anzahl der Einträge pro Seite (optional, Standard: 10)
- `category`: Filtere nach Kategorie (optional)
- `search`: Suchbegriff (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 234,
        "title": "Zeiterfassung Anleitung",
        "slug": "zeiterfassung-anleitung",
        "content": "Detaillierter Inhalt des Artikels...",
        "categoryId": 5,
        "category": {
          "id": 5,
          "name": "Anleitungen",
          "slug": "anleitungen"
        },
        "author": {
          "id": 1,
          "username": "admin",
          "firstName": "Admin",
          "lastName": "User"
        },
        "createdAt": "2023-04-10T15:30:00.000Z",
        "updatedAt": "2023-05-12T11:45:00.000Z"
      },
      // Weitere Artikel...
    ],
    "pagination": {
      "total": 28,
      "pages": 3,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

### Artikel nach Slug abrufen

**Endpunkt**: `GET /api/cerebro/articles/by-slug/:slug`

**Beschreibung**: Ruft einen Artikel anhand seines Slugs ab.

**Response**:
```json
{
  "success": true,
  "data": {
    "article": {
      "id": 234,
      "title": "Zeiterfassung Anleitung",
      "slug": "zeiterfassung-anleitung",
      "content": "Detaillierter Inhalt des Artikels...",
      "categoryId": 5,
      "category": {
        "id": 5,
        "name": "Anleitungen",
        "slug": "anleitungen"
      },
      "author": {
        "id": 1,
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User"
      },
      "createdAt": "2023-04-10T15:30:00.000Z",
      "updatedAt": "2023-05-12T11:45:00.000Z"
    }
  }
}
```

### Artikel erstellen

**Endpunkt**: `POST /api/cerebro/articles`

**Beschreibung**: Erstellt einen neuen Cerebro-Artikel.

**Request-Body**:
```json
{
  "title": "Neuer Artikel",
  "content": "Inhalt des neuen Artikels...",
  "categoryId": 5
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "article": {
      "id": 235,
      "title": "Neuer Artikel",
      "slug": "neuer-artikel",
      "content": "Inhalt des neuen Artikels...",
      "categoryId": 5,
      "category": {
        "id": 5,
        "name": "Anleitungen",
        "slug": "anleitungen"
      },
      "author": {
        "id": 123,
        "username": "user123",
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "createdAt": "2023-05-16T16:45:00.000Z",
      "updatedAt": "2023-05-16T16:45:00.000Z"
    }
  }
}
```

### Artikel aktualisieren

**Endpunkt**: `PUT /api/cerebro/articles/:id`

**Beschreibung**: Aktualisiert einen bestehenden Cerebro-Artikel.

**Request-Body**:
```json
{
  "title": "Aktualisierter Artikel",
  "content": "Aktualisierter Inhalt...",
  "categoryId": 6
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "article": {
      "id": 235,
      "title": "Aktualisierter Artikel",
      "slug": "aktualisierter-artikel",
      "content": "Aktualisierter Inhalt...",
      "categoryId": 6,
      "category": {
        "id": 6,
        "name": "Dokumentation",
        "slug": "dokumentation"
      },
      "author": {
        "id": 123,
        "username": "user123",
        "firstName": "Max",
        "lastName": "Mustermann"
      },
      "createdAt": "2023-05-16T16:45:00.000Z",
      "updatedAt": "2023-05-16T17:20:00.000Z"
    }
  }
}
```

## Lohnabrechnung-API

### Abrechnungsdaten abrufen

**Endpunkt**: `GET /api/payroll/data`

**Beschreibung**: Ruft Lohnabrechnungsdaten für einen bestimmten Zeitraum ab.

**Query-Parameter**:
- `month`: Monat (1-12) (erforderlich)
- `year`: Jahr (YYYY) (erforderlich)
- `userId`: Benutzer-ID (optional, Standard: aktueller Benutzer)

**Response**:
```json
{
  "success": true,
  "data": {
    "payrollData": {
      "userId": 123,
      "month": 5,
      "year": 2023,
      "totalHours": 168.5,
      "regularHours": 160.0,
      "overtimeHours": 8.5,
      "hourlyRate": 25.0,
      "regularPay": 4000.0,
      "overtimePay": 318.75,
      "totalPay": 4318.75,
      "deductions": {
        "tax": 863.75,
        "socialSecurity": 647.81,
        "other": 50.0
      },
      "netPay": 2757.19,
      "worktimes": [
        // Liste der Zeiterfassungen für den Zeitraum
      ]
    }
  }
}
```

### Abrechnungsbericht generieren

**Endpunkt**: `POST /api/payroll/report`

**Beschreibung**: Generiert einen Lohnabrechnungsbericht.

**Request-Body**:
```json
{
  "month": 5,
  "year": 2023,
  "userId": 123,
  "format": "pdf"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reportUrl": "/api/payroll/download/report_123_2023_05.pdf",
    "reportId": "report_123_2023_05"
  }
}
```

## Filter-API

Die Filter-API ermöglicht es Benutzern, komplexe Filterkonfigurationen zu speichern, zu laden und zu verwalten. Diese können für verschiedene Tabellen im System verwendet werden.

### Gespeicherte Filter abrufen

**Endpunkt**: `GET /api/saved-filters/:tableId`

**Beschreibung**: Ruft alle gespeicherten Filter für eine bestimmte Tabelle ab.

**Pfadparameter**:
- `tableId`: ID der Tabelle, für die Filter abgerufen werden sollen (z.B. `worktracker_todos`)

**Headers**:
```
Authorization: Bearer {token}
```

**Erfolgsantwort**:
```json
[
  {
    "id": 1,
    "name": "Offene Aufgaben",
    "tableId": "worktracker_todos",
    "conditions": [
      {
        "field": "status",
        "operator": "equals",
        "value": "open"
      }
    ],
    "operators": []
  },
  {
    "id": 2,
    "name": "Hohe Priorität",
    "tableId": "worktracker_todos",
    "conditions": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "high"
      }
    ],
    "operators": []
  }
]
```

### Filter speichern

**Endpunkt**: `POST /api/saved-filters`

**Beschreibung**: Speichert einen neuen Filter oder aktualisiert einen bestehenden Filter.

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request-Body**:
```json
{
  "tableId": "worktracker_todos",
  "name": "Offene Aufgaben",
  "conditions": [
    {
      "field": "status",
      "operator": "equals",
      "value": "open"
    }
  ],
  "operators": []
}
```

**Erfolgsantwort**:
```json
{
  "id": 1,
  "name": "Offene Aufgaben",
  "tableId": "worktracker_todos",
  "conditions": [
    {
      "field": "status",
      "operator": "equals",
      "value": "open"
    }
  ],
  "operators": [],
  "userId": 5,
  "createdAt": "2023-06-14T12:34:56.789Z",
  "updatedAt": "2023-06-14T12:34:56.789Z"
}
```

**Fehlerantwort**:
```json
{
  "success": false,
  "error": {
    "message": "Filter mit diesem Namen existiert bereits für diese Tabelle"
  }
}
```

### Filter löschen

**Endpunkt**: `DELETE /api/saved-filters/:id`

**Beschreibung**: Löscht einen gespeicherten Filter.

**Pfadparameter**:
- `id`: ID des zu löschenden Filters

**Headers**:
```
Authorization: Bearer {token}
```

**Erfolgsantwort**:
```json
{
  "success": true,
  "message": "Filter erfolgreich gelöscht"
}
```

**Fehlerantwort**:
```json
{
  "success": false,
  "error": {
    "message": "Filter nicht gefunden"
  }
}
```

## Fehlerbehandlung

### Fehler-Codes

Die API verwendet folgende Fehler-Codes:

- `VALIDATION_ERROR`: Validierungsfehler bei Eingabedaten
- `AUTHENTICATION_ERROR`: Authentifizierungsfehler
- `AUTHORIZATION_ERROR`: Berechtigungsfehler
- `RESOURCE_NOT_FOUND`: Ressource nicht gefunden
- `CONFLICT_ERROR`: Konflikt mit bestehendem Datensatz
- `INTERNAL_SERVER_ERROR`: Interner Serverfehler

### Fehlerbeispiele

**Validierungsfehler**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validierungsfehler bei der Anfrage",
    "details": {
      "username": "Ein Benutzername ist erforderlich",
      "password": "Das Passwort muss mindestens 8 Zeichen lang sein"
    }
  }
}
```

**Authentifizierungsfehler**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Nicht authentifiziert. Bitte melden Sie sich an."
  }
}
```

**Berechtigungsfehler**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Keine Berechtigung für diese Aktion"
  }
}
```

**Ressource nicht gefunden**:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Der angeforderte Benutzer wurde nicht gefunden"
  }
}
```

## Dokumentenerkennung und Identifikationsdokumente

### Dokumentenerkennung

#### `POST /api/document-recognition`

Analysiert ein Ausweisdokument mittels KI und extrahiert relevante Informationen.

**Authentifizierung erforderlich**: Ja

**Request-Header:**
```
Content-Type: application/json
Authorization: Bearer <JWT-Token>
```

**Request-Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",  // Base64-kodiertes Bild
  "documentType": "national_id"  // Optional: Vorgegebener Dokumenttyp
}
```

**Erfolgsantwort (200 OK):**
```json
{
  "documentType": "national_id",
  "documentNumber": "AB123456",
  "issueDate": "2020-01-01",
  "expiryDate": "2030-01-01",
  "issuingCountry": "Deutschland",
  "issuingAuthority": "Stadt Berlin"
}
```

**Fehlerantworten:**
- `400 Bad Request`: Ungültiger Request (z.B. fehlendes Bild)
- `401 Unauthorized`: Fehlende oder ungültige Authentifizierung
- `500 Internal Server Error`: Serverfehler oder Fehler bei der KI-Verarbeitung

### Identifikationsdokumente verwalten

#### `POST /api/identification-documents`

Fügt ein neues Identifikationsdokument für einen Benutzer hinzu.

**Authentifizierung erforderlich**: Ja

**Request mit FormData:**
```
FormData:
  - userId: 123
  - documentType: "passport"
  - documentNumber: "P1234567"
  - issueDate: "2020-01-01"
  - expiryDate: "2030-01-01"
  - issuingCountry: "Deutschland"
  - issuingAuthority: "Bundespolizei"
  - documentFile: [Binärdatei]
```

**Erfolgsantwort (201 Created):**
```json
{
  "id": 1,
  "userId": 123,
  "documentType": "passport",
  "documentNumber": "P1234567",
  "issueDate": "2020-01-01T00:00:00.000Z",
  "expiryDate": "2030-01-01T00:00:00.000Z",
  "issuingCountry": "Deutschland",
  "issuingAuthority": "Bundespolizei",
  "documentFile": "uploads/documents/user_123/doc_1.pdf",
  "isVerified": false,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-01T12:00:00.000Z"
}
```

#### `GET /api/identification-documents`

Ruft alle Identifikationsdokumente für den aktuellen Benutzer ab.

**Authentifizierung erforderlich**: Ja

**Erfolgsantwort (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "documentType": "passport",
    "documentNumber": "P1234567",
    "issueDate": "2020-01-01T00:00:00.000Z",
    "expiryDate": "2030-01-01T00:00:00.000Z",
    "issuingCountry": "Deutschland",
    "issuingAuthority": "Bundespolizei",
    "documentFile": "uploads/documents/user_123/doc_1.pdf",
    "isVerified": false,
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-01T12:00:00.000Z"
  }
]
```

#### `GET /api/identification-documents/:id`

Ruft ein bestimmtes Identifikationsdokument ab.

**Authentifizierung erforderlich**: Ja

**Erfolgsantwort (200 OK):**
```json
{
  "id": 1,
  "userId": 123,
  "documentType": "passport",
  "documentNumber": "P1234567",
  "issueDate": "2020-01-01T00:00:00.000Z",
  "expiryDate": "2030-01-01T00:00:00.000Z",
  "issuingCountry": "Deutschland",
  "issuingAuthority": "Bundespolizei",
  "documentFile": "uploads/documents/user_123/doc_1.pdf",
  "isVerified": false,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-01T12:00:00.000Z"
}
```

#### `PUT /api/identification-documents/:id`

Aktualisiert ein bestehendes Identifikationsdokument.

**Authentifizierung erforderlich**: Ja

**Request mit FormData:**
```
FormData:
  - documentNumber: "P7654321"
  - issueDate: "2021-01-01"
  - expiryDate: "2031-01-01"
  - issuingCountry: "Deutschland"
  - issuingAuthority: "Bundespolizei Berlin"
  - documentFile: [Binärdatei] (optional)
```

**Erfolgsantwort (200 OK):**
```json
{
  "id": 1,
  "userId": 123,
  "documentType": "passport",
  "documentNumber": "P7654321",
  "issueDate": "2021-01-01T00:00:00.000Z",
  "expiryDate": "2031-01-01T00:00:00.000Z",
  "issuingCountry": "Deutschland",
  "issuingAuthority": "Bundespolizei Berlin",
  "documentFile": "uploads/documents/user_123/doc_1_updated.pdf",
  "isVerified": false,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-02T10:30:00.000Z"
}
```

#### `DELETE /api/identification-documents/:id`

Löscht ein Identifikationsdokument.

**Authentifizierung erforderlich**: Ja

**Erfolgsantwort (200 OK):**
```json
{
  "message": "Dokument erfolgreich gelöscht"
}
```

#### `PUT /api/identification-documents/:id/verify`

Verifiziert ein Identifikationsdokument (nur für Administratoren).

**Authentifizierung erforderlich**: Ja (Administrator)

**Request-Body:**
```json
{
  "isVerified": true
}
```

**Erfolgsantwort (200 OK):**
```json
{
  "id": 1,
  "userId": 123,
  "documentType": "passport",
  "documentNumber": "P7654321",
  "issueDate": "2021-01-01T00:00:00.000Z",
  "expiryDate": "2031-01-01T00:00:00.000Z",
  "issuingCountry": "Deutschland",
  "issuingAuthority": "Bundespolizei Berlin",
  "documentFile": "uploads/documents/user_123/doc_1.pdf",
  "isVerified": true,
  "verificationDate": "2023-01-03T14:25:00.000Z",
  "verifiedBy": 456,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-03T14:25:00.000Z"
}
```

#### `GET /api/identification-documents/:id/download`

Lädt die Datei eines Identifikationsdokuments herunter.

**Authentifizierung erforderlich**: Ja

**Erfolgsantwort (200 OK):**
- Die Dokumentdatei wird als Download zurückgegeben.

**Fehlerantworten für alle Endpunkte:**
- `400 Bad Request`: Ungültiger Request
- `401 Unauthorized`: Fehlende oder ungültige Authentifizierung
- `403 Forbidden`: Keine Berechtigung für diese Operation
- `404 Not Found`: Dokument nicht gefunden
- `500 Internal Server Error`: Serverfehler

---

Diese API-Referenz bietet einen umfassenden Überblick über alle verfügbaren Endpunkte des Intranet-Systems. Bei Fragen oder Problemen wenden Sie sich an das Entwicklungsteam. 