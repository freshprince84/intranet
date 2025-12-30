# LobbyPMS Sync - Status-Update Problem Analyse

## Problem

**Reservation 18298120** hat einen falschen Status (sowohl Reservation-Status als auch Zahlungsstatus). Diese werden beim automatischen Sync mit LobbyPMS **nicht aktualisiert**.

## Analyse

### 1. Wie funktioniert `syncReservation()`?

**Code:** `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 945-1165)

**Aktueller Code:**
```typescript
// Upsert: Erstelle oder aktualisiere Reservierung
const reservation = await prisma.reservation.upsert({
  where: {
    lobbyReservationId: bookingId
  },
  create: reservationData,
  update: reservationData  // ✅ Aktualisiert ALLE Felder inkl. status und paymentStatus
});
```

**Fazit:** `syncReservation()` **aktualisiert** bestehende Reservierungen korrekt, inklusive:
- `status` (Zeile 1115)
- `paymentStatus` (Zeile 1116)
- Alle anderen Felder

### 2. Wie funktioniert der automatische Sync?

**Code:** `backend/src/services/lobbyPmsReservationScheduler.ts` → `checkAllBranches()` (Zeile 60-128)

**Ablauf:**
1. Scheduler läuft alle 10 Minuten
2. Ruft `LobbyPmsReservationSyncService.syncReservationsForBranch(branchId)` auf
3. Diese ruft `lobbyPmsService.syncReservations(syncStartDate)` auf
4. `syncReservations()` ruft `syncReservation()` für jede gefundene Reservation auf

**Code:** `backend/src/services/lobbyPmsReservationSyncService.ts` → `syncReservationsForBranch()` (Zeile 18-106)

```typescript
// WICHTIG: Immer die letzten 24 Stunden prüfen (Erstellungsdatum)
let syncStartDate: Date;
if (startDate) {
  syncStartDate = startDate;
} else {
  // Immer letzte 24 Stunden (Erstellungsdatum)
  syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  console.log(`[LobbyPmsSync] Branch ${branchId}: Prüfe Reservierungen mit Erstellungsdatum in den letzten 24 Stunden`);
}

