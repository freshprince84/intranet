# OpenAI API Key auf Server setzen

## 📋 Übersicht

Dieses Dokument erklärt, wie du den OpenAI API Key von der lokalen `.env` Datei auf den Hetzner Server überträgst.

---

## ✅ Schritt 1: Lokale .env prüfen

Der `OPENAI_API_KEY` ist bereits in deiner lokalen `.env` Datei vorhanden:
- **Pfad**: `backend/.env`
- **Status**: ✅ Gefunden

---

## 🚀 Schritt 2: Key auf Server setzen

### Option A: Manuell über SSH

1. **SSH zum Server**:
   ```bash
   ssh user@dein-server.de
   ```

2. **Wechsle ins Backend-Verzeichnis**:
   ```bash
   cd /path/to/intranet/backend
   ```

3. **Prüfe ob .env existiert**:
   ```bash
   ls -la .env
   ```

4. **Setze den Key** (wähle eine Option):

   **Falls .env NICHT existiert:**
   ```bash
   echo "OPENAI_API_KEY=sk-...dein-key-hier..." >> .env
   ```

   **Falls .env bereits existiert:**
   ```bash
   # Prüfe ob Key bereits vorhanden
   grep OPENAI_API_KEY .env
   
   # Falls vorhanden, ersetze ihn
   sed -i 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=sk-...dein-key-hier.../' .env
   
   # Falls nicht vorhanden, füge ihn hinzu
   echo "OPENAI_API_KEY=sk-...dein-key-hier..." >> .env
   ```

5. **Prüfe ob gesetzt**:
   ```bash
   grep OPENAI_API_KEY .env
   ```

6. **Server neu starten** (nach Absprache):
   ```bash
   # Falls Systemd Service:
   sudo systemctl restart intranet-backend
   
   # ODER falls PM2:
   pm2 restart intranet-backend
   
   # ODER falls direkt:
   # Server manuell neu starten
   ```

### Option B: Mit Script (empfohlen)

1. **Lokal: Script ausführen**:
   ```bash
   cd backend
   ./scripts/set-openai-key-on-server.sh
   ```
   
   Das Script zeigt dir die genauen Befehle, die du auf dem Server ausführen musst.

2. **Auf dem Server: Befehle ausführen**
   - Befolge die Anweisungen, die das Script ausgibt

---

## 🔍 Schritt 3: Prüfen ob Key geladen wird

### Auf dem Server:

1. **Server-Logs prüfen**:
   ```bash
   # Systemd:
   sudo journalctl -u intranet-backend -f
   
   # PM2:
   pm2 logs intranet-backend
   ```

2. **Test: WhatsApp-Nachricht senden**
   - Sende eine Nachricht an die WhatsApp-Nummer
   - Falls Key fehlt: `OPENAI_API_KEY nicht gesetzt` erscheint in Logs
   - Falls Key vorhanden: KI-Antwort sollte kommen

---

## ⚠️ Wichtige Hinweise

### Sicherheit:
- **Key nie in Git committen** (`.env` ist in `.gitignore`)
- **Key nie in Logs anzeigen**
- **Key sicher aufbewahren**

### Troubleshooting:

**Problem: "OPENAI_API_KEY nicht gesetzt"**
- Prüfe ob Key in `.env` auf Server steht
- Prüfe ob Server neu gestartet wurde
- Prüfe ob `.env` Datei gelesen wird (dotenv geladen?)

**Problem: "401 Unauthorized"**
- API Key ungültig → Neuen Key generieren
- Billing nicht eingerichtet → Payment Method hinzufügen

**Problem: Key wird nicht geladen**
- Prüfe ob `dotenv` geladen wird
- Prüfe ob `.env` im richtigen Verzeichnis ist
- Prüfe ob Server im richtigen Verzeichnis startet

---

## 📝 Checkliste

- [ ] Lokale `.env` hat `OPENAI_API_KEY`
- [ ] SSH zum Server möglich
- [ ] `.env` auf Server erstellt/bearbeitet
- [ ] `OPENAI_API_KEY` in Server `.env` gesetzt
- [ ] Server neu gestartet
- [ ] Server-Logs geprüft (keine Fehler)
- [ ] Test: WhatsApp-Nachricht gesendet
- [ ] KI-Antwort erhalten ✅

---

## 🆘 Hilfe

Falls Probleme auftreten:
1. **Server-Logs prüfen** für Fehlermeldungen
2. **Key manuell prüfen** auf Server
3. **Server neu starten** (nach Absprache)

