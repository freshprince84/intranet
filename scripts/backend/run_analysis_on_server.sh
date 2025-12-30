#!/bin/bash
# Script zum Ausführen der Cerebro-Analyse auf dem Server

echo "🔍 Starte Cerebro-Struktur-Analyse auf dem Server..."
echo ""

cd /var/www/intranet/backend

# Prüfe ob ts-node verfügbar ist
if command -v npx &> /dev/null; then
    echo "✅ npx gefunden, führe Analyse aus..."
    npx ts-node ../scripts/backend/analyzeCerebroStructure.ts
else
    echo "⚠️  npx nicht gefunden, versuche kompiliertes Script..."
    if [ -f "dist/scripts/analyzeCerebroStructure.js" ]; then
        node dist/scripts/analyzeCerebroStructure.js
    else
        echo "❌ Script nicht gefunden. Bitte zuerst kompilieren:"
        echo "   npx tsc scripts/analyzeCerebroStructure.ts --outDir dist/scripts --esModuleInterop --resolveJsonModule --skipLibCheck"
        exit 1
    fi
fi

echo ""
echo "✅ Analyse abgeschlossen!"
echo ""
echo "📄 Ergebnisse wurden auch in cerebro_analysis_result.json gespeichert"






