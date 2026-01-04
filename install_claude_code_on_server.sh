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
echo "2. Claude Code CLI installieren (via offizielles Installations-Script)..."
curl -fsSL https://claude.ai/install.sh | bash

echo ""
echo "3. Prüfe Claude Code Installation..."
# Reload PATH
export PATH="$HOME/.local/bin:$PATH"

if command -v claude &> /dev/null; then
    echo "✓ Claude Code erfolgreich installiert!"
    claude --version
else
    echo "✗ Installation fehlgeschlagen!"
    echo "Bitte prüfe: ls -la ~/.local/bin/ | grep claude"
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
echo "2. PATH updaten (wichtig!):"
echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
echo "   # Oder: source ~/.bashrc"
echo ""
echo "3. Installation prüfen:"
echo "   claude doctor"
echo ""
echo "4. Claude Code starten:"
echo "   cd /var/www/intranet"
echo "   claude"
echo ""
echo "5. Oder im Hintergrund mit Screen:"
echo "   screen -S claude"
echo "   claude"
echo "   # Detach mit: Ctrl+A dann D"
echo ""
