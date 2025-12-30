#!/bin/bash

# Script zum Deployen der dotenv-Fixes auf den Server

set -e

SERVER_IP="65.109.228.106"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/intranet_rsa"
SERVER_PATH="/var/www/intranet"

echo "🚀 Deploye dotenv-Fixes auf Server..."
echo ""

# 1. Git Commit (falls noch nicht committed)
echo "📝 Prüfe Git Status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Es gibt uncommitted Änderungen"
    echo "   Bitte zuerst committen: git add -A && git commit -m 'Fix: dotenv loading für OPENAI_API_KEY'"
    exit 1
fi

echo "✅ Keine uncommitted Änderungen"
echo ""

# 2. Git Push
echo "📤 Pushe Änderungen zu GitHub..."
git push || {
    echo "❌ Fehler: Git Push fehlgeschlagen"
    exit 1
}

echo "✅ Git Push erfolgreich"
echo ""

# 3. Auf Server: Git Pull
echo "📥 Pull auf Server..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH && git pull" || {
    echo "❌ Fehler: Git Pull auf Server fehlgeschlagen"
    exit 1
}

echo "✅ Git Pull erfolgreich"
echo ""

# 4. Auf Server: Build
echo "🔨 Baue Backend auf Server..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH/backend && npm run build" || {
    echo "❌ Fehler: Build fehlgeschlagen"
    exit 1
}

echo "✅ Build erfolgreich"
echo ""

echo "✅ Deployment abgeschlossen!"
echo ""
echo "⚠️  WICHTIG: Server muss neu gestartet werden (nach Absprache):"
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
echo "   pm2 restart intranet-backend"

