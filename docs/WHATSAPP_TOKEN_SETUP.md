# WhatsApp Business API - Dauerhafter Access Token Setup

## Übersicht

Für die WhatsApp Business API benötigen Sie einen **System User Access Token**, der langlebig ist und nicht wie User Tokens nach wenigen Stunden abläuft.

## Schritt-für-Schritt Anleitung

### 1. Meta Business Suite öffnen

1. Gehen Sie zu [Meta Business Suite](https://business.facebook.com/)
2. Melden Sie sich mit Ihrem Facebook Business Account an
3. Wählen Sie Ihr **Business Portfolio** aus dem Dropdown-Menü oben links

### 2. System User erstellen

1. Klicken Sie auf das **Einstellungen**-Icon (Zahnrad) neben Ihrem Business Portfolio
2. Navigieren Sie zu **System Users** (Systembenutzer)
3. Klicken Sie auf **+Add** (Hinzufügen)
4. Im Fenster **Create system user**:
   - Geben Sie einen Namen ein (z.B. "WhatsApp API System User")
   - Wählen Sie die Rolle **Admin** (für vollständigen Zugriff) oder **Employee** (für eingeschränkten Zugriff)
5. Klicken Sie auf **Create** (Erstellen)

### 3. App zuweisen

1. Klicken Sie auf den Namen des erstellten System Users
2. Klicken Sie auf **Assign assets** (Assets zuweisen)
3. Im Fenster **Select assets and assign permissions**:
   - Wählen Sie Ihre **App** aus
   - Gewähren Sie dem System User die Berechtigung **Manage app**
4. Klicken Sie auf **Assign assets** (Assets zuweisen)

### 4. Token generieren

1. Laden Sie die Seite neu (es kann einige Minuten dauern, bis die Berechtigungen aktiviert sind)
2. Im **System Users**-Panel sollte Ihr System User jetzt **Full control** (Vollzugriff) auf Ihre App haben
3. Klicken Sie erneut auf den System User-Namen
4. Klicken Sie auf **Generate token** (Token generieren)
5. Im Fenster **Generate new token**:
   - Wählen Sie Ihre **App** aus
   - Wählen Sie eine **Token-Ablaufzeit**:
     - **Never** (Nie) - für dauerhafte Tokens (empfohlen)
     - Oder eine spezifische Ablaufzeit
   - Aktivieren Sie diese **Graph API Permissions**:
     - `business_management`
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - (Sie können nach "business" suchen, um diese schnell zu finden)
6. Klicken Sie auf **Generate token** (Token generieren)
7. **WICHTIG**: Kopieren Sie den Token sofort - er wird nur einmal angezeigt!

### 5. Token in der Anwendung speichern

Nachdem Sie den Token erhalten haben, können Sie ihn auf zwei Arten speichern:

#### Option A: Über das Frontend (Empfohlen)

1. Gehen Sie zur **Organisation** → **API-Konfiguration**
2. Tragen Sie den Token im Feld **WhatsApp Access Token** ein
3. Speichern Sie die Einstellungen

#### Option B: Über ein Script

Führen Sie das Script `update-whatsapp-settings.ts` aus:

```bash
cd backend
npx ts-node scripts/update-whatsapp-settings.ts
```

## Wichtige Hinweise

- **Token-Sicherheit**: Teilen Sie den Token niemals öffentlich oder in Code-Repositories
- **Token-Ablauf**: Auch "Never"-Tokens können ablaufen, wenn:
  - Das Passwort des System Users geändert wird
  - Die App-Berechtigungen geändert werden
  - Der System User gelöscht wird
- **Token-Rotation**: Es wird empfohlen, Tokens regelmäßig zu rotieren (z.B. alle 90 Tage)

## Troubleshooting

### Token läuft ab trotz "Never"

- Prüfen Sie, ob der System User noch existiert
- Prüfen Sie, ob die App-Berechtigungen noch aktiv sind
- Generieren Sie einen neuen Token

### Fehler: "Session has expired"

- Der Token ist abgelaufen
- Generieren Sie einen neuen System User Token
- Aktualisieren Sie den Token in den Organisationseinstellungen

### Fehler: "Insufficient permissions"

- Der System User hat nicht die richtigen Berechtigungen
- Prüfen Sie, ob alle drei Berechtigungen aktiviert sind:
  - `business_management`
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`

## Referenzen

- [WhatsApp Business Management API - Get Started](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started)
- [System User Access Tokens](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#1--acquire-an-access-token-using-a-system-user-or-facebook-login)

