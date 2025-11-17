#!/bin/bash

# Script zum Prüfen der Server-Logs auf Hetzner
# Führe dieses Script auf dem Hetzner-Server aus

echo "=== SERVER-LOGS PRÜFEN (HETZNER) ==="
echo ""

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -d "backend" ]; then
    echo "❌ Bitte führe dieses Script aus dem Projekt-Root-Verzeichnis aus"
    exit 1
fi

echo "1. PRÜFE BACKEND-LOGS:"
echo "=========================================="
if [ -d "backend/logs" ]; then
    echo "✅ Logs-Verzeichnis gefunden: backend/logs"
    echo ""
    
    # Prüfe claude-console.log
    if [ -f "backend/logs/claude-console.log" ]; then
        echo "--- claude-console.log (letzte 200 Zeilen mit WhatsApp/Reservation) ---"
        tail -n 200 backend/logs/claude-console.log | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 50
        echo ""
    else
        echo "⚠️ claude-console.log nicht gefunden"
    fi
    
    # Prüfe database-operations.log
    if [ -f "backend/logs/database-operations.log" ]; then
        echo "--- database-operations.log (letzte 50 Zeilen) ---"
        tail -n 50 backend/logs/database-operations.log | grep -iE "reservation|whatsapp" | tail -n 20
        echo ""
    fi
    
    # Prüfe alle .log Dateien
    echo "--- Alle .log Dateien im logs-Verzeichnis ---"
    find backend/logs -name "*.log" -type f -mtime -1 2>/dev/null | while read logfile; do
        echo "  📄 $logfile"
        tail -n 100 "$logfile" 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 10
    done
else
    echo "❌ Logs-Verzeichnis nicht gefunden"
fi

echo ""
echo "2. PRÜFE PM2-LOGS:"
echo "=========================================="
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 gefunden"
    echo ""
    
    # PM2 Status
    echo "--- PM2 Status ---"
    pm2 list
    echo ""
    
    # PM2 Logs - alle Apps
    echo "--- PM2 Logs (letzte 200 Zeilen mit WhatsApp/Reservation) ---"
    pm2 logs --lines 200 --nostream 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 50
    
    # PM2 Logs - spezifische App (falls bekannt)
    if pm2 list | grep -q "backend\|server\|intranet"; then
        APP_NAME=$(pm2 list | grep -E "backend|server|intranet" | head -n 1 | awk '{print $2}')
        if [ ! -z "$APP_NAME" ]; then
            echo ""
            echo "--- PM2 Logs für $APP_NAME (letzte 100 Zeilen) ---"
            pm2 logs "$APP_NAME" --lines 100 --nostream 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 30
        fi
    fi
else
    echo "⚠️ PM2 nicht gefunden"
fi

echo ""
echo "3. PRÜFE SYSTEMD-LOGS:"
echo "=========================================="
# Prüfe verschiedene mögliche Service-Namen
SERVICES=("intranet-backend" "intranet" "backend" "node-backend")

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo "✅ Service $service ist aktiv"
        echo ""
        echo "--- Journalctl Logs für $service (letzte 200 Zeilen) ---"
        journalctl -u "$service" -n 200 --no-pager 2>/dev/null | grep -iE "\[Reservation\]|\[WhatsApp\]|whatsapp|reservation|error|fehler" | tail -n 50
        echo ""
    fi
done

# Prüfe ob überhaupt ein Service läuft
if ! systemctl list-units --type=service --state=running 2>/dev/null | grep -qiE "intranet|backend|node"; then
    echo "⚠️ Kein bekannter Service gefunden"
fi

echo ""
echo "4. PRÜFE KONSOLE-OUTPUT (wenn direkt gestartet):"
echo "=========================================="
ps aux | grep -iE "node.*server|node.*backend|node.*dist" | grep -v grep | head -n 5
echo ""

echo ""
echo "5. PRÜFE LETZTE RESERVATION-ERSTELLUNGEN:"
echo "=========================================="
echo "Suche nach Reservation-Erstellungs-Logs in den letzten 2 Stunden..."
if [ -f "backend/logs/claude-console.log" ]; then
    # Suche nach Reservation-Erstellung
    grep -iE "createReservation|Reservation.*erstellt|Reservation.*created" backend/logs/claude-console.log | tail -n 20
fi
echo ""

echo ""
echo "=== LOG-PRÜFUNG ABGESCHLOSSEN ==="
echo ""
echo "💡 Tipp: Falls keine Logs gefunden wurden, prüfe:"
echo "   - Wird der Server mit PM2 gestartet? (pm2 list)"
echo "   - Wird der Server als Systemd-Service gestartet? (systemctl list-units | grep intranet)"
echo "   - Wo wird der Server gestartet? (ps aux | grep node)"

