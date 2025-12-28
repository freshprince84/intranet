# LobbyPMS Reservation Cancellation Sync - Implementierungsplan V2

**Datum**: 2025-01-26  
**Status**: 📋 Planung (noch nichts ändern)

---

## Problem

Wenn eine Reservation in LobbyPMS gecancelt wird, wird der Status hier nicht synchronisiert. Die Reservation behält ihren alten Status (z.B. `confirmed`) in der lokalen Datenbank, obwohl sie in LobbyPMS den Status `cancelled` hat.

**Wichtig**: LobbyPMS Webhooks sind nicht verfüglich oder nicht aktiv. Lösung muss über automatischen Sync erfolgen.

**Siehe auch**: `docs/analysis/LOBBYPMS_RESERVATION_CANCELLATION_SYNC_PROBLEM_ANALYSE_V2.md`

---

## Lösung

### Konzept: Zwei getrennte Sync-Prozesse

1. **Import neuer Reservationen** (bestehend, unverändert):
   - Prüft `creation_date >= letzte 24 Stunden`
   - Importiert neue Reservationen
   - **Bleibt unverändert**

2. **Aktualisierung bestehender Reservationen** (NEU):
   - Prüft `check_out_date >= heute`
   - Aktualisiert bestehende Reservationen (Status, Payment-Status, etc.)
   - **Neu hinzufügen**

**Warum `check_out_date >= heute`?**
- Deckt alle aktiven Reservationen ab (noch nicht ausgecheckt)
- Auch ältere Reservationen, die noch aktiv sind
- Performance-optimiert (nur aktive Reservationen)

---

## Implementierung

### Schritt 1: Neue Methode für Aktualisierung bestehender Reservationen

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Neue Methode**: `syncExistingReservations()`

**Position**: Nach `syncReservationsByCheckoutDate()` (nach Zeile 1345)

**Code**:
```typescript
/**
 * Aktualisiert bestehende Reservationen (Status, Payment-Status, etc.)
 * 
 * Prüft alle Reservationen mit check_out_date >= heute
 * Aktualisiert bestehende Reservationen in der lokalen DB
 * 
 * WICHTIG: Diese Methode aktualisiert NUR bestehende Reservationen.
 * Neue Reservationen werden durch syncReservations() importiert.
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
  // WICHTIG: fetchReservationsByCheckoutDate filtert nach check_out_date >= today
  const lobbyReservations = await this.fetchReservationsByCheckoutDate(today);
  let updatedCount = 0;

  for (const lobbyReservation of lobbyReservations) {
    try {
      // syncReservation() verwendet upsert, aktualisiert also bestehende Reservationen
      // Wenn Reservation nicht existiert, wird sie erstellt (aber das sollte selten sein)
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

**Wichtig**:
- Verwendet `fetchReservationsByCheckoutDate()` (existiert bereits)
- Ruft `syncReservation()` auf (verwendet `upsert`, aktualisiert bestehende Reservationen)
- Fehlerbehandlung analog zu `syncReservations()`

### Schritt 2: Integration in automatischen Sync

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`

**Methode**: `syncReservationsForBranch()` (Zeile 19-107)

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
  // Aktualisierung ist optional, Import ist kritisch
}
```

**Wichtig**:
- Fehler bei Aktualisierung brechen Import nicht ab
- Import ist kritisch, Aktualisierung ist optional
- Logging für beide Prozesse

### Schritt 3: Logging verbessern

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`

**Methode**: `syncReservationsForBranch()` (Zeile 89)

**Aktueller Code**:
```typescript
logger.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);
```

