#!/bin/bash

# Script zum Setzen des OPENAI_API_KEY auf dem Server
# Verwendet den Key aus der lokalen .env Datei

echo "🔍 Prüfe lokale .env Datei..."

if [ ! -f .env ]; then
    echo "❌ Fehler: .env Datei nicht gefunden im backend/ Verzeichnis"
    exit 1
fi

if ! grep -q "OPENAI_API_KEY" .env; then
    echo "❌ Fehler: OPENAI_API_KEY nicht in .env gefunden"
    exit 1
fi

# Lese den Key aus .env (ohne Leerzeichen)
OPENAI_KEY=$(grep "OPENAI_API_KEY" .env | head -1 | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | tr -d "'")

if [ -z "$OPENAI_KEY" ]; then
    echo "❌ Fehler: OPENAI_API_KEY ist leer in .env"
    exit 1
fi

echo "✅ OPENAI_API_KEY gefunden in lokaler .env"
echo ""
echo "📋 Nächste Schritte für den Server:"
echo ""
echo "1. SSH zum Hetzner Server:"
echo "   ssh user@dein-server.de"
echo ""
echo "2. Wechsle ins Backend-Verzeichnis:"
echo "   cd /path/to/intranet/backend"
echo ""
echo "3. Setze den Key in der .env Datei:"
echo "   echo 'OPENAI_API_KEY=$OPENAI_KEY' >> .env"
echo ""
echo "   ODER falls .env bereits existiert:"
echo "   sed -i 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/' .env"
echo ""
echo "4. Prüfe ob gesetzt:"
echo "   grep OPENAI_API_KEY .env"
echo ""
echo "5. Server neu starten (nach Absprache):"
echo "   sudo systemctl restart intranet-backend"
echo "   # ODER"
echo "   pm2 restart intranet-backend"
echo ""
echo "⚠️  WICHTIG: Der Key wird hier nicht angezeigt aus Sicherheitsgründen."
echo "   Verwende die obigen Befehle auf dem Server."

