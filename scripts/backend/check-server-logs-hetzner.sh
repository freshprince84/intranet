#!/bin/bash

echo "=== PRÜFE SERVER-LOGS FÜR WHATSAPP-FEHLER ==="
echo ""

# Prüfe PM2-Logs (wenn PM2 verwendet wird)
if command -v pm2 &> /dev/null; then
    echo "--- PM2 Logs (letzte 200 Zeilen mit WhatsApp/Reservation-Fehlern) ---"
    pm2 logs --lines 200 --nostream 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 50
    echo ""
fi

# Prüfe verschiedene mögliche Log-Pfade
LOG_PATHS=(
    "/var/log/pm2"
    "/home/*/logs"
    "/root/logs"
    "/var/log/intranet"
    "$(pwd)/logs"
    "$(pwd)/backend/logs"
)

echo "--- Suche nach Log-Dateien ---"
for path in "${LOG_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "✅ Gefunden: $path"
        find "$path" -name "*.log" -type f -mtime -1 2>/dev/null | while read logfile; do
            echo "  Prüfe: $logfile"
            tail -n 100 "$logfile" 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 20
        done
    fi
done

echo ""
echo "--- Prüfe System-Logs (journalctl) ---"
journalctl -u intranet* --since "1 hour ago" --no-pager 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 30

echo ""
echo "--- Prüfe Node.js Process Output (wenn direkt gestartet) ---"
ps aux | grep -iE "node.*server|node.*backend" | grep -v grep | head -n 5

echo ""
echo "=== FERTIG ==="

