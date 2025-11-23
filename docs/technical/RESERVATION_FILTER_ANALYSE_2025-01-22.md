# Reservation Filter - Analyse und Fixes (2025-01-22)

## Übersicht

Analyse der Filter-Funktionalität bei Reservationen. **ANALYSE ABGESCHLOSSEN - FIXES IMPLEMENTIERT**.

## Gefundene Probleme

### 1. ❌ KRITISCH: Datumsfelder (checkInDate/checkOutDate) haben falsche Operatoren

**Problem:**
- `checkInDate` und `checkOutDate` bekommen Text-Operatoren (equals, contains, startsWith, endsWith)
- Sollten aber Datum-Operatoren haben (equals, after, before, between)

**Betroffene Dateien:**
- `frontend/src/components/FilterRow.tsx` Zeile 82-83

**Aktueller Code:**
```82:83:frontend/src/components/FilterRow.tsx
  if (columnId === 'dueDate' || columnId === 'startTime') {
    return dateOperators;
```

**Problem:** `checkInDate` und `checkOutDate` werden NICHT erkannt, daher bekommen sie Text-Operatoren.

**Erwartetes Verhalten:**
- `checkInDate` und `checkOutDate` sollten Datum-Operatoren haben:
  - `equals` (ist genau)
  - `after` (nach/seit)
  - `before` (vor/bis)
  - `between` (zwischen)

**Vergleich mit anderen Filtern:**
- ✅ Tasks: `dueDate` hat Datum-Operatoren (Zeile 82)
- ✅ Consultations: `startTime` hat Datum-Operatoren (Zeile 82)
- ❌ Reservations: `checkInDate`/`checkOutDate` haben Text-Operatoren

---

### 2. ❌ KRITISCH: Keine columnEvaluators für Reservations

**Problem:**
- Reservations verwenden KEINE `columnEvaluators` in der Filter-Logik
- Datumsfelder werden als Text behandelt (String-Vergleich statt Datums-Vergleich)
- Status/PaymentStatus haben keine spezielle Evaluierung
- Amount hat keine Zahlen-Evaluierung

**Betroffene Dateien:**
- `frontend/src/pages/Worktracker.tsx` Zeile 1264-1296

**Aktueller Code:**
```1267:1296:frontend/src/pages/Worktracker.tsx
            const getFieldValue = (reservation: Reservation, columnId: string): any => {
                switch (columnId) {
                    case 'guestName': return reservation.guestName || '';
                    case 'status': return reservation.status || '';
                    case 'paymentStatus': return reservation.paymentStatus || '';
                    case 'roomNumber': return reservation.roomNumber || '';
                    case 'guestEmail': return reservation.guestEmail || '';
                    case 'guestPhone': return reservation.guestPhone || '';
                    case 'lobbyReservationId': return reservation.lobbyReservationId || '';
                    case 'checkInDate': return reservation.checkInDate ? String(reservation.checkInDate) : '';
                    case 'checkOutDate': return reservation.checkOutDate ? String(reservation.checkOutDate) : '';
                    case 'amount': return reservation.amount != null ? String(reservation.amount) : '';
                    case 'arrivalTime': return reservation.arrivalTime ? String(reservation.arrivalTime) : '';
                    default: {
                        const value = (reservation as any)[columnId];
                        if (value == null) return '';
                        if (typeof value === 'string') return value;
                        if (typeof value === 'number') return String(value);
                        if (typeof value === 'boolean') return String(value);
                        return String(value);
                    }
                }
            };

            filtered = applyFilters(
                filtered,
                reservationFilterConditions,
                reservationFilterLogicalOperators,
                getFieldValue
            );
```

**Problem:** Es wird KEIN `columnEvaluators` Parameter übergeben! Das bedeutet:
- `checkInDate`/`checkOutDate` werden als Strings verglichen (contains, startsWith funktionieren nicht sinnvoll)
- Es wird NICHT `evaluateDateCondition` verwendet
- Status/PaymentStatus werden als Text verglichen (nicht als Enum)
- Amount wird als Text verglichen (nicht als Zahl)

