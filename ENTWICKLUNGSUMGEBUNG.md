# ENTWICKLUNGSUMGEBUNG

Diese Dokumentation beschreibt die Einrichtung und Konfiguration der Entwicklungsumgebung für das Intranet-Projekt.

## Inhaltsverzeichnis

1. [Systemanforderungen](#systemanforderungen)
2. [Installation und Projekt-Setup](#installation-und-projekt-setup)
   - [Repository klonen](#repository-klonen)
   - [Backend-Setup](#backend-setup)
   - [Frontend-Setup](#frontend-setup)
3. [Entwicklungsserver](#entwicklungsserver)
4. [Datenbank](#datenbank)
5. [Projektstruktur](#projektstruktur)
6. [Entwicklungsrichtlinien](#entwicklungsrichtlinien)
7. [UI Design-Vorgaben](#ui-design-vorgaben)
8. [Debugging](#debugging)
9. [Testing](#testing)
10. [Deployment](#deployment)

## Systemanforderungen

Für die Entwicklung werden folgende Komponenten benötigt:

- **Node.js**: Version 14.x oder höher
- **npm**: Version 7.x oder höher
- **PostgreSQL**: Version 12.x oder höher
- **Git**: Für Versionskontrolle
- **IDE**: Visual Studio Code (empfohlen)

## Installation und Projekt-Setup

### Repository klonen

```bash
git clone https://github.com/freshprince84/intranet.git
cd intranet
```

### Backend-Setup

#### 1. Neues Projekt einrichten (falls noch nicht vorhanden)

```bash
mkdir intranet && cd intranet
mkdir backend frontend
cd backend
npm init -y
```

#### 2. Backend-Abhängigkeiten installieren

```bash
# Hauptabhängigkeiten
npm install express @prisma/client pg jsonwebtoken bcrypt dotenv cors date-fns exceljs multer

# Entwicklungsabhängigkeiten
npm install --save-dev prisma typescript ts-node nodemon @types/node @types/express @types/bcrypt @types/cors @types/jsonwebtoken @types/multer
```

#### 3. TypeScript initialisieren

```bash
npx tsc --init
```

#### 4. Prisma initialisieren

```bash
npx prisma init
```

#### 5. `.env`-Datei konfigurieren

Erstellen Sie eine `.env`-Datei im `backend/`-Ordner basierend auf der `.env.example`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/intranet"
JWT_SECRET="your-secret-key"
PORT=5000
NODE_ENV=development
```

#### 6. TypeScript-Einstellungen konfigurieren

Aktualisieren Sie die `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### 7. Skripte in `package.json` konfigurieren

```json
"scripts": {
  "start": "node dist/index.js",
  "dev": "nodemon dist/index.js",
  "build": "tsc",
  "seed": "npx prisma db seed",
  "debug": "node --inspect dist/index.js"
},
"prisma": {
  "seed": "ts-node prisma/seed.ts",
  "schema": "prisma/schema.prisma"
}
```

#### 8. Datenbank initialisieren

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

Das Seed-Skript füllt die Datenbank mit Beispieldaten und erstellt den Standard-Admin-Benutzer.

### Frontend-Setup

#### 1. Neues React-Projekt mit Vite einrichten (falls noch nicht vorhanden)

```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
```

#### 2. Frontend-Abhängigkeiten installieren

```bash
npm install axios react-router-dom @headlessui/react @heroicons/react
npm install -D tailwindcss postcss autoprefixer
```

#### 3. Tailwind initialisieren

```bash
npx tailwindcss init -p
```

#### 4. Entwicklungsumgebung konfigurieren

- Erstelle `.env.development` für Entwicklungseinstellungen
- Konfiguriere `vite.config.ts` für Proxy-Einstellungen

## Entwicklungsserver

### Backend starten

```bash
cd backend
npm run build
npm run dev
```

Der Backend-Server läuft auf Port 5000.

### Frontend starten

```bash
cd frontend
npm run dev
```

Der Frontend-Server läuft auf Port 3000.

### Prisma Studio starten

```bash
cd backend
npx prisma studio
```

Prisma Studio läuft auf Port 5555 und bietet eine grafische Oberfläche zur Datenbankverwaltung.

**WICHTIG: Server-Neustart und Prisma Studio**

- Server und Prisma Studio sollten NICHT selbständig neu gestartet werden
- Bei Änderungen am Servercode oder Schema muss der Entwicklungsverantwortliche um Neustart gebeten werden

## Datenbank

### Datenbankschema

Das Datenbankschema wird mit Prisma ORM verwaltet und befindet sich in `backend/prisma/schema.prisma`. Für detaillierte Informationen zum Datenbankschema siehe [DATENBANKSCHEMA.md](DATENBANKSCHEMA.md).

### Migrationen

Für Schemaänderungen müssen Migrationen erstellt werden:

```bash
cd backend
npx prisma migrate dev --name beschreibender_name
```

### Datenbankzugriff im Code

Prisma Client wird im Backend verwendet:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Beispiel für eine Abfrage
const users = await prisma.user.findMany({
  include: {
    role: true
  }
});
```

## Projektstruktur

Das Projekt ist in zwei Hauptteile unterteilt:

### Backend-Struktur (`backend/`)

```
backend/
├── dist/               # Kompilierter TypeScript-Code
├── node_modules/       # Node.js-Module
├── prisma/             # Prisma ORM Konfiguration und Migrations
│   ├── migrations/     # Datenbankmigrationen
│   ├── schema.prisma   # Prisma Schema
│   └── seed.ts         # Datenbank-Seed-Skript
├── src/                # Quellcode
│   ├── controllers/    # API-Controller
│   ├── middlewares/    # Express-Middlewares
│   ├── models/         # Datenmodelle und Typen
│   ├── routes/         # API-Routen
│   ├── utils/          # Hilfsfunktionen
│   └── index.ts        # Einstiegspunkt
├── .env                # Umgebungsvariablen (nicht im Repo)
├── .env.example        # Beispiel für Umgebungsvariablen
├── package.json        # Projekt-Konfiguration
└── tsconfig.json       # TypeScript-Konfiguration
```

### Frontend-Struktur (`frontend/`)

```
frontend/
├── build/              # Produktionsbuild
├── node_modules/       # Node.js-Module
├── public/             # Statische Assets
├── src/                # Quellcode
│   ├── api/            # API-Clients und -Konfiguration
│   ├── assets/         # Bilder, Fonts, usw.
│   ├── components/     # Wiederverwendbare Komponenten
│   ├── config/         # Konfigurationsdateien
│   ├── context/        # React Context Provider
│   ├── hooks/          # Custom React Hooks
│   ├── layouts/        # Layout-Komponenten
│   ├── pages/          # Seitenkomponenten
│   ├── store/          # State Management
│   ├── types/          # TypeScript-Typendefinitionen
│   ├── utils/          # Hilfsfunktionen
│   ├── App.tsx         # Hauptkomponente
│   └── index.tsx       # Einstiegspunkt
├── package.json        # Projekt-Konfiguration
├── tailwind.config.js  # Tailwind CSS-Konfiguration
└── tsconfig.json       # TypeScript-Konfiguration
```

## Entwicklungsrichtlinien

### Import-Pfade Regeln

#### Frontend-Imports (MIT .ts/.tsx Endung)

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

#### Backend-Imports (OHNE .ts Endung)

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

### TypeScript-Best-Practices

- Immer explizite Typen für Komponenten-Props definieren
- useState Hook mit Typparameter verwenden: `useState<string>('')`
- Für API-Aufrufe die typisierten Funktionen aus den API-Clients verwenden
- Nach Möglichkeit Interfaces statt Types verwenden für bessere Erweiterbarkeit

### Codeformatierung

Das Projekt verwendet:
- Prettier für Codeformatierung
- ESLint für Linting

## UI Design-Vorgaben

Für konsistentes Design aller Seiten sind folgende Vorgaben einzuhalten:

### Layout-Struktur
- Seitencontainer: `min-h-screen bg-gray-100`
- Inhaltsbereich: `container mx-auto` oder `max-w-7xl mx-auto`
- Hauptelemente: `bg-white rounded-lg shadow p-6`

### Header mit Icon
- Container: `flex items-center mb-6`
- Icon: `h-6 w-6 text-gray-900 mr-2` (nicht farbig)
- Titel: `text-2xl font-bold text-gray-900`

### Tab-Navigation
- Container: `border-b border-gray-200 mb-6`
- Navigation: `"-mb-px flex space-x-8`
- Aktiver Tab: `border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`
- Inaktiver Tab: `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`

### Fehler- und Erfolgsmeldungen
- Fehler: `bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4`
- Erfolg: `bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4`

Diese Designelemente sollen konsistent auf allen Seiten wie Dashboard, Worktracker und Benutzerverwaltung angewendet werden.

## Debugging

### Backend-Debugging

Für das Backend-Debugging:

1. Starten Sie den Server im Debug-Modus:
   ```bash
   cd backend
   npm run debug
   ```

2. Verwenden Sie den Node.js-Debugger in VS Code oder Chrome DevTools

### Frontend-Debugging

Für das Frontend-Debugging:

1. Verwenden Sie die React DevTools-Erweiterung im Browser
2. Nutzen Sie die Konsole und Netzwerk-Tabs in den Browser-Entwicklertools

## Testing

Das Projekt verwendet folgende Test-Tools:

- **Backend**: Jest für Unit- und Integrationstests
- **Frontend**: React Testing Library für Komponententests

Tests ausführen:

```bash
# Backend-Tests
cd backend
npm run test

# Frontend-Tests
cd frontend
npm run test
```

## Deployment

Für Deployment-Anweisungen siehe [DEPLOYMENT.md](DEPLOYMENT.md). 