# LobbyPMS Reservation Delete Sync - Implementierungsplan

## Problem

Aktuell werden Reservationen aus LobbyPMS importiert, aber wenn eine Reservation in LobbyPMS gelöscht wird, bleibt sie in der lokalen Datenbank bestehen. Es gibt keine Synchronisation für gelöschte Reservationen.

## Aktueller Ablauf

1. **Scheduler** (`lobbyPmsReservationScheduler.ts`):
   - Läuft alle 10 Minuten
   - Ruft `LobbyPmsReservationSyncService.syncReservationsForBranch(branchId)` auf

2. **Sync Service** (`lobbyPmsReservationSyncService.ts`):
   - Bestimmt `syncStartDate` basierend auf `lobbyPmsLastSyncAt` oder letzte 24h
   - Ruft `lobbyPmsService.syncReservations(syncStartDate)` auf

3. **LobbyPMS Service** (`lobbyPmsService.ts`):
   - `syncReservations()` ruft `fetchReservations(startDate)` auf
   - Filtert nach `creation_date >= startDate`
   - Iteriert durch alle gefundenen Reservationen
   - Ruft `syncReservation()` auf, das ein `upsert` macht
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
  - Gleicher Zeitraum wie für den Import: `syncStartDate` bis `now()`
  - Aber: Wir können nicht nach `creation_date` filtern, da wir diese nicht in der DB haben
  - **Lösung**: Filtere nach `checkInDate` innerhalb eines erweiterten Zeitraums (z.B. `syncStartDate - 30 Tage` bis `now() + 90 Tage`)
  - Oder: Filtere nach `createdAt` in der lokalen DB (wann wurde die Reservation erstellt/importiert)

- **Branch-Filter**: 
  - Wichtig: Nur Reservationen des aktuellen Branches löschen
  - `branchId` muss gesetzt sein

- **LobbyReservationId**:
  - Nur Reservationen mit `lobbyReservationId` prüfen (nicht null)
  - Reservationen ohne `lobbyReservationId` sind manuell erstellt und sollten nicht gelöscht werden

## Implementierung

### Schritt 1: Neue Methode in `lobbyPmsService.ts`

**Datei**: `backend/src/services/lobbyPmsService.ts`

**Methode**: `deleteMissingReservations()`

```typescript
/**
 * Löscht Reservationen, die in LobbyPMS nicht mehr existieren
 * 
 * @param lobbyReservationIds - Array von lobbyReservationIds, die noch in LobbyPMS existieren
 * @param syncStartDate - Startdatum des Sync-Zeitraums
 * @param syncEndDate - Enddatum des Sync-Zeitraums (default: jetzt)
 * @returns Anzahl gelöschter Reservationen
 */
private async deleteMissingReservations(
  lobbyReservationIds: string[],
  syncStartDate: Date,
  syncEndDate: Date = new Date()
): Promise<number> {
  if (!this.branchId) {
    throw new Error('LobbyPmsService.deleteMissingReservations: branchId ist nicht gesetzt!');
  }

  // Erweitere den Zeitraum für die Suche:
  // - Start: 30 Tage vor syncStartDate (um auch ältere Reservationen zu finden, die gelöscht wurden)
  // - Ende: 90 Tage nach syncEndDate (um auch zukünftige Reservationen zu finden, die gelöscht wurden)
  const searchStartDate = new Date(syncStartDate);
  searchStartDate.setDate(searchStartDate.getDate() - 30);
  
  const searchEndDate = new Date(syncEndDate);
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
      // Erstelle Sync-History-Eintrag VOR dem Löschen (für Audit-Trail)
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
1. Sammle alle `lobbyReservationId`s während des Imports
2. Rufe `deleteMissingReservations()` nach dem Import auf
3. Gib die Anzahl gelöschter Reservationen zurück (optional)

```typescript
async syncReservations(startDate: Date, endDate?: Date): Promise<number> {
  // ... bestehender Code ...

  // WICHTIG: fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
  const lobbyReservations = await this.fetchReservations(startDate, endDate || new Date());
  let syncedCount = 0;
  
  // Sammle alle lobbyReservationIds für Delete-Check
  const existingLobbyReservationIds: string[] = [];

  for (const lobbyReservation of lobbyReservations) {
    try {
      await this.syncReservation(lobbyReservation);
      syncedCount++;
      
      // Sammle lobbyReservationId
      const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id);
      if (bookingId && bookingId !== 'unknown') {
        existingLobbyReservationIds.push(bookingId);
      }
    } catch (error) {
      // ... bestehender Error-Handling-Code ...
    }
  }

  // NEU: Lösche Reservationen, die in LobbyPMS nicht mehr existieren
  let deletedCount = 0;
  try {
    deletedCount = await this.deleteMissingReservations(
      existingLobbyReservationIds,
      startDate,
      endDate || new Date()
    );
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

### 1. Erster Sync (kein `lobbyPmsLastSyncAt`)
- **Szenario**: Erster Sync, `syncStartDate` = letzte 24h
- **Problem**: Ältere Reservationen, die gelöscht wurden, werden nicht gefunden
- **Lösung**: Erweiterter Zeitraum (30 Tage vor `syncStartDate`) deckt dies ab

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
   - **Erwartung**: Reservation wird gelöscht (erweiterter Zeitraum)

## Performance-Überlegungen

### Aktuelle Implementierung
- Delete erfolgt einzeln (für besseres Error-Handling)
- Sync-History wird für jede gelöschte Reservation erstellt

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
- Sync-History-Einträge für gelöschte Reservationen
- Erweiterter Zeitraum für Delete-Check (30 Tage vor bis 90 Tage nach Sync-Zeitraum)

### Risiken
- **Niedrig**: Delete-Check ist isoliert, Fehler beeinflussen Import nicht
- **Niedrig**: Nur Reservationen mit `lobbyReservationId` werden gelöscht
- **Niedrig**: Sync-History ermöglicht Wiederherstellung (falls nötig)

### Offene Fragen
1. Soll `deletedCount` im Rückgabewert zurückgegeben werden? (Empfehlung: Nein, nur Logging)
2. Soll es einen Dry-Run-Modus geben? (Empfehlung: Ja, für Testing)
3. Soll es eine Konfiguration geben, um Delete-Sync zu deaktivieren? (Empfehlung: Nein, sollte immer aktiv sein)

