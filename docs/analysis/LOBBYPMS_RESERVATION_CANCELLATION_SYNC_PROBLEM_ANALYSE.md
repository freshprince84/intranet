# LobbyPMS Reservation Cancellation Sync - Problem Analyse

**Datum**: 2025-01-26  
**Status**: 📋 Analyse abgeschlossen, Planung erstellt

---

## Problem

Wenn eine Reservation in LobbyPMS gecancelt wird, wird der Status hier nicht synchronisiert. Die Reservation behält ihren alten Status (z.B. `confirmed`) in der lokalen Datenbank, obwohl sie in LobbyPMS den Status `cancelled` hat.

---

## Analyse

### 1. Aktueller Code-Zustand

#### 1.1 `syncReservation()` - Status-Mapping funktioniert

**Datei**: `backend/src/services/lobbyPmsService.ts` (Zeile 946-1205)

**Status-Mapping**:
- Zeile 956-957: `'cancelled'` → `ReservationStatus.cancelled`
- Zeile 967-968: `'cancelado'` → `ReservationStatus.cancelled`

**Upsert-Logik**:
- Zeile 1159-1165: Verwendet `prisma.reservation.upsert()`
- Aktualisiert bestehende Reservationen korrekt
- Setzt Status auf `cancelled`, wenn LobbyPMS Status `cancelled` ist

**Fazit**: `syncReservation()` würde den Status korrekt aktualisieren, wenn sie aufgerufen wird.

#### 1.2 Webhook-Handler - `reservation.cancelled` wird NICHT behandelt

**Datei**: `backend/src/controllers/lobbyPmsController.ts` (Zeile 308-416)

**Behandelte Events**:
- Zeile 375-379: `reservation.created` und `reservation.updated` → ruft `syncReservation()` auf ✅
- Zeile 382-400: `reservation.status_changed` und `reservation.checked_in` → behandelt nur `checked_in` Status ❌
- Zeile 403-404: `default` Case → nur Logging, keine Behandlung ❌

**Kommentar** (Zeile 302-306):
- Erwähnt `reservation.cancelled` als mögliches Event
- Wird aber NICHT im Switch-Statement behandelt

**Problem**:
- Wenn LobbyPMS ein `reservation.cancelled` Event sendet, wird es nicht behandelt
- Wenn LobbyPMS ein `reservation.status_changed` Event mit Status `cancelled` sendet, wird es nicht behandelt (nur `checked_in` wird behandelt)

#### 1.3 Automatischer Sync - Findet nur Reservationen der letzten 24 Stunden

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts` (Zeile 19-107)

**Sync-Logik**:
- Zeile 78: `syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000)` (letzte 24 Stunden)
- Zeile 87: Ruft `lobbyPmsService.syncReservations(syncStartDate)` auf

**Datei**: `backend/src/services/lobbyPmsService.ts` (Zeile 1354-1389)

**Sync-Logik**:
- Zeile 1361: `fetchReservations(startDate)` filtert nach `creation_date >= startDate`
- Zeile 1366: Ruft `syncReservation()` für jede gefundene Reservation auf

**Problem**:
- Wenn eine Reservation älter als 24 Stunden ist und in LobbyPMS gecancelt wird, wird sie nicht gefunden
- Daher wird `syncReservation()` nicht aufgerufen
- Status wird nicht aktualisiert

---

## Ursachen

### Ursache 1: Webhook-Handler behandelt `reservation.cancelled` nicht

**Code-Stelle**: `backend/src/controllers/lobbyPmsController.ts` (Zeile 374-401)

**Aktueller Code**:
```typescript
switch (event) {
  case 'reservation.created':
  case 'reservation.updated':
    if (data?.id) {
      await service.syncReservation(data);
    }
    break;

  case 'reservation.status_changed':
  case 'reservation.checked_in':
    // Behandelt nur checked_in, nicht cancelled
    if (data?.id) {
      await service.updateReservationStatus(data.id, data.status || 'checked_in');
      // ...
    }
    break;

  default:
    logger.log(`[LobbyPMS Webhook] Unbekanntes Event: ${event}`);
}
```

**Problem**:
- `reservation.cancelled` fällt in `default` Case → nur Logging
- `reservation.status_changed` mit Status `cancelled` wird nicht behandelt (nur `checked_in`)

### Ursache 2: Automatischer Sync findet nur Reservationen der letzten 24 Stunden

**Code-Stelle**: `backend/src/services/lobbyPmsReservationSyncService.ts` (Zeile 78)

**Aktueller Code**:
```typescript
syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
```

**Problem**:
- Reservationen, die älter als 24 Stunden sind, werden nicht gefunden
- Wenn eine Reservation gecancelt wird, wird sie nicht synchronisiert (außer sie wurde in den letzten 24 Stunden erstellt)

---

## Lösung

### Lösung 1: Webhook-Handler erweitern

**Datei**: `backend/src/controllers/lobbyPmsController.ts`

**Änderungen**:
1. `reservation.cancelled` Event behandeln → `syncReservation()` aufrufen
2. `reservation.status_changed` Event erweitern → auch `cancelled` Status behandeln

**Option A**: `reservation.cancelled` als separater Case
```typescript
case 'reservation.cancelled':
  if (data?.id) {
    await service.syncReservation(data);
  }
  break;