**Vergleich mit Tasks:**
```989:1104:frontend/src/pages/Worktracker.tsx
                    const columnEvaluators: any = {
                        'title': (task: Task, cond: FilterCondition) => {
                            // ... spezielle Logik
                        },
                        'status': (task: Task, cond: FilterCondition) => {
                            if (cond.operator === 'equals') return task.status === cond.value;
                            if (cond.operator === 'notEquals') return task.status !== cond.value;
                            return null;
                        },
                        // ...
                        'dueDate': (task: Task, cond: FilterCondition) => {
                            return evaluateDateCondition(task.dueDate, cond);
                        }
                    };

                    // ...

                    const filtered = applyFilters(
                        [task],
                        filterConditions,
                        filterLogicalOperators,
                        getFieldValue,
                        columnEvaluators  // ✅ Wird übergeben!
                    );
```

**Erwartetes Verhalten:**
- `checkInDate`/`checkOutDate` sollten `evaluateDateCondition` verwenden
- `status`/`paymentStatus` sollten Enum-Vergleiche haben (equals, notEquals)
- `amount` sollte Zahlen-Vergleiche haben (equals, greaterThan, lessThan)
- `arrivalTime` sollte Datums-Vergleiche haben

---

### 3. ❌ Status/PaymentStatus haben falsche Operatoren

**Problem:**
- `status` und `paymentStatus` bekommen Text-Operatoren (equals, contains, startsWith, endsWith)
- Sollten aber Status-Operatoren haben (equals, notEquals)

**Betroffene Dateien:**
- `frontend/src/components/FilterRow.tsx` Zeile 86-87

**Aktueller Code:**
```86:87:frontend/src/components/FilterRow.tsx
  } else if (columnId === 'status') {
    return statusOperators;
```

**Problem:** Nur `status` wird erkannt, aber `paymentStatus` wird NICHT erkannt, daher bekommt es Text-Operatoren.

**Erwartetes Verhalten:**
- `status` sollte Status-Operatoren haben: `equals`, `notEquals`
- `paymentStatus` sollte Status-Operatoren haben: `equals`, `notEquals`

**Vergleich:**
- ✅ Tasks: `status` hat Status-Operatoren (Zeile 86)
- ✅ Requests: `status` hat Status-Operatoren (Zeile 86)
- ❌ Reservations: `paymentStatus` hat Text-Operatoren

---

### 4. ❌ Amount hat falsche Operatoren

**Problem:**
- `amount` bekommt Text-Operatoren (equals, contains, startsWith, endsWith)
- Sollte aber Zahlen-Operatoren haben (equals, greaterThan, lessThan)

**Betroffene Dateien:**
- `frontend/src/components/FilterRow.tsx` Zeile 68-73, 84-85

**Aktueller Code:**
```68:73:frontend/src/components/FilterRow.tsx
  // Dauer-Operatoren (für Zeitspannen)
  const durationOperators = [
    { value: 'equals', label: t('filter.operators.isEqual') },
    { value: 'greater_than', label: t('filter.operators.greaterThan') },
    { value: 'less_than', label: t('filter.operators.lessThan') }
  ];
```

```84:85:frontend/src/components/FilterRow.tsx
  } else if (columnId === 'duration') {
    return durationOperators;
```

**Problem:** `amount` wird NICHT erkannt, daher bekommt es Text-Operatoren.

**Erwartetes Verhalten:**
- `amount` sollte Zahlen-Operatoren haben:
  - `equals` (ist gleich)
  - `greaterThan` (größer als)
  - `lessThan` (kleiner als)

**Hinweis:** Die Operatoren heißen `greater_than`/`less_than` in `durationOperators`, aber `greaterThan`/`lessThan` in `filterLogic.ts`. Das muss konsistent sein.

---

### 5. ❌ ArrivalTime hat falsche Operatoren

**Problem:**
- `arrivalTime` bekommt Text-Operatoren (equals, contains, startsWith, endsWith)
- Sollte aber Datum-Operatoren haben (equals, after, before, between)

