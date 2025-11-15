# WhatsApp Business API Token - Schritt für Schritt Anleitung

## 🎯 Ziel dieser Anleitung

Diese Anleitung führt dich **Schritt für Schritt** durch die komplette Einrichtung eines WhatsApp Business API Tokens. Sie ist speziell für Personen gedacht, die Schwierigkeiten mit den Meta/Facebook-Plattformen haben.

**Wichtig**: Folge den Schritten **in der genannten Reihenfolge**. Jeder Schritt baut auf dem vorherigen auf.

---

## 📋 Übersicht: Was du am Ende haben wirst

Am Ende dieser Anleitung hast du:
1. ✅ Ein Meta Business Account
2. ✅ Ein WhatsApp Business Account
3. ✅ Eine verifizierte Telefonnummer
4. ✅ Eine Meta App (für Entwickler)
5. ✅ Einen Access Token (API Key)
6. ✅ Eine Phone Number ID
7. ✅ Alles im Frontend konfiguriert

---

## 🚨 WICHTIG: Zwei verschiedene Meta-Plattformen

Meta hat **zwei verschiedene Plattformen**, die du verwenden musst:

1. **Meta Business Suite** (`business.facebook.com`)
   - Für: Business Account, WhatsApp Business Account, Telefonnummern
   - **WICHTIG**: Hier erstellst du dein WhatsApp Business Account

2. **Meta for Developers** (`developers.facebook.com`)
   - Für: Apps erstellen, Access Tokens generieren
   - **WICHTIG**: Hier holst du dir den Token

**Beide verwenden dasselbe Login**, aber sie sind unterschiedliche Plattformen!

---

## 📋 SCHRITT 1: Meta Business Suite öffnen und einloggen

### 1.1 Öffne Meta Business Suite

1. **Öffne deinen Browser** (Chrome, Firefox, Edge, etc.)
2. **Gehe zu**: `https://business.facebook.com`
3. **Warte**, bis die Seite geladen ist

### 1.2 Einloggen

**Falls du bereits einen Account hast:**
1. Klicke auf **"Anmelden"** oder **"Log in"** (oben rechts)
2. Gib deine **E-Mail-Adresse** oder **Telefonnummer** ein
3. Gib dein **Passwort** ein
4. Klicke auf **"Anmelden"**

**Falls du noch keinen Account hast:**
1. Klicke auf **"Konto erstellen"** oder **"Create Account"**
2. Gib deine **E-Mail-Adresse** ein
3. Gib dein **Passwort** ein (mindestens 8 Zeichen)
4. Klicke auf **"Konto erstellen"**
5. Folge den Anweisungen zur Verifizierung (E-Mail-Code)

### 1.3 Business Account erstellen/auswählen

**Falls du bereits ein Business Account hast:**
- Du siehst möglicherweise eine Liste von Business Accounts
- **Klicke auf dein Business Account** (oder das, das du verwenden möchtest)

**Falls du noch kein Business Account hast:**
1. Du wirst aufgefordert, ein Business Account zu erstellen
2. **Business-Name eingeben**: z.B. "La Familia Hostel" oder dein Firmenname
3. **Dein Name eingeben**: Dein Vor- und Nachname
4. **E-Mail-Adresse eingeben**: Deine Geschäfts-E-Mail
5. Klicke auf **"Weiter"** oder **"Continue"**
6. Folge den weiteren Anweisungen

**✅ Checkliste Schritt 1:**
- [ ] Meta Business Suite geöffnet (`https://business.facebook.com`)
- [ ] Eingeloggt
- [ ] Business Account erstellt oder ausgewählt

---

## 📋 SCHRITT 2: WhatsApp Business Account erstellen

### 2.1 Navigation zu WhatsApp Accounts

**WICHTIG**: Die Navigation kann je nach Meta Business Suite Version unterschiedlich aussehen. Hier sind die häufigsten Varianten:

