# LobbyPMS Reservation Delete Sync - Implementierungsplan

## Problem

Aktuell werden Reservationen aus LobbyPMS importiert, aber wenn eine Reservation in LobbyPMS gelöscht wird, bleibt sie in der lokalen Datenbank bestehen. Es gibt keine Synchronisation für gelöschte Reservationen.

**WICHTIG: Unterschied zwischen "gecancelt" und "gelöscht"**
- **Gecancelte Reservationen**: Werden noch in der LobbyPMS API zurückgegeben, nur mit Status `'cancelled'`
- **Gelöschte Reservationen**: Werden NICHT mehr in der LobbyPMS API zurückgegeben (komplett entfernt)
- **Aktuelles Problem**: Gelöschte Reservationen bleiben in der lokalen DB bestehen

## ⚠️ WICHTIG: Code-Änderungen seit Plan-Erstellung

Der Code wurde seit der ursprünglichen Plan-Erstellung geändert. Wichtige Änderungen:

1. **`syncReservation()` (lobbyPmsService.ts, Zeile 924-934)**:
   - **Früher**: `upsert` (erstellt oder aktualisiert)
   - **Jetzt**: Prüft ob existiert → wenn ja, return existing; wenn nein → `create`
   - **Konsequenz**: Bestehende Reservationen werden NICHT mehr aktualisiert

2. **`syncReservations()` (lobbyPmsService.ts, Zeile 978-990)**:
   - **Neu**: Doppelte Prüfung, ob Reservation existiert
   - Wenn existiert → `continue` (überspringen)
   - **Konsequenz**: Nur neue Reservationen werden importiert

3. **`syncReservationsForBranch()` (lobbyPmsReservationSyncService.ts, Zeile 69-79)**:
   - **WICHTIG**: Verwendet IMMER die letzten 24 Stunden (Erstellungsdatum)
   - `lobbyPmsLastSyncAt` wird NICHT mehr für die Bestimmung des Startdatums verwendet
   - Wird aber trotzdem gespeichert (für andere Zwecke?)

**Auswirkung auf Delete-Check**:
- Wir müssen ALLE Reservationen von LobbyPMS sammeln (auch die, die bereits existieren)
- IDs müssen BEVOR der Existenz-Check gesammelt werden
- Zeitraum für Delete-Check: 60 Tage vor bis 90 Tage nach (da wir nicht nach `creation_date` filtern können)

## Aktueller Ablauf

1. **Scheduler** (`lobbyPmsReservationScheduler.ts`):
   - Läuft alle 10 Minuten
   - Ruft `LobbyPmsReservationSyncService.syncReservationsForBranch(branchId)` auf

2. **Sync Service** (`lobbyPmsReservationSyncService.ts`):
   - **WICHTIG**: Verwendet IMMER die letzten 24 Stunden (Erstellungsdatum) als `syncStartDate`
   - `lobbyPmsLastSyncAt` wird NICHT mehr für die Bestimmung des Startdatums verwendet
   - Ruft `lobbyPmsService.syncReservations(syncStartDate)` auf

3. **LobbyPMS Service** (`lobbyPmsService.ts`):
   - `syncReservations()` ruft `fetchReservations(startDate)` auf
   - Filtert nach `creation_date >= startDate`
   - Iteriert durch alle gefundenen Reservationen
   - **WICHTIG**: Prüft ob Reservation bereits existiert (Zeile 983-990)
   - Wenn existiert → `continue` (überspringen)
   - Wenn nicht existiert → ruft `syncReservation()` auf
   - `syncReservation()` macht KEIN `upsert` mehr, sondern:
     - Prüft ob existiert → wenn ja, return existing
     - Wenn nicht → `create` (nur neue Reservationen werden erstellt)
   - **PROBLEM**: Reservationen, die in LobbyPMS gelöscht wurden, werden nicht mehr von der API zurückgegeben und bleiben in der lokalen DB

## Lösung: Delete-Sync implementieren

### Konzept

