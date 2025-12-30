#!/bin/bash

echo "🔍 Prüfe Bold Payment Logs auf Produktivserver..."
echo ""

# Prüfe PM2 Logs
echo "=== PM2 Logs (letzte 2000 Zeilen) ==="
pm2 logs intranet-backend --lines 2000 --nostream 2>&1 | grep -i -A 10 -B 5 "bold payment\|403\|forbidden\|payment-link\|createPaymentLink" | tail -n 300

echo ""
echo "=== Suche nach 403 Fehlern ==="
pm2 logs intranet-backend --lines 5000 --nostream 2>&1 | grep -i "403\|forbidden" | tail -n 50

echo ""
echo "=== Suche nach Bold Payment Payload ==="
pm2 logs intranet-backend --lines 5000 --nostream 2>&1 | grep -A 5 "Bold Payment.*Payload" | tail -n 100

echo ""
echo "=== Suche nach Payment-Link Erstellung ==="
pm2 logs intranet-backend --lines 5000 --nostream 2>&1 | grep -A 5 -B 5 "Erstelle Payment-Link\|Payment-Link erstellt\|Payment-Link konnte nicht" | tail -n 100

