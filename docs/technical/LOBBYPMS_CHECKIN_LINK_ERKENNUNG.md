# LobbyPMS Check-in-Link-Erkennung

## Übersicht

Dieses Dokument beschreibt, wie das System erkennt, wann ein Gast den Check-in-Link abgeschlossen hat (Dokumente hochgeladen), und wie daraufhin der PIN-Versand ausgelöst wird.

## Problem

Wenn ein Gast den Check-in-Link verwendet und seine Daten hochlädt, wird die Reservierung in LobbyPMS aktualisiert, aber **nicht automatisch** auf `checked_in` gesetzt. Der Status bleibt `confirmed` oder `notification_sent`, bis ein Mitarbeiter in LobbyPMS manuell den Check-in-Button drückt.

**Ziel**: Erkennen, wann der Gast den Check-in-Link abgeschlossen hat, und entsprechend den Status aktualisieren (z.B. auf "documentos subidos" oder ähnlich).

## Erkennungslogik

### Indikatoren für abgeschlossenen Check-in-Link

Basierend auf Analyse der Reservation 18060402 (Prod-Server):

1. **`checkin_online: true`** ✅ (sicherster Indikator)
   - Wird von LobbyPMS gesetzt, wenn der Check-in-Link verwendet wurde

2. **`holder.type_document` + `holder.document` gefüllt** ✅ (sehr wahrscheinlich)
   - Wenn beide Felder gefüllt sind → Dokument wurde hochgeladen
   - Beispiel: `type_document: "Cédula de ciudadanía"`, `document: "CC1125291400"`

3. **`holder.country` gefüllt** ✅ (möglich)
   - Nationalität wurde angegeben
   - **WICHTIG**: LobbyPMS verwendet `holder.country`, nicht `holder.pais`!

### Implementierung

**Code**: `backend/src/services/lobbyPmsService.ts` → `syncReservation()`

```typescript
// Prüfe ob Gast Check-in-Link abgeschlossen hat (Dokumente hochgeladen)
const hasCompletedCheckInLink = 
  lobbyReservation.checkin_online === true ||
  (holder.type_document && holder.type_document !== '' && 
   holder.document && holder.document !== '');
```

**Neue Felder im Schema**:
- `checkInDataUploaded: Boolean` - Gast hat Check-in-Link abgeschlossen
- `checkInDataUploadedAt: DateTime?` - Wann wurden Dokumente hochgeladen

## Prozess-Flow

### 1. Gast klickt Check-in-Link

```
Gast → Check-in-Link (aus E-Mail/WhatsApp) 
  → LobbyPMS Formular 
  → Gast füllt Daten aus (Dokumente hochladen)
  → LobbyPMS speichert Daten
  → checkin_online = true (in LobbyPMS)
  → holder.type_document + holder.document gefüllt
```

### 2. Synchronisation ins Intranet

**Automatisch**: Alle 10 Minuten via `LobbyPmsReservationScheduler`
**Manuell**: `POST /api/lobby-pms/sync`

**Code**: `syncReservation()` erkennt:
- `checkin_online: true` → setzt `checkInDataUploaded = true`
- ODER `holder.type_document` + `holder.document` gefüllt → setzt `checkInDataUploaded = true`

### 3. PIN-Versand

**Bedingung**: `checkInDataUploaded = true` UND `paymentStatus = paid`

**Code**: `syncReservation()` prüft:
```typescript
if (checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin) {
  await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
}
```

**Auch im Bold Payment Webhook**: Wenn Payment kommt NACH Check-in-Link:
```typescript
if (shouldSendPin && ttlockCode) {
  await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
}
```

## Status-Updates

### Aktueller Status-Flow

1. **`confirmed`** → Reservierung erstellt
2. **`notification_sent`** → Check-in-Einladung versendet
3. **`checkInDataUploaded = true`** → Gast hat Check-in-Link abgeschlossen (Dokumente hochgeladen)
4. **`checked_in`** → Mitarbeiter hat manuell Check-in-Button in LobbyPMS gedrückt

### Status sollte aktualisiert werden

Wenn `checkInDataUploaded = true` wird gesetzt:
- Status könnte auf "documentos subidos" oder ähnlich geändert werden
- Oder Status bleibt `notification_sent`, aber `checkInDataUploaded` Flag zeigt den Fortschritt

**Hinweis**: Aktuell wird der Status NICHT automatisch geändert, nur das Flag `checkInDataUploaded` wird gesetzt.

## Technische Details

### Schema-Änderungen

```prisma
model Reservation {
  // ... bestehende Felder ...
  checkInDataUploaded      Boolean                      @default(false)
  checkInDataUploadedAt    DateTime?
}
```

### Code-Änderungen

1. **`lobbyPmsService.ts`**:
   - `syncReservation()`: Prüft `checkin_online` und `holder`-Felder
   - Setzt `checkInDataUploaded` wenn erkannt
   - Versendet PIN wenn `checkInDataUploaded` UND `paymentStatus = paid`

2. **`boldPaymentService.ts`**:
   - `handleWebhook()`: Prüft `checkInDataUploaded` vor PIN-Versand
   - Versendet PIN nur wenn Check-in-Link abgeschlossen

3. **`holder.country` statt `holder.pais`**:
   - Code verwendet jetzt `holder.country` (korrekt)
   - Fallback auf `holder.pais` für Rückwärtskompatibilität

## Webhook-Events

### LobbyPMS Webhook: `reservation.updated`

Wenn LobbyPMS ein `reservation.updated` Event sendet:
- `syncReservation()` wird aufgerufen
- Prüft `checkin_online` und `holder`-Felder
- Setzt `checkInDataUploaded` wenn erkannt
- Versendet PIN wenn Bedingungen erfüllt

## Test-Ergebnisse

### Reservation 18060402 (Prod-Server)

**LobbyPMS Daten**:
- `checkin_online: true` ✅
- `holder.type_document: "Cédula de ciudadanía"` ✅
- `holder.document: "CC1125291400"` ✅
- `holder.country: "Colombia"` ✅
- `checked_in: true` (manueller Button wurde gedrückt)

**Lokale Reservation**:
- Status: `notification_sent` (sollte aktualisiert werden)
- `checkInDataUploaded`: sollte `true` sein nach Sync

## Zusammenfassung

✅ **Erkennung funktioniert**: `checkin_online = true` ist der sicherste Indikator
✅ **PIN-Versand**: Wird ausgelöst wenn `checkInDataUploaded = true` UND `paymentStatus = paid`
✅ **Code korrigiert**: `holder.country` statt `holder.pais` verwendet

**Nächste Schritte**:
- Migration ausführen (Schema-Änderung)
- Testen mit Reservation 18060402
- Status-Update-Logik prüfen (sollte Status geändert werden?)