Nach dem Import aller Reservationen von LobbyPMS:
1. Sammle alle `lobbyReservationId`s aus den geholten Reservationen
2. Finde alle Reservationen in der lokalen DB, die:
   - `branchId` = aktueller Branch haben
   - `lobbyReservationId` nicht null ist
   - `lobbyReservationId` **nicht** in der Liste der geholten Reservationen ist
   - Innerhalb des Sync-Zeitraums liegen (basierend auf `creation_date` oder `checkInDate`)
3. Lösche diese Reservationen (mit Cascade-Delete für Sync-History und Notification-Logs)
4. Erstelle Sync-History-Einträge für gelöschte Reservationen

### Wichtige Details

- **Zeitraum für Delete-Check**: 
  - Der Sync prüft IMMER die letzten 24 Stunden (Erstellungsdatum in LobbyPMS)
  - Aber: Wir können nicht nach `creation_date` filtern, da wir diese nicht in der DB haben
  - **Lösung**: Filtere nach `checkInDate` innerhalb eines erweiterten Zeitraums
  - **Performance-Überlegung**: 
    - **Option A (Empfohlen)**: `checkInDate` zwischen `now() - 1 Tag` und `now() + 90 Tage`
      - Deckt alle Reservationen ab, die in den letzten 24 Stunden erstellt wurden
      - Bessere Performance (weniger Reservationen zu prüfen)
      - **Risiko**: Sehr alte Reservationen (Check-in vor mehr als 1 Tag), die in den letzten 24h erstellt wurden, werden nicht gefunden
    - **Option B (Sicherer)**: `checkInDate` zwischen `now() - 60 Tage` und `now() + 90 Tage`
      - Deckt auch ältere Reservationen ab, die in den letzten 24h erstellt wurden
      - Schlechtere Performance (mehr Reservationen zu prüfen)
  - **Alternative**: Filtere nach `createdAt` in der lokalen DB (wann wurde die Reservation erstellt/importiert)
    - **Vorteil**: Genauer (nur Reservationen, die in den letzten 24h importiert wurden)
    - **Nachteil**: Erfordert, dass `createdAt` korrekt gesetzt ist (wird beim Import gesetzt)

- **Branch-Filter**: 
  - Wichtig: Nur Reservationen des aktuellen Branches löschen
  - `branchId` muss gesetzt sein

- **LobbyReservationId**:
  - Nur Reservationen mit `lobbyReservationId` prüfen (nicht null)
  - Reservationen ohne `lobbyReservationId` sind manuell erstellt und sollten nicht gelöscht werden

- **Status-Abgleich (Alternative zu Löschen)**:
  - **WICHTIG**: Gecancelte Reservationen werden noch in der API zurückgegeben (mit Status `'cancelled'`)
  - **Aktuelles Problem**: Bestehende Reservationen werden NICHT aktualisiert (nur neue werden erstellt)
  - **Frage**: Sollen gecancelte Reservationen aktualisiert werden (Status auf `cancelled` setzen)?
  - **Empfehlung**: 
    - **Löschen**: Nur Reservationen, die komplett aus LobbyPMS entfernt wurden (nicht mehr in API)
    - **Status-Update**: Sollte separat implementiert werden (Update bestehender Reservationen)

## Implementierung

### Schritt 1: Neue Methode in `lobbyPmsService.ts`

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Methode**: `deleteMissingReservations()`