**Variante A: Sidebar links**
1. **Links in der Sidebar** findest du verschiedene Menüpunkte
2. Suche nach **"Accounts"** oder **"Konten"**
3. **Klicke auf "Accounts"**
4. In der Unterliste findest du **"WhatsApp Accounts"** oder **"WhatsApp-Konten"**
5. **Klicke auf "WhatsApp Accounts"**

**Variante B: Direkter Link**
1. **Gehe direkt zu**: `https://business.facebook.com/settings/whatsapp-accounts`
2. (Falls du nicht eingeloggt bist, wirst du zum Login weitergeleitet)

**Variante C: Über das Menü**
1. **Klicke auf das Menü-Icon** (☰) oben links
2. Suche nach **"Accounts"** oder **"Konten"**
3. **Klicke auf "Accounts"**
4. **Klicke auf "WhatsApp Accounts"**

### 2.2 WhatsApp Business Account hinzufügen

1. **Auf der Seite "WhatsApp Accounts"**:
   - Du siehst entweder eine leere Liste oder bereits vorhandene Accounts
   - **Oben rechts** findest du einen Button: **"Add"** oder **"Hinzufügen"** oder **"Create WhatsApp Account"**
   - **Klicke auf diesen Button**

2. **Account-Name eingeben**:
   - Ein Popup oder eine neue Seite öffnet sich
   - **Account-Name eingeben**: z.B. "La Familia Hostel WhatsApp"
   - **Klicke auf "Erstellen"** oder **"Create"**

3. **Warte**, bis der Account erstellt wurde
   - Du wirst zur Übersichtsseite des WhatsApp Business Accounts weitergeleitet

### 2.3 Telefonnummer hinzufügen

**WICHTIG**: Du musst eine **echte Telefonnummer** haben, die du empfangen kannst (SMS oder Anruf).

1. **In deinem WhatsApp Business Account**:
   - Du siehst verschiedene **Tabs** oder **Reiter** oben
   - Suche nach **"Phone Numbers"** oder **"Telefonnummern"**
   - **Klicke auf "Phone Numbers"**

2. **Telefonnummer hinzufügen**:
   - **Klicke auf "Add Phone Number"** oder **"Telefonnummer hinzufügen"**
   - **Telefonnummer eingeben**:
     - **WICHTIG**: Mit Ländercode, z.B. `+573001234567` (Kolumbien) oder `+41791234567` (Schweiz)
     - **Format**: `+` gefolgt von Ländercode, dann die Nummer ohne führende 0
   - **Klicke auf "Weiter"** oder **"Next"**

3. **Verifizierung**:
   - Meta bietet dir zwei Optionen:
     - **"Call me"** (Anruf) - Du erhältst einen Anruf mit einem Code
     - **"Text me"** (SMS) - Du erhältst eine SMS mit einem Code
   - **Wähle eine Option** (SMS ist meist schneller)
   - **Warte auf den Code** (kann 1-2 Minuten dauern)
   - **Code eingeben** in das Feld
   - **Klicke auf "Verify"** oder **"Verifizieren"**

4. **Phone Number ID notieren**:
   - **NACH der Verifizierung** wird dir eine **Phone Number ID** angezeigt
   - **Diese ID sieht aus wie**: `123456789012345` (eine lange Zahl)
   - **KOPIERE DIESE ID** und speichere sie in einem Textdokument
   - **⚠️ WICHTIG**: Du brauchst diese ID später!

**✅ Checkliste Schritt 2:**
- [ ] WhatsApp Accounts Seite geöffnet
- [ ] WhatsApp Business Account erstellt
- [ ] Telefonnummer hinzugefügt
- [ ] Telefonnummer verifiziert (Code eingegeben)
- [ ] Phone Number ID notiert und gespeichert

---

## 📋 SCHRITT 3: Meta for Developers öffnen und App erstellen

### 3.1 Meta for Developers öffnen

**WICHTIG**: Dies ist eine **andere Plattform** als Meta Business Suite!

