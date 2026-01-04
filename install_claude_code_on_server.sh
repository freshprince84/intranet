#!/bin/bash
set -e

echo "==================================="
echo "Claude Code Installation auf Server"
echo "==================================="
echo ""

# Prüfe ob als root
if [ "$EUID" -eq 0 ]; then
    echo "✓ Running as root"
else
    echo "✗ Bitte als root ausführen: sudo bash $0"
    exit 1
fi

echo ""
echo "1. System-Update und Dependencies installieren..."
apt-get update -qq
apt-get install -y curl wget git build-essential

echo ""
echo "2. Node.js installieren (falls nicht vorhanden)..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "   Node Version: $(node --version)"
echo "   NPM Version: $(npm --version)"

echo ""
echo "3. Claude Code CLI installieren..."
npm install -g @anthropic-ai/claude-code

echo ""
echo "4. Prüfe Claude Code Installation..."
if command -v claude-code &> /dev/null; then
    echo "✓ Claude Code erfolgreich installiert!"
    claude-code --version
else
    echo "✗ Installation fehlgeschlagen!"
    exit 1
fi

echo ""
echo "==================================="
echo "✓ Installation abgeschlossen!"
echo "==================================="
echo ""
echo "Nächste Schritte:"
echo "1. API Key setzen:"
echo "   export ANTHROPIC_API_KEY='dein-api-key'"
echo ""
echo "2. Claude Code starten:"
echo "   cd /var/www/intranet"
echo "   claude-code"
echo ""
echo "3. Oder im Hintergrund mit Screen:"
echo "   screen -S claude"
echo "   claude-code"
echo "   # Detach mit: Ctrl+A dann D"
echo ""
