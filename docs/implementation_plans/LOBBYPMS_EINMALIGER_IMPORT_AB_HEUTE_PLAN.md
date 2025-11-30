# LobbyPMS Einmaliger Import - Check-in ab heute

## Datum
2025-01-27

## Überblick
Anpassung des bestehenden Import-Scripts `import-reservations-by-checkin-date.ts` für einen EINMALIGEN Import aller Reservationen mit Check-in-Datum AB HEUTE, die noch nicht im System sind.

## Anforderung
- **EINMALIG** alle Reservationen von LobbyPMS importieren
- **Check-in-Datum AB HEUTE** (nicht gestern!)
- **Nur neue Reservationen** (die noch nicht im System sind)
- **Nichts löschen** oder überschreiben
- **Nur Plan erstellen**, keine Umsetzung

---

## 1. Analyse: Bestehendes Script

### 1.1 Script-Identifikation
**Datei:** `backend/scripts/import-reservations-by-checkin-date.ts`

**Aktuelle Funktionalität:**
- Importiert Reservationen mit Check-in-Datum seit GESTERN (Zeile 36-39)
- Lädt alle Branches mit LobbyPMS-Konfiguration (Zeile 45-62)
- Holt ALLE Reservationen von der LobbyPMS API (Zeile 79-134)
- Filtert nach Check-in-Datum >= gestern (Zeile 138-151)
- Prüft, ob Reservationen bereits existieren (Zeile 155-176)
- Importiert nur neue Reservationen (Zeile 171-174)
- Erstellt Reservationen direkt in DB (Zeile 240-277)
- Erstellt Sync-History für Tracking (Zeile 279-292)

### 1.2 Prüfung auf Duplikate
**Implementierung (Zeile 155-176):**
```typescript
// Hole bereits importierte Reservationen
const bookingIds = filteredByCheckIn.map((r: any) => String(r.booking_id || r.id));
const existingReservations = await prisma.reservation.findMany({
  where: {
    lobbyReservationId: {
      in: bookingIds
    }
  },
  select: {
    lobbyReservationId: true
  }
});

const existingIds = new Set(existingReservations.map(r => r.lobbyReservationId));

// Importiere nur die, die noch nicht importiert sind
const toImport = filteredByCheckIn.filter((r: any) => {
  const bookingId = String(r.booking_id || r.id);
  return !existingIds.has(bookingId);
});
```

**Status:** ✅ Funktioniert korrekt - prüft bereits auf Duplikate via `lobbyReservationId`

### 1.3 Datum-Filter
**Aktuelle Implementierung (Zeile 36-41):**
```typescript
// Berechne "gestern" (00:00:00)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

console.log(`Filter: Check-in-Datum >= ${yesterday.toISOString().split('T')[0]}`);
```

**Problem:** Filtert nach "gestern", benötigt aber "heute"

**Check-in-Filter (Zeile 138-151):**
```typescript
// Filtere nach Check-in-Datum (seit gestern)
const filteredByCheckIn = allReservations.filter((reservation: any) => {
  const checkInDateString = reservation.start_date || reservation.check_in_date;
  if (!checkInDateString) {
    return false;
  }
  
  try {
    const checkInDate = parseLocalDate(checkInDateString);
    return checkInDate >= yesterday;  // ← Muss auf "heute" geändert werden
  } catch (error) {
    return false;
  }
});
```

**Status:** ✅ Filter-Logik funktioniert, muss nur Datum von "gestern" auf "heute" ändern

---

## 2. Plan: Anpassungen

### 2.1 Änderungen am Script

#### Änderung 1: Datum von "gestern" auf "heute" ändern
**Datei:** `backend/scripts/import-reservations-by-checkin-date.ts`

**Zeile 32:** Titel anpassen
```typescript
// ALT:
console.log('IMPORT: Reservationen mit Check-in-Datum seit gestern');

// NEU:
console.log('IMPORT: Reservationen mit Check-in-Datum ab heute');
```

**Zeile 36-41:** Datum-Berechnung ändern
```typescript
// ALT:
// Berechne "gestern" (00:00:00)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

console.log(`Filter: Check-in-Datum >= ${yesterday.toISOString().split('T')[0]}`);

// NEU:
// Berechne "heute" (00:00:00)
const today = new Date();
today.setHours(0, 0, 0, 0);

console.log(`Filter: Check-in-Datum >= ${today.toISOString().split('T')[0]}`);
```

**Zeile 138:** Kommentar anpassen
```typescript
// ALT:
// Filtere nach Check-in-Datum (seit gestern)

// NEU:
// Filtere nach Check-in-Datum (ab heute)
```

**Zeile 147:** Vergleichsvariable ändern
```typescript
// ALT:
return checkInDate >= yesterday;

// NEU:
return checkInDate >= today;
```

**Zeile 153:** Log-Message anpassen
```typescript
// ALT:
console.log(`  Mit Check-in seit gestern: ${filteredByCheckIn.length}`);

// NEU:
console.log(`  Mit Check-in ab heute: ${filteredByCheckIn.length}`);
```

### 2.2 Zusammenfassung der Änderungen

**Datei:** `backend/scripts/import-reservations-by-checkin-date.ts`

**Zu ändernde Zeilen:**
1. **Zeile 32:** Titel von "seit gestern" → "ab heute"
2. **Zeile 36-39:** `yesterday` → `today`, entferne `setDate(yesterday.getDate() - 1)`
3. **Zeile 41:** Log-Message anpassen
4. **Zeile 138:** Kommentar anpassen
5. **Zeile 147:** `yesterday` → `today`
6. **Zeile 153:** Log-Message anpassen

