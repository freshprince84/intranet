#!/bin/bash
# Vollständiges Script zur Analyse der Cerebro-Struktur auf dem Server

echo "🔍 Starte Cerebro-Struktur-Analyse auf dem Server..."
echo ""

# Zum Projekt-Verzeichnis wechseln
cd /var/www/intranet

# Git Pull
echo "📥 Aktualisiere Code vom Repository..."
git pull
echo ""

# Zum Backend-Verzeichnis
cd backend

# Prüfe ob ts-node verfügbar ist
if command -v npx &> /dev/null; then
    echo "✅ Führe Analyse aus..."
    echo ""
    npx ts-node scripts/analyzeCerebroStructure.ts
    EXIT_CODE=$?
else
    echo "⚠️  npx nicht gefunden, versuche kompiliertes Script..."
    if [ -f "dist/scripts/analyzeCerebroStructure.js" ]; then
        node dist/scripts/analyzeCerebroStructure.js
        EXIT_CODE=$?
    else
        echo "❌ Script nicht gefunden. Bitte zuerst kompilieren."
        EXIT_CODE=1
    fi
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Analyse abgeschlossen!"
    if [ -f "../../cerebro_analysis_result.json" ]; then
        echo "📄 Ergebnisse gespeichert in: cerebro_analysis_result.json"
    fi
else
    echo "❌ Analyse fehlgeschlagen!"
fi

exit $EXIT_CODE


