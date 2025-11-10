# LobbyPMS API URL - Erklärung

## Was ist die API URL?

Die **API URL** ist die Basis-Adresse (Base URL), über die das System auf die LobbyPMS API zugreift.

### Beispiel:
```
https://app.lobbypms.com/api
```

Diese URL wird verwendet, um API-Anfragen an LobbyPMS zu senden, z.B.:
- `GET https://app.lobbypms.com/api/reservations` - Reservierungen abrufen
- `GET https://app.lobbypms.com/api/reservations/123` - Reservierungsdetails
- `PUT https://app.lobbypms.com/api/reservations/123/status` - Status aktualisieren

---

## Wo finde ich die API URL?

### Option 1: LobbyPMS-Dokumentation
1. Gehe zu: **https://app.lobbypms.com/api-docs**
2. In der Dokumentation findest du die Base URL für die API

### Option 2: LobbyPMS-Interface
1. Melde dich bei LobbyPMS an: **https://app.lobbypms.com**
2. Gehe zu: **Einstellungen** → **Benutzer, Berechtigungen und API**
3. Dort findest du:
   - **API URL** (meist: `https://app.lobbypms.com/api`)
   - **API Token** (für das Feld "API Key")
   - **Property ID** (für das Feld "Property ID")

### Option 3: Standard-Wert
Falls nicht anders angegeben, ist die Standard-URL:
```
https://app.lobbypms.com/api
```

---

## Was muss ich eintragen?

Im API Configuration Tab musst du folgende Felder ausfüllen:

### 1. API URL
**Wert:** `https://app.lobbypms.com/api`

**Wo finde ich das?**
- In der LobbyPMS-Dokumentation
- Oder Standard-Wert verwenden (siehe oben)

### 2. API Token (API Key)
**Wert:** Dein LobbyPMS API-Token

**Wo finde ich das?**
1. LobbyPMS → Einstellungen → Benutzer, Berechtigungen und API
2. Tab "API-Zugriff" (API Access)
3. Dort findest du den **API-Token** deiner Property

### 3. Property ID
**Wert:** Die ID deiner Property in LobbyPMS

**Wo finde ich das?**
- In LobbyPMS unter Einstellungen
- Oder in der URL wenn du in LobbyPMS bist (z.B. `app.lobbypms.com/property/123` → Property ID ist `123`)

---

## Wichtige Hinweise

### URL-Validierung
Das System validiert die URL automatisch und erlaubt nur:
- ✅ `app.lobbypms.com` (exakt)
- ✅ `*.app.lobbypms.com` (Subdomains)

**Nicht erlaubt:**
- ❌ Andere Domains
- ❌ Lokale URLs (localhost)
- ❌ IP-Adressen

### Verschlüsselung
- Der API-Token wird **automatisch verschlüsselt** gespeichert
- Du siehst den Token im Frontend nur beim Bearbeiten
- In der Datenbank ist er verschlüsselt

---

## Schritt-für-Schritt Anleitung

1. **Melde dich bei LobbyPMS an**
   - URL: https://app.lobbypms.com
   - Mit deinen Admin-Zugangsdaten

2. **Gehe zu API-Einstellungen**
   - Einstellungen → Benutzer, Berechtigungen und API
   - Tab "API-Zugriff"

3. **Notiere dir:**
   - API URL: Meist `https://app.lobbypms.com/api`
   - API Token: Der lange Token-String
   - Property ID: Die ID deiner Property

4. **Trage im Intranet ein:**
   - Organisation bearbeiten → Tab "API"
   - LobbyPMS-Sektion ausfüllen
   - Speichern

---

## Troubleshooting

### "Ungültige URL" Fehler
- Prüfe ob die URL exakt `https://app.lobbypms.com/api` ist
- Keine Trailing-Slashes: `https://app.lobbypms.com/api/` ❌
- Keine zusätzlichen Pfade: `https://app.lobbypms.com/api/v1` ❌

### "API Token ungültig" Fehler
- Prüfe ob der Token korrekt kopiert wurde (keine Leerzeichen)
- Prüfe ob der Token in LobbyPMS noch aktiv ist
- Generiere einen neuen Token falls nötig

### "Property ID nicht gefunden"
- Prüfe ob die Property ID korrekt ist
- Prüfe ob du Zugriff auf diese Property hast

---

## Weitere Hilfe

- **LobbyPMS Support:** https://soporte.lobbypms.com
- **LobbyPMS API-Dokumentation:** https://app.lobbypms.com/api-docs
- **LobbyPMS API Setup:** https://soporte.lobbypms.com/hc/es/articles/1500002760802-Usuarios-permisos-y-API


