#!/bin/bash
# Vollständiges Deployment-Skript für Hetzner Server
# Führt alle Schritte aus: Git Pull, Migrationen, Seed, Import, Builds

set -e  # Exit on error

echo "🚀 Starte Deployment auf Hetzner Server..."
echo ""

# 1. Git Pull
echo "📥 Schritt 1: Git Pull..."
cd /var/www/intranet

# Löse Git-Konflikte auf
echo "   🔧 Löse Git-Konflikte auf..."
set +e
git reset --hard HEAD || true
git merge --abort 2>/dev/null || true
set -e

# Lösche Build-Ordner komplett (werden beim Build sowieso neu erstellt)
echo "   🗑️  Lösche Build-Ordner (werden beim Build neu erstellt)..."
rm -rf frontend/build
rm -rf backend/dist
# Entferne Build-Dateien aus Git-Index falls vorhanden
set +e
git rm -r --cached frontend/build 2>/dev/null || true
git rm -r --cached backend/dist 2>/dev/null || true
set -e

# Git Pull ausführen (mit Rebase für divergente Branches)
set +e
git fetch origin
git reset --hard origin/main
set -e
echo "✅ Git Pull abgeschlossen"
echo ""

# 2. Dependencies installieren (Backend)
echo "📦 Schritt 2: Backend Dependencies installieren..."
cd /var/www/intranet/backend
npm install
echo "✅ Backend Dependencies installiert"
echo ""

# 3. Dependencies installieren (Frontend)
echo "📦 Schritt 3: Frontend Dependencies installieren..."
cd /var/www/intranet/frontend
npm install
echo "✅ Frontend Dependencies installiert"
echo ""

# 4. Migrationen anwenden
echo "🗄️  Schritt 4: Datenbank-Migrationen anwenden..."
cd /var/www/intranet/backend
npx prisma migrate deploy
echo "✅ Migrationen angewendet"
echo ""

# 5. Prisma Client generieren
echo "🔧 Schritt 5: Prisma Client generieren..."
cd /var/www/intranet/backend
npx prisma generate
echo "✅ Prisma Client generiert"
echo ""

# 6. Filter-Cleanup und Seed ausführen
echo "🧹 Schritt 6: Filter-Cleanup..."
cd /var/www/intranet/backend
npx ts-node scripts/backend/cleanupUserFilters.ts || true
echo "✅ Filter-Cleanup abgeschlossen"
echo ""

echo "🌱 Schritt 7: Seed ausführen..."
cd /var/www/intranet/backend
npx prisma db seed
echo "✅ Seed abgeschlossen"
echo ""

# 7.5. Cerebro Content-Bereinigung
echo "🧹 Schritt 7.5: Cerebro Content-Bereinigung..."
cd /var/www/intranet/backend
# Script muss von backend-Verzeichnis aus aufgerufen werden, damit Prisma Client gefunden wird
NODE_PATH=/var/www/intranet/backend/node_modules npx ts-node ../scripts/backend/cleanupCerebroContent.ts || true
echo "✅ Cerebro Content-Bereinigung abgeschlossen"
echo ""

# 8. Backend Build
echo "🔨 Schritt 8: Backend Build..."
cd /var/www/intranet/backend
npm run build
echo "✅ Backend Build abgeschlossen"
echo ""

# 9. Frontend Build
echo "🔨 Schritt 9: Frontend Build..."
cd /var/www/intranet/frontend
npm run build
echo "✅ Frontend Build abgeschlossen"
echo ""

# 10. Redis prüfen und starten (falls nicht läuft)
echo "🔍 Schritt 10: Redis-Status prüfen..."
if ! systemctl is-active --quiet redis-server; then
  echo "   ⚠️  Redis läuft nicht, starte Redis..."
  sudo systemctl start redis-server
  sudo systemctl enable redis-server
  echo "   ✅ Redis gestartet"
else
  echo "   ✅ Redis läuft bereits"
fi
echo ""

# 11. Queue-Einstellungen in .env prüfen
echo "📝 Schritt 11: Queue-Einstellungen prüfen..."
cd /var/www/intranet/backend
if ! grep -q "QUEUE_ENABLED=true" .env 2>/dev/null; then
  echo "   ⚠️  QUEUE_ENABLED nicht in .env gefunden"
  echo "   ⚠️  Bitte manuell in .env hinzufügen:"
  echo "      QUEUE_ENABLED=true"
  echo "      REDIS_HOST=localhost"
  echo "      REDIS_PORT=6379"
  echo "      QUEUE_CONCURRENCY=5"
else
  echo "   ✅ Queue-Einstellungen gefunden"
fi
echo ""

# 12. Server-Neustart (Backend & Nginx)
echo "🔄 Schritt 12: Server-Neustart..."
echo "   🔄 Starte Backend neu (PM2)..."
pm2 restart intranet-backend
if [ $? -eq 0 ]; then
  echo "   ✅ Backend erfolgreich neu gestartet"
else
  echo "   ⚠️  Warnung: Backend-Neustart möglicherweise fehlgeschlagen"
fi

echo "   🔄 Starte Nginx neu..."
sudo systemctl restart nginx
if [ $? -eq 0 ]; then
  echo "   ✅ Nginx erfolgreich neu gestartet"
else
  echo "   ⚠️  Warnung: Nginx-Neustart möglicherweise fehlgeschlagen"
fi
echo ""

# 13. Zusammenfassung
echo ""
echo "============================================================"
echo "✅ Deployment abgeschlossen!"
echo "============================================================"
echo ""
echo "✅ Server-Neustart automatisch ausgeführt:"
echo "   - Backend (PM2): neu gestartet"
echo "   - Nginx: neu gestartet"
echo ""
echo "📋 Queue-System:"
echo "   - Redis läuft: $(systemctl is-active redis-server)"
echo "   - Prüfe Logs: pm2 logs intranet-backend | grep -i queue"
echo ""

