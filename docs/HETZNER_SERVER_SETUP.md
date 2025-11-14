# Hetzner Server Setup - WhatsApp Konfiguration

## Übersicht

Dieses Dokument beschreibt, wie die WhatsApp-Konfiguration auf dem Hetzner-Server geprüft und eingerichtet wird.

## Wichtige Dateien

### 1. `.env` Datei

Die `.env` Datei ist **NICHT** im Git enthalten (siehe `.gitignore`). Sie muss **manuell** auf den Server kopiert werden.

**Lokaler Pfad**: `backend/.env`
**Server-Pfad**: `/path/to/backend/.env` (je nach Server-Konfiguration)

### 2. Erforderliche Environment-Variablen

Die `.env` Datei muss mindestens enthalten:

```env
# Datenbank
DATABASE_URL="postgresql://..."

# Verschlüsselung (WICHTIG für WhatsApp-Settings!)
ENCRYPTION_KEY=<64 hex characters>

# Frontend URL (für Check-in-Links)
FRONTEND_URL=https://your-domain.com

# App URL (für Webhooks)
APP_URL=https://your-domain.com
```

## Prüfung der WhatsApp-Konfiguration

### Schritt 1: Prüfen Sie die Konfiguration auf dem Server

Führen Sie auf dem Hetzner-Server aus:

```bash
cd /path/to/backend
npx ts-node scripts/check-whatsapp-config.ts
```

Das Script prüft:
- ✅ Ob `ENCRYPTION_KEY` gesetzt ist
- ✅ Ob WhatsApp-Settings in der DB vorhanden sind
- ✅ Ob der permanente Token korrekt gesetzt ist
- ✅ Ob alle erforderlichen Felder vorhanden sind

### Schritt 2: Prüfen Sie die `.env` Datei

```bash
# Auf dem Hetzner-Server
cd /path/to/backend
cat .env | grep -E "ENCRYPTION_KEY|DATABASE_URL|FRONTEND_URL|APP_URL"
```

**WICHTIG**: 
- `ENCRYPTION_KEY` muss **dasselbe** sein wie lokal, wenn die DB synchronisiert wurde
- Falls die DB neu ist, kann ein neuer Key generiert werden

### Schritt 3: Prüfen Sie den WhatsApp Token

Der permanente Token sollte sein:
```
EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD
```

Prüfen Sie, ob dieser Token auf dem Server ist:

```bash
# Auf dem Hetzner-Server
cd /path/to/backend
npx ts-node scripts/check-whatsapp-config.ts
```

Das Script zeigt an, ob der neue permanente Token erkannt wird.

## Setup auf dem Hetzner-Server

### Option 1: `.env` Datei manuell kopieren

1. **Lokale `.env` Datei prüfen**:
   ```bash
   # Lokal
   cd backend
   cat .env
   ```

2. **Auf Server kopieren** (via SCP oder manuell):
   ```bash
   # Von lokal
   scp backend/.env user@hetzner-server:/path/to/backend/.env
   ```

3. **Auf Server prüfen**:
   ```bash
   # Auf Server
   cd /path/to/backend
   cat .env
   ```

### Option 2: Environment-Variablen manuell setzen

Falls die `.env` Datei nicht kopiert werden kann, setzen Sie die Variablen manuell:

1. **SSH auf den Server**:
   ```bash
   ssh user@hetzner-server
   ```

2. **Erstellen Sie `.env` Datei**:
   ```bash
   cd /path/to/backend
   nano .env
   ```

3. **Fügen Sie die Variablen hinzu**:
   ```env
   DATABASE_URL="postgresql://..."
   ENCRYPTION_KEY=<64 hex characters>
   FRONTEND_URL=https://your-domain.com
   APP_URL=https://your-domain.com
   ```

4. **Speichern und beenden** (Ctrl+X, dann Y, dann Enter)

### Option 3: WhatsApp Token direkt auf Server aktualisieren

Falls der Token auf dem Server fehlt oder falsch ist:

1. **SSH auf den Server**:
   ```bash
   ssh user@hetzner-server
   ```

2. **Führen Sie das Update-Script aus**:
   ```bash
   cd /path/to/backend
   npx ts-node scripts/update-whatsapp-settings.ts "EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD" "852832151250618"
   ```

## Häufige Probleme

### Problem 1: ENCRYPTION_KEY fehlt

**Symptom**: 
```
⚠️ ENCRYPTION_KEY nicht gesetzt - versuche Settings ohne Entschlüsselung zu laden
```

**Lösung**:
1. Prüfen Sie ob `.env` Datei existiert
2. Prüfen Sie ob `ENCRYPTION_KEY` in `.env` steht
3. Falls nicht, fügen Sie ihn hinzu (muss derselbe sein wie lokal, wenn DB synchronisiert)

### Problem 2: Token ist nicht der neue permanente Token

**Symptom**:
```
⚠️ Token scheint nicht der neue permanente Token zu sein
```

**Lösung**:
1. Führen Sie das Update-Script aus (siehe Option 3 oben)
2. Oder aktualisieren Sie über das Frontend (Organisation → API-Konfiguration)

### Problem 3: Phone Number ID fehlt

**Symptom**:
```
Phone Number ID: nicht gesetzt
```

**Lösung**:
1. Fügen Sie die Phone Number ID über das Frontend hinzu
2. Oder als 2. Argument beim Update-Script: `"TOKEN" "PHONE_NUMBER_ID"`

## Nächste Schritte

1. **Führen Sie das Prüf-Script auf dem Server aus**:
   ```bash
   cd /path/to/backend
   npx ts-node scripts/check-whatsapp-config.ts
   ```

2. **Prüfen Sie die Logs** beim Versenden einer WhatsApp-Nachricht

3. **Falls Probleme auftreten**, teilen Sie die Logs mit dem Entwicklungsteam

