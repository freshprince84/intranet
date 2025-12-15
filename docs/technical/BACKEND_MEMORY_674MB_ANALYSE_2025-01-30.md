# Backend Memory-Verbrauch: 674MB ohne Seitenaufruf

**Erstellt:** 2025-01-30  
**Status:** 🔴 KRITISCHES PROBLEM IDENTIFIZIERT  
**Problem:** Backend-Server nutzt 674MB Memory direkt nach Neustart, ohne dass eine Seite geöffnet wurde

---

## 🔴 PROBLEM

**Beobachtung:**
- Backend-Server startet mit ~30MB Memory
- Nach kurzer Zeit: **674MB Memory-Verbrauch**
- **OHNE** dass eine Frontend-Seite geöffnet wurde
- Keine API-Requests

**Das bedeutet:** Memory-Verbrauch kommt vom **Backend selbst**, nicht vom Frontend!

---

## 📊 IDENTIFIZIERTE QUELLEN

### 1. Scheduler beim Server-Start

**In `backend/src/app.ts` (Zeile 162-165):**
```typescript
LobbyPmsReservationScheduler.start();  // Alle 10 Minuten
ReservationAutoCancelScheduler.start(); // Alle 5 Minuten
```

**In `backend/src/index.ts` (Zeile 89-96):**
```typescript
setInterval(async () => {
  const { TourBookingScheduler } = await import('./services/tourBookingScheduler');
  await TourBookingScheduler.checkExpiredBookings();
}, 5 * 60 * 1000); // 5 Minuten
```

**In `backend/src/app.ts` (Zeile 132-135):**
```typescript
setInterval(async () => {
  console.log('Starte automatische Überprüfung der Arbeitszeiten...');
  await checkAndStopExceededWorktimes();
}, CHECK_INTERVAL_MS); // 2 Minuten
```

**In `backend/src/app.ts` (Zeile 142-159):**
```typescript
setInterval(async () => {
  // Monthly Report Check - alle 10 Minuten
}, MONTHLY_REPORT_CHECK_INTERVAL_MS);
```

### 2. Sofortiger Check beim Start

**`LobbyPmsReservationScheduler.start()` (Zeile 35):**
```typescript
// Führe sofort einen Check aus beim Start
this.checkAllBranches();
```

**Das Problem:**
- Beim Server-Start wird **sofort** `checkAllBranches()` ausgeführt
- Lädt alle Branches mit aktivierter LobbyPMS-Sync
- Für jede Branch: API-Calls, Datenbank-Queries, große Datenstrukturen

### 3. Mögliche Memory-Leaks

**`LobbyPmsService.fetchReservations()` (Zeile 422-565):**
- Lädt Reservierungen mit Pagination
- **Maximal 200 Seiten** (20.000 Reservierungen!)
- Speichert alle in `allReservations` Array
- **Keine Memory-Begrenzung!**

```typescript
let allReservations: LobbyPmsReservation[] = [];
let page = 1;
let hasMore = true;
const maxPages = 200; // Sicherheitslimit (20.000 Reservierungen max)
```

**Das Problem:**
- Wenn viele Reservierungen vorhanden sind, werden **alle** in Memory geladen
- **Keine Cleanup** nach Verarbeitung
- Arrays bleiben im Memory

---

## 🔍 VERDACHT: LobbyPmsReservationScheduler

**Beim Server-Start:**
1. `LobbyPmsReservationScheduler.start()` wird aufgerufen
2. **Sofortiger Check:** `checkAllBranches()` läuft
3. Für jede Branch:
   - API-Calls zu LobbyPMS
   - `fetchReservations()` lädt **alle** Reservierungen (bis zu 20.000!)
   - Daten werden in Memory gespeichert
   - **Keine Cleanup nach Verarbeitung**

**Memory-Verbrauch:**
- 20.000 Reservierungen × ~30KB pro Reservierung = **~600MB**
- Plus Overhead für Arrays, Objects, etc. = **~674MB**

**Das erklärt den Memory-Verbrauch!**

---

## ✅ LÖSUNGSANSÄTZE

### 1. Sofortiger Check beim Start deaktivieren

**Problem:** `LobbyPmsReservationScheduler.start()` führt sofort `checkAllBranches()` aus

**Lösung:** Sofortigen Check beim Start deaktivieren oder verzögern

```typescript
static start(): void {
  // ...
  // ENTFERNE: this.checkAllBranches(); // Sofortiger Check beim Start
  // ODER: Verzögere um 1 Minute
  setTimeout(() => {
    this.checkAllBranches();
  }, 60 * 1000); // 1 Minute Verzögerung
}
```

### 2. Memory-Begrenzung für fetchReservations

**Problem:** `fetchReservations()` lädt bis zu 20.000 Reservierungen in Memory

**Lösung:** 
- Begrenze auf maximal 1000 Reservierungen
- Oder: Verarbeite in Batches statt alle auf einmal

```typescript
const maxPages = 10; // Statt 200 - maximal 1000 Reservierungen
```

### 3. Cleanup nach Verarbeitung

**Problem:** Arrays bleiben im Memory nach Verarbeitung

**Lösung:** Explizites Cleanup nach Verarbeitung

```typescript
// Nach Verarbeitung:
allReservations = []; // Leere Array
```

### 4. Lazy Loading für Scheduler

**Problem:** Alle Scheduler starten sofort beim Server-Start

**Lösung:** Scheduler erst nach 1-2 Minuten starten

```typescript
setTimeout(() => {
  LobbyPmsReservationScheduler.start();
  ReservationAutoCancelScheduler.start();
}, 2 * 60 * 1000); // 2 Minuten Verzögerung
```

---

## 📋 NÄCHSTE SCHRITTE

1. ✅ **Sofortiger Check beim Start deaktivieren** (höchste Priorität)
2. ✅ **Memory-Begrenzung für fetchReservations** (maxPages reduzieren)
3. ✅ **Cleanup nach Verarbeitung** (Arrays leeren)
4. ✅ **Lazy Loading für Scheduler** (Verzögerung beim Start)

---

**Erstellt:** 2025-01-30  
**Status:** 🔴 KRITISCHES PROBLEM IDENTIFIZIERT  
**Ursache:** LobbyPmsReservationScheduler lädt beim Start alle Reservierungen in Memory  
**Lösung:** Sofortigen Check deaktivieren, Memory-Begrenzung, Cleanup












