# Analyse: Task Limit Problem

## Problem

Die Check-in To-Dos (Tasks 807-811) sind nicht sichtbar, weil:

1. **Hardcodiertes Limit von 50 Tasks** in `getAllTasks` (Zeile 50)
2. **Keine Sortierung** - Tasks werden ohne `orderBy` zurückgegeben (vermutlich nach ID)
3. **Requests haben das gleiche Problem** - auch Limit 50 (Zeile 73)

## Aktuelle Implementierung

### Backend: `taskController.ts` - `getAllTasks`

```typescript
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50; // OPTIMIERUNG: Standard-Limit 50 statt alle

const tasks = await prisma.task.findMany({
    where: whereClause,
    take: limit,  // ❌ Hardcodiertes Limit
    // ❌ KEIN orderBy - keine Sortierung!
    include: { ... }
});
```

**Problem:**
- Limit von 50 ist hardcodiert
- Keine Sortierung → Tasks werden in nicht garantierter Reihenfolge zurückgegeben
- Check-in Tasks (ID 807-811) sind nicht in den ersten 50 Ergebnissen

### Backend: `requestController.ts` - `getAllRequests`

```typescript
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50; // OPTIMIERUNG: Standard-Limit 50 statt alle

const requests = await prisma.request.findMany({
    where: whereClause,
    take: limit,  // ❌ Hardcodiertes Limit
    orderBy: {
        createdAt: 'desc'  // ✅ Hat Sortierung
    },
    include: { ... }
});
```

**Problem:**
- Limit von 50 ist hardcodiert
- ✅ Hat Sortierung (besser als Tasks)

## Frontend

### Worktracker.tsx - `loadTasks`

```typescript
const loadTasks = async (filterId?: number, filterConditions?: any[], background = false) => {
    const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, {
        params: {
            filterId,
            filterConditions: filterConditions ? JSON.stringify(filterConditions) : undefined
            // ❌ KEIN limit Parameter!
        }
    });
    // ...
};
```

**Problem:**
- Frontend sendet keinen `limit` Parameter
- Backend verwendet daher das hardcodierte Limit von 50
- Kein Infinite Scroll implementiert

## Anforderungen

1. **KEIN hardcodiertes Limit** - Alle Tasks müssen verfügbar sein
2. **Beim Laden der Seite:** Nur erste ~20 Tasks laden (Performance)
3. **Infinite Scroll:** Rest beim Scrollen nachladen
4. **Mit Filter:** Liste wird gefiltert, nicht einfach auf 50 limitiert
5. **Sortierung:** Tasks sollten nach `createdAt DESC` sortiert werden (neueste zuerst)

## Behebungsplan

### Phase 1: Backend - Limit entfernen & Sortierung hinzufügen

#### 1.1 `taskController.ts` - `getAllTasks`

**Änderungen:**
1. **Limit optional machen:**
   - Wenn `limit` Parameter vorhanden → verwenden
   - Wenn kein `limit` Parameter → **KEIN Limit** (alle Tasks)
   - Standard-Limit nur für initiales Laden (z.B. 20)

2. **Sortierung hinzufügen:**
   - `orderBy: { createdAt: 'desc' }` - neueste zuerst
   - Oder: `orderBy: { id: 'desc' }` - höchste ID zuerst

**Code-Änderung:**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50; // ❌ Hardcodiertes Limit

const tasks = await prisma.task.findMany({
    where: whereClause,
    take: limit,  // ❌ Immer Limit
    // ❌ Keine Sortierung
});

// NACHHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined; // ✅ Kein Limit wenn nicht angegeben

const tasks = await prisma.task.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}),  // ✅ Nur Limit wenn angegeben
    orderBy: { createdAt: 'desc' },  // ✅ Sortierung nach neuesten zuerst
});
```

#### 1.2 `requestController.ts` - `getAllRequests`

**Änderungen:**
1. **Limit optional machen** (gleiche Logik wie Tasks)
2. **Sortierung bereits vorhanden** ✅ (kann bleiben)

**Code-Änderung:**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50; // ❌ Hardcodiertes Limit

// NACHHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined; // ✅ Kein Limit wenn nicht angegeben

const requests = await prisma.request.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}),  // ✅ Nur Limit wenn angegeben
    orderBy: { createdAt: 'desc' },  // ✅ Bereits vorhanden
});
```