```typescript
/**
 * Löscht Reservationen, die in LobbyPMS nicht mehr existieren
 * 
 * @param lobbyReservationIds - Array von lobbyReservationIds, die noch in LobbyPMS existieren
 * @returns Anzahl gelöschter Reservationen
 */
private async deleteMissingReservations(
  lobbyReservationIds: string[]
): Promise<number> {
  if (!this.branchId) {
    throw new Error('LobbyPmsService.deleteMissingReservations: branchId ist nicht gesetzt!');
  }

  // WICHTIG: Performance-optimierter Zeitraum
  // - Start: 1 Tag in der Vergangenheit (Performance: weniger Reservationen zu prüfen)
  // - Ende: 90 Tage in der Zukunft (um auch zukünftige Reservationen zu finden)
  // Dies deckt alle Reservationen ab, die in den letzten 24 Stunden erstellt wurden
  // (auch wenn Check-in in der Zukunft liegt)
  // 
  // ALTERNATIVE (sicherer, aber langsamer): 60 Tage in der Vergangenheit
  // - Deckt auch sehr alte Reservationen ab, die in den letzten 24h erstellt wurden
  // - Aber: Mehr Reservationen zu prüfen = schlechtere Performance
  const now = new Date();
  const searchStartDate = new Date(now);
  searchStartDate.setDate(searchStartDate.getDate() - 1); // 1 Tag vor (Performance-optimiert)
  // ALTERNATIVE: searchStartDate.setDate(searchStartDate.getDate() - 60); // 60 Tage vor (sicherer)
  
  const searchEndDate = new Date(now);
  searchEndDate.setDate(searchEndDate.getDate() + 90);

  // Finde alle Reservationen in der lokalen DB, die:
  // 1. Zu diesem Branch gehören
  // 2. Eine lobbyReservationId haben (nicht manuell erstellt)
  // 3. Check-in-Datum innerhalb des erweiterten Zeitraums liegt
  // 4. lobbyReservationId NICHT in der Liste der existierenden Reservationen ist
  const reservationsToDelete = await prisma.reservation.findMany({
    where: {
      branchId: this.branchId,
      lobbyReservationId: {
        not: null,
        notIn: lobbyReservationIds.length > 0 ? lobbyReservationIds : ['__NEVER_MATCH__']
      },
      checkInDate: {
        gte: searchStartDate,
        lte: searchEndDate
      }
    },
    select: {
      id: true,
      lobbyReservationId: true,
      guestName: true,
      checkInDate: true,
      checkOutDate: true
    }
  });

  if (reservationsToDelete.length === 0) {
    console.log(`[LobbyPMS] Keine zu löschenden Reservationen gefunden für Branch ${this.branchId}`);
    return 0;
  }

  console.log(`[LobbyPMS] Gefunden ${reservationsToDelete.length} Reservationen zum Löschen für Branch ${this.branchId}`);

  let deletedCount = 0;

  for (const reservation of reservationsToDelete) {
    try {
      // WICHTIG: Sync-History wird durch Cascade-Delete gelöscht, wenn Reservation gelöscht wird
      // Daher loggen wir die Information VOR dem Löschen (für Audit-Trail in Logs)
      console.log(`[LobbyPMS] Lösche Reservation: ${reservation.lobbyReservationId} (${reservation.guestName}), Check-in: ${reservation.checkInDate}, Check-out: ${reservation.checkOutDate}`);
      
      // Optional: Erstelle Sync-History-Eintrag VOR dem Löschen (wird durch Cascade-Delete gelöscht, aber zeigt in Logs)
      // Dies ist optional, da die Sync-History beim Löschen der Reservation auch gelöscht wird
      try {
        await prisma.reservationSyncHistory.create({
          data: {
            reservationId: reservation.id,
            syncType: 'deleted',
            syncData: {
              lobbyReservationId: reservation.lobbyReservationId,
              guestName: reservation.guestName,
              checkInDate: reservation.checkInDate,
              checkOutDate: reservation.checkOutDate,
              deletedAt: new Date(),
              reason: 'Reservation wurde in LobbyPMS gelöscht'
            } as any,
            syncedAt: new Date()
          }
        });
      } catch (historyError) {
        // Ignoriere Fehler bei Sync-History-Erstellung (nicht kritisch)
        console.warn(`[LobbyPMS] Fehler beim Erstellen der Sync-History für Reservation ${reservation.lobbyReservationId}:`, historyError);
      }

      // Lösche Reservation (Cascade-Delete löscht automatisch Sync-History und Notification-Logs)
      await prisma.reservation.delete({
        where: { id: reservation.id }
      });

      deletedCount++;
      console.log(`[LobbyPMS] Reservation ${reservation.lobbyReservationId} (${reservation.guestName}) gelöscht`);
    } catch (error) {
      console.error(`[LobbyPMS] Fehler beim Löschen der Reservation ${reservation.lobbyReservationId}:`, error);
      // Weiter mit nächster Reservation
    }
  }

  console.log(`[LobbyPMS] ${deletedCount} Reservationen erfolgreich gelöscht für Branch ${this.branchId}`);
  return deletedCount;
}
```

