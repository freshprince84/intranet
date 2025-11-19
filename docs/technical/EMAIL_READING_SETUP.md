# Email-Reading Setup-Anleitung

## Überblick

Diese Anleitung beschreibt, wie die Email-Reading-Konfiguration für automatische Reservation-Erstellung aus Emails eingerichtet wird.

## ⚠️ WICHTIG: Standard-Konfiguration für Organisation 1

**Email-Reading ist STANDARDMÄSSIG für Organisation 1 (La Familia Hostel) aktiviert.**

- Das Seed-Script (`backend/prisma/seed.ts`) stellt sicher, dass Email-Reading für Organisation 1 immer aktiviert ist
- Wenn Email-Reading deaktiviert wird, wird es beim nächsten Seed automatisch wieder aktiviert
- **Das Passwort muss separat über `setup-email-reading-la-familia.ts` gesetzt werden**

Siehe auch: `backend/scripts/enable-email-reading-org1.ts` zum manuellen Aktivieren.

## Voraussetzungen

1. **Email-Account mit IMAP-Zugang**
   - Gmail, Outlook, oder anderer IMAP-fähiger Provider
   - IMAP muss aktiviert sein
   - Zugangsdaten (Benutzername, Passwort)

2. **Organisation im System**
   - Organisation muss bereits existieren
   - Organisation-ID muss bekannt sein

## Konfiguration

### Option 1: Script (Empfohlen)

Verwende das Setup-Script:

```bash
cd backend
npx ts-node scripts/setup-email-reading.ts <organizationId> <imapHost> <imapPort> <imapUser> <imapPassword> [processedFolder] [fromFilter] [subjectFilter]
```

**Beispiel für Gmail:**
```bash
npx ts-node scripts/setup-email-reading.ts 1 imap.gmail.com 993 reservations@example.com "app-password" "Processed" "notification@lobbybookings.com" "Nueva reserva"
```

**Parameter:**
- `organizationId` - ID der Organisation (z.B. 1)
- `imapHost` - IMAP-Server (z.B. `imap.gmail.com`)
- `imapPort` - IMAP-Port (993 für SSL, 143 für TLS)
- `imapUser` - Email-Adresse
- `imapPassword` - Passwort oder App-Passwort
- `processedFolder` - (Optional) Ordner für verarbeitete Emails (z.B. "Processed")
- `fromFilter` - (Optional) Absender-Filter (Standard: `notification@lobbybookings.com`)
- `subjectFilter` - (Optional) Betreff-Filter (Standard: `Nueva reserva, New reservation`)

### Option 2: Manuell über API

**1. Hole aktuelle Organisation-Settings:**
```bash
GET /api/organizations/current
```

**2. Aktualisiere Settings mit Email-Reading-Konfiguration:**
```bash
PUT /api/organizations/current
Content-Type: application/json

{
  "settings": {
    ...existingSettings,
    "emailReading": {
      "enabled": true,
      "provider": "imap",
      "imap": {
        "host": "imap.gmail.com",
        "port": 993,
        "secure": true,
        "user": "reservations@example.com",
        "password": "app-password",
        "folder": "INBOX",
        "processedFolder": "Processed"
      },
      "filters": {
        "from": ["notification@lobbybookings.com"],
        "subject": ["Nueva reserva", "New reservation"]
      }
    }
  }
}
```

## Provider-spezifische Konfiguration

### Gmail

1. **App-Passwort erstellen:**
   - Gehe zu: https://myaccount.google.com/apppasswords
   - Erstelle ein App-Passwort für "Mail"
   - Verwende dieses Passwort (nicht das normale Gmail-Passwort!)

2. **Konfiguration:**
   ```json
   {
     "imap": {
       "host": "imap.gmail.com",
       "port": 993,
       "secure": true,
       "user": "deine-email@gmail.com",
       "password": "app-passwort-16-zeichen"
     }
   }
   ```

### Outlook / Office 365

1. **IMAP aktivieren:**
   - Gehe zu: https://outlook.office.com
   - Einstellungen → Alle Outlook-Einstellungen anzeigen
   - E-Mail → Synchronisierung → IMAP aktivieren

2. **Konfiguration:**
   ```json
   {
     "imap": {
       "host": "outlook.office365.com",
       "port": 993,
       "secure": true,
       "user": "deine-email@outlook.com",
       "password": "dein-passwort"
     }
   }
   ```

### Eigener IMAP-Server

```json
{
  "imap": {
    "host": "mail.example.com",
    "port": 993,  // oder 143 für TLS
    "secure": true,  // true für 993, false für 143
    "user": "reservations@example.com",
    "password": "passwort"
  }
}
```

