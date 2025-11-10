# 🎯 Frontend-Konfiguration - Was du tun musst

## Schritt 1: Frontend öffnen
1. Browser öffnen
2. Gehe zu: `http://localhost:3000`
3. Einloggen (falls nötig)

## Schritt 2: Organisation öffnen
1. In der Navigation nach **"Organisationen"** oder **"Organizations"** suchen
2. Klick darauf
3. **"La Familia Hostel"** (oder die Organisation mit ID: 1) finden
4. **"Bearbeiten"** oder **"Edit"** Button klicken
   - Oder: Direkt auf die Organisation klicken

## Schritt 3: API-Tab finden
Im geöffneten Modal/Sidepane siehst du mehrere Tabs oben:
- "Allgemein" / "General"
- "Rollen" / "Roles"  
- "Dokumente" / "Documents"
- "SMTP"
- **"API"** ← **HIER KLICKEN!**

**Wichtig**: API-Tab ist nur sichtbar, wenn die Organisation aus Kolumbien ist!

## Schritt 4: LobbyPMS ausfüllen
Im Bereich **"LobbyPMS"**:

1. **API Key** → Dein LobbyPMS Token eintragen
2. **Property ID** → Deine Property ID eintragen (z.B. "13543")
3. **Synchronisation aktivieren** → ✅ Checkbox anklicken
4. **Automatisch Tasks erstellen** → ✅ Checkbox anklicken (optional)
5. **Späte Check-in-Schwelle** → "22:00" lassen (oder ändern)
6. **Benachrichtigungskanäle** → ☑ E-Mail und ☑ WhatsApp anklicken

## Schritt 5: Bold Payment ausfüllen
Im Bereich **"Bold Payment"**:

1. **API Key** → Dein Bold Payment API Key eintragen
2. **Merchant ID** → Deine Merchant ID eintragen
3. **Environment** → "Sandbox" auswählen (für Tests)

## Schritt 6: TTLock ausfüllen
Im Bereich **"TTLock (Türsystem)"**:

1. **Client ID** → Deine TTLock Client ID eintragen
2. **Client Secret** → Dein TTLock Client Secret eintragen
3. **API URL** → "https://open.ttlock.com" lassen (Standard)

## Schritt 7: WhatsApp ausfüllen
Im Bereich **"WhatsApp"**:

1. **Provider** → "Twilio" oder "WhatsApp Business API" auswählen
2. **API Key** → Dein API Key eintragen
3. **API Secret** → Dein API Secret eintragen
4. **Phone Number ID** → Deine WhatsApp-Nummer eintragen

## Schritt 8: SIRE ausfüllen
Im Bereich **"SIRE"**:

1. **Aktiviert** → ✅ Checkbox anklicken
2. **Automatische Registrierung** → ✅ Checkbox anklicken
3. **API URL** → Deine SIRE API URL eintragen
4. **API Key** → Dein SIRE API Key eintragen
5. **API Secret** → Dein SIRE API Secret eintragen (falls nötig)
6. **Property Code** → Dein SIRE Property Code eintragen

## Schritt 9: SPEICHERN
1. **Ganz nach unten scrollen**
2. **"Speichern"** oder **"Save"** Button klicken
3. **Erfolgsmeldung abwarten** ✅

## Schritt 10: Fertig!
✅ **Du bist fertig!** 

Ich führe jetzt automatisch die Backend-Tests durch.

---

## ❓ Hilfe

**"API-Tab nicht sichtbar?"**
→ Organisation muss aus Kolumbien sein (country: 'CO')

**"Fehler beim Speichern?"**
→ Prüfe ob alle Pflichtfelder ausgefüllt sind
→ Browser-Console öffnen (F12) und Fehler prüfen

**"Welche Felder sind Pflicht?"**
→ LobbyPMS: API Key + Property ID (wenn Sync aktiviert)
→ Alle anderen sind optional