**Betroffene Dateien:**
- `frontend/src/components/FilterRow.tsx` Zeile 82-83

**Problem:** `arrivalTime` wird NICHT als Datumsfeld erkannt.

**Erwartetes Verhalten:**
- `arrivalTime` sollte Datum-Operatoren haben (wie `checkInDate`/`checkOutDate`)

---

### 6. ⚠️ FilterRow.tsx: Datumsfeld-Erkennung fehlt für arrivalTime

**Betroffene Dateien:**
- `frontend/src/components/FilterRow.tsx` Zeile 366

**Aktueller Code:**
```366:366:frontend/src/components/FilterRow.tsx
    if (columnId === 'dueDate' || columnId === 'startTime') {
```

**Problem:** `arrivalTime`, `checkInDate`, `checkOutDate` werden NICHT als Datumsfelder erkannt, daher wird kein Datums-Input-Feld gerendert.

**Erwartetes Verhalten:**
- `checkInDate`, `checkOutDate`, `arrivalTime` sollten Datums-Input-Felder haben (wie `dueDate` und `startTime`)

---

## Zusammenfassung der Probleme

### Operatoren-Probleme (FilterRow.tsx)

| Spalte | Aktuell | Sollte sein | Status |
|--------|---------|------------|--------|
| `checkInDate` | Text (equals, contains, startsWith, endsWith) | Datum (equals, after, before, between) | ❌ |
| `checkOutDate` | Text (equals, contains, startsWith, endsWith) | Datum (equals, after, before, between) | ❌ |
| `arrivalTime` | Text (equals, contains, startsWith, endsWith) | Datum (equals, after, before, between) | ❌ |
| `paymentStatus` | Text (equals, contains, startsWith, endsWith) | Status (equals, notEquals) | ❌ |
| `amount` | Text (equals, contains, startsWith, endsWith) | Zahl (equals, greaterThan, lessThan) | ❌ |
| `status` | Status (equals, notEquals) | Status (equals, notEquals) | ✅ |

### Evaluierungs-Probleme (Worktracker.tsx)

| Spalte | Aktuell | Sollte sein | Status |
|--------|---------|------------|--------|
| `checkInDate` | String-Vergleich | `evaluateDateCondition` | ❌ |
| `checkOutDate` | String-Vergleich | `evaluateDateCondition` | ❌ |
| `arrivalTime` | String-Vergleich | `evaluateDateCondition` | ❌ |
| `status` | String-Vergleich | Enum-Vergleich (equals, notEquals) | ❌ |
| `paymentStatus` | String-Vergleich | Enum-Vergleich (equals, notEquals) | ❌ |
| `amount` | String-Vergleich | Zahlen-Vergleich (equals, greaterThan, lessThan) | ❌ |
| `guestName` | String-Vergleich | String-Vergleich | ✅ |
| `guestEmail` | String-Vergleich | String-Vergleich | ✅ |
| `guestPhone` | String-Vergleich | String-Vergleich | ✅ |
| `roomNumber` | String-Vergleich | String-Vergleich | ✅ |

### Input-Feld-Probleme (FilterRow.tsx)

| Spalte | Aktuell | Sollte sein | Status |
|--------|---------|------------|--------|
| `checkInDate` | Text-Input | Datums-Input | ❌ |
| `checkOutDate` | Text-Input | Datums-Input | ❌ |
| `arrivalTime` | Text-Input | Datums-Input | ❌ |

---

## Vergleich mit anderen Filtern

### Tasks (✅ Korrekt implementiert)

**FilterRow.tsx:**
- ✅ `dueDate` hat Datum-Operatoren (Zeile 82)
- ✅ `status` hat Status-Operatoren (Zeile 86)
- ✅ `dueDate` hat Datums-Input (Zeile 366)

**Worktracker.tsx:**
- ✅ `columnEvaluators` vorhanden (Zeile 989-1073)
- ✅ `dueDate` verwendet `evaluateDateCondition` (Zeile 1071)
- ✅ `status` verwendet Enum-Vergleich (Zeile 1013-1016)