1. **Öffne einen neuen Tab** in deinem Browser (oder gehe zu einer neuen URL)
2. **Gehe zu**: `https://developers.facebook.com`
3. **Warte**, bis die Seite geladen ist

### 3.2 Einloggen

1. **Falls du nicht automatisch eingeloggt bist**:
   - **Klicke auf "Anmelden"** oder **"Log in"**
   - **Gib dieselben Login-Daten ein** wie bei Meta Business Suite
   - (Es ist derselbe Account, aber eine andere Plattform)

2. **Falls du automatisch eingeloggt bist**: Perfekt, weiter zu Schritt 3.3

### 3.3 App erstellen

1. **Auf der Startseite von Meta for Developers**:
   - **Oben rechts** findest du **"My Apps"** oder **"Meine Apps"**
   - **Klicke auf "My Apps"**
   - Oder: Gehe direkt zu `https://developers.facebook.com/apps`

2. **App erstellen**:
   - Du siehst eine Liste deiner Apps (oder eine leere Liste)
   - **Oben rechts** findest du einen Button: **"Create App"** oder **"App erstellen"**
   - **Klicke auf "Create App"**

3. **App-Typ auswählen**:
   - Du siehst verschiedene App-Typen:
     - **Business** ← **WÄHLE DIESEN!**
     - Consumer
     - Other
   - **Klicke auf "Business"**
   - **Klicke auf "Next"** oder **"Weiter"**

4. **App-Details eingeben**:
   - **App Name**: z.B. "Intranet WhatsApp Integration" oder "La Familia WhatsApp"
   - **App Contact Email**: Deine E-Mail-Adresse
   - **Business Account**: Wähle dein Business Account aus (falls vorhanden)
   - **Klicke auf "Create App"** oder **"App erstellen"**

5. **Warte**, bis die App erstellt wurde
   - Du wirst zur App-Übersicht weitergeleitet

### 3.4 WhatsApp Product hinzufügen

1. **In deiner App** (nach dem Erstellen):
   - Du siehst eine Übersicht mit verschiedenen **"Products"** oder **"Produkten"**
   - Suche nach **"WhatsApp"** in der Liste
   - **Klicke auf "Set Up"** unter WhatsApp
   - Oder: **Klicke auf "Add Product"** → Suche nach **"WhatsApp"** → **"Set Up"**

2. **WhatsApp Business Account auswählen**:
   - Ein Popup oder eine neue Seite öffnet sich
   - Du siehst eine Liste deiner WhatsApp Business Accounts
   - **Wähle den Account aus**, den du in Schritt 2 erstellt hast
   - **Klicke auf "Continue"** oder **"Weiter"**

3. **Warte**, bis WhatsApp hinzugefügt wurde
   - Du wirst zur WhatsApp-Konfigurationsseite weitergeleitet

**✅ Checkliste Schritt 3:**
- [ ] Meta for Developers geöffnet (`https://developers.facebook.com`)
- [ ] Eingeloggt
- [ ] App erstellt (Typ: "Business")
- [ ] WhatsApp Product hinzugefügt
- [ ] WhatsApp Business Account ausgewählt

---

## 📋 SCHRITT 4: Access Token (API Key) erhalten

**🎯 DAS IST DER WICHTIGSTE SCHRITT!** Hier holst du dir den Token, den du brauchst.

### 4.1 Zur WhatsApp API Setup Seite navigieren

1. **In Meta for Developers**:
   - **Links in der Sidebar** findest du verschiedene Menüpunkte
   - Unter **"Products"** findest du **"WhatsApp"**
   - **Klicke auf "WhatsApp"**

2. **API Setup öffnen**:
   - Du siehst verschiedene Tabs oder Reiter:
     - **"Getting Started"**
     - **"API Setup"** ← **KLICK HIER!**
     - "Configuration"
     - "Templates"
   - **Klicke auf "API Setup"**
   - Oder: Gehe direkt zu: `https://developers.facebook.com/apps/[DEINE_APP_ID]/whatsapp-business/wa-dev-console`
     - (Ersetze `[DEINE_APP_ID]` mit der ID deiner App - findest du in der URL)

