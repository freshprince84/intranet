# Plan: Anzeige der zu importierenden Reservationen nach Check-in-Datum

## Ziel
**NUR ANZEIGEN**, welche Reservationen importiert werden würden, die ein Check-in-Datum seit gestern haben, **OHNE** tatsächlich zu importieren.

## Vorgehen (OHNE Code zu ändern/erstellen)

### Option 1: Bestehenden Endpoint verwenden + manuelle Filterung
1. Endpoint `/api/lobby-pms/reservations` verwenden
2. Alle Reservationen von LobbyPMS holen (ohne Datum-Filter)
3. Client-seitig nach `check_in_date` filtern (seit gestern)
4. Anzeigen, welche importiert werden würden

**Problem:** Der Endpoint filtert bereits nach `creation_date`, nicht nach `check_in_date`.

### Option 2: Script erstellen (NUR zum Anzeigen, kein Import)
**ABER:** User hat gesagt "komm ja nicht auf die idee den code zu ändern oder zu erstellen"

### Option 3: Manuelle Analyse über bestehende Tools
1. LobbyPMS API direkt abfragen (z.B. über Postman/curl)
2. Alle Reservationen holen
3. Nach `check_in_date` filtern
4. Mit lokaler Datenbank vergleichen (welche fehlen noch)

## Was muss angezeigt werden?

### Für jede zu importierende Reservation:
- `booking_id` / `id` (LobbyPMS ID)
- `guest_name` (Gastname)
- `check_in_date` / `start_date` (Check-in-Datum)
- `check_out_date` / `end_date` (Check-out-Datum)
- `creation_date` (Erstellungsdatum - zur Info)
- `property_id` (Branch-Zuordnung)
- `status` (Status)
- `payment_status` (Zahlungsstatus)
- **Bereits importiert?** (Vergleich mit lokaler DB)

### Statistiken:
- Gesamtanzahl Reservationen in LobbyPMS (mit Check-in seit gestern)
- Anzahl bereits importiert
- Anzahl noch zu importieren
- Aufgeteilt nach Branch

## Datenstruktur aus LobbyPMS API

Laut `lobbyPmsService.ts`:
- `start_date` oder `check_in_date` = Check-in-Datum
- `end_date` oder `check_out_date` = Check-out-Datum
- `creation_date` = Erstellungsdatum (aktuell für Filter verwendet)
- `booking_id` oder `id` = LobbyPMS Reservation ID
- `property_id` = Branch-Zuordnung

## Filter-Logik

```typescript
// Pseudo-Code (NUR zur Veranschaulichung, NICHT implementieren!)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

const toImport = allReservations.filter(reservation => {
  const checkInDateString = reservation.start_date || reservation.check_in_date;
  if (!checkInDateString) return false;
  
  const checkInDate = parseLocalDate(checkInDateString); // UTC-Konvertierung vermeiden
  return checkInDate >= yesterday;
});
```

## Vergleich mit lokaler Datenbank

Für jede Reservation prüfen:
```sql
SELECT * FROM Reservation WHERE lobbyReservationId = 'XXX'
```

- Wenn existiert: Bereits importiert
- Wenn nicht existiert: Noch zu importieren

## Nächste Schritte

**WICHTIG:** User muss entscheiden, wie die Anzeige erfolgen soll:
1. Über bestehenden Endpoint (müsste erweitert werden - Code-Änderung!)
2. Über neues Script (Code-Erstellung!)
3. Manuell über API-Tools (kein Code, aber aufwändig)
4. Andere Lösung?

**Bis User entschieden hat:** Kein Code ändern oder erstellen!

