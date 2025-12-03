# Memory Leak: Kontinuierliches Wachstum (2025-01-30)

**Datum:** 2025-01-30  
**Status:** 🔴 KRITISCH - Memory wächst kontinuierlich ohne User-Interaktion  
**Problem:** Memory steigt von 600MB (1 Min) auf 1GB+ (5 Min) ohne Scrollen/Klicken

---

## 🔴 PROBLEM

**Symptom:**
- Memory: **600MB+ nach 1 Minute** (nur Seite öffnen, nichts tun)
- Memory: **1GB+ nach 5 Minuten** (nur Seite öffnen, nichts tun)
- Betrifft **ALLE Seiten**: Dashboard, Worktracker, Workcenter, Settings, etc.
- **Keine User-Interaktion nötig** - passiert automatisch
- **Kein Scrollen, kein Klicken** - nur Seite offen lassen

**Das ist ein Memory Leak, nicht nur hoher Initial-Verbrauch!**

---

## 📊 IDENTIFIZIERTE URSACHEN

### Problem 1: Infinite Scroll ohne Begrenzung

**Code:** 
- `frontend/src/pages/Worktracker.tsx:639` - `setTasks(prev => [...prev, ...tasksWithAttachments])`
- `frontend/src/components/Requests.tsx:471` - `setRequests(prev => [...prev, ...requestsWithAttachments])`
- `frontend/src/pages/Worktracker.tsx:760` - `setReservations(prev => [...prev, ...reservationsData])`

**Problem:**
- Arrays werden bei Infinite Scroll **kontinuierlich erweitert** (append = true)
- **KEINE Begrenzung** der maximalen Anzahl
- **KEIN Cleanup** von alten Items
- Intersection Observer könnte automatisch weitere Items laden

**Impact:**
- **Memory-Verbrauch:** Wächst kontinuierlich mit jedem geladenen Item
- **Nach 5 Minuten:** Potentiell HUNDERTE oder TAUSENDE von Items im Memory
- **Jedes Item:** Enthält vollständige Daten + Attachments + Metadaten

**Frage:** Wird Infinite Scroll automatisch getriggert, auch ohne Scrollen?

---

### Problem 2: Polling-Intervalle speichern Responses

**Code:**
- `frontend/src/contexts/WorktimeContext.tsx:62` - `setInterval(checkTrackingStatus, 30000)`
- `frontend/src/components/NotificationBell.tsx:195` - `setInterval(fetchUnreadCount, 60000)`
- `frontend/src/pages/TeamWorktimeControl.tsx:136` - `setInterval(fetchActiveUsers, 30000)`

**Problem:**
- Polling-Intervalle machen **kontinuierlich API-Calls**
- **Jede Response wird gespeichert** (setState)
- **Alte Responses werden NICHT gelöscht**
- Nach 5 Minuten: **10 Worktime-Calls + 5 Notification-Calls = 15 Responses im Memory**

**Impact:**
- **Memory-Verbrauch:** Wächst mit jedem Polling-Intervall
- **Nach 5 Minuten:** 15+ API-Responses im Memory
- **Jede Response:** Enthält vollständige Daten

**Frage:** Werden alte Responses überschrieben oder angehängt?

---

### Problem 3: WorktimeTracker setInterval (1 Sekunde)

**Code:** `frontend/src/components/WorktimeTracker.tsx:176` - `setInterval(() => { ... }, 1000)`

**Problem:**
- Timer-Update **alle 1 Sekunde** (nur UI, kein API-Call)
- **Aber:** Kann zu Re-Renders führen
- **React Component Tree** wächst bei jedem Re-Render

**Impact:**
- **Memory-Verbrauch:** Wächst durch Re-Renders
- **Nach 5 Minuten:** 300 Re-Renders (5 Min × 60 Sek × 1 Render/Sek)

**Frage:** Werden Re-Renders korrekt optimiert?

---

### Problem 4: FilterContext Cleanup-Intervall

**Code:** `frontend/src/contexts/FilterContext.tsx:242` - `setInterval(cleanupOldFilters, 5 * 60 * 1000)`

**Problem:**
- Cleanup-Intervall läuft **alle 5 Minuten**
- **Aber:** Cleanup könnte selbst Memory verbrauchen
- **Filter-Arrays** werden gelöscht, aber neue werden geladen

**Impact:**
- **Memory-Verbrauch:** Wächst durch Cleanup-Operationen
- **Nach 5 Minuten:** 1 Cleanup-Operation

**Frage:** Ist Cleanup effizient oder verbraucht es selbst Memory?

