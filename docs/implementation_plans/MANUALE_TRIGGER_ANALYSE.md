# Analyse: Manuelle Trigger für Email/WhatsApp-Versendung

**Datum**: 2025-01-XX  
**Status**: 📋 Analyse (noch nichts ändern)

## Zusammenfassung

Es gibt **6 manuelle Trigger** im Backend, die Email/WhatsApp mit Zahlungslink, Check-in-Link oder TTLock-Passcode versenden:

1. **`PUT /api/reservations/:id/guest-contact`** → `updateGuestContact` - WhatsApp mit Payment-Link + Check-in-Link + TTLock-Passcode
2. **`POST /api/reservations`** → `createReservation` - Ruft `sendReservationInvitation` auf (wenn autoSend aktiviert)
3. **`POST /api/reservations/:id/send-invitation`** → `sendReservationInvitation` - Payment-Link + Check-in-Link
4. **`POST /api/reservations/:id/generate-pin-and-send`** → `generatePinAndSendNotification` - TTLock-Passcode
5. **`POST /api/reservations/:id/send-passcode`** → `sendPasscodeNotification` - TTLock-Passcode (mit anpassbaren Kontaktdaten)
6. **`PUT /api/lobby-pms/reservations/:id/check-in`** → `checkInReservation` → `sendCheckInConfirmation` - TTLock-Passcode nach Check-in

---

## 1. sendReservationInvitation

**Controller**: `POST /api/reservations/:id/send-invitation`  
**Service**: `ReservationNotificationService.sendReservationInvitation()`  
**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 489-1121)

### Was wird versendet:
- ✅ **Payment-Link** (Bold Payment)
- ✅ **Check-in-Link** (LobbyPMS oder Fallback)

### Versendung:

#### WhatsApp:
- **Zeile 615**: `if (guestPhone && paymentLink)`
- ❌ **Prüft NICHT `notificationChannels`**
- ✅ Versendet immer wenn `guestPhone` vorhanden
- ✅ Verwendet `sendMessageWithFallback()` (Session Message oder Template)
- ✅ Sprache-Erkennung (EN/ES/DE) basierend auf `guestNationality` und `guestPhone`
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

#### Email:
- **Zeile 815**: `if (guestEmail && checkInLink && paymentLink)`
- ❌ **Prüft NICHT `notificationChannels`**
- ✅ Versendet immer wenn `guestEmail` vorhanden
- ✅ Sprache-Erkennung (EN/ES/DE) basierend auf `guestNationality` und `guestPhone`
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

### Aktuelles Verhalten:
- Versendet **beides** wenn beide Kontaktdaten vorhanden (unabhängig von `notificationChannels`)
- **Problem**: Ignoriert `notificationChannels` komplett

---

## 2. generatePinAndSendNotification

**Controller**: `POST /api/reservations/:id/generate-pin-and-send`  
**Service**: `ReservationNotificationService.generatePinAndSendNotification()`  
**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 1128-1499)

### Was wird versendet:
- ✅ **TTLock-Passcode**

### Versendung:

#### Email:
- **Zeile 1250**: `if (notificationChannels.includes('email') && reservation.guestEmail)`
- ✅ **Prüft `notificationChannels`**
- ✅ Versendet nur wenn `notificationChannels.includes('email')` UND `guestEmail` vorhanden
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

#### WhatsApp:
- **Zeile 1299**: `if (notificationChannels.includes('whatsapp') && reservation.guestPhone)`
- ✅ **Prüft `notificationChannels`**
- ✅ Versendet nur wenn `notificationChannels.includes('whatsapp')` UND `guestPhone` vorhanden
- ✅ Verwendet `sendMessageWithFallback()` (Session Message oder Template)
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

### Aktuelles Verhalten:
- ✅ Versendet Email wenn `notificationChannels.includes('email')` UND `guestEmail` vorhanden
- ✅ Versendet WhatsApp wenn `notificationChannels.includes('whatsapp')` UND `guestPhone` vorhanden
- ✅ Versendet **beides** wenn beide Channels aktiviert UND beide Kontaktdaten vorhanden
- **Korrekt**: Respektiert `notificationChannels`