### 4.2 Temporary Access Token kopieren (für schnelle Tests)

**⚠️ WICHTIG**: Dieser Token läuft nach 24 Stunden ab! Für Produktion brauchst du einen Permanent Token (siehe 4.3).

1. **Auf der "API Setup" Seite**:
   - **Oben** findest du einen Bereich **"Temporary access token"** oder **"Temporärer Zugriffstoken"**
   - Du siehst einen langen Text (der Token)
   - **Klicke auf das Copy-Icon** (📋) neben dem Token
   - Oder: **Markiere den Token** (mit der Maus) und kopiere ihn (Strg+C oder Cmd+C)
   - **Speichere den Token** in einem Textdokument
   - **⚠️ WICHTIG**: Dieser Token läuft nach 24 Stunden ab!

### 4.3 Permanent Token erstellen (EMPFOHLEN für Produktion)

**✅ Dies ist der Token, den du für Produktion brauchst!**

1. **Auf derselben "API Setup" Seite**:
   - **Scrolle nach unten** zu **"Access Tokens"** oder **"Zugriffstoken"**
   - Du siehst einen Button: **"Generate Token"** oder **"Token generieren"**
   - **Klicke auf "Generate Token"**

2. **Token generieren**:
   - Ein Popup öffnet sich
   - **Wähle dein WhatsApp Business Account** aus (aus der Dropdown-Liste)
   - **Berechtigungen auswählen**:
     - ✅ **`whatsapp_business_messaging`** (sollte bereits ausgewählt sein)
     - ✅ **`whatsapp_business_management`** (sollte bereits ausgewählt sein)
   - **Klicke auf "Generate Token"** oder **"Token generieren"**

3. **Token kopieren**:
   - **⚠️ KRITISCH**: Der Token wird **NUR EINMAL** angezeigt!
   - **KOPIERE DIESEN TOKEN SOFORT**:
     - **Klicke auf das Copy-Icon** (📋)
     - Oder: **Markiere den Token** und kopiere ihn (Strg+C oder Cmd+C)
   - **Speichere den Token** in einem Textdokument
   - **⚠️ WICHTIG**: Wenn du die Seite schließt, siehst du den Token nie wieder! Du musst einen neuen generieren.

### 4.4 Phone Number ID finden (falls noch nicht notiert)

1. **Auf der "API Setup" Seite**:
   - **Oben** findest du **"Phone number ID"** oder **"Telefonnummer-ID"**
   - Die ID sieht aus wie: `123456789012345` (eine lange Zahl)
   - **Kopiere diese ID** (falls du sie noch nicht aus Schritt 2.3 hast)
   - **Speichere die ID** in einem Textdokument

**✅ Checkliste Schritt 4:**
- [ ] WhatsApp → API Setup Seite geöffnet
- [ ] Temporary Token kopiert (für Tests)
- [ ] Permanent Token generiert und kopiert (für Produktion)
- [ ] Phone Number ID notiert (falls noch nicht)
- [ ] Beide Werte in einem Textdokument gespeichert

---

## 📋 SCHRITT 5: Im Frontend konfigurieren

### 5.1 Frontend öffnen

1. **Öffne dein Frontend**:
   - **URL**: `http://localhost:3000` (oder deine Frontend-URL)
   - **Warte**, bis die Seite geladen ist
   - **Logge dich ein** (falls nötig)

### 5.2 Organisation öffnen

1. **Navigation**:
   - **In der Navigation** findest du **"Organisationen"** oder **"Organizations"**
   - **Klicke auf "Organisationen"**
   - Oder: Gehe direkt zu: `http://localhost:3000/organizations`

2. **Organisation auswählen**:
   - Du siehst eine Liste deiner Organisationen
   - **Finde deine Organisation** (z.B. "La Familia Hostel")
   - **Klicke auf "Bearbeiten"** oder **"Edit"** Button
   - Oder: **Klicke direkt auf die Organisation**

