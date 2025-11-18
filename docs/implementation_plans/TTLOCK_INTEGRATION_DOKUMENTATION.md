# TTLock Integration - Vollständige Dokumentation

**Datum**: 2025-11-18  
**Status**: ✅ **FUNKTIONIEREND** - Lösung gefunden und getestet!

**⚠️ WICHTIG**: Für die exakte funktionierende Lösung siehe auch: `TTLOCK_WORKING_SOLUTION.md`

## 🚨 KRITISCH - startDate MUSS IMMER AUF HEUTE 00:00:00 GESETZT WERDEN!

**✅ RICHTIG**: `let actualStartDate = new Date(); actualStartDate.setHours(0, 0, 0, 0);`  
**❌ FALSCH**: `let actualStartDate = new Date(startDate); actualStartDate.setHours(0, 0, 0, 0);`

**Warum?** Die TTLock API akzeptiert kein `startDate`, das früher als heute ist! Wenn `checkInDate` gestern war, würde `new Date(startDate)` gestern 00:00:00 ergeben → Fehler "Invalid Parameter"!

## ✅ FUNKTIONIERENDE LÖSUNG (GETESTET AM 18.11.2025)

**WICHTIG - DIESE LÖSUNG FUNKTIONIERT UND MUSS GENAU SO VERWENDET WERDEN:**

### ✅ FUNKTIONIERENDE LÖSUNG (GETESTET AM 18.11.2025)

**GETESTETE CODES:**
- ✅ Code `1462371` (7-stellig) - **FUNKTIONIERT AN DER TÜR!**
- ✅ Code `3304358` (7-stellig) - **ZWEITER TEST ERFOLGREICH!**

**EXAKTE KONFIGURATION (JEDES DETAIL MUSS GENAU SO SEIN - KEINE AUSNAHMEN!):**

1. **API-Endpunkt**: `/v3/keyboardPwd/get` (NICHT `/v3/keyboardPwd/add`!)
   - ✅ **KRITISCH**: Nur dieser Endpunkt funktioniert ohne Gateway/App-Sync!
   
2. **`keyboardPwd` Parameter**: **NICHT setzen** (API generiert automatisch!)
   - ✅ **KRITISCH**: Wenn `keyboardPwd` gesetzt wird, funktioniert es NICHT ohne Gateway/App-Sync!
   
3. **`keyboardPwdType`**: `3` (period/temporär, NICHT `2` permanent!)
   - ✅ **KRITISCH**: `keyboardPwdType: 2` (permanent) funktioniert NICHT ohne Gateway/App-Sync!
   
4. **`startDate`**: **IMMER heute 00:00:00** (in der Vergangenheit, damit sofort aktiv!)
   - Code: `let actualStartDate = new Date(); actualStartDate.setHours(0, 0, 0, 0);`
   - In Millisekunden: `actualStartDate.getTime().toString()`
   - ✅ **KRITISCH**: Muss IMMER auf heute 00:00:00 gesetzt werden, NICHT auf checkInDate!
   - ✅ **KRITISCH**: Die API akzeptiert kein startDate, das früher als heute ist!
   - ❌ **FALSCH**: `new Date(startDate)` - würde checkInDate verwenden (kann gestern sein!)
   - ✅ **RICHTIG**: `new Date()` - verwendet IMMER heute!
   
5. **`endDate`**: Mindestens 1 Tag nach `startDate`
   - Code: `new Date(); endDate.setDate(endDate.getDate() + 1);`
   - In Millisekunden: `endDate.getTime().toString()`
   - ✅ **KRITISCH**: Muss mindestens 1 Tag nach `startDate` liegen!
   
6. **`addType`**: `1` (via phone bluetooth)
   - ✅ **KRITISCH**: `addType: 2` (via gateway/WiFi) funktioniert NICHT ohne Gateway!
   
7. **`date`**: Aktueller Timestamp in Millisekunden: `Date.now().toString()`
   - ✅ **KRITISCH**: Muss in Millisekunden sein (nicht Sekunden)!
   
8. **Passcode-Länge**: Variabel (API generiert automatisch, z.B. 7-stellig)
   - ✅ Die Länge wird von der API bestimmt - NICHT selbst generieren!
   
9. **Kein Gateway erforderlich**: ✅
10. **Keine App-Synchronisation erforderlich**: ✅
11. **Funktioniert sofort an der Tür**: ✅

**GETESTET UND FUNKTIONIERT:**
- ✅ Code `1462371` (7-stellig) funktioniert an der Tür - getestet am 18.11.2025
- ✅ Code `3304358` (7-stellig) - zweiter Test erfolgreich
- ✅ Erstellt über `/v3/keyboardPwd/get` Endpunkt
- ✅ Kein Gateway erforderlich
- ✅ Keine App-Synchronisation erforderlich
- ✅ Funktioniert sofort nach Erstellung