---

## 3. sendPasscodeNotification

**Controller**: `POST /api/reservations/:id/send-passcode`  
**Service**: `ReservationNotificationService.sendPasscodeNotification()`  
**Datei**: `backend/src/services/reservationNotificationService.ts` (Zeile 1507-...)

### Was wird versendet:
- ✅ **TTLock-Passcode** (mit anpassbaren Kontaktdaten)

### Versendung:

#### Email:
- **Zeile 1740**: `if (notificationChannels.includes('email') && finalGuestEmail)`
- ✅ **Prüft `notificationChannels`**
- ✅ Versendet nur wenn `notificationChannels.includes('email')` UND `finalGuestEmail` vorhanden
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

#### WhatsApp:
- **Zeile 1797**: `if (notificationChannels.includes('whatsapp') && finalGuestPhone)`
- ✅ **Prüft `notificationChannels`**
- ✅ Versendet nur wenn `notificationChannels.includes('whatsapp')` UND `finalGuestPhone` vorhanden
- ✅ Verwendet `sendMessageWithFallback()` (Session Message oder Template)
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

### Aktuelles Verhalten:
- ✅ Versendet Email wenn `notificationChannels.includes('email')` UND `finalGuestEmail` vorhanden
- ✅ Versendet WhatsApp wenn `notificationChannels.includes('whatsapp')` UND `finalGuestPhone` vorhanden
- ✅ Versendet **beides** wenn beide Channels aktiviert UND beide Kontaktdaten vorhanden
- **Korrekt**: Respektiert `notificationChannels`

---

## Vergleich: Automatische vs. Manuelle Trigger

### Automatische Trigger (bereits analysiert):
1. ✅ Trigger 1: LobbyPMS Import → `sendReservationInvitation` (prüft `autoSend`)
2. ✅ Trigger 2: LobbyPMS Check-in + Payment → `generatePinAndSendNotification` (prüft jetzt `autoSend`)
3. ✅ Trigger 3: Bold Payment Webhook → `generatePinAndSendNotification` (prüft jetzt `autoSend`)
4. ✅ Trigger 4: Email-Import → `sendReservationInvitation` (prüft `autoSend`)

### Manuelle Trigger (hier analysiert):
1. ❌ `sendReservationInvitation` → **Prüft NICHT `notificationChannels`**
2. ✅ `generatePinAndSendNotification` → **Prüft `notificationChannels`** ✅
3. ✅ `sendPasscodeNotification` → **Prüft `notificationChannels`** ✅

---

## Probleme

### Problem 1: sendReservationInvitation ignoriert notificationChannels

**Aktuell:**
- Versendet WhatsApp immer wenn `guestPhone` vorhanden (Zeile 615)
- Versendet Email immer wenn `guestEmail` vorhanden (Zeile 815)
- **Ignoriert `notificationChannels` komplett**

**Sollte sein:**
- Versendet WhatsApp nur wenn `notificationChannels.includes('whatsapp')` UND `guestPhone` vorhanden
- Versendet Email nur wenn `notificationChannels.includes('email')` UND `guestEmail` vorhanden
- Versendet **beides** wenn beide Channels aktiviert UND beide Kontaktdaten vorhanden

**Analogie:**
- `generatePinAndSendNotification` und `sendPasscodeNotification` prüfen bereits `notificationChannels` korrekt
- `sendReservationInvitation` sollte dasselbe tun

---

## Zusammenfassung der Nachrichten

### sendReservationInvitation

**WhatsApp-Nachricht:**
- **Inhalt**: Payment-Link + Check-in-Link
- **Sprachen**: EN/ES/DE (automatisch erkannt)
- **Template**: Aus Branch Settings (`checkInInvitation`)
- **Session Message**: Ja (24h-Fenster)
- **Template Message**: Fallback wenn außerhalb 24h-Fenster