const syncedCount = await lobbyPmsService.syncReservations(syncStartDate);
```

**Code:** `backend/src/services/lobbyPmsService.ts` → `syncReservations()` (Zeile 1227-1262)

```typescript
async syncReservations(startDate: Date, endDate?: Date): Promise<number> {
  // WICHTIG: fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
  const lobbyReservations = await this.fetchReservations(startDate, endDate || new Date());
  let syncedCount = 0;

  for (const lobbyReservation of lobbyReservations) {
    try {
      await this.syncReservation(lobbyReservation);  // ✅ Ruft upsert auf
      syncedCount++;
    } catch (error) {
      // Fehlerbehandlung
    }
  }

  return syncedCount;
}
```

### 3. Das Problem

**Reservation 18298120:**
- **Creation Date:** 2025-12-03 20:34:06 (älter als 24 Stunden)
- **Check-out:** 2025-12-08 (in der Zukunft)
- **Status in LobbyPMS:** Vermutlich `checked_in` oder `checked_out`
- **Status in lokaler DB:** Vermutlich `confirmed` (veraltet)

**Warum wird sie nicht aktualisiert?**

1. **Automatischer Sync prüft nur die letzten 24 Stunden nach `creation_date`**
   - Code: `syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000)`
   - Reservation wurde am 2025-12-03 erstellt (älter als 24 Stunden)
   - Daher wird sie **nicht gefunden** von `fetchReservations()`

2. **`fetchReservations()` filtert nach `creation_date`**
   - Code: `backend/src/services/lobbyPmsService.ts` → `fetchReservations()` (Zeile 422-565)
   - Filtert Reservierungen mit `creation_date >= startDate` (Zeile 488)
   - Reservierungen älter als 24 Stunden werden herausgefiltert

3. **Wenn Reservation nicht gefunden wird, wird `syncReservation()` nicht aufgerufen**
   - Daher wird der Status nicht aktualisiert

### 4. Warum funktioniert der manuelle vollständige Sync nicht?

**Manueller vollständiger Sync:**
- Code: `backend/src/services/lobbyPmsService.ts` → `syncReservationsByCheckoutDate()` (Zeile 1183-1226)
- Filtert nach `check_out_date >= gestern` (nicht nach `creation_date`)
- **ABER:** Reservation 18298120 wurde nicht gefunden, weil:
  - Die Pagination zu früh gestoppt hat (siehe vorherige Analyse)
  - Oder die Reservation hat kein `check_out_date` Feld (nur `end_date`)

**Nach dem Fix der Pagination:**
- Reservation sollte jetzt gefunden werden
- `syncReservation()` wird aufgerufen
- Status wird aktualisiert

### 5. Zusammenfassung

**Problem:**
- Der automatische Sync prüft nur Reservierungen mit `creation_date` in den letzten 24 Stunden
- Reservierungen, die älter als 24 Stunden sind, werden nicht gefunden
- Daher werden Status-Updates (Check-in, Payment) nicht synchronisiert

**Lösung:**
1. **Kurzfristig:** Manueller vollständiger Sync (nach Pagination-Fix)
2. **Langfristig:** Automatischer Sync sollte auch Reservierungen mit `check_out_date >= heute` prüfen, unabhängig vom `creation_date`

## Code-Referenzen

### Automatischer Sync
- **Scheduler:** `backend/src/services/lobbyPmsReservationScheduler.ts` → `checkAllBranches()` (Zeile 60-128)
- **Sync Service:** `backend/src/services/lobbyPmsReservationSyncService.ts` → `syncReservationsForBranch()` (Zeile 18-106)
- **LobbyPMS Service:** `backend/src/services/lobbyPmsService.ts` → `syncReservations()` (Zeile 1227-1262)
- **Fetch Reservations:** `backend/src/services/lobbyPmsService.ts` → `fetchReservations()` (Zeile 422-565)

### Manueller vollständiger Sync
- **LobbyPMS Service:** `backend/src/services/lobbyPmsService.ts` → `syncReservationsByCheckoutDate()` (Zeile 1183-1226)
- **Fetch by Checkout:** `backend/src/services/lobbyPmsService.ts` → `fetchReservationsByCheckoutDate()` (Zeile 576-715)

### Status-Update
- **Sync Reservation:** `backend/src/services/lobbyPmsService.ts` → `syncReservation()` (Zeile 945-1165)
- **Status-Mapping:** `backend/src/services/lobbyPmsService.ts` → `mapStatus()` (Zeile 940-976)
- **Payment-Status-Mapping:** `backend/src/services/lobbyPmsService.ts` → `mapPaymentStatus()` (Zeile 979-990)

## Dokumentation

**Bestehende Dokumentation:**
- `docs/technical/LOBBYPMS_SYNC_STATUS_UPDATE.md` - Beschreibt wie Status-Updates funktionieren (aber nicht warum sie manchmal nicht funktionieren)

**Veraltete Dokumentation:**
- `docs/implementation_plans/LOBBYPMS_RESERVATION_DELETE_SYNC_PLAN.md` (Zeile 16-19) - Behauptet, dass `syncReservation()` bestehende Reservierungen nicht aktualisiert, aber das ist **falsch** (Code verwendet `upsert`)

## Empfehlungen

1. **Kurzfristig:**
   - Manueller vollständiger Sync nach Pagination-Fix durchführen
   - Prüfen ob Reservation 18298120 jetzt aktualisiert wird

2. **Langfristig:**
   - Automatischer Sync sollte auch Reservierungen mit `check_out_date >= heute` prüfen
   - Oder: Erweitere Zeitfenster auf z.B. 7 Tage (für Reservierungen, die noch nicht ausgecheckt sind)

3. **Dokumentation:**
   - Aktualisiere `LOBBYPMS_RESERVATION_DELETE_SYNC_PLAN.md` - Entferne falsche Behauptung über `syncReservation()`
   - Erweitere `LOBBYPMS_SYNC_STATUS_UPDATE.md` um Erklärung, warum Status-Updates manchmal nicht funktionieren





















