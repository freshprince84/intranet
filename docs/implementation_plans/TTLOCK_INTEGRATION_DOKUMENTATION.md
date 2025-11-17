# TTLock Integration - Vollständige Dokumentation

**Datum**: 2025-01-20  
**Status**: ✅ Vollständig implementiert und getestet

## Übersicht

Die TTLock Integration ermöglicht die automatische Erstellung von Passcodes für Gäste bei Check-in. Das System verwendet **permanente Passcodes** (`keyboardPwdType: 2`), die ohne App-Synchronisation funktionieren.

**WICHTIG**: Für permanente Passcodes (`keyboardPwdType: 2`) muss der Passcode **6-9 Ziffern lang** sein. **9-stellige Passcodes funktionieren ohne App-Sync** (herausgefunden und getestet).

## Konfiguration

### Frontend (Organisation → API Tab → TTLock)

Alle Einstellungen können pro Organisation über das Frontend konfiguriert werden:

- **API URL**: TTLock API Endpunkt (Standard: `https://euopen.ttlock.com`)
- **Client ID**: TTLock Client ID (von TTLock erhalten)
- **Client Secret**: TTLock Client Secret (von TTLock erhalten)
- **Username**: TTLock App Username (z.B. `+573024498991` oder `3024498991`)
- **Password**: TTLock App Password (wird MD5-gehasht gespeichert)
- **Passcode-Typ**: 
  - `auto`: 9-stellige Passcodes (permanent, ohne Synchronisation)
  - `custom`: 9-stellige Passcodes (permanent, ohne Synchronisation)
  
**Hinweis**: Beide Typen generieren 9-stellige permanente Passcodes, die ohne App-Sync funktionieren.

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
- **Auto (9-stellig, permanent)**: 
  - Generiert: `Math.floor(100000000 + Math.random() * 900000000).toString()`
  - `keyboardPwdType: 2` (permanent, keine Start/Endzeit)
  - Funktioniert ohne Gateway/Synchronisation
  - Wird direkt über die API aktiviert
  
- **Custom (9-stellig, permanent)**:
  - Generiert: `Math.floor(100000000 + Math.random() * 900000000).toString()`
  - `keyboardPwdType: 2` (permanent, keine Start/Endzeit)
  - Funktioniert ohne Gateway/Synchronisation
  - Wird direkt über die API aktiviert

**WICHTIG**: 
- Permanente Passcodes (`keyboardPwdType: 2`) müssen **6-9 Ziffern lang** sein
- **9-stellige Passcodes funktionieren ohne App-Sync** (herausgefunden und getestet)
- `addType: 2` (Gateway) wird zuerst versucht, Fallback auf `addType: 1` (Bluetooth) wenn Gateway nicht verfügbar

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

### Permanente Passcodes (keyboardPwdType: 2)

- **9-stellige Passcodes** funktionieren ohne App-Synchronisation
- **Keine Start/Endzeit** erforderlich (permanent)
- **addType: 2** (Gateway) wird zuerst versucht, Fallback auf **addType: 1** (Bluetooth) wenn Gateway nicht verfügbar
- **Passcode-Länge**: Muss 6-9 Ziffern lang sein (9-stellig funktioniert ohne Sync)

### Ohne Gateway

- **9-stellige permanente Passcodes** funktionieren ohne Synchronisation
- Fallback auf `addType: 1` (Bluetooth) wenn Gateway nicht verfügbar, dann ist App-Sync erforderlich

### Mit Gateway

- **9-stellige permanente Passcodes** funktionieren direkt ohne Synchronisation
- Gateway ermöglicht direkte Aktivierung über WiFi (`addType: 2`)

### Passcode-Typ Auswahl

- **Beide Typen** (`auto` und `custom`) generieren **9-stellige permanente Passcodes**
- **Empfohlen**: Beide funktionieren ohne App-Sync (9-stellig)

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

1. **9-stelliger permanenter Passcode**: Sollte direkt funktionieren (ohne App-Sync)
2. **Falls Gateway nicht verfügbar**: 
   - System versucht automatisch `addType: 1` (Bluetooth)
   - Dann ist App-Sync erforderlich: TTLock App öffnen → Lock auswählen → Passcodes synchronisieren
   - Prüfen ob Passcode in der App sichtbar ist
3. **Passcode-Länge prüfen**: Muss 6-9 Ziffern lang sein (9-stellig funktioniert ohne Sync)

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
- ✅ Permanente Passcodes (`keyboardPwdType: 2`) implementiert
- ✅ 9-stellige Passcodes für permanente Codes (funktionieren ohne App-Sync)
- ✅ Gateway-Fallback: `addType: 2` zuerst, dann `addType: 1` wenn Gateway nicht verfügbar
- ✅ Passcode-Länge: 6-9 Ziffern für permanente Codes (9-stellig funktioniert ohne Sync)
- ✅ Dokumentation aktualisiert

### 2025-01-20
- ✅ Passcode-Typ konfigurierbar pro Organisation
- ✅ Frontend: Username/Password Felder hinzugefügt
- ✅ Frontend: Passcode-Typ Auswahl hinzugefügt
- ✅ Backend: MD5-Hashing für Password im Controller
- ✅ Backend: Passcode-Typ aus Settings lesen
- ✅ Dokumentation vollständig