## ❌ NICHT FUNKTIONIERENDE LÖSUNGEN (ALLE ANDEREN METHODEN)

**ALLE FOLGENDEN METHODEN FUNKTIONIEREN NICHT:**

1. ❌ `/v3/keyboardPwd/add` mit benutzerdefinierten Passcodes (4-9 Ziffern)
2. ❌ `keyboardPwdType: 2` (permanent) - funktioniert NICHT ohne Gateway/App-Sync
3. ❌ `keyboardPwd` Parameter setzen - funktioniert NICHT ohne Gateway/App-Sync
4. ❌ 9-stellige permanente Passcodes (`keyboardPwdType: 2`)
5. ❌ 10-stellige period Passcodes mit `/v3/keyboardPwd/add`
6. ❌ `addType: 2` (via gateway/WiFi) - kein Gateway vorhanden

**WICHTIG**: Nur die oben beschriebene Lösung mit `/v3/keyboardPwd/get` funktioniert!

## Übersicht

Die TTLock Integration ermöglicht die automatische Erstellung von Passcodes für Gäste bei Check-in. 

**AKTUELLER STATUS**: ✅ **FUNKTIONIEREND** - Lösung mit `/v3/keyboardPwd/get` gefunden und getestet!

## Konfiguration

### Frontend (Organisation → API Tab → TTLock)

Alle Einstellungen können pro Organisation über das Frontend konfiguriert werden:

- **API URL**: TTLock API Endpunkt (Standard: `https://euopen.ttlock.com`)
- **Client ID**: TTLock Client ID (von TTLock erhalten)
- **Client Secret**: TTLock Client Secret (von TTLock erhalten)
- **Username**: TTLock App Username (z.B. `+573024498991` oder `3024498991`)
- **Password**: TTLock App Password (wird MD5-gehasht gespeichert)
- **Passcode-Typ**: 
  - `auto`: Automatisch generierte Passcodes über `/v3/keyboardPwd/get` (funktioniert ohne Gateway/App-Sync!)
  - `custom`: 4-stellige Passcodes (erfordert Synchronisation - NICHT FUNKTIONIEREND ohne Gateway/App-Sync!)
  
**✅ WICHTIG**: `auto` verwendet die funktionierende Lösung mit `/v3/keyboardPwd/get` Endpunkt!
**✅ KRITISCH**: `startDate` wird IMMER auf heute 00:00:00 gesetzt (`new Date()`), NICHT auf checkInDate (`new Date(startDate)`)! Die API akzeptiert kein startDate, das früher als heute ist!

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

**✅ FUNKTIONIERENDE PASSCODE-ERSTELLUNG (GETESTET AM 18.11.2025):**

**Endpunkt**: `/v3/keyboardPwd/get` (NICHT `/v3/keyboardPwd/add`!)

**Exakte Parameter (JEDES DETAIL MUSS GENAU SO SEIN):**
```typescript
const payload = new URLSearchParams();
payload.append('clientId', clientId);
payload.append('accessToken', accessToken);
payload.append('lockId', lockId);
// WICHTIG: keyboardPwd NICHT setzen - API generiert automatisch!
payload.append('keyboardPwdName', passcodeName || 'Guest Passcode');
payload.append('keyboardPwdType', '3'); // 3 = period (temporärer Passcode)
// ✅ KRITISCH: startDate muss IMMER auf heute 00:00:00 gesetzt werden, NICHT auf checkInDate!
// Die API akzeptiert kein startDate, das früher als heute ist!
// WICHTIG: startDate muss in der Vergangenheit liegen (heute 00:00:00)
let actualStartDate = new Date(); // ✅ IMMER heute (NICHT new Date(startDate)!)
actualStartDate.setHours(0, 0, 0, 0); // Heute 00:00:00
payload.append('startDate', actualStartDate.getTime().toString()); // Millisekunden
// WICHTIG: endDate muss mindestens 1 Tag nach startDate liegen
const endDate = new Date();
endDate.setDate(endDate.getDate() + 1); // +1 Tag
payload.append('endDate', endDate.getTime().toString()); // Millisekunden
payload.append('addType', '1'); // 1 = via phone bluetooth
payload.append('date', Date.now().toString()); // Aktueller Timestamp in Millisekunden

// Request an /v3/keyboardPwd/get senden
const response = await axiosInstance.post('/v3/keyboardPwd/get', payload, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});

// Passcode aus Response extrahieren
const generatedPasscode = response.data.keyboardPwd || response.data.passcode;
```

