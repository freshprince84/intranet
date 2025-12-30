# LobbyPMS Reservation Cancellation Sync - Problem Analyse V2

**Datum**: 2025-01-26  
**Status**: 📋 Analyse abgeschlossen, Planung erstellt

---

## Problem

Wenn eine Reservation in LobbyPMS gecancelt wird, wird der Status hier nicht synchronisiert. Die Reservation behält ihren alten Status (z.B. `confirmed`) in der lokalen Datenbank, obwohl sie in LobbyPMS den Status `cancelled` hat.

---

## Wichtige Erkenntnis: LobbyPMS Webhooks

**Status**: Unklar, ob LobbyPMS Webhooks tatsächlich sendet

**Code-Analyse**:
- Webhook-Handler existiert (`backend/src/controllers/lobbyPmsController.ts`)
- Hat TODOs und scheint nicht aktiv verwendet zu werden
- Keine Dokumentation, dass LobbyPMS Webhooks sendet
- Bold Payment Webhooks werden definitiv verwendet (für Zahlungsstatus)

**Fazit**: Wir können nicht auf LobbyPMS Webhooks verlassen. Lösung muss über automatischen Sync erfolgen.

---

## Analyse: Automatischer Sync

### Aktueller Zustand

#### 1. Automatischer Sync - Import neuer Reservationen

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts` (Zeile 19-107)

**Ablauf**:
1. Scheduler läuft alle 10 Minuten (`lobbyPmsReservationScheduler.ts`)
2. Ruft `syncReservationsForBranch()` auf
3. `syncReservationsForBranch()` ruft `syncReservations(startDate)` auf
4. `syncReservations()` filtert nach `creation_date >= startDate` (letzte 24 Stunden)
5. Ruft `syncReservation()` für jede gefundene Reservation auf

**Zweck**: Import neuer Reservationen (die in den letzten 24 Stunden erstellt wurden)

**Problem**: Findet nur neue Reservationen, nicht bestehende, die aktualisiert werden müssen

#### 2. `syncReservation()` - Aktualisiert bestehende Reservationen

**Datei**: `backend/src/services/lobbyPmsService.ts` (Zeile 946-1205)

**Logik**:
- Zeile 999-1002: Prüft ob Reservation existiert
- Zeile 1159-1165: Verwendet `prisma.reservation.upsert()`
- **Wichtig**: Aktualisiert bestehende Reservationen korrekt (Status, Payment-Status, etc.)

**Fazit**: `syncReservation()` würde bestehende Reservationen korrekt aktualisieren, wenn sie aufgerufen wird.

#### 3. `syncReservationsByCheckoutDate()` - Existiert bereits

**Datei**: `backend/src/services/lobbyPmsService.ts` (Zeile 1302-1345)

**Logik**:
- Filtert nach `check_out_date >= gestern`
- Ruft `syncReservation()` für jede gefundene Reservation auf
- **Wichtig**: Wird aber NICHT automatisch vom Scheduler aufgerufen

**Zweck**: Für manuellen vollständigen Sync

---

## Ursache

### Hauptursache: Automatischer Sync prüft nur neue Reservationen

**Problem**:
1. Automatischer Sync prüft nur Reservationen mit `creation_date` in den letzten 24 Stunden
2. Bestehende Reservationen, die gecancelt werden, haben ein älteres `creation_date`
3. Daher werden sie nicht gefunden und nicht aktualisiert

**Beispiel**:
- Reservation wurde am 2025-01-20 erstellt (`creation_date = 2025-01-20`)
- Wird am 2025-01-26 in LobbyPMS gecancelt
- Automatischer Sync prüft nur `creation_date >= 2025-01-25` (letzte 24h)
- Reservation wird nicht gefunden → Status wird nicht aktualisiert

---

## Lösung

### Lösung: Automatischer Sync erweitern

**Konzept**: Zwei getrennte Sync-Prozesse

1. **Import neuer Reservationen** (bestehend):
   - Prüft `creation_date >= letzte 24 Stunden`
   - Importiert neue Reservationen
   - **Unverändert bleiben**

2. **Aktualisierung bestehender Reservationen** (NEU):
   - Prüft `check_out_date >= heute`
   - Aktualisiert bestehende Reservationen (Status, Payment-Status, etc.)
   - **Neu hinzufügen**

**Warum `check_out_date >= heute`?**
- Deckt alle aktiven Reservationen ab (noch nicht ausgecheckt)
- Auch ältere Reservationen, die noch aktiv sind
- Performance-optimiert (nur aktive Reservationen)

**Alternative**: `check_out_date >= gestern` (wie in `syncReservationsByCheckoutDate()`)
- Deckt auch gestern ausgecheckte Reservationen ab
- Mehr Reservationen zu prüfen = langsamer
- **Empfehlung**: `check_out_date >= heute` (nur aktive Reservationen)

---

## Implementierung

### Schritt 1: Neue Methode für Aktualisierung bestehender Reservationen

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Neue Methode**: `syncExistingReservations()`

**Logik**:
1. Hole alle Reservationen von LobbyPMS mit `check_out_date >= heute`
2. Für jede Reservation: Rufe `syncReservation()` auf
3. `syncReservation()` aktualisiert bestehende Reservationen (via `upsert`)

**Code**:
```typescript
/**
 * Aktualisiert bestehende Reservationen (Status, Payment-Status, etc.)
 * 
 * Prüft alle Reservationen mit check_out_date >= heute
 * Aktualisiert bestehende Reservationen in der lokalen DB
 * 
 * @returns Anzahl aktualisierter Reservationen
 */
