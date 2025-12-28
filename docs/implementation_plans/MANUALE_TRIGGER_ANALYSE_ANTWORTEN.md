# Analyse: Manuelle Trigger - Antworten auf alle Fragen

**Datum**: 2025-01-XX  
**Status**: 📋 Analyse (noch nichts ändern)

---

## 1. Wie werden die 6 Methoden manuell getriggert?

### Frontend-Trigger:

#### 1. `PUT /api/reservations/:id/guest-contact` → `updateGuestContact`
**Frontend**: `frontend/src/components/reservations/GuestContactModal.tsx`
- **Wo**: Modal wird geöffnet (vermutlich aus Worktracker oder ReservationDetails)
- **Wie**: User gibt Kontaktinfo ein (Telefonnummer oder Email), klickt "Speichern"
- **Aufruf**: `reservationService.updateGuestContact(reservation.id, contact.trim())` (Zeile 63)
- **API**: `PUT /api/reservations/:id/guest-contact`

#### 2. `POST /api/reservations` → `createReservation`
**Frontend**: `frontend/src/components/reservations/CreateReservationModal.tsx`
- **Wo**: Modal zum Erstellen neuer Reservationen
- **Wie**: User erstellt neue Reservation, gibt Kontaktinfo ein
- **Aufruf**: Automatisch nach Erstellung (wenn `autoSend === true`)
- **API**: `POST /api/reservations`

#### 3. `POST /api/reservations/:id/send-invitation` → `sendReservationInvitation`
**Frontend**: `frontend/src/pages/Worktracker.tsx` (Zeile 3226-3240)
- **Wo**: Worktracker → Reservations → Button mit PaperAirplaneIcon
- **Wie**: User klickt auf "Einladung senden" Button
- **Aufruf**: Öffnet `SendInvitationSidepane` → ruft `reservationService.sendInvitation()` auf
- **Sidepane**: `frontend/src/components/reservations/SendInvitationSidepane.tsx`
- **API**: `POST /api/reservations/:id/send-invitation`

#### 4. `POST /api/reservations/:id/generate-pin-and-send` → `generatePinAndSendNotification`
**Frontend**: `frontend/src/pages/Worktracker.tsx` (Zeile 3242-3257)
- **Wo**: Worktracker → Reservations → Button mit KeyIcon
- **Wie**: User klickt auf "PIN generieren und senden" Button
- **Aufruf**: Direkt API-Call (vermutlich aus Worktracker oder ReservationDetails)
- **API**: `POST /api/reservations/:id/generate-pin-and-send`

#### 5. `POST /api/reservations/:id/send-passcode` → `sendPasscodeNotification`
**Frontend**: `frontend/src/pages/Worktracker.tsx` (Zeile 3247-3248)
- **Wo**: Worktracker → Reservations → Button mit KeyIcon (gleicher Button wie 4?)
- **Wie**: User klickt auf "Passcode senden" Button
- **Aufruf**: Öffnet `SendPasscodeSidepane` → ruft `reservationService.sendPasscode()` auf
- **Sidepane**: `frontend/src/components/reservations/SendPasscodeSidepane.tsx`
- **API**: `POST /api/reservations/:id/send-passcode`

#### 6. `PUT /api/lobby-pms/reservations/:id/check-in` → `checkInReservation` → `sendCheckInConfirmation`
**Frontend**: `frontend/src/components/reservations/ReservationDetails.tsx` oder `CheckInForm.tsx`
- **Wo**: Check-in-Formular (Online Check-in oder manueller Check-in)
- **Wie**: User führt Check-in durch (Gast oder Mitarbeiter)
- **Aufruf**: Nach erfolgreichem Check-in wird `sendCheckInConfirmation` automatisch aufgerufen
- **API**: `PUT /api/lobby-pms/reservations/:id/check-in`

---

## 2. Was ist notificationChannels? Wer hat es wann & wieso eingebaut?

### Definition:
`notificationChannels` ist eine Einstellung in den **Organization Settings** (`Organization.settings.lobbyPms.notificationChannels`), die festlegt, **welche Kommunikationskanäle** für Benachrichtigungen verwendet werden sollen.

### Wo wird es gespeichert:
- **Organization Settings**: `Organization.settings.lobbyPms.notificationChannels`
- **Branch Settings**: `Branch.lobbyPmsSettings.notificationChannels` (optional, Fallback auf Organization)
- **Fallback**: `['email']` (wenn nicht gesetzt)

### Wer kann es wählen?
**❌ NIEMAND im Frontend!**

**Analyse:**
- `notificationChannels` wird in `BranchManagementTab.tsx` initialisiert mit `['email']` (Zeile 115, 274, 422)
- **KEIN UI-Element** im Frontend, wo User `notificationChannels` wählen kann
- **KEIN Checkbox/Select** für Email/WhatsApp-Kanäle
- Wird nur im Backend gesetzt (vermutlich via Scripts oder direkt in DB)

