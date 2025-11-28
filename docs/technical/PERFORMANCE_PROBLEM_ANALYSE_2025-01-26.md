# Performance-Problem Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System extrem langsam  
**Problem:** Requests, To-Do's & Reservationen werden extrem langsam oder gar nicht geladen

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: Reservations haben KEINE Pagination ⚠️ KRITISCH

**Code-Stelle:** `backend/src/controllers/reservationController.ts:622`

**Aktueller Code:**
```typescript
const reservations = await prisma.reservation.findMany({
  where: whereClause,
  include: {
    organization: { select: { id: true, name: true, displayName: true } },
    branch: { select: { id: true, name: true } },
    task: true
  },
  orderBy: { createdAt: 'desc' }
});
```

**Problem:**
- ❌ **KEIN `limit` Parameter** - lädt ALLE Reservierungen
- ❌ **KEIN `offset` Parameter** - keine Pagination
- ❌ **Frontend lädt ALLE Reservierungen auf einmal** - `loadReservations()` hat keine Pagination

**Impact:**
- Bei vielen Reservierungen (z.B. 1000+) wird die Query extrem langsam
- Frontend muss alle Daten auf einmal verarbeiten
- Kein Infinite Scroll möglich

**Frontend:** `frontend/src/pages/Worktracker.tsx:724`
```typescript
const loadReservations = async () => {
  const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
  const reservationsData = response.data?.data || response.data || [];
  setReservations(reservationsData);
};
```

---

### Problem 2: Infinite Scroll funktioniert nicht richtig ⚠️

**Code-Stellen:**
- `frontend/src/components/Requests.tsx:576-596`
- `frontend/src/pages/Worktracker.tsx:758-780`

**Aktueller Code:**
```typescript
scrollHandlerRef.current = () => {
  if (
    window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
    !requestsLoadingMore &&
    requestsHasMore
  ) {
    loadMoreRequests();
  }
};
```

**Probleme:**
1. **Prüft nur `window` Scroll** - funktioniert nicht bei Container-Scroll (z.B. in Cards-Ansicht)
2. **Bedingung `offsetHeight - 1000`** - könnte zu früh oder zu spät auslösen
3. **Keine IntersectionObserver** - weniger zuverlässig als moderne Lösung

**Impact:**
- Infinite Scroll funktioniert nicht in allen Ansichten
- User muss manuell scrollen, aber es werden keine weiteren Einträge geladen

---

### Problem 3: DB-Queries extrem langsam (30+ Sekunden für 20 Einträge) 🔴🔴🔴

**Gemessene Performance:**
- `[getAllTasks] ✅ Query abgeschlossen: 20 Tasks in 30663ms` (30.6 Sekunden!)
- `[getAllRequests] ✅ Query abgeschlossen: 20 Requests in 4288ms` (4.3 Sekunden)

**Mögliche Ursachen:**

1. **Komplexe WHERE-Klauseln:**
   - Verschachtelte AND/OR-Bedingungen
   - Viele JOINs (requester, responsible, branch, attachments)
   - Könnte zu Full Table Scans führen

2. **Fehlende Indizes:**
   - Indizes wurden erstellt, aber werden sie verwendet?
   - EXPLAIN ANALYZE muss prüfen

3. **Connection Pool Timeouts:**
   - Connection Pool ist voll → Requests warten
   - `executeWithRetry` macht Retries → verschlimmert Problem

4. **Attachments werden geladen:**
   - Auch wenn `includeAttachments=false`, werden Relations geladen
   - JOINs verlangsamen Query

---

### Problem 4: Connection Pool Probleme ⚠️

**Status:**
- Bereits optimiert: 20 Pools × 5 Verbindungen = 100 Verbindungen
- Aber: Es gibt immer noch Connection Pool Timeouts

**Beweis aus Logs:**
```
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 20, connection limit: 20)
```

**Problem:**
- Auch mit 100 Verbindungen gibt es Timeouts
- Queries sind so langsam, dass Verbindungen lange belegt bleiben
- Neue Requests warten auf freie Verbindung

---

## 📊 ROOT CAUSE ANALYSE

### Hauptproblem: Langsame DB-Queries

**Warum sind die Queries so langsam?**

1. **Komplexe WHERE-Klauseln:**
   ```typescript
   // Beispiel aus requestController.ts
   const whereClause = {
     AND: [
       {
         OR: [
           { isPrivate: false, organizationId: organizationId },
           { isPrivate: true, organizationId: organizationId, requesterId: userId },
           { isPrivate: true, organizationId: organizationId, responsibleId: userId }
         ]
       },
       filterWhereClause
     ]
   };
   ```
   - Verschachtelte AND/OR-Bedingungen
   - PostgreSQL muss alle Bedingungen prüfen
   - Könnte zu Full Table Scans führen

2. **Viele JOINs:**
   ```typescript
   include: {
     requester: { select: userSelect },
     responsible: { select: userSelect },
     branch: { select: branchSelect },
     attachments: { orderBy: { uploadedAt: 'desc' } }
   }
   ```
   - Jeder JOIN verlangsamt die Query
   - Bei vielen Einträgen wird es exponentiell langsamer

