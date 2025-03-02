# Backend-Setup mit TypeScript und Prisma

## 1. Prisma Schema

Erstelle das Prisma-Schema in `prisma/schema.prisma`. Hier ein Beispiel für ein komplexeres Schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int       @id @default(autoincrement())
  username      String    @unique
  email         String    @unique
  password      String
  firstName     String
  lastName      String
  birthday      DateTime?
  bankDetails   String?
  contract      String?
  salary        Float?
  roles         UserRole[]
  branches      UsersBranches[]
  workTimes     WorkTime[]
  tasksResponsible Task[] @relation("responsible")
  tasksQualityControl Task[] @relation("quality_control")
  requestsRequester Request[] @relation("requester")
  requestsResponsible Request[] @relation("responsible")
  settings      Settings?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Role {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  users       UserRole[]
  permissions Permission[]
}

model UserRole {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  role      Role     @relation(fields: [roleId], references: [id])
  roleId    Int
  lastUsed  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, roleId])
}

model Permission {
  id          Int      @id @default(autoincrement())
  entity      String   // Früher 'page', jetzt für Seiten und Tabellen
  entityType  String   @default("page") // "page" oder "table"
  accessLevel String
  role        Role     @relation(fields: [roleId], references: [id])
  roleId      Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 2. Umgebungsvariablen

Erstelle die `.env`-Datei im Backend-Verzeichnis:
```
# Prisma Datenbankverbindung
DATABASE_URL="postgresql://youruser:yourpassword@localhost:5432/worktracker"
JWT_SECRET=yourjwtsecret
PORT=5000
```

## 3. Controller und Routen

### Authentifizierung

Erstelle den Auth-Controller in `src/controllers/authController.ts`:

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName }: RegisterRequest = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName
      }
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Benutzer erfolgreich erstellt',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Fehler bei der Registrierung', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// ... weitere Authentifizierungsfunktionen
```

### Auth-Middleware

Erstelle die Auth-Middleware in `src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: number;
  username: string;
}

// Erweitere den Request-Typ um User-Informationen
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Kein Token bereitgestellt' });
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret'
    ) as DecodedToken;
    
    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      username: decoded.username
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Ungültiger Token' });
  }
};
```

### Routen

Erstelle die Auth-Route in `src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/user', authMiddleware, getCurrentUser);

export default router;
```

## 4. Hauptanwendung

Erstelle die Hauptanwendung in `src/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import requestRoutes from './routes/requests';
import taskRoutes from './routes/tasks';
import roleRoutes from './routes/roles';
import branchRoutes from './routes/branches';
import worktimeRoutes from './routes/worktime';
import settingsRoutes from './routes/settings';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Uploads-Verzeichnis
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routen
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/worktime', worktimeRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route nicht gefunden' });
});

export default app;
```

## 5. Server-Startskript

Erstelle das Server-Startskript in `src/index.ts`:

```typescript
import app from './app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verbindung zur Datenbank herstellen
    await prisma.$connect();
    console.log('Verbindung zur Datenbank hergestellt');
    
    // Server starten
    app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
