# Backend-Setup

1. Erstelle `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  username   String   @unique
  password   String
  first_name String
  last_name  String
  roles      Role[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Role {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  users       User[]
  permissions Permission[]
}

model Permission {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  roles       Role[]
}
```

2. Erstelle erste Route in src/routes/auth.ts:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
    // Registrierungslogik mit Prisma
});

router.post('/login', async (req, res) => {
    // Login-Logik mit Prisma und JWT
});

export default router;
```

3. Erstelle Route in src/routes/requests.ts:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/requests', async (req, res) => {
    // Request erstellen mit Prisma
});

router.get('/requests', async (req, res) => {
    // Requests auflisten mit Prisma
});

router.put('/requests/:id', async (req, res) => {
    // Request-Status aktualisieren mit Prisma
});

export default router;
```

4. Erstelle Route in src/routes/tasks.ts:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/tasks', async (req, res) => {
    // Task erstellen mit Prisma
});

router.get('/tasks', async (req, res) => {
    // Tasks auflisten mit Prisma
});

router.put('/tasks/:id', async (req, res) => {
    // Task-Status aktualisieren mit Prisma
});

export default router;
```

5. Erstelle Route in src/routes/roles.ts:
```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/roles', async (req, res) => {
    // Rollen auflisten mit Prisma
});

router.post('/roles', async (req, res) => {
    // Rolle erstellen mit Prisma
});

router.get('/permissions', async (req, res) => {
    // Berechtigungen auflisten mit Prisma
});

export default router;
```

6. Erstelle src/index.ts:
```typescript
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import taskRoutes from './routes/tasks';
import roleRoutes from './routes/roles';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', requestRoutes);
app.use('/api', taskRoutes);
app.use('/api', roleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
```
