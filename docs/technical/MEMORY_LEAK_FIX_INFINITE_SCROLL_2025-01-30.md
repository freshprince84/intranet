# Memory Leak Fix: Infinite Scroll (2025-01-30)

**Datum:** 2025-01-30  
**Status:** 🔴 KRITISCH - Fix für Endlosschleife ohne Infinite Scroll zu brechen  
**Problem:** Intersection Observer Endlosschleife durch `tasks.length` in Dependencies

---

## 🔴 PROBLEM

**Ursache:**
- Intersection Observer useEffect hat `tasks.length`, `requests.length`, `reservations.length` als Dependencies
- Jeder Load ändert die Länge → useEffect läuft erneut → Neuer Observer → Endlosschleife

**Anforderung:**
- Infinite Scroll muss weiterhin funktionieren (beim Scrollen nach unten)
- `tasks.length` wird im Observer-Callback für `nextOffset` benötigt

---

## ✅ LÖSUNG: useRef für aktuelle Werte

**Strategie:**
- `tasks.length` aus Dependencies entfernen
- `useRef` für aktuelle `tasks.length` verwenden
- Im Observer-Callback `tasksRef.current.length` verwenden
- `tasksRef.current` immer aktualisieren wenn sich `tasks` ändert

**Vorteile:**
- ✅ Keine Endlosschleife (useEffect läuft nicht bei jeder Längenänderung)
- ✅ Infinite Scroll funktioniert weiterhin (verwendet aktuelle Länge via Ref)
- ✅ Keine Closure-Probleme (Ref zeigt immer auf aktuellen Wert)

---

## 📋 IMPLEMENTIERUNG

### Worktracker.tsx - Tasks

**Vorher:**
```typescript
}, [activeTab, tasksHasMore, tasksLoadingMore, loading, tasks.length, selectedFilterId, loadTasks]);
```

**Nachher:**
```typescript
// useRef für aktuelle tasks.length
const tasksLengthRef = useRef(tasks.length);

// Aktualisiere Ref wenn tasks sich ändert
useEffect(() => {
    tasksLengthRef.current = tasks.length;
}, [tasks.length]);

// Observer useEffect - tasks.length entfernt
}, [activeTab, tasksHasMore, tasksLoadingMore, loading, selectedFilterId, loadTasks]);

// Im Observer-Callback:
const nextOffset = tasksLengthRef.current;
```

### Worktracker.tsx - Reservations

**Vorher:**
```typescript
}, [activeTab, reservationsHasMore, reservationsLoadingMore, reservationsLoading, reservations.length, reservationSelectedFilterId, loadReservations]);
```

**Nachher:**
```typescript
// useRef für aktuelle reservations.length
const reservationsLengthRef = useRef(reservations.length);

// Aktualisiere Ref wenn reservations sich ändert
useEffect(() => {
    reservationsLengthRef.current = reservations.length;
}, [reservations.length]);

// Observer useEffect - reservations.length entfernt
}, [activeTab, reservationsHasMore, reservationsLoadingMore, reservationsLoading, reservationSelectedFilterId, loadReservations]);

// Im Observer-Callback:
const nextOffset = reservationsLengthRef.current;
```

### Worktracker.tsx - Tour Bookings

**Vorher:**
```typescript
}, [activeTab, tourBookingsHasMore, tourBookingsLoadingMore, tourBookingsLoading, tourBookings.length]);
```

**Nachher:**
```typescript
// useRef für aktuelle tourBookings.length
const tourBookingsLengthRef = useRef(tourBookings.length);

// Aktualisiere Ref wenn tourBookings sich ändert
useEffect(() => {
    tourBookingsLengthRef.current = tourBookings.length;
}, [tourBookings.length]);

// Observer useEffect - tourBookings.length entfernt
}, [activeTab, tourBookingsHasMore, tourBookingsLoadingMore, tourBookingsLoading]);

// Im Observer-Callback:
const nextOffset = tourBookingsLengthRef.current;
```

### Requests.tsx

**Vorher:**
```typescript
}, [hasMore, loadingMore, loading, requests.length, selectedFilterId, filterConditions, fetchRequests]);
```

**Nachher:**
```typescript
// useRef für aktuelle requests.length
const requestsLengthRef = useRef(requests.length);

// Aktualisiere Ref wenn requests sich ändert
useEffect(() => {
    requestsLengthRef.current = requests.length;
}, [requests.length]);

// Observer useEffect - requests.length entfernt
}, [hasMore, loadingMore, loading, selectedFilterId, filterConditions, fetchRequests]);

// Im Observer-Callback:
const nextOffset = requestsLengthRef.current;
```

---

## ✅ WARUM FUNKTIONIERT DAS?

1. **Keine Endlosschleife:**
   - `tasks.length` ist nicht mehr in Observer-Dependencies
   - useEffect läuft nicht bei jeder Längenänderung
   - Observer wird nur neu erstellt wenn Bedingungen ändern (hasMore, loading, etc.)

2. **Infinite Scroll funktioniert:**
   - `tasksLengthRef.current` wird immer aktualisiert wenn `tasks.length` sich ändert
   - Im Observer-Callback wird `tasksLengthRef.current.length` verwendet
   - Ref zeigt immer auf aktuellen Wert (keine Closure-Probleme)

3. **Keine Memory Leaks:**
   - Observer wird nicht bei jedem Load neu erstellt
   - Nur ein Observer pro Tab/Seite
   - Cleanup funktioniert korrekt

---

## 📊 ERWARTETE VERBESSERUNG

**Vorher:**
- Memory: 600MB (1 Min) → 1GB+ (5 Min)
- Observer-Instanzen: 10-20 (1 Min) → 50-100+ (5 Min)
- Endlosschleife: Ja (ohne Scrollen)

**Nachher:**
- Memory: ~300-400MB (stabil, wächst nicht mehr)
- Observer-Instanzen: 1 pro Tab/Seite (stabil)
- Endlosschleife: Nein
- Infinite Scroll: Funktioniert weiterhin

---

**Erstellt:** 2025-01-30  
**Status:** ✅ IMPLEMENTIERUNG ABGESCHLOSSEN (2025-01-30)  
**Implementiert:**
- ✅ Worktracker.tsx: useRef für tasks.length, reservations.length, tourBookings.length
- ✅ Worktracker.tsx: tasks.length, reservations.length, tourBookings.length aus Observer Dependencies entfernt
- ✅ Requests.tsx: useRef für requests.length
- ✅ Requests.tsx: requests.length aus Observer Dependencies entfernt

**Erwartete Verbesserung:** Memory-Wachstum stoppt (von 600MB→1GB+ auf stabil ~300-400MB)

