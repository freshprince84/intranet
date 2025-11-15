# Fix: organizationId optional machen

## Problem
Die Datenbank hat `organizationId` als NOT NULL, aber das Schema erwartet es als optional (`Int?`).

## Lösung: Spalte optional machen

Führe auf dem Server aus:

```bash
cd /var/www/intranet/backend

# Direkt in der Datenbank die Spalte optional machen
npx prisma db execute --stdin <<EOF
ALTER TABLE "Role" ALTER COLUMN "organizationId" DROP NOT NULL;
EOF
```

**Oder falls der obige Befehl nicht funktioniert:**

```bash
# Mit psql direkt (falls verfügbar)
psql -U postgres -d intranet -c 'ALTER TABLE "Role" ALTER COLUMN "organizationId" DROP NOT NULL;'

# Oder mit der DATABASE_URL aus .env
source .env
psql "$DATABASE_URL" -c 'ALTER TABLE "Role" ALTER COLUMN "organizationId" DROP NOT NULL;'
```

## Nach dem Fix

```bash
# 1. Prisma Client neu generieren
npx prisma generate

# 2. Seed ausführen (sollte jetzt funktionieren!)
npx prisma db seed
```

## Fehlende Dependencies installieren

```bash
cd /var/www/intranet/backend

# Dependencies installieren
npm install

# Dann Backend bauen
npm run build
```

## Frontend-Build

```bash
cd /var/www/intranet/frontend

# Dependencies installieren (falls nötig)
npm install

# Frontend bauen
npm run build
```

