# Filtering-Architektur: Umfassende Analyse (2025-01-27)

## Übersicht

Diese Dokumentation analysiert, wie Filtering bei allen Entitäten implementiert ist (Requests, Tasks, Reservations, TourBookings, Tours) und ob das Vorgehen standardisiert ist.

---

## ✅ STANDARDISIERTE KOMPONENTEN

### 1. Zentrale Filter-Konvertierung

**Datei:** `backend/src/utils/filterToPrisma.ts`

**Funktion:** `convertFilterConditionsToPrismaWhere()`

**Verwendung:** Alle Controller verwenden diese zentrale Funktion

**Parameter:**
- `conditions`: Array von Filter-Bedingungen
- `operators`: Array von logischen Operatoren ('AND' | 'OR')
- `entityType`: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation'

**Unterstützte Felder:**
- ✅ `status` - Status-Filter (equals, notEquals)
- ✅ `title` - Text-Filter (equals, contains, startsWith, endsWith)
- ✅ `type` - Typ-Filter (equals, notEquals)
- ✅ `dueDate` - Datum-Filter (equals, before, after) - für Tasks/Requests
- ✅ `tourDate` - Datum-Filter (equals, before, after) - für Tours
- ✅ `bookingDate` - Datum-Filter (equals, before, after) - für TourBookings
- ✅ `checkInDate` - Datum-Filter (equals, before, after) - für Reservations ⭐ **NEU (2025-01-27)**
- ✅ `checkOutDate` - Datum-Filter (equals, before, after) - für Reservations ⭐ **NEU (2025-01-27)**
- ✅ `responsible` - User/Role-Filter (user-{id}, role-{id})
- ✅ `qualityControl` - User-Filter (user-{id}) - nur Tasks
- ✅ `requestedBy` - User-Filter (user-{id}) - nur Requests
- ✅ `createdBy` - User-Filter (user-{id}) - nur Tours
- ✅ `bookedBy` - User-Filter (user-{id}) - nur TourBookings
- ✅ `branch` - Branch-Filter (equals, contains)

**Spezielle Features:**
- ✅ `__TODAY__` Unterstützung für Datumsfelder
- ✅ UND/ODER-Verknüpfungen
- ✅ Filter-Caching (via `filterCache`)

---

### 2. Standardisiertes Controller-Pattern

**Alle Controller folgen diesem Pattern:**

```typescript
// 1. Filter-Parameter aus Query lesen
const filterId = req.query.filterId as string | undefined;
const filterConditions = req.query.filterConditions 
    ? JSON.parse(req.query.filterConditions as string) 
    : undefined;

// 2. Filter-Bedingungen konvertieren
let filterWhereClause: any = {};
if (filterId) {
    const filterData = await filterCache.get(parseInt(filterId, 10));
    if (filterData) {
        const conditions = JSON.parse(filterData.conditions);
        const operators = JSON.parse(filterData.operators);
        filterWhereClause = convertFilterConditionsToPrismaWhere(
            conditions,
            operators,
            'entityType'
        );
    }
} else if (filterConditions) {
    filterWhereClause = convertFilterConditionsToPrismaWhere(
        filterConditions.conditions || filterConditions,
        filterConditions.operators || [],
        'entityType'
    );
}

// 3. Basis-WHERE-Bedingungen erstellen
const baseWhereConditions: any[] = [];
// ... entity-spezifische Filter ...

// 4. Filter-Bedingungen hinzufügen
if (Object.keys(filterWhereClause).length > 0) {
    baseWhereConditions.push(filterWhereClause);
}

// 5. Kombiniere alle Filter
const whereClause = baseWhereConditions.length === 1
    ? baseWhereConditions[0]
    : { AND: baseWhereConditions };

// 6. Query ausführen
const entities = await prisma.entity.findMany({
    where: whereClause,
    // ... includes, orderBy, etc.
});
```

---

## 📊 ENTITÄT-SPEZIFISCHE UNTERSCHIEDE

### 1. Tasks (`getAllTasks`)

**Datei:** `backend/src/controllers/taskController.ts`

**Standardisiert:**
- ✅ Verwendet `convertFilterConditionsToPrismaWhere` mit `entityType: 'task'`
- ✅ Verwendet `filterCache.get()` für Filter-Caching
- ✅ Keine `limit`/`offset` Parameter (immer alle Ergebnisse)
- ✅ Kombiniert Filter mit `baseWhereConditions` Array

**Spezifisch:**
- ✅ Komplexe OR-Struktur für Berechtigungen:
  ```typescript
  OR: [
      { organizationId, responsibleId: userId },
      { organizationId, qualityControlId: userId },
      { organizationId, roleId: userRoleId }
  ]
  ```
- ✅ Optional: `includeAttachments` Query-Parameter

**Unterstützte Filter-Felder:**
- `status`, `title`, `type`, `dueDate`, `responsible`, `qualityControl`, `branch`