**Neuer Code**:
```typescript
if (syncedCount > 0 || updatedCount > 0) {
  logger.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} neue Reservierungen importiert, ${updatedCount} bestehende Reservierungen aktualisiert`);
} else {
  logger.log(`[LobbyPmsSync] Branch ${branchId}: Keine Änderungen (${syncedCount} neue, ${updatedCount} aktualisiert)`);
}
```

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
- `syncExistingReservations()` wird aufgerufen
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
3. Warte auf automatischen Sync
4. Prüfe ob Reservation aktualisiert wurde

**Erwartetes Ergebnis**:
- Reservation wird nicht gefunden (check_out_date < heute)
- Status bleibt unverändert
- **Erwartetes Verhalten**: Nur aktive Reservationen werden aktualisiert

### Test-Szenario 5: Neue Reservation wird importiert UND aktualisiert

**Schritte**:
1. Reservation in LobbyPMS erstellen (heute)
2. Warte auf automatischen Sync
3. Reservation in LobbyPMS canceln
4. Warte auf nächsten automatischen Sync
5. Prüfe ob Reservation importiert UND Status aktualisiert wurde

**Erwartetes Ergebnis**:
- Erster Sync: Reservation wird importiert (via `syncReservations()`)
- Zweiter Sync: Reservation wird aktualisiert (via `syncExistingReservations()`)
- Status wird auf `cancelled` aktualisiert

---

## Edge Cases

### Edge Case 1: Reservation existiert nicht in lokaler DB

**Szenario**: LobbyPMS hat Reservation mit `check_out_date >= heute`, aber nicht in lokaler DB

**Verhalten**:
- `syncExistingReservations()` findet Reservation
- `syncReservation()` wird aufgerufen
- `upsert` erstellt neue Reservation
- **Erwartetes Verhalten**: Reservation wird erstellt (auch wenn nicht neu)

**Diskussion**: Ist das ein Problem?
- **Nein**: `syncReservations()` sollte neue Reservationen bereits importiert haben
- **Aber**: Falls nicht (z.B. Sync-Fehler), wird Reservation jetzt erstellt
- **Fazit**: Akzeptables Verhalten

### Edge Case 2: Reservation wurde bereits gelöscht in LobbyPMS

**Szenario**: Reservation existiert in lokaler DB, aber nicht mehr in LobbyPMS

**Verhalten**:
- `fetchReservationsByCheckoutDate()` findet Reservation nicht
- Reservation bleibt in lokaler DB
- **Erwartetes Verhalten**: Reservation bleibt bestehen (Delete-Sync ist separates Feature)

**Hinweis**: Delete-Sync ist in `LOBBYPMS_RESERVATION_DELETE_SYNC_PLAN.md` geplant, aber nicht Teil dieser Implementierung.

### Edge Case 3: API-Fehler während Aktualisierung

**Szenario**: LobbyPMS API gibt Fehler zurück

**Verhalten**:
- Fehler wird in `catch` Block gefangen
- Sync-History mit Fehler wird erstellt
- Weiter mit nächster Reservation
- **Erwartetes Verhalten**: Fehler wird geloggt, aber Sync wird fortgesetzt

### Edge Case 4: Beide Sync-Prozesse finden gleiche Reservation

**Szenario**: Reservation wurde heute erstellt (neue) UND hat `check_out_date >= heute` (bestehende)

**Verhalten**:
- `syncReservations()` findet Reservation → importiert/aktualisiert
- `syncExistingReservations()` findet Reservation → aktualisiert erneut
- **Erwartetes Verhalten**: Kein Problem, `upsert` ist idempotent
- **Performance**: Doppelte API-Calls, aber akzeptabel

**Optimierung (optional)**: Cache bereits verarbeitete Reservationen
- **Nachteil**: Mehr Komplexität
- **Empfehlung**: Nicht implementieren (Performance ist akzeptabel)

---

## Performance-Überlegungen

### Aktuelle Performance

**Import neuer Reservationen**:
- Prüft nur letzte 24 Stunden
- Wenige Reservationen → schnell (~1-10 Reservationen)

**Aktualisierung bestehender Reservationen**:
- Prüft alle Reservationen mit `check_out_date >= heute`
- Mehr Reservationen → langsamer (~10-50 Reservationen)
- **Aber**: Nur aktive Reservationen (nicht ausgecheckt)

**Gesamt**:
- Beide Prozesse laufen nacheinander
- Geschätzte Zeit: 5-30 Sekunden (abhängig von Anzahl Reservationen)

### Optimierungen (optional, später)

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

## Migration / Rollout

### Schrittweise Einführung

1. **Phase 1**: Code implementieren
   - Neue Methode `syncExistingReservations()` hinzufügen
   - Integration in `syncReservationsForBranch()`
   - Code testen

2. **Phase 2**: Testing
   - Test-Szenarien durchführen
   - Logs prüfen
   - Performance prüfen

3. **Phase 3**: Deployment
   - Code deployen
   - Monitoring der ersten Syncs
   - Prüfen ob Status-Updates korrekt funktionieren

### Rollback-Plan

- Code kann einfach zurückgesetzt werden
- Keine Datenbank-Änderungen
- Keine Breaking Changes
- Bestehender Import bleibt unverändert

---

## Dokumentation

### Code-Kommentare

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Kommentar hinzufügen** (bei `syncExistingReservations()`):
```typescript
/**
 * Aktualisiert bestehende Reservationen (Status, Payment-Status, etc.)
 * 
 * Prüft alle Reservationen mit check_out_date >= heute
 * Aktualisiert bestehende Reservationen in der lokalen DB
 * 
 * WICHTIG: Diese Methode aktualisiert NUR bestehende Reservationen.
 * Neue Reservationen werden durch syncReservations() importiert.
 * 
 * @returns Anzahl aktualisierter Reservationen
 */
