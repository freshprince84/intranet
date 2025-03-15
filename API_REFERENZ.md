# API-REFERENZ

Diese Dokumentation bietet eine vollständige Referenz aller API-Endpunkte des Intranet-Systems.

## Inhaltsverzeichnis

1. [Allgemeine Informationen](#allgemeine-informationen)
2. [Authentifizierung](#authentifizierung)
3. [Benutzer-API](#benutzer-api)
4. [Zeiterfassungs-API](#zeiterfassungs-api)
5. [Task-API](#task-api)
6. [Request-API](#request-api)
7. [Benachrichtigungs-API](#benachrichtigungs-api)
8. [Cerebro-API](#cerebro-api)
9. [Lohnabrechnung-API](#lohnabrechnung-api)
10. [Fehlerbehandlung](#fehlerbehandlung)

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
  : 'http://localhost:5000';   // Produktionsumgebung
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

**Beschreibung**: Registriert einen neuen Benutzer (wenn die öffentliche Registrierung aktiviert ist).

**Request-Body**:
```json
{
  "username": "newuser",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "email": "newuser@example.com"
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
      "email": "newuser@example.com"
    }
  }
}
```

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

---

Diese API-Referenz bietet einen umfassenden Überblick über alle verfügbaren Endpunkte des Intranet-Systems. Bei Fragen oder Problemen wenden Sie sich an das Entwicklungsteam. 