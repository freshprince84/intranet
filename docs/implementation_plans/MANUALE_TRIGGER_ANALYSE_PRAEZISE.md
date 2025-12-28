# Analyse: Manuelle Trigger - Präzise Antworten

**Datum**: 2025-01-XX  
**Status**: 📋 Analyse (noch nichts ändern)

---

## 1. updateGuestContact - WER aktualisiert WAS genau?

### Frontend:
**Datei**: `frontend/src/components/reservations/ReservationDetails.tsx` (Zeile 140-169)

**Bedingung für Modal-Anzeige:**
- Status ist `confirmed` ODER `notification_sent`
- UND `guestPhone` fehlt
- UND `guestEmail` fehlt

**Wer**: **Mitarbeiter** (nicht Gast!)
**Was**: Aktualisiert **Gast-Kontaktinformation einer Reservation** (nicht eigene Kontaktinfo!)

**Ablauf:**
1. Mitarbeiter öffnet Reservation-Details
2. Wenn keine Kontaktinfo vorhanden → Button "Kontakt hinzufügen" erscheint
3. Mitarbeiter klickt Button → `GuestContactModal` öffnet sich
4. Mitarbeiter gibt Telefonnummer ODER Email ein
5. Nach Speichern:
   - Kontaktinfo wird in Reservation gespeichert
   - **SOFORT**: Payment-Link wird erstellt
   - **SOFORT**: Check-in-Link wird erstellt
   - **SOFORT**: TTLock-Passcode wird erstellt (wenn konfiguriert)
   - **SOFORT**: WhatsApp-Nachricht wird versendet (wenn Telefonnummer)

**Was für WhatsApp-Nachricht geht raus?**
- Hardcodierte spanische Nachricht (Zeile 210-224 in `reservationController.ts`)
- Enthält: Payment-Link + Check-in-Link + TTLock-Passcode (falls vorhanden)
- **KEINE Templates**, **KEINE Sprache-Erkennung**, **NUR WhatsApp** (keine Email)

**Wann wurde es wieso gemacht?**
- **NICHT dokumentiert** in `docs/`
- Wurde **NIE aufgetragen** (laut User)
- Vermutlich: Ad-hoc-Lösung für fehlende Kontaktinfos bei Reservations

---

## 2. createReservation - autoSend funktioniert FALSCH!

### Aktuelles Verhalten:
**Code**: `backend/src/controllers/reservationController.ts` (Zeile 384-511)

**Wenn `autoSend === true`:**
- Versendet **SOFORT** nach Erstellung (Zeile 471-511)
- **NICHT** um 08:00 morgens, 1 Tag vor Check-in

### Sollte sein (laut User):
- Automatisch um **08:00 morgens**, **1 Tag vor Check-in-Datum**
- **ODER** sofort wenn Check-in-Datum heute oder in Vergangenheit (wenn 08:00 bereits vorbei)

### Was macht es richtig?
**`sendLateCheckInInvitations`** (Zeile 350-479 in `reservationNotificationService.ts`):
- Wird vom Scheduler um 08:00 aufgerufen (`app.ts` Zeile 203)
- Holt Reservierungen für **morgen** (1 Tag vor Check-in)
- Versendet an Kontaktdaten die vorhanden sind (Email wenn Email, WhatsApp wenn Phone, beides wenn beides)

**Problem:**
- `createReservation` sendet **SOFORT**, nicht um 08:00
- Das ist **FALSCH**! Sollte warten bis 08:00, 1 Tag vor Check-in

---

## 3. Trigger 4 & 5 - gehören zusammen?

### Analyse:

**Trigger 4**: `generatePinAndSendNotification`
- Generiert TTLock-Passcode
- Versendet Email/WhatsApp mit Passcode
- Verwendet Kontaktdaten aus Reservation

**Trigger 5**: `sendPasscodeNotification`
- Generiert TTLock-Passcode
- Versendet Email/WhatsApp mit Passcode
- **Anpassbare Kontaktdaten** (kann `guestPhone`/`guestEmail` überschreiben)

**Unterschied:**
- `sendPasscodeNotification` hat mehr Features (anpassbare Kontaktdaten)
- Beide machen im Grunde dasselbe

### Für Trigger 3 (sendReservationInvitation):
**Gibt es `generatePaymentLinkAndSendNotification`?**
- **NEIN!**
- `sendReservationInvitation` macht alles in einer Methode:
  - Erstellt Payment-Link
  - Erstellt Check-in-Link
  - Versendet Email/WhatsApp

**Fazit:**
- **UNGLEICH und CHAOTISCH!**
- Trigger 3: Alles in einer Methode
- Trigger 4 & 5: Zwei Methoden für dasselbe (TTLock-Passcode)

---

## 4. Trigger 6 - checkInReservation ist MANUELL, nicht automatisch!

### Ich habe es falsch kategorisiert!

**Trigger 6**: `PUT /api/lobby-pms/reservations/:id/check-in` → `checkInReservation`
- **MANUELLER Trigger** (User führt Check-in durch)
- Frontend: `ReservationDetails.tsx` → Button "Check-in durchführen"
- Nach erfolgreichem Check-in → `sendCheckInConfirmation` wird aufgerufen