```

## 6. Seed-Daten

Erstelle Seed-Daten in `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Rollen erstellen
  const adminRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator mit vollen Rechten'
    }
  });

  const userRole = await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'user',
      description: 'Standardbenutzer'
    }
  });

  const hamburgerRole = await prisma.role.upsert({
    where: { id: 999 },
    update: {},
    create: {
      name: 'hamburger',
      description: 'Standardrolle für neue Benutzer'
    }
  });

  // Berechtigungen erstellen
  await prisma.permission.createMany({
    skipDuplicates: true,
    data: [
      // Seitenberechtigungen für Admin
      { roleId: adminRole.id, entity: 'dashboard', entityType: 'page', accessLevel: 'both' },
      { roleId: adminRole.id, entity: 'worktracker', entityType: 'page', accessLevel: 'both' },
      { roleId: adminRole.id, entity: 'requests', entityType: 'page', accessLevel: 'both' },
      { roleId: adminRole.id, entity: 'tasks', entityType: 'page', accessLevel: 'both' },
      { roleId: adminRole.id, entity: 'roles', entityType: 'page', accessLevel: 'both' },
      { roleId: adminRole.id, entity: 'settings', entityType: 'page', accessLevel: 'both' },
      
      // Tabellenberechtigungen für Admin
      { roleId: adminRole.id, entity: 'requests', entityType: 'table', accessLevel: 'both' },
      { roleId: adminRole.id, entity: 'tasks', entityType: 'table', accessLevel: 'both' },
      
      // Seitenberechtigungen für User
      { roleId: userRole.id, entity: 'dashboard', entityType: 'page', accessLevel: 'read' },
      { roleId: userRole.id, entity: 'worktracker', entityType: 'page', accessLevel: 'both' },
      { roleId: userRole.id, entity: 'requests', entityType: 'page', accessLevel: 'read' },
      { roleId: userRole.id, entity: 'tasks', entityType: 'page', accessLevel: 'read' },
      
      // Tabellenberechtigungen für User
      { roleId: userRole.id, entity: 'requests', entityType: 'table', accessLevel: 'read' },
      { roleId: userRole.id, entity: 'tasks', entityType: 'table', accessLevel: 'read' },
      
      // Seitenberechtigungen für Hamburger-Rolle
      { roleId: hamburgerRole.id, entity: 'dashboard', entityType: 'page', accessLevel: 'read' },
      { roleId: hamburgerRole.id, entity: 'worktracker', entityType: 'page', accessLevel: 'read' }
    ]
  });

  // Admin-Benutzer erstellen
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User'
    }
  });

  // Admin-Rolle zuweisen
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
      lastUsed: true
    }
  });

  console.log('Seed-Daten erfolgreich erstellt');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 7. Build und Start

Konfiguriere die Build- und Start-Skripte in `package.json`:

```json
"scripts": {
  "start": "node dist/index.js",
  "dev": "nodemon dist/index.js",
  "build": "tsc",
  "seed": "npx prisma db seed"
},
```

## 8. Verfügbare API-Endpunkte

### Authentifizierung
- `POST /api/auth/register`: Registrierung
- `POST /api/auth/login`: Login
- `GET /api/auth/user`: Aktueller Benutzer
- `POST /api/auth/logout`: Logout

### Benutzerprofil
- `GET /api/users/profile`: Profildaten abrufen
- `PUT /api/users/profile`: Profil aktualisieren

### Requests
- `GET /api/requests`: Alle Requests abrufen
- `POST /api/requests`: Neuen Request erstellen
- `PUT /api/requests/:id`: Request aktualisieren
- `GET /api/requests/:id`: Request-Details abrufen
- `DELETE /api/requests/:id`: Request löschen

### Tasks
- `GET /api/tasks`: Alle Tasks abrufen
- `GET /api/tasks/:id`: Task-Details abrufen
- `POST /api/tasks`: Neuen Task erstellen
- `PUT /api/tasks/:id`: Task aktualisieren
- `DELETE /api/tasks/:id`: Task löschen

### Rollen
- `GET /api/roles`: Alle Rollen abrufen
- `GET /api/roles/:id`: Rollen-Details abrufen
- `POST /api/roles`: Neue Rolle erstellen
- `PUT /api/roles/:id`: Rolle aktualisieren
- `DELETE /api/roles/:id`: Rolle löschen
- `GET /api/roles/:id/permissions`: Berechtigungen einer Rolle abrufen

### Niederlassungen
- `GET /api/branches`: Alle Niederlassungen abrufen

### Arbeitszeiterfassung
- `POST /api/worktime/start`: Startet die Zeiterfassung
- `POST /api/worktime/stop`: Beendet die Zeiterfassung
- `GET /api/worktime`: Liste aller Zeiteinträge
- `PUT /api/worktime/:id`: Aktualisiert einen Zeiteintrag
- `DELETE /api/worktime/:id`: Löscht einen Zeiteintrag
- `GET /api/worktime/stats`: Statistiken abrufen
- `GET /api/worktime/export`: Exportiert Zeiteinträge als Excel
- `GET /api/worktime/active`: Prüft, ob aktuell eine Zeiterfassung läuft

