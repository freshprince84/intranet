#!/bin/bash
# Redis Setup-Skript für Hetzner Server
# Installiert Redis und konfiguriert es für das Queue-System

set -e  # Exit on error

echo "🔧 Redis Setup für Queue-System"
echo "================================"
echo ""

# 1. Redis installieren
echo "📦 Schritt 1: Redis installieren..."
if command -v redis-server &> /dev/null; then
  echo "   ✅ Redis ist bereits installiert"
  redis-server --version
else
  echo "   📥 Installiere Redis..."
  sudo apt-get update
  sudo apt-get install redis-server -y
  echo "   ✅ Redis installiert"
fi
echo ""

# 2. Redis starten und aktivieren
echo "🚀 Schritt 2: Redis starten und aktivieren..."
if systemctl is-active --quiet redis-server; then
  echo "   ✅ Redis läuft bereits"
else
  echo "   🚀 Starte Redis..."
  sudo systemctl start redis-server
  echo "   ✅ Redis gestartet"
fi

if systemctl is-enabled --quiet redis-server; then
  echo "   ✅ Redis ist bereits für automatischen Start aktiviert"
else
  echo "   ⚙️  Aktiviere automatischen Start..."
  sudo systemctl enable redis-server
  echo "   ✅ Automatischer Start aktiviert"
fi
echo ""

# 3. Redis-Status prüfen
echo "🔍 Schritt 3: Redis-Status prüfen..."
if systemctl is-active --quiet redis-server; then
  echo "   ✅ Redis läuft"
  systemctl status redis-server --no-pager -l | head -5
else
  echo "   ❌ Redis läuft nicht!"
  exit 1
fi
echo ""

# 4. Redis-Verbindung testen
echo "🧪 Schritt 4: Redis-Verbindung testen..."
if redis-cli ping > /dev/null 2>&1; then
  echo "   ✅ Redis-Verbindung erfolgreich (PONG)"
else
  echo "   ❌ Redis-Verbindung fehlgeschlagen!"
  exit 1
fi
echo ""

# 5. .env Datei prüfen
echo "📝 Schritt 5: .env Datei prüfen..."
ENV_FILE="/var/www/intranet/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "   ⚠️  .env Datei nicht gefunden: $ENV_FILE"
  echo "   ⚠️  Bitte erstellen Sie die .env Datei manuell"
else
  echo "   ✅ .env Datei gefunden"
  
  # Prüfe Queue-Einstellungen
  if grep -q "QUEUE_ENABLED=true" "$ENV_FILE" 2>/dev/null; then
    echo "   ✅ QUEUE_ENABLED=true gefunden"
  else
    echo "   ⚠️  QUEUE_ENABLED nicht auf 'true' gesetzt"
    echo "   ⚠️  Bitte fügen Sie folgende Zeilen zur .env Datei hinzu:"
    echo ""
    echo "   # Redis Configuration (für Queue-System)"
    echo "   REDIS_HOST=localhost"
    echo "   REDIS_PORT=6379"
    echo "   REDIS_PASSWORD="
    echo "   REDIS_DB=0"
    echo ""
    echo "   # Queue Configuration"
    echo "   QUEUE_ENABLED=true"
    echo "   QUEUE_CONCURRENCY=5"
    echo ""
  fi
  
  if grep -q "REDIS_HOST" "$ENV_FILE" 2>/dev/null; then
    echo "   ✅ REDIS_HOST gefunden"
  else
    echo "   ⚠️  REDIS_HOST nicht gefunden"
  fi
fi
echo ""

# 6. Zusammenfassung
echo "============================================================"
echo "✅ Redis Setup abgeschlossen!"
echo "============================================================"
echo ""
echo "📋 Status:"
echo "   - Redis installiert: ✅"
echo "   - Redis läuft: $(systemctl is-active redis-server)"
echo "   - Automatischer Start: $(systemctl is-enabled redis-server)"
echo "   - Verbindung: ✅"
echo ""
echo "⚠️  Nächste Schritte:"
echo "   1. Prüfen Sie die .env Datei: $ENV_FILE"
echo "   2. Fügen Sie Queue-Einstellungen hinzu (falls nicht vorhanden)"
echo "   3. Server neu starten: pm2 restart intranet-backend"
echo ""
echo "📖 Dokumentation:"
echo "   - Siehe: docs/technical/QUEUE_SYSTEM_DEPLOYMENT.md"
echo ""

