# LobbyPMS Integration - Quick Start

## 🚀 Schnellstart-Anleitung

### Schritt 1: ENCRYPTION_KEY setzen (wichtig!)

```bash
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Kopiere den generierten Key und füge ihn zur `.env` Datei hinzu:**
```env
ENCRYPTION_KEY=<generierter-key>
```

### Schritt 2: Frontend öffnen und konfigurieren

1. **Frontend starten** (falls nicht läuft):
   ```bash
   cd frontend
   npm start
   ```

2. **Organisation öffnen**:
   - Gehe zu `http://localhost:3000`
   - Öffne "Organisationen"
   - Wähle "La Familia Hostel" (ID: 1)
   - Klicke auf "Bearbeiten"
   - Gehe zum Tab **"API"**

3. **API-Keys eintragen**:
   - **LobbyPMS**: API Key + Property ID
   - **Bold Payment**: API Key + Merchant ID
   - **TTLock**: Client ID + Client Secret
   - **WhatsApp**: Provider + Credentials
   - **SIRE**: API URL + API Key + Property Code

4. **Speichern** klicken

### Schritt 3: Alle Integrationen testen

```bash
cd backend
npx ts-node scripts/test-all-integrations.ts 1
```

**Erwartetes Ergebnis**: Alle Tests erfolgreich ✅

### Schritt 4: Einzelne Integration testen

```bash
# LobbyPMS
npx ts-node scripts/test-integration-single.ts lobbypms 1

# TTLock
npx ts-node scripts/test-integration-single.ts ttlock 1

# Bold Payment
npx ts-node scripts/test-integration-single.ts boldpayment 1

# WhatsApp
npx ts-node scripts/test-integration-single.ts whatsapp 1

# SIRE
npx ts-node scripts/test-integration-single.ts sire 1
```

### Schritt 5: Mock-Daten erstellen (optional)

Falls LobbyPMS API noch nicht verfügbar:

```bash
cd backend
npx ts-node scripts/create-mock-reservations.ts 1
```

### Schritt 6: Frontend testen

1. **Reservierungen anzeigen**:
   - Gehe zu `http://localhost:3000/reservations`
   - Reservierungen sollten angezeigt werden

2. **Check-in durchführen**:
   - Klicke auf eine Reservierung
   - Klicke auf "Check-in"
   - Fülle Formular aus
   - Klicke auf "Check-in durchführen"

3. **Synchronisation testen**:
   - Klicke auf "Synchronisieren" Button
   - Prüfe ob neue Reservierungen erscheinen

### Schritt 7: Automatisierung testen

```bash
# Check-in-Einladungen manuell auslösen
curl -X POST http://localhost:5000/api/admin/trigger-check-in-invitations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📋 Checkliste

### Konfiguration
- [ ] ENCRYPTION_KEY gesetzt
- [ ] LobbyPMS konfiguriert
- [ ] Bold Payment konfiguriert
- [ ] TTLock konfiguriert
- [ ] WhatsApp konfiguriert
- [ ] SIRE konfiguriert

### Tests
- [ ] Alle Integrationen getestet (`test-all-integrations.ts`)
- [ ] LobbyPMS Verbindung erfolgreich
- [ ] TTLock Locks abgerufen
- [ ] Frontend funktioniert
- [ ] Check-in funktioniert

### Automatisierung
- [ ] Scheduler läuft (prüfe Logs)
- [ ] Check-in-Einladungen funktionieren
- [ ] Webhooks empfangen (Bold Payment)

## ⚠️ Häufige Probleme

### "ENCRYPTION_KEY nicht gesetzt"
→ Schritt 1 ausführen

### "API Key ist nicht konfiguriert"
→ Schritt 2: API-Keys im Frontend eintragen

### "Verbindung fehlgeschlagen"
→ Prüfe API-Keys und Netzwerkverbindung

## 📚 Weitere Dokumentation

- **Detaillierte Anleitung**: `LOBBYPMS_KONFIGURATION_UND_TEST_ANLEITUNG.md`
- **Test-Checkliste**: `LOBBYPMS_TEST_CHECKLISTE.md`
- **Schritt-für-Schritt**: `LOBBYPMS_KONFIGURATION_SCHRITT_FUER_SCHRITT.md`

## 🎯 Nächste Schritte

Nach erfolgreicher Konfiguration:
1. **Produktion vorbereiten**
2. **Webhooks konfigurieren** (Bold Payment Dashboard)
3. **Monitoring einrichten**
4. **Team schulen**

