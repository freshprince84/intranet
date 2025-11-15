# WhatsApp Business API - Komplette Anleitung

## 📱 Übersicht

Diese Anleitung führt dich Schritt für Schritt durch die Konfiguration der WhatsApp Business API für die LobbyPMS Integration.

## 🎯 Was wird benötigt?

### Erforderliche Daten:
- **Provider**: "WhatsApp Business API"
- **API Key**: WhatsApp Business API Access Token
- **API Secret**: WhatsApp Business API App Secret (optional)
- **Phone Number ID**: WhatsApp Business Phone Number ID

### Optional:
- **Business Account ID**: Für erweiterte Funktionen
- **Webhook Verify Token**: Für Webhook-Validierung

---

## 📋 Schritt 1: Meta Business Account erstellen

### 1.1 Meta Business Suite öffnen
1. **Gehe zu**: `https://business.facebook.com`
2. **Account erstellen** (falls noch nicht vorhanden)
3. **Einloggen**

### 1.2 Business Account einrichten
1. **Business Account erstellen** oder auswählen
2. **Business-Informationen ausfüllen**
3. **Verifizierung durchführen** (falls erforderlich)

---

## 📋 Schritt 2: WhatsApp Business Account erstellen

### 2.1 WhatsApp Business Account hinzufügen
1. **In Meta Business Suite**: **Accounts** → **WhatsApp Accounts**
2. **"Add"** oder **"Erstellen"** klicken
3. **Account-Name eingeben** (z.B. "La Familia Hostel")
4. **Erstellen**

### 2.2 Phone Number hinzufügen
1. **In WhatsApp Business Account**: **Phone Numbers**
2. **"Add Phone Number"** klicken
3. **Telefonnummer eingeben** (muss verifiziert werden)
4. **Verifizierungscode eingeben** (wird per SMS/Anruf gesendet)
5. **Phone Number ID notieren** (wird später benötigt)

---

## 📋 Schritt 3: Meta App erstellen

### 3.1 Meta for Developers öffnen
1. **Gehe zu**: `https://developers.facebook.com`
2. **Einloggen** mit deinem Meta Business Account
3. **"My Apps"** → **"Create App"**

### 3.2 App-Typ auswählen
1. **"Business"** auswählen
2. **App-Name eingeben** (z.B. "Intranet WhatsApp Integration")
3. **App-Kontakt-E-Mail eingeben**
4. **"Create App"** klicken

### 3.3 WhatsApp Product hinzufügen
1. **In der App**: **"Add Product"** → **"WhatsApp"**
2. **"Set Up"** klicken
3. **WhatsApp Business Account auswählen** (aus Schritt 2)

---

## 📋 Schritt 4: API-Zugangsdaten erhalten

### 4.1 Access Token generieren
1. **In Meta for Developers**: Deine App öffnen
2. **WhatsApp** → **"API Setup"**
3. **"Temporary Access Token"** kopieren (für Tests)
4. **Oder**: **"Generate Token"** für permanenten Token

### 4.2 Permanent Token erstellen (empfohlen)
1. **"API Setup"** → **"Access Tokens"**
2. **"Generate Token"** klicken
3. **Berechtigungen auswählen**:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
4. **Token generieren**
5. **Token kopieren und sicher speichern** ⚠️

### 4.3 App Secret anzeigen
1. **"Settings"** → **"Basic"**
2. **"App Secret"** → **"Show"**
3. **Secret kopieren** (falls benötigt)

### 4.4 Phone Number ID finden
1. **WhatsApp** → **"API Setup"**
2. **"Phone number ID"** kopieren
3. **Oder**: In WhatsApp Business Account → Phone Numbers → Details

---

## 📋 Schritt 5: Webhook konfigurieren (optional)

### 5.1 Webhook URL erstellen
**Deine Webhook URL**: `https://your-domain.com/api/whatsapp/webhook`

### 5.2 Webhook in Meta App konfigurieren
1. **WhatsApp** → **"Configuration"** → **"Webhooks"**
2. **"Edit"** klicken
3. **Callback URL eingeben**: `https://your-domain.com/api/whatsapp/webhook`
4. **Verify Token eingeben**: (z.B. "your-secret-token")
5. **"Verify and Save"** klicken

### 5.3 Webhook-Events abonnieren
1. **"Manage Subscriptions"** klicken
2. **Events auswählen**:
   - ✅ `messages`
   - ✅ `message_status`
3. **"Save"** klicken

---

## 📋 Schritt 6: Im Frontend konfigurieren

### 6.1 Organisation öffnen
1. **Frontend öffnen**: `http://localhost:3000`
2. **Organisationen** → **"La Familia Hostel"** → **"Bearbeiten"**
3. **"API" Tab** öffnen

