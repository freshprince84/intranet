# Plan: Einmaliger Import von Reservationen nach Check-in-Datum

## Ziel
Einmalig alle Reservationen importieren, die ein Check-in-Datum seit gestern haben, unabhängig vom Erstellungsdatum (`creation_date`).

## Problem
- Aktuell werden nur Reservationen importiert, die in den letzten 24 Stunden **erstellt** wurden (nach `creation_date`)
- Es existieren alte Reservationen in Lobby, die vor längerer Zeit erstellt wurden, aber ein Check-in-Datum seit gestern haben
- Diese werden aktuell nicht importiert (was für den normalen Betrieb korrekt ist)
- Einmalig müssen alle Reservationen importiert werden, die ein Check-in-Datum seit gestern haben

## Aktueller Import-Mechanismus

### `lobbyPmsService.ts`
- `fetchReservations(startDate, endDate)`: 
  - Holt alle Reservationen von LobbyPMS mit Pagination
  - Filtert client-seitig nach `creation_date` (Zeile 366-376)
  - **NICHT** nach `check_in_date`!

- `syncReservations(startDate, endDate)`:
  - Ruft `fetchReservations()` auf
  - Synchronisiert alle Reservationen, die nach `startDate` erstellt wurden

### `lobbyPmsReservationSyncService.ts`
- `syncReservationsForBranch()`:
  - Standard: Letzte 24 Stunden (nach `creation_date`)
  - Ruft `syncReservations()` auf

## Lösung: Neue Funktion für Check-in-Datum-Filter

### Option 1: Neue Funktion in `lobbyPmsService.ts`
Erstelle `fetchReservationsByCheckInDate(checkInStartDate)`:
- Holt alle Reservationen von LobbyPMS (ohne `creation_date`-Filter)
- Filtert client-seitig nach `check_in_date` (seit gestern)
- Verwendet `check_in_date` oder `start_date` aus der API-Response

### Option 2: Erweiterte `syncReservations()` Funktion
Erweitere `syncReservations()` um optionalen Parameter `filterByCheckInDate`:
- Wenn `filterByCheckInDate = true`: Filtere nach `check_in_date` statt `creation_date`
- Wenn `filterByCheckInDate = false`: Verhalte sich wie bisher (nach `creation_date`)

### Option 3: Neuer Controller-Endpoint
Erstelle neuen Endpoint `/api/lobby-pms/sync-by-checkin`:
- Ruft neue Funktion auf
- Synchronisiert alle Branches der Organisation
- Gibt Statistiken zurück

## Empfohlene Implementierung

### Schritt 1: Neue Funktion in `lobbyPmsService.ts`
```typescript
/**
 * Ruft alle Reservierungen ab und filtert nach Check-in-Datum
 * 
 * @param checkInStartDate - Startdatum für Check-in-Filter (inklusive)
 * @param checkInEndDate - Enddatum für Check-in-Filter (optional, inklusive)
 * @returns Array von Reservierungen mit Check-in-Datum >= checkInStartDate
 */
async fetchReservationsByCheckInDate(
  checkInStartDate: Date, 
  checkInEndDate?: Date
): Promise<LobbyPmsReservation[]> {
  // Hole alle Reservationen (ohne creation_date-Filter)
  // Filtere client-seitig nach check_in_date
}
```

### Schritt 2: Neue Sync-Funktion
```typescript
/**
 * Synchronisiert Reservierungen nach Check-in-Datum
 * 
 * @param checkInStartDate - Startdatum für Check-in-Filter (inklusive)
 * @param checkInEndDate - Enddatum für Check-in-Filter (optional)
 * @returns Anzahl synchronisierter Reservierungen
 */
async syncReservationsByCheckInDate(
  checkInStartDate: Date, 
  checkInEndDate?: Date
): Promise<number> {
  // Ruft fetchReservationsByCheckInDate() auf
  // Synchronisiert alle gefilterten Reservationen
}
```