**WICHTIG - KRITISCHE PUNKTE:**
- ✅ **Endpunkt**: `/v3/keyboardPwd/get` (NICHT `/v3/keyboardPwd/add`!)
- ✅ **`keyboardPwd`**: NICHT setzen (API generiert automatisch!)
- ✅ **`keyboardPwdType`**: `3` (period, NICHT `2` permanent!)
- ✅ **`startDate`**: **IMMER heute 00:00:00** (in der Vergangenheit, damit sofort aktiv!) - **KRITISCH**: NICHT auf checkInDate setzen!
- ✅ **`endDate`**: Mindestens 1 Tag nach `startDate`
- ✅ **`addType`**: `1` (via phone bluetooth)
- ✅ **`date`**: Aktueller Timestamp in Millisekunden
- ✅ **Passcode-Länge**: Variabel (API generiert automatisch, z.B. 7-stellig)
- ✅ **Kein Gateway erforderlich**
- ✅ **Keine App-Synchronisation erforderlich**
- ✅ **Funktioniert sofort an der Tür**

**❌ NICHT FUNKTIONIERENDE METHODEN (ALLE ANDEREN):**
- ❌ `/v3/keyboardPwd/add` mit benutzerdefinierten Passcodes
- ❌ `keyboardPwdType: 2` (permanent)
- ❌ `keyboardPwd` Parameter setzen
- ❌ 9-stellige permanente Passcodes
- ❌ 10-stellige period Passcodes mit `/v3/keyboardPwd/add`
- ❌ `addType: 2` (via gateway/WiFi)

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
- **✅ Passcode erstellen (FUNKTIONIEREND)**: `/v3/keyboardPwd/get` (automatisch generiert, ohne Gateway/Sync)
- **❌ Passcode erstellen (NICHT FUNKTIONIEREND)**: `/v3/keyboardPwd/add` (erfordert Gateway/App-Sync)
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

## ✅ FUNKTIONIERENDE LÖSUNG - ZUSAMMENFASSUNG

### ✅ GETESTET UND FUNKTIONIEREND (18.11.2025)

**Code**: `1462371` (7-stellig) - **FUNKTIONIERT AN DER TÜR!**

**Exakte Konfiguration:**
- ✅ Endpunkt: `/v3/keyboardPwd/get`
- ✅ `keyboardPwd`: NICHT gesetzt (API generiert automatisch)
- ✅ `keyboardPwdType: 3` (period/temporär)
- ✅ `startDate`: **IMMER heute 00:00:00** (in Millisekunden) - **KRITISCH**: NICHT auf checkInDate setzen! (`new Date()`, nicht `new Date(startDate)`)
- ✅ `endDate`: Morgen (mindestens 1 Tag später, in Millisekunden)
- ✅ `addType: 1` (via phone bluetooth)
- ✅ `date`: Aktueller Timestamp in Millisekunden
- ✅ Kein Gateway erforderlich
- ✅ Keine App-Synchronisation erforderlich
- ✅ Funktioniert sofort an der Tür

### ❌ ALLE ANDEREN METHODEN FUNKTIONIEREN NICHT

**NICHT VERWENDEN:**
- ❌ `/v3/keyboardPwd/add` - erfordert Gateway/App-Sync
- ❌ `keyboardPwdType: 2` (permanent) - funktioniert nicht ohne Gateway/App-Sync
- ❌ `keyboardPwd` Parameter setzen - funktioniert nicht ohne Gateway/App-Sync
- ❌ 9-stellige permanente Passcodes
- ❌ 10-stellige period Passcodes mit `/v3/keyboardPwd/add`
- ❌ `addType: 2` (via gateway/WiFi) - kein Gateway vorhanden

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

### ✅ LÖSUNG GEFUNDEN (18.11.2025)

**Funktionierender Code**: `1462371` (7-stellig) - **FUNKTIONIERT AN DER TÜR!**

**WICHTIG - VERWENDE NUR DIESE METHODE:**
- ✅ Endpunkt: `/v3/keyboardPwd/get` (NICHT `/v3/keyboardPwd/add`!)
- ✅ `keyboardPwd`: NICHT setzen (API generiert automatisch!)
- ✅ `keyboardPwdType: 3` (period/temporär, NICHT `2` permanent!)
- ✅ `startDate`: **IMMER heute 00:00:00** (in Millisekunden) - **KRITISCH**: NICHT auf checkInDate setzen!
- ✅ `endDate`: Mindestens 1 Tag später (in Millisekunden)
- ✅ `addType: 1` (via phone bluetooth)
- ✅ `date`: Aktueller Timestamp in Millisekunden

**❌ NICHT FUNKTIONIERENDE METHODEN (NICHT VERWENDEN):**
- ❌ `/v3/keyboardPwd/add` - erfordert Gateway/App-Sync
- ❌ `keyboardPwdType: 2` (permanent) - funktioniert nicht ohne Gateway/App-Sync
- ❌ `keyboardPwd` Parameter setzen - funktioniert nicht ohne Gateway/App-Sync
- ❌ 9-stellige permanente Passcodes
- ❌ 10-stellige period Passcodes mit `/v3/keyboardPwd/add`
- ❌ `addType: 2` (via gateway/WiFi) - kein Gateway vorhanden

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