### Schritt 2: Integration in `syncReservations()`

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Methode**: `syncReservations()` erweitern

**Änderungen**:
1. Sammle ALLE `lobbyReservationId`s aus den geholten Reservationen (auch die, die bereits existieren)
2. Rufe `deleteMissingReservations()` nach dem Import auf
3. Gib die Anzahl gelöschter Reservationen zurück (optional)

**WICHTIG**: Da bestehende Reservationen übersprungen werden, müssen wir die IDs sammeln, BEVOR wir prüfen, ob sie existieren.

```typescript
async syncReservations(startDate: Date, endDate?: Date): Promise<number> {
  // Lade Settings falls noch nicht geladen
  if (!this.apiKey) {
    await this.loadSettings();
  }

  // WICHTIG: fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
  const lobbyReservations = await this.fetchReservations(startDate, endDate || new Date());
  let syncedCount = 0;
  
  // WICHTIG: Sammle ALLE lobbyReservationIds für Delete-Check
  // (auch die, die bereits existieren und übersprungen werden)
  const existingLobbyReservationIds: string[] = [];

  for (const lobbyReservation of lobbyReservations) {
    try {
      const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
      
      // Sammle lobbyReservationId (BEVOR wir prüfen, ob sie existiert)
      if (bookingId && bookingId !== 'unknown') {
        existingLobbyReservationIds.push(bookingId);
      }
      
      // Prüfe ob Reservation schon existiert - wenn ja, überspringen
      const existingReservation = await prisma.reservation.findUnique({
        where: { lobbyReservationId: bookingId }
      });
      
      if (existingReservation) {
        // Reservation bereits in DB - weglassen
        continue;
      }
      
      // Importiere nur neue Reservierungen
      const reservation = await this.syncReservation(lobbyReservation);
      if (reservation) {
        syncedCount++;
      }
    } catch (error) {
      const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
      console.error(`[LobbyPMS] Fehler beim Synchronisieren der Reservierung ${bookingId}:`, error);
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

  // NEU: Lösche Reservationen, die in LobbyPMS nicht mehr existieren
  let deletedCount = 0;
  try {
    deletedCount = await this.deleteMissingReservations(existingLobbyReservationIds);
  } catch (error) {
    console.error(`[LobbyPMS] Fehler beim Löschen fehlender Reservationen:`, error);
    // Fehler nicht weiterwerfen, da Import erfolgreich war
  }

  if (deletedCount > 0) {
    console.log(`[LobbyPMS] ${deletedCount} Reservationen gelöscht (nicht mehr in LobbyPMS)`);
  }

  return syncedCount;
}
```

### Schritt 3: Rückgabewert erweitern (optional)

**Option A**: Nur `syncedCount` zurückgeben (wie bisher)
- Delete-Count wird nur geloggt

**Option B**: Objekt mit `syncedCount` und `deletedCount` zurückgeben
- Erfordert Änderungen in `lobbyPmsReservationSyncService.ts`
- Besser für Reporting

**Empfehlung**: Option A (nur Logging), da Rückgabewert-Änderung mehr Dateien betrifft.

### Schritt 4: Logging verbessern

**Datei**: `backend/src/services/lobbyPmsReservationSyncService.ts`

**Methode**: `syncReservationsForBranch()`

**Änderungen**: 
- Logge auch gelöschte Reservationen (wird bereits in `lobbyPmsService.ts` geloggt)
- Optional: Speichere `deletedCount` in Branch-Metadaten (nicht notwendig)

## Edge Cases

### 1. Erster Sync
- **Szenario**: Erster Sync, `syncStartDate` = letzte 24h (immer, unabhängig von `lobbyPmsLastSyncAt`)
- **Problem**: Ältere Reservationen, die gelöscht wurden, werden nicht gefunden
- **Lösung**: Erweiterter Zeitraum (60 Tage vor bis 90 Tage nach) deckt dies ab

