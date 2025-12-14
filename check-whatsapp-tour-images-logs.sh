#!/bin/bash

# Script zum Prüfen der WhatsApp Tour-Bilder Logs auf dem Produktivserver
# Führe diesen Befehl auf dem Server aus: bash check-whatsapp-tour-images-logs.sh

echo "=== WHATSAPP TOUR-BILDER LOGS PRÜFEN ==="
echo ""

# 1. PM2-Logs prüfen (WhatsApp Webhook, AI Service, Function Handlers)
echo "1. PM2-LOGS (WhatsApp Tour-Bilder):"
echo "=========================================="
if command -v pm2 &> /dev/null; then
    echo "--- Letzte 500 Zeilen mit Tour/Image/WhatsApp ---"
    pm2 logs intranet-backend --lines 500 --nostream 2>/dev/null | grep -iE "\[WhatsApp.*\]|\[WhatsApp AI Service\]|\[WhatsApp Function Handlers\]|get_tours|tour.*image|imageUrl|sandbox:|/uploads/tours|!\[.*\]\(.*\)" | tail -n 100
    echo ""
    
    echo "--- Letzte 200 Zeilen mit AI-Antwort ---"
    pm2 logs intranet-backend --lines 200 --nostream 2>/dev/null | grep -iE "AI-Antwort|finalMessage|Antwort generiert|Vollständige Antwort" | tail -n 50
    echo ""
    
    echo "--- Letzte 200 Zeilen mit sendMessage ---"
    pm2 logs intranet-backend --lines 200 --nostream 2>/dev/null | grep -iE "sendMessage|Sende Antwort|Bildreferenzen gefunden" | tail -n 50
    echo ""
else
    echo "⚠️ PM2 nicht gefunden"
fi

# 2. Backend-Logs prüfen (falls vorhanden)
echo ""
echo "2. BACKEND-LOGS (falls vorhanden):"
echo "=========================================="
if [ -d "/var/www/intranet/backend/logs" ]; then
    echo "✅ Logs-Verzeichnis gefunden"
    
    # Prüfe alle .log Dateien
    find /var/www/intranet/backend/logs -name "*.log" -type f -mtime -1 2>/dev/null | while read logfile; do
        echo ""
        echo "--- $(basename $logfile) (letzte 100 Zeilen mit Tour/Image) ---"
        tail -n 100 "$logfile" 2>/dev/null | grep -iE "tour|image|whatsapp|get_tours|imageUrl|sandbox:|/uploads/tours" | tail -n 30
    done
else
    echo "⚠️ Logs-Verzeichnis nicht gefunden: /var/www/intranet/backend/logs"
fi

# 3. Suche nach Markdown-Bildreferenzen in Logs
echo ""
echo "3. MARKDOWN-BILDREFERENZEN IN LOGS:"
echo "=========================================="
if command -v pm2 &> /dev/null; then
    echo "--- Suche nach ![...](...) Pattern ---"
    pm2 logs intranet-backend --lines 1000 --nostream 2>/dev/null | grep -oE "!\[.*?\]\(.*?\)" | head -n 20
    echo ""
    
    echo "--- Suche nach sandbox:/uploads/tours ---"
    pm2 logs intranet-backend --lines 1000 --nostream 2>/dev/null | grep -iE "sandbox:/uploads/tours|/uploads/tours" | tail -n 20
fi

# 4. Prüfe get_tours Function Results
echo ""
echo "4. GET_TOURS FUNCTION RESULTS:"
echo "=========================================="
if command -v pm2 &> /dev/null; then
    echo "--- get_tours Aufrufe und Ergebnisse ---"
    pm2 logs intranet-backend --lines 1000 --nostream 2>/dev/null | grep -iE "get_tours|get_tours Ergebnis|toursCount|imageUrl" | tail -n 50
fi

echo ""
echo "=== FERTIG ==="
echo ""
echo "💡 Tipp: Für Live-Logs verwende:"
echo "   pm2 logs intranet-backend --lines 0"
