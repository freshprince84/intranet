# Filter-Probleme Analyse für Reservations (2025-01-29)

**Status:** 📋 ANALYSE - Detaillierte Dokumentation der identifizierten Probleme  
**Priorität:** 🔴🔴 WICHTIG

---

## 📊 ÜBERSICHT

Diese Analyse dokumentiert **genau** welche Filter-Felder für Reservations verfügbar sind, welche im Backend unterstützt werden, und welche Probleme identifiziert wurden.

---

## 1. FRONTEND VERFÜGBARE FILTER-SPALTEN

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeile 303-322)

### Standard-Filter-Spalten (`availableReservationColumns`):
1. ✅ `guestName` - Gast-Name
2. ✅ `status` - Status
3. ✅ `paymentStatus` - Zahlungsstatus
4. ✅ `checkInDate` - Check-in-Datum
5. ✅ `checkOutDate` - Check-out-Datum
6. ✅ `roomNumber` - Zimmernummer
7. ✅ `branch` - Niederlassung
8. ✅ `guestEmail` - E-Mail
9. ✅ `guestPhone` - Telefon
10. ✅ `amount` - Betrag
11. ✅ `arrivalTime` - Ankunftszeit

### Zusätzliche Filter-Spalten (`reservationFilterOnlyColumns`):
12. ✅ `onlineCheckInCompleted` - Online Check-in abgeschlossen
13. ✅ `doorPin` - Tür-PIN

**Gesamt: 13 Filter-Spalten im Frontend verfügbar**

---

## 2. BACKEND UNTERSTÜTZTE FILTER-FELDER

**Datei:** `backend/src/utils/filterToPrisma.ts`

### Unterstützte Felder für Reservations:

| Feld | Unterstützt | Operatoren | Bemerkung |
|------|-------------|------------|-----------|
| `status` | ✅ | equals, notEquals | |
| `title` | ⚠️ | equals, contains, startsWith, endsWith | **PROBLEM: Reservations haben kein `title`-Feld** |
| `type` | ⚠️ | equals, notEquals | **PROBLEM: Reservations haben kein `type`-Feld** |
| `checkInDate` | ✅ | equals, before, after | |
| `checkOutDate` | ✅ | equals, before, after | |
| `Deadline`/`deadline` | ✅ | equals, before, after | Wird zu `paymentDeadline` konvertiert |
| `guestName` | ✅ | equals, contains, startsWith, endsWith | |
| `paymentStatus` | ✅ | equals, notEquals | |
| `roomNumber` | ✅ | equals, contains | |
| `guestEmail` | ✅ | equals, contains | |
| `guestPhone` | ✅ | equals, contains | |
| `amount` | ✅ | equals, greaterThan, lessThan | |
| `arrivalTime` | ✅ | equals, before, after | |
| `onlineCheckInCompleted` | ✅ | equals, notEquals | Boolean-Konvertierung |
| `doorPin` | ✅ | equals, contains | |
| `branch` | ✅ | equals, contains | |

**Gesamt: 16 Felder im Backend unterstützt (inkl. problematische)**

---

## 3. IDENTIFIZIERTE PROBLEME

### Problem 1: Nicht existierende Felder werden unterstützt

**Feld:** `title` und `type`

**Problem:**
- Im Backend werden `title` und `type` als Filter-Felder unterstützt
- Reservations haben diese Felder **NICHT** im Prisma-Schema
- Wenn ein Filter auf `title` oder `type` gesetzt wird, gibt `convertSingleCondition` ein leeres Objekt `{}` zurück
- Der Filter wird **stillschweigend ignoriert** - keine Fehlermeldung, keine Warnung
- User sieht keine Ergebnisse, obwohl Filter gesetzt ist

**Code-Stelle:**
```typescript
// backend/src/utils/filterToPrisma.ts, Zeile 103-121
case 'title':
  if (operator === 'equals') {
    return { title: { equals: value, mode: 'insensitive' } };
  }
  // ... weitere Operatoren
  return {};

case 'type':
  if (operator === 'equals') {
    return { type: value };
  }
  // ... weitere Operatoren
  return {};
```

**Auswirkung:**
- Filter auf `title` oder `type` funktionieren **NICHT**
- User sieht keine Fehlermeldung
- Filter wird stillschweigend ignoriert

---

### Problem 2: Feld im Backend unterstützt, aber nicht im Frontend verfügbar