### 6.2 WhatsApp-Bereich ausfüllen
1. **Provider**: **"WhatsApp Business API"** auswählen
2. **API Key**: Dein **Access Token** (aus Schritt 4.1 oder 4.2) eintragen
3. **API Secret**: Dein **App Secret** (aus Schritt 4.3) eintragen (optional)
4. **Phone Number ID**: Deine **Phone Number ID** (aus Schritt 4.4) eintragen

### 6.3 Speichern
1. **"Speichern"** klicken
2. **Erfolgsmeldung abwarten** ✅

---

## 🧪 Schritt 7: Testen

### 7.1 Test-Nachricht senden
```bash
# Über API (falls Test-Endpoint vorhanden)
curl -X POST http://localhost:5000/api/whatsapp/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+573001234567",
    "message": "Test-Nachricht"
  }'
```

### 7.2 Über Reservierung testen
1. **Reservierung erstellen** oder vorhandene verwenden
2. **Check-in-Einladung auslösen**
3. **WhatsApp-Nachricht sollte an Gast gesendet werden**

---

## ⚠️ Wichtige Hinweise

### Zugangsdaten sicher aufbewahren
- ⚠️ **Access Token** nie teilen oder committen
- ⚠️ **App Secret** sicher speichern
- ⚠️ **Phone Number ID** ist öffentlich, aber trotzdem sicher behandeln

### Token-Rotation
- 🔄 **Temporary Tokens** laufen nach 24 Stunden ab
- 🔄 **Permanent Tokens** sollten regelmäßig rotiert werden (alle 3-6 Monate)
- 🔄 **Token-Erneuerung** in Meta for Developers

### Limits beachten
- 📊 **Messaging Limits**: Prüfe deine Limits in Meta Business Suite
- 📊 **Rate Limits**: API hat Rate Limits (siehe Dokumentation)
- 📊 **Template Messages**: Für Marketing-Nachrichten müssen Templates erstellt werden

### Template Messages
- 📝 **Für Marketing-Nachrichten**: Templates in Meta Business Suite erstellen
- 📝 **Für Service-Nachrichten**: 24-Stunden-Fenster nach Kundenkontakt
- 📝 **Templates müssen genehmigt werden** (kann 1-2 Tage dauern)

---

## 🔍 Troubleshooting

### Problem: "Access Token invalid"
**Lösung**:
- Prüfe ob Token abgelaufen ist (Temporary Token läuft nach 24h ab)
- Generiere neuen Token in Meta for Developers
- Prüfe ob Token korrekt kopiert wurde (keine Leerzeichen)

### Problem: "Phone Number ID not found"
**Lösung**:
- Prüfe ob Phone Number ID korrekt ist
- Prüfe ob Phone Number verifiziert ist
- Prüfe ob Phone Number mit WhatsApp Business Account verknüpft ist

### Problem: "Message not sent"
**Lösung**:
- Prüfe ob Phone Number verifiziert ist
- Prüfe ob Template genehmigt ist (für Marketing-Nachrichten)
- Prüfe ob 24-Stunden-Fenster aktiv ist (für Service-Nachrichten)
- Prüfe Logs für detaillierte Fehlermeldungen

### Problem: "Webhook not receiving events"
**Lösung**:
- Prüfe ob Webhook URL öffentlich erreichbar ist (HTTPS erforderlich)
- Prüfe ob Verify Token korrekt ist
- Prüfe ob Events abonniert sind
- Prüfe ob Webhook verifiziert ist

---

## 📚 Weitere Ressourcen

### Dokumentation
- **Meta for Developers**: `https://developers.facebook.com/docs/whatsapp`
- **WhatsApp Business API**: `https://developers.facebook.com/docs/whatsapp/cloud-api`
- **API Reference**: `https://developers.facebook.com/docs/whatsapp/cloud-api/reference`

### Support
- **Meta Business Support**: `https://business.facebook.com/help`
- **Developer Community**: `https://developers.facebook.com/community`

### Tools
- **Graph API Explorer**: `https://developers.facebook.com/tools/explorer`
- **Webhook Tester**: `https://webhook.site` (für Tests)

---

## 📋 Checkliste

### Vorbereitung
- [ ] Meta Business Account erstellt
- [ ] WhatsApp Business Account erstellt
- [ ] Phone Number hinzugefügt und verifiziert
- [ ] Meta App erstellt
- [ ] WhatsApp Product hinzugefügt

### Zugangsdaten
- [ ] Access Token generiert
- [ ] App Secret kopiert (optional)
- [ ] Phone Number ID notiert

### Konfiguration
- [ ] Webhook konfiguriert (optional)
- [ ] Events abonniert (optional)
- [ ] Im Frontend konfiguriert
- [ ] Gespeichert

### Tests
- [ ] Test-Nachricht gesendet
- [ ] Über Reservierung getestet
- [ ] Webhook empfängt Events (optional)

---

## 🎯 Nächste Schritte

Nach erfolgreicher Konfiguration:
1. **Templates erstellen** (für Marketing-Nachrichten)
2. **Webhook testen** (falls konfiguriert)
3. **Monitoring einrichten**
4. **Team schulen**

