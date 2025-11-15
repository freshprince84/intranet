# E-Mail-Konfiguration für Registrierung

## Option 1: Mailtrap (Empfohlen für Entwicklung/Test)

Mailtrap ist ein kostenloser SMTP-Testservice, der perfekt für Entwicklung geeignet ist.

### Schritt 1: Account erstellen
1. Gehe zu https://mailtrap.io
2. Registriere dich kostenlos
3. Logge dich ein

### Schritt 2: SMTP-Settings abrufen
1. Gehe zu "Email Testing" → "Inboxes"
2. Wähle dein Inbox aus
3. Klicke auf "SMTP Settings"
4. Wähle "Nodemailer" aus
5. Kopiere die folgenden Werte:
   - Host: `smtp.mailtrap.io`
   - Port: `2525`
   - Username: (wird angezeigt)
   - Password: (wird angezeigt)

### Schritt 3: .env Datei aktualisieren
Aktualisiere die `.env` Datei im Backend-Verzeichnis:

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=dein-mailtrap-username
SMTP_PASS=dein-mailtrap-password
```

### Schritt 4: Testen
1. Starte den Server neu (falls er läuft)
2. Registriere einen neuen Benutzer
3. Gehe zu Mailtrap → Inbox → Du solltest die E-Mail sehen!

---

## Option 2: Gmail SMTP

Für produktive Nutzung mit Gmail:

### Schritt 1: App-Passwort erstellen
1. Gehe zu https://myaccount.google.com/apppasswords
2. Erstelle ein neues App-Passwort für "Mail"
3. Kopiere das generierte Passwort (16 Zeichen)

### Schritt 2: .env Datei aktualisieren
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=deine-email@gmail.com
SMTP_PASS=dein-app-passwort
```

⚠️ **Wichtig**: Verwende NICHT dein normales Gmail-Passwort, sondern das App-Passwort!

---

## Option 3: Anderer SMTP-Server

Für andere SMTP-Server (z.B. Outlook, eigener Server):

```env
SMTP_HOST=smtp.ihr-server.com
SMTP_PORT=587
SMTP_USER=noreply@ihr-server.com
SMTP_PASS=ihr-passwort
```

---

## Verifikation

Nach der Konfiguration:
1. Server neu starten (falls er läuft)
2. Einen neuen Benutzer registrieren
3. Prüfe dein Mailtrap-Inbox oder deine E-Mail-Inbox

Falls die E-Mail nicht ankommt:
- Prüfe die Server-Logs auf Fehlermeldungen
- Verifiziere, dass alle SMTP-Variablen korrekt gesetzt sind
- Teste die SMTP-Verbindung mit einem E-Mail-Client