```

**Option B**: `reservation.status_changed` erweitern
```typescript
case 'reservation.status_changed':
  if (data?.id) {
    // Wenn Status cancelled ist, syncReservation aufrufen (für vollständige Synchronisation)
    if (data.status === 'cancelled' || data.status === 'cancelado') {
      await service.syncReservation(data);
    } else {
      // Für andere Status (checked_in, etc.) bestehende Logik verwenden
      await service.updateReservationStatus(data.id, data.status || 'checked_in');
      // ...
    }
  }
  break;
```

**Empfehlung**: Option A + Option B kombinieren (beide Events behandeln)

### Lösung 2: Automatischer Sync erweitern (optional, langfristig)

**Problem**: Automatischer Sync findet nur Reservationen der letzten 24 Stunden

**Lösung**: Sync auch Reservationen mit `check_out_date >= heute` prüfen, unabhängig vom `creation_date`

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Neue Methode**: `syncReservationsByCheckoutDate()` existiert bereits (Zeile 1302-1345)
- Filtert nach `check_out_date >= gestern`
- Wird aber nicht automatisch vom Scheduler aufgerufen

**Option A**: Scheduler erweitern
- Zusätzlich zu `syncReservations()` auch `syncReservationsByCheckoutDate()` aufrufen
- Deckt alle aktiven Reservationen ab (auch ältere, die noch nicht ausgecheckt sind)

**Option B**: `syncReservations()` erweitern
- Zusätzlich zu `creation_date` Filter auch `check_out_date >= heute` prüfen
- Kombiniert beide Filter (OR-Logik)

**Empfehlung**: Lösung 1 ist ausreichend für das aktuelle Problem. Lösung 2 ist optional für langfristige Verbesserung.

---

## Implementierungsplan

### Schritt 1: Webhook-Handler erweitern

**Datei**: `backend/src/controllers/lobbyPmsController.ts`

**Änderungen**:
1. `reservation.cancelled` Case hinzufügen
2. `reservation.status_changed` Case erweitern (auch `cancelled` behandeln)

**Code**:
```typescript
switch (event) {
  case 'reservation.created':
  case 'reservation.updated':
    if (data?.id) {
      await service.syncReservation(data);
    }
    break;

  case 'reservation.cancelled':
    // NEU: Behandle cancellation Event
    if (data?.id) {
      await service.syncReservation(data);
    }
    break;

  case 'reservation.status_changed':
  case 'reservation.checked_in':
    if (data?.id) {
      // NEU: Wenn Status cancelled ist, syncReservation aufrufen
      if (data.status === 'cancelled' || data.status === 'cancelado') {
        await service.syncReservation(data);
      } else {
        // Bestehende Logik für checked_in
        await service.updateReservationStatus(data.id, data.status || 'checked_in');
        const localReservation = await prisma.reservation.findUnique({
          where: { lobbyReservationId: data.id }
        });
        if (localReservation) {
          await prisma.reservation.update({
            where: { id: localReservation.id },
            data: {
              status: data.status === 'checked_in' ? 'checked_in' : localReservation.status,
              onlineCheckInCompleted: data.status === 'checked_in',
              onlineCheckInCompletedAt: data.status === 'checked_in' ? new Date() : null
            }
          });
        }
      }
    }
    break;

  default:
    logger.log(`[LobbyPMS Webhook] Unbekanntes Event: ${event}`);
}
```

### Schritt 2: Testing

**Test-Szenarien**:
1. **Webhook `reservation.cancelled`**:
   - Reservation in LobbyPMS manuell canceln
   - Webhook sollte empfangen werden
   - Status sollte auf `cancelled` aktualisiert werden

2. **Webhook `reservation.status_changed` mit Status `cancelled`**:
   - Reservation in LobbyPMS Status auf `cancelled` ändern
   - Webhook sollte empfangen werden
   - Status sollte auf `cancelled` aktualisiert werden

3. **Automatischer Sync** (für Reservationen der letzten 24 Stunden):
   - Reservation in LobbyPMS canceln (innerhalb der letzten 24 Stunden erstellt)
   - Automatischer Sync sollte Status aktualisieren

4. **Automatischer Sync** (für ältere Reservationen):
   - Reservation älter als 24 Stunden in LobbyPMS canceln
   - Automatischer Sync sollte Status NICHT aktualisieren (erwartetes Verhalten, da nur letzte 24 Stunden)
   - Webhook sollte Status aktualisieren (Lösung 1)

---

## Zusammenfassung

### Problem
- Reservationen, die in LobbyPMS gecancelt werden, werden hier nicht synchronisiert
- Status bleibt auf altem Wert (z.B. `confirmed`)

### Ursachen
1. Webhook-Handler behandelt `reservation.cancelled` nicht
2. Webhook-Handler behandelt `reservation.status_changed` nur für `checked_in`, nicht für `cancelled`
3. Automatischer Sync findet nur Reservationen der letzten 24 Stunden

### Lösung
1. **Kurzfristig**: Webhook-Handler erweitern → `reservation.cancelled` und `reservation.status_changed` mit Status `cancelled` behandeln
2. **Langfristig (optional)**: Automatischer Sync erweitern → auch Reservationen mit `check_out_date >= heute` prüfen

### Betroffene Dateien
1. `backend/src/controllers/lobbyPmsController.ts` - Webhook-Handler erweitern

### Risiko
- **Niedrig**: Nur Webhook-Handler wird erweitert
- `syncReservation()` funktioniert bereits korrekt (Status-Mapping vorhanden)
- Keine Breaking Changes

---

## Code-Referenzen

### Webhook-Handler
- **Datei**: `backend/src/controllers/lobbyPmsController.ts`
- **Methode**: `handleWebhook()` (Zeile 308-416)
- **Switch-Statement**: Zeile 374-401

### Status-Synchronisation
- **Datei**: `backend/src/services/lobbyPmsService.ts`
- **Methode**: `syncReservation()` (Zeile 946-1205)
- **Status-Mapping**: Zeile 949-977
- **Upsert**: Zeile 1159-1165

### Automatischer Sync
- **Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`
- **Methode**: `syncReservationsForBranch()` (Zeile 19-107)
- **Sync-Zeitraum**: Zeile 78 (letzte 24 Stunden)

---

## Offene Fragen

1. **Welche Events sendet LobbyPMS bei Cancellation?**
   - `reservation.cancelled`?
   - `reservation.status_changed` mit Status `cancelled`?
   - Beide?
   - Muss getestet werden

2. **Soll automatischer Sync erweitert werden?**
   - Aktuell: Nur letzte 24 Stunden
   - Option: Auch Reservationen mit `check_out_date >= heute`
   - Empfehlung: Erst Lösung 1 implementieren, dann optional Lösung 2

3. **Soll `syncReservationsByCheckoutDate()` automatisch aufgerufen werden?**
   - Existiert bereits (Zeile 1302-1345)
   - Wird aber nicht automatisch vom Scheduler aufgerufen
   - Empfehlung: Optional, nach Lösung 1 prüfen