### 5.3 API Tab öffnen

1. **Im Modal/Sidepane**:
   - **Oben** siehst du mehrere **Tabs** oder **Reiter**:
     - "Allgemein" / "General"
     - "Rollen" / "Roles"
     - "Dokumente" / "Documents"
     - "SMTP"
     - **"API"** ← **KLICK HIER!**
   - **Klicke auf "API"**

### 5.4 WhatsApp-Bereich finden

1. **Im API Tab**:
   - **Scrolle nach unten** zum Bereich **"WhatsApp"**
   - Oder: **Suche nach "WhatsApp"** im Formular
   - Du siehst mehrere Felder:
     - **Provider** (Dropdown)
     - **API Key** (Textfeld)
     - **API Secret** (Textfeld, optional)
     - **Phone Number ID** (Textfeld)

### 5.5 Felder ausfüllen

1. **Provider**:
   - **Klicke auf das Dropdown-Feld** "Provider"
   - **Wähle "WhatsApp Business API"** aus der Liste
   - (Falls nicht vorhanden, wähle die ähnlichste Option)

2. **API Key**:
   - **Klicke auf das Textfeld** "API Key"
   - **Füge deinen Access Token ein** (aus Schritt 4.2 oder 4.3)
   - **⚠️ WICHTIG**: Keine Leerzeichen am Anfang oder Ende!

3. **API Secret** (optional):
   - **Falls benötigt**: Gehe zu Meta for Developers → Deine App → Settings → Basic → App Secret → Show
   - **Kopiere das App Secret**
   - **Füge es in das Feld "API Secret"** ein
   - **⚠️ HINWEIS**: Dieses Feld ist optional, wird aber empfohlen

4. **Phone Number ID**:
   - **Klicke auf das Textfeld** "Phone Number ID"
   - **Füge deine Phone Number ID ein** (aus Schritt 2.3 oder 4.4)
   - **⚠️ WICHTIG**: Keine Leerzeichen am Anfang oder Ende!

### 5.6 Speichern

1. **Ganz nach unten scrollen**
2. **Finde den Button** "Speichern" oder "Save"
3. **Klicke auf "Speichern"**
4. **Warte auf die Erfolgsmeldung** ✅
   - Du solltest eine Meldung sehen wie "Gespeichert" oder "Saved successfully"

**✅ Checkliste Schritt 5:**
- [ ] Frontend geöffnet
- [ ] Organisation geöffnet
- [ ] API Tab geöffnet
- [ ] Provider: "WhatsApp Business API" ausgewählt
- [ ] API Key (Access Token) eingetragen
- [ ] Phone Number ID eingetragen
- [ ] Gespeichert ✅

---

## 🎉 FERTIG!

Du hast jetzt:
- ✅ Ein Meta Business Account
- ✅ Ein WhatsApp Business Account
- ✅ Eine verifizierte Telefonnummer
- ✅ Eine Meta App
- ✅ Einen Access Token
- ✅ Eine Phone Number ID
- ✅ Alles im Frontend konfiguriert

---

## 🆘 Häufige Probleme und Lösungen

### Problem: "Ich finde 'WhatsApp Accounts' nicht in Meta Business Suite"

**Lösung**:
1. **Prüfe die Sidebar links** - manchmal ist es unter "Settings" oder "Einstellungen"
2. **Versuche den direkten Link**: `https://business.facebook.com/settings/whatsapp-accounts`
3. **Falls du immer noch nichts findest**: Möglicherweise musst du zuerst ein Business Account erstellen (siehe Schritt 1.3)

### Problem: "Ich finde 'API Setup' nicht in Meta for Developers"

**Lösung**:
1. **Prüfe ob WhatsApp Product hinzugefügt wurde** (Schritt 3.4)
2. **Versuche den direkten Link**: `https://developers.facebook.com/apps/[DEINE_APP_ID]/whatsapp-business/wa-dev-console`
   - Ersetze `[DEINE_APP_ID]` mit der ID deiner App (findest du in der URL, wenn du deine App öffnest)
