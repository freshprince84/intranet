# Analyse: Manuelle Trigger für Email/WhatsApp-Versendung (VOLLSTÄNDIG)

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

## 1. PUT /api/reservations/:id/guest-contact → updateGuestContact

**Controller**: `backend/src/controllers/reservationController.ts` (Zeile 32-290)  
**Service**: Direkt im Controller (kein separater Service)

### Was wird versendet:
- ✅ **Payment-Link** (Bold Payment)
- ✅ **Check-in-Link** (LobbyPMS)
- ✅ **TTLock-Passcode** (wenn konfiguriert)

### Versendung:

#### WhatsApp:
- **Zeile 147**: `if (contactType === 'phone' && updatedReservation.guestPhone)`
- ❌ **Prüft NICHT `notificationChannels`**
- ✅ Versendet immer wenn `contactType === 'phone'` UND `guestPhone` vorhanden
- ✅ Verwendet `sendMessageWithFallback()` (Session Message oder Template)
- ❌ **Keine Sprache-Erkennung** - hardcodiert Spanisch
- ❌ **Keine Templates aus Branch Settings** - hardcodierte Nachricht
- ✅ Funktioniert pro Branch (WhatsAppService)

#### Email:
- ❌ **Wird NICHT versendet** (nur WhatsApp)

### Aktuelles Verhalten:
- Versendet **nur WhatsApp** (unabhängig von `notificationChannels`)
- **Problem**: Ignoriert `notificationChannels` komplett, keine Email-Option

---

## 2. POST /api/reservations → createReservation

**Controller**: `backend/src/controllers/reservationController.ts` (Zeile 296-533)  
**Service**: Ruft `ReservationNotificationService.sendReservationInvitation()` auf

### Was wird versendet:
- ✅ **Payment-Link** (Bold Payment)
- ✅ **Check-in-Link** (LobbyPMS)

### Versendung:

#### Automatisch (wenn autoSend aktiviert):
- **Zeile 471-489**: Ruft `sendReservationInvitation()` auf (wenn `contactType === 'phone'`)
- **Zeile 490-511**: Ruft `sendReservationInvitation()` auf (wenn `contactType === 'email'`)
- ✅ Prüft `autoSend` (Zeile 387, 444)
- ❌ **Aber**: `sendReservationInvitation` prüft NICHT `notificationChannels` (siehe Trigger 3)

### Aktuelles Verhalten:
- Versendet nur wenn `autoSend === true`
- **Problem**: `sendReservationInvitation` ignoriert `notificationChannels` (siehe Trigger 3)

---

## 3. POST /api/reservations/:id/send-invitation → sendReservationInvitation

**Controller**: `backend/src/controllers/reservationController.ts` (Zeile 804-900)  
**Service**: `ReservationNotificationService.sendReservationInvitation()` (Zeile 489-1121)

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

## 4. POST /api/reservations/:id/generate-pin-and-send → generatePinAndSendNotification

**Controller**: `backend/src/controllers/reservationController.ts` (Zeile 906-988)  
**Service**: `ReservationNotificationService.generatePinAndSendNotification()` (Zeile 1128-1499)

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

## 5. POST /api/reservations/:id/send-passcode → sendPasscodeNotification

**Controller**: `backend/src/controllers/reservationController.ts` (Zeile 994-1087)  
**Service**: `ReservationNotificationService.sendPasscodeNotification()` (Zeile 1507-2097)

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

## 6. PUT /api/lobby-pms/reservations/:id/check-in → checkInReservation → sendCheckInConfirmation

**Controller**: `backend/src/controllers/lobbyPmsController.ts` (Zeile 301-388)  
**Service**: `ReservationNotificationService.sendCheckInConfirmation()` (Zeile 2104-2221)

### Was wird versendet:
- ✅ **TTLock-Passcode**

### Versendung:

#### Email:
- **Zeile 2174**: `if (notificationChannels.includes('email') && reservation.guestEmail)`
- ✅ **Prüft `notificationChannels`**
- ✅ Versendet nur wenn `notificationChannels.includes('email')` UND `guestEmail` vorhanden
- ✅ Sprache-Erkennung (EN/ES/DE)
- ✅ Lädt Templates aus Branch Settings
- ✅ Funktioniert pro Branch

#### WhatsApp:
- **Zeile 2184**: `if (notificationChannels.includes('whatsapp') && reservation.guestPhone)`
- ✅ **Prüft `notificationChannels`**
- ❌ **Aber**: WhatsApp-Versendung ist **TEMPORÄR DEAKTIVIERT** (auskommentiert, Zeile 2182-2213)
- ✅ Würde versenden wenn aktiviert

