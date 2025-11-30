# Reservation Status-Problem Prüfung auf Produktivserver

Diese Anleitung beschreibt, wie man Probleme mit Reservation-Status-Updates (Payment & Check-in) auf dem Produktivserver prüft.

## Problem

Reservation mit ID 18241537 hat bezahlt und eingecheckt, aber beide Status wurden nicht aktualisiert.

## Server-Zugriff

- **Server IP**: `65.109.228.106`
- **SSH User**: `root`
- **SSH Key**: `~/.ssh/intranet_rsa`
- **Server Path**: `/var/www/intranet`

## Schritt 1: SSH-Verbindung zum Server

```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

## Schritt 2: Prüfskript ausführen

Das Prüfskript analysiert die Reservation und zeigt alle relevanten Informationen an:

```bash
cd /var/www/intranet/backend
npx ts-node scripts/check-reservation-status-18241537.ts
```

**Alternative: Direkt mit Node.js (wenn TypeScript nicht verfügbar):**

```bash
cd /var/www/intranet/backend
npm run build
node dist/scripts/check-reservation-status-18241537.js
```

**Hinweis:** Falls das Script noch nicht auf dem Server ist, muss es zuerst hochgeladen werden:

```bash
# Lokal (auf deinem Computer):
scp -i ~/.ssh/intranet_rsa backend/scripts/check-reservation-status-18241537.ts root@65.109.228.106:/var/www/intranet/backend/scripts/
```

## Schritt 3: Server-Logs prüfen

### 3.1 PM2-Logs (Backend-Logs)

```bash
# Alle Logs anzeigen
pm2 logs intranet-backend --lines 500

# Nur Bold Payment Webhook-Logs
pm2 logs intranet-backend --lines 1000 | grep -i "bold.*payment.*webhook\|18241537"

# Nur LobbyPMS Webhook-Logs
pm2 logs intranet-backend --lines 1000 | grep -i "lobby.*pms.*webhook\|18241537"

# Nur Reservation-Status-Updates
pm2 logs intranet-backend --lines 1000 | grep -i "reservation.*18241537\|status.*update\|checked_in\|payment.*paid"
```

### 3.2 Log-Dateien (falls vorhanden)

```bash
# Prüfe ob Log-Dateien existieren
ls -la /var/www/intranet/backend/logs/

# Logs anzeigen
tail -f /var/www/intranet/backend/logs/app.log | grep -i "18241537"
```

## Schritt 4: Datenbank direkt prüfen

### 4.1 Prisma Studio (GUI)

```bash
cd /var/www/intranet/backend
npx prisma studio
```

Dann im Browser öffnen: `http://65.109.228.106:5555` (falls Port freigegeben)

**Achtung:** Prisma Studio sollte nicht dauerhaft laufen. Nach der Prüfung beenden!

### 4.2 SQL-Abfrage direkt

```bash
# PostgreSQL-Verbindung
sudo -u postgres psql intranet

# Reservation suchen
SELECT id, "lobbyReservationId", "guestName", status, "paymentStatus", 
       "onlineCheckInCompleted", "onlineCheckInCompletedAt", 
       "paymentLink", "updatedAt"
FROM "Reservation" 
WHERE "lobbyReservationId" = '18241537' OR id = 18241537;

# Sync-History prüfen
SELECT * FROM "ReservationSyncHistory" 
WHERE "reservationId" = (SELECT id FROM "Reservation" WHERE "lobbyReservationId" = '18241537')
ORDER BY "syncedAt" DESC 
LIMIT 20;

# Notification-Logs prüfen
SELECT * FROM "ReservationNotificationLog" 
WHERE "reservationId" = (SELECT id FROM "Reservation" WHERE "lobbyReservationId" = '18241537')
ORDER BY "sentAt" DESC 
LIMIT 20;

# Beenden
\q
```

## Schritt 5: Webhook-Endpunkte prüfen

### 5.1 Bold Payment Webhook

Prüfe ob Webhook-Events empfangen wurden:

```bash
# Suche nach Bold Payment Webhook-Events in den Logs
pm2 logs intranet-backend --lines 2000 | grep -i "bold.*payment.*webhook" | grep -i "18241537\|payment.paid\|payment.completed"
```

**Wichtige Events:**
- `payment.paid` - Zahlung erhalten
- `payment.completed` - Zahlung abgeschlossen

### 5.2 LobbyPMS Webhook

Prüfe ob LobbyPMS Webhook-Events empfangen wurden:

```bash
# Suche nach LobbyPMS Webhook-Events in den Logs
pm2 logs intranet-backend --lines 2000 | grep -i "lobby.*pms.*webhook" | grep -i "18241537\|checked_in\|status_changed"
```

**Wichtige Events:**
- `reservation.status_changed` - Status geändert
- `reservation.checked_in` - Check-in durchgeführt

