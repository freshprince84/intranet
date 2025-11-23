# Email Connection Timeout - Fakten

**Datum**: 2025-01-22

## Fakten aus Code

### Code-Stelle: `backend/src/services/emailService.ts` (Zeile 109-117)
```typescript
return nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});
```

**Fakt**: Keine `connectionTimeout`, `greetingTimeout`, `socketTimeout` Parameter konfiguriert.

**Fakt**: Nodemailer verwendet Standard-Timeout-Werte wenn nicht konfiguriert.

## Fakten aus Server-Logs

### Connection Timeout Fehler
- **Fehler-Text**: `Error: Connection timeout`
- **Häufigkeit**: Bei jedem Email-Versand
- **Stack Trace**: 
  - `SMTPConnection._formatError` (Zeile 809)
  - `SMTPConnection._onError` (Zeile 795)
  - `Timeout.<anonymous>` (Zeile 237)

### SMTP-Konfiguration verwendet
- **Log**: `📧 Nutze Branch-spezifische SMTP-Einstellungen für Branch 3`
- **Branch 3**: `smtpHost`: `mail.lafamilia-hostel.com`, `smtpPort`: `465`

## Fakten aus Datenbank-Prüfung

### Branch 3 Settings
- `smtpHost`: `mail.lafamilia-hostel.com`
- `smtpPort`: `465`
- `smtpUser`: SET
- `smtpPass`: SET
- `smtpFromEmail`: SET
- `smtpFromName`: SET

### Organization 1 Settings
- `smtpHost`: `mail.lafamilia-hostel.com`
- `smtpPort`: `587`
- `smtpUser`: SET
- `smtpPass`: SET

## Fakten aus Netzwerk-Test

### Port 587 Test
- **Befehl**: `telnet mail.lafamilia-hostel.com 587`
- **Ergebnis**: Verbindung erfolgreich
- **Server-Antwort**: `220-host45.latinoamericahosting.com ESMTP Exim 4.98.2 #2 Sun, 23 Nov 2025 12:07:19 -0500`
- **Fakt**: Port 587 ist erreichbar und Server antwortet

### Port 465 Test
- **Befehl**: `telnet mail.lafamilia-hostel.com 465`
- **Ergebnis**: Keine Antwort in Logs
- **Fakt**: Port 465 antwortet nicht oder Verbindung schlägt fehl

## Zusammenfassung der Fakten

1. **Code hat keine Timeout-Konfiguration** - verwendet Nodemailer-Standard
2. **Connection timeout tritt auf** - bei jedem Email-Versand
3. **Branch 3 verwendet Port 465** - für Email-Versand
4. **Port 587 ist erreichbar** - Server antwortet
5. **Port 465 antwortet nicht** - oder Verbindung schlägt fehl

## Antwort: "Warum geht Email dann schon wieder nicht?"

**Fakt**: Email-Versand schlägt fehl mit "Connection timeout".

**Fakt**: Branch 3 verwendet Port 465, Port 465 antwortet nicht auf Telnet-Test.

**Fakt**: Port 587 ist erreichbar und Server antwortet.

**Fakt**: Code hat keine Timeout-Konfiguration, verwendet Nodemailer-Standard-Timeout.

