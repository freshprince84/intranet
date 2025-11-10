# Frontend-Konfiguration - Schritt für Schritt

## 🎯 Was du im Frontend tun musst

### Schritt 1: Frontend öffnen
1. **Browser öffnen**
2. **URL eingeben**: `http://localhost:3000` (oder deine Frontend-URL)
3. **Einloggen** (falls noch nicht eingeloggt)

### Schritt 2: Organisation öffnen
1. **Navigation öffnen** (falls nicht sichtbar)
2. **"Organisationen"** oder **"Organizations"** suchen und anklicken
3. **"La Familia Hostel"** (oder Organisation ID: 1) auswählen
4. **"Bearbeiten"** oder **"Edit"** Button klicken
   - Oder: Klick direkt auf die Organisation

### Schritt 3: API-Tab öffnen
1. **Im Modal/Sidepane** siehst du mehrere Tabs:
   - "Allgemein" / "General"
   - "Rollen" / "Roles"
   - "Dokumente" / "Documents"
   - "SMTP"
   - **"API"** ← **HIER KLICKEN**
2. **"API" Tab anklicken**

**Wichtig**: Der API-Tab ist nur sichtbar, wenn die Organisation aus Kolumbien (`country: 'CO'`) ist!

### Schritt 4: LobbyPMS konfigurieren
Im API-Tab findest du mehrere Bereiche. Beginne mit **LobbyPMS**:

1. **API Key** Feld:
   - Dein LobbyPMS API Token hier eintragen
   - Beispiel: `abc123xyz789...`

2. **Property ID** Feld:
   - Deine LobbyPMS Property ID hier eintragen
   - Beispiel: `13543`

3. **Synchronisation aktivieren** Checkbox:
   - ✅ **ANKLICKEN** (aktivieren)

4. **Automatisch Tasks erstellen** Checkbox:
   - ✅ **ANKLICKEN** (optional, aber empfohlen)

5. **Späte Check-in-Schwelle** Feld:
   - Standard: `22:00`
   - Falls anders gewünscht, ändern (Format: HH:MM)

6. **Benachrichtigungskanäle**:
   - ☑ **E-Mail** (anklicken)
   - ☑ **WhatsApp** (anklicken, falls konfiguriert)

### Schritt 5: Bold Payment konfigurieren
Scrolle zum Bereich **Bold Payment**:

1. **API Key** Feld:
   - Dein Bold Payment API Key hier eintragen

2. **Merchant ID** Feld:
   - Deine Bold Payment Merchant ID hier eintragen

3. **Environment** Dropdown:
   - **"Sandbox"** auswählen (für Tests)
   - Oder **"Production"** (für Produktion)

### Schritt 6: TTLock konfigurieren
Scrolle zum Bereich **TTLock (Türsystem)**:

1. **Client ID** Feld:
   - Deine TTLock Client ID hier eintragen

2. **Client Secret** Feld:
   - Dein TTLock Client Secret hier eintragen
   - ⚠️ **Wird verschlüsselt gespeichert**

3. **API URL** Feld:
   - Standard: `https://open.ttlock.com`
   - Falls anders, ändern

### Schritt 7: WhatsApp konfigurieren
Scrolle zum Bereich **WhatsApp**:

1. **Provider** Dropdown:
   - **"Twilio"** auswählen (wenn Twilio verwendet wird)
   - Oder **"WhatsApp Business API"** (wenn WhatsApp Business API verwendet wird)

2. **API Key** Feld:
   - Für Twilio: Twilio Account SID
   - Für WhatsApp Business API: API Key

3. **API Secret** Feld:
   - Für Twilio: Twilio Auth Token
   - Für WhatsApp Business API: API Secret

4. **Phone Number ID** Feld:
   - Deine WhatsApp-Nummer eintragen

### Schritt 8: SIRE konfigurieren
Scrolle zum Bereich **SIRE**:

1. **Aktiviert** Checkbox:
   - ✅ **ANKLICKEN** (aktivieren)

2. **Automatische Registrierung** Checkbox:
   - ✅ **ANKLICKEN** (beim Check-in automatisch registrieren)

3. **API URL** Feld:
   - Deine SIRE API URL hier eintragen
   - Beispiel: `https://api.sire.gov.co`

4. **API Key** Feld:
   - Dein SIRE API Key hier eintragen

5. **API Secret** Feld:
   - Dein SIRE API Secret hier eintragen (falls erforderlich)

6. **Property Code** Feld:
   - Dein SIRE Property Code hier eintragen

### Schritt 9: Speichern
1. **Ganz nach unten scrollen**
2. **"Speichern"** oder **"Save"** Button klicken
3. **Erfolgsmeldung abwarten**
   - ✅ "Einstellungen erfolgreich gespeichert"
   - Oder ähnliche Erfolgsmeldung

### Schritt 10: Verbindung testen (optional)
Falls ein **"Verbindung testen"** Button vorhanden ist:
1. **Button anklicken**
2. **Ergebnis abwarten**
   - ✅ "Verbindung erfolgreich"
   - ❌ "Verbindung fehlgeschlagen" → Prüfe API-Keys

## ⚠️ Wichtige Hinweise

### Was passiert beim Speichern?
- ✅ Alle API-Keys werden **automatisch verschlüsselt** gespeichert
- ✅ Validierung wird durchgeführt
- ✅ Fehler werden angezeigt (falls vorhanden)

### Was passiert bei Fehlern?
- ❌ **Rote Fehlermeldung** erscheint
- 📝 **Fehlermeldung lesen** und korrigieren
- 🔄 **Erneut speichern**

### Was wenn ein Feld fehlt?
- ⚠️ **Pflichtfelder** sind markiert (meist mit *)
- ⚠️ **Optionale Felder** können leer bleiben
- ℹ️ **Tooltips** geben weitere Informationen

## 📋 Checkliste

Nach dem Speichern prüfe:
- [ ] Erfolgsmeldung angezeigt
- [ ] Keine Fehlermeldungen
- [ ] Alle eingegebenen Werte sind noch sichtbar (außer Secrets)
- [ ] Seite kann geschlossen werden

## 🎯 Nächste Schritte

Nach erfolgreichem Speichern:
1. **Modal/Sidepane schließen**
2. **Ich führe die Backend-Tests durch**
3. **Du kannst die Reservierungen-Seite öffnen**: `/reservations`

## ❓ Hilfe

### "API-Tab ist nicht sichtbar"
→ Prüfe ob Organisation aus Kolumbien ist (`country: 'CO'`)

### "Speichern funktioniert nicht"
→ Prüfe ob alle Pflichtfelder ausgefüllt sind
→ Prüfe Browser-Console auf Fehler (F12)

### "Fehlermeldung beim Speichern"
→ Fehlermeldung lesen
→ API-Keys prüfen
→ Netzwerkverbindung prüfen