---

### Problem 5: React DevTools (wenn aktiv)

**Problem:**
- React DevTools speichern **Component Tree** im Memory
- **Wächst bei jedem Re-Render**
- **Nach 5 Minuten:** Sehr großer Component Tree

**Impact:**
- **Memory-Verbrauch:** ~50-200MB (je nach Component-Tree-Größe)
- **Wächst kontinuierlich:** Bei jedem Re-Render

**Frage:** Sind React DevTools aktiv?

---

### Problem 6: useMemo/useCallback behalten alte Werte

**Code:** Überall im Code

**Problem:**
- `useMemo` und `useCallback` **cachen Werte**
- **Alte Werte bleiben im Memory** (React Cache)
- **Bei vielen Dependencies:** Viele gecachte Werte

**Impact:**
- **Memory-Verbrauch:** Wächst mit jedem gecachten Wert
- **Nach 5 Minuten:** Viele gecachte Werte im Memory

**Frage:** Werden useMemo/useCallback korrekt verwendet?

---

## 🔍 SYSTEMATISCHE ANALYSE

### Was passiert in 5 Minuten ohne User-Interaktion?

**Polling-Intervalle:**
1. WorktimeContext: 10 Calls (alle 30s) = **10 Responses**
2. NotificationBell: 5 Calls (alle 60s) = **5 Responses**
3. TeamWorktimeControl: 10 Calls (alle 30s) = **10 Responses** (nur wenn Seite offen)

**Gesamt:** ~25 API-Responses in 5 Minuten

**Infinite Scroll:**
- Wenn automatisch getriggert: Potentiell HUNDERTE von Items
- Jedes Item: Vollständige Daten + Attachments

**Re-Renders:**
- WorktimeTracker: 300 Re-Renders (1 Sekunde Intervall)
- Jeder Re-Render: React Component Tree wird aktualisiert

**Memory-Wachstum:**
- **25 API-Responses** × ~1-5MB = **25-125MB**
- **HUNDERTE Items** (Infinite Scroll) × ~0.1-1MB = **10-100MB+**
- **300 Re-Renders** × ~0.1MB = **30MB**
- **React DevTools** = **50-200MB**

**Gesamt:** **115-455MB+ in 5 Minuten** (ohne User-Interaktion)

**ABER:** Das erklärt nicht 1GB! Es muss noch mehr geben.

---

## 🎯 MÖGLICHE HAUPTURSACHEN

### 1. Infinite Scroll wird automatisch getriggert

**Vermutung:** Intersection Observer lädt automatisch weitere Items, auch ohne Scrollen

**Prüfen:**
- Wird Intersection Observer korrekt verwendet?
- Gibt es einen Scroll-Event-Listener der automatisch lädt?
- Wird `loadMoreTasks()` automatisch aufgerufen?

### 2. Arrays werden nicht überschrieben, sondern angehängt

**Vermutung:** Bei Filter-Änderungen werden neue Items angehängt statt ersetzt

**Prüfen:**
- Wird `append = true` korrekt verwendet?
- Werden Arrays bei Filter-Change ersetzt oder angehängt?
- Gibt es doppelte Items in Arrays?

### 3. React Component Tree wächst kontinuierlich

**Vermutung:** Neue Components werden gemountet, aber alte werden nicht unmountet

**Prüfen:**
- Werden Components korrekt unmountet?
- Gibt es Memory Leaks in Component Lifecycle?
- Werden Event Listeners korrekt aufgeräumt?

### 4. API-Responses werden nicht überschrieben

**Vermutung:** Jede Polling-Response wird gespeichert, alte werden nicht gelöscht

**Prüfen:**
- Werden State-Updates korrekt gemacht (ersetzen vs. anhängen)?
- Werden alte Responses gelöscht?
- Gibt es Memory Leaks in State-Management?

---

## 📋 NÄCHSTE SCHRITTE (NUR PRÜFEN)

### 1. Prüfe Infinite Scroll
- [ ] Wird Intersection Observer automatisch getriggert?
- [ ] Gibt es Scroll-Event-Listener die automatisch laden?
- [ ] Wird `loadMoreTasks()` automatisch aufgerufen?

### 2. Prüfe Array-Größen
- [ ] Wie viele Items sind in `tasks` Array nach 5 Minuten?
- [ ] Wie viele Items sind in `requests` Array nach 5 Minuten?
- [ ] Wie viele Items sind in `reservations` Array nach 5 Minuten?
- [ ] Gibt es doppelte Items?