### Notifications
- `GET /api/notifications`: Alle Benachrichtigungen abrufen
- `GET /api/notifications/unread/count`: Anzahl ungelesener Benachrichtigungen
- `GET /api/notifications/:id`: Benachrichtigungsdetails abrufen
- `PATCH /api/notifications/:id/read`: Benachrichtigung als gelesen markieren
- `PATCH /api/notifications/read-all`: Alle Benachrichtigungen als gelesen markieren
- `DELETE /api/notifications/:id`: Benachrichtigung löschen
- `DELETE /api/notifications`: Alle Benachrichtigungen löschen

### Settings
- `GET /api/settings/notifications`: System-weite Benachrichtigungseinstellungen abrufen
- `PUT /api/settings/notifications`: System-weite Benachrichtigungseinstellungen aktualisieren
- `GET /api/settings/notifications/user`: Benutzerspezifische Benachrichtigungseinstellungen abrufen
- `PUT /api/settings/notifications/user`: Benutzerspezifische Benachrichtigungseinstellungen aktualisieren

## 9. Spezielle Datenmodelle und Integrationen

### Notifications-System

Das Notifications-System verwendet folgende Komponenten:

```typescript
// Typen für Benachrichtigungen
export interface NotificationData {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: number;
  relatedEntityType?: string;
}

// Benachrichtigungstypen
export enum NotificationType {
  task = 'task',
  request = 'request',
  user = 'user',
  role = 'role',
  worktime = 'worktime',
  system = 'system'
}
```

Die Benachrichtigungseinstellungen werden in der Settings-Tabelle gespeichert und enthalten folgende Felder:

```typescript
// Typen für Benachrichtigungseinstellungen
export interface NotificationSettings {
  taskCreate: boolean;
  taskUpdate: boolean;
  taskDelete: boolean;
  taskStatusChange: boolean;
  requestCreate: boolean;
  requestUpdate: boolean;
  requestDelete: boolean;
  requestStatusChange: boolean;
  userCreate: boolean;
  userUpdate: boolean;
  userDelete: boolean;
  roleCreate: boolean;
  roleUpdate: boolean;
  roleDelete: boolean;
  worktimeStart: boolean;
  worktimeStop: boolean;
}
```

### Wichtige Hinweise zur Integration

1. **Feldbenennungen konsistent halten**: Achten Sie darauf, dass die Feldnamen zwischen Prisma-Schema und Frontend-Interfaces übereinstimmen. Verwenden Sie exakt dieselben Namen wie im Prisma-Schema definiert.

2. **Typsicherheit gewährleisten**: Bei Änderungen am Datenbankschema müssen alle Interfaces im Frontend und Backend synchron aktualisiert werden.

3. **API-Antworten robust verarbeiten**: Frontend-Code sollte defensive Programmierung verwenden:
   ```typescript
   // Beispiel für robuste Verarbeitung von API-Antworten
   const response = await api.getResource();
   const data = Array.isArray(response.data) ? response.data : 
               (response.data?.items || []);
   ```

4. **TypeScript Interface-Kollisionen vermeiden**: Bei globalen Interface-Erweiterungen wie in Express-Namespace können Konflikte entstehen. Stellen Sie sicher, dass nur eine Quelle diese Definitionen erweitert:
   ```typescript
   // Richtig: Eine einzige Erweiterung des Request-Interfaces
   declare global {
     namespace Express {
       interface Request {
         userId?: number;
         roleId?: number;
         userPermissions?: any[];
       }
     }
   }
   ```

## 8. Authentifizierung und Rollenverwaltung

### 8.1 Authentifizierungs-Middleware

Die Authentifizierung erfolgt über eine Middleware-Funktion, die JWT-Tokens validiert und Benutzerinformationen an den Request anhängt:

```typescript
// Middleware-Funktion für die Authentifizierung
export const authMiddleware = async (req, res, next) => {
  try {
    // Token aus dem Authorization-Header extrahieren
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authentifizierung erforderlich' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token erforderlich' });
    
    // Token validieren
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Benutzer mit Rollen und Berechtigungen abrufen
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { 
        roles: { include: { role: { include: { permissions: true } } } },
        settings: true
      }
    });
    
    if (!user) return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    
    // Benutzer an den Request anhängen
    req.user = user;
    
    // Kompatibilitätsfelder für Legacy-Code
    req.userId = String(user.id);
    
    // Aktive Rolle finden und setzen
    const activeRole = user.roles.find(r => r.lastUsed);
    if (activeRole) {
      req.roleId = String(activeRole.role.id);
    }
    
    next();
  } catch (error) {
    console.error('Fehler in der Auth-Middleware:', error);
    // Fehlerbehandlung...
  }
};

// Export unter beiden Namen für Kompatibilität
export const authenticateToken = authMiddleware;
export default authMiddleware;
```

> **Wichtig:** Sowohl `authMiddleware` als auch `authenticateToken` sind derselbe Export. Bei der Migration von alten Codeteilen muss sichergestellt werden, dass alle Imports korrekt sind.

### 8.2 Rollenwechsel

Der Rollenwechsel erfolgt über den Endpunkt `/api/users/switch-role` und wird wie folgt implementiert:

```typescript
// Aktive Rolle eines Benutzers wechseln
export const switchUserRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Benutzer-ID aus Token-Info oder Request-Body
    const userId = req.user?.id || parseInt(req.userId, 10);
    const { roleId } = req.body;
    
    // Validierungen...
    
    // Prüfen, ob die Rolle dem Benutzer zugewiesen ist
    const userRole = await prisma.userRole.findFirst({
      where: { userId, roleId }
    });
    
    if (!userRole) {
      return res.status(404).json({
        message: 'Diese Rolle ist dem Benutzer nicht zugewiesen'
      });
    }
    
    // Transaktion für den Rollenwechsel
    await prisma.$transaction(async (tx) => {
      // Alle Rollen des Benutzers auf lastUsed=false setzen
      await tx.userRole.updateMany({
        where: { userId },
        data: { lastUsed: false }
      });
      
      // Die ausgewählte Rolle auf lastUsed=true setzen
      await tx.userRole.update({
        where: { id: userRole.id },
        data: { lastUsed: true }
      });
    });
    
    // Benutzer mit aktualisierten Rollen zurückgeben
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: true } } } },
        settings: true
      }
    });
    
    return res.json(updatedUser);
  } catch (error) {
    console.error('Error in switchUserRole:', error);
    res.status(500).json({ message: 'Fehler beim Wechseln der Benutzerrolle' });
  }
};
```

### 8.3 Wichtige Hinweise für TypeScript-Imports

Bei der Verwendung von TypeScript in Express-Projekten gibt es einige wichtige Punkte zu beachten:

1. **Keine .ts-Suffixe in Imports:** Imports sollten keine `.ts`-Endungen enthalten:
   ```typescript
   // Richtig
   import { authMiddleware } from '../middleware/auth';
   
   // Falsch - verursacht Fehler im Build
   import { authMiddleware } from '../middleware/auth.ts';
   ```

2. **Kompatibilitätsexporte:** Wenn Funktionen unter mehreren Namen verwendet werden, sollten alle Namen exportiert werden:
   ```typescript
   // Beide Exporte für die gleiche Funktion
   export const authMiddleware = async (req, res, next) => { /* ... */ };
   export const authenticateToken = authMiddleware;
   ```

3. **Typenerweiterung für Request-Objekte:** TypeScript-Definitionen für Request-Objekte sollten korrekt erweitert werden:
   ```typescript
   declare global {
     namespace Express {
       interface Request {
         user?: any;
         userId: string;
         roleId: string;
       }
     }
   }
   ```

4. **TypeScript-Konfiguration:** In der `tsconfig.json` sollte folgende Option deaktiviert sein:
   ```json
   {
     "compilerOptions": {
       // "rewriteRelativeImportExtensions": false, // Nicht aktivieren!
     }
   }
   ```