### Requests (✅ Korrekt implementiert)

**FilterRow.tsx:**
- ✅ `dueDate` hat Datum-Operatoren (Zeile 82)
- ✅ `status` hat Status-Operatoren (Zeile 86)

**Requests.tsx:**
- ✅ `columnEvaluators` vorhanden (Zeile 744-795)
- ✅ `dueDate` verwendet `evaluateDateCondition`
- ✅ `status` verwendet Enum-Vergleich

### Consultations (✅ Korrekt implementiert)

**FilterRow.tsx:**
- ✅ `startTime` hat Datum-Operatoren (Zeile 82)
- ✅ `startTime` hat Datums-Input (Zeile 366)

**ConsultationList.tsx:**
- ✅ `columnEvaluators` vorhanden
- ✅ `startTime` verwendet `evaluateDateCondition`

### Reservations (❌ NICHT korrekt implementiert)

**FilterRow.tsx:**
- ❌ `checkInDate`/`checkOutDate` haben Text-Operatoren
- ❌ `paymentStatus` hat Text-Operatoren
- ❌ `amount` hat Text-Operatoren
- ❌ `arrivalTime` hat Text-Operatoren
- ❌ Keine Datums-Inputs für Datumsfelder

**Worktracker.tsx:**
- ❌ KEINE `columnEvaluators` für Reservations
- ❌ Datumsfelder werden als Strings verglichen
- ❌ Status/PaymentStatus werden als Strings verglichen
- ❌ Amount wird als String verglichen

---

## Test-Checkliste

### Spalten testen

- [ ] `guestName` - Text-Filter (equals, contains, startsWith, endsWith)
- [ ] `status` - Status-Filter (equals, notEquals) - **MUSS funktionieren**
- [ ] `paymentStatus` - Status-Filter (equals, notEquals) - **MUSS funktionieren**
- [ ] `checkInDate` - Datum-Filter (equals, after, before, between) - **MUSS funktionieren**
- [ ] `checkOutDate` - Datum-Filter (equals, after, before, between) - **MUSS funktionieren**
- [ ] `roomNumber` - Text-Filter (equals, contains, startsWith, endsWith)
- [ ] `guestEmail` - Text-Filter (equals, contains, startsWith, endsWith)
- [ ] `guestPhone` - Text-Filter (equals, contains, startsWith, endsWith)
- [ ] `amount` - Zahlen-Filter (equals, greaterThan, lessThan) - **MUSS funktionieren**
- [ ] `arrivalTime` - Datum-Filter (equals, after, before, between) - **MUSS funktionieren**
- [ ] `onlineCheckInCompleted` - Boolean-Filter (equals, notEquals)
- [ ] `doorPin` - Text-Filter (equals, contains, startsWith, endsWith)

### Operatoren testen

**Datum-Operatoren (checkInDate, checkOutDate, arrivalTime):**
- [ ] `equals` - Genau dieses Datum
- [ ] `after` - Nach/seit diesem Datum
- [ ] `before` - Vor/bis diesem Datum
- [ ] `between` - Zwischen zwei Daten (falls implementiert)

**Status-Operatoren (status, paymentStatus):**
- [ ] `equals` - Genau dieser Status
- [ ] `notEquals` - Nicht dieser Status

**Zahlen-Operatoren (amount):**
- [ ] `equals` - Genau dieser Betrag
- [ ] `greaterThan` - Größer als
- [ ] `lessThan` - Kleiner als

**Text-Operatoren (guestName, guestEmail, guestPhone, roomNumber, doorPin):**
- [ ] `equals` - Genau dieser Text
- [ ] `contains` - Enthält diesen Text
- [ ] `startsWith` - Beginnt mit diesem Text
- [ ] `endsWith` - Endet mit diesem Text

### Merkmalsausprägungen testen

