# ENTWICKLUNGSUMGEBUNG

Diese Dokumentation beschreibt die Einrichtung und Konfiguration der Entwicklungsumgebung für das Intranet-Projekt.

## Inhaltsverzeichnis

1. [Systemanforderungen](#systemanforderungen)
2. [Installation](#installation)
3. [Projektstruktur](#projektstruktur)
4. [Entwicklungsserver](#entwicklungsserver)
5. [Datenbank](#datenbank)
6. [Projektstruktur](#projektstruktur)
7. [Entwicklungsrichtlinien](#entwicklungsrichtlinien)
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

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/freshprince84/intranet.git
cd intranet
```

### 2. Backend konfigurieren

Erstellen Sie eine `.env`-Datei im `backend/`-Ordner basierend auf der `.env.example`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/intranet"
JWT_SECRET="your-secret-key"
PORT=5000
NODE_ENV=development
```

### 3. Abhängigkeiten installieren

```bash
# Alle Abhängigkeiten installieren (Frontend und Backend)
npm run install-all

# Oder manuell:
# Frontend-Abhängigkeiten
cd frontend
npm install

# Backend-Abhängigkeiten
cd ../backend
npm install
```

### 4. Datenbank initialisieren

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

Das Seed-Skript füllt die Datenbank mit Beispieldaten und erstellt den Standard-Admin-Benutzer.

## Entwicklungsserver

### Backend starten

```bash
cd backend
npm run dev
```

Der Backend-Server läuft auf Port 5000.

### Frontend starten

```bash
cd frontend
npm run start
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

Das Datenbankschema wird mit Prisma ORM verwaltet und befindet sich in `backend/prisma/schema.prisma`.

### Migrations

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

1. Nutzen Sie die Chrome DevTools (F12)
2. React Developer Tools Browser-Erweiterung
3. Redux DevTools (falls Redux verwendet wird)

### API-Debugging

Für das API-Debugging:

1. Konsole für Serverlogs überwachen
2. Postman oder Insomnia für API-Tests verwenden
3. Network-Tab in Chrome DevTools für Frontend-API-Anfragen

## Testing

### Backend-Tests

Führen Sie Backend-Tests aus mit:

```bash
cd backend
npm test
```

### Frontend-Tests

Führen Sie Frontend-Tests aus mit:

```bash
cd frontend
npm test
```

## Deployment

Das Deployment ist in der [DEPLOYMENT.md](DEPLOYMENT.md) dokumentiert.

### Build-Prozess

#### Backend-Build

```bash
cd backend
npm run build
```

Dies erstellt die kompilierte Version im `dist/`-Verzeichnis.

#### Frontend-Build

```bash
cd frontend
npm run build
```

Dies erstellt die optimierte Produktionsversion im `build/`-Verzeichnis.

---

**WICHTIG:** Bei Fragen oder Problemen mit der Entwicklungsumgebung wenden Sie sich an das Entwicklungsteam. 