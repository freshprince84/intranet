#!/bin/bash
# Direkte Log-Prüfung ohne Filter

echo "=== DIREKTE PM2-LOGS (letzte 300 Zeilen) ==="
pm2 logs intranet-backend --lines 300 --nostream

echo ""
echo "=== SUCHE NACH TOUR-RELATED LOGS ==="
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "tour" | tail -n 50

echo ""
echo "=== SUCHE NACH WHATSAPP WEBHOOK LOGS ==="
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "webhook" | tail -n 50

echo ""
echo "=== SUCHE NACH AI SERVICE LOGS ==="
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "ai service" | tail -n 50
