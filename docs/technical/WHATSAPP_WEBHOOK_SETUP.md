# WhatsApp Webhook Setup

## Übersicht

Dieses Dokument erklärt, wie der WhatsApp Business API Webhook in Meta/Facebook Developer Console konfiguriert wird.

## Voraussetzungen

1. WhatsApp Business API Account bei Meta/Facebook
2. Öffentlich erreichbare Server-URL (für Webhook)
3. Zugriff auf Meta Business Suite / Facebook Developer Console

## Schritt 1: Verify Token konfigurieren

### Im Backend (.env Datei)

Füge folgende Umgebungsvariable hinzu:

```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=dein_sicheres_verify_token_hier
```

**Wichtig:** 
- Verwende einen sicheren, zufälligen Token (mindestens 32 Zeichen)
- Speichere diesen Token sicher - du wirst ihn in Schritt 2 benötigen

### Token generieren (optional)

Du kannst einen sicheren Token mit folgendem Befehl generieren:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Schritt 2: Webhook in Meta Developer Console konfigurieren

### 2.1 Zugriff auf Developer Console

1. Gehe zu [Meta for Developers](https://developers.facebook.com/)
2. Wähle deine App aus (die WhatsApp Business API App)
3. Gehe zu **WhatsApp** → **Configuration** → **Webhooks**

### 2.2 Webhook hinzufügen

1. Klicke auf **"Add Callback URL"** oder **"Edit"** (falls bereits vorhanden)

2. **Callback URL eingeben:**
   ```
   https://deine-domain.de/api/whatsapp/webhook
   ```
   
   **Wichtig:**
   - Die URL muss **HTTPS** verwenden (nicht HTTP)
   - Die URL muss **öffentlich erreichbar** sein
   - Die Route ist `/api/whatsapp/webhook` (wie im Backend konfiguriert)

3. **Verify Token eingeben:**
   ```
   dein_sicheres_verify_token_hier
   ```
   
   **Wichtig:** 
   - Dieser Token muss **genau** mit dem `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in deiner `.env` Datei übereinstimmen

4. Klicke auf **"Verify and Save"**

   - Meta sendet einen GET Request an deine Webhook-URL
   - Das Backend prüft den Verify Token und antwortet mit dem Challenge
   - Wenn erfolgreich, wird der Webhook gespeichert

### 2.3 Webhook Events abonnieren

Nach erfolgreicher Verifizierung musst du die Events abonnieren:

1. Klicke auf **"Manage"** neben deinem Webhook
2. Wähle die folgenden Events aus:
   - ✅ **messages** (für eingehende Nachrichten)
   - Optional: **message_status** (für Status-Updates)

3. Klicke auf **"Save"**

## Schritt 3: Webhook testen

### 3.1 Webhook-Verifizierung testen

Der Webhook sollte automatisch verifiziert werden, wenn du in Schritt 2.2 auf "Verify and Save" klickst.

**Erfolgreiche Verifizierung:**
- In den Server-Logs sollte erscheinen:
  ```
  [WhatsApp Webhook] GET Request - Verifizierung: { mode: 'subscribe', ... }
  [WhatsApp Webhook] Webhook verifiziert
  ```

**Fehlgeschlagene Verifizierung:**
- Prüfe, ob `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env` gesetzt ist
- Prüfe, ob der Token in Meta Console genau übereinstimmt
- Prüfe, ob die Webhook-URL korrekt ist und erreichbar ist

### 3.2 Eingehende Nachricht testen

1. Sende eine Test-Nachricht von deiner WhatsApp-Nummer an die Business-Nummer
2. Prüfe die Server-Logs:

**Erfolgreiche Verarbeitung:**
```
[WhatsApp Webhook] Webhook-Anfrage erhalten
[WhatsApp Webhook] POST Request Body: { ... }
[WhatsApp Webhook] Eingehende Nachricht: { from: '+41787192338', text: 'request', ... }
[WhatsApp Webhook] Branch identifiziert: 2
[WhatsApp Webhook] Rufe Message Handler auf...
[WhatsApp Webhook] Antwort generiert: ...
[WhatsApp Webhook] ✅ Antwort erfolgreich gesendet
```

**Fehler:**
- Wenn keine Logs erscheinen → Webhook kommt nicht an (URL/HTTPS Problem)
- Wenn "Branch nicht gefunden" → Phone Number ID stimmt nicht
- Wenn "User nicht gefunden" → Telefonnummer nicht im Profil gespeichert

## Schritt 4: Troubleshooting

### Problem: Webhook wird nicht verifiziert

**Lösung:**
1. Prüfe, ob die Webhook-URL öffentlich erreichbar ist:
   ```bash
   curl https://deine-domain.de/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dein_token&hub.challenge=test
   ```
   
2. Prüfe, ob `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env` gesetzt ist

3. Prüfe Server-Logs für Fehlermeldungen

### Problem: Webhook kommt an, aber keine Antwort

**Lösung:**
1. Prüfe Server-Logs für Fehlermeldungen
2. Prüfe, ob Branch WhatsApp Settings korrekt konfiguriert sind
3. Prüfe, ob User dem Branch zugeordnet ist
4. Prüfe, ob API Key korrekt ist

### Problem: Webhook kommt nicht an

**Lösung:**
1. Prüfe, ob die Webhook-URL in Meta Console korrekt ist
2. Prüfe, ob die URL HTTPS verwendet (nicht HTTP)
3. Prüfe, ob die URL öffentlich erreichbar ist (nicht localhost)
4. Prüfe Firewall/Server-Konfiguration

## Wichtige Hinweise

1. **HTTPS erforderlich:** WhatsApp akzeptiert nur HTTPS-Webhooks
2. **Öffentliche URL:** Die Webhook-URL muss von außen erreichbar sein (nicht localhost)
3. **Verify Token:** Muss in `.env` und Meta Console identisch sein
4. **Events:** Nur "messages" Event ist für die Basis-Funktionalität erforderlich
5. **Rate Limits:** WhatsApp hat Rate Limits - bei zu vielen Anfragen kann es zu Verzögerungen kommen

## Beispiel-Konfiguration

### .env Datei
```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Meta Developer Console
- **Callback URL:** `https://intranet.example.com/api/whatsapp/webhook`
- **Verify Token:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Events:** `messages`

## Weitere Ressourcen

- [WhatsApp Cloud API Webhooks Dokumentation](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)