### Aktuelles Verhalten:
- ✅ Versendet Email wenn `notificationChannels.includes('email')` UND `guestEmail` vorhanden
- ❌ WhatsApp ist deaktiviert (auskommentiert)
- **Korrekt**: Respektiert `notificationChannels` (Email funktioniert)

---

## Vergleich: Automatische vs. Manuelle Trigger

### Automatische Trigger (bereits analysiert):
1. ✅ Trigger 1: LobbyPMS Import → `sendReservationInvitation` (prüft `autoSend`)
2. ✅ Trigger 2: LobbyPMS Check-in + Payment → `generatePinAndSendNotification` (prüft jetzt `autoSend`)
3. ✅ Trigger 3: Bold Payment Webhook → `generatePinAndSendNotification` (prüft jetzt `autoSend`)
4. ✅ Trigger 4: Email-Import → `sendReservationInvitation` (prüft `autoSend`)

### Manuelle Trigger (hier analysiert):
1. ❌ `updateGuestContact` → **Prüft NICHT `notificationChannels`** (nur WhatsApp, hardcodiert)
2. ⚠️ `createReservation` → Prüft `autoSend`, aber ruft `sendReservationInvitation` auf (siehe 3)
3. ❌ `sendReservationInvitation` → **Prüft NICHT `notificationChannels`**
4. ✅ `generatePinAndSendNotification` → **Prüft `notificationChannels`** ✅
5. ✅ `sendPasscodeNotification` → **Prüft `notificationChannels`** ✅
6. ✅ `sendCheckInConfirmation` → **Prüft `notificationChannels`** ✅ (aber WhatsApp deaktiviert)

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

### Problem 2: updateGuestContact ignoriert notificationChannels

**Aktuell:**
- Versendet **nur WhatsApp** (Zeile 147)
- **Ignoriert `notificationChannels` komplett**
- **Keine Email-Option**
- Hardcodierte Nachricht (keine Templates, keine Sprache-Erkennung)

**Sollte sein:**
- Versendet WhatsApp nur wenn `notificationChannels.includes('whatsapp')` UND `guestPhone` vorhanden
- Versendet Email nur wenn `notificationChannels.includes('email')` UND `guestEmail` vorhanden
- Versendet **beides** wenn beide Channels aktiviert UND beide Kontaktdaten vorhanden
- Lädt Templates aus Branch Settings
- Sprache-Erkennung (EN/ES/DE)

---

## Was ist notificationChannels?

### Definition:
`notificationChannels` ist eine Einstellung in den **Organization Settings** (`Organization.settings.lobbyPms.notificationChannels`), die festlegt, **welche Kommunikationskanäle** für Benachrichtigungen verwendet werden sollen.

### Mögliche Werte:
- `['email']` - Nur Email versenden
- `['whatsapp']` - Nur WhatsApp versenden
- `['email', 'whatsapp']` - Beide versenden (wenn Kontaktdaten vorhanden)

### Wo wird es gespeichert:
- **Organization Settings**: `Organization.settings.lobbyPms.notificationChannels`
- **Fallback**: `['email']` (wenn nicht gesetzt)

### Wozu ist es gut?
1. **Flexibilität**: Jede Organisation kann selbst entscheiden, welche Kanäle verwendet werden
2. **Kostenkontrolle**: WhatsApp-Nachrichten kosten Geld (Meta API), Email ist meist kostenlos
3. **Präferenzen**: Manche Organisationen bevorzugen nur Email, andere nur WhatsApp
4. **Compliance**: Manche Länder haben spezielle Anforderungen für WhatsApp-Nachrichten

### Was bedeutet "versendet unabhängig von Channel-Einstellungen"?
- **Aktuell**: `sendReservationInvitation` versendet **immer** WhatsApp wenn `guestPhone` vorhanden, **egal** was in `notificationChannels` steht
- **Problem**: Wenn `notificationChannels = ['email']` (nur Email), wird trotzdem WhatsApp versendet
- **Sollte sein**: Wenn `notificationChannels = ['email']`, sollte **nur** Email versendet werden, auch wenn `guestPhone` vorhanden ist

---

## Zusammenfassung der Nachrichten

### sendReservationInvitation (Trigger 3)

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

### generatePinAndSendNotification (Trigger 4)

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

