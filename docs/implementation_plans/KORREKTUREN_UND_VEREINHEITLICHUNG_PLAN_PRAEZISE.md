# Plan: Korrekturen und Vereinheitlichung - Präzise Analyse

**Datum**: 2025-01-XX  
**Status**: 📋 Planung (noch nichts ändern)

---

## 1. updateGuestContact komplett entfernen

### Was wird aktuell verwendet:

#### Frontend:
- **ReservationDetails.tsx** (Zeile 140-169):
  - Modal wird angezeigt wenn: Status = `confirmed`/`notification_sent` UND `guestPhone` UND `guestEmail` fehlen
  - Button "Kontakt hinzufügen" → öffnet `GuestContactModal`
  - **Navigation zu ReservationDetails**: NUR von Tabellenansicht (Worktracker.tsx Zeile 3566)
  - **NICHT von Card-Ansicht**: ReservationCard.tsx hat `onClick` prop, aber kein Handler der zu ReservationDetails navigiert

#### Backend:
- **Controller**: `reservationController.ts` (Zeile 32-290)
- **Queue Worker**: `updateGuestContactWorker.ts`
- **Route**: `PUT /api/reservations/:id/guest-contact`

### Was passiert wenn entfernt:

#### Verlorene Funktionalität:
1. **Mitarbeiter kann keine Kontaktinfo mehr aktualisieren UND sofort Nachricht versenden**
   - Aktuell: Mitarbeiter öffnet ReservationDetails → klickt "Kontakt hinzufügen" → gibt Telefonnummer/Email ein → sofort WhatsApp mit Payment-Link + Check-in-Link + TTLock-Passcode
   - Nach Entfernen: Diese Funktionalität existiert nicht mehr

#### ABER - Das ist genau das Problem:
- **Vermischte Verantwortlichkeiten**: Aktualisiert Kontaktinfo UND versendet Nachricht
- **Hardcodiert**: Nur WhatsApp, keine Email-Option, hardcodierte Nachricht (Spanisch)
- **Redundanz**: Macht dasselbe wie `sendReservationInvitation` + `sendPasscodeNotification`
- **Nicht dokumentiert**: User sagt "Das habe ich so niemals aufgetragen!"

### Abhängigkeiten prüfen:
- ✅ **Keine anderen Stellen verwenden `updateGuestContact`** (nur ReservationDetails.tsx)
- ✅ **Keine anderen Stellen verwenden `GuestContactModal`** (nur ReservationDetails.tsx)
- ✅ **ReservationDetails wird NUR von Tabellenansicht aufgerufen** (User sagt es wird nie genutzt)

### Entscheidung:
✅ **ENTFERNEN** - Funktionalität ist nicht dokumentiert, nicht aufgetragen, und kann durch andere Methoden ersetzt werden

---

## 2. createReservation - autoSend prüfen

### Aktuelles Verhalten:

#### Code-Analyse:
**`reservationController.ts`** (Zeile 471-511):
- Wenn `autoSend === true` → sendet **SOFORT** nach Erstellung (unabhängig von Check-in-Datum)
- **FALSCH!** Sollte nur senden wenn Check-in-Datum heute/vergangen, sonst wartet auf Scheduler

#### Vergleich mit anderen Stellen:

**`lobbyPmsService.ts`** (Zeile 1204-1253):
- ✅ **RICHTIG**: Sofort-Versendung nur wenn Check-in-Date heute/vergangen UND autoSend aktiviert
- Code: `if (isTodayOrPast && autoSend && !alreadySent)`

**`emailReservationService.ts`** (Zeile 112-148):
- ✅ **RICHTIG**: Sofort-Versendung nur wenn Check-in-Date heute/vergangen UND autoSend aktiviert
- Code: `if (isTodayOrPast && autoSend)`

**`reservationAutoInvitationScheduler.ts`**:
- ✅ **RICHTIG**: Sendet um 08:00, 1 Tag vor Check-in (Zeile 102)
- Prüft Reservierungen mit Check-in **morgen** (Zeile 138-141)

### Was passiert wenn korrigiert:

#### Verlorene Funktionalität:
- **KEINE**: Reservierungen mit Check-in-Datum in Zukunft werden weiterhin um 08:00, 1 Tag vor Check-in versendet (durch Scheduler)
- **BEHALTEN**: Reservierungen mit Check-in-Datum heute/vergangen werden weiterhin sofort versendet

#### Gewonnene Funktionalität:
- ✅ **Konsistenz**: Alle Stellen (createReservation, lobbyPmsService, emailReservationService) verhalten sich gleich
- ✅ **Korrektes Timing**: Reservierungen werden nicht zu früh versendet

### Entscheidung:
✅ **KORRIGIEREN** - Verhalten ist inkonsistent, sollte analog zu lobbyPmsService/emailReservationService sein

---

## 3. Korrektur/Vereinheitlichung - Code einfacher & weniger

### Problem: Redundanzen

#### TTLock-Passcode-Versendung:

1. **`generatePinAndSendNotification`** (Zeile 1128-1499)
   - **Verwendet in**:
     - `boldPaymentService.ts` (Zeile 816) - nach erfolgreicher Zahlung
     - `lobbyPmsService.ts` (Zeile 1194) - nach Check-in-Link + Payment
     - `reservationController.ts` (Zeile 946) - manueller Trigger
   - **Features**: Generiert Passcode, versendet Email/WhatsApp, verwendet Kontaktdaten aus Reservation

2. **`sendPasscodeNotification`** (Zeile 1507-2097)
   - **Verwendet in**:
     - `reservationController.ts` (Zeile 1051) - manueller Trigger
   - **Features**: Generiert Passcode, versendet Email/WhatsApp, **anpassbare Kontaktdaten** (mehr Features!)

3. **`sendCheckInConfirmation`** (Zeile 2104-2221)
   - **Verwendet in**:
     - `lobbyPmsController.ts` (Zeile 371) - nach manuellem Check-in
     - `reservationNotificationService.ts` (Zeile 1252, 1750, 2175) - interne Verwendung
   - **Features**: Generiert Passcode, versendet Email/WhatsApp, prüft `status === 'checked_in'`

### Was passiert wenn vereinheitlicht:

#### Option 1: `sendPasscodeNotification` als einzige Methode
- `generatePinAndSendNotification` → ruft `sendPasscodeNotification` auf
- `sendCheckInConfirmation` → ruft `sendPasscodeNotification` auf
- **Code reduziert**: ~600 Zeilen weniger
- **Verlorene Funktionalität**: KEINE (alle Features bleiben erhalten)

#### Option 2: Alles in `sendPasscodeNotification` zusammenführen
- `generatePinAndSendNotification` → entfernen, durch `sendPasscodeNotification` ersetzen
- `sendCheckInConfirmation` → entfernen, durch `sendPasscodeNotification` ersetzen
- **Code reduziert**: ~800 Zeilen weniger
- **Verlorene Funktionalität**: 
  - `sendCheckInConfirmation` prüft `status === 'checked_in'` - muss in `sendPasscodeNotification` hinzugefügt werden
  - **ABER**: Das ist nur eine Prüfung, kann als Parameter übergeben werden

### Entscheidung:
✅ **Option 2** (mehr Code reduziert) - `sendPasscodeNotification` hat bereits alle Features, nur Status-Prüfung muss als Parameter hinzugefügt werden

---

## 4. checkInReservation - Genau prüfen

### Frontend-Analyse:

#### Route existiert:
- **`/app/reservations/:id`** → `ReservationDetails.tsx` (App.tsx Zeile 155)

#### Details-Button:
- **NUR in Tabellenansicht** (Worktracker.tsx Zeile 3562-3575)
- Button "Details" → navigiert zu `/reservations/${reservation.id}`
- **NICHT in Card-Ansicht**: ReservationCard.tsx hat nur `onClick` prop, kein Details-Button

#### Check-in-Button:
- **NUR in ReservationDetails.tsx** (Zeile 170-177)
- Button "Check-in durchführen" → öffnet `CheckInForm`
- `CheckInForm` ruft `PUT /api/lobby-pms/reservations/:id/check-in` auf

### User sagt:
"checkInReservation wird doch gar nie genutzt? bzw. schon ReservationDetails.tsx doch gar nicht? wie soll man von der card ansicht dahin gelangen? das ist ja nur noch in der tabellenansicht, weil du es ungefragt reingemacht & trotz diversen anweisungen nie entfernt hast."

