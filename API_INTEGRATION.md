# API-Integration: Best Practices und Fallstricke

Diese Dokumentation beschreibt die besten Praktiken für die Integration zwischen Frontend und Backend in unserem Intranet-Projekt. Sie adressiert spezifische Probleme, die wir bei der Entwicklung identifiziert haben, und bietet Lösungen, um diese in Zukunft zu vermeiden.

## 1. Typsicherheit zwischen Frontend und Backend

### 1.1. Problem: TypeScript-Interface-Konflikte

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

### 1.2. Lösung: Zentralisierte Typdefinitionen

1. **Konsolidieren Sie globale Interface-Erweiterungen** - Definieren Sie alle Erweiterungen eines Interfaces an einem Ort:

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

2. **Importieren Sie diese Typen** in allen relevanten Dateien, anstatt sie neu zu definieren.

## 2. Robuste API-Verarbeitung im Frontend

### 2.1. Problem: Ungeschützte Zugriffe auf API-Antworten

Der häufigste Frontend-Fehler ist der ungeschützte Zugriff auf Eigenschaften von API-Antworten:

```typescript
// Problematischer Code
const response = await api.getNotifications();
setNotifications(response.data);  // Fehler, wenn response.data undefiniert ist

// Noch problematischer
notifications.length  // Fehler, wenn notifications undefiniert ist
```

### 2.2. Lösung: Defensive Programmierung

1. **API-Ebene absichern**: Immer gültige Fallback-Werte zurückgeben:

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

2. **Komponenten-Ebene absichern**: API-Antworten immer auf gültige Werte prüfen:

```typescript
// In NotificationBell.tsx
const fetchRecentNotifications = async () => {
  try {
    const response = await notificationApi.getNotifications(1, 5);
    // Sicherstellen, dass immer ein Array verwendet wird
    setNotifications(Array.isArray(response.data) ? response.data : 
                    (response.data?.notifications || []));
  } catch (err) {
    setNotifications([]);  // Leeres Array als Fallback
  }
};
```

3. **Rendering-Ebene absichern**: Immer prüfen, ob Daten existieren, bevor darauf zugegriffen wird:

```jsx
// JSX mit sicheren Zugriffen
{notifications && notifications.length > 0 ? (
  <List>
    {notifications.map(notification => (
      <ListItem key={notification.id}>
        {notification.title}
      </ListItem>
    ))}
  </List>
) : (
  <Typography>Keine Benachrichtigungen vorhanden</Typography>
)}
```

## 3. Konsistente Feldnamen zwischen Prisma-Schema und Frontend

### 3.1. Problem: Inkonsistente Benennung von Feldern

Ein häufiges Problem sind Feldnamen, die im Prisma-Schema anders benannt sind als in den Frontend-Interfaces.

**Beispiel für Inkonsistenz:**
```typescript
// Prisma-Schema
model NotificationSettings {
  taskCreate Boolean @default(true)
  // ...
}

// Frontend-Interface
interface NotificationSettings {
  taskEnabled: boolean;  // FALSCH: Sollte taskCreate sein
  // ...
}
```

### 3.2. Lösung: Strikte Namenskonventionen

1. **Exakte Übernahme der Prisma-Feldnamen** im Frontend:

```typescript
// Frontend-Interface - RICHTIG
interface NotificationSettings {
  taskCreate: boolean;  // Exakt wie im Prisma-Schema
  taskUpdate: boolean;
  taskDelete: boolean;
  // ...
}
```

2. **Änderungsprozess etablieren**: Bei Änderungen am Datenbankschema:
   - Aktualisieren Sie zuerst das Prisma-Schema
   - Führen Sie `prisma generate` aus
   - Aktualisieren Sie alle betroffenen Frontend-Interfaces
   - Aktualisieren Sie die API-Funktionen
   - Überprüfen Sie alle Komponenten, die auf die geänderten Felder zugreifen

