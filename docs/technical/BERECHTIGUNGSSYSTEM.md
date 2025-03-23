# BERECHTIGUNGSSYSTEM

Diese Dokumentation beschreibt das Berechtigungssystem des Intranet-Systems, einschließlich der Rollen, Berechtigungen und deren Implementierung.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Rollen und Berechtigungen](#rollen-und-berechtigungen)
   - [Standardrollen](#standardrollen)
   - [Berechtigungscodes](#berechtigungscodes)
3. [Datenmodell](#datenmodell)
4. [Implementierung](#implementierung)
   - [Backend-Implementierung](#backend-implementierung)
   - [Frontend-Implementierung](#frontend-implementierung)
5. [Berechtigungsprüfung](#berechtigungsprüfung)
   - [API-Endpunkte](#api-endpunkte)
   - [Frontend-Components](#frontend-components)
6. [Administration](#administration)
   - [Rollenverwaltung](#rollenverwaltung)
   - [Berechtigungsverwaltung](#berechtigungsverwaltung)
7. [Bewährte Methoden](#bewährte-methoden)
8. [Fehlerbehebung](#fehlerbehebung)

## Übersicht

Das Intranet-System verwendet ein rollenbasiertes Zugriffssteuerungssystem (RBAC), das Benutzern bestimmte Rollen zuweist, die wiederum mit spezifischen Berechtigungen verbunden sind. Dieses System ermöglicht eine granulare Kontrolle über die Zugriffsrechte verschiedener Benutzergruppen im System.

Die Hauptkomponenten des Berechtigungssystems sind:

- **Benutzer**: Individuelle Systembenutzer
- **Rollen**: Definierte Funktionen oder Arbeitsbereiche im System (z.B. Administrator, Manager, Mitarbeiter)
- **Berechtigungen**: Spezifische Aktionen, die im System ausgeführt werden können
- **Module**: Funktionsbereiche des Systems, die bestimmte Berechtigungen erfordern

Das Berechtigungssystem ist sowohl im Backend (für API-Zugriffskontrolle) als auch im Frontend (für UI-Elementsteuerung) implementiert.

## Rollen und Berechtigungen

### Standardrollen

Das System enthält die folgenden vordefinierten Rollen:

1. **Administrator**
   - Vollständiger Zugriff auf alle Systembereiche
   - Kann Benutzer, Rollen und Berechtigungen verwalten
   - Kann Systemeinstellungen konfigurieren

2. **Manager**
   - Kann Teams und Niederlassungen verwalten
   - Kann Arbeitszeitberichte für Teammitglieder einsehen
   - Kann Aufgaben und Anfragen zuweisen und verwalten
   - Kann Wiki-Artikel erstellen und bearbeiten

3. **Mitarbeiter**
   - Kann eigene Arbeitszeit erfassen
   - Kann eigene Aufgaben einsehen und verwalten
   - Kann Anfragen stellen
   - Kann Wiki-Artikel lesen

4. **Gast**
   - Eingeschränkter Lesezugriff auf öffentliche Bereiche
   - Kann keine Änderungen vornehmen

### Berechtigungscodes

Berechtigungen werden durch eindeutige Codes definiert, die nach dem folgenden Schema aufgebaut sind:

```
[MODULE]_[AKTION]
```

Beispiele für Berechtigungscodes:

| Code | Beschreibung | Module |
|------|--------------|--------|
| USER_VIEW | Benutzer anzeigen | Benutzerverwaltung |
| USER_CREATE | Benutzer erstellen | Benutzerverwaltung |
| USER_EDIT | Benutzer bearbeiten | Benutzerverwaltung |
| USER_DELETE | Benutzer löschen | Benutzerverwaltung |
| ROLE_MANAGE | Rollen verwalten | Benutzerverwaltung |
| WORKTIME_VIEW_OWN | Eigene Arbeitszeit anzeigen | Zeiterfassung |
| WORKTIME_VIEW_ALL | Alle Arbeitszeiten anzeigen | Zeiterfassung |
| WORKTIME_EDIT_OWN | Eigene Arbeitszeit bearbeiten | Zeiterfassung |
| WORKTIME_EDIT_ALL | Alle Arbeitszeiten bearbeiten | Zeiterfassung |
| TASK_CREATE | Aufgaben erstellen | Aufgabenverwaltung |
| TASK_ASSIGN | Aufgaben zuweisen | Aufgabenverwaltung |
| TASK_VIEW_OWN | Eigene Aufgaben anzeigen | Aufgabenverwaltung |
| TASK_VIEW_ALL | Alle Aufgaben anzeigen | Aufgabenverwaltung |
| REQUEST_CREATE | Anfragen erstellen | Anfragenverwaltung |
| REQUEST_APPROVE | Anfragen genehmigen | Anfragenverwaltung |
| PAYROLL_VIEW_OWN | Eigene Lohnabrechnung anzeigen | Lohnabrechnung |
| PAYROLL_MANAGE | Lohnabrechnungen verwalten | Lohnabrechnung |
| CEREBRO_READ | Wiki-Artikel lesen | Cerebro Wiki |
| CEREBRO_WRITE | Wiki-Artikel erstellen/bearbeiten | Cerebro Wiki |
| CEREBRO_ADMIN | Wiki-Kategorien und Einstellungen verwalten | Cerebro Wiki |
| SETTINGS_MANAGE | Systemeinstellungen verwalten | Administration |

Die vollständige Liste der Berechtigungscodes ist in der Datenbank in der Tabelle `Permission` gespeichert.

## Datenmodell

Das Berechtigungssystem basiert auf den folgenden Datenbankmodellen:

### User

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  firstName    String
  lastName     String
  email        String   @unique
  roleId       Int
  role         Role     @relation(fields: [roleId], references: [id])
  // Weitere Felder...
}
```

### Role

```prisma
model Role {
  id           Int             @id @default(autoincrement())
  name         String          @unique
  description  String?
  users        User[]
  permissions  RolePermission[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}
```

### Permission

```prisma
model Permission {
  id           Int             @id @default(autoincrement())
  code         String          @unique
  description  String
  module       String
  roles        RolePermission[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}
```

### RolePermission (Verbindungstabelle)

```prisma
model RolePermission {
  id           Int         @id @default(autoincrement())
  roleId       Int
  permissionId Int
  role         Role        @relation(fields: [roleId], references: [id])
  permission   Permission  @relation(fields: [permissionId], references: [id])
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@unique([roleId, permissionId])
}
```

## Implementierung

### Backend-Implementierung

#### Middleware für Berechtigungsprüfung

Die Berechtigungsprüfung im Backend erfolgt durch eine Express-Middleware, die vor jedem API-Endpunkt ausgeführt wird:

```typescript
// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Authentifizierungs-Middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTHENTICATION_ERROR', message: 'Nicht authentifiziert' } 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: { code: 'AUTHENTICATION_ERROR', message: 'Ungültiger Token' } 
    });
  }
};

// Berechtigungs-Middleware
export const hasPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      
      // Benutzerrolle mit zugehörigen Berechtigungen abrufen
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'RESOURCE_NOT_FOUND', message: 'Benutzer nicht gefunden' } 
        });
      }

      // Berechtigungen überprüfen
      const hasRequiredPermission = user.role.permissions.some(
        rp => rp.permission.code === requiredPermission
      );

      if (!hasRequiredPermission) {
        return res.status(403).json({ 
          success: false, 
          error: { code: 'AUTHORIZATION_ERROR', message: 'Keine Berechtigung für diese Aktion' } 
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Serverfehler' } 
      });
    }
  };
};
```

#### Verwendung in API-Routen

```typescript
// src/routes/user.routes.ts

import { Router } from 'express';
import { authenticate, hasPermission } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// Öffentliche Routen
router.post('/login', userController.login);

// Geschützte Routen
router.get('/profile', authenticate, userController.getProfile);

// Routen mit Berechtigungsprüfung
router.get('/users', authenticate, hasPermission('USER_VIEW'), userController.getAllUsers);
router.post('/users', authenticate, hasPermission('USER_CREATE'), userController.createUser);
router.put('/users/:id', authenticate, hasPermission('USER_EDIT'), userController.updateUser);
router.delete('/users/:id', authenticate, hasPermission('USER_DELETE'), userController.deleteUser);

export default router;
```

### Frontend-Implementierung

#### Auth-Context

Im Frontend wird ein Auth-Context verwendet, um den Authentifizierungsstatus und die Berechtigungen des Benutzers zu verwalten:

```tsx
// src/contexts/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: {
    id: number;
    name: string;
    permissions: Array<{
      code: string;
      description: string;
    }>;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      verifyToken();
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/api/auth/verify');
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        setPermissions(userData.role.permissions.map((p: any) => p.code));
        setIsAuthenticated(true);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  };

  const login = async (username: string, password: string) => {
    const response = await api.post('/api/auth/login', { username, password });
    if (response.data.success) {
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setPermissions(user.role.permissions.map((p: any) => p.code));
      setIsAuthenticated(true);
    } else {
      throw new Error(response.data.error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setPermissions([]);
    setIsAuthenticated(false);
  };

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, permissions, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

#### PermissionGuard-Komponente

Diese Komponente kann verwendet werden, um UI-Elemente basierend auf Berechtigungen anzuzeigen oder zu verbergen:

```tsx
// src/components/PermissionGuard.tsx

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default PermissionGuard;
```

Verwendung:

```tsx
// Beispiel für die Verwendung von PermissionGuard in einer Komponente
import PermissionGuard from '../components/PermissionGuard';

const UserManagementPage = () => {
  return (
    <div>
      <h1>Benutzerverwaltung</h1>
      
      <PermissionGuard permission="USER_VIEW">
        <UserList />
      </PermissionGuard>
      
      <PermissionGuard permission="USER_CREATE">
        <button>Neuen Benutzer erstellen</button>
      </PermissionGuard>
    </div>
  );
};
```

#### Protected Route

Für geschützte Routen kann eine Higher-Order-Komponente verwendet werden:

```tsx
// src/components/ProtectedRoute.tsx

import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps extends RouteProps {
  permission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  permission,
  ...rest 
}) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (permission && !hasPermission(permission)) {
    return <Redirect to="/unauthorized" />;
  }

  return <Route {...rest} />;
};

export default ProtectedRoute;
```

Verwendung:

```tsx
// App.tsx
import { BrowserRouter as Router, Switch } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute 
          path="/users" 
          component={UserManagement} 
          permission="USER_VIEW" 
        />
        <ProtectedRoute 
          path="/settings" 
          component={Settings} 
          permission="SETTINGS_MANAGE" 
        />
      </Switch>
    </Router>
  );
};
```

## Berechtigungsprüfung

### API-Endpunkte

Berechtigungen werden bei API-Anfragen auf folgende Weise geprüft:

1. Der Client sendet das JWT-Token im Authorization-Header.
2. Die `authenticate`-Middleware verifiziert das Token und extrahiert die Benutzer-ID.
3. Die `hasPermission`-Middleware prüft, ob der Benutzer die erforderliche Berechtigung besitzt.
4. Bei erfolgreicher Prüfung wird die Anfrage an den Controller weitergeleitet, andernfalls wird ein Fehler zurückgegeben.

### Frontend-Components

Im Frontend werden Berechtigungen verwendet, um:

1. UI-Elemente bedingt zu rendern (mit `PermissionGuard`).
2. Den Zugriff auf bestimmte Routen zu beschränken (mit `ProtectedRoute`).
3. Benutzeraktionen basierend auf Berechtigungen zu aktivieren oder zu deaktivieren.

## Administration

### Rollenverwaltung

Administratoren können Rollen über das Administrationsmodul verwalten:

1. Neue Rollen erstellen
2. Bestehende Rollen bearbeiten
3. Rollen löschen (wenn sie nicht verwendet werden)
4. Berechtigungen zu Rollen hinzufügen oder entfernen

API-Endpunkte:

- `GET /api/roles`: Alle Rollen abrufen
- `GET /api/roles/:id`: Eine bestimmte Rolle abrufen
- `POST /api/roles`: Neue Rolle erstellen
- `PUT /api/roles/:id`: Rolle aktualisieren
- `DELETE /api/roles/:id`: Rolle löschen
- `PUT /api/roles/:id/permissions`: Rollenberechtigungen aktualisieren

### Berechtigungsverwaltung

Das System verwendet vordefinierte Berechtigungen, die nicht direkt über die Benutzeroberfläche bearbeitet werden können. Neue Berechtigungen werden während der Entwicklung hinzugefügt und über Datenbankmigrationen bereitgestellt.

Die Berechtigungsliste kann wie folgt abgerufen werden:

- `GET /api/permissions`: Alle verfügbaren Berechtigungen abrufen

## Bewährte Methoden

Folgende Best Practices sollten bei der Arbeit mit dem Berechtigungssystem beachtet werden:

1. **Prinzip der geringsten Berechtigung**: Weisen Sie Benutzern nur die Berechtigungen zu, die sie für ihre Aufgaben benötigen.

2. **Funktionale Rollen**: Erstellen Sie Rollen basierend auf funktionalen Anforderungen und Arbeitsbereichen.

3. **Konsistente Benennung**: Verwenden Sie konsistente Namenskonventionen für Berechtigungscodes (MODULE_AKTION).

4. **Granulare Berechtigungen**: Definieren Sie spezifische Berechtigungen für einzelne Aktionen, anstatt allgemeine Zugriffsrechte.

5. **Frontend-Validierung**: Auch wenn UI-Elemente basierend auf Berechtigungen ausgeblendet werden, stellen Sie sicher, dass alle API-Anfragen auf Serverseite überprüft werden.

6. **Regelmäßige Überprüfung**: Überprüfen Sie regelmäßig die Rollenzuweisungen und Berechtigungen, um sicherzustellen, dass sie aktuell und angemessen sind.

## Fehlerbehebung

### Häufige Probleme und Lösungen

1. **Benutzer kann auf bestimmte Funktionen nicht zugreifen**
   - Überprüfen Sie die Rollenzuweisung des Benutzers
   - Überprüfen Sie, ob die Rolle die erforderlichen Berechtigungen enthält
   - Überprüfen Sie die Frontend-Implementierung der Berechtigungsprüfung

2. **Berechtigungsfehler bei API-Anfragen**
   - Überprüfen Sie das JWT-Token (Gültigkeit, Ablauf)
   - Überprüfen Sie die Berechtigungen der Benutzerrolle
   - Überprüfen Sie die korrekte Implementierung der `hasPermission`-Middleware

3. **Fehler bei der Rollenzuweisung**
   - Stellen Sie sicher, dass die Rolle existiert
   - Überprüfen Sie, ob die Rollenzuweisung korrekt in der Datenbank gespeichert wird

### Logging und Debugging

Bei Berechtigungsproblemen können folgende Logs hilfreich sein:

- **Authentifizierungslogs**: Informationen über erfolgreiche/fehlgeschlagene Anmeldeversuche
- **Berechtigungslogs**: Informationen über verweigerte Zugriffe mit Details zu fehlenden Berechtigungen
- **API-Zugriffslogs**: Vollständige Informationen über API-Anfragen und -Antworten

---

Diese Dokumentation bietet einen umfassenden Überblick über das Berechtigungssystem des Intranet-Systems. Bei Änderungen am Berechtigungsmodell sollte diese Dokumentation aktualisiert werden. 