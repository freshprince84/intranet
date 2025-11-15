# WhatsApp Business API - Genau wo?

## 🎯 Schritt-für-Schritt mit genauen Links und Navigation

---

## 📋 Schritt 1: Meta Business Suite öffnen

### 1.1 Öffnen
**URL**: `https://business.facebook.com`

### 1.2 Einloggen
- **Falls du bereits einen Account hast**: Einloggen
- **Falls nicht**: "Create Account" klicken

### 1.3 Business Account erstellen/auswählen
- **Falls du bereits ein Business Account hast**: Auswählen
- **Falls nicht**: 
  - "Create Business Account" klicken
  - Business-Name eingeben (z.B. "La Familia Hostel")
  - E-Mail-Adresse eingeben
  - "Create" klicken

---

## 📋 Schritt 2: WhatsApp Business Account erstellen

### 2.1 Navigation zu WhatsApp Accounts
1. **In Meta Business Suite** (oben links):
   - Klicke auf **"☰"** (Menü-Icon) oder
   - Klicke auf **"Accounts"** in der linken Sidebar

2. **In der Sidebar**:
   - Klicke auf **"WhatsApp Accounts"**
   - Oder: Gehe direkt zu: `https://business.facebook.com/settings/whatsapp-accounts`

### 2.2 WhatsApp Account hinzufügen
1. **Auf der Seite "WhatsApp Accounts"**:
   - Klicke auf **"Add"** Button (oben rechts)
   - Oder: Klicke auf **"Create WhatsApp Account"**

2. **Account-Name eingeben**:
   - Name: z.B. "La Familia Hostel WhatsApp"
   - Klicke auf **"Create"**

### 2.3 Phone Number hinzufügen
1. **In deinem WhatsApp Business Account**:
   - Klicke auf **"Phone Numbers"** Tab
   - Oder: Gehe zu: `https://business.facebook.com/settings/whatsapp-accounts/[ACCOUNT_ID]/phone-numbers`

2. **Phone Number hinzufügen**:
   - Klicke auf **"Add Phone Number"** Button
   - Telefonnummer eingeben (mit Ländercode, z.B. +573001234567)
   - Klicke auf **"Next"**

3. **Verifizierung**:
   - Wähle **"Call me"** oder **"Text me"**
   - Verifizierungscode eingeben
   - Klicke auf **"Verify"**

4. **Phone Number ID notieren**:
   - Nach Verifizierung: **Phone Number ID** wird angezeigt
   - **KOPIERE DIESE ID** 📝 (z.B. "123456789012345")

---

## 📋 Schritt 3: Meta App erstellen

### 3.1 Meta for Developers öffnen
**URL**: `https://developers.facebook.com`

### 3.2 Einloggen
- **Mit demselben Account** wie Meta Business Suite einloggen

### 3.3 App erstellen
1. **Auf der Startseite**:
   - Klicke auf **"My Apps"** (oben rechts)
   - Oder: Gehe direkt zu: `https://developers.facebook.com/apps`

2. **App erstellen**:
   - Klicke auf **"Create App"** Button (oben rechts)
   - Oder: Gehe zu: `https://developers.facebook.com/apps/create`

3. **App-Typ auswählen**:
   - Wähle **"Business"** (nicht "Consumer" oder "Other")
   - Klicke auf **"Next"**

4. **App-Details eingeben**:
   - **App Name**: z.B. "Intranet WhatsApp Integration"
   - **App Contact Email**: Deine E-Mail-Adresse
   - **Business Account**: Wähle dein Business Account (falls vorhanden)
   - Klicke auf **"Create App"**

### 3.4 WhatsApp Product hinzufügen
1. **In deiner App** (nach dem Erstellen):
   - Du siehst eine Übersicht mit verschiedenen "Products"
   - Suche nach **"WhatsApp"**
   - Klicke auf **"Set Up"** unter WhatsApp

2. **WhatsApp Business Account auswählen**:
   - Wähle dein **WhatsApp Business Account** aus (aus Schritt 2)
   - Klicke auf **"Continue"**

---

## 📋 Schritt 4: Access Token erhalten

### 4.1 In deiner App navigieren
1. **Gehe zu**: `https://developers.facebook.com/apps`
2. **Klicke auf deine App** (die du gerade erstellt hast)

### 4.2 WhatsApp API Setup öffnen
1. **In der linken Sidebar**:
   - Klicke auf **"WhatsApp"** (unter "Products")

2. **Auf der WhatsApp-Seite**:
   - Klicke auf **"API Setup"** Tab
   - Oder: Gehe direkt zu: `https://developers.facebook.com/apps/[APP_ID]/whatsapp-business/wa-dev-console`

### 4.3 Temporary Access Token kopieren
1. **Auf der "API Setup" Seite**:
   - Du siehst einen Bereich **"Temporary access token"**
   - **Token kopieren** (Klick auf Copy-Icon oder markieren und kopieren)
   - ⚠️ **Dieser Token läuft nach 24 Stunden ab!**

### 4.4 Permanent Token erstellen (empfohlen)
1. **Auf derselben "API Setup" Seite**:
   - Scrolle nach unten zu **"Access Tokens"**
   - Oder: Gehe zu: `https://developers.facebook.com/apps/[APP_ID]/whatsapp-business/wa-dev-console`

2. **Token generieren**:
   - Klicke auf **"Generate Token"** Button
   - Wähle dein **WhatsApp Business Account** aus
   - **Berechtigungen auswählen**:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
   - Klicke auf **"Generate Token"**

