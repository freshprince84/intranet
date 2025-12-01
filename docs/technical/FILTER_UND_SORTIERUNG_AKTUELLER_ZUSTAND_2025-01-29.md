# Filter und Sortierung - Aktueller Zustand (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 📋 ANALYSE - Detaillierte Dokumentation des aktuellen Zustands  
**Priorität:** 🔴🔴 WICHTIG

---

## 📊 ÜBERSICHT

Diese Dokumentation beschreibt **genau** wie Filterung und Sortierung aktuell funktioniert für:
1. **Requests**
2. **To Do's (Tasks)**
3. **Reservations**
4. **Tour Buchungen**

**Wichtig:** Alle hardcodierten Werte, Rollen & Standorte werden explizit dokumentiert.

---

## 1. REQUESTS

### Backend: `backend/src/controllers/requestController.ts`

#### Filterung (Server-seitig):

**1. Datenisolation (HARDCODED):**
```typescript
// Zeile 114-146
if (organizationId) {
    baseWhereConditions.push({
        OR: [
            // Öffentliche Requests (isPrivate = false) innerhalb der Organisation
            {
                isPrivate: false,
                organizationId: organizationId  // ✅ HARDCODED: organizationId aus Request
            },
            // Private Requests: Nur wenn User Ersteller ist
            {
                isPrivate: true,
                organizationId: organizationId,
                requesterId: userId  // ✅ HARDCODED: userId aus Request
            },
            // Private Requests: Nur wenn User Verantwortlicher ist
            {
                isPrivate: true,
                organizationId: organizationId,
                responsibleId: userId  // ✅ HARDCODED: userId aus Request
            }
        ]
    });
} else {
    // Standalone User: Nur eigene Requests
    baseWhereConditions.push({
        OR: [
            { requesterId: userId },
            { responsibleId: userId }
        ]
    });
}
```

**2. Filter-Bedingungen (aus Filter-System):**
- `filterId`: Lade Filter aus Cache → konvertiere zu Prisma WHERE
- `filterConditions`: Direkte Filter-Bedingungen → konvertiere zu Prisma WHERE
- Konvertierung über `convertFilterConditionsToPrismaWhere()` (Zeile 89-93, 103-107)

**3. Kombination:**
```typescript
// Zeile 154-156
const whereClause = baseWhereConditions.length === 1
    ? baseWhereConditions[0]
    : { AND: baseWhereConditions };  // ✅ Alle Bedingungen mit AND kombiniert
```

#### Sortierung (Server-seitig):

**HARDCODED:**
```typescript
// Zeile 195-197
orderBy: {
    createdAt: 'desc'  // ✅ HARDCODED: Immer nach Erstellungsdatum (neueste zuerst)
}
```

**Keine anderen Sortierungs-Optionen auf dem Server!**

#### Pagination:
- `limit`: Standard 20 (HARDCODED, Zeile 74)
- `offset`: Standard 0 (HARDCODED, Zeile 77)
- `totalCount`: Wird berechnet (Zeile 161-163)
- `hasMore`: Wird berechnet (Zeile 261)

---

### Frontend: `frontend/src/components/Requests.tsx`

#### Filterung (Client-seitig):

**NUR `searchTerm` wird client-seitig gefiltert:**
```typescript
// Zeile 789-806
.filter(request => {
    // ✅ NUR Globale Suchfunktion (searchTerm) wird client-seitig angewendet
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            request.title.toLowerCase().includes(searchLower) ||
            `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase().includes(searchLower) ||
            `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase().includes(searchLower) ||
            request.branch.name.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
    }
    
    // ❌ ENTFERNEN: Client-seitige Filterung wenn selectedFilterId oder filterConditions gesetzt sind
    // ✅ Server hat bereits gefiltert, keine doppelte Filterung mehr
    
    return true;
})
```

**Filter-Felder (client-seitig):**
- `title` (contains)
- `requestedBy.firstName + lastName` (contains)
- `responsible.firstName + lastName` (contains)
- `branch.name` (contains)