### Tatsächlicher Flow:

#### Wenn Mitarbeiter im LobbyPMS Check-in macht:
1. LobbyPMS setzt `checked_in: true` in ihrer DB
2. **Scheduler** (`LobbyPmsReservationScheduler`) ruft alle 10 Minuten `syncReservation` auf
3. `syncReservation` erkennt `lobbyReservation.checked_in === true` (Zeile 1095)
4. `syncReservation` setzt Status auf `checked_in` (Zeile 1095)
5. **ABER**: `sendCheckInConfirmation` wird **NICHT** automatisch aufgerufen!
6. **NUR** wenn `checkInDataUploadedChanged && paymentStatus === paid` → ruft `generatePinAndSendNotification` auf (Zeile 1181-1201)

#### Wenn Mitarbeiter im Frontend Check-in macht:
1. User öffnet ReservationDetails (nur von Tabellenansicht!)
2. User klickt "Check-in durchführen"
3. `checkInReservation` wird aufgerufen (Zeile 301-388)
4. Status wird in LobbyPMS UND lokal auf `checked_in` gesetzt
5. `sendCheckInConfirmation` wird aufgerufen (Zeile 371)

### Was passiert wenn entfernt:

#### Verlorene Funktionalität:
1. **Mitarbeiter kann nicht mehr im Frontend Check-in durchführen**
   - Aktuell: Mitarbeiter öffnet ReservationDetails → klickt "Check-in durchführen" → Status wird auf `checked_in` gesetzt → `sendCheckInConfirmation` wird aufgerufen
   - Nach Entfernen: Diese Funktionalität existiert nicht mehr

#### ABER - User sagt:
- "checkInReservation wird doch gar nie genutzt"
- "ReservationDetails.tsx doch gar nicht? wie soll man von der card ansicht dahin gelangen?"
- "das ist ja nur noch in der tabellenansicht, weil du es ungefragt reingemacht & trotz diversen anweisungen nie entfernt hast"

### Lösung:

#### Option 1: `syncReservation` sollte auch `sendCheckInConfirmation` aufrufen
- Wenn `lobbyReservation.checked_in === true` UND Status ändert sich von `confirmed`/`notification_sent` → `checked_in` → `sendCheckInConfirmation` aufrufen
- **Vorteil**: Automatischer Check-in funktioniert korrekt
- **Nachteil**: `checkInReservation` (Frontend-Button) bleibt bestehen (wird aber nie genutzt)

#### Option 2: `checkInReservation` (Frontend-Button) + `ReservationDetails` entfernen
- Nur Scheduler verwendet werden
- `syncReservation` sollte `sendCheckInConfirmation` aufrufen wenn Status auf `checked_in` wechselt
- **Vorteil**: Code reduziert, konsistenter Flow
- **Nachteil**: Mitarbeiter kann nicht mehr im Frontend Check-in durchführen (aber User sagt es wird nie genutzt)

### Entscheidung:
✅ **Option 2** - User sagt es wird nie genutzt, Code wird reduziert, Flow wird konsistenter

---

## 5. notificationChannels - STREICHEN (nichts hinzufügen)

### User sagt:
"5. streichen, es wird doch eben genau jetzt nichts, ABSOLUT NICHTS hinzugefügt, verstehst du das einfach nicht?"

### Was bedeutet das:
- **NICHT** Helper-Funktionen erstellen
- **NICHT** Service-Prüfungen hinzufügen
- **NICHT** `notificationChannels` laden in `sendReservationInvitation`
- **EINFACH NUR**: `notificationChannels` komplett entfernen

### Was muss entfernt werden:

#### Backend:
1. **`reservationNotificationService.ts`**:
   - Zeile 1158: `const notificationChannels = ...` entfernen
   - Zeile 1250, 1299: `if (notificationChannels.includes('email'))` → entfernen, nur `if (guestEmail)` behalten
   - Zeile 1552: `const notificationChannels = ...` entfernen
   - Zeile 1740, 1797: `if (notificationChannels.includes('email'))` → entfernen, nur `if (guestEmail)` behalten
   - Zeile 2134: `const notificationChannels = ...` entfernen
   - Zeile 2174, 2184: `if (notificationChannels.includes('email'))` → entfernen, nur `if (guestEmail)` behalten

