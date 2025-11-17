# TTLock Integration - Vollständige Dokumentation

**Datum**: 2025-01-20  
**Status**: ✅ Vollständig implementiert und getestet

## Übersicht

Die TTLock Integration ermöglicht die automatische Erstellung von Passcodes für Gäste bei Check-in. Das System verwendet **period Passcodes** (`keyboardPwdType: 3`), die ohne App-Synchronisation funktionieren.

**WICHTIG**: **10-stellige period Passcodes** (`keyboardPwdType: 3`) funktionieren ohne App-Sync (getestet und dokumentiert). Diese Lösung wurde am 2025-11-17 wiederhergestellt.

## Konfiguration

### Frontend (Organisation → API Tab → TTLock)

Alle Einstellungen können pro Organisation über das Frontend konfiguriert werden:

- **API URL**: TTLock API Endpunkt (Standard: `https://euopen.ttlock.com`)
- **Client ID**: TTLock Client ID (von TTLock erhalten)
- **Client Secret**: TTLock Client Secret (von TTLock erhalten)
- **Username**: TTLock App Username (z.B. `+573024498991` oder `3024498991`)
- **Password**: TTLock App Password (wird MD5-gehasht gespeichert)
- **Passcode-Typ**: 
  - `auto`: 10-stellige Passcodes (period, ohne Synchronisation)
  - `custom`: 4-stellige Passcodes (erfordert Synchronisation)
  
**Hinweis**: `auto` generiert 10-stellige period Passcodes, die ohne App-Sync funktionieren.

### Backend (Settings Schema)

```typescript
doorSystem?: {
  provider?: 'ttlock';
  apiUrl?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string; // MD5-hashed password
  accessToken?: string;
  lockIds?: string[];
  passcodeType?: 'auto' | 'custom';
}
```

## Technische Details

### Passcode-Erstellung

**Datei**: `backend/src/services/ttlockService.ts`

```typescript
async createTemporaryPasscode(
  lockId: string,
  startDate: Date,
  endDate: Date,
  passcodeName?: string
): Promise<string>
```

**Passcode-Typen**:
- **Auto (10-stellig, period)**: 
  - Generiert: `Math.floor(1000000000 + Math.random() * 9000000000).toString()`
  - `keyboardPwdType: 3` (period/temporär, mit Start/Endzeit)
  - Funktioniert ohne Gateway/Synchronisation
  - Wird direkt über die API aktiviert
  
- **Custom (4-stellig, period)**:
  - Generiert: `Math.floor(1000 + Math.random() * 9000).toString()`
  - `keyboardPwdType: 3` (period/temporär, mit Start/Endzeit)
  - Erfordert Bluetooth-Synchronisation über TTLock App
  - Passcode wird in der API erstellt, aber erst nach Synchronisation aktiv

**WICHTIG**: 
- **10-stellige period Passcodes** (`keyboardPwdType: 3`) funktionieren ohne App-Sync (getestet und dokumentiert)
- `startDate` und `endDate` werden gesetzt (Millisekunden)
- `addType: 1` (via phone bluetooth) wird verwendet
- **KEINE Codes werden gelöscht** beim Erstellen eines neuen Codes - nur neuer Code wird hinzugefügt

### Authentifizierung

**OAuth 2.0** mit Resource Owner Password Credentials:
- Endpunkt: `/oauth2/token`
- Grant Type: `password`
- Parameter:
  - `client_id`: TTLock Client ID
  - `client_secret`: TTLock Client Secret
  - `username`: TTLock App Username
  - `password`: MD5-Hash des TTLock App Passwords
  - `grant_type`: `password`

### API-Endpunkte

- **Base URL**: `https://euapi.ttlock.com` (wenn `apiUrl` `euopen.ttlock.com` enthält)
- **OAuth**: `/oauth2/token`
- **Locks abrufen**: `/v3/lock/list`
- **Passcode erstellen**: `/v3/keyboardPwd/add`
- **Passcode löschen**: `/v3/keyboardPwd/delete`

### Verschlüsselung

- **Client Secret**: Wird mit AES-256-GCM verschlüsselt (via `encryptApiSettings`)
- **Password**: Wird MD5-gehasht (32 hex characters) und dann verschlüsselt
- **ENCRYPTION_KEY**: Muss in `.env` gesetzt sein (64 hex characters = 32 bytes)

## Verwendung

### Automatisch (über ReservationNotificationService)

Bei Check-in wird automatisch:
1. Ein Passcode erstellt (basierend auf `passcodeType` Setting)
2. Der Passcode in der Reservierung gespeichert (`doorPin`, `ttlLockPassword`)
3. Eine WhatsApp-Nachricht mit dem Passcode versendet (falls konfiguriert)

**Datei**: `backend/src/services/reservationNotificationService.ts`

### Manuell (über API)

```typescript
const ttlockService = new TTLockService(organizationId);
const passcode = await ttlockService.createTemporaryPasscode(
  lockId,
  startDate,
  endDate,
  'Guest Name'
);
```

## Wichtige Hinweise

### Period Passcodes (keyboardPwdType: 3)

- **10-stellige Passcodes** funktionieren ohne App-Synchronisation
- **Start/Endzeit** wird gesetzt (Check-in bis Check-out)
- **addType: 1** (via phone bluetooth) wird verwendet
- **Passcode-Länge**: 10-stellig für `auto`, 4-stellig für `custom`

### Ohne Gateway