3. **Token kopieren**:
   - **Token wird angezeigt** (nur einmal!)
   - **KOPIERE DIESEN TOKEN SOFORT** 📝
   - ⚠️ **Token wird nicht wieder angezeigt!**

### 4.5 Phone Number ID finden (falls noch nicht notiert)
1. **Auf der "API Setup" Seite**:
   - Du siehst **"Phone number ID"** (unter "Temporary access token")
   - **ID kopieren** (z.B. "123456789012345")

---

## 📋 Schritt 5: Im Frontend konfigurieren

### 5.1 Frontend öffnen
**URL**: `http://localhost:3000` (oder deine Frontend-URL)

### 5.2 Organisation öffnen
1. **In der Navigation**:
   - Klicke auf **"Organisationen"** oder **"Organizations"**
   - Oder: Gehe zu: `http://localhost:3000/organizations`

2. **Organisation auswählen**:
   - Finde **"La Familia Hostel"** (oder deine Organisation)
   - Klicke auf **"Bearbeiten"** oder **"Edit"** Button
   - Oder: Klicke direkt auf die Organisation

### 5.3 API Tab öffnen
1. **Im Modal/Sidepane**:
   - Oben siehst du mehrere **Tabs**:
     - "Allgemein" / "General"
     - "Rollen" / "Roles"
     - "Dokumente" / "Documents"
     - "SMTP"
     - **"API"** ← **HIER KLICKEN!**

2. **API Tab anklicken**

### 5.4 WhatsApp-Bereich finden
1. **Im API Tab**:
   - Scrolle nach unten zum Bereich **"WhatsApp"**
   - Oder: Suche nach **"WhatsApp"** im Formular

### 5.5 Felder ausfüllen
1. **Provider**:
   - Dropdown öffnen
   - **"WhatsApp Business API"** auswählen

2. **API Key**:
   - Feld anklicken
   - **Access Token** (aus Schritt 4.3 oder 4.4) einfügen

3. **API Secret** (optional):
   - Feld anklicken
   - **App Secret** einfügen (falls benötigt)
   - **App Secret finden**: Meta for Developers → Deine App → Settings → Basic → App Secret → Show

4. **Phone Number ID**:
   - Feld anklicken
   - **Phone Number ID** (aus Schritt 2.3 oder 4.5) einfügen

### 5.6 Speichern
1. **Ganz nach unten scrollen**
2. **"Speichern"** oder **"Save"** Button klicken
3. **Erfolgsmeldung abwarten** ✅

---

## 🔗 Direkte Links (für schnellen Zugriff)

### Meta Business Suite
- **Hauptseite**: `https://business.facebook.com`
- **WhatsApp Accounts**: `https://business.facebook.com/settings/whatsapp-accounts`
- **Phone Numbers**: `https://business.facebook.com/settings/whatsapp-accounts/[ACCOUNT_ID]/phone-numbers`

### Meta for Developers
- **Hauptseite**: `https://developers.facebook.com`
- **My Apps**: `https://developers.facebook.com/apps`
- **Create App**: `https://developers.facebook.com/apps/create`
- **WhatsApp API Setup**: `https://developers.facebook.com/apps/[APP_ID]/whatsapp-business/wa-dev-console`

### Frontend
- **Organisationen**: `http://localhost:3000/organizations`
- **API Tab**: Nach Öffnen der Organisation → "API" Tab

---

## 📝 Checkliste

### Schritt 1: Meta Business Suite
- [ ] `https://business.facebook.com` geöffnet
- [ ] Eingeloggt
- [ ] Business Account erstellt/ausgewählt

### Schritt 2: WhatsApp Business Account
- [ ] "Accounts" → "WhatsApp Accounts" geöffnet
- [ ] WhatsApp Account erstellt
- [ ] Phone Number hinzugefügt und verifiziert
- [ ] Phone Number ID notiert

### Schritt 3: Meta App
- [ ] `https://developers.facebook.com` geöffnet
- [ ] App erstellt (Typ: "Business")
- [ ] WhatsApp Product hinzugefügt

### Schritt 4: Access Token
- [ ] "WhatsApp" → "API Setup" geöffnet
- [ ] Temporary Token kopiert (oder Permanent Token generiert)
- [ ] Phone Number ID notiert (falls noch nicht)

### Schritt 5: Frontend
- [ ] Frontend geöffnet
- [ ] Organisation geöffnet
- [ ] "API" Tab geöffnet
- [ ] Provider: "WhatsApp Business API" ausgewählt
- [ ] API Key (Access Token) eingetragen
- [ ] Phone Number ID eingetragen
- [ ] Gespeichert ✅

---

## 🆘 Hilfe

### "Ich finde 'WhatsApp Accounts' nicht"
→ In Meta Business Suite: Links in der Sidebar prüfen
→ Oder: Direkt zu `https://business.facebook.com/settings/whatsapp-accounts` gehen

### "Ich finde 'API Setup' nicht"
→ In Meta for Developers: Links in der Sidebar prüfen
→ Oder: Direkt zu `https://developers.facebook.com/apps/[APP_ID]/whatsapp-business/wa-dev-console` gehen

### "Token wird nicht angezeigt"
→ Prüfe ob du eingeloggt bist
→ Prüfe ob du die richtige App geöffnet hast
→ Prüfe ob WhatsApp Product hinzugefügt wurde

### "Phone Number ID nicht gefunden"
→ In Meta Business Suite: WhatsApp Account → Phone Numbers → Details
→ Oder: In Meta for Developers: WhatsApp → API Setup → Phone number ID