## 4. API-Antwortformate standardisieren

### 4.1. Problem: Inkonsistente API-Antwortformate

Backend-Controller geben manchmal unterschiedliche Datenstrukturen zurück, was die Frontend-Verarbeitung erschwert:

```typescript
// Inkonsistentes Antwortformat
// Controller 1: Gibt direkt ein Array zurück
res.json(notifications);

// Controller 2: Gibt ein Objekt mit einem Datenfeld zurück
res.json({ 
  notifications,
  pagination: { total, page, limit, pages }
});
```

### 4.2. Lösung: Standardisierte API-Antworten

1. **Standardisiertes Antwortformat für Listen**:

```typescript
// Konsistentes Antwortformat für Listen
res.json({
  data: items,
  meta: {
    total,
    page,
    limit,
    pages
  }
});
```

2. **Standardisiertes Antwortformat für einzelne Ressourcen**:

```typescript
// Konsistentes Antwortformat für einzelne Ressourcen
res.json({
  data: item,
  meta: { 
    timestamp: new Date().toISOString() 
  }
});
```

3. **Standardisiertes Fehlerformat**:

```typescript
// Konsistentes Fehlerformat
res.status(statusCode).json({
  error: {
    code: 'ERROR_CODE',
    message: 'Benutzerfreundliche Fehlermeldung',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  }
});
```

## 5. Häufige Fallstricke bei spezifischen Modulen

### 5.1. Notification-System

1. **Problem**: Zugriff auf `notifications.length` ohne Prüfung, ob `notifications` definiert ist
   
   **Lösung**: Immer defensiv programmieren:
   ```typescript
   const count = notifications && notifications.length ? notifications.length : 0;
   ```

2. **Problem**: Unklare Beziehung zwischen Benachrichtigungstypen und zugehörigen Entitäten
   
   **Lösung**: Klar definierte Beziehungen in den Typdefinitionen:
   ```typescript
   export enum NotificationType {
     task = 'task',
     request = 'request',
     // ...
   }
   
   // Mit klaren Typbeziehungen
   export interface Notification {
     type: NotificationType;
     relatedEntityId?: number;
     relatedEntityType?: 'create' | 'update' | 'delete' | 'status';
   }
   ```

### 5.2. Settings-Module

1. **Problem**: Vermischung von System- und Benutzereinstellungen
   
   **Lösung**: Klare Trennung in den API-Endpunkten und Interfaces:
   ```typescript
   // System Settings
   GET /api/settings/notifications
   
   // User Settings
   GET /api/settings/notifications/user
   ```

## 6. Checkliste für die Integration neuer Tabellen

Bei der Integration einer neuen Tabelle oder eines neuen Features:

1. **Schemaplanung**:
   - [ ] Prisma-Schema definieren (mit standardisierten Feldnamen)
   - [ ] Migrations-Script erstellen und testen
   - [ ] Frontend-Interfaces erstellen, die exakt das Schema widerspiegeln

2. **Backend-Implementation**:
   - [ ] Controller mit standardisierten Antwortformaten erstellen
   - [ ] Konsistente Fehlerbehandlung implementieren
   - [ ] Einheitliche Validierung mit Schemas erstellen

3. **Frontend-Integration**:
   - [ ] API-Funktionen mit defensiver Programmierung implementieren
   - [ ] Komponenten mit robuster Datenverarbeitung erstellen
   - [ ] Umfassende Tests für Fehlerfälle durchführen

4. **Gesamttests**:
   - [ ] API-Endpunkte mit Postman oder ähnlichen Tools testen
   - [ ] Frontend-Funktionalität unter verschiedenen Bedingungen testen
   - [ ] Fehlerszenarien testen (Netzwerkfehler, leere Antworten, etc.)

Durch die Befolgung dieser Richtlinien können wir viele der häufigsten Probleme bei der Integration von Frontend und Backend vermeiden und eine robustere Anwendung entwickeln.