### Schritt 3: Erweiterte Sync-Service-Funktion
```typescript
/**
 * Synchronisiert Reservierungen für einen Branch nach Check-in-Datum
 * 
 * @param branchId - Branch-ID
 * @param checkInStartDate - Startdatum für Check-in-Filter (inklusive)
 * @param checkInEndDate - Enddatum für Check-in-Filter (optional)
 * @returns Anzahl synchronisierter Reservierungen
 */
static async syncReservationsForBranchByCheckInDate(
  branchId: number,
  checkInStartDate: Date,
  checkInEndDate?: Date
): Promise<number> {
  // Erstellt LobbyPmsService für Branch
  // Ruft syncReservationsByCheckInDate() auf
}
```

### Schritt 4: Neuer Controller-Endpoint
```typescript
/**
 * POST /api/lobby-pms/sync-by-checkin
 * Einmaliger Import von Reservierungen nach Check-in-Datum
 * 
 * Body: { checkInStartDate?: string, checkInEndDate?: string }
 * - checkInStartDate: ISO-Datum (default: gestern)
 * - checkInEndDate: ISO-Datum (optional)
 */
export const syncReservationsByCheckIn = async (req: AuthenticatedRequest, res: Response) => {
  // Synchronisiert alle Branches der Organisation
  // Filtert nach Check-in-Datum statt creation_date
  // Gibt Statistiken zurück
}
```

## Wichtige Details

### Check-in-Datum in API-Response
Laut `lobbyPmsService.ts` Zeile 582-590:
- API gibt `start_date` oder `check_in_date` zurück
- Beide werden als Check-in-Datum verwendet
- `parseLocalDate()` wird verwendet, um UTC-Konvertierung zu vermeiden

### Filter-Logik
```typescript
// Filtere nach check_in_date (nicht creation_date!)
const filteredReservations = allReservations.filter((reservation) => {
  const checkInDateString = reservation.start_date || reservation.check_in_date;
  if (!checkInDateString) {
    return false; // Keine Check-in-Datum = nicht inkludieren
  }
  const checkInDate = this.parseLocalDate(checkInDateString);
  const afterStartDate = checkInDate >= checkInStartDate;
  const beforeEndDate = !checkInEndDate || checkInDate <= checkInEndDate;
  return afterStartDate && beforeEndDate;
});
```

### Datum-Berechnung
- "Seit gestern" bedeutet: Check-in-Datum >= gestern 00:00:00
- Beispiel: Heute ist 2025-01-22, dann: Check-in-Datum >= 2025-01-21 00:00:00

## Implementierungsreihenfolge

1. ✅ **Analyse abgeschlossen** - Code verstanden, Problem identifiziert
2. ⏳ **Plan erstellt** - Dieser Plan
3. ⏳ **Implementierung vorbereiten** - Code-Stellen identifiziert
4. ⏳ **Auf Bestätigung warten** - User muss Plan bestätigen
5. ⏳ **Implementierung** - Code schreiben
6. ⏳ **Testen** - Manuell testen mit echten Daten

## Offene Fragen

1. **Soll die Funktion einmalig aufgerufen werden oder dauerhaft verfügbar sein?**
   - Empfehlung: Dauerhaft verfügbar, aber nur manuell aufrufbar (kein automatischer Scheduler)

2. **Soll die Funktion für alle Branches oder nur für eine bestimmte Organisation/Branch ausgeführt werden?**
   - Empfehlung: Für alle Branches der Organisation (wie aktueller `/api/lobby-pms/sync` Endpoint)

3. **Soll es eine Frontend-UI geben oder nur Backend-Endpoint?**
   - Empfehlung: Zuerst nur Backend-Endpoint, Frontend später bei Bedarf

## Risiken und Überlegungen

1. **Performance**: 
   - Alle Reservationen von LobbyPMS holen kann bei vielen Reservationen langsam sein
   - Pagination ist bereits implementiert (max 200 Seiten = 20.000 Reservationen)
   - Client-seitiges Filtern ist notwendig, da API keinen Check-in-Datum-Filter unterstützt

2. **Duplikate**:
   - `syncReservation()` verwendet `upsert()`, daher werden bereits existierende Reservationen aktualisiert
   - Kein Risiko von Duplikaten

3. **Fehlerbehandlung**:
   - Gleiche Fehlerbehandlung wie in `syncReservations()` verwenden
   - Sync-History mit Fehlern erstellen

## Nächste Schritte

1. **User bestätigt Plan** → Implementierung starten
2. **User hat Fragen** → Fragen beantworten, Plan anpassen
3. **User möchte Änderungen** → Plan entsprechend anpassen

