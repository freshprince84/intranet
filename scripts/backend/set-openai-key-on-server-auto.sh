#!/bin/bash

# Script zum automatischen Setzen des OPENAI_API_KEY auf dem Server
# Verwendet den Key aus der lokalen .env Datei

set -e  # Exit on error

# Server-Konfiguration
SERVER_IP="65.109.228.106"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/intranet_rsa"
SERVER_PATH="/var/www/intranet/backend"

echo "🔍 Prüfe lokale .env Datei..."

# Prüfe ob wir im backend Verzeichnis sind
if [ ! -f .env ]; then
    echo "❌ Fehler: .env Datei nicht gefunden im aktuellen Verzeichnis"
    echo "   Bitte im backend/ Verzeichnis ausführen: cd backend && ./scripts/set-openai-key-on-server-auto.sh"
    exit 1
fi

if ! grep -q "OPENAI_API_KEY" .env; then
    echo "❌ Fehler: OPENAI_API_KEY nicht in .env gefunden"
    exit 1
fi

# Lese den Key aus .env (ohne Leerzeichen, ohne Anführungszeichen)
OPENAI_KEY=$(grep "^OPENAI_API_KEY=" .env | head -1 | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed "s/^['\"]//;s/['\"]$//")

if [ -z "$OPENAI_KEY" ]; then
    echo "❌ Fehler: OPENAI_API_KEY ist leer in .env"
    exit 1
fi

echo "✅ OPENAI_API_KEY gefunden in lokaler .env"
echo ""

# Prüfe ob SSH Key existiert
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Fehler: SSH Key nicht gefunden: $SSH_KEY"
    echo "   Bitte SSH Key prüfen oder Pfad anpassen"
    exit 1
fi

echo "🔐 Verbinde zum Server..."
echo "   Server: $SERVER_USER@$SERVER_IP"
echo "   Pfad: $SERVER_PATH"
echo ""

# Erstelle temporäres Script für den Server
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << EOF
#!/bin/bash
cd $SERVER_PATH

# Prüfe ob .env existiert
if [ ! -f .env ]; then
    echo "📝 Erstelle neue .env Datei..."
    touch .env
fi

# Prüfe ob OPENAI_API_KEY bereits vorhanden
if grep -q "^OPENAI_API_KEY=" .env; then
    echo "🔄 Ersetze vorhandenen OPENAI_API_KEY..."
    sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
else
    echo "➕ Füge OPENAI_API_KEY hinzu..."
    echo "OPENAI_API_KEY=$OPENAI_KEY" >> .env
fi

# Prüfe ob gesetzt
if grep -q "^OPENAI_API_KEY=" .env; then
    echo "✅ OPENAI_API_KEY erfolgreich gesetzt"
    # Zeige ersten und letzten Teil des Keys (Sicherheit)
    KEY_PREVIEW=\$(grep "^OPENAI_API_KEY=" .env | cut -d '=' -f2 | sed 's/\(.\{10\}\).*\(.\{10\}\)/\1...\2/')
    echo "   Key: \$KEY_PREVIEW"
else
    echo "❌ Fehler: OPENAI_API_KEY konnte nicht gesetzt werden"
    exit 1
fi
EOF

# Übertrage und führe Script auf Server aus
echo "📤 Übertrage Script zum Server..."
scp -i "$SSH_KEY" "$TEMP_SCRIPT" "$SERVER_USER@$SERVER_IP:/tmp/set-openai-key.sh" || {
    echo "❌ Fehler: Konnte nicht zum Server verbinden"
    rm -f "$TEMP_SCRIPT"
    exit 1
}

echo "🚀 Führe Script auf Server aus..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "chmod +x /tmp/set-openai-key.sh && bash /tmp/set-openai-key.sh && rm -f /tmp/set-openai-key.sh" || {
    echo "❌ Fehler: Script konnte nicht auf Server ausgeführt werden"
    rm -f "$TEMP_SCRIPT"
    exit 1
}

# Aufräumen
rm -f "$TEMP_SCRIPT"

echo ""
echo "✅ OPENAI_API_KEY erfolgreich auf Server gesetzt!"
echo ""
echo "⚠️  WICHTIG: Server muss neu gestartet werden, damit der Key geladen wird."
echo "   Bitte nach Absprache Server neu starten:"
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
echo "   pm2 restart intranet-backend"
echo "   # ODER"
echo "   sudo systemctl restart intranet-backend"