### 2. Manuell erstellte Reservationen
- **Szenario**: Reservation wurde manuell in der lokalen DB erstellt (ohne `lobbyReservationId`)
- **Lösung**: Nur Reservationen mit `lobbyReservationId` werden gelöscht

### 3. Reservationen ohne Branch
- **Szenario**: Alte Reservationen ohne `branchId`
- **Lösung**: Nur Reservationen mit `branchId = this.branchId` werden gelöscht

### 4. API-Fehler während Delete-Check
- **Szenario**: Delete-Check schlägt fehl
- **Lösung**: Fehler wird geloggt, aber nicht weitergeworfen (Import war erfolgreich)

### 5. Sehr viele zu löschende Reservationen
- **Szenario**: 1000+ Reservationen müssen gelöscht werden
- **Lösung**: 
  - Delete erfolgt einzeln (für besseres Error-Handling)
  - Optional: Batch-Delete für Performance (aber schlechteres Error-Handling)

### 6. Reservationen mit verknüpften Tasks
- **Szenario**: Reservation hat einen verknüpften Task
- **Lösung**: Prisma Schema hat `taskId` als optional, Task bleibt erhalten (nur `taskId` wird auf null gesetzt)

## Testing

### Test-Szenarien

1. **Normaler Sync mit gelöschten Reservationen**:
   - Erstelle 3 Reservationen in LobbyPMS
   - Importiere sie
   - Lösche 1 Reservation in LobbyPMS
   - Führe Sync aus
   - **Erwartung**: 1 Reservation wird gelöscht

2. **Erster Sync**:
   - Erstelle 5 Reservationen in LobbyPMS
   - Importiere sie
   - Lösche 2 Reservationen in LobbyPMS
   - Führe Sync aus (ohne `lobbyPmsLastSyncAt`)
   - **Erwartung**: 2 Reservationen werden gelöscht

3. **Manuell erstellte Reservationen**:
   - Erstelle 1 Reservation manuell in der DB (ohne `lobbyReservationId`)
   - Führe Sync aus
   - **Erwartung**: Manuelle Reservation bleibt erhalten

4. **Reservationen anderer Branches**:
   - Erstelle Reservationen für Branch 1 und Branch 2
   - Lösche Reservationen in LobbyPMS für Branch 1
   - Führe Sync für Branch 1 aus
   - **Erwartung**: Nur Reservationen von Branch 1 werden gelöscht

5. **Sehr alte Reservationen**:
   - Erstelle Reservation mit Check-in vor 60 Tagen
   - Lösche sie in LobbyPMS
   - Führe Sync aus (mit `syncStartDate` = letzte 24h)
   - **Erwartung**: Reservation wird gelöscht (erweiterter Zeitraum: 60 Tage vor bis 90 Tage nach)

6. **Bestehende Reservationen werden übersprungen**:
   - Erstelle 3 Reservationen in LobbyPMS
   - Importiere sie
   - Führe Sync erneut aus
   - Lösche 1 Reservation in LobbyPMS
   - Führe Sync aus
   - **Erwartung**: 
     - 2 Reservationen werden übersprungen (bereits existieren)
     - 1 Reservation wird gelöscht (nicht mehr in LobbyPMS)

## Performance-Überlegungen

### Aktuelle Implementierung
- Delete erfolgt einzeln (für besseres Error-Handling)
- Sync-History wird für jede gelöschte Reservation erstellt

### Performance-Impact der Delete-Check-Query

**Query:**
```typescript
const reservationsToDelete = await prisma.reservation.findMany({
  where: {
    branchId: this.branchId,
    lobbyReservationId: {
      not: null,
      notIn: lobbyReservationIds.length > 0 ? lobbyReservationIds : ['__NEVER_MATCH__']
    },
    checkInDate: {
      gte: searchStartDate, // 1 Tag vor (oder 60 Tage vor)
      lte: searchEndDate    // 90 Tage nach
    }
  }
});
```

