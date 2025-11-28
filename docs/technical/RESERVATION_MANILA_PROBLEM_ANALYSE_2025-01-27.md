# Analyse: Manila-Reservierungen werden nicht angezeigt (2025-01-27)

## Problem-Beschreibung

**Symptom:**
- Für Manila werden heute keine Reservierungen angezeigt (außer einer, die in Lobby gar nicht mehr existiert)
- Problem tritt auf dem Produktivserver auf
- Benutzer erwartet, dass alle Reservierungen für Manila mit Check-in-Datum heute angezeigt werden

## Analyse-Ergebnisse

### 1. ❌ KRITISCH: Backend filterToPrisma.ts behandelt checkInDate/checkOutDate NICHT

**Problem:**
- In `backend/src/utils/filterToPrisma.ts` werden `checkInDate` und `checkOutDate` NICHT in `convertSingleCondition` behandelt
- Nur `dueDate`, `tourDate` und `bookingDate` werden als Datumsfelder erkannt (Zeile 121-124)
- Wenn der "Aktuell"-Filter nach `checkInDate` filtert, wird dieser Filter im Backend ignoriert

**Aktueller Code:**
```121:124:backend/src/utils/filterToPrisma.ts
    case 'dueDate':
    case 'tourDate':
    case 'bookingDate':
      return convertDateCondition(value, operator);
```

**Fehlende Fälle:**
- `checkInDate` wird NICHT behandelt
- `checkOutDate` wird NICHT behandelt

**Konsequenz:**
- Wenn der "Aktuell"-Filter eine Bedingung wie `checkInDate = __TODAY__` hat, wird diese Bedingung im Backend ignoriert
- Es werden ALLE Reservierungen zurückgegeben (nur gefiltert nach organizationId und branchId, falls vorhanden)
- Der Datumsfilter wird nicht angewendet

### 2. ❌ KRITISCH: convertDateCondition gibt immer "dueDate" zurück

**Problem:**
- In `convertDateCondition` (Zeile 165-192) wird immer `dueDate` zurückgegeben
- Für Reservierungen sollte es `checkInDate` oder `checkOutDate` sein

**Aktueller Code:**
```179:184:backend/src/utils/filterToPrisma.ts
  if (operator === 'equals') {
    const startOfDay = new Date(dateValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateValue);
    endOfDay.setHours(23, 59, 59, 999);
    return { dueDate: { gte: startOfDay, lte: endOfDay } };
```

**Problem:**
- Die Funktion kennt nicht, welches Feld gefiltert werden soll (`checkInDate`, `checkOutDate`, `dueDate`, etc.)
- Sie gibt immer `dueDate` zurück, auch wenn `checkInDate` gefiltert werden soll

**Konsequenz:**
- Selbst wenn `checkInDate` in `convertSingleCondition` behandelt würde, würde der Filter auf das falsche Feld angewendet

### 3. ⚠️ Frontend-Filter funktionieren (laut Dokumentation)

**Status:**
- Laut `docs/technical/RESERVATION_FILTER_ANALYSE_2025-01-22.md` wurden Frontend-Fixes implementiert
- Frontend verwendet `columnEvaluators` für Datumsfelder
- Frontend-Filter funktionieren client-seitig

**ABER:**
- Wenn der "Aktuell"-Filter aktiv ist, werden Filter-Bedingungen an das Backend gesendet (via `filterId` oder `filterConditions`)
- Das Backend muss diese Filter-Bedingungen korrekt in Prisma Where-Klauseln konvertieren
- **DAS FUNKTIONIERT NICHT** für `checkInDate`/`checkOutDate`

### 4. ⚠️ "Aktuell"-Filter wird automatisch geladen

**Code:**
```736:764:frontend/src/pages/Worktracker.tsx
    // ✅ Initialer Filter-Load für Reservations (wie bei Tasks)
    useEffect(() => {
        const setInitialReservationFilter = async () => {
            try {
                const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(RESERVATIONS_TABLE_ID));
                const filters = response.data;
                
                const aktuellFilter = filters.find((filter: any) => filter.name === t('reservations.filters.current', 'Aktuell'));
                if (aktuellFilter) {
                    setReservationActiveFilterName(t('reservations.filters.current', 'Aktuell'));
                    setReservationSelectedFilterId(aktuellFilter.id);
                    applyReservationFilterConditions(aktuellFilter.conditions, aktuellFilter.operators);
                    // ✅ Lade Reservierungen mit Filter
                    await loadReservations(aktuellFilter.id);
                } else {
                    // Kein Filter: Lade alle Reservierungen
                    await loadReservations();
                }
```

**Verhalten:**
- Beim Öffnen der Reservierungen-Tab wird automatisch der "Aktuell"-Filter geladen
- Dieser Filter wird an das Backend gesendet (via `filterId`)
- Das Backend sollte nach `checkInDate` filtern, tut es aber nicht (siehe Problem 1)

## Identifizierte Ursachen

### Hauptursache 1: checkInDate/checkOutDate werden nicht in convertSingleCondition behandelt

**Datei:** `backend/src/utils/filterToPrisma.ts`
**Zeile:** 86-160 (`convertSingleCondition`)