### 3. Prüfe Polling-Responses
- [ ] Werden Polling-Responses überschrieben oder angehängt?
- [ ] Wie viele Responses sind im Memory nach 5 Minuten?
- [ ] Werden alte Responses gelöscht?

### 4. Prüfe React Component Tree
- [ ] Wie groß ist der Component Tree nach 5 Minuten?
- [ ] Werden Components korrekt unmountet?
- [ ] Gibt es Memory Leaks in Component Lifecycle?

### 5. Prüfe Browser DevTools
- [ ] Sind React DevTools aktiv?
- [ ] Wie groß ist die Console-History?
- [ ] Gibt es Memory-Leak-Warnungen?

---

---

## 🔴 KRITISCHES PROBLEM IDENTIFIZIERT

### Problem: Intersection Observer useEffect hat `tasks.length` / `requests.length` / `reservations.length` als Dependency

**Code:**
- `frontend/src/pages/Worktracker.tsx:1746` - `}, [activeTab, tasksHasMore, tasksLoadingMore, loading, tasks.length, selectedFilterId, loadTasks]);`
- `frontend/src/components/Requests.tsx:847` - `}, [hasMore, loadingMore, loading, requests.length, selectedFilterId, filterConditions, fetchRequests]);`
- `frontend/src/pages/Worktracker.tsx:1782` - `}, [activeTab, reservationsHasMore, reservationsLoadingMore, reservationsLoading, reservations.length, reservationSelectedFilterId, loadReservations]);`

**Das Problem:**
1. Intersection Observer wird erstellt
2. Load More triggert → `tasks.length` ändert sich (z.B. von 20 auf 40)
3. useEffect läuft erneut (wegen `tasks.length` Dependency) → **NEUER Observer wird erstellt**
4. Alter Observer wird disconnected
5. **ABER:** Der neue Observer sieht das "Load More" Element sofort als intersecting (es ist bereits sichtbar)
6. Triggert erneut → `tasks.length` ändert sich (von 40 auf 60)
7. useEffect läuft erneut → **NOCH EIN Observer wird erstellt**
8. **ENDLOSSCHLEIFE!**

**Impact:**
- **Memory-Verbrauch:** Wächst exponentiell
- **Nach 1 Minute:** Potentiell 10-20 Observer-Instanzen
- **Nach 5 Minuten:** Potentiell 50-100+ Observer-Instanzen
- **Jeder Observer:** Beobachtet DOM-Elemente, speichert Callbacks
- **Jeder Load:** Erstellt neue Arrays, neue Observer, neue Callbacks

**Das erklärt das kontinuierliche Memory-Wachstum!**

---

## 📊 BEWEIS

**Intersection Observer Dependencies:**
- Worktracker Tasks: `tasks.length` → **Jeder Load erstellt neuen Observer**
- Worktracker Reservations: `reservations.length` → **Jeder Load erstellt neuen Observer**
- Worktracker Tour Bookings: `tourBookings.length` → **Jeder Load erstellt neuen Observer**
- Requests: `requests.length` → **Jeder Load erstellt neuen Observer**

**Das Problem:**
- `tasks.length` ändert sich bei jedem Load (20 → 40 → 60 → 80...)
- useEffect läuft bei jeder Änderung
- Neuer Observer wird erstellt
- Alter Observer wird disconnected, aber Memory ist bereits verbraucht
- **Endlosschleife ohne Scrollen!**

---

## ✅ LÖSUNG

**Entferne `tasks.length`, `requests.length`, `reservations.length` aus Dependencies!**

**Grund:**
- Observer sollte nur erstellt werden, wenn sich die **Bedingungen** ändern (hasMore, loading, etc.)
- **NICHT** wenn sich die **Anzahl** ändert
- Die Anzahl ändert sich bei jedem Load → verursacht Endlosschleife

**Alternative:**
- Verwende `useRef` für aktuelle Werte
- Oder: Prüfe `tasks.length` im Observer-Callback, nicht in Dependencies

---

**Erstellt:** 2025-01-30  
**Status:** ✅ FIX IMPLEMENTIERT (2025-01-30)  
**Ursache:** Intersection Observer useEffect Dependencies verursachen Endlosschleife  
**Lösung:** `tasks.length`, `requests.length`, `reservations.length` aus Dependencies entfernt, useRef verwendet

**Implementiert:**
- ✅ Worktracker.tsx: useRef für tasks.length, reservations.length, tourBookings.length
- ✅ Worktracker.tsx: Observer Dependencies korrigiert
- ✅ Requests.tsx: useRef für requests.length
- ✅ Requests.tsx: Observer Dependencies korrigiert