```

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`

**Kommentar hinzufügen** (bei `syncReservationsForBranch()`):
```typescript
/**
 * Synchronisiert Reservierungen für einen Branch
 * 
 * Führt zwei getrennte Sync-Prozesse aus:
 * 1. Import neuer Reservationen (creation_date >= letzte 24 Stunden)
 * 2. Aktualisierung bestehender Reservationen (check_out_date >= heute)
 * 
 * @param branchId - Branch-ID
 * @param startDate - Startdatum (optional, default: heute)
 * @param endDate - Enddatum (optional, default: +30 Tage)
 * @returns Anzahl synchronisierter Reservierungen
 */
```

### Changelog

**Datei**: `docs/core/CHANGELOG.md`

**Eintrag hinzufügen**:
```markdown
## [Unreleased]

### Added
- Automatischer Sync aktualisiert jetzt auch bestehende Reservationen
- Neue Methode `syncExistingReservations()` für Aktualisierung bestehender Reservationen
- Reservationen mit `check_out_date >= heute` werden automatisch aktualisiert (Status, Payment-Status, etc.)

### Fixed
- Reservationen, die in LobbyPMS gecancelt werden, werden jetzt korrekt synchronisiert
- Status-Updates (cancelled, checked_in, etc.) werden jetzt automatisch synchronisiert
```

---

## Zusammenfassung

### Betroffene Dateien
1. `backend/src/services/lobbyPmsService.ts`
   - Neue Methode: `syncExistingReservations()`

2. `backend/src/services/lobbyPmsReservationSyncService.ts`
   - Änderung: `syncReservationsForBranch()` erweitern

### Neue Features
- Automatische Aktualisierung bestehender Reservationen
- Status-Updates (cancelled, checked_in, etc.) werden synchronisiert
- Payment-Status-Updates werden synchronisiert
- Zwei getrennte Sync-Prozesse: Import neuer + Aktualisierung bestehender

### Risiken
- **Niedrig**: Nur Erweiterung des bestehenden Syncs
- `syncReservation()` funktioniert bereits korrekt (Status-Mapping vorhanden)
- Keine Breaking Changes
- Bestehender Import bleibt unverändert

### Offene Fragen
1. **Performance**: Wie viele Reservationen mit `check_out_date >= heute` gibt es typischerweise?
   - Muss getestet werden
   - Geschätzt: 10-50 Reservationen (akzeptabel)

2. **Doppelte Verarbeitung**: Was wenn Reservation sowohl neu als auch bestehend ist?
   - **Antwort**: Kein Problem, `upsert` ist idempotent
   - **Performance**: Doppelte API-Calls, aber akzeptabel

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

### Analyse-Dokument
- **Datei**: `docs/analysis/LOBBYPMS_RESERVATION_CANCELLATION_SYNC_PROBLEM_ANALYSE_V2.md`