**Status:**
- [ ] `CONFIRMED`
- [ ] `NOTIFICATION_SENT`
- [ ] `CHECKED_IN`
- [ ] `CHECKED_OUT`
- [ ] `CANCELLED`
- [ ] `NO_SHOW`

**PaymentStatus:**
- [ ] `PAID`
- [ ] `PARTIALLY_PAID`
- [ ] `REFUNDED`
- [ ] `PENDING`

### Logische Operatoren testen

- [ ] AND-Verknüpfung zwischen mehreren Bedingungen
- [ ] OR-Verknüpfung zwischen mehreren Bedingungen
- [ ] Gemischte AND/OR-Verknüpfungen

---

## Implementierte Fixes

**Status:** ✅ **ALLE FIXES IMPLEMENTIERT**

### 1. ✅ FilterRow.tsx - Operatoren korrigiert

**Änderungen:**
- `checkInDate`, `checkOutDate`, `arrivalTime` zu Datumsfeld-Erkennung hinzugefügt (Zeile 82)
- `paymentStatus` zu Status-Operatoren hinzugefügt (Zeile 86)
- `amount` zu Zahlen-Operatoren hinzugefügt (Zeile 84)
- Datums-Input-Felder für `checkInDate`, `checkOutDate`, `arrivalTime` hinzugefügt (Zeile 366)
- Operatoren-Namen korrigiert: `greater_than`/`less_than` → `greaterThan`/`lessThan` (Zeile 71-72)

**Datei:** `frontend/src/components/FilterRow.tsx`

### 2. ✅ Worktracker.tsx - columnEvaluators implementiert

**Änderungen:**
- `columnEvaluators` für Reservations implementiert (analog zu Tasks)
- `checkInDate`/`checkOutDate`/`arrivalTime` verwenden jetzt `evaluateDateCondition`
- `status`/`paymentStatus` verwenden jetzt Enum-Vergleich (equals, notEquals)
- `amount` verwendet jetzt Zahlen-Vergleich (equals, greaterThan, lessThan)
- Text-Felder haben spezielle Evaluatoren für bessere Performance
- `doorPin` und `onlineCheckInCompleted` Evaluatoren hinzugefügt

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeile 1266-1370)

### 3. ✅ Alle Spalten unterstützt

**Datum-Spalten:**
- ✅ `checkInDate` - Datum-Operatoren (equals, after, before, between)
- ✅ `checkOutDate` - Datum-Operatoren (equals, after, before, between)
- ✅ `arrivalTime` - Datum-Operatoren (equals, after, before, between)

**Status-Spalten:**
- ✅ `status` - Status-Operatoren (equals, notEquals)
- ✅ `paymentStatus` - Status-Operatoren (equals, notEquals)

**Zahlen-Spalten:**
- ✅ `amount` - Zahlen-Operatoren (equals, greaterThan, lessThan)

**Text-Spalten:**
- ✅ `guestName` - Text-Operatoren (equals, contains, startsWith, endsWith)
- ✅ `guestEmail` - Text-Operatoren (equals, contains, startsWith, endsWith)
- ✅ `guestPhone` - Text-Operatoren (equals, contains, startsWith, endsWith)
- ✅ `roomNumber` - Text-Operatoren (equals, contains, startsWith, endsWith)
- ✅ `doorPin` - Text-Operatoren (equals, contains, startsWith, endsWith)
- ✅ `branch` - Text-Operatoren (equals, contains)

**Boolean-Spalten:**
- ✅ `onlineCheckInCompleted` - Boolean-Operatoren (equals, notEquals)

---

## Nächste Schritte

**Tests durchführen:**
- [ ] Alle Spalten testen
- [ ] Alle Operatoren testen
- [ ] Alle Merkmalsausprägungen testen
- [ ] Logische Operatoren testen (AND/OR)
- [ ] Datums-Input-Felder testen (inkl. __TODAY__)
- [ ] Zahlen-Vergleiche testen
- [ ] Enum-Vergleiche testen

---

**Datum:** 2025-01-22  
**Status:** ✅ Analyse abgeschlossen - ALLE FIXES IMPLEMENTIERT