#### Sortierung (Client-seitig):

**Prioritäten (HARDCODED):**
```typescript
// Zeile 807-951
.sort((a, b) => {
    // 1. Priorität: Table-Header-Sortierung (temporäre Überschreibung, auch wenn Filter aktiv)
    if (viewMode === 'table' && sortConfig.key) {
        // ... Sortierung nach sortConfig.key und sortConfig.direction
    }
    
    // 2. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
    if (filterSortDirections.length > 0 && (selectedFilterId !== null || filterConditions.length > 0)) {
        // Sortiere nach Priorität (1, 2, 3, ...)
        // ... Multi-Sortierung nach filterSortDirections
    }
    
    // 3. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
    if (viewMode === 'cards' && selectedFilterId === null && filterConditions.length === 0) {
        // ... Multi-Sortierung nach cardMetadataOrder und cardSortDirections
    }
    
    // 4. Priorität: Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)
    if (viewMode === 'table' && selectedFilterId === null && filterConditions.length === 0 && sortConfig.key) {
        // ... Sortierung nach sortConfig.key und sortConfig.direction
    }
    
    // 5. Fallback: Standardsortierung
    return 0;  // ✅ HARDCODED: Keine Fallback-Sortierung (keine Änderung der Reihenfolge)
})
```

**Status-Order (HARDCODED):**
```typescript
// Zeile 814-820
const statusOrder: Record<string, number> = {
    'approval': 0,
    'to_improve': 1,
    'approved': 2,
    'denied': 3
};
```

**Type-Order (HARDCODED):**
```typescript
// Zeile 822-829
const typeOrder: Record<string, number> = {
    'vacation': 0,
    'improvement_suggestion': 1,
    'sick_leave': 2,
    'employment_certificate': 3,
    'other': 4
};
```

---

## 2. TO DO'S (TASKS)

### Backend: `backend/src/controllers/taskController.ts`

#### Filterung (Server-seitig):

**1. Datenisolation (HARDCODED):**
```typescript
// Zeile 85-127
if (organizationId) {
    if (userRoleId) {  // ✅ HARDCODED: userRoleId aus Request (req.userRole?.role?.id)
        baseWhereConditions.push({
            OR: [
                {
                    organizationId: organizationId,
                    responsibleId: userId
                },
                {
                    organizationId: organizationId,
                    qualityControlId: userId
                },
                {
                    organizationId: organizationId,
                    roleId: userRoleId  // ✅ HARDCODED: User sieht Tasks seiner Rolle
                }
            ]
        });
    } else {
        // Fallback: Nur eigene Tasks
        baseWhereConditions.push({
            OR: [
                {
                    organizationId: organizationId,
                    responsibleId: userId
                },
                {
                    organizationId: organizationId,
                    qualityControlId: userId
                }
            ]
        });
    }
} else {
    // Standalone User: Nur eigene Tasks
    baseWhereConditions.push({
        OR: [
            { responsibleId: userId },
            { qualityControlId: userId }
        ]
    });
}
```

**Wichtig:** Tasks werden nach `roleId` gefiltert, wenn User eine aktive Rolle hat!

**2. Filter-Bedingungen (aus Filter-System):**
- `filterId`: Lade Filter aus Cache → konvertiere zu Prisma WHERE
- `filterConditions`: Direkte Filter-Bedingungen → konvertiere zu Prisma WHERE
- Konvertierung über `convertFilterConditionsToPrismaWhere()` (Zeile 65-69, 73-77)

**3. Kombination:**
```typescript
// Zeile 135-137
const whereClause = baseWhereConditions.length === 1
    ? baseWhereConditions[0]
    : { AND: baseWhereConditions };
```

#### Sortierung (Server-seitig):

**HARDCODED:**
```typescript
// Zeile 157
orderBy: { createdAt: 'desc' }, // Neueste Tasks zuerst
```