**Feld:** `Deadline`/`deadline` → `paymentDeadline`

**Problem:**
- Im Backend wird `Deadline`/`deadline` unterstützt und zu `paymentDeadline` konvertiert
- Im Frontend ist dieses Feld **NICHT** in `availableReservationColumns` oder `reservationFilterOnlyColumns` verfügbar
- User kann diesen Filter **NICHT** über die UI setzen
- Nur über direkte API-Calls möglich

**Code-Stelle:**
```typescript
// backend/src/utils/filterToPrisma.ts, Zeile 130-136
case 'Deadline':
case 'deadline':
  // ✅ FIX: Deadline → paymentDeadline (korrekter Feldname im Schema)
  if (entityType === 'reservation') {
    return convertDateCondition(value, operator, 'paymentDeadline');
  }
  return {};
```

**Auswirkung:**
- Filter auf `paymentDeadline` ist im Frontend **NICHT** verfügbar
- Backend unterstützt es, aber User kann es nicht nutzen

---

### Problem 3: Fehlende Operatoren für bestimmte Felder

**Feld:** `roomNumber`, `guestEmail`, `guestPhone`

**Problem:**
- Diese Felder unterstützen nur `equals` und `contains`
- `startsWith` und `endsWith` werden **NICHT** unterstützt
- Im Frontend werden diese Operatoren aber möglicherweise angeboten (abhängig von `getOperatorsByColumnType`)

**Code-Stelle:**
```typescript
// backend/src/utils/filterToPrisma.ts, Zeile 163-191
case 'roomNumber':
  if (entityType === 'reservation') {
    if (operator === 'equals') {
      return { roomNumber: { equals: value, mode: 'insensitive' } };
    } else if (operator === 'contains') {
      return { roomNumber: { contains: value as string, mode: 'insensitive' } };
    }
  }
  return {}; // startsWith, endsWith werden ignoriert
```

**Auswirkung:**
- Wenn User `startsWith` oder `endsWith` für `roomNumber`, `guestEmail`, `guestPhone` wählt, wird Filter **stillschweigend ignoriert**

---

### Problem 4: Filter-Operatoren werden möglicherweise nicht korrekt übergeben

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeile 754-757)

**Problem:**
- Bei direkten Filter-Bedingungen wird `reservationFilterLogicalOperators` aus dem State verwendet
- Wenn Filter-Bedingungen direkt übergeben werden (z.B. bei `applyReservationFilterConditions`), werden die Operatoren aus dem State genommen, nicht aus den übergebenen Parametern
- Dies kann zu Inkonsistenzen führen, wenn State und Parameter nicht synchron sind

**Code-Stelle:**
```typescript
// frontend/src/pages/Worktracker.tsx, Zeile 754-757
if (filterId) {
    params.filterId = filterId;
} else if (filterConditions && filterConditions.length > 0) {
    params.filterConditions = JSON.stringify({
        conditions: filterConditions,
        operators: reservationFilterLogicalOperators  // ⚠️ Aus State, nicht aus Parametern
    });
}
```

**Auswirkung:**
- Wenn `applyReservationFilterConditions` mit neuen Operatoren aufgerufen wird, aber State noch nicht aktualisiert ist, werden falsche Operatoren übergeben

---

### Problem 5: Filter-Validierung entfernt Branch-Filter für Nicht-Admin

**Datei:** `backend/src/utils/filterToPrisma.ts` (Zeile 421-431)

**Problem:**
- `validateFilterAgainstIsolation` entfernt `branchId`, `organizationId` und `branch`-Filter komplett für Nicht-Admin-User
- Dies kann dazu führen, dass gültige Branch-Filter entfernt werden, die der User sehen sollte
- Reservations haben eine spezielle Branch-Berechtigungslogik im Controller, die möglicherweise mit der Filter-Validierung kollidiert

**Code-Stelle:**
```typescript
// backend/src/utils/filterToPrisma.ts, Zeile 421-431
// Ignoriere branchId und organizationId direkt
if (key === 'branchId' || key === 'organizationId') {
  // Entferne diese Filter für Nicht-Admin
  continue;
}

// Ignoriere branch-Relation (enthält branchId)
if (key === 'branch') {
  // Entferne Branch-Filter komplett
  continue;
}
```

**Auswirkung:**
- Branch-Filter werden für Nicht-Admin-User **immer** entfernt
- Auch wenn User berechtigt ist, nach Branch zu filtern (z.B. `reservations_own_branch` Berechtigung)

