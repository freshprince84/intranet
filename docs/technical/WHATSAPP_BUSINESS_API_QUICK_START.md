# WhatsApp Business API - Quick Start

## 🚀 Schnellstart in 5 Schritten

### Schritt 1: Meta Business Account
1. Gehe zu: `https://business.facebook.com`
2. Account erstellen/einloggen
3. Business Account einrichten

### Schritt 2: WhatsApp Business Account
1. In Meta Business Suite: **Accounts** → **WhatsApp Accounts**
2. **"Add"** klicken → Account erstellen
3. **Phone Number hinzufügen** und verifizieren
4. **Phone Number ID notieren** 📝

### Schritt 3: Meta App erstellen
1. Gehe zu: `https://developers.facebook.com`
2. **"My Apps"** → **"Create App"**
3. **"Business"** auswählen
4. App-Name eingeben → **"Create App"**
5. **"Add Product"** → **"WhatsApp"** → **"Set Up"**
6. WhatsApp Business Account auswählen

### Schritt 4: Access Token erhalten
1. In Meta for Developers: Deine App öffnen
2. **WhatsApp** → **"API Setup"**
3. **"Temporary Access Token"** kopieren (für Tests)
   - Oder: **"Generate Token"** für permanenten Token
4. **Phone Number ID** kopieren (falls noch nicht notiert)

### Schritt 5: Im Frontend konfigurieren
1. Frontend öffnen → Organisation → Bearbeiten → **API Tab**
2. **Provider**: "WhatsApp Business API" auswählen
3. **API Key**: Access Token eintragen
4. **Phone Number ID**: Phone Number ID eintragen
5. **Speichern** ✅

---

## 📋 Was du brauchst

| Feld | Woher? |
|------|--------|
| **Provider** | "WhatsApp Business API" auswählen |
| **API Key** | Meta for Developers → WhatsApp → API Setup → Access Token |
| **API Secret** | Meta for Developers → Settings → Basic → App Secret (optional) |
| **Phone Number ID** | Meta Business Suite → WhatsApp Account → Phone Numbers → Details |

---

## ⚠️ Wichtig

### Access Token
- ⚠️ **Temporary Token** läuft nach 24 Stunden ab
- ✅ **Permanent Token** für Produktion verwenden
- 🔒 **Token sicher aufbewahren** (wird automatisch verschlüsselt gespeichert)

### Phone Number
- ✅ **Muss verifiziert sein**
- ✅ **Mit WhatsApp Business Account verknüpft**

### Templates
- 📝 **Für Marketing-Nachrichten**: Templates erstellen und genehmigen lassen
- ⏱️ **Genehmigung dauert 1-2 Tage**
- ✅ **Service-Nachrichten**: 24-Stunden-Fenster nach Kundenkontakt

---

## 🧪 Testen

### Option 1: Über Reservierung
1. Reservierung erstellen/öffnen
2. Check-in-Einladung auslösen
3. WhatsApp-Nachricht sollte an Gast gesendet werden

### Option 2: Über API (falls Test-Endpoint vorhanden)
```bash
curl -X POST http://localhost:5000/api/whatsapp/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1" \
  -d '{"to": "+573001234567", "message": "Test"}'
```

---

## ❓ Hilfe

### "Access Token invalid"
→ Neuen Token in Meta for Developers generieren

### "Phone Number ID not found"
→ Prüfe ob Phone Number verifiziert ist

### "Message not sent"
→ Prüfe ob Template genehmigt ist (Marketing)
→ Prüfe ob 24-Stunden-Fenster aktiv ist (Service)

---

## 📚 Links

- **Meta Business Suite**: `https://business.facebook.com`
- **Meta for Developers**: `https://developers.facebook.com`
- **WhatsApp API Docs**: `https://developers.facebook.com/docs/whatsapp`
- **Graph API Explorer**: `https://developers.facebook.com/tools/explorer`

---

## 📋 Checkliste

- [ ] Meta Business Account erstellt
- [ ] WhatsApp Business Account erstellt
- [ ] Phone Number verifiziert
- [ ] Meta App erstellt
- [ ] Access Token erhalten
- [ ] Phone Number ID notiert
- [ ] Im Frontend konfiguriert
- [ ] Gespeichert
- [ ] Getestet