**Keine anderen Sortierungs-Optionen auf dem Server!**

#### Pagination:
- `limit`: Standard 20 (HARDCODED, Zeile 51)
- `offset`: Standard 0 (HARDCODED, Zeile 54)
- `totalCount`: Wird berechnet (Zeile 142-144)
- `hasMore`: Wird berechnet (Zeile 205)

---

### Frontend: `frontend/src/pages/Worktracker.tsx`

#### Filterung (Client-seitig):

**NUR `searchTerm` wird client-seitig gefiltert:**
```typescript
// Zeile 1429-1450
.filter(task => {
    // ✅ NUR Globale Suchfunktion (searchTerm) wird client-seitig angewendet
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            task.title.toLowerCase().includes(searchLower) ||
            (task.description && task.description.toLowerCase().includes(searchLower)) ||
            (task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase().includes(searchLower) : false) ||
            (task.role ? task.role.name.toLowerCase().includes(searchLower) : false) ||
            (task.qualityControl && `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase().includes(searchLower)) ||
            task.branch.name.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
    }
    
    return true;
})
```

**Filter-Felder (client-seitig):**
- `title` (contains)
- `description` (contains)
- `responsible.firstName + lastName` (contains)
- `role.name` (contains)
- `qualityControl.firstName + lastName` (contains)
- `branch.name` (contains)

#### Sortierung (Client-seitig):

**Prioritäten (HARDCODED):**
```typescript
// Zeile 1479-1584
.sort((a, b) => {
    // 1. Priorität: Table-Header-Sortierung
    if (viewMode === 'table' && tableSortConfig.key) {
        // ... Sortierung nach tableSortConfig.key und tableSortConfig.direction
    }
    
    // 2. Priorität: Filter-Sortierrichtungen
    if (filterSortDirections.length > 0 && (selectedFilterId !== null || filterConditions.length > 0)) {
        // ... Multi-Sortierung nach filterSortDirections
    }
    
    // 3. Priorität: Cards-Mode Multi-Sortierung
    if (viewMode === 'cards' && selectedFilterId === null && filterConditions.length === 0) {
        // ... Multi-Sortierung nach cardMetadataOrder und taskCardSortDirections
    }
    
    // 4. Priorität: Tabellen-Mode Einzel-Sortierung
    if (viewMode === 'table' && selectedFilterId === null && filterConditions.length === 0 && tableSortConfig.key) {
        // ... Sortierung nach tableSortConfig.key und tableSortConfig.direction
    }
    
    // 5. Fallback: Standardsortierung (HARDCODED)
    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    
    if (aDate !== bDate) {
        return aDate - bDate;  // ✅ HARDCODED: Nach dueDate (aufsteigend)
    }
    
    const aStatusPrio = getStatusPriority(a.status);
    const bStatusPrio = getStatusPriority(b.status);
    
    if (aStatusPrio !== bStatusPrio) {
        return aStatusPrio - bStatusPrio;  // ✅ HARDCODED: Nach Status-Priorität
    }
    
    return a.title.localeCompare(b.title);  // ✅ HARDCODED: Nach Titel (alphabetisch)
})
```

**Status-Priorität (HARDCODED):**
```typescript
// Zeile 1370-1379
const getStatusPriority = (status: Task['status']): number => {
    switch (status) {
        case 'open': return 1;
        case 'in_progress': return 2;
        case 'improval': return 3;
        case 'quality_control': return 4;
        case 'done': return 5;
        default: return 99;
    }
};
```

**Fallback-Sortierung (HARDCODED):**
1. `dueDate` (aufsteigend) - Items ohne dueDate kommen zuletzt
2. `status` (nach Priorität: open < in_progress < improval < quality_control < done)
3. `title` (alphabetisch)

---

## 3. RESERVATIONS

### Backend: `backend/src/controllers/reservationController.ts`

#### Filterung (Server-seitig):

**1. Datenisolation (HARDCODED):**
```typescript
// Zeile 595-634
const whereClause: any = {
    organizationId: req.organizationId  // ✅ HARDCODED: organizationId aus Request
};