- **10-stellige period Passcodes** funktionieren ohne Synchronisation
- `addType: 1` wird verwendet, funktioniert ohne App-Sync

### Mit Gateway

- **10-stellige period Passcodes** funktionieren direkt ohne Synchronisation
- Gateway ermöglicht direkte Aktivierung über WiFi

### Passcode-Typ Auswahl

- **Auto**: Generiert **10-stellige period Passcodes** - funktioniert ohne App-Sync
- **Custom**: Generiert **4-stellige period Passcodes** - erfordert App-Sync

## Deployment (Hetzner Server)

### Voraussetzungen

1. **ENCRYPTION_KEY** muss in `.env` gesetzt sein:
   ```bash
   ENCRYPTION_KEY=<64 hex characters>
   ```

2. **TTLock Credentials** müssen über Frontend konfiguriert werden:
   - Client ID
   - Client Secret
   - Username
   - Password
   - Passcode-Typ

### Prüfung

```bash
# Prüfe ob ENCRYPTION_KEY gesetzt ist
echo $ENCRYPTION_KEY

# Prüfe ob TTLock Service funktioniert
# (über API-Endpunkt testen)
```

## Fehlerbehebung

### Passcode funktioniert nicht

1. **10-stelliger period Passcode**: Sollte direkt funktionieren (ohne App-Sync)
2. **Falls Passcode nicht funktioniert**: 
   - Prüfe ob `keyboardPwdType: 3` (period) verwendet wird
   - Prüfe ob `startDate` und `endDate` gesetzt sind
   - Prüfe ob Passcode 10-stellig ist (für `auto`)
3. **Passcode-Länge prüfen**: Muss **10-stellig** sein für `auto` (funktioniert ohne Sync)

### Authentifizierungsfehler

- Prüfe ob Username/Password korrekt sind
- Prüfe ob Password MD5-gehasht ist (32 hex characters)
- Prüfe ob Client ID/Secret korrekt sind
- **WICHTIG**: Client Secret muss aus dem TTLock Developer Portal kopiert werden (nicht aus dem Frontend!)
- **WICHTIG**: Client Secret wird in der DB verschlüsselt gespeichert, aber beim Lesen automatisch entschlüsselt

### API-Fehler

- Prüfe ob `apiUrl` korrekt ist (`https://euopen.ttlock.com`)
- Prüfe ob `date` Parameter in Millisekunden ist (nicht Sekunden)
- Prüfe ob Lock ID korrekt ist

### Button "PIN generieren & Mitteilung versenden" gibt Fehler

**Häufige Ursachen:**

1. **TTLock-Authentifizierung fehlgeschlagen**:
   - Client ID/Secret falsch → Prüfe TTLock Developer Portal
   - Username/Password falsch → Prüfe MD5-Hash des Passwords
   - Lock IDs nicht gesetzt → Lock IDs müssen in Settings gespeichert sein

2. **WhatsApp-Fehler stoppt Prozess** (BEHOBEN):
   - Seit 2025-11-17: WhatsApp-Fehler stoppen den Prozess nicht mehr
   - PIN wird generiert, auch wenn WhatsApp-Nachricht fehlschlägt
   - Fehler wird geloggt, aber Prozess läuft weiter

3. **E-Mail-Fehler stoppt Prozess** (BEHOBEN):
   - Seit 2025-11-17: E-Mail-Fehler stoppen den Prozess nicht mehr
   - PIN wird generiert, auch wenn E-Mail fehlschlägt

**Lösung:**
- TTLock-Credentials im Frontend prüfen (Organisation → API Tab → TTLock)
- Bei Problemen: Script `update-ttlock-correct-credentials.ts` ausführen
- Lock IDs automatisch abrufen: Script `save-ttlock-lock-id.ts` ausführen

## Dateien

### Backend
- `backend/src/services/ttlockService.ts` - Hauptservice
- `backend/src/controllers/ttlockController.ts` - API Controller
- `backend/src/routes/ttlock.ts` - API Routen
- `backend/src/validation/organizationSettingsSchema.ts` - Schema Validierung
- `backend/src/controllers/organizationController.ts` - Settings Update (MD5-Hashing)

### Frontend
- `frontend/src/components/organization/ApiConfigurationTab.tsx` - Konfigurations-UI
- `frontend/src/types/organization.ts` - TypeScript Types
- `frontend/src/i18n/locales/*.json` - Übersetzungen (DE, EN, ES)

## Changelog

### 2025-11-17
- ✅ **Zurück zur funktionierenden Lösung**: Period Passcodes (`keyboardPwdType: 3`) mit 10-stelliger Länge
- ✅ **10-stellige period Passcodes** funktionieren ohne App-Sync (getestet und dokumentiert)
- ✅ `startDate` und `endDate` werden wieder gesetzt
- ✅ `addType: 1` (via phone bluetooth) wird verwendet
- ✅ **KEINE Codes werden gelöscht** beim Erstellen eines neuen Codes
- ✅ Dokumentation aktualisiert zur ursprünglichen funktionierenden Lösung

### 2025-01-20
- ✅ Passcode-Typ konfigurierbar pro Organisation
- ✅ Frontend: Username/Password Felder hinzugefügt
- ✅ Frontend: Passcode-Typ Auswahl hinzugefügt
- ✅ Backend: MD5-Hashing für Password im Controller
- ✅ Backend: Passcode-Typ aus Settings lesen
- ✅ Dokumentation vollständig