### Wann & Wieso wurde es eingebaut?
**Vermutung**: Wurde eingebaut für `sendLateCheckInInvitations` (automatische Versendung 1 Tag vor Check-in), um zu steuern, welche Kanäle verwendet werden sollen.

**Verwendung:**
- `sendLateCheckInInvitations` (Zeile 374, 430, 438) - automatische Versendung
- `generatePinAndSendNotification` (Zeile 1158, 1250, 1299) - manueller Trigger
- `sendPasscodeNotification` (Zeile 1552, 1740, 1797) - manueller Trigger
- `sendCheckInConfirmation` (Zeile 2134, 2174, 2184) - nach Check-in

**NICHT verwendet:**
- `sendReservationInvitation` - ignoriert `notificationChannels`
- `updateGuestContact` - ignoriert `notificationChannels`

### Wie funktioniert es aktuell?
**Aktuell:**
- `notificationChannels` wird aus **Organization Settings** geladen (mit Fallback auf Branch)
- Wenn `notificationChannels.includes('email')` → Email wird versendet (wenn `guestEmail` vorhanden)
- Wenn `notificationChannels.includes('whatsapp')` → WhatsApp wird versendet (wenn `guestPhone` vorhanden)
- Wenn beide Channels aktiviert → beide werden versendet (wenn beide Kontaktdaten vorhanden)

**Problem:**
- `notificationChannels` wird **NICHT im Frontend konfiguriert**
- User kann es nicht ändern
- Widerspricht der ursprünglichen Anforderung (siehe unten)

---

## 3. Was war die ursprüngliche Anforderung?

### Ursprüngliche Anforderung (aus Chat):
> "- 2. & 3. müssen auch funktionieren, wenn autoSend aktiviert ist, analog zu 1. dabei muss bei 2. & bei 3. jeweils wenn eine email in der reservation hinterlegt ist, die email versendet werden. wenn eine tel. nr da ist, eine whatsapp nachricht & wenn beides vorhanden ist, beides."

### Interpretation:
**Wenn Email vorhanden → Email versenden**  
**Wenn Telefonnummer vorhanden → WhatsApp versenden**  
**Wenn beides vorhanden → beides versenden**

**Das ist NICHT abhängig von `notificationChannels`!**

### Was muss getan werden?
**Für Trigger 2 & 3 (automatische Trigger):**
- Wenn `guestEmail` vorhanden → Email versenden
- Wenn `guestPhone` vorhanden → WhatsApp versenden
- Wenn beides vorhanden → beides versenden
- **UNABHÄNGIG von `notificationChannels`**

**Für manuelle Trigger:**
- Gleiche Logik: Wenn Email vorhanden → Email, wenn Telefonnummer vorhanden → WhatsApp, wenn beides → beides
- **UNABHÄNGIG von `notificationChannels`**

### Widerspruch zu aktueller Implementierung:
**Aktuell:**
- `generatePinAndSendNotification` prüft `notificationChannels.includes('email')` UND `guestEmail`
- `generatePinAndSendNotification` prüft `notificationChannels.includes('whatsapp')` UND `guestPhone`

**Sollte sein (nach ursprünglicher Anforderung):**
- Wenn `guestEmail` vorhanden → Email versenden (unabhängig von `notificationChannels`)
- Wenn `guestPhone` vorhanden → WhatsApp versenden (unabhängig von `notificationChannels`)
- Wenn beides vorhanden → beides versenden

**Aber:** `notificationChannels` wird bereits verwendet in anderen Methoden. Das ist ein **Widerspruch**!

---

## 4. Warum gibt es so viele verschiedene Funktionen?

### Analyse der Redundanzen:

#### Funktionen, die TTLock-Passcode versenden:

1. **`generatePinAndSendNotification`** (Zeile 1128-1499)
   - Generiert TTLock-Passcode
   - Versendet Email/WhatsApp mit Passcode
   - **Prüft `notificationChannels`**
   - Verwendet Kontaktdaten aus Reservation

2. **`sendPasscodeNotification`** (Zeile 1507-2097)
   - Generiert TTLock-Passcode
   - Versendet Email/WhatsApp mit Passcode
   - **Prüft `notificationChannels`**
   - **Anpassbare Kontaktdaten** (kann `guestPhone`/`guestEmail` überschreiben)

3. **`sendCheckInConfirmation`** (Zeile 2104-2221)
   - Generiert TTLock-Passcode
   - Versendet Email/WhatsApp mit Passcode
   - **Prüft `notificationChannels`**
   - Wird nach Check-in aufgerufen
   - **WhatsApp ist deaktiviert** (auskommentiert)

### Unterschiede:

**`generatePinAndSendNotification` vs. `sendPasscodeNotification`:**
- **Unterschied**: `sendPasscodeNotification` erlaubt anpassbare Kontaktdaten
- **Gleiche Logik**: Beide generieren Passcode, beide versenden Email/WhatsApp
- **Redundanz**: Ja, könnte vereinheitlicht werden

**`sendCheckInConfirmation` vs. `generatePinAndSendNotification`:**
- **Unterschied**: `sendCheckInConfirmation` wird nach Check-in aufgerufen, prüft `status === 'checked_in'`
- **Gleiche Logik**: Beide generieren Passcode, beide versenden Email/WhatsApp
- **Redundanz**: Ja, könnte vereinheitlicht werden

### Empfehlung:
**Vereinheitlichung möglich:**
- `sendPasscodeNotification` könnte `generatePinAndSendNotification` ersetzen (hat mehr Features)
- `sendCheckInConfirmation` könnte `sendPasscodeNotification` aufrufen (statt eigene Logik)

---

## 5. Wann wird updateGuestContact verwendet?

### Verwendung:
**Frontend**: `frontend/src/components/reservations/GuestContactModal.tsx`
- **Wo**: Modal zum Aktualisieren der Gast-Kontaktinformation
- **Wann**: User möchte Kontaktinfo aktualisieren UND sofort Nachricht versenden
- **Was passiert**: 
  1. Kontaktinfo wird aktualisiert (Telefonnummer oder Email)
  2. **Sofort**: Payment-Link + Check-in-Link + TTLock-Passcode werden erstellt
  3. **Sofort**: WhatsApp-Nachricht wird versendet (wenn Telefonnummer)

### Problem:
**`updateGuestContact` sollte es so nicht geben!**

**Warum:**
1. **Vermischte Verantwortlichkeiten**: Aktualisiert Kontaktinfo UND versendet Nachricht
2. **Hardcodiert**: Nur WhatsApp, keine Email-Option, hardcodierte Nachricht
3. **Redundanz**: Macht dasselbe wie `sendReservationInvitation` + `sendPasscodeNotification`
4. **Keine Templates**: Verwendet keine Branch Settings Templates
5. **Keine Sprache-Erkennung**: Hardcodiert Spanisch

### Sollte sein:
**Option 1**: Trennen
- `updateGuestContact` → nur Kontaktinfo aktualisieren
- User muss dann manuell `sendReservationInvitation` + `sendPasscodeNotification` aufrufen

**Option 2**: Umstellen auf Service-Methoden
- `updateGuestContact` → Kontaktinfo aktualisieren
- Dann automatisch `sendReservationInvitation` + `sendPasscodeNotification` aufrufen
- Verwendet Templates, Sprache-Erkennung, etc.

---

## Zusammenfassung

### Frontend-Trigger:
1. ✅ `updateGuestContact` → `GuestContactModal` (Modal)
2. ✅ `createReservation` → `CreateReservationModal` (Modal, automatisch wenn autoSend)
3. ✅ `sendReservationInvitation` → `SendInvitationSidepane` (Sidepane, Button in Worktracker)
4. ✅ `generatePinAndSendNotification` → Button in Worktracker (KeyIcon)
5. ✅ `sendPasscodeNotification` → `SendPasscodeSidepane` (Sidepane, Button in Worktracker)
6. ✅ `sendCheckInConfirmation` → Automatisch nach Check-in

### notificationChannels:
- **Wird NICHT im Frontend konfiguriert** (kein UI-Element)
- Wird nur im Backend gesetzt (vermutlich via Scripts)
- Wird verwendet in: `sendLateCheckInInvitations`, `generatePinAndSendNotification`, `sendPasscodeNotification`, `sendCheckInConfirmation`
- Wird NICHT verwendet in: `sendReservationInvitation`, `updateGuestContact`

### Ursprüngliche Anforderung:
- **Wenn Email vorhanden → Email versenden**
- **Wenn Telefonnummer vorhanden → WhatsApp versenden**
- **Wenn beides vorhanden → beides versenden**
- **UNABHÄNGIG von `notificationChannels`**

### Widerspruch:
- Aktuell prüfen einige Methoden `notificationChannels`
- Ursprüngliche Anforderung war: unabhängig von `notificationChannels`
- **Entscheidung nötig**: Soll `notificationChannels` verwendet werden oder nicht?

### Redundanzen:
- `generatePinAndSendNotification`, `sendPasscodeNotification`, `sendCheckInConfirmation` machen ähnliches
- `sendPasscodeNotification` hat mehr Features (anpassbare Kontaktdaten)
- **Vereinheitlichung möglich**

### updateGuestContact:
- Sollte es so nicht geben (vermischt Verantwortlichkeiten)
- Sollte umgestellt werden auf Service-Methoden oder getrennt werden

