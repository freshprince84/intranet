# TTLock Integration - Vollständige Dokumentation

**Datum**: 2025-01-20  
**Status**: ✅ Vollständig implementiert und getestet

## Übersicht

Die TTLock Integration ermöglicht die automatische Erstellung von Passcodes für Gäste bei Check-in. Das System unterstützt zwei Passcode-Typen:

1. **Automatisch (10-stellig)**: Funktioniert ohne Gateway/Synchronisation
2. **Benutzerdefiniert (4-stellig)**: Erfordert Bluetooth-Synchronisation über TTLock App

## Konfiguration

### Frontend (Organisation → API Tab → TTLock)

Alle Einstellungen können pro Organisation über das Frontend konfiguriert werden:

- **API URL**: TTLock API Endpunkt (Standard: `https://euopen.ttlock.com`)
- **Client ID**: TTLock Client ID (von TTLock erhalten)
- **Client Secret**: TTLock Client Secret (von TTLock erhalten)
- **Username**: TTLock App Username (z.B. `+573024498991` oder `3024498991`)
- **Password**: TTLock App Password (wird MD5-gehasht gespeichert)
- **Passcode-Typ**: 
  - `auto`: 10-stellige Passcodes (ohne Synchronisation)
  - `custom`: 4-stellige Passcodes (erfordert Synchronisation)

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
- **Auto (10-stellig)**: 
  - Generiert: `Math.floor(1000000000 + Math.random() * 9000000000).toString()`
  - Funktioniert ohne Gateway/Synchronisation
  - Wird direkt über die API aktiviert
  
- **Custom (4-stellig)**:
  - Generiert: `Math.floor(1000 + Math.random() * 9000).toString()`
  - Erfordert Bluetooth-Synchronisation über TTLock App
  - Passcode wird in der API erstellt, aber erst nach Synchronisation aktiv

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

### Ohne Gateway

- **10-stellige Passcodes** funktionieren ohne Synchronisation
- **4-stellige Passcodes** erfordern Bluetooth-Synchronisation über TTLock App
- Synchronisation erfolgt manuell: TTLock App öffnen → Lock auswählen → Passcodes synchronisieren

### Mit Gateway

- Alle Passcode-Typen funktionieren ohne Synchronisation
- Gateway ermöglicht direkte Aktivierung über WiFi

### Passcode-Typ Auswahl

- **Empfohlen**: `auto` (10-stellig) für Produktion ohne Gateway
- **Nur wenn nötig**: `custom` (4-stellig) wenn kürzere Codes gewünscht sind (erfordert Synchronisation)

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

1. **10-stelliger Passcode**: Sollte direkt funktionieren
2. **4-stelliger Passcode**: 
   - TTLock App öffnen
   - Lock auswählen
   - Passcodes synchronisieren
   - Prüfen ob Passcode in der App sichtbar ist

### Authentifizierungsfehler

- Prüfe ob Username/Password korrekt sind
- Prüfe ob Password MD5-gehasht ist (32 hex characters)
- Prüfe ob Client ID/Secret korrekt sind

### API-Fehler

- Prüfe ob `apiUrl` korrekt ist (`https://euopen.ttlock.com`)
- Prüfe ob `date` Parameter in Millisekunden ist (nicht Sekunden)
- Prüfe ob Lock ID korrekt ist

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

### 2025-01-20
- ✅ Passcode-Typ konfigurierbar pro Organisation
- ✅ Frontend: Username/Password Felder hinzugefügt
- ✅ Frontend: Passcode-Typ Auswahl hinzugefügt
- ✅ Backend: MD5-Hashing für Password im Controller
- ✅ Backend: Passcode-Typ aus Settings lesen
- ✅ Dokumentation vollständig

