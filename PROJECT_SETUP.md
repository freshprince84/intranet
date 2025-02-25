# Projekt-Setup

## Backend

1. Erstelle ein neues Verzeichnis für das Projekt:
```bash
mkdir intranet && cd intranet
mkdir backend frontend
cd backend
npm init -y
```

2. Installiere Backend-Abhängigkeiten:
```bash
# Hauptabhängigkeiten
npm install express @prisma/client pg jsonwebtoken bcrypt dotenv cors date-fns exceljs multer

# Entwicklungsabhängigkeiten
npm install --save-dev prisma typescript ts-node nodemon @types/node @types/express @types/bcrypt @types/cors @types/jsonwebtoken @types/multer
```

3. Initialisiere TypeScript:
```bash
npx tsc --init
```

4. Initialisiere Prisma:
```bash
npx prisma init
```

5. Konfiguriere die Datenbankverbindung in `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/worktracker"
JWT_SECRET=dein_jwt_secret
PORT=5000
```

6. Erstelle und bearbeite das Prisma-Schema in `prisma/schema.prisma`

7. Generiere die Prisma-Client-Typen:
```bash
npx prisma generate
```

8. Erstelle die Datenbank und führe die Migrationen aus:
```bash
npx prisma migrate dev --name init
```

9. Konfiguriere die TypeScript-Einstellungen in `tsconfig.json`:
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

10. Konfiguriere die Build- und Start-Skripte in `package.json`:
```json
"scripts": {
  "start": "node dist/index.js",
  "dev": "nodemon dist/index.js",
  "build": "tsc",
  "seed": "npx prisma db seed"
},
"prisma": {
  "seed": "ts-node prisma/seed.ts",
  "schema": "prisma/schema.prisma"
}
```

## Frontend

1. Erstelle ein neues React-Projekt mit Vite:
```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
```

2. Installiere Frontend-Abhängigkeiten:
```bash
npm install axios react-router-dom @headlessui/react @heroicons/react
npm install -D tailwindcss postcss autoprefixer
```

3. Initialisiere Tailwind:
```bash
npx tailwindcss init -p
```

4. Konfiguriere die Entwicklungsumgebung:
- Erstelle `.env.development` für Entwicklungseinstellungen
- Konfiguriere `vite.config.ts` für Proxy-Einstellungen

5. Starte die Entwicklungsserver:
```bash
# Terminal 1 (Backend)
cd backend
npm run build
npm run dev

# Terminal 2 (Frontend)
cd frontend
npm run dev
```

## Datenbankstruktur

Das Datenmodell ist vollständig in der `prisma/schema.prisma`-Datei definiert, einschließlich:

- Benutzer (User)
- Rollen (Role)
- Berechtigungen (Permission)
- Niederlassungen (Branch)
- Arbeitszeiten (WorkTime)
- Aufgaben (Task)
- Anfragen (Request)
- Benutzereinstellungen (Settings)

Beziehungstabellen:
- UserRole
- UsersBranches

Das Prisma-Schema enthält alle notwendigen Relationen und Constraints zwischen diesen Entitäten. Bei jeder Schemaänderung muss eine Migration erstellt werden mit:

```bash
npx prisma migrate dev --name beschreibung_der_aenderung
```