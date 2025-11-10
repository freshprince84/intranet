# API Tab Fehlerbehebung

## Häufige Fehler und Lösungen

### 1. "Fehler beim Aktualisieren der Organisation"

**Mögliche Ursachen:**

#### A) ENCRYPTION_KEY nicht gesetzt
**Symptom:** Fehler beim Speichern, Backend-Log zeigt: "ENCRYPTION_KEY environment variable is not set"

**Lösung:**
1. In `backend/.env` hinzufügen:
```bash
ENCRYPTION_KEY=<64 hex characters>
```

2. Key generieren:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Backend neu starten

**Hinweis:** Falls ENCRYPTION_KEY nicht gesetzt ist, werden Settings aktuell unverschlüsselt gespeichert (nur für Migration). In Produktion MUSS ENCRYPTION_KEY gesetzt sein!

#### B) Validierungsfehler
**Symptom:** Fehler mit spezifischer Validierungsmeldung

**Lösung:**
- Prüfe ob alle Pflichtfelder korrekt ausgefüllt sind
- Prüfe URL-Format (muss `https://app.lobbypms.com/api` sein)
- Prüfe Zeitformat (muss `HH:MM` sein, z.B. `22:00`)

#### C) URL-Validierung schlägt fehl
**Symptom:** "Ungültige API-URLs"

**Lösung:**
- URL muss exakt `https://app.lobbypms.com/api` sein
- Keine Trailing-Slashes: `https://app.lobbypms.com/api/` ❌
- Keine zusätzlichen Pfade: `https://app.lobbypms.com/api/v1` ❌

#### D) Berechtigungsfehler
**Symptom:** "Keine Berechtigung, Organisation-Einstellungen zu ändern"

**Lösung:**
- User muss `organization_management` (write/both) Berechtigung haben
- Prüfe Rollen-Berechtigungen

---

## Debugging

### Backend-Logs prüfen
```bash
# Im Backend-Terminal
# Suche nach:
Error in updateCurrentOrganization:
Error encrypting API settings:
Error decrypting API settings:
Validierungsfehler bei API-Einstellungen:
```

### Frontend-Console prüfen
```javascript
// Browser-Console (F12)
// Suche nach:
Error saving API settings:
```

### Network-Tab prüfen
1. Browser DevTools → Network
2. Request zu `/api/organizations/current` (PUT)
3. Response prüfen:
   - Status Code (400, 403, 500)
   - Response Body (Fehlermeldung)

---

## Schritt-für-Schritt Fehlerbehebung

1. **Backend-Logs prüfen**
   - Welche Fehlermeldung erscheint?
   - Ist ENCRYPTION_KEY gesetzt?

2. **Validierung prüfen**
   - Sind alle Felder korrekt ausgefüllt?
   - URL-Format korrekt?
   - Zeitformat korrekt?

3. **Berechtigung prüfen**
   - Hat User `organization_management` (write/both)?
   - Prüfe Rollen-Berechtigungen

4. **ENCRYPTION_KEY prüfen**
   - Ist ENCRYPTION_KEY in `.env` gesetzt?
   - Ist Backend neu gestartet?

---

## Bekannte Probleme

### Property ID als Number
**Problem:** Property ID wird als Number gesendet, aber als String erwartet

**Lösung:** ✅ Behoben - Validierung akzeptiert jetzt Number und String

### ENCRYPTION_KEY fehlt
**Problem:** Verschlüsselung schlägt fehl wenn ENCRYPTION_KEY nicht gesetzt

**Lösung:** ✅ Behoben - Fallback auf unverschlüsselte Speicherung (nur für Migration)

---

## Test-Checkliste

- [ ] ENCRYPTION_KEY in `.env` gesetzt
- [ ] Backend neu gestartet
- [ ] User hat `organization_management` (write/both) Berechtigung
- [ ] API URL korrekt: `https://app.lobbypms.com/api`
- [ ] API Token korrekt (keine Leerzeichen)
- [ ] Property ID korrekt (String oder Number)
- [ ] Zeitformat korrekt: `HH:MM` (z.B. `22:00`)

---

## Support

Falls das Problem weiterhin besteht:
1. Backend-Logs kopieren
2. Browser-Console-Logs kopieren
3. Network-Request/Response kopieren
4. Screenshot der Fehlermeldung