**Nicht zu ändern:**
- ✅ Duplikat-Prüfung funktioniert bereits korrekt
- ✅ Import-Logik funktioniert bereits korrekt
- ✅ Sync-History-Erstellung funktioniert bereits korrekt
- ✅ Fehlerbehandlung funktioniert bereits korrekt

---

## 3. Ausführung auf Produktivserver

### 3.1 Voraussetzungen
- Script muss auf dem Produktivserver verfügbar sein
- Datenbankverbindung muss funktionieren
- LobbyPMS API-Zugriff muss funktionieren
- Alle Branches müssen LobbyPMS-Konfiguration haben

### 3.2 Ausführungsbefehl
```bash
cd /path/to/intranet/backend
npx ts-node scripts/import-reservations-by-checkin-date.ts
```

**Oder falls kompiliert:**
```bash
cd /path/to/intranet/backend
node dist/scripts/import-reservations-by-checkin-date.js
```

### 3.3 Erwartete Ausgabe
```
================================================================================
IMPORT: Reservationen mit Check-in-Datum ab heute
================================================================================

Filter: Check-in-Datum >= 2025-01-27

Gefundene Branches mit LobbyPMS: X

--- Branch 1: Branch Name ---
  Lade Reservationen von LobbyPMS API...
  Gefunden: Y Reservationen insgesamt
  Mit Check-in ab heute: Z
  Noch zu importieren: W
  ... X importiert ...
  ✅ Branch 1: W Reservationen verarbeitet

================================================================================
ZUSAMMENFASSUNG
================================================================================
Erfolgreich importiert: X
Fehler: Y

✅ Import abgeschlossen!
```

### 3.4 Sicherheitshinweise
- ✅ Script prüft automatisch auf Duplikate (nur neue Reservationen werden importiert)
- ✅ Script überschreibt keine bestehenden Reservationen (verwendet `upsert` mit `where: { lobbyReservationId }`)
- ✅ Script löscht nichts
- ✅ Script erstellt Sync-History für Tracking

---

## 4. Test-Plan (optional, vor Produktivausführung)

### 4.1 Lokaler Test (falls möglich)
1. Script auf lokalem System mit Test-Datenbank ausführen
2. Prüfen, ob nur Reservationen mit Check-in >= heute importiert werden
3. Prüfen, ob bereits vorhandene Reservationen übersprungen werden
4. Prüfen, ob Sync-History korrekt erstellt wird

### 4.2 Produktivserver-Test
1. Script auf Produktivserver ausführen
2. Logs prüfen
3. Datenbank prüfen (Anzahl importierter Reservationen)
4. Sync-History prüfen

---

## 5. Risiken und Mitigation

### 5.1 Risiken
- **Risiko:** Zu viele Reservationen werden importiert (Performance)
  - **Mitigation:** Script lädt bereits paginiert (max 200 Seiten à 100 Reservationen)
  - **Mitigation:** Script filtert bereits nach Check-in-Datum

- **Risiko:** Duplikate werden importiert
  - **Mitigation:** Script prüft bereits auf Duplikate via `lobbyReservationId`
  - **Mitigation:** Script verwendet `upsert` statt `create`

- **Risiko:** Bestehende Reservationen werden überschrieben
  - **Mitigation:** Script prüft bereits auf Existenz und überspringt vorhandene
  - **Mitigation:** `upsert` aktualisiert nur, wenn Reservation bereits existiert (was nicht passieren sollte, da Script vorhandene überspringt)

### 5.2 Keine Risiken
- ✅ Script löscht nichts
- ✅ Script überschreibt nichts (nur neue werden importiert)
- ✅ Script erstellt Sync-History für Tracking

---

## 6. Zusammenfassung

### 6.1 Was muss geändert werden
**Datei:** `backend/scripts/import-reservations-by-checkin-date.ts`

**6 Zeilen ändern:**
1. Zeile 32: Titel
2. Zeile 36-39: Datum-Berechnung (yesterday → today)
3. Zeile 41: Log-Message
4. Zeile 138: Kommentar
5. Zeile 147: Vergleichsvariable
6. Zeile 153: Log-Message

### 6.2 Was funktioniert bereits
- ✅ Duplikat-Prüfung
- ✅ Import-Logik
- ✅ Sync-History-Erstellung
- ✅ Fehlerbehandlung
- ✅ Branch-Überprüfung
- ✅ API-Abfrage mit Paginierung

### 6.3 Ausführung
- Script auf Produktivserver ausführen
- Keine weiteren Schritte nötig
- Script ist bereits vollständig funktionsfähig

---

## 7. Nächste Schritte

1. **Anpassungen am Script vornehmen:**
   - 6 Zeilen ändern (siehe Abschnitt 2.1)

2. **Script auf Produktivserver ausführen:**
   - Befehl: `npx ts-node scripts/import-reservations-by-checkin-date.ts`
   - Oder: `node dist/scripts/import-reservations-by-checkin-date.js`

3. **Ergebnis prüfen:**
   - Logs prüfen
   - Datenbank prüfen
   - Sync-History prüfen

---

## 8. Implementierungsstatus

- ⏳ **Geplant:** Script-Anpassungen
- ⏳ **Ausstehend:** Ausführung auf Produktivserver
- ✅ **Bereits vorhanden:** Alle notwendigen Funktionen (Duplikat-Prüfung, Import-Logik, etc.)

