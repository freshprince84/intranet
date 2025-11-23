# Email Connection Timeout - Fakten

**Datum**: 2025-01-22  
**Status**: 🔴 KRITISCH - Email funktioniert nicht mehr

## Problem

Email-Versand schlägt fehl mit "Connection timeout", obwohl es bis gestern noch funktioniert hat.

## Fakten aus Server-Logs

### Connection Timeout Fehler
- **Fehler**: `Error: Connection timeout`
- **Häufigkeit**: Bei jedem Email-Versand
- **Stack Trace**: 
  ```
  at SMTPConnection._formatError (/var/www/intranet/backend/node_modules/nodemailer/lib/smtp-connection/index.js:809:19)
  at SMTPConnection._onError (/var/www/intranet/backend/node_modules/nodemailer/lib/smtp-connection/index.js:795:20)
  at Timeout.<anonymous> (/var/www/intranet/backend/node_modules/nodemailer/lib/smtp-connection/index.js:237:22)
  ```
- **Code-Stelle**: `backend/src/services/emailService.ts` (Zeile 605: `await transporter.sendMail(mailOptions)`)

### SMTP-Konfiguration (Datenbank)

**Branch 3 (Manila)**:
- `smtpHost`: `mail.lafamilia-hostel.com` ✅
- `smtpPort`: `465` ✅
- `smtpUser`: SET ✅
- `smtpPass`: SET ✅
- `smtpFromEmail`: SET ✅
- `smtpFromName`: SET ✅

**Organization 1**:
- `smtpHost`: `mail.lafamilia-hostel.com` ✅
- `smtpPort`: `587` ✅
- `smtpUser`: SET ✅
- `smtpPass`: SET ✅

**Fakt**: SMTP-Settings sind in der Datenbank vorhanden und korrekt konfiguriert.

### Code-Fakten

**Transporter-Erstellung** (`backend/src/services/emailService.ts` Zeile 109-117):
```typescript
return nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true für 465, false für andere Ports
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});
```

**Fakt**: Keine Timeout-Konfiguration im nodemailer.createTransport().

**Nodemailer Standard-Timeout**:
- `connectionTimeout`: 2000ms (2 Sekunden)
- `greetingTimeout`: 2000ms (2 Sekunden)
- `socketTimeout`: 10000ms (10 Sekunden)

**Fakt**: Standard-Timeout ist sehr kurz. Wenn SMTP-Server langsam antwortet, wird Timeout ausgelöst.

### Logs zeigen

**Branch 3 verwendet**:
- `📧 Nutze Branch-spezifische SMTP-Einstellungen für Branch 3`
- `smtpHost`: `mail.lafamilia-hostel.com`
- `smtpPort`: `465` (secure: true)

**Fakt**: Branch 3 verwendet Port 465 (SSL/TLS), nicht Port 587 (STARTTLS).

## Bekannte Probleme

### Problem 1: Keine Timeout-Konfiguration
- **Code-Stelle**: `backend/src/services/emailService.ts` (Zeile 109-117)
- **Fakt**: Keine `connectionTimeout`, `greetingTimeout`, `socketTimeout` konfiguriert
- **Auswirkung**: Verwendet Nodemailer-Standard-Timeout (2 Sekunden), was zu kurz sein kann

### Problem 2: SMTP-Server antwortet langsam
- **Fakt**: Connection timeout tritt auf, wenn SMTP-Server nicht innerhalb von 2 Sekunden antwortet
- **Mögliche Ursachen**:
  - SMTP-Server ist überlastet
  - Netzwerkprobleme
  - Firewall blockiert Verbindung
  - SMTP-Server-Konfiguration geändert

### Problem 3: Port 465 vs 587
- **Branch 3**: Verwendet Port 465 (SSL/TLS)
- **Organization 1**: Verwendet Port 587 (STARTTLS)
- **Fakt**: Port 465 erfordert sofortige SSL-Verbindung, Port 587 verwendet STARTTLS

## Zusammenfassung der Fakten

1. **SMTP-Settings sind korrekt** in der Datenbank
2. **Keine Timeout-Konfiguration** im Code (verwendet Standard 2 Sekunden)
3. **Connection timeout** tritt bei jedem Email-Versand auf
4. **Branch 3 verwendet Port 465** (SSL/TLS)
5. **SMTP-Server**: `mail.lafamilia-hostel.com`

## Antwort auf Frage: "Warum geht Email dann schon wieder nicht?"

**Fakt**: Email-Versand schlägt fehl wegen Connection timeout. SMTP-Server antwortet nicht innerhalb von 2 Sekunden (Nodemailer-Standard-Timeout).

**Mögliche Ursachen**:
1. SMTP-Server ist überlastet oder langsam
2. Netzwerkprobleme zwischen Server und SMTP-Server
3. Firewall blockiert Verbindung
4. SMTP-Server-Konfiguration geändert

**Code-Problem**: Keine Timeout-Konfiguration, verwendet Standard-Timeout (2 Sekunden), was zu kurz sein kann.

