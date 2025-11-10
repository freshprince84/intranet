# Woher bekomme ich die API-Keys und Zugangsdaten?

## 📋 Übersicht

Hier findest du für jeden Service, wo du die benötigten Zugangsdaten erhältst.

---

## 1. 🔵 LobbyPMS

### Benötigt:
- **API Key** (API Token)
- **Property ID**

### Woher bekommen:

#### Option A: LobbyPMS Dashboard
1. **LobbyPMS öffnen**: `https://app.lobbypms.com`
2. **Einloggen** mit deinem Account
3. **Einstellungen** → **API** oder **Integrationen**
4. **API Token generieren** (falls noch nicht vorhanden)
5. **Property ID** findest du in den **Property-Einstellungen**

#### Option B: LobbyPMS Support kontaktieren
- **Support**: `https://soporte.lobbypms.com`
- **API-Dokumentation**: `https://app.lobbypms.com/api-docs`
- **Support-Artikel**: `https://soporte.lobbypms.com/hc/es/articles/1500002760802-Usuarios-permisos-y-API`

### Wichtig:
- ⚠️ **API-Zugang muss aktiviert sein** (kann Zeit dauern)
- ⚠️ **Property ID** ist meist eine Nummer (z.B. "13543")

---

## 2. 💳 Bold Payment

### Benötigt:
- **API Key**
- **Merchant ID**
- **Environment** (Sandbox/Production)

### Woher bekommen:

#### Option A: Bold Payment Dashboard
1. **Bold Payment öffnen**: `https://bold.co` oder deine Bold Payment URL
2. **Einloggen** mit deinem Merchant-Account
3. **Einstellungen** → **API** oder **Developer Settings**
4. **API Key generieren** (falls noch nicht vorhanden)
5. **Merchant ID** findest du in den **Account-Einstellungen**

#### Option B: Bold Payment Support kontaktieren
- **Support kontaktieren** für API-Zugang
- **Sandbox-Account** für Tests anfragen

### Wichtig:
- ✅ **Sandbox** für Tests verwenden
- ✅ **Production** nur nach erfolgreichen Tests

---

## 3. 🔐 TTLock (Türsystem)

### Benötigt:
- **Client ID**
- **Client Secret**
- **API URL** (Standard: `https://open.ttlock.com`)

### Woher bekommen:

#### Option A: TTLock Developer Portal
1. **TTLock Developer Portal öffnen**: `https://open.ttlock.com`
2. **Einloggen** oder **Account erstellen**
3. **App erstellen** (falls noch nicht vorhanden)
4. **Client ID** und **Client Secret** werden generiert
5. **API-Dokumentation**: `https://open.ttlock.com/doc`

#### Option B: TTLock Support kontaktieren
- **Support**: Über TTLock Website
- **Dokumentation**: `https://open.ttlock.com/doc`

### Wichtig:
- ✅ **OAuth 2.0** wird verwendet
- ✅ **Access Token** wird automatisch verwaltet

---

## 4. 📱 WhatsApp

### Benötigt (Twilio):
- **Provider**: "Twilio"
- **API Key**: Twilio Account SID
- **API Secret**: Twilio Auth Token
- **Phone Number ID**: WhatsApp-Nummer

### Benötigt (WhatsApp Business API):
- **Provider**: "WhatsApp Business API"
- **API Key**: WhatsApp Business API Token
- **API Secret**: WhatsApp Business API Secret
- **Phone Number ID**: WhatsApp Business Phone Number ID

### Woher bekommen:

#### Option A: Twilio
1. **Twilio Console öffnen**: `https://console.twilio.com`
2. **Einloggen** mit deinem Account
3. **Account SID** und **Auth Token** findest du im Dashboard
4. **WhatsApp Sandbox** aktivieren (für Tests)
5. **Phone Number** in Twilio kaufen/konfigurieren

#### Option B: WhatsApp Business API
1. **Meta Business Suite**: `https://business.facebook.com`
2. **WhatsApp Business Account** erstellen
3. **API-Zugang** beantragen
4. **Phone Number** verifizieren
5. **API Token** generieren

### Wichtig:
- ✅ **Twilio** ist einfacher für den Start
- ✅ **WhatsApp Business API** erfordert Verifizierung

---

## 5. 🏛️ SIRE (Kolumbien)

### Benötigt:
- **API URL**: SIRE API Endpoint
- **API Key**: SIRE API Key
- **API Secret**: SIRE API Secret (optional)
- **Property Code**: SIRE Property Code

### Woher bekommen:

