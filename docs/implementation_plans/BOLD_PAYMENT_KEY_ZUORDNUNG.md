# Bold Payment - Korrekte Key-Zuordnung

## 📋 Aus dem Bold Payment Dashboard

Basierend auf dem Screenshot siehst du:

### Test-Keys (Llaves de pruebas):
- **Llave de identidad** (Identity Key): `lxt4916HZkcVVmH7MmLdby5NudM-F20ZsV4eX-MLso`
- **Llave secreta** (Secret Key): `sSG8UxJpeYMZ13IqPlclFw`

## ✅ Korrekte Zuordnung

### Im Frontend (API Tab):

1. **API Key** Feld:
   - ✅ **"Llave secreta"** (Secret Key) eintragen
   - Das ist: `sSG8UxJpeYMZ13IqPlclFw`
   - **Wird für Authentifizierung verwendet**

2. **Merchant ID** Feld:
   - ✅ **"Llave de identidad"** (Identity Key) eintragen
   - Das ist: `lxt4916HZkcVVmH7MmLdby5NudM-F20ZsV4eX-MLso`
   - **Wird als merchant_id im API-Request verwendet**

3. **Environment**:
   - ✅ **"Sandbox (Test)"** ist korrekt für Tests
   - ✅ **"Production (Live)"** für Produktion

## ⚠️ Was du wahrscheinlich gemacht hast (FALSCH):

- ❌ Secret Key bei **API Key** → ✅ **RICHTIG!**
- ❌ Identity Key bei **Merchant ID** → ✅ **RICHTIG!**

**Du hast es also KORREKT gemacht!** 🎉

## 🔍 Verifikation

### So funktioniert es im Code:

1. **API Key** (Secret Key) wird verwendet für:
   - Authentifizierung im HTTP-Header
   - `Authorization: Bearer {apiKey}` oder ähnlich

2. **Merchant ID** (Identity Key) wird verwendet für:
   - `merchant_id` im Request-Payload
   - Identifikation deines Accounts

## ✅ Zusammenfassung

| Frontend-Feld | Bold Payment Key | Dein Wert |
|---------------|------------------|-----------|
| **API Key** | Llave secreta | `sSG8UxJpeYMZ13IqPlclFw` ✅ |
| **Merchant ID** | Llave de identidad | `lxt4916HZkcVVmH7MmLdby5NudM-F20ZsV4eX-MLso` ✅ |
| **Environment** | - | Sandbox (Test) ✅ |

## 🧪 Testen

Nach dem Speichern kannst du testen:

1. **Reservierung erstellen** (oder Mock-Daten verwenden)
2. **Check-in-Einladung auslösen**
3. **Payment-Link sollte erstellt werden**

Falls es nicht funktioniert:
- Prüfe Backend-Logs
- Prüfe ob Keys korrekt gespeichert wurden
- Prüfe ob Environment "sandbox" ist