### sendPasscodeNotification (Trigger 5)

**Gleiche Nachrichten wie `generatePinAndSendNotification`**, aber mit anpassbaren Kontaktdaten

### sendCheckInConfirmation (Trigger 6)

**Gleiche Nachrichten wie `generatePinAndSendNotification`**, aber WhatsApp ist deaktiviert

### updateGuestContact (Trigger 1)

**WhatsApp-Nachricht:**
- **Inhalt**: Payment-Link + Check-in-Link + TTLock-Passcode
- **Sprachen**: ❌ **Hardcodiert Spanisch** (keine Erkennung)
- **Template**: ❌ **Hardcodierte Nachricht** (keine Templates)
- **Session Message**: Ja (24h-Fenster)
- **Template Message**: Fallback wenn außerhalb 24h-Fenster

**Email-Nachricht:**
- ❌ **Wird NICHT versendet**

---

## Vergleich: Automatische vs. Manuelle Nachrichten

### Automatische Trigger verwenden:
- ✅ `sendReservationInvitation` (Payment-Link + Check-in-Link)
- ✅ `generatePinAndSendNotification` (TTLock-Passcode)

### Manuelle Trigger verwenden:
- ✅ `sendReservationInvitation` (Payment-Link + Check-in-Link) - **GLEICH**
- ✅ `generatePinAndSendNotification` (TTLock-Passcode) - **GLEICH**
- ✅ `sendPasscodeNotification` (TTLock-Passcode) - **GLEICH**
- ✅ `sendCheckInConfirmation` (TTLock-Passcode) - **GLEICH**
- ❌ `updateGuestContact` (Payment-Link + Check-in-Link + TTLock-Passcode) - **ABWEICHUNG**: Hardcodiert, keine Email

### Abweichungen:
1. **`updateGuestContact`**: 
   - Versendet **alle drei** (Payment-Link + Check-in-Link + TTLock-Passcode) in einer Nachricht
   - Hardcodiert Spanisch (keine Sprache-Erkennung)
   - Keine Templates (hardcodierte Nachricht)
   - Keine Email-Option

2. **Alle anderen**: 
   - Versenden entweder Payment-Link + Check-in-Link ODER TTLock-Passcode (nicht beides zusammen)
   - Sprache-Erkennung (EN/ES/DE)
   - Templates aus Branch Settings
   - Email und WhatsApp möglich

---

## Empfehlung

### Änderung für sendReservationInvitation (Trigger 3):

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

### Änderung für updateGuestContact (Trigger 1):

**Komplette Überarbeitung nötig:**
- ✅ `notificationChannels` laden
- ✅ Email-Versendung hinzufügen
- ✅ Templates aus Branch Settings laden
- ✅ Sprache-Erkennung hinzufügen
- ✅ Oder: Verwende `sendReservationInvitation` + `sendPasscodeNotification` (besser)

---

## Checkliste für Umsetzung

- [ ] `sendReservationInvitation`: `notificationChannels` laden (aus Branch oder Organization Settings)
- [ ] `sendReservationInvitation`: WhatsApp-Versendung nur wenn `notificationChannels.includes('whatsapp')`
- [ ] `sendReservationInvitation`: Email-Versendung nur wenn `notificationChannels.includes('email')`
- [ ] `updateGuestContact`: Komplette Überarbeitung (oder Umstellung auf Service-Methoden)
- [ ] Test: `sendReservationInvitation` mit nur Email-Channel → nur Email versendet
- [ ] Test: `sendReservationInvitation` mit nur WhatsApp-Channel → nur WhatsApp versendet
- [ ] Test: `sendReservationInvitation` mit beiden Channels → beide versendet
- [ ] Test: `sendReservationInvitation` ohne Channels → nichts versendet
- [ ] Test: Pro Branch (verschiedene Branches mit verschiedenen Channels)

---

## Hinweise

1. **`generatePinAndSendNotification`, `sendPasscodeNotification` und `sendCheckInConfirmation` sind bereits korrekt** - keine Änderungen nötig
2. **Nur `sendReservationInvitation` und `updateGuestContact` müssen angepasst werden**
3. **Alle Methoden funktionieren bereits pro Branch** - keine Änderungen nötig
4. **Alle Methoden (außer `updateGuestContact`) haben bereits Sprache-Erkennung** - keine Änderungen nötig
5. **Alle Methoden (außer `updateGuestContact`) laden Templates aus Branch Settings** - keine Änderungen nötig

