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
  page        String
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
      { roleId: adminRole.id, page: 'dashboard', accessLevel: 'both' },
      { roleId: adminRole.id, page: 'worktracker', accessLevel: 'both' },
      { roleId: adminRole.id, page: 'requests', accessLevel: 'both' },
      { roleId: adminRole.id, page: 'tasks', accessLevel: 'both' },
      { roleId: adminRole.id, page: 'roles', accessLevel: 'both' },
      { roleId: adminRole.id, page: 'settings', accessLevel: 'both' },
      
      { roleId: userRole.id, page: 'dashboard', accessLevel: 'read' },
      { roleId: userRole.id, page: 'worktracker', accessLevel: 'both' },
      { roleId: userRole.id, page: 'requests', accessLevel: 'read' },
      { roleId: userRole.id, page: 'tasks', accessLevel: 'read' },
      
      { roleId: hamburgerRole.id, page: 'dashboard', accessLevel: 'read' },
      { roleId: hamburgerRole.id, page: 'worktracker', accessLevel: 'read' }
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
