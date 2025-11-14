#!/bin/bash

# Script zum Hinzufügen des WhatsApp Webhook Verify Tokens auf dem Server
# 
# Verwendung:
#   bash scripts/add-webhook-token-to-server.sh

set -e

# Konfiguration
SERVER_IP="65.109.228.106"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/intranet_rsa"
SERVER_ENV_PATH="/var/www/intranet/backend/.env"
VERIFY_TOKEN="80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab"

echo "🔧 Füge WhatsApp Webhook Verify Token zum Server hinzu"
echo "============================================================"
echo ""

# Prüfe ob SSH Key existiert
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH Key nicht gefunden: $SSH_KEY"
    echo "   Bitte prüfe den Pfad zum SSH Key"
    exit 1
fi

echo "✅ SSH Key gefunden: $SSH_KEY"
echo ""

# Prüfe ob .env auf Server existiert
echo "📋 Prüfe .env Datei auf Server..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "[ -f $SERVER_ENV_PATH ]"; then
    echo "✅ .env Datei existiert auf Server"
else
    echo "❌ .env Datei nicht gefunden auf Server: $SERVER_ENV_PATH"
    echo "   Bitte erstelle die .env Datei manuell auf dem Server"
    exit 1
fi

echo ""
echo "🔍 Prüfe ob Token bereits vorhanden ist..."

# Prüfe ob Token bereits vorhanden ist
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "grep -q 'WHATSAPP_WEBHOOK_VERIFY_TOKEN' $SERVER_ENV_PATH"; then
    echo "⚠️  WHATSAPP_WEBHOOK_VERIFY_TOKEN ist bereits in .env vorhanden"
    echo ""
    echo "   Aktueller Wert:"
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "grep 'WHATSAPP_WEBHOOK_VERIFY_TOKEN' $SERVER_ENV_PATH" || true
    echo ""
    echo "   Möchtest du den Token überschreiben? (j/n)"
    read -r response
    if [[ ! "$response" =~ ^[Jj]$ ]]; then
        echo "   Abgebrochen. Verwende den bestehenden Token."
        exit 0
    fi
    
    # Ersetze bestehenden Token
    echo ""
    echo "📝 Überschreibe bestehenden Token..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "sed -i 's/^WHATSAPP_WEBHOOK_VERIFY_TOKEN=.*/WHATSAPP_WEBHOOK_VERIFY_TOKEN=$VERIFY_TOKEN/' $SERVER_ENV_PATH"
    echo "✅ Token überschrieben"
else
    # Füge neuen Token hinzu
    echo "📝 Füge Token zur .env hinzu..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "echo '' >> $SERVER_ENV_PATH && echo '# WhatsApp Webhook Verify Token' >> $SERVER_ENV_PATH && echo 'WHATSAPP_WEBHOOK_VERIFY_TOKEN=$VERIFY_TOKEN' >> $SERVER_ENV_PATH"
    echo "✅ Token hinzugefügt"
fi

echo ""
echo "📋 Verifiziere Token auf Server..."
TOKEN_ON_SERVER=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "grep 'WHATSAPP_WEBHOOK_VERIFY_TOKEN' $SERVER_ENV_PATH | cut -d '=' -f2" | tr -d ' ')

if [ "$TOKEN_ON_SERVER" = "$VERIFY_TOKEN" ]; then
    echo "✅ Token korrekt auf Server gespeichert"
else
    echo "❌ Token stimmt nicht überein!"
    echo "   Erwartet: $VERIFY_TOKEN"
    echo "   Gefunden: $TOKEN_ON_SERVER"
    exit 1
fi

echo ""
echo "✅ Nächste Schritte:"
echo "   1. Server neu starten:"
echo "      ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'pm2 restart intranet-backend'"
echo ""
echo "   2. In Meta Console Webhook konfigurieren:"
echo "      - Callback URL: https://65.109.228.106.nip.io/api/whatsapp/webhook"
echo "      - Verify Token: $VERIFY_TOKEN"
echo ""
echo "✅ Fertig!"