async syncExistingReservations(): Promise<number> {
  // Lade Settings falls noch nicht geladen
  if (!this.apiKey) {
    await this.loadSettings();
  }

  // Filter nach check_out_date >= heute
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  logger.log(`[LobbyPMS] Starte Aktualisierung bestehender Reservationen mit check_out_date >= ${today.toISOString()}`);

  // Rufe fetchReservationsByCheckoutDate auf
  const lobbyReservations = await this.fetchReservationsByCheckoutDate(today);
  let updatedCount = 0;

  for (const lobbyReservation of lobbyReservations) {
    try {
      // syncReservation() verwendet upsert, aktualisiert also bestehende Reservationen
      await this.syncReservation(lobbyReservation);
      updatedCount++;
    } catch (error) {
      const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
      logger.error(`[LobbyPMS] Fehler beim Aktualisieren der Reservierung ${bookingId}:`, error);
      // Erstelle Sync-History mit Fehler
      const existingReservation = await prisma.reservation.findUnique({
        where: { lobbyReservationId: bookingId }
      });
      if (existingReservation) {
        await prisma.reservationSyncHistory.create({
          data: {
            reservationId: existingReservation.id,
            syncType: 'error',
            syncData: lobbyReservation as any,
            errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler'
          }
        });
      }
    }
  }

  logger.log(`[LobbyPMS] Aktualisierung abgeschlossen: ${updatedCount} Reservationen aktualisiert`);
  return updatedCount;
}
```

### Schritt 2: Integration in automatischen Sync

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`

**Methode**: `syncReservationsForBranch()` erweitern

**Aktueller Code** (Zeile 87):
```typescript
const syncedCount = await lobbyPmsService.syncReservations(syncStartDate);
```

**Neuer Code**:
```typescript
// 1. Import neuer Reservationen (letzte 24 Stunden)
const syncedCount = await lobbyPmsService.syncReservations(syncStartDate);

// 2. NEU: Aktualisiere bestehende Reservationen (check_out_date >= heute)
let updatedCount = 0;
try {
  updatedCount = await lobbyPmsService.syncExistingReservations();
  if (updatedCount > 0) {
    logger.log(`[LobbyPmsSync] Branch ${branchId}: ${updatedCount} bestehende Reservationen aktualisiert`);
  }
} catch (error) {
  logger.error(`[LobbyPmsSync] Fehler beim Aktualisieren bestehender Reservationen für Branch ${branchId}:`, error);
  // Fehler nicht weiterwerfen, da Import erfolgreich war
}
```

**Alternative**: Separater Scheduler für Aktualisierung
- Vorteil: Kann unterschiedliche Intervalle haben (z.B. alle 30 Minuten)
- Nachteil: Mehr Komplexität
- **Empfehlung**: Integration in bestehenden Sync (einfacher)

---

## Performance-Überlegungen

### Aktuelle Performance

**Import neuer Reservationen**:
- Prüft nur letzte 24 Stunden
- Wenige Reservationen → schnell

**Aktualisierung bestehender Reservationen**:
- Prüft alle Reservationen mit `check_out_date >= heute`
- Mehr Reservationen → langsamer
- **Aber**: Nur aktive Reservationen (nicht ausgecheckt)

### Optimierungen

1. **Caching**: Reservationen, die bereits aktualisiert wurden, nicht erneut prüfen
   - **Problem**: Wie erkennen, ob aktualisiert wurde?
   - **Lösung**: `lobbyPmsLastSyncAt` pro Reservation (komplex)
   - **Empfehlung**: Nicht implementieren (zu komplex)

2. **Batch-Processing**: Mehrere Reservationen parallel verarbeiten
   - **Vorteil**: Schneller
   - **Nachteil**: Mehr API-Calls, könnte Rate-Limiting erreichen
   - **Empfehlung**: Nicht implementieren (zu riskant)

3. **Intelligentes Filtering**: Nur Reservationen prüfen, die sich geändert haben könnten
   - **Problem**: LobbyPMS API unterstützt kein "changed_since" Filter
   - **Lösung**: Nicht möglich

**Fazit**: Einfache Implementierung ist ausreichend. Performance sollte akzeptabel sein.

---

## Testing

### Test-Szenario 1: Reservation wird gecancelt

**Schritte**:
1. Reservation in LobbyPMS erstellen (z.B. am 2025-01-20)
2. Reservation in lokaler DB importieren (Status: `confirmed`)
3. Reservation in LobbyPMS canceln (Status: `cancelled`)
4. Warte auf automatischen Sync (alle 10 Minuten)
5. Prüfe ob Status auf `cancelled` aktualisiert wurde