---

### 2. Requests (`getAllRequests`)

**Datei:** `backend/src/controllers/requestController.ts`

**Standardisiert:**
- ✅ Verwendet `convertFilterConditionsToPrismaWhere` mit `entityType: 'request'`
- ✅ Verwendet `filterCache.get()` für Filter-Caching
- ✅ Keine `limit`/`offset` Parameter (immer alle Ergebnisse)
- ✅ Kombiniert Filter mit `baseWhereConditions` Array

**Spezifisch:**
- ✅ Komplexe OR-Struktur für `isPrivate`:
  ```typescript
  OR: [
      { isPrivate: false, organizationId },
      { isPrivate: true, organizationId, requesterId: userId },
      { isPrivate: true, organizationId, responsibleId: userId }
  ]
  ```
- ✅ Optional: `includeAttachments` Query-Parameter
- ✅ Try-Catch um Filter-Laden (fehlertoleranter)

**Unterstützte Filter-Felder:**
- `status`, `title`, `type`, `dueDate`, `responsible`, `requestedBy`, `branch`

---

### 3. Reservations (`getAllReservations`)

**Datei:** `backend/src/controllers/reservationController.ts`

**Standardisiert:**
- ✅ Verwendet `convertFilterConditionsToPrismaWhere` mit `entityType: 'reservation'`
- ✅ Verwendet `filterCache.get()` für Filter-Caching
- ✅ Keine `limit`/`offset` Parameter (immer alle Ergebnisse)
- ✅ Kombiniert Filter mit `baseWhereConditions` Array

**Spezifisch:**
- ✅ Branch-Berechtigungslogik:
  ```typescript
  if (hasOwnBranchPermission && !hasAllBranchesPermission) {
      whereClause.branchId = branchId; // Filtere nach User-Branch
  }
  ```
- ✅ Prüft Berechtigungen: `reservations_all_branches`, `reservations_own_branch`

**Unterstützte Filter-Felder:**
- `status`, `title`, `type`, `checkInDate` ⭐, `checkOutDate` ⭐, `branch`

**⭐ NEU (2025-01-27):** `checkInDate` und `checkOutDate` werden jetzt unterstützt!

---

### 4. TourBookings (`getAllTourBookings`)

**Datei:** `backend/src/controllers/tourBookingController.ts`

**Standardisiert:**
- ✅ Verwendet `convertFilterConditionsToPrismaWhere` mit `entityType: 'tour_booking'`
- ✅ Verwendet `filterCache.get()` für Filter-Caching
- ✅ Kombiniert Filter mit `baseWhereConditions` Array

**Spezifisch:**
- ⚠️ **UNTERSCHIED:** Hat noch `limit` Query-Parameter (optional)
- ✅ Zusätzliche Query-Parameter (direkt, nicht über Filter):
  - `tourId`, `status`, `paymentStatus`, `bookedById`
  - `bookingDateFrom`, `bookingDateTo`
  - `tourDateFrom`, `tourDateTo`
  - `search` (customerName, customerEmail, customerPhone)

**Unterstützte Filter-Felder:**
- `status`, `title`, `type`, `bookingDate`, `tourDate`, `bookedBy`, `branch`

---

### 5. Tours (`getAllTours`)

**Datei:** `backend/src/controllers/tourController.ts`

**Standardisiert:**
- ✅ Verwendet `convertFilterConditionsToPrismaWhere` mit `entityType: 'tour'`
- ✅ Verwendet `filterCache.get()` für Filter-Caching
- ✅ Kombiniert Filter mit `baseWhereConditions` Array

**Spezifisch:**
- ⚠️ **UNTERSCHIED:** Hat noch `limit` Query-Parameter (optional)
- ✅ Zusätzliche Query-Parameter (direkt, nicht über Filter):
  - `type` (TourType)
  - `isActive` (boolean, Standard: true)
  - `search` (title)
- ✅ Standard: Nur aktive Touren (`isActive: true`)

**Unterstützte Filter-Felder:**
- `status`, `title`, `type`, `tourDate`, `createdBy`, `branch`

---

## 🔍 VERGLEICHSMATRIX

| Feature | Tasks | Requests | Reservations | TourBookings | Tours |
|---------|-------|---------|--------------|-----------|--------|
| **convertFilterConditionsToPrismaWhere** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **filterCache.get()** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Keine limit/offset** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **baseWhereConditions Array** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AND-Kombination** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Berechtigungslogik** | ✅ (OR) | ✅ (OR) | ✅ (Branch) | ❌ | ❌ |
| **Zusätzliche Query-Parameter** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Try-Catch um Filter** | ❌ | ✅ | ❌ | ✅ | ✅ |

---

## ⚠️ INKONSISTENZEN

### 1. Limit-Parameter

