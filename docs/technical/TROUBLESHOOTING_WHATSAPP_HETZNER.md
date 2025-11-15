# Troubleshooting: WhatsApp-Versand auf Hetzner-Server

## Problem

WhatsApp-Nachrichten werden auf dem Hetzner-Server nicht versendet, obwohl sie lokal funktionieren.

## Mögliche Ursachen

### 1. ENCRYPTION_KEY fehlt oder ist falsch

**Problem**: Die WhatsApp-Settings sind verschlüsselt in der DB gespeichert, aber der `ENCRYPTION_KEY` auf dem Hetzner-Server ist:
- Nicht gesetzt
- Anders als auf dem lokalen System

**Lösung**:
1. Prüfen Sie die `.env`-Datei auf dem Hetzner-Server:
   ```bash
   grep ENCRYPTION_KEY /path/to/backend/.env
   ```

2. Falls nicht gesetzt, generieren Sie einen neuen Key:
   ```bash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```

3. Fügen Sie den Key zur `.env` hinzu:
   ```env
   ENCRYPTION_KEY=<64 hex characters>
   ```

4. **WICHTIG**: Der Key muss derselbe sein wie auf dem lokalen System, wenn die Datenbank synchronisiert wurde!

### 2. WhatsApp-Settings sind nicht korrekt verschlüsselt

**Problem**: Die Settings wurden lokal unverschlüsselt gespeichert (weil `ENCRYPTION_KEY` nicht gesetzt war), aber auf dem Server wird versucht zu entschlüsseln.

**Lösung**:
1. Prüfen Sie die Settings in der Datenbank:
   ```sql
   SELECT settings->'whatsapp'->'apiKey' FROM "Organization" WHERE id = 1;
   ```

2. Wenn der Key verschlüsselt ist (Format: `iv:authTag:encrypted`), muss `ENCRYPTION_KEY` gesetzt sein.

3. Wenn der Key unverschlüsselt ist, sollte die Entschlüsselung automatisch übersprungen werden.

### 3. WhatsApp API Key oder Phone Number ID fehlt

**Problem**: Die WhatsApp-Konfiguration ist nicht vollständig.

**Lösung**:
1. Prüfen Sie die Backend-Logs beim Versenden einer Nachricht:
   ```
   [WhatsApp Service] WhatsApp Settings geladen: { ... }
   ```

2. Stellen Sie sicher, dass:
   - `apiKey` vorhanden ist
   - `phoneNumberId` vorhanden ist
   - `provider` auf `whatsapp-business-api` gesetzt ist

### 4. WhatsApp Access Token ist abgelaufen

**Problem**: Der WhatsApp Access Token ist abgelaufen.

**Lösung**:
1. Generieren Sie einen neuen System User Access Token (siehe `docs/WHATSAPP_TOKEN_SETUP.md`)
2. Aktualisieren Sie den Token über das Frontend oder per Script:
   ```bash
   cd backend
   npx ts-node scripts/update-whatsapp-settings.ts "NEUER_TOKEN"
   ```

## Debugging-Schritte

### 1. Prüfen Sie die Backend-Logs

Beim Versenden einer WhatsApp-Nachricht sollten folgende Logs erscheinen:

```
[WhatsApp Service] sendMessage aufgerufen für: +41787192338
[WhatsApp Service] Lade Settings für Organisation 1
[WhatsApp Service] ENCRYPTION_KEY ist gesetzt (Länge: 64)
[WhatsApp Service] WhatsApp Settings geladen: {
  provider: 'whatsapp-business-api',
  hasApiKey: true,
  apiKeyLength: 202,
  hasPhoneNumberId: true,
  phoneNumberId: '852832151250618'
}
[WhatsApp Service] Provider: whatsapp-business-api, Phone Number ID: 852832151250618
[WhatsApp Service] Sende Nachricht via whatsapp-business-api...
[WhatsApp Business] Sende Nachricht an +41787192338 via Phone Number ID 852832151250618
[WhatsApp Business] ✅ Nachricht erfolgreich gesendet. Status: 200
```

### 2. Prüfen Sie die Environment-Variablen

```bash
# Auf dem Hetzner-Server
cd /path/to/backend
cat .env | grep -E "ENCRYPTION_KEY|WHATSAPP"
```

### 3. Prüfen Sie die Datenbank

```sql
-- Prüfen Sie die WhatsApp-Settings
SELECT 
  id,
  name,
  settings->'whatsapp'->>'provider' as provider,
  settings->'whatsapp'->>'phoneNumberId' as phone_number_id,
  LENGTH(settings->'whatsapp'->>'apiKey'::text) as api_key_length
FROM "Organization"
WHERE id = 1;
```

### 4. Testen Sie die WhatsApp-Konfiguration

Erstellen Sie eine Test-Reservierung und prüfen Sie die Logs:

1. Erstellen Sie eine Reservierung mit Telefonnummer
2. Prüfen Sie die Backend-Logs für WhatsApp-Fehlermeldungen
3. Prüfen Sie, ob der Status auf `notification_sent` aktualisiert wird

## Häufige Fehlermeldungen

### "ENCRYPTION_KEY environment variable is not set"
- **Ursache**: `ENCRYPTION_KEY` fehlt in der `.env`
- **Lösung**: Fügen Sie `ENCRYPTION_KEY` zur `.env` hinzu

### "WhatsApp API Key ist nicht für Organisation X konfiguriert"
- **Ursache**: WhatsApp-Settings fehlen oder sind nicht korrekt entschlüsselt
- **Lösung**: Prüfen Sie die Settings in der DB und die Entschlüsselung

### "Error validating access token: Session has expired"
- **Ursache**: WhatsApp Access Token ist abgelaufen
- **Lösung**: Generieren Sie einen neuen Token (siehe `docs/WHATSAPP_TOKEN_SETUP.md`)

### "WhatsApp Phone Number ID ist nicht konfiguriert"
- **Ursache**: `phoneNumberId` fehlt in den Settings
- **Lösung**: Fügen Sie die Phone Number ID über das Frontend hinzu

## Nächste Schritte

1. **Prüfen Sie die Backend-Logs** beim Versenden einer WhatsApp-Nachricht
2. **Teilen Sie die Logs** mit dem Entwicklungsteam
3. **Prüfen Sie die Environment-Variablen** auf dem Hetzner-Server
4. **Prüfen Sie die Datenbank** auf korrekte WhatsApp-Settings