#### Option A: SIRE Portal (Kolumbien)
1. **SIRE Portal öffnen**: `https://sire.gov.co` oder deine SIRE URL
2. **Einloggen** mit deinem Account
3. **API-Zugang** beantragen (falls noch nicht vorhanden)
4. **Property Code** findest du in den **Property-Einstellungen**
5. **API Key** wird nach Genehmigung bereitgestellt

#### Option B: SIRE Support kontaktieren
- **Direkter Kontakt** erforderlich (keine öffentliche Dokumentation)
- **E-Mail** oder **Telefon** für API-Zugang
- **Property Code** vom Support erhalten

### Wichtig:
- ⚠️ **SIRE ist spezifisch für Kolumbien**
- ⚠️ **API-Zugang muss beantragt werden**
- ⚠️ **Keine öffentliche Dokumentation verfügbar**

---

## 📞 Support-Kontakte

### LobbyPMS
- **Support**: `https://soporte.lobbypms.com`
- **E-Mail**: Über Support-Portal
- **API-Dokumentation**: `https://app.lobbypms.com/api-docs`

### Bold Payment
- **Support**: Über Bold Payment Dashboard
- **E-Mail**: Support-Kontakt im Dashboard

### TTLock
- **Dokumentation**: `https://open.ttlock.com/doc`
- **Support**: Über TTLock Website

### Twilio
- **Support**: `https://support.twilio.com`
- **Dokumentation**: `https://www.twilio.com/docs/whatsapp`

### WhatsApp Business API
- **Support**: `https://business.facebook.com/help`
- **Dokumentation**: `https://developers.facebook.com/docs/whatsapp`

### SIRE (Kolumbien)
- **Direkter Kontakt** erforderlich
- **Keine öffentliche Dokumentation**

---

## 🎯 Empfohlene Reihenfolge

### Für den Start (Minimum):
1. ✅ **LobbyPMS** - Wichtigste Integration
2. ✅ **Bold Payment** - Für Zahlungslinks
3. ⚠️ **TTLock** - Optional (für Türsystem-PINs)
4. ⚠️ **WhatsApp** - Optional (für Benachrichtigungen)
5. ⚠️ **SIRE** - Optional (für Gästeregistrierung)

### Schritt-für-Schritt:
1. **Beginne mit LobbyPMS** (wichtigste Integration)
2. **Füge Bold Payment hinzu** (für Zahlungslinks)
3. **Teste die Basis-Funktionalität**
4. **Füge weitere Services hinzu** (TTLock, WhatsApp, SIRE)

---

## ⚠️ Wichtige Hinweise

### API-Zugang beantragen:
- ⏱️ **Kann Zeit dauern** (1-3 Werktage)
- 📧 **E-Mail-Bestätigung** abwarten
- 🔑 **API-Keys sicher aufbewahren**

### Test-Umgebung:
- ✅ **Sandbox/Test-Accounts** für Entwicklung verwenden
- ✅ **Production** erst nach erfolgreichen Tests

### Sicherheit:
- 🔒 **API-Keys nie teilen**
- 🔒 **Nur verschlüsselt speichern** (wird automatisch gemacht)
- 🔒 **Regelmäßig rotieren** (alle 3-6 Monate)

---

## 📝 Checkliste

### Vor der Konfiguration:
- [ ] LobbyPMS API-Zugang beantragt
- [ ] Bold Payment Account erstellt
- [ ] TTLock Developer Account erstellt (optional)
- [ ] Twilio Account erstellt (optional)
- [ ] SIRE API-Zugang beantragt (optional)

### API-Keys bereit:
- [ ] LobbyPMS API Key
- [ ] LobbyPMS Property ID
- [ ] Bold Payment API Key
- [ ] Bold Payment Merchant ID
- [ ] TTLock Client ID (optional)
- [ ] TTLock Client Secret (optional)
- [ ] WhatsApp Credentials (optional)
- [ ] SIRE API Key (optional)

---

## 🆘 Hilfe

### "Ich habe keinen API-Zugang"
→ **Support kontaktieren** für den jeweiligen Service
→ **API-Zugang beantragen** (kann Zeit dauern)

### "Ich weiß nicht, wo ich die Daten finde"
→ **Support kontaktieren** für den jeweiligen Service
→ **Dokumentation prüfen** (falls verfügbar)

### "API-Zugang dauert zu lange"
→ **Mit Mock-Daten testen** (siehe `LOBBYPMS_MOCK_DATEN.md`)
→ **Frontend kann bereits getestet werden**

