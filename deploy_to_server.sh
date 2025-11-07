#!/bin/bash
# Vollständiges Deployment-Skript für Hetzner Server
# Führt alle Schritte aus: Git Pull, Migrationen, Seed, Import, Builds

set -e  # Exit on error

echo "🚀 Starte Deployment auf Hetzner Server..."
echo ""

# 1. Git Pull
echo "📥 Schritt 1: Git Pull..."
cd /var/www/intranet
git stash || true  # Falls lokale Änderungen vorhanden sind
git pull
git stash pop || true  # Falls lokale Änderungen gestashed wurden
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

# 6. Seed ausführen
echo "🌱 Schritt 6: Seed ausführen..."
cd /var/www/intranet/backend
npx prisma db seed
echo "✅ Seed abgeschlossen"
echo ""

# 7. Daten importieren (mit Seed-Schutz)
echo "📥 Schritt 7: Daten importieren..."
cd /var/www/intranet/backend
if [ -d "export_data" ] && [ "$(ls -A export_data/*.json 2>/dev/null)" ]; then
  echo "   Export-Daten gefunden, starte Import..."
  npx ts-node scripts/import_exported_data.ts
  echo "✅ Daten importiert"
else
  echo "   ⚠️  Keine Export-Daten gefunden, überspringe Import"
fi
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

# 10. Zusammenfassung
echo ""
echo "============================================================"
echo "✅ Deployment abgeschlossen!"
echo "============================================================"
echo ""
echo "⚠️  WICHTIG: Server-Neustart erforderlich!"
echo "   Führe aus:"
echo "   pm2 restart intranet-backend"
echo "   sudo systemctl restart nginx"
echo ""

