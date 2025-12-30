#!/bin/bash

# Deployment-Script für Performance-Fix
# Führt alle Schritte automatisch aus (außer Server-Neustart)

echo "=== DEPLOYMENT: Performance-Fix ==="
echo ""

# Schritt 1: Git Pull
echo "1. Git Pull..."
cd /var/www/intranet
git pull
if [ $? -ne 0 ]; then
    echo "❌ Git Pull fehlgeschlagen!"
    exit 1
fi
echo "✅ Git Pull erfolgreich"
echo ""

# Schritt 2: Datenbank-Migration
echo "2. Datenbank-Migration..."
cd /var/www/intranet/backend
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "❌ Migration fehlgeschlagen!"
    exit 1
fi
echo "✅ Migration erfolgreich"
echo ""

# Schritt 3: Prisma-Client aktualisieren
echo "3. Prisma-Client aktualisieren..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma Generate fehlgeschlagen!"
    exit 1
fi
echo "✅ Prisma-Client aktualisiert"
echo ""

# Schritt 4: Backend neu bauen
echo "4. Backend neu bauen..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build fehlgeschlagen!"
    exit 1
fi
echo "✅ Backend gebaut"
echo ""

echo "=== DEPLOYMENT VORBEREITET ==="
echo ""
echo "⚠️  WICHTIG: Server-Neustart erforderlich!"
echo "Führe aus: pm2 restart intranet-backend"
echo ""