**Problem:**
- Tasks, Requests, Reservations: Keine `limit`/`offset` Parameter (immer alle Ergebnisse)
- TourBookings, Tours: Haben noch `limit` Parameter (optional)

**Empfehlung:**
- Sollte standardisiert werden: Entweder alle haben `limit`, oder keiner hat `limit`
- Aktuell: TourBookings/Tours sollten `limit` entfernen (konsistent mit anderen)

---

### 2. Fehlerbehandlung

**Problem:**
- Requests, TourBookings, Tours: Try-Catch um Filter-Laden
- Tasks, Reservations: Kein Try-Catch

**Empfehlung:**
- Sollte standardisiert werden: Alle sollten Try-Catch haben (fehlertoleranter)

---

### 3. Zusätzliche Query-Parameter

**Problem:**
- TourBookings, Tours: Haben viele zusätzliche Query-Parameter (direkt, nicht über Filter)
- Tasks, Requests, Reservations: Nur Filter-Parameter

**Empfehlung:**
- Sollte dokumentiert werden: Warum gibt es zusätzliche Parameter?
- Möglicherweise sollten diese auch über Filter-System gehen?

---

## 📝 FRONTEND-INTEGRATION

### Standardisiertes Pattern

**Alle Frontend-Komponenten folgen diesem Pattern:**

```typescript
// 1. Filter-Parameter aus Query lesen
const filterId = req.query.filterId as string | undefined;
const filterConditions = req.query.filterConditions 
    ? JSON.parse(req.query.filterConditions as string) 
    : undefined;

// 2. API-Call mit Filter-Parametern
const response = await axiosInstance.get(API_ENDPOINTS.ENTITY.BASE, { 
    params: {
        ...(filterId ? { filterId } : {}),
        ...(filterConditions ? { filterConditions: JSON.stringify(filterConditions) } : {})
    }
});

// 3. Daten im State speichern
setEntities(response.data?.data || response.data || []);
```

**Verwendet in:**
- ✅ `Worktracker.tsx` (Tasks, Reservations)
- ✅ `Requests.tsx` (Requests)
- ✅ TourBookings (vermutlich ähnlich)

---

## 🎯 EMPFEHLUNGEN

### 1. Standardisierung

**Sofort umsetzbar:**
- ✅ Alle Controller sollten Try-Catch um Filter-Laden haben
- ⚠️ TourBookings/Tours sollten `limit` entfernen (konsistent mit anderen)

**Langfristig:**
- ⚠️ Zusätzliche Query-Parameter sollten dokumentiert werden
- ⚠️ Möglicherweise sollten zusätzliche Parameter auch über Filter-System gehen

---

### 2. Dokumentation

**Erforderlich:**
- ✅ Diese Dokumentation (Filtering-Architektur)
- ✅ API-Dokumentation für jeden Controller
- ✅ Frontend-Integration-Dokumentation

---

### 3. Testing

**Empfohlen:**
- ✅ Unit-Tests für `convertFilterConditionsToPrismaWhere`
- ✅ Integration-Tests für jeden Controller
- ✅ E2E-Tests für Filter-Funktionalität

---

## 📚 ZUSAMMENFASSUNG

### ✅ Was ist standardisiert?

1. **Zentrale Filter-Konvertierung:** Alle Controller verwenden `convertFilterConditionsToPrismaWhere`
2. **Filter-Caching:** Alle verwenden `filterCache.get()`
3. **Filter-Parameter:** Alle lesen `filterId` und `filterConditions` aus Query
4. **WHERE-Klausel-Struktur:** Alle verwenden `baseWhereConditions` Array + `AND`-Kombination
5. **Frontend-Integration:** Alle verwenden ähnliches Pattern

### ⚠️ Was ist NICHT standardisiert?

1. **Limit-Parameter:** TourBookings/Tours haben noch `limit`, andere nicht
2. **Fehlerbehandlung:** Nicht alle haben Try-Catch um Filter-Laden
3. **Zusätzliche Query-Parameter:** TourBookings/Tours haben viele zusätzliche Parameter
4. **Berechtigungslogik:** Jede Entität hat unterschiedliche Logik

### 🎯 Fazit

**Das Filtering-System ist größtenteils standardisiert**, aber es gibt einige Inkonsistenzen, die behoben werden sollten:

1. ✅ **Kern-Funktionalität ist standardisiert** (convertFilterConditionsToPrismaWhere, filterCache, etc.)
2. ⚠️ **Einige Details sind inkonsistent** (limit-Parameter, Fehlerbehandlung)
3. ✅ **Die Architektur ist gut** (zentrale Funktion, wiederverwendbar, erweiterbar)

**Status:** ✅ **Gut strukturiert, mit kleinen Verbesserungspotenzialen**

---

**Datum:** 2025-01-27  
**Autor:** Claude (Auto)  
**Status:** ✅ Analyse abgeschlossen