## Filter-Konfiguration

### Absender-Filter

Nur Emails von bestimmten Absendern verarbeiten:

```json
{
  "filters": {
    "from": [
      "notification@lobbybookings.com",
      "reservations@booking.com"
    ]
  }
}
```

### Betreff-Filter

Nur Emails mit bestimmten Betreff-Zeilen verarbeiten:

```json
{
  "filters": {
    "subject": [
      "Nueva reserva",
      "New reservation",
      "Reservation"
    ]
  }
}
```

## Testing

### 1. Status prüfen

```bash
GET /api/email-reservations/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "provider": "imap",
    "imap": {
      "host": "imap.gmail.com",
      "port": 993,
      "secure": true,
      "folder": "INBOX",
      "processedFolder": "Processed"
    },
    "filters": {
      "from": ["notification@lobbybookings.com"],
      "subject": ["Nueva reserva"]
    },
    "schedulerRunning": true
  }
}
```

### 2. Email-Parsing testen

```bash
POST /api/email-reservations/parse
Content-Type: application/json

{
  "emailContent": "Hola, La Familia Hostel - Manila\n\nRecibiste una nueva reserva de Booking.com...\nReserva: 6057955462\nTitular: Nastassia Yankouskaya\nCheck in: 17/11/2025\nCheck out: 21/11/2025\nTotal: COP 186600"
}
```

### 3. Manueller Email-Check

```bash
POST /api/email-reservations/check
```

Dieser Endpoint:
- Verbindet zum IMAP-Server
- Holt ungelesene Emails
- Parst Reservation-Emails
- Erstellt Reservationen
- Markiert Emails als gelesen

### 4. Scheduler manuell triggern

```bash
POST /api/email-reservations/trigger-scheduler
```

## Automatische Verarbeitung

Der Scheduler läuft automatisch alle 10 Minuten und:
1. Prüft alle Organisationen mit aktivierter Email-Reading-Konfiguration
2. Holt ungelesene Emails vom IMAP-Server
3. Parst Reservation-Emails
4. Erstellt automatisch Reservationen
5. Sendet WhatsApp-Nachrichten (wenn Telefonnummer vorhanden)
6. Markiert Emails als gelesen
7. Verschiebt Emails in Processed-Ordner (falls konfiguriert)

## Troubleshooting

### Fehler: "IMAP-Verbindung fehlgeschlagen"

**Mögliche Ursachen:**
- Falsche Zugangsdaten
- IMAP nicht aktiviert
- Firewall blockiert Verbindung
- Falscher Port (993 für SSL, 143 für TLS)

**Lösung:**
- Prüfe Zugangsdaten
- Teste IMAP-Verbindung mit Email-Client
- Prüfe Firewall-Einstellungen

### Fehler: "Email konnte nicht geparst werden"

**Mögliche Ursachen:**
- Email-Format entspricht nicht dem erwarteten Format
- Reservation-Daten fehlen in der Email

**Lösung:**
- Teste Parsing mit `/api/email-reservations/parse`
- Prüfe Email-Inhalt
- Erweitere Parser-Patterns falls nötig

### Keine Emails werden verarbeitet

**Mögliche Ursachen:**
- Filter zu restriktiv
- Emails bereits als gelesen markiert
- Scheduler läuft nicht

**Lösung:**
- Prüfe Filter-Konfiguration
- Prüfe ob Emails ungelesen sind
- Prüfe Scheduler-Status: `GET /api/email-reservations/status`

## Sicherheit

### Passwort-Verschlüsselung

- Passwörter werden automatisch verschlüsselt in der Datenbank gespeichert
- Verwende `ENCRYPTION_KEY` in `.env` für Verschlüsselung

### Zugriffskontrolle

- Alle Endpoints erfordern Authentifizierung
- Nur Benutzer mit `reservations:create` Berechtigung können Email-Checks durchführen

## Logs

Alle Email-Reading-Aktivitäten werden geloggt:

```
[EmailReading] IMAP-Verbindung erfolgreich
[EmailReading] 3 ungelesene Email(s) gefunden
[EmailReservation] Email message-id erfolgreich geparst
[EmailReservation] Reservation 123 erstellt aus Email (Code: 6057955462)
[EmailReservation] ✅ WhatsApp-Nachricht erfolgreich versendet
```

## Weitere Informationen

- Siehe: `docs/implementation_plans/EMAIL_RESERVATION_PARSING_IMPLEMENTATION.md`
- API-Dokumentation: `docs/technical/API_REFERENZ.md`