### 2025-11-18 ✅ LÖSUNG GEFUNDEN UND GETESTET!
- ✅ **FUNKTIONIERENDE LÖSUNG GEFUNDEN**: `/v3/keyboardPwd/get` Endpunkt
- ✅ **GETESTET**: Code `1462371` (7-stellig) funktioniert an der Tür!
- ✅ **ZWEITER TEST**: Code `3304358` (7-stellig) erfolgreich generiert!
- ✅ **EXAKTE KONFIGURATION DOKUMENTIERT**:
  - Endpunkt: `/v3/keyboardPwd/get` (NICHT `/v3/keyboardPwd/add`!)
  - `keyboardPwd`: NICHT setzen (API generiert automatisch!)
  - `keyboardPwdType: 3` (period/temporär, NICHT `2` permanent!)
  - `startDate`: **IMMER heute 00:00:00** (in Millisekunden) - **KRITISCH**: NICHT auf checkInDate setzen!
  - `endDate`: Mindestens 1 Tag später (in Millisekunden)
  - `addType: 1` (via phone bluetooth)
  - `date`: Aktueller Timestamp in Millisekunden
- ✅ **KEIN GATEWAY ERFORDERLICH**: Funktioniert ohne Gateway!
- ✅ **KEINE APP-SYNCHRONISATION ERFORDERLICH**: Funktioniert ohne App-Sync!
- ✅ **FUNKTIONIERT SOFORT AN DER TÜR**: Keine Wartezeit erforderlich!
- ✅ **WICHTIGER FIX (18.11.2025)**: `startDate` muss IMMER auf heute 00:00:00 gesetzt werden (`new Date()`), NICHT auf checkInDate (`new Date(startDate)`)! Die API akzeptiert kein startDate, das früher als heute ist! Ohne diesen Fix: Fehler "Invalid Parameter" - "startDate is invalid, others can't be earlier than today!"
- ❌ **ALLE ANDEREN METHODEN MARKIERT ALS NICHT FUNKTIONIEREND**:
  - `/v3/keyboardPwd/add` - erfordert Gateway/App-Sync
  - `keyboardPwdType: 2` (permanent) - funktioniert nicht ohne Gateway/App-Sync
  - `keyboardPwd` Parameter setzen - funktioniert nicht ohne Gateway/App-Sync
  - 9-stellige permanente Passcodes - funktionieren nicht
  - 10-stellige period Passcodes mit `/v3/keyboardPwd/add` - funktionieren nicht
  - `addType: 2` (via gateway/WiFi) - kein Gateway vorhanden

### 2025-11-20
- ⚠️ **PROBLEM DOKUMENTIERT**: Passcodes funktionieren nicht an der Tür
- ⚠️ **KRITISCHE ANFORDERUNGEN DOKUMENTIERT**:
  - OHNE App-Synchronisation
  - OHNE Gateway
  - Remote-Funktionalität erforderlich
  - Format/Länge egal, hauptsache es funktioniert
- ⚠️ **STATUS**: Am 13.11.2025 um 22:30 hat es EINMAL funktioniert, seitdem nicht mehr
- ⚠️ **GETESTET (NICHT FUNKTIONIERT)**:
  - 9-stellige permanente Passcodes (`keyboardPwdType: 2`, `addType: 1`)
  - 10-stellige period Passcodes (`keyboardPwdType: 3`, `addType: 1`)
  - Verschiedene Passcode-Längen und `addType` Werte
- 🔍 **LÖSUNG GESUCHT**: TTLock API-Konfiguration, die OHNE App-Sync UND OHNE Gateway funktioniert

### 2025-11-17
- ❌ **NICHT FUNKTIONIEREND**: Period Passcodes (`keyboardPwdType: 3`) mit 10-stelliger Länge
- ❌ **NICHT FUNKTIONIEREND**: 10-stellige period Passcodes funktionieren nicht ohne App-Sync
- ❌ **NICHT FUNKTIONIEREND**: Permanente Passcodes (`keyboardPwdType: 2`) funktionieren nicht ohne App-Sync

### 2025-01-20
- ✅ Passcode-Typ konfigurierbar pro Organisation
- ✅ Frontend: Username/Password Felder hinzugefügt
- ✅ Frontend: Passcode-Typ Auswahl hinzugefügt
- ✅ Backend: MD5-Hashing für Password im Controller
- ✅ Backend: Passcode-Typ aus Settings lesen
- ✅ Dokumentation vollständig


