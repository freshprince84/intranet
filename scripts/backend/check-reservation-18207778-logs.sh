#!/bin/bash
# Prüft Reservation 18207778 und alle relevanten Logs

echo "🔍 Prüfe Reservation 18207778 und Logs"
echo "=================================================================================="
echo ""

# 1. Prüfe Reservation in DB (verschiedene Suchkriterien)
echo "📋 1. Suche Reservation in Datenbank..."
echo "   - Nach LobbyPMS ID:"
psql $DATABASE_URL -c "SELECT id, \"lobbyReservationId\", \"guestName\", \"guestPhone\", \"guestEmail\", \"guestNationality\", \"branchId\", \"organizationId\" FROM \"Reservation\" WHERE \"lobbyReservationId\" = '18207778' LIMIT 5;"

echo ""
echo "   - Nach interner ID:"
psql $DATABASE_URL -c "SELECT id, \"lobbyReservationId\", \"guestName\", \"guestPhone\", \"guestEmail\", \"guestNationality\", \"branchId\", \"organizationId\" FROM \"Reservation\" WHERE id = 18207778 LIMIT 5;"

echo ""
echo "   - Ähnliche IDs:"
psql $DATABASE_URL -c "SELECT id, \"lobbyReservationId\", \"guestName\", \"guestPhone\" FROM \"Reservation\" WHERE \"lobbyReservationId\" LIKE '%182077%' OR id::text LIKE '%182077%' LIMIT 10;"

echo ""
echo "=================================================================================="
echo "📨 2. Prüfe Notification-Logs..."
echo ""

# 2. Prüfe Notification-Logs
echo "   - Alle Logs für Reservation 18207778 (falls gefunden):"
psql $DATABASE_URL -c "SELECT rnl.id, rnl.\"reservationId\", rnl.\"notificationType\", rnl.channel, rnl.success, rnl.\"sentAt\", rnl.\"sentTo\", LEFT(rnl.message, 100) as message_preview, rnl.\"errorMessage\" FROM \"ReservationNotificationLog\" rnl WHERE rnl.\"reservationId\" = 18207778 ORDER BY rnl.\"sentAt\" DESC LIMIT 10;"

echo ""
echo "   - Letzte WhatsApp-Notifications (alle Reservierungen):"
psql $DATABASE_URL -c "SELECT rnl.id, rnl.\"reservationId\", r.id as reservation_internal_id, r.\"lobbyReservationId\", r.\"guestName\", rnl.\"notificationType\", rnl.channel, rnl.success, rnl.\"sentAt\", rnl.\"sentTo\", LEFT(rnl.\"errorMessage\", 150) as error FROM \"ReservationNotificationLog\" rnl JOIN \"Reservation\" r ON r.id = rnl.\"reservationId\" WHERE rnl.channel = 'whatsapp' AND rnl.\"sentAt\" > NOW() - INTERVAL '24 hours' ORDER BY rnl.\"sentAt\" DESC LIMIT 20;"

echo ""
echo "=================================================================================="
echo "📱 3. Prüfe Server-Logs (pm2)..."
echo ""

# 3. Prüfe pm2 Logs für WhatsApp
echo "   - Letzte WhatsApp-Logs (letzte 50 Zeilen):"
pm2 logs intranet-backend --lines 200 --nostream | grep -i "whatsapp\|18207778\|reservation" | tail -50

echo ""
echo "=================================================================================="
echo "✅ Prüfung abgeschlossen"
echo ""