**Performance-Faktoren:**
1. **Zeitraum**: 
   - **1 Tag vor**: ~50-200 Reservationen zu prüfen (schnell)
   - **60 Tage vor**: ~500-2000 Reservationen zu prüfen (langsamer)
2. **Index**: 
   - Prüfe ob Index auf `(branchId, checkInDate)` existiert
   - Falls nicht, hinzufügen für bessere Performance
3. **notIn-Array**: 
   - Wenn `lobbyReservationIds` sehr groß ist (z.B. 1000+), kann Query langsamer werden
   - **Lösung**: Verwende `NOT IN` nur wenn Array < 1000 Einträge, sonst andere Strategie

**Empfehlung:**
- **Zeitraum**: 1 Tag vor bis 90 Tage nach (Performance-optimiert)
- **Index**: Prüfen und ggf. hinzufügen
- **Monitoring**: Query-Zeit loggen, um Performance zu überwachen

### Optimierungen (optional, später)
1. **Batch-Delete**: 
   - Alle Reservationen in einem Query löschen
   - Schneller, aber schlechteres Error-Handling
   
2. **Batch Sync-History**:
   - Sync-History für mehrere Reservationen in einem Query erstellen
   - Schneller, aber komplexer

3. **Index-Optimierung**:
   - Prüfe ob Index auf `(branchId, lobbyReservationId, checkInDate)` existiert
   - Falls nicht, hinzufügen für bessere Performance

4. **Alternative: Filter nach `createdAt`**:
   - Statt `checkInDate` nach `createdAt` filtern (wann wurde Reservation importiert)
   - **Vorteil**: Genauer (nur Reservationen, die in den letzten 24h importiert wurden)
   - **Nachteil**: Erfordert, dass `createdAt` korrekt gesetzt ist

## Migration / Rollout

### Schrittweise Einführung

1. **Phase 1**: Implementierung ohne Aktivierung
   - Code implementieren
   - Logging hinzufügen
   - Testen in Development

2. **Phase 2**: Aktivierung mit Logging
   - Code aktivieren
   - Nur Logging, keine Löschung (Dry-Run-Modus)
   - Prüfe Logs, ob korrekte Reservationen identifiziert werden

3. **Phase 3**: Vollständige Aktivierung
   - Löschung aktivieren
   - Monitoring der ersten Syncs

### Rollback-Plan

- Code kann einfach deaktiviert werden (Delete-Check auskommentieren)
- Gelöschte Reservationen können aus Sync-History wiederhergestellt werden (falls nötig)

## Dokumentation

### Code-Kommentare
- Alle neuen Methoden vollständig dokumentieren
- Erkläre den erweiterten Zeitraum für Delete-Check

### Changelog
- Eintrag in CHANGELOG.md hinzufügen

## Zusammenfassung

### Betroffene Dateien
1. `backend/src/services/lobbyPmsService.ts`
   - Neue Methode: `deleteMissingReservations()`
   - Änderung: `syncReservations()` erweitern

2. `backend/src/services/lobbyPmsReservationSyncService.ts`
   - Keine Änderungen notwendig (Logging erfolgt in `lobbyPmsService.ts`)

### Neue Features
- Automatisches Löschen von Reservationen, die in LobbyPMS gelöscht wurden
- Detailliertes Logging für gelöschte Reservationen (Audit-Trail in Logs)
- Sync-History-Einträge für gelöschte Reservationen (optional, wird durch Cascade-Delete gelöscht)
- Erweiterter Zeitraum für Delete-Check (60 Tage vor bis 90 Tage nach aktueller Zeit)
- Sammelt ALLE Reservationen von LobbyPMS (auch bestehende) für Delete-Check

### ⚠️ Wichtiger Hinweis: Sync-History und Cascade-Delete

**Problem**: `ReservationSyncHistory` hat `onDelete: Cascade`, was bedeutet, dass wenn eine Reservation gelöscht wird, die Sync-History auch gelöscht wird.