2. **Schemas**:
   - `branchSettingsSchema.ts` (Zeile 14): `notificationChannels` entfernen
   - `organizationSettingsSchema.ts` (Zeile 19): `notificationChannels` entfernen

3. **Scripts**:
   - `add-whatsapp-to-notification-channels.ts`: Komplette Datei entfernen

#### Frontend:
1. **`BranchManagementTab.tsx`**:
   - Zeile 115, 274, 422: `notificationChannels` Initialisierung entfernen

2. **`organization.ts`**:
   - Zeile 71: `notificationChannels` Type-Definition entfernen

### Was passiert wenn entfernt:

#### Verlorene Funktionalität:
- **KEINE**: `notificationChannels` wird aktuell nur verwendet um zu prüfen ob Email/WhatsApp versendet werden soll
- **ABER**: Diese Prüfung ist überflüssig - wenn `guestEmail` vorhanden → Email versenden, wenn `guestPhone` vorhanden → WhatsApp versenden
- **Das ist genau die ursprüngliche Anforderung**: "Wenn Email vorhanden → Email versenden, wenn Telefonnummer vorhanden → WhatsApp versenden, wenn beides → beides"

### Entscheidung:
✅ **ENTFERNEN** - Überflüssig, widerspricht ursprünglicher Anforderung

---

## Zusammenfassung

### 1. updateGuestContact entfernen:
- ✅ Controller-Methode entfernen
- ✅ Queue Worker entfernen
- ✅ Frontend Component entfernen
- ✅ API-Route entfernen
- **Code reduziert**: ~500 Zeilen weniger
- **Verlorene Funktionalität**: Mitarbeiter kann keine Kontaktinfo mehr aktualisieren UND sofort Nachricht versenden (ABER: nicht dokumentiert, nicht aufgetragen)

### 2. createReservation autoSend korrigieren:
- ✅ Sofort-Versand entfernen (außer Check-in-Datum heute/vergangen)
- ✅ Scheduler sendet automatisch um 08:00, 1 Tag vor Check-in
- **Code reduziert**: ~40 Zeilen weniger
- **Verlorene Funktionalität**: KEINE (Reservierungen mit Check-in-Datum in Zukunft werden weiterhin um 08:00 versendet)

### 3. Vereinheitlichung:
- ✅ `generatePinAndSendNotification` → durch `sendPasscodeNotification` ersetzen
- ✅ `sendCheckInConfirmation` → durch `sendPasscodeNotification` ersetzen
- **Code reduziert**: ~800 Zeilen weniger
- **Verlorene Funktionalität**: KEINE (alle Features bleiben erhalten, Status-Prüfung als Parameter)

### 4. checkInReservation:
- ✅ **Entfernen**: `checkInReservation` (Frontend-Button) + `ReservationDetails` + `CheckInForm` (wird nur in Tabellenansicht genutzt, User sagt es wird nie genutzt)
- ✅ **Hinzufügen**: `syncReservation` sollte `sendCheckInConfirmation` aufrufen wenn Status auf `checked_in` wechselt
- **Code reduziert**: ~200 Zeilen weniger
- **Verlorene Funktionalität**: Mitarbeiter kann nicht mehr im Frontend Check-in durchführen (ABER: User sagt es wird nie genutzt)

### 5. notificationChannels - STREICHEN:
- ✅ Alle Prüfungen entfernen
- ✅ Schemas entfernen
- ✅ Frontend-Initialisierung entfernen
- ✅ Script entfernen
- **Code reduziert**: ~50 Zeilen weniger
- **Verlorene Funktionalität**: KEINE (überflüssig, widerspricht ursprünglicher Anforderung)

### Gesamt:
- **Code reduziert**: ~1590 Zeilen weniger
- **Code wird einfacher**: Weniger Redundanzen, keine überflüssigen Prüfungen
- **Logik wird korrekt**: Wenn Email vorhanden → Email, wenn Telefonnummer vorhanden → WhatsApp, wenn beides → beides