**Erwartetes Ergebnis**:
- Automatischer Sync findet Reservation (check_out_date >= heute)
- `syncReservation()` wird aufgerufen
- Status wird auf `cancelled` aktualisiert

### Test-Szenario 2: Reservation wird checked_in

**Schritte**:
1. Reservation in LobbyPMS erstellen
2. Reservation in lokaler DB importieren (Status: `confirmed`)
3. Reservation in LobbyPMS check-in durchführen (Status: `checked_in`)
4. Warte auf automatischen Sync
5. Prüfe ob Status auf `checked_in` aktualisiert wurde

**Erwartetes Ergebnis**:
- Automatischer Sync findet Reservation
- Status wird auf `checked_in` aktualisiert

### Test-Szenario 3: Payment-Status wird aktualisiert

**Schritte**:
1. Reservation in LobbyPMS erstellen
2. Reservation in lokaler DB importieren (Payment-Status: `pending`)
3. Zahlung in LobbyPMS registrieren (Payment-Status: `paid`)
4. Warte auf automatischen Sync
5. Prüfe ob Payment-Status auf `paid` aktualisiert wurde

**Erwartetes Ergebnis**:
- Payment-Status wird aktualisiert

### Test-Szenario 4: Bereits ausgecheckte Reservation

**Schritte**:
1. Reservation mit `check_out_date = gestern` in LobbyPMS
2. Reservation in lokaler DB (Status: `checked_out`)
3. Reservation in LobbyPMS canceln (sollte nicht möglich sein, aber testen)
4. Warte auf automatischen Sync
5. Prüfe ob Status aktualisiert wurde

**Erwartetes Ergebnis**:
- Reservation wird nicht gefunden (check_out_date < heute)
- Status bleibt unverändert
- **Erwartetes Verhalten**: Nur aktive Reservationen werden aktualisiert

---

## Edge Cases

### Edge Case 1: Reservation existiert nicht in lokaler DB

**Szenario**: LobbyPMS hat Reservation mit `check_out_date >= heute`, aber nicht in lokaler DB

**Verhalten**:
- `syncReservation()` wird aufgerufen
- `upsert` erstellt neue Reservation
- **Erwartetes Verhalten**: Reservation wird erstellt (auch wenn nicht neu)

### Edge Case 2: Reservation wurde bereits gelöscht in LobbyPMS

**Szenario**: Reservation existiert in lokaler DB, aber nicht mehr in LobbyPMS

**Verhalten**:
- `fetchReservationsByCheckoutDate()` findet Reservation nicht
- Reservation bleibt in lokaler DB
- **Erwartetes Verhalten**: Reservation bleibt bestehen (Delete-Sync ist separates Feature)

### Edge Case 3: API-Fehler während Aktualisierung

**Szenario**: LobbyPMS API gibt Fehler zurück

**Verhalten**:
- Fehler wird in `catch` Block gefangen
- Sync-History mit Fehler wird erstellt
- Weiter mit nächster Reservation
- **Erwartetes Verhalten**: Fehler wird geloggt, aber Sync wird fortgesetzt

---

## Zusammenfassung

### Problem
- Reservationen, die in LobbyPMS gecancelt werden, werden hier nicht synchronisiert
- Status bleibt auf altem Wert (z.B. `confirmed`)

### Ursache
- Automatischer Sync prüft nur neue Reservationen (letzte 24h)
- Bestehende Reservationen werden nicht aktualisiert

### Lösung
- Automatischen Sync erweitern
- Zusätzlich bestehende Reservationen mit `check_out_date >= heute` prüfen
- `syncReservation()` aktualisiert bestehende Reservationen (via `upsert`)

### Betroffene Dateien
1. `backend/src/services/lobbyPmsService.ts` - Neue Methode `syncExistingReservations()`
2. `backend/src/services/lobbyPmsReservationSyncService.ts` - Integration in `syncReservationsForBranch()`

### Risiko
- **Niedrig**: Nur Erweiterung des bestehenden Syncs
- `syncReservation()` funktioniert bereits korrekt (Status-Mapping vorhanden)
- Keine Breaking Changes

---

## Code-Referenzen

### Automatischer Sync
- **Scheduler**: `backend/src/services/lobbyPmsReservationScheduler.ts`
- **Sync Service**: `backend/src/services/lobbyPmsReservationSyncService.ts` (Zeile 19-107)
- **LobbyPMS Service**: `backend/src/services/lobbyPmsService.ts`
  - `syncReservations()` (Zeile 1354-1389) - Import neuer Reservationen
  - `syncReservationsByCheckoutDate()` (Zeile 1302-1345) - Existiert bereits
  - `fetchReservationsByCheckoutDate()` (Zeile 577-708) - Filtert nach check_out_date

### Status-Synchronisation
- **Datei**: `backend/src/services/lobbyPmsService.ts`
- **Methode**: `syncReservation()` (Zeile 946-1205)
- **Status-Mapping**: Zeile 949-977
- **Upsert**: Zeile 1159-1165


