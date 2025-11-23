# Payment-Link Fakten - Datenbank & Log-Analyse

**Datum**: 2025-01-22  
**Status**: ✅ Fakten gesammelt

## Datenbank-Fakten (letzte 24 Stunden)

### ERROR_LOGS (11 Einträge)
- **Alle Fehler sind Email- oder WhatsApp-Fehler**
- **KEINE Payment-Link-Fehler in der Datenbank**
- Reservation 3744: 7 Email-Fehler (Connection timeout)
- Reservation 3760: 2 Email-Fehler
- Reservation 3734: 1 WhatsApp OAuth-Fehler (Invalid OAuth access token)
- Reservation 3743: 1 Email-Fehler
- **Alle haben Payment-Link vorhanden** (`hasPaymentLink: true`)

### PAYMENT_LINK_ERRORS
- **0 Einträge** - Keine Payment-Link-Fehler in der Datenbank

### RESERVATIONS_WITHOUT_PAYMENT_LINK
- **0 Einträge** - Keine Reservierungen ohne Payment-Link, die versucht wurden zu senden

### RECENT_WITHOUT_PAYMENT_LINK
- **50 Reservierungen** der letzten 7 Tage OHNE Payment-Link
- **ABER**: Diese wurden NICHT versucht zu senden (keine `sentMessageAt`, kein `notification_sent` Status)
- Alle haben Beträge >= 10000 COP (keine Betragsprobleme)

### LOW_AMOUNT_RESERVATIONS
- **0 Reservierungen** mit Betrag < 10000 COP in den letzten 7 Tagen

## Server-Log-Fakten

### Payment-Link-Fehler in Logs
- **Reservation 3350**: Payment-Link-Fehler wegen "Betrag zu niedrig: 0 COP. Mindestbetrag: 10000 COP"
- **NICHT in Datenbank** (älter als 24 Stunden)
- Fehler: `[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links: Error: Betrag zu niedrig: 0 COP. Mindestbetrag: 10000 COP`
- Fehler: `[Reservation] ⚠️ Einladung teilweise fehlgeschlagen für Reserrvierung 3350: Payment-Link konnte nicht erstellt werden: Betrag zu niedrig: 0 COP. Mindestbetrag: 10000 COP`

### Reservation 3744 - Log-Sequenz
1. `[ReservationNotification] Erstelle Payment-Link für Reservierung 3744...`
2. `[ReservationNotification] ✅ Check-in-Link erstellt`
3. `[ReservationNotification] Sende WhatsApp-Nachricht`
4. `[WhatsApp Service] ✅ Template Message erfolgreich gesendet`
5. `[ReservationNotification] ✅ Log-Eintrag erstellt ... Success: true`
6. `[ReservationNotification] Sende Email für Reservierung 3744...`
7. `❌ Fehler beim Versenden der E-Mail: Error: Connection timeout`
8. `[ReservationNotification] ✅ Log-Eintrag erstellt ... Success: false`

**FAKT**: WhatsApp wird erfolgreich versendet, Email schlägt fehl, Payment-Link existiert bereits

## Code-Fakten

### Betragsvalidierung
- **Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 229-241)
- **Mindestbeträge**:
  - COP: 10000
  - USD: 1
  - EUR: 1
- **Fehler**: Wenn Betrag < Mindestbetrag → `throw new Error("Betrag zu niedrig: ${amount} ${currency}. Mindestbetrag: ${minAmount} ${currency}")`

### Payment-Link-Fehlerbehandlung
- **Code-Stelle**: `backend/src/services/reservationNotificationService.ts` (Zeile 284-305)
- **Wenn Payment-Link fehlschlägt**: Error wird geworfen → Prozess bricht ab
- **Log wird erstellt** (Zeile 290-299), aber wenn Log fehlschlägt, wird nur geloggt (Zeile 300-301)

## Zusammenfassung der Fakten

1. **KEINE Payment-Link-Fehler in Datenbank** (letzte 24h)
2. **Alle Error-Logs sind Email- oder WhatsApp-Fehler**
3. **50 Reservierungen ohne Payment-Link**, aber diese wurden nicht versucht zu senden
4. **Reservation 3350 hatte Payment-Link-Fehler** (Betrag 0 COP), aber nicht in DB (älter als 24h)
5. **Reservation 3744**: WhatsApp erfolgreich, Email fehlgeschlagen, Payment-Link vorhanden
6. **Betragsvalidierung**: Mindestbetrag 10000 COP wird geprüft

## Bekannte Probleme

### Problem 1: Reservierungen mit Betrag 0 COP
- **Reservation 3350**: Betrag 0 COP → Payment-Link kann nicht erstellt werden
- **Lösung**: Betrag muss >= 10000 COP sein

### Problem 2: Email-Versand schlägt fehl
- **Reservation 3744**: 7 Email-Fehler (Connection timeout)
- **ABER**: WhatsApp wird erfolgreich versendet
- **Email-Fehler blockiert nicht den gesamten Prozess**

### Problem 3: WhatsApp OAuth-Fehler
- **Reservation 3734**: Invalid OAuth access token
- **Separates Problem** (nicht Payment-Link)

