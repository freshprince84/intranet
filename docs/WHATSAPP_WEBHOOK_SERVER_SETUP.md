# WhatsApp Webhook Token auf Server hinzufügen

## Übersicht

Die `.env` Datei wird **nicht** per Git aktualisiert (ist in `.gitignore`). Daher muss der WhatsApp Webhook Verify Token **manuell auf dem Server** hinzugefügt werden.

## Option 1: Automatisch (empfohlen)

Führe das Script aus:

```bash
cd backend
bash scripts/add-webhook-token-to-server.sh
```

Das Script:
- Verbindet sich per SSH zum Server
- Prüft ob `.env` existiert
- Fügt den Token hinzu oder überschreibt ihn
- Verifiziert die Änderung

## Option 2: Manuell

### Schritt 1: SSH zum Server

```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

### Schritt 2: Öffne .env Datei

```bash
cd /var/www/intranet/backend
nano .env
# oder
vi .env
```

### Schritt 3: Füge Token hinzu

Füge am Ende der Datei hinzu:

```env
# WhatsApp Webhook Verify Token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab
```

### Schritt 4: Speichere und verlasse Editor

- **nano:** `Ctrl+O` (speichern), `Enter`, `Ctrl+X` (beenden)
- **vi:** `:wq` (speichern und beenden)

### Schritt 5: Verifiziere

```bash
grep WHATSAPP_WEBHOOK_VERIFY_TOKEN .env
```

Sollte zeigen:
```
WHATSAPP_WEBHOOK_VERIFY_TOKEN=80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab
```

## Schritt 6: Server neu starten

**WICHTIG:** Der Server muss neu gestartet werden, damit die neue `.env` Variable geladen wird!

```bash
pm2 restart intranet-backend
```

Oder falls systemd verwendet wird:

```bash
systemctl restart intranet-backend
```

## Schritt 7: Webhook in Meta Console konfigurieren

1. Gehe zu [Meta for Developers](https://developers.facebook.com/)
2. Wähle deine WhatsApp Business API App
3. Gehe zu **WhatsApp** → **Configuration** → **Webhooks**
4. Klicke auf **"Add Callback URL"** oder **"Edit"**

5. **Callback URL:**
   ```
   https://65.109.228.106.nip.io/api/whatsapp/webhook
   ```

6. **Verify Token:**
   ```
   80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab
   ```

7. Klicke auf **"Bestätigen und speichern"**

8. **Events abonnieren:**
   - Klicke auf **"Manage"** neben dem Webhook
   - Aktiviere: `messages`
   - Klicke auf **"Save"**

## Verifizierung

Nach dem Neustart und der Konfiguration in Meta Console sollte die Verifizierung erfolgreich sein.

**Prüfe Server-Logs:**
```bash
tail -f /var/www/intranet/backend/logs/app.log
```

Beim Verifizierungsversuch sollte erscheinen:
```
[WhatsApp Webhook] GET Request - Verifizierung: { mode: 'subscribe', ... }
[WhatsApp Webhook] Webhook verifiziert
```

## Troubleshooting

### Problem: Token wird nicht erkannt

**Lösung:**
1. Prüfe ob Token in `.env` korrekt ist:
   ```bash
   grep WHATSAPP_WEBHOOK_VERIFY_TOKEN /var/www/intranet/backend/.env
   ```

2. Prüfe ob Server neu gestartet wurde:
   ```bash
   pm2 list
   pm2 logs intranet-backend
   ```

3. Prüfe ob `.env` geladen wird (in Server-Logs sollte kein Fehler sein)

### Problem: Webhook-Verifizierung schlägt fehl

**Lösung:**
1. Prüfe ob URL erreichbar ist:
   ```bash
   curl "https://65.109.228.106.nip.io/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=80bf46549d0fab963e6c7fb2987de18247c33f14904168051f34ab77610949ab&hub.challenge=test"
   ```
   
   Sollte den Challenge zurückgeben: `test`

2. Prüfe Server-Logs für Fehlermeldungen

3. Prüfe ob HTTPS korrekt konfiguriert ist (SSL-Zertifikat)

## Wichtige Hinweise

- ✅ `.env` wird **nicht** per Git aktualisiert (sicher!)
- ✅ Token muss auf **Server** und in **Meta Console** identisch sein
- ✅ Server **muss** nach Änderung der `.env` neu gestartet werden
- ✅ Webhook-URL muss **HTTPS** verwenden
- ✅ Webhook-URL muss **öffentlich erreichbar** sein