3. **Falls immer noch nichts**: Prüfe ob du eingeloggt bist und die richtige App geöffnet hast

### Problem: "Token wird nicht angezeigt"

**Lösung**:
1. **Prüfe ob du eingeloggt bist**
2. **Prüfe ob du die richtige App geöffnet hast**
3. **Prüfe ob WhatsApp Product hinzugefügt wurde** (Schritt 3.4)
4. **Prüfe ob WhatsApp Business Account verknüpft ist** (Schritt 3.4)
5. **Versuche die Seite neu zu laden** (F5)

### Problem: "Phone Number ID nicht gefunden"

**Lösung**:
1. **In Meta Business Suite**:
   - Gehe zu: WhatsApp Accounts → Dein Account → Phone Numbers
   - Klicke auf deine Telefonnummer
   - Die Phone Number ID sollte in den Details angezeigt werden
2. **In Meta for Developers**:
   - Gehe zu: WhatsApp → API Setup
   - Die Phone Number ID sollte oben angezeigt werden

### Problem: "Token läuft ab" oder "Access Token invalid"

**Lösung**:
1. **Temporary Tokens laufen nach 24 Stunden ab**
2. **Generiere einen neuen Permanent Token** (Schritt 4.3)
3. **Aktualisiere den Token im Frontend** (Schritt 5.5)

### Problem: "Telefonnummer kann nicht verifiziert werden"

**Lösung**:
1. **Prüfe ob die Nummer korrekt eingegeben wurde** (mit Ländercode, z.B. +573001234567)
2. **Prüfe ob du SMS oder Anruf empfangen kannst**
3. **Warte 1-2 Minuten** - manchmal dauert es etwas
4. **Versuche die andere Option** (SMS statt Anruf oder umgekehrt)
5. **Prüfe ob die Nummer bereits für WhatsApp verwendet wird** (dann kann sie nicht verwendet werden)

### Problem: "Ich kann mich nicht einloggen"

**Lösung**:
1. **Prüfe ob du die richtige E-Mail-Adresse/Telefonnummer verwendest**
2. **Prüfe ob dein Passwort korrekt ist**
3. **Versuche "Passwort vergessen"** und setze es zurück
4. **Prüfe ob dein Account gesperrt ist** (kann bei Meta vorkommen)

---

## 📝 Zusammenfassung: Was du brauchst

| Feld | Woher? | Schritt |
|------|--------|---------|
| **Provider** | "WhatsApp Business API" auswählen | 5.5 |
| **API Key** | Meta for Developers → WhatsApp → API Setup → Access Token | 4.2 oder 4.3 |
| **API Secret** | Meta for Developers → Settings → Basic → App Secret (optional) | 4.3 |
| **Phone Number ID** | Meta Business Suite → WhatsApp Account → Phone Numbers → Details | 2.3 oder 4.4 |

---

## 🔗 Direkte Links (für schnellen Zugriff)

### Meta Business Suite
- **Hauptseite**: `https://business.facebook.com`
- **WhatsApp Accounts**: `https://business.facebook.com/settings/whatsapp-accounts`

### Meta for Developers
- **Hauptseite**: `https://developers.facebook.com`
- **My Apps**: `https://developers.facebook.com/apps`
- **Create App**: `https://developers.facebook.com/apps/create`

### Frontend
- **Organisationen**: `http://localhost:3000/organizations`

---

## 📚 Weitere Hilfe

Falls du immer noch Probleme hast:
1. **Lies die Fehlermeldungen genau** - sie geben oft Hinweise
2. **Prüfe die Checklisten** - hast du alle Schritte abgehakt?
3. **Versuche die direkten Links** - manchmal hilft das bei Navigationsproblemen
4. **Meta Support**: `https://business.facebook.com/help`

---

**Viel Erfolg! 🚀**

