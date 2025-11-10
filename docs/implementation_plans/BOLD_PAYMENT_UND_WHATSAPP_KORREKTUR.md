# Bold Payment & WhatsApp - Korrektur der Keys

## ✅ Bold Payment - Du hast es RICHTIG gemacht!

### Deine Eingabe:
- **API Key**: Secret Key (`sSG8UxJpeYMZ13IqPlclFw`) ✅ **KORREKT**
- **Merchant ID**: Identity Key (`lxt4916HZkcVVmH7MmLdby5NudM-F20ZsV4eX-MLso`) ✅ **KORREKT**
- **Environment**: Sandbox (Test) ✅ **KORREKT**

### Warum das richtig ist:
- **API Key** (Secret Key) wird für die Authentifizierung verwendet
- **Merchant ID** (Identity Key) wird als `merchant_id` im API-Request verwendet
- **Sandbox** ist korrekt für Tests

## 📱 WhatsApp - Prüfung

### Was du eingegeben hast:
- **Provider**: ?
- **API Key**: ?
- **API Secret**: ?
- **Phone Number ID**: ?

### Für WhatsApp Business API sollte sein:
- **Provider**: "WhatsApp Business API"
- **API Key**: Access Token (aus Meta for Developers)
- **API Secret**: App Secret (optional, aus Meta for Developers)
- **Phone Number ID**: Phone Number ID (aus Meta Business Suite)

### Für Twilio sollte sein:
- **Provider**: "Twilio"
- **API Key**: Account SID (aus Twilio Console)
- **API Secret**: Auth Token (aus Twilio Console)
- **Phone Number ID**: WhatsApp Phone Number (z.B. `whatsapp:+14155238886`)

## 🧪 Testen

### Bold Payment testen:
1. **Reservierung erstellen** (oder Mock-Daten)
2. **Check-in-Einladung auslösen**
3. **Payment-Link sollte erstellt werden**

### WhatsApp testen:
1. **Reservierung mit Telefonnummer erstellen**
2. **Check-in-Einladung auslösen**
3. **WhatsApp-Nachricht sollte versendet werden**

## ⚠️ Falls Fehler auftreten

### Bold Payment:
- Prüfe ob Keys korrekt kopiert wurden (keine Leerzeichen)
- Prüfe ob Environment "sandbox" ist
- Prüfe Backend-Logs für Fehlermeldungen

### WhatsApp:
- Prüfe ob Provider korrekt ausgewählt ist
- Prüfe ob Access Token noch gültig ist (Temporary Token läuft nach 24h ab)
- Prüfe ob Phone Number ID korrekt ist
- Prüfe Backend-Logs für Fehlermeldungen