3. **Fehlende Indizes:**
   - Indizes wurden erstellt, aber werden sie verwendet?
   - EXPLAIN ANALYZE muss prüfen

---

## 💡 LÖSUNGSPLAN

### Phase 1: SOFORTMASSNAHMEN (Kritisch)

#### 1.1 Reservations: Pagination implementieren ⭐⭐⭐

**Backend:** `backend/src/controllers/reservationController.ts`
- Füge `limit` und `offset` Parameter hinzu
- Standard: `limit=20`, `offset=0`
- Rückgabe: `{ data: reservations, pagination: { total, page, limit } }`

**Frontend:** `frontend/src/pages/Worktracker.tsx`
- Implementiere Infinite Scroll für Reservations (wie bei Requests/Tasks)
- Füge Pagination State hinzu
- Implementiere Scroll-Handler

**Erwartete Verbesserung:**
- Von: Alle Reservierungen laden (1000+ Einträge)
- Zu: Nur 20 Einträge initial, weitere beim Scrollen
- **90-95% weniger Daten bei initialem Load**

#### 1.2 Infinite Scroll reparieren ⭐⭐

**Frontend:** `frontend/src/components/Requests.tsx` & `frontend/src/pages/Worktracker.tsx`
- Verwende IntersectionObserver statt window scroll
- Prüfe Container-Scroll, nicht nur window scroll
- Bessere Bedingung für "nahe am Ende"

**Erwartete Verbesserung:**
- Infinite Scroll funktioniert in allen Ansichten
- User kann durch alle Einträge scrollen

---

### Phase 2: PERFORMANCE-OPTIMIERUNGEN (Wichtig)

#### 2.1 DB-Query Performance analysieren ⭐⭐⭐

**Schritte:**
1. EXPLAIN ANALYZE für langsame Queries ausführen
2. Prüfe ob Indizes verwendet werden
3. Identifiziere Full Table Scans
4. Optimiere WHERE-Klauseln

**Erwartete Verbesserung:**
- Von: 30+ Sekunden für 20 Einträge
- Zu: 0.5-2 Sekunden für 20 Einträge
- **90-95% schneller**

#### 2.2 Indizes prüfen und optimieren ⭐⭐

**Schritte:**
1. Prüfe ob Indizes auf `organizationId`, `userId`, `createdAt` existieren
2. Prüfe ob Composite Indizes für häufige WHERE-Kombinationen existieren
3. Erstelle fehlende Indizes

**Erwartete Verbesserung:**
- Queries nutzen Indizes statt Full Table Scans
- **50-80% schneller**

#### 2.3 WHERE-Klauseln vereinfachen ⭐

**Schritte:**
1. Vereinfache verschachtelte AND/OR-Bedingungen
2. Nutze flachere Strukturen für bessere Index-Nutzung
3. Vermeide unnötige JOINs

**Erwartete Verbesserung:**
- PostgreSQL kann besser optimieren
- **20-40% schneller**

---

### Phase 3: MONITORING (Langfristig)

#### 3.1 Query-Performance-Monitoring

**Schritte:**
1. Logge Query-Dauer für alle DB-Operationen
2. Identifiziere langsame Queries automatisch
3. Alert bei Queries > 5 Sekunden

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Reservations Pagination (SOFORT)
1. Backend: `getAllReservations` mit `limit`/`offset` erweitern
2. Frontend: Infinite Scroll für Reservations implementieren
3. Testen: Reservations laden und scrollen

### Schritt 2: Infinite Scroll reparieren (SOFORT)
1. IntersectionObserver statt window scroll
2. Container-Scroll prüfen
3. Testen: Requests/Tasks/Reservations scrollen

### Schritt 3: DB-Query Performance analysieren (WICHTIG)
1. EXPLAIN ANALYZE ausführen
2. Indizes prüfen
3. Optimierungen umsetzen

### Schritt 4: Monitoring (LANGFRISTIG)
1. Query-Performance-Logging
2. Alerts bei langsamen Queries

---

## 🎯 ERWARTETE GESAMTVERBESSERUNG

### Vorher:
- Reservations: Alle laden (1000+ Einträge) → 30+ Sekunden
- Requests: 20 Einträge → 4-30 Sekunden
- Tasks: 20 Einträge → 30+ Sekunden
- Infinite Scroll: Funktioniert nicht

### Nachher:
- Reservations: 20 Einträge initial → 0.5-2 Sekunden
- Requests: 20 Einträge → 0.5-2 Sekunden
- Tasks: 20 Einträge → 0.5-2 Sekunden
- Infinite Scroll: Funktioniert in allen Ansichten

**Gesamtverbesserung: 90-95% schneller!**

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Alle Probleme identifiziert, Lösungsplan erstellt  
**Nächster Schritt:** Phase 1 umsetzen (Reservations Pagination + Infinite Scroll reparieren)