## Schritt 6: Externe Systeme prüfen

### 6.1 Bold Payment Dashboard

1. Öffne das Bold Payment Dashboard
2. Suche nach der Reservation-ID oder Payment-Link-ID
3. Prüfe ob Zahlung tatsächlich erfolgt ist
4. Prüfe ob Webhook-Events gesendet wurden

### 6.2 LobbyPMS

1. Öffne LobbyPMS
2. Suche nach Reservation 18241537
3. Prüfe ob Check-in tatsächlich durchgeführt wurde
4. Prüfe ob Status korrekt ist

## Schritt 7: Manuelle Status-Korrektur (falls nötig)

**⚠️ WICHTIG:** Nur durchführen, wenn das Problem identifiziert wurde und eine manuelle Korrektur erforderlich ist!

### 7.1 Via Prisma Studio

1. Öffne Prisma Studio (siehe Schritt 4.1)
2. Navigiere zu Reservation
3. Suche nach Reservation 18241537
4. Aktualisiere manuell:
   - `status` → `checked_in`
   - `paymentStatus` → `paid`
   - `onlineCheckInCompleted` → `true`
   - `onlineCheckInCompletedAt` → Aktuelles Datum

### 7.2 Via SQL

```sql
-- Status manuell aktualisieren
UPDATE "Reservation" 
SET 
  status = 'checked_in',
  "paymentStatus" = 'paid',
  "onlineCheckInCompleted" = true,
  "onlineCheckInCompletedAt" = NOW(),
  "updatedAt" = NOW()
WHERE "lobbyReservationId" = '18241537' OR id = 18241537;
```

## Schritt 8: Webhook-Endpunkte testen

### 8.1 Bold Payment Webhook testen

```bash
# Test-Webhook senden (curl)
curl -X POST http://localhost:5000/api/bold-payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.paid",
    "data": {
      "link_id": "LNK_XXXXX",
      "reservation_id": "18241537"
    }
  }'
```

### 8.2 LobbyPMS Webhook testen

```bash
# Test-Webhook senden (curl)
curl -X POST http://localhost:5000/api/lobby-pms/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "reservation.status_changed",
    "data": {
      "id": "18241537",
      "status": "checked_in"
    }
  }'
```

## Häufige Probleme und Lösungen

### Problem 1: Webhook wurde nicht empfangen

**Symptom:** Keine Webhook-Events in den Logs

**Lösung:**
1. Prüfe ob Webhook-URL korrekt konfiguriert ist
2. Prüfe ob Server erreichbar ist (Firewall, Ports)
3. Prüfe ob Webhook-Endpunkt korrekt registriert ist

### Problem 2: Webhook wurde empfangen, aber Status nicht aktualisiert

**Symptom:** Webhook-Events in Logs, aber Status nicht geändert

**Lösung:**
1. Prüfe Logs auf Fehler beim Status-Update
2. Prüfe ob Reservation in Datenbank gefunden wurde
3. Prüfe ob Datenbank-Update erfolgreich war

### Problem 3: Status wurde aktualisiert, aber wieder überschrieben

**Symptom:** Status wurde kurz aktualisiert, dann wieder zurückgesetzt

**Lösung:**
1. Prüfe Sync-History auf konkurrierende Updates
2. Prüfe ob LobbyPMS-Sync den Status überschreibt
3. Prüfe ob mehrere Webhook-Events gleichzeitig verarbeitet werden

## Checkliste für Problemdiagnose

- [ ] Reservation in Datenbank gefunden
- [ ] Aktueller Status und Payment Status geprüft
- [ ] Sync-History geprüft (wann wurde zuletzt synchronisiert?)
- [ ] Notification-Logs geprüft (wurden Notifications gesendet?)
- [ ] Server-Logs geprüft (Webhook-Events empfangen?)
- [ ] Bold Payment Dashboard geprüft (Zahlung tatsächlich erfolgt?)
- [ ] LobbyPMS geprüft (Check-in tatsächlich durchgeführt?)
- [ ] Webhook-Endpunkte getestet (funktionieren sie?)
- [ ] Fehler in Logs identifiziert
- [ ] Lösung implementiert oder manuelle Korrektur durchgeführt

## Nächste Schritte nach Problemidentifikation

1. **Problem dokumentieren** - Notiere die genaue Ursache
2. **Fix implementieren** - Falls es ein Code-Problem ist
3. **Testen** - Stelle sicher, dass der Fix funktioniert
4. **Deployment** - Deploye den Fix auf den Produktivserver
5. **Monitoring** - Überwache ob das Problem behoben ist

## Support

Bei Problemen oder Fragen:
1. Prüfe die Logs gründlich
2. Dokumentiere alle Schritte
3. Erstelle ein Issue mit allen relevanten Informationen