// OPTIMIERUNG: Verwende branchId aus Request-Kontext statt zusätzlicher Query
// Wenn nur "own_branch" Berechtigung: Filtere nach Branch
if (hasOwnBranchPermission && !hasAllBranchesPermission) {
    const branchId = (req as any).branchId;  // ✅ HARDCODED: branchId aus Request-Kontext
    
    if (branchId) {
        whereClause.branchId = branchId;
    } else {
        // Fallback: Hole branchId aus UsersBranches (falls nicht im Request-Kontext)
        const userBranch = await prisma.usersBranches.findFirst({
            where: {
                userId: userId,
                branch: {
                    organizationId: req.organizationId
                }
            },
            select: {
                branchId: true
            }
        });
        
        if (userBranch?.branchId) {
            whereClause.branchId = userBranch.branchId;
        } else {
            // User hat keine aktive Branch → keine Reservierungen
            return res.json({
                success: true,
                data: []
            });
        }
    }
}
// Wenn "all_branches" Berechtigung: Kein Branch-Filter (alle Reservierungen)
```

**Wichtig:** Reservations werden nach `branchId` gefiltert, wenn User nur `reservations_own_branch` Berechtigung hat!

**Berechtigungen (HARDCODED):**
- `reservations_all_branches`: Alle Reservierungen der Organisation
- `reservations_own_branch`: Nur Reservierungen der eigenen Branch
- Fallback: `reservations` (alte Berechtigung)

**2. Filter-Bedingungen (aus Filter-System):**
- `filterId`: Lade Filter aus Cache → konvertiere zu Prisma WHERE
- `filterConditions`: Direkte Filter-Bedingungen → konvertiere zu Prisma WHERE
- Konvertierung über `convertFilterConditionsToPrismaWhere()` (Zeile 645-649, 653-657)

**3. Kombination:**
```typescript
// Zeile 666-668
const finalWhereClause = baseWhereConditions.length === 1
    ? baseWhereConditions[0]
    : { AND: baseWhereConditions };