### Phase 2: Frontend - Initiales Laden mit Limit

#### 2.1 `Worktracker.tsx` - `loadTasks`

**Änderungen:**
1. **Initiales Laden:** `limit: 20` Parameter hinzufügen
2. **Infinite Scroll:** Später implementieren (separate Aufgabe)

**Code-Änderung:**
```typescript
// VORHER:
const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, {
    params: {
        filterId,
        filterConditions: filterConditions ? JSON.stringify(filterConditions) : undefined
        // ❌ Kein limit
    }
});

// NACHHER:
const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, {
    params: {
        filterId,
        filterConditions: filterConditions ? JSON.stringify(filterConditions) : undefined,
        limit: 20  // ✅ Initiales Laden: erste 20 Tasks
    }
});
```

### Phase 3: Frontend - Infinite Scroll (später)

**Separate Aufgabe:**
- Implementiere Infinite Scroll für Tasks
- Beim Scrollen nach unten: weitere Tasks nachladen (`limit: 20`, `offset` oder `page`)
- Backend muss Pagination unterstützen (optional)

## Betroffene Dateien

### Backend (alle haben hardcodiertes Limit von 50)
1. **`backend/src/controllers/taskController.ts`** - Zeile 48-50, 122-147
   - ❌ Limit 50, ❌ Keine Sortierung
   
2. **`backend/src/controllers/requestController.ts`** - Zeile 71-73, 151-176
   - ❌ Limit 50, ✅ Hat Sortierung (`createdAt: 'desc'`)
   
3. **`backend/src/controllers/tourController.ts`** - Zeile 72-74
   - ❌ Limit 50
   
4. **`backend/src/controllers/tourBookingController.ts`** - Zeile 36-38
   - ❌ Limit 50

### Frontend
- `frontend/src/pages/Worktracker.tsx` - `loadTasks` Funktion (ca. Zeile 612)

## Test-Plan

1. **Backend Test:**
   - ✅ Ohne `limit` Parameter → Alle Tasks zurückgegeben
   - ✅ Mit `limit: 20` → Nur 20 Tasks zurückgegeben
   - ✅ Sortierung: Neueste Tasks zuerst
   - ✅ Filter funktionieren weiterhin

2. **Frontend Test:**
   - ✅ Initiales Laden: Nur 20 Tasks geladen
   - ✅ Alle Tasks sichtbar nach Scrollen (später mit Infinite Scroll)

## Risiken

1. **Performance:** Wenn alle Tasks geladen werden, könnte es langsam werden
   - **Lösung:** Frontend lädt initial nur 20 Tasks
   - Infinite Scroll lädt weitere beim Scrollen

2. **Rückwärtskompatibilität:**
   - Mobile App könnte erwarten, dass alle Tasks geladen werden
   - **Lösung:** Mobile App kann `limit` Parameter weglassen → alle Tasks

## Zusammenfassung

**Problem:**
- Hardcodiertes Limit von 50 in mehreren Controllern:
  - `taskController.ts` - Tasks
  - `requestController.ts` - Requests
  - `tourController.ts` - Tours
  - `tourBookingController.ts` - Tour Bookings
- Keine Sortierung bei Tasks → Check-in Tasks nicht sichtbar
- Frontend lädt alle Tasks, aber bekommt nur 50 zurück

**Lösung:**
1. **Backend:**
   - Limit optional machen (nur wenn `limit` Parameter vorhanden)
   - Sortierung bei Tasks hinzufügen (`createdAt: 'desc'`)
   - Gleiche Änderung für Requests, Tours, TourBookings (konsistent)
   
2. **Frontend:**
   - Initiales Laden mit `limit: 20` Parameter
   - Später: Infinite Scroll implementieren