**Lösung**: 
- Wir loggen die gelöschte Reservation VOR dem Löschen (für Audit-Trail in Logs)
- Sync-History-Eintrag wird optional erstellt (wird gelöscht, aber zeigt in Logs, dass Delete-Check durchgeführt wurde)
- Der eigentliche Audit-Trail ist in den Server-Logs, nicht in der DB

### Wichtige Code-Änderungen seit Plan-Erstellung
1. **`syncReservation()`**: Macht kein `upsert` mehr, sondern nur noch `create` (wenn nicht existiert)
2. **`syncReservations()`**: Prüft doppelt, ob Reservation existiert (einmal in `syncReservations()`, einmal in `syncReservation()`)
3. **`syncReservationsForBranch()`**: Verwendet IMMER die letzten 24 Stunden (nicht mehr `lobbyPmsLastSyncAt` für Startdatum)
4. **Konsequenz**: Bestehende Reservationen werden übersprungen, daher müssen wir IDs sammeln, BEVOR wir prüfen, ob sie existieren

### Risiken
- **Niedrig**: Delete-Check ist isoliert, Fehler beeinflussen Import nicht
- **Niedrig**: Nur Reservationen mit `lobbyReservationId` werden gelöscht
- **Niedrig**: Sync-History ermöglicht Wiederherstellung (falls nötig)

### Offene Fragen
1. Soll `deletedCount` im Rückgabewert zurückgegeben werden? (Empfehlung: Nein, nur Logging)
2. Soll es einen Dry-Run-Modus geben? (Empfehlung: Ja, für Testing)
3. Soll es eine Konfiguration geben, um Delete-Sync zu deaktivieren? (Empfehlung: Nein, sollte immer aktiv sein)
4. **Zeitraum für Delete-Check**: 1 Tag vor (Performance) oder 60 Tage vor (Sicherheit)? (Empfehlung: 1 Tag vor, Performance-optimiert)
5. **Status-Update für gecancelte Reservationen**: Sollen gecancelte Reservationen (Status `'cancelled'` in API) aktualisiert werden? (Empfehlung: Separates Feature, nicht Teil dieses Plans)
6. **Filter nach `createdAt` statt `checkInDate`**: Soll nach `createdAt` (Import-Zeit) statt `checkInDate` gefiltert werden? (Empfehlung: Ja, wenn `createdAt` korrekt gesetzt ist)

## ⚠️ WICHTIGE ERKENNTNISSE AUS CODE-ANALYSE

### 1. Gecancelte vs. Gelöschte Reservationen

**Gecancelte Reservationen:**
- Werden noch in der LobbyPMS API zurückgegeben
- Haben Status `'cancelled'` in der API
- Werden zu `ReservationStatus.cancelled` gemappt
- **Problem**: Bestehende Reservationen werden NICHT aktualisiert (nur neue werden erstellt)
- **Lösung**: Sollte separat implementiert werden (Update bestehender Reservationen)

**Gelöschte Reservationen:**
- Werden NICHT mehr in der LobbyPMS API zurückgegeben
- Werden komplett aus LobbyPMS entfernt
- **Problem**: Bleiben in der lokalen DB bestehen
- **Lösung**: Delete-Check (dieser Plan)

### 2. Performance-Problem

**Aktuelles Problem (aus Dokumentation):**
- 6000+ Reservationen werden bei jedem Sync geladen
- Nur die letzten 24 Stunden werden benötigt
- Client-seitiges Filtern ist ineffizient

**Auswirkung auf Delete-Check:**
- Delete-Check sollte Performance-optimiert sein
- **Empfehlung**: 1 Tag vor statt 60 Tage vor (weniger Reservationen zu prüfen)
- **Alternative**: Filter nach `createdAt` (genauer, weniger Reservationen)

### 3. Status-Handling

**Aktueller Code:**
- `mapStatus()` mappt `'cancelled'` zu `ReservationStatus.cancelled`
- Aber: Bestehende Reservationen werden NICHT aktualisiert
- **Konsequenz**: Gecancelte Reservationen behalten alten Status in lokaler DB

**Empfehlung:**
- Delete-Check sollte nur komplett gelöschte Reservationen löschen
- Status-Update für gecancelte Reservationen sollte separat implementiert werden