```

#### Sortierung (Server-seitig):

**HARDCODED:**
```typescript
// Zeile 696-698
orderBy: {
    createdAt: 'desc'  // ✅ HARDCODED: Immer nach Erstellungsdatum (neueste zuerst)
}
```

**Keine anderen Sortierungs-Optionen auf dem Server!**

#### Pagination:
- `limit`: Standard 20 (HARDCODED, Zeile 589)
- `offset`: Standard 0 (HARDCODED, Zeile 592)
- `totalCount`: Wird berechnet (Zeile 671-673)
- `hasMore`: Wird berechnet (Zeile 708)

---

### Frontend: `frontend/src/pages/Worktracker.tsx`

#### Filterung (Client-seitig):

**NUR `reservationSearchTerm`, `reservationFilterStatus`, `reservationFilterPaymentStatus` werden client-seitig gefiltert:**
```typescript
// Zeile 1599-1624
.filter(reservation => {
    // ✅ Status-Filter (client-seitig, nicht server-seitig)
    if (reservationFilterStatus !== 'all' && reservation.status !== reservationFilterStatus) {
        return false;
    }
    
    // ✅ Payment-Status-Filter (client-seitig, nicht server-seitig)
    if (reservationFilterPaymentStatus !== 'all' && reservation.paymentStatus !== reservationFilterPaymentStatus) {
        return false;
    }
    
    // ✅ Such-Filter (client-seitig, nicht server-seitig)
    if (reservationSearchTerm) {
        const searchLower = reservationSearchTerm.toLowerCase();
        const matchesSearch = 
            (reservation.guestName && reservation.guestName.toLowerCase().includes(searchLower)) ||
            (reservation.guestEmail && reservation.guestEmail.toLowerCase().includes(searchLower)) ||
            (reservation.guestPhone && reservation.guestPhone.toLowerCase().includes(searchLower)) ||
            (reservation.roomNumber && reservation.roomNumber.toLowerCase().includes(searchLower)) ||
            (reservation.lobbyReservationId && reservation.lobbyReservationId.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
    }
    
    return true;
})
```

**Filter-Felder (client-seitig):**
- `status` (equals) - Dropdown-Filter
- `paymentStatus` (equals) - Dropdown-Filter
- `guestName` (contains)
- `guestEmail` (contains)
- `guestPhone` (contains)
- `roomNumber` (contains)
- `lobbyReservationId` (contains)

#### Sortierung (Client-seitig):

**Prioritäten (HARDCODED):**
```typescript
// Zeile 1789-1815
.sort((a, b) => {
    // 1. Priorität: Table-Header-Sortierung
    if (viewMode === 'table' && reservationTableSortConfig.key) {
        // ... Sortierung nach reservationTableSortConfig.key und reservationTableSortConfig.direction
    }
    
    // 2. Priorität: Filter-Sortierrichtungen
    if (reservationFilterSortDirections.length > 0 && (reservationSelectedFilterId !== null || reservationFilterConditions.length > 0)) {
        // ... Multi-Sortierung nach reservationFilterSortDirections
    }
    
    // 3. Priorität: Cards-Mode Multi-Sortierung
    if (viewMode === 'cards' && reservationSelectedFilterId === null && reservationFilterConditions.length === 0) {
        // ... Multi-Sortierung nach cardMetadataOrder und reservationCardSortDirections
    }
    
    // 4. Priorität: Tabellen-Mode Einzel-Sortierung
    if (viewMode === 'table' && reservationSelectedFilterId === null && reservationFilterConditions.length === 0 && reservationTableSortConfig.key) {
        // ... Sortierung nach reservationTableSortConfig.key und reservationTableSortConfig.direction
    }
    
    // 5. Fallback: Check-in-Datum (neueste zuerst) (HARDCODED)
    return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
})
```

**Fallback-Sortierung (HARDCODED):**
- `checkInDate` (desc) - Neueste zuerst

**Initial-Sortierung (HARDCODED):**
```typescript
// Zeile 1350, 1358
setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
```

---

## 4. TOUR BUCHUNGEN

### Backend: `backend/src/controllers/tourBookingController.ts`

#### Filterung (Server-seitig):

**1. Datenisolation (HARDCODED):**
```typescript
// Zeile 85-90
if (organizationId) {
    baseWhereConditions.push({ organizationId });  // ✅ HARDCODED: organizationId aus Request
}
if (branchId) {
    baseWhereConditions.push({ branchId });  // ✅ HARDCODED: branchId aus Request
}
```

**Wichtig:** Tour Bookings werden nach `organizationId` und optional `branchId` gefiltert!

**2. Weitere Filter (HARDCODED):**
```typescript
// Zeile 91-127
if (tourId) {
    baseWhereConditions.push({ tourId });
}
if (status) {
    baseWhereConditions.push({ status });
}
if (paymentStatus) {
    baseWhereConditions.push({ paymentStatus });
}
if (bookedById) {
    baseWhereConditions.push({ bookedById });
}
if (bookingDateFrom || bookingDateTo) {
    baseWhereConditions.push({
        bookingDate: {
            ...(bookingDateFrom ? { gte: new Date(bookingDateFrom) } : {}),
            ...(bookingDateTo ? { lte: new Date(bookingDateTo) } : {})
        }
    });
}
if (tourDateFrom || tourDateTo) {
    baseWhereConditions.push({
        tourDate: {
            ...(tourDateFrom ? { gte: new Date(tourDateFrom) } : {}),
            ...(tourDateTo ? { lte: new Date(tourDateTo) } : {})
        }
    });
}
if (search) {
    baseWhereConditions.push({
        OR: [
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerEmail: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } }
        ]
    });
}
```

**3. Filter-Bedingungen (aus Filter-System):**
- `filterId`: Lade Filter aus Cache → konvertiere zu Prisma WHERE
- `filterConditions`: Direkte Filter-Bedingungen → konvertiere zu Prisma WHERE
- Konvertierung über `convertFilterConditionsToPrismaWhere()` (Zeile 65-69, 75-79)

**4. Kombination:**
```typescript
// Zeile 133-135
const whereClause = baseWhereConditions.length === 1
    ? baseWhereConditions[0]
    : { AND: baseWhereConditions };