### Automatische Methode (bereits aufgezählt):
**`syncReservation`** (Zeile 1180-1202 in `lobbyPmsService.ts`):
- Prüft: `checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin`
- Wenn alle Bedingungen erfüllt → ruft `generatePinAndSendNotification` auf
- **Automatisch** (wird bei Sync aufgerufen)

### Unterschied:
- **Manueller Check-in** (`checkInReservation`): Mitarbeiter führt Check-in durch → `sendCheckInConfirmation`
- **Automatischer Check-in** (`syncReservation`): Gast hat Check-in-Link abgeschlossen + bezahlt → `generatePinAndSendNotification`

**Fazit:**
- **NICHT doppelt**, sondern **zwei verschiedene Use Cases**:
  1. Manueller Check-in durch Mitarbeiter → Bestätigung mit Passcode
  2. Automatischer Check-in (Gast hat Link abgeschlossen + bezahlt) → Passcode-Versand

---

## 5. notificationChannels - Was ist das? Woher kommt es?

### Analyse:

**Wo wird es verwendet:**
1. `sendLateCheckInInvitations` (Zeile 374, 430, 438)
2. `generatePinAndSendNotification` (Zeile 1158, 1250, 1299)
3. `sendPasscodeNotification` (Zeile 1552, 1740, 1797)
4. `sendCheckInConfirmation` (Zeile 2134, 2174, 2184)

**Wo wird es NICHT verwendet:**
- `sendReservationInvitation` - ignoriert es komplett
- `updateGuestContact` - ignoriert es komplett

**Woher kommt es?**
- Script: `backend/scripts/add-whatsapp-to-notification-channels.ts`
- Wird **NICHT im Frontend konfiguriert** (kein UI-Element)
- Wird nur im Backend gesetzt (via Scripts oder direkt in DB)

**Was passiert wenn es wegfällt?**
- Die 4 Methoden würden **IMMER** Email UND WhatsApp versenden (wenn Kontaktdaten vorhanden)
- Das ist **GENAU** das, was die ursprüngliche Anforderung wollte!
- **Fazit**: `notificationChannels` ist **ÜBERFLÜSSIG** und widerspricht der ursprünglichen Anforderung

**Wofür war es gedacht?**
- Vermutlich: Steuerung welche Kanäle verwendet werden sollen
- Aber: Ursprüngliche Anforderung war: "Wenn Email vorhanden → Email, wenn Telefonnummer vorhanden → WhatsApp, wenn beides → beides"
- **Das ist UNABHÄNGIG von `notificationChannels`!**

---

## 6. updateGuestContact - Wann wurde es wieso gemacht?

### Dokumentation:
**Gefunden in `docs/`:**
- `docs/technical/QUEUE_MIGRATION_SAFETY_CHECK.md` - Queue-Migration
- `docs/implementation_plans/RESERVATION_SPRACHE_ANALYSE_2025-01-30.md` - Sprache-Analyse
- `docs/implementation_plans/LOBBYPMS_RESERVATION_IMPORT_ANALYSE_UND_PLAN.md` - Import-Analyse
- **KEINE Dokumentation** über **WARUM** es erstellt wurde oder **WER** es aufgetragen hat

**Fazit:**
- **NICHT dokumentiert** warum es erstellt wurde
- **NICHT dokumentiert** wer es aufgetragen hat
- User sagt: **"Das habe ich so niemals aufgetragen!"**

---

## Zusammenfassung

### 1. updateGuestContact:
- **Wer**: Mitarbeiter
- **Was**: Aktualisiert Gast-Kontaktinformation einer Reservation
- **Wann**: Wenn Reservation keine Kontaktinfo hat
- **Was passiert**: Sofort WhatsApp mit Payment-Link + Check-in-Link + TTLock-Passcode
- **Problem**: Hardcodiert, keine Email, keine Templates, nicht dokumentiert

### 2. createReservation - autoSend:
- **Aktuell**: Sendet SOFORT wenn `autoSend === true` ❌
- **Sollte sein**: Wartet bis 08:00 morgens, 1 Tag vor Check-in (oder sofort wenn Check-in-Datum heute/vergangen)
- **Richtig**: `sendLateCheckInInvitations` macht es richtig (um 08:00, 1 Tag vor Check-in)

### 3. Trigger 4 & 5:
- **Ungleich und chaotisch**: Zwei Methoden für dasselbe (TTLock-Passcode)
- **Trigger 3**: Alles in einer Methode (Payment-Link + Check-in-Link)
- **Keine Analogie**: Es gibt kein `generatePaymentLinkAndSendNotification`

### 4. Trigger 6:
- **MANUELLER Trigger** (nicht automatisch!)
- **NICHT doppelt**: Zwei verschiedene Use Cases:
  - Manueller Check-in → `sendCheckInConfirmation`
  - Automatischer Check-in (Link + Payment) → `generatePinAndSendNotification`

### 5. notificationChannels:
- **ÜBERFLÜSSIG** und widerspricht ursprünglicher Anforderung
- **Wenn wegfällt**: Methoden würden immer Email UND WhatsApp versenden (wenn Kontaktdaten vorhanden)
- **Das ist GENAU** was die ursprüngliche Anforderung wollte!

### 6. updateGuestContact - Dokumentation:
- **NICHT dokumentiert** warum es erstellt wurde
- **NICHT dokumentiert** wer es aufgetragen hat
- User sagt: **"Das habe ich so niemals aufgetragen!"**