**Email-Nachricht:**
- **Inhalt**: Payment-Link + Check-in-Link
- **Sprachen**: EN/ES/DE (automatisch erkannt)
- **Template**: Aus Branch Settings (`checkInInvitation`)
- **Format**: HTML mit Branding

### generatePinAndSendNotification

**Email-Nachricht:**
- **Inhalt**: TTLock-Passcode + Zimmerinfo
- **Sprachen**: EN/ES/DE (automatisch erkannt)
- **Template**: Aus Branch Settings (`checkInConfirmation`)
- **Format**: HTML mit Branding

**WhatsApp-Nachricht:**
- **Inhalt**: TTLock-Passcode + Zimmerinfo
- **Sprachen**: EN/ES/DE (automatisch erkannt)
- **Template**: Aus Branch Settings (`checkInConfirmation`)
- **Session Message**: Ja (24h-Fenster)
- **Template Message**: Fallback wenn außerhalb 24h-Fenster

### sendPasscodeNotification

**Gleiche Nachrichten wie `generatePinAndSendNotification`**, aber mit anpassbaren Kontaktdaten

---

## Empfehlung

### Änderung für sendReservationInvitation:

**Zeile 615** (WhatsApp):
```typescript
// ALT:
if (guestPhone && paymentLink) {

// NEU:
if (notificationChannels.includes('whatsapp') && guestPhone && paymentLink) {
```

**Zeile 815** (Email):
```typescript
// ALT:
if (guestEmail && checkInLink && paymentLink) {

// NEU:
if (notificationChannels.includes('email') && guestEmail && checkInLink && paymentLink) {
```

**Zusätzlich:**
- ❌ `notificationChannels` wird **NICHT geladen** in `sendReservationInvitation`
- ✅ Muss geladen werden (analog zu `generatePinAndSendNotification` und `sendPasscodeNotification`)
- ✅ Code-Beispiel aus `generatePinAndSendNotification` (Zeile 1140-1158):
  ```typescript
  // Entschlüssele Settings (aus Branch oder Organisation)
  const { decryptApiSettings, decryptBranchApiSettings } = await import('../utils/encryption');
  
  let decryptedSettings: any = null;
  
  // Lade Settings aus Branch oder Organisation
  if (reservation.branchId && reservation.branch?.doorSystemSettings) {
    const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings as any);
    // Für notificationChannels: Fallback auf Organisation
    const orgSettings = decryptApiSettings(reservation.organization.settings as any);
    decryptedSettings = orgSettings;
  } else {
    decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
  }
  
  const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];
  ```

---

## Checkliste für Umsetzung

- [ ] `sendReservationInvitation`: `notificationChannels` laden (aus Branch oder Organization Settings)
- [ ] `sendReservationInvitation`: WhatsApp-Versendung nur wenn `notificationChannels.includes('whatsapp')`
- [ ] `sendReservationInvitation`: Email-Versendung nur wenn `notificationChannels.includes('email')`
- [ ] Test: `sendReservationInvitation` mit nur Email-Channel → nur Email versendet
- [ ] Test: `sendReservationInvitation` mit nur WhatsApp-Channel → nur WhatsApp versendet
- [ ] Test: `sendReservationInvitation` mit beiden Channels → beide versendet
- [ ] Test: `sendReservationInvitation` ohne Channels → nichts versendet
- [ ] Test: Pro Branch (verschiedene Branches mit verschiedenen Channels)

---

## Hinweise

1. **`generatePinAndSendNotification` und `sendPasscodeNotification` sind bereits korrekt** - keine Änderungen nötig
2. **Nur `sendReservationInvitation` muss angepasst werden** - analog zu den anderen beiden Methoden
3. **Alle drei Methoden funktionieren bereits pro Branch** - keine Änderungen nötig
4. **Alle drei Methoden haben bereits Sprache-Erkennung** - keine Änderungen nötig
5. **Alle drei Methoden laden Templates aus Branch Settings** - keine Änderungen nötig