```

#### Sortierung (Server-seitig):

**HARDCODED:**
```typescript
// Zeile 165-167
orderBy: {
    bookingDate: 'desc'  // ✅ HARDCODED: Immer nach Buchungsdatum (neueste zuerst)
}
```

**Keine anderen Sortierungs-Optionen auf dem Server!**

#### Pagination:
- `limit`: Standard 20 (HARDCODED, Zeile 39)
- `offset`: Standard 0 (HARDCODED, Zeile 42)
- `totalCount`: Wird berechnet (Zeile 138-140)
- `hasMore`: Wird berechnet (Zeile 177)

---

### Frontend: `frontend/src/pages/Worktracker.tsx`

#### Filterung (Client-seitig):

**Tour Bookings werden NICHT client-seitig gefiltert!**
- Alle Filterung passiert server-seitig
- Keine client-seitige Filterung implementiert

#### Sortierung (Client-seitig):

**Tour Bookings werden NICHT client-seitig sortiert!**
- Alle Sortierung passiert server-seitig
- Keine client-seitige Sortierung implementiert

---

## 🔍 HARDCODED WERTE - ZUSAMMENFASSUNG

### Backend Sortierung (HARDCODED):

| Entity | Sortierung | Datei | Zeile |
|--------|-----------|-------|-------|
| **Requests** | `createdAt: 'desc'` | `requestController.ts` | 196 |
| **Tasks** | `createdAt: 'desc'` | `taskController.ts` | 157 |
| **Reservations** | `createdAt: 'desc'` | `reservationController.ts` | 697 |
| **Tour Bookings** | `bookingDate: 'desc'` | `tourBookingController.ts` | 166 |

**Alle Backend-Sortierungen sind HARDCODED und können nicht geändert werden!**

### Backend Pagination (HARDCODED):

| Entity | limit | offset |
|--------|-------|--------|
| **Requests** | 20 | 0 |
| **Tasks** | 20 | 0 |
| **Reservations** | 20 | 0 |
| **Tour Bookings** | 20 | 0 |

**Alle Pagination-Parameter sind HARDCODED (Standard-Werte)!**

### Frontend Fallback-Sortierung (HARDCODED):

| Entity | Fallback-Sortierung |
|--------|---------------------|
| **Requests** | Keine (return 0) |
| **Tasks** | 1. `dueDate` (asc), 2. `status` (nach Priorität), 3. `title` (alphabetisch) |
| **Reservations** | `checkInDate` (desc) |

---

## 🔐 ROLLEN & STANDORTE

### Requests:

**Keine Rollen-Filterung:**
- Alle Requests werden nach `organizationId` + `isPrivate` + `requesterId/responsibleId` gefiltert
- Keine Rolle-basierte Filterung

**Keine Standort-Filterung:**
- Alle Requests werden nach `organizationId` gefiltert
- Keine Branch-Filterung

---

### Tasks:

**Rollen-Filterung (HARDCODED):**
```typescript
// taskController.ts, Zeile 87-101
if (userRoleId) {
    baseWhereConditions.push({
        OR: [
            { organizationId: organizationId, responsibleId: userId },
            { organizationId: organizationId, qualityControlId: userId },
            { organizationId: organizationId, roleId: userRoleId }  // ✅ User sieht Tasks seiner Rolle
        ]
    });
}
```

**Wichtig:** Wenn User eine aktive Rolle hat (`userRoleId`), sieht er auch Tasks, die seiner Rolle zugeordnet sind!

**Keine Standort-Filterung:**
- Alle Tasks werden nach `organizationId` gefiltert
- Keine Branch-Filterung (aber `branch` wird in der WHERE-Klausel nicht verwendet)

---

### Reservations:

**Keine Rollen-Filterung:**
- Alle Reservations werden nach `organizationId` gefiltert
- Keine Rolle-basierte Filterung

**Standort-Filterung (HARDCODED):**
```typescript
// reservationController.ts, Zeile 601-634
if (hasOwnBranchPermission && !hasAllBranchesPermission) {
    const branchId = (req as any).branchId;
    
    if (branchId) {
        whereClause.branchId = branchId;  // ✅ User sieht nur Reservations seiner Branch
    }
}
```

**Berechtigungen (HARDCODED):**
- `reservations_all_branches`: Alle Reservations der Organisation
- `reservations_own_branch`: Nur Reservations der eigenen Branch
- Fallback: `reservations` (alte Berechtigung)

**Wichtig:** Wenn User nur `reservations_own_branch` Berechtigung hat, sieht er nur Reservations seiner Branch!

---

### Tour Bookings:

**Keine Rollen-Filterung:**
- Alle Tour Bookings werden nach `organizationId` gefiltert
- Keine Rolle-basierte Filterung

**Standort-Filterung (HARDCODED):**
```typescript
// tourBookingController.ts, Zeile 88-90
if (branchId) {
    baseWhereConditions.push({ branchId });  // ✅ branchId aus Request
}
```

**Wichtig:** Tour Bookings werden nach `branchId` gefiltert, wenn im Request vorhanden!

---

## 📋 FILTER-SYSTEM

### Server-seitige Filterung:

**Alle Entities unterstützen:**
- `filterId`: Lade Filter aus Cache (`filterCache.get()`)
- `filterConditions`: Direkte Filter-Bedingungen (JSON)
- Konvertierung über `convertFilterConditionsToPrismaWhere()`

**Filter-Konvertierung:**
- `convertFilterConditionsToPrismaWhere()` konvertiert Filter-Bedingungen zu Prisma WHERE-Klauseln
- Unterstützt verschiedene Operatoren: `equals`, `notEquals`, `contains`, `startsWith`, `endsWith`, `greaterThan`, `lessThan`, etc.
- Unterstützt logische Operatoren: `AND`, `OR`

### Client-seitige Filterung:

**NUR für einfache Suche:**
- `searchTerm` (Requests, Tasks, Reservations)
- `reservationFilterStatus` (Reservations)
- `reservationFilterPaymentStatus` (Reservations)

**Alle komplexen Filter werden server-seitig durchgeführt!**

---

## 🎯 SORTIERUNGS-PRIORITÄTEN (FRONTEND)

### Alle Entities (Requests, Tasks, Reservations):

**1. Priorität: Table-Header-Sortierung**
- Wenn User auf Spalte klickt
- Überschreibt alle anderen Sortierungen
- Temporär (nur während User auf Spalte klickt)

**2. Priorität: Filter-Sortierrichtungen**
- Wenn Filter aktiv ist (`selectedFilterId` oder `filterConditions`)
- Multi-Sortierung nach Priorität (1, 2, 3, ...)
- Wird aus Filter-Definition geladen

**3. Priorität: Cards-Mode Multi-Sortierung**
- Wenn kein Filter aktiv, Cards-Mode
- Multi-Sortierung nach `cardMetadataOrder` und `cardSortDirections`
- User-definierte Sortierung

**4. Priorität: Tabellen-Mode Einzel-Sortierung**
- Wenn kein Filter aktiv, Table-Mode
- Einzel-Sortierung nach `tableSortConfig`
- User-definierte Sortierung

**5. Priorität: Fallback-Sortierung**
- Wenn keine benutzerdefinierte Sortierung
- HARDCODED (siehe Tabelle oben)

---

## ⚠️ WICHTIGE HINWEISE

### 1. Server-seitige Sortierung ist HARDCODED

**Problem:**
- Alle Backend-Controller sortieren nach einem HARDCODED Wert
- Keine Möglichkeit, Sortierung vom Frontend zu steuern
- Client-seitige Sortierung kann die Reihenfolge ändern (siehe Problem 3)

**Lösung:**
- Server-seitige Sortierung implementieren (siehe `SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md`)

### 2. Rollen-Filterung nur bei Tasks

**Problem:**
- Nur Tasks werden nach `roleId` gefiltert
- Requests, Reservations, Tour Bookings haben keine Rollen-Filterung

**Aktuell:**
- Tasks: User sieht Tasks seiner Rolle (wenn `userRoleId` vorhanden)
- Requests: Keine Rollen-Filterung
- Reservations: Keine Rollen-Filterung
- Tour Bookings: Keine Rollen-Filterung

### 3. Standort-Filterung nur bei Reservations und Tour Bookings

**Problem:**
- Nur Reservations werden nach `branchId` gefiltert (wenn `reservations_own_branch` Berechtigung)
- Tour Bookings werden nach `branchId` gefiltert (wenn im Request vorhanden)
- Requests und Tasks haben keine Standort-Filterung

**Aktuell:**
- Requests: Keine Branch-Filterung
- Tasks: Keine Branch-Filterung (aber `branch` wird in der WHERE-Klausel nicht verwendet)
- Reservations: Branch-Filterung basierend auf Berechtigung
- Tour Bookings: Branch-Filterung wenn `branchId` im Request vorhanden

### 4. Client-seitige Sortierung kann Reihenfolge ändern

**Problem:**
- Server gibt Items in HARDCODED Reihenfolge zurück (`createdAt: 'desc'`)
- Client sortiert ALLE Items neu
- Wenn neue Items geladen werden, werden sie zu den bestehenden Items hinzugefügt
- Client sortiert dann ALLE Items neu → Items können sich verschieben

**Lösung:**
- Server-seitige Sortierung implementieren (siehe `SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md`)

---

## 📊 ZUSAMMENFASSUNG

### Filterung:

| Entity | Server-seitig | Client-seitig |
|--------|---------------|---------------|
| **Requests** | ✅ organizationId + isPrivate + requesterId/responsibleId + Filter | ✅ searchTerm |
| **Tasks** | ✅ organizationId + responsibleId/qualityControlId/roleId + Filter | ✅ searchTerm |
| **Reservations** | ✅ organizationId + branchId (wenn own_branch) + Filter | ✅ searchTerm + status + paymentStatus |
| **Tour Bookings** | ✅ organizationId + branchId + weitere Filter | ❌ Keine |

### Sortierung:

| Entity | Server-seitig | Client-seitig |
|--------|---------------|---------------|
| **Requests** | ✅ `createdAt: 'desc'` (HARDCODED) | ✅ Multi-Prioritäten |
| **Tasks** | ✅ `createdAt: 'desc'` (HARDCODED) | ✅ Multi-Prioritäten |
| **Reservations** | ✅ `createdAt: 'desc'` (HARDCODED) | ✅ Multi-Prioritäten |
| **Tour Bookings** | ✅ `bookingDate: 'desc'` (HARDCODED) | ❌ Keine |

### Rollen & Standorte:

| Entity | Rollen-Filterung | Standort-Filterung |
|--------|------------------|-------------------|
| **Requests** | ❌ Keine | ❌ Keine |
| **Tasks** | ✅ roleId (wenn vorhanden) | ❌ Keine |
| **Reservations** | ❌ Keine | ✅ branchId (wenn own_branch) |
| **Tour Bookings** | ❌ Keine | ✅ branchId (wenn vorhanden) |

---

**Erstellt:** 2025-01-29  
**Status:** 📋 ANALYSE - Vollständige Dokumentation  
**Nächster Schritt:** Implementierung von server-seitiger Sortierung (siehe `SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md`)