**Problem:**
- `checkInDate` und `checkOutDate` fehlen im `switch`-Statement
- Wenn eine Filter-Bedingung `column: 'checkInDate'` hat, landet sie im `default`-Fall
- Der `default`-Fall gibt ein leeres Objekt zurück: `return {};`
- **Der Filter wird ignoriert**

### Hauptursache 2: convertDateCondition ist nicht flexibel genug

**Datei:** `backend/src/utils/filterToPrisma.ts`
**Zeile:** 165-192 (`convertDateCondition`)

**Problem:**
- Die Funktion kennt nicht, welches Feld gefiltert werden soll
- Sie gibt immer `dueDate` zurück
- Sie sollte das Feld als Parameter erhalten

**Aktueller Aufruf:**
```typescript
return convertDateCondition(value, operator);
```

**Sollte sein:**
```typescript
return convertDateCondition(value, operator, 'checkInDate'); // oder 'checkOutDate', 'dueDate', etc.
```

## Erwartetes Verhalten

### Wenn "Aktuell"-Filter aktiv ist:

1. **Filter-Bedingung:** `checkInDate = __TODAY__` (oder ähnlich)
2. **Backend sollte:**
   - `__TODAY__` in heutiges Datum konvertieren (00:00:00 bis 23:59:59)
   - Prisma Where-Klausel erstellen: `{ checkInDate: { gte: todayStart, lte: todayEnd } }`
   - Nur Reservierungen mit Check-in-Datum heute zurückgeben

3. **Aktuelles Verhalten:**
   - Filter-Bedingung wird ignoriert (weil `checkInDate` nicht behandelt wird)
   - Alle Reservierungen werden zurückgegeben (nur gefiltert nach organizationId/branchId)

## Nächste Schritte zur Behebung

### 1. ✅ checkInDate/checkOutDate in convertSingleCondition hinzufügen

**Änderung in `backend/src/utils/filterToPrisma.ts`:**
```typescript
case 'dueDate':
case 'tourDate':
case 'bookingDate':
case 'checkInDate':      // ← HINZUFÜGEN
case 'checkOutDate':     // ← HINZUFÜGEN
  return convertDateCondition(value, operator, column); // ← column-Parameter hinzufügen
```

### 2. ✅ convertDateCondition erweitern

**Änderung in `backend/src/utils/filterToPrisma.ts`:**
```typescript
function convertDateCondition(value: any, operator: string, fieldName: string = 'dueDate'): any {
  // ... bestehender Code ...
  
  if (operator === 'equals') {
    const startOfDay = new Date(dateValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateValue);
    endOfDay.setHours(23, 59, 59, 999);
    return { [fieldName]: { gte: startOfDay, lte: endOfDay } }; // ← fieldName verwenden
  } else if (operator === 'before') {
    return { [fieldName]: { lt: dateValue } }; // ← fieldName verwenden
  } else if (operator === 'after') {
    return { [fieldName]: { gt: dateValue } }; // ← fieldName verwenden
  }
  
  return {};
}
```

### 3. ⚠️ Prüfen: Was macht der "Aktuell"-Filter genau?

**Zu prüfen:**
- Welche Filter-Bedingungen hat der "Aktuell"-Filter in der Datenbank?
- Filtert er nach `checkInDate = __TODAY__`?
- Oder filtert er nach `checkInDate >= __TODAY__` (ab heute)?
- Gibt es weitere Bedingungen (z.B. Branch-Filter)?

**SQL-Query zum Prüfen:**
```sql
SELECT id, name, conditions, operators 
FROM "SavedFilter" 
WHERE "tableId" = (SELECT id FROM "Table" WHERE name = 'reservations')
AND name = 'Aktuell';
```

## Zusätzliche Probleme

### Problem: Reservierung existiert in DB, aber nicht mehr in Lobby

**Beschreibung:**
- Eine Reservierung wird angezeigt, die in Lobby gar nicht mehr existiert
- Dies deutet darauf hin, dass:
  - Die Reservierung in der lokalen DB existiert
  - Die Reservierung wurde in Lobby gelöscht/storniert
  - Die Synchronisation hat die Reservierung nicht gelöscht/aktualisiert

**Zu prüfen:**
- Gibt es eine Synchronisation, die gelöschte Reservierungen aus Lobby entfernt?
- Wird der Status aktualisiert, wenn eine Reservierung in Lobby storniert wird?
- Sollte die Reservierung gelöscht werden, wenn sie in Lobby nicht mehr existiert?

## Zusammenfassung

**Hauptproblem:**
- `checkInDate` und `checkOutDate` werden im Backend-Filter-System nicht behandelt
- Der "Aktuell"-Filter wird ignoriert, weil seine Bedingungen nicht konvertiert werden können
- Alle Reservierungen werden zurückgegeben, statt nur die mit Check-in-Datum heute

**Lösung:**
- `checkInDate` und `checkOutDate` in `convertSingleCondition` hinzufügen
- `convertDateCondition` erweitern, um Feldnamen als Parameter zu akzeptieren
- Testen, ob der "Aktuell"-Filter danach korrekt funktioniert

**Status:** ⚠️ **NUR ANALYSE - KEINE ÄNDERUNGEN**