---

### Problem 6: Filter-Caching ohne Fehlerbehandlung

**Datei:** `backend/src/controllers/reservationController.ts` (Zeile 663-676)

**Problem:**
- Wenn `filterId` gesetzt ist, wird Filter aus Cache geladen
- Wenn Filter nicht im Cache gefunden wird (`filterData` ist null), wird `filterWhereClause` leer gelassen
- Keine Fehlermeldung, keine Warnung
- Filter wird stillschweigend ignoriert

**Code-Stelle:**
```typescript
// backend/src/controllers/reservationController.ts, Zeile 663-676
if (filterId) {
    const filterData = await filterCache.get(parseInt(filterId, 10));
    if (filterData) {
        // Filter wird angewendet
    }
    // ⚠️ Wenn filterData null ist, passiert nichts - keine Fehlermeldung
}
```

**Auswirkung:**
- Wenn Filter nicht im Cache gefunden wird, funktioniert Filter **NICHT**
- User sieht keine Fehlermeldung

---

### Problem 7: Leere Filter-Bedingungen werden nicht geprüft

**Datei:** `backend/src/utils/filterToPrisma.ts` (Zeile 34-36, 48-50)

**Problem:**
- Wenn `conditions.length === 0`, wird leeres Objekt zurückgegeben
- Wenn alle Bedingungen zu leeren Objekten konvertiert werden, wird leeres Objekt zurückgegeben
- Keine Warnung, dass Filter ungültig ist

**Code-Stelle:**
```typescript
// backend/src/utils/filterToPrisma.ts, Zeile 34-36
if (conditions.length === 0) {
  return {};
}

// Zeile 48-50
if (prismaConditions.length === 0) {
  return {};
}
```

**Auswirkung:**
- Wenn alle Filter-Bedingungen ungültig sind (z.B. `title` oder `type` für Reservations), wird Filter stillschweigend ignoriert

---

## 4. ZUSAMMENFASSUNG DER PROBLEME

| Problem | Schweregrad | Auswirkung |
|---------|-------------|------------|
| **Problem 1:** Nicht existierende Felder (`title`, `type`) | 🔴🔴 HOCH | Filter funktioniert nicht, keine Fehlermeldung |
| **Problem 2:** `paymentDeadline` nicht im Frontend | 🟡 MITTEL | Filter nicht über UI verfügbar |
| **Problem 3:** Fehlende Operatoren (`startsWith`, `endsWith`) | 🟡 MITTEL | Filter wird ignoriert, keine Fehlermeldung |
| **Problem 4:** Operatoren aus State statt Parameter | 🟡 MITTEL | Inkonsistente Filter-Ergebnisse |
| **Problem 5:** Branch-Filter wird entfernt | 🔴 HOCH | Filter funktioniert nicht für Nicht-Admin |
| **Problem 6:** Filter-Caching ohne Fehlerbehandlung | 🟡 MITTEL | Filter funktioniert nicht, keine Fehlermeldung |
| **Problem 7:** Leere Filter-Bedingungen | 🟡 MITTEL | Filter wird ignoriert, keine Warnung |

---

## 5. EMPFOHLENE NÄCHSTE SCHRITTE

1. ✅ **Problem 1 beheben:** `title` und `type` für Reservations entfernen oder Fehlermeldung hinzufügen
2. ✅ **Problem 2 beheben:** `paymentDeadline` im Frontend verfügbar machen ODER Backend-Support entfernen
3. ✅ **Problem 3 beheben:** `startsWith` und `endsWith` für `roomNumber`, `guestEmail`, `guestPhone` hinzufügen ODER im Frontend nicht anbieten
4. ✅ **Problem 4 beheben:** Operatoren aus Parametern statt State verwenden
5. ✅ **Problem 5 beheben:** Branch-Filter-Validierung überarbeiten (Reservations-spezifische Logik berücksichtigen)
6. ✅ **Problem 6 beheben:** Fehlerbehandlung für Filter-Caching hinzufügen
7. ✅ **Problem 7 beheben:** Warnung/Fehlermeldung bei leeren Filter-Bedingungen

---

**Erstellt:** 2025-01-29  
**Status:** 📋 ANALYSE - Vollständige Dokumentation der Probleme  
**Nächster Schritt:** Warten auf User-Feedback, welche Probleme behoben werden sollen

