# Rollen-Isolation Plan - Kritische Analyse und Risiken (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 KRITISCHE ANALYSE - Vollständige Überprüfung des Plans  
**Priorität:** 🔴🔴🔴 KRITISCH

---

## 📋 ZUSAMMENFASSUNG DER ANALYSE

Nach gründlicher Überprüfung des Plans wurden **mehrere kritische Probleme und Risiken** identifiziert, die vor der Implementierung gelöst werden müssen.

---

## ❌ KRITISCHE PROBLEME - WAS WURDE VERGESSEN/ÜBERSEHEN

### 1. **branchId kann NULL sein** ⚠️🔴 KRITISCH

**Problem:**
- `organizationCache.get()` kann `branchId: undefined` zurückgeben (Zeile 80 in `organizationCache.ts`)
- Wenn User keine aktive Branch hat (`lastUsed: true` fehlt), ist `branchId` undefined
- Der Plan sieht Fallbacks vor, aber diese sind nicht konsistent

**Betroffene Stellen:**
- **Requests:** Fallback zu "nur eigene Requests" - könnte zu viele zeigen
- **Tasks:** Fallback zu "nur eigene Tasks" - könnte zu viele zeigen
- **Reservations:** Fallback zu "leeres Array" - könnte zu restriktiv sein
- **Tour Bookings:** Fallback zu `branchId: -1` - funktioniert nicht (kein Match)

**Lösung erforderlich:**
```typescript
// Statt branchId: -1 (funktioniert nicht)
// Besser: Explizit prüfen und leeres Array zurückgeben
if (!branchId) {
    return res.json({
        success: true,
        data: [],
        totalCount: 0,
        hasMore: false
    });
}
```

**Risiko:** 🔴🔴🔴 **HOCH** - User ohne Branch sehen möglicherweise keine Daten oder zu viele Daten

---

### 2. **Private Requests - Admin sieht nicht alle** ⚠️🔴 KRITISCH

**Problem:**
- Aktueller Plan sieht vor: Admin sieht alle Requests der Organisation
- ABER: Private Requests (`isPrivate: true`) werden nur angezeigt, wenn User `requesterId` oder `responsibleId` ist
- **Admin sollte ALLE private Requests sehen können!**

**Aktueller Code (requestController.ts, Zeile 117-137):**
```typescript
baseWhereConditions.push({
    OR: [
        { isPrivate: false, organizationId: organizationId },
        { isPrivate: true, organizationId: organizationId, requesterId: userId },
        { isPrivate: true, organizationId: organizationId, responsibleId: userId }
    ]
});
```

**Problem im Plan:**
- Plan sieht vor: Admin sieht alle Requests
- ABER: Private Requests werden weiterhin nach `requesterId/responsibleId` gefiltert
- **Admin sollte private Requests OHNE diese Einschränkung sehen!**

**Lösung erforderlich:**
```typescript
if (isAdminRole(req) || isOwnerRole(req)) {
    // Admin/Owner: Alle Requests (inkl. private, ohne Einschränkung)
    baseWhereConditions.push({
        OR: [
            { isPrivate: false, organizationId: organizationId },
            { isPrivate: true, organizationId: organizationId } // ✅ KEINE requesterId/responsibleId Einschränkung!
        ]
    });
}
```

**Risiko:** 🔴🔴 **MITTEL** - Admin sieht nicht alle private Requests

---

### 3. **getDataIsolationFilter wird NICHT verwendet** ⚠️ GEFUNDEN

**Gut:** 
- `taskController.ts` und `requestController.ts` verwenden `getDataIsolationFilter` NICHT direkt
- Sie haben eigene Isolation-Logik
- **ABER:** `getDataIsolationFilter` wird in `getRequestById` verwendet (Zeile 295)

**Problem:**
- `getDataIsolationFilter` hat eigene Logik für Tasks (Zeile 165-208 in `organization.ts`)
- Diese Logik wird NICHT verwendet in `getAllTasks`
- **Konsistenz-Problem:** Zwei verschiedene Isolation-Logiken für Tasks!

**Lösung erforderlich:**
- Entweder: `getDataIsolationFilter` aktualisieren und verwenden
- Oder: `getDataIsolationFilter` komplett entfernen (wenn nicht mehr verwendet)
- **WICHTIG:** Konsistenz zwischen `getAllTasks` und `getTaskById` sicherstellen

**Risiko:** 🔴 **NIEDRIG** - Konsistenz-Problem, aber funktionalität nicht direkt betroffen

---

### 4. **Filter können Datenisolation überschreiben** ⚠️🔴 KRITISCH

**Problem:**
- Filter werden NACH Isolation-Regeln angewendet (AND-Kombination)
- ABER: Filter können `branchId` oder `organizationId` setzen
- **Was passiert, wenn User einen Filter mit `branchId: 999` setzt (andere Branch)?**

**Aktueller Code (filterToPrisma.ts):**
- Filter können `branch: { name: { equals: "..." } }` setzen
- Dies wird zu `branchId` konvertiert (über Branch-Name)
- **Problem:** Filter könnte Branch setzen, die User nicht sehen darf!

**Beispiel:**
1. User hat `branchId: 1` (aktive Branch)
2. User setzt Filter: `branch = "Branch 2"`
3. Backend konvertiert zu `branchId: 2`
4. **Problem:** User sieht Daten von Branch 2, obwohl er nur Branch 1 sehen darf!

**Lösung erforderlich:**
- Filter-Validierung: Prüfe, ob Filter-Branch zur aktiven Branch des Users gehört
- Oder: Filter-Branch-Filter IGNORIEREN, wenn User keine Admin-Rolle hat
- Oder: Filter-Branch-Filter NUR anwenden, wenn User Admin-Rolle hat

**Risiko:** 🔴🔴🔴 **SEHR HOCH** - Sicherheitslücke! User können Daten von anderen Branches sehen!

---

### 5. **Saved Filters können Isolation verletzen** ⚠️🔴 KRITISCH

**Problem:**
- Saved Filters werden in der Datenbank gespeichert
- Filter können `branchId` oder `organizationId` enthalten
- **Was passiert, wenn User einen Filter speichert, der gegen Isolation verstößt?**

**Beispiel:**
1. Admin erstellt Filter: `branch = "Branch 2"`
2. User (nur Branch 1) lädt diesen Filter
3. **Problem:** User sieht Daten von Branch 2!

**Aktueller Code (savedFilterController.ts):**
- Keine Validierung, ob Filter gegen Isolation verstößt
- Filter werden direkt angewendet

**Lösung erforderlich:**
- Filter-Validierung beim Laden: Prüfe, ob Filter-Bedingungen gegen Isolation verstoßen
- Filter-Branch-Filter IGNORIEREN, wenn User keine Admin-Rolle hat
- Oder: Filter nur für Admin-Rolle speichern/laden

**Risiko:** 🔴🔴🔴 **SEHR HOCH** - Sicherheitslücke! User können gespeicherte Filter verwenden, die gegen Isolation verstoßen!

---

### 6. **Tasks ohne branchId - Schema sagt required** ✅ GEFUNDEN

**Gut:**
- Schema sagt: `branchId Int` (required, Zeile 288)
- Tasks MÜSSEN eine Branch haben
- **Kein Problem hier!**

**ABER:** Was passiert, wenn Task mit `branchId: null` existiert (alte Daten)?
- Prisma würde Fehler werfen (Foreign Key Constraint)
- **Kein Problem, aber sollte dokumentiert werden**

---

### 7. **Tasks ohne roleId - Schema sagt optional** ⚠️ GEFUNDEN

**Problem:**
- Schema sagt: `roleId Int?` (optional, Zeile 292)
- Tasks können OHNE `roleId` existieren
- **Was passiert mit diesen Tasks für User-Rolle?**

**Aktueller Plan:**
```typescript
if (userRoleId) {
    taskFilter.OR = [
        { responsibleId: userId },
        { qualityControlId: userId },
        { roleId: userRoleId }
    ];
}
```

**Problem:**
- Tasks ohne `roleId` werden NUR angezeigt, wenn User `responsibleId` oder `qualityControlId` ist
- **Ist das gewollt?** Oder sollen Tasks ohne `roleId` für ALLE Rollen sichtbar sein?

**Lösung erforderlich:**
- Klärung: Sollen Tasks ohne `roleId` für alle Rollen sichtbar sein?
- Oder: Nur für Admin sichtbar?
- Oder: Nur für `responsibleId/qualityControlId` sichtbar (aktueller Plan)?

**Risiko:** 🔴 **NIEDRIG** - Funktionalitäts-Frage, muss geklärt werden

---

### 8. **Branch-Wechsel - Frontend lädt nicht neu** ⚠️🔴 KRITISCH

**Problem:**
- Wenn User Branch wechselt, wird `organizationCache` invalidiert
- ABER: Frontend lädt Daten NICHT automatisch neu
- **User sieht weiterhin Daten der alten Branch!**

**Aktueller Code:**
- `switchUserBranch` invalidiert Cache (Zeile 321 in `branchController.ts`)
- Frontend hat keinen Listener für Branch-Wechsel
- **Worktracker-Seite lädt Daten nicht neu nach Branch-Wechsel**

**Lösung erforderlich:**
- Frontend: Listener für Branch-Wechsel hinzufügen
- Oder: Daten automatisch neu laden, wenn `branchId` sich ändert
- Oder: User manuell auffordern, Seite neu zu laden

**Risiko:** 🔴🔴 **MITTEL** - User sieht falsche Daten nach Branch-Wechsel

---

### 9. **Infinite Scroll Race Conditions** ⚠️ GEFUNDEN

**Problem:**
- Infinite Scroll lädt Daten mit `append = true`
- Wenn Filter geändert wird, wird `append = false` verwendet
- **ABER:** Was passiert, wenn Filter geändert wird, während Infinite Scroll lädt?

**Aktueller Code (Worktracker.tsx, Zeile 1890-1918):**
```typescript
useEffect(() => {
    // ... Infinite Scroll Observer
    if (firstEntry.isIntersecting && tasksHasMore && !tasksLoadingMore && !loading) {
        loadTasks(..., true, ...); // append = true
    }
}, [activeTab, tasksHasMore, tasksLoadingMore, loading, tasks.length, selectedFilterId, filterConditions, loadTasks]);
```

**Problem:**
- Wenn `selectedFilterId` oder `filterConditions` sich ändern, wird `useEffect` neu ausgeführt
- ABER: `loadTasks` mit `append = true` könnte noch laufen
- **Race Condition:** Alte Daten werden zu neuen Daten hinzugefügt!

**Lösung erforderlich:**
- Abbrechen laufender Requests, wenn Filter sich ändern
- Oder: Prüfen, ob Filter sich geändert haben, bevor Daten angehängt werden
- Oder: Request-ID verwenden, um veraltete Responses zu ignorieren

**Risiko:** 🔴 **NIEDRIG** - Selten, aber kann zu inkonsistenten Daten führen

---

### 10. **useEffect Dependencies - loadTasks könnte stale sein** ⚠️ GEFUNDEN

**Problem:**
- `loadTasks` ist ein `useCallback` mit Dependencies `[filterLogicalOperators, t]`
- ABER: `loadTasks` verwendet auch `filterConditions` (Zeile 579)
- **Problem:** `filterConditions` ist NICHT in Dependencies von `useCallback`!

**Aktueller Code:**
```typescript
const loadTasks = useCallback(async (..., filterConditions?: any[], ...) => {
    // ...
    if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
            conditions: filterConditions,
            operators: filterLogicalOperators // ✅ In Dependencies
        });
    }
}, [filterLogicalOperators, t]); // ❌ filterConditions fehlt!
```

**Problem:**
- `filterConditions` wird als Parameter übergeben, nicht aus State gelesen
- **ABER:** `useEffect` für Infinite Scroll verwendet `filterConditions` aus State (Zeile 1899)
- **Konsistenz-Problem:** `loadTasks` verwendet Parameter, `useEffect` verwendet State

**Lösung erforderlich:**
- Entweder: `filterConditions` aus State in `loadTasks` lesen (nicht als Parameter)
- Oder: `filterConditions` zu Dependencies von `useCallback` hinzufügen
- **WICHTIG:** Konsistenz sicherstellen

**Risiko:** 🔴 **NIEDRIG** - Kann zu inkonsistenten Filter-Anwendungen führen

---

### 11. **Reservations-Berechtigungen vs. Rollen** ⚠️🔴 GEFUNDEN

**Problem:**
- Aktuell: Reservations werden nach Berechtigungen gefiltert (`reservations_all_branches`, `reservations_own_branch`)
- Plan sieht vor: Reservations werden nach Rollen gefiltert (Admin vs. User)
- **Konflikt:** Zwei verschiedene Filterungs-Mechanismen!

**Aktueller Code (reservationController.ts, Zeile 544-635):**
```typescript
const hasAllBranchesPermission = await checkUserPermission(...);
const hasOwnBranchPermission = await checkUserPermission(...);

if (hasOwnBranchPermission && !hasAllBranchesPermission) {
    whereClause.branchId = branchId;
}
```

**Plan sieht vor:**
```typescript
if (isAdminRole(req) || isOwnerRole(req)) {
    // Alle Reservations
} else {
    // Nur eigene Branch
}
```

**Problem:**
- Was passiert, wenn User `reservations_all_branches` Berechtigung hat, aber KEINE Admin-Rolle?
- Aktuell: User sieht alle Reservations
- Nach Plan: User sieht nur eigene Branch
- **Konflikt!**

**Lösung erforderlich:**
- Entscheidung: Sollen Berechtigungen ODER Rollen verwendet werden?
- Oder: Kombination: Admin-Rolle überschreibt Berechtigungen?
- **WICHTIG:** Klärung erforderlich!

**Risiko:** 🔴🔴 **MITTEL** - Funktionalitäts-Konflikt, muss geklärt werden

---

### 12. **Performance: Komplexe OR-Bedingungen** ⚠️ GEFUNDEN

**Problem:**
- Plan sieht vor: Komplexe OR-Bedingungen mit AND-Kombination
- Beispiel: `{ AND: [ { OR: [...] }, { organizationId }, { branchId } ] }`

**Aktueller Code (taskController.ts, Zeile 88-103):**
```typescript
baseWhereConditions.push({
    OR: [
        { organizationId: organizationId, responsibleId: userId },
        { organizationId: organizationId, qualityControlId: userId },
        { organizationId: organizationId, roleId: userRoleId }
    ]
});
```

**Indizes (schema.prisma):**
- `@@index([organizationId, status, createdAt(sort: Desc)])` - Composite Index
- `@@index([responsibleId])` - Single Index
- `@@index([qualityControlId])` - Single Index
- `@@index([roleId])` - Single Index
- `@@index([branchId])` - Single Index

**Problem:**
- OR-Bedingungen können Indizes nicht optimal nutzen
- Database muss mehrere Indizes scannen und kombinieren
- **Performance könnte leiden bei großen Datenmengen!**

**Lösung erforderlich:**
- Composite Indexes für häufige Kombinationen erstellen:
  - `@@index([organizationId, branchId, roleId])`
  - `@@index([organizationId, branchId, responsibleId])`
  - `@@index([organizationId, branchId, qualityControlId])`
- Oder: Query-Optimierung (EXPLAIN ANALYZE)

**Risiko:** 🔴 **NIEDRIG** - Performance könnte leiden, aber Indizes existieren bereits

---

### 13. **getDataIsolationFilter wird in getRequestById verwendet** ⚠️ GEFUNDEN

**Problem:**
- `getRequestById` verwendet `getDataIsolationFilter` (Zeile 295 in `requestController.ts`)
- `getAllRequests` verwendet eigene Isolation-Logik
- **Konsistenz-Problem:** Zwei verschiedene Isolation-Logiken!

**Aktueller Code:**
```typescript
// getRequestById
const isolationFilter = getDataIsolationFilter(req as any, 'request');
// getDataIsolationFilter gibt zurück: { organizationId: req.organizationId }

// getAllRequests
baseWhereConditions.push({
    OR: [
        { isPrivate: false, organizationId: organizationId },
        { isPrivate: true, organizationId: organizationId, requesterId: userId },
        { isPrivate: true, organizationId: organizationId, responsibleId: userId }
    ]
});
```

**Problem:**
- `getDataIsolationFilter` für 'request' gibt nur `{ organizationId }` zurück
- `getAllRequests` hat komplexere Logik (isPrivate, requesterId, responsibleId)
- **Inkonsistenz:** `getRequestById` verwendet einfachere Logik!

**Lösung erforderlich:**
- `getRequestById` sollte dieselbe Logik wie `getAllRequests` verwenden
- Oder: `getDataIsolationFilter` für 'request' aktualisieren
- **WICHTIG:** Konsistenz sicherstellen!

**Risiko:** 🔴 **NIEDRIG** - Konsistenz-Problem, aber funktionalität nicht direkt betroffen

---

### 14. **Tasks: getDataIsolationFilter vs. getAllTasks** ⚠️ GEFUNDEN

**Problem:**
- `getDataIsolationFilter` für 'task' hat eigene Logik (Zeile 165-208 in `organization.ts`)
- `getAllTasks` hat eigene Logik (Zeile 85-127 in `taskController.ts`)
- **Zwei verschiedene Logiken für Tasks!**

**getDataIsolationFilter:**
```typescript
taskFilter.OR = [
    { responsibleId: userId },
    { qualityControlId: userId },
    { roleId: userRoleId }
];
// organizationId wird als separate Bedingung hinzugefügt (AND)
```

**getAllTasks:**
```typescript
baseWhereConditions.push({
    OR: [
        { organizationId: organizationId, responsibleId: userId },
        { organizationId: organizationId, qualityControlId: userId },
        { organizationId: organizationId, roleId: userRoleId }
    ]
});
// organizationId ist in JEDER OR-Bedingung
```

**Problem:**
- Zwei verschiedene Ansätze für dasselbe Problem!
- **Konsistenz-Problem:** Welche Logik ist korrekt?

**Lösung erforderlich:**
- Entscheidung: Welche Logik ist korrekt?
- `getAllTasks` Logik ist performanter (organizationId in jeder OR-Bedingung)
- `getDataIsolationFilter` Logik ist einfacher (organizationId als separate Bedingung)
- **WICHTIG:** Konsistenz sicherstellen!

**Risiko:** 🔴 **NIEDRIG** - Konsistenz-Problem, aber funktionalität nicht direkt betroffen

---

### 15. **User ohne aktive Rolle** ⚠️ GEFUNDEN

**Problem:**
- `organizationCache.get()` kann `null` zurückgeben, wenn keine aktive Rolle gefunden wird (Zeile 63-64)
- `organizationMiddleware` wirft dann Fehler (Zeile 27-30)
- **ABER:** Was passiert, wenn User mehrere Rollen hat, aber keine als `lastUsed: true` markiert ist?

**Aktueller Code (organizationCache.ts, Zeile 30-34):**
```typescript
const userRole = await prisma.userRole.findFirst({
    where: { 
        userId: Number(userId),
        lastUsed: true 
    },
    // ...
});
```

**Problem:**
- Wenn keine Rolle `lastUsed: true` hat, wird `null` zurückgegeben
- Middleware wirft Fehler
- **User kann nicht einloggen!**

**Lösung erforderlich:**
- Fallback: Erste verfügbare Rolle als `lastUsed: true` markieren
- Oder: Fehler klar kommunizieren
- **WICHTIG:** Edge Case behandeln!

**Risiko:** 🔴 **NIEDRIG** - Edge Case, aber sollte behandelt werden

---

## ⚠️ PERFORMANCE-ANALYSE

### Positive Auswirkungen:

1. **Branch-Filterung reduziert Datenmenge:**
   - ✅ Weniger Daten = schnellere Queries
   - ✅ Weniger RAM-Verbrauch
   - ✅ Weniger Network-Traffic

2. **Indizes existieren bereits:**
   - ✅ `@@index([branchId])` für Tasks, Requests, Reservations, TourBookings
   - ✅ `@@index([organizationId, ...])` Composite Indexes
   - ✅ Indizes sollten optimal genutzt werden

### Negative Auswirkungen / Risiken:

1. **Komplexe OR-Bedingungen:**
   - ⚠️ OR-Bedingungen können Indizes nicht optimal nutzen
   - ⚠️ Database muss mehrere Indizes scannen
   - **Lösung:** Composite Indexes für häufige Kombinationen

2. **Rollen-Prüfung bei jedem Request:**
   - ⚠️ Zusätzliche String-Vergleich (`roleName === 'Admin'`)
   - **ABER:** Sehr schnell (nanoseconds), kein Problem

3. **Branch-Filterung mit AND-Kombination:**
   - ⚠️ `{ AND: [ { OR: [...] }, { branchId } ] }`
   - **ABER:** Indizes existieren, sollte funktionieren

### Performance-Verbesserungen:

1. **Weniger Daten:**
   - User-Rolle sieht nur Daten der eigenen Branch
   - **Erwartete Reduktion:** 50-90% weniger Daten (abhängig von Anzahl Branches)

2. **Bessere Index-Nutzung:**
   - `branchId` Filter kann Index optimal nutzen
   - **Erwartete Verbesserung:** 2-5x schneller

### Performance-Risiken:

1. **Komplexe OR-Bedingungen:**
   - ⚠️ `{ OR: [ { organizationId, branchId, responsibleId }, { organizationId, branchId, qualityControlId }, { organizationId, branchId, roleId } ] }`
   - **Risiko:** Database muss 3 Indizes scannen
   - **Lösung:** Composite Index `@@index([organizationId, branchId, responsibleId, qualityControlId, roleId])` (zu groß?)
   - **Besser:** Separate Composite Indexes für häufige Kombinationen

2. **Filter + Isolation:**
   - ⚠️ Filter werden NACH Isolation angewendet (AND-Kombination)
   - **Risiko:** Zusätzliche Filter-Bedingungen können Performance beeinträchtigen
   - **ABER:** Filter werden bereits verwendet, kein zusätzliches Risiko

---

## 🔐 SICHERHEITS-RISIKEN

### 1. **Filter können Isolation überschreiben** 🔴🔴🔴 SEHR HOCH

**Problem:** Siehe Punkt 4 oben

**Lösung:**
- Filter-Validierung: Prüfe, ob Filter-Bedingungen gegen Isolation verstoßen
- Filter-Branch-Filter IGNORIEREN, wenn User keine Admin-Rolle hat
- Oder: Filter-Branch-Filter NUR anwenden, wenn User Admin-Rolle hat

### 2. **Saved Filters können Isolation verletzen** 🔴🔴🔴 SEHR HOCH

**Problem:** Siehe Punkt 5 oben

**Lösung:**
- Filter-Validierung beim Laden: Prüfe, ob Filter-Bedingungen gegen Isolation verstoßen
- Filter-Branch-Filter IGNORIEREN, wenn User keine Admin-Rolle hat

### 3. **Private Requests - Admin sieht nicht alle** 🔴🔴 MITTEL

**Problem:** Siehe Punkt 2 oben

**Lösung:**
- Admin sollte private Requests OHNE `requesterId/responsibleId` Einschränkung sehen

---

## 🔧 FUNKTIONALITÄTS-RISIKEN

### 1. **Branch-Wechsel - Frontend lädt nicht neu** 🔴🔴 MITTEL

**Problem:** Siehe Punkt 8 oben

**Lösung:**
- Frontend: Listener für Branch-Wechsel hinzufügen
- Daten automatisch neu laden, wenn `branchId` sich ändert

### 2. **Reservations-Berechtigungen vs. Rollen** 🔴🔴 MITTEL

**Problem:** Siehe Punkt 11 oben

**Lösung:**
- Entscheidung: Sollen Berechtigungen ODER Rollen verwendet werden?
- Oder: Kombination: Admin-Rolle überschreibt Berechtigungen?

### 3. **Tasks ohne roleId** 🔴 NIEDRIG

**Problem:** Siehe Punkt 7 oben

**Lösung:**
- Klärung: Sollen Tasks ohne `roleId` für alle Rollen sichtbar sein?

### 4. **Infinite Scroll Race Conditions** 🔴 NIEDRIG

**Problem:** Siehe Punkt 9 oben

**Lösung:**
- Abbrechen laufender Requests, wenn Filter sich ändern
- Oder: Request-ID verwenden, um veraltete Responses zu ignorieren

---

## 📊 ZUSAMMENFASSUNG DER RISIKEN

### Kritische Risiken (🔴🔴🔴):

1. **Filter können Isolation überschreiben** - Sicherheitslücke!
2. **Saved Filters können Isolation verletzen** - Sicherheitslücke!

### Hohe Risiken (🔴🔴):

1. **Private Requests - Admin sieht nicht alle** - Funktionalitäts-Problem
2. **Branch-Wechsel - Frontend lädt nicht neu** - Funktionalitäts-Problem
3. **Reservations-Berechtigungen vs. Rollen** - Funktionalitäts-Konflikt
4. **branchId kann NULL sein** - Edge Case, muss behandelt werden

### Mittlere Risiken (🔴):

1. **Tasks ohne roleId** - Funktionalitäts-Frage
2. **Infinite Scroll Race Conditions** - Selten, aber möglich
3. **useEffect Dependencies** - Konsistenz-Problem
4. **getDataIsolationFilter vs. Controller-Logik** - Konsistenz-Problem

### Niedrige Risiken:

1. **Performance: Komplexe OR-Bedingungen** - Indizes existieren, sollte funktionieren
2. **User ohne aktive Rolle** - Edge Case, sollte behandelt werden

---

## ✅ EMPFOHLENE LÖSUNGEN

### 1. Filter-Validierung implementieren

**Vor Anwendung von Filtern:**
```typescript
// backend/src/utils/filterToPrisma.ts
export function validateFilterAgainstIsolation(
    filterWhereClause: any,
    req: Request,
    entity: 'request' | 'task' | 'reservation' | 'tour_booking'
): any {
    // Prüfe, ob Filter branchId oder organizationId setzt
    // Wenn User keine Admin-Rolle hat, entferne/ignoriere diese Filter
    if (!isAdminRole(req) && !isOwnerRole(req)) {
        // Entferne branchId-Filter, wenn gesetzt
        if (filterWhereClause.branchId) {
            delete filterWhereClause.branchId;
        }
        // Entferne organizationId-Filter, wenn gesetzt
        if (filterWhereClause.organizationId) {
            delete filterWhereClause.organizationId;
        }
        // Prüfe verschachtelte Bedingungen
        // ...
    }
    return filterWhereClause;
}
```

### 2. Private Requests für Admin

**Anpassung in requestController.ts:**
```typescript
if (isAdminRole(req) || isOwnerRole(req)) {
    // Admin/Owner: Alle Requests (inkl. private, ohne Einschränkung)
    baseWhereConditions.push({
        OR: [
            { isPrivate: false, organizationId: organizationId },
            { isPrivate: true, organizationId: organizationId } // ✅ KEINE requesterId/responsibleId!
        ]
    });
}
```

### 3. Branch-Wechsel Listener

**Frontend:**
```typescript
// frontend/src/pages/Worktracker.tsx
useEffect(() => {
    // Lade Daten neu, wenn branchId sich ändert
    const currentBranchId = user?.branchId; // Aus Context oder State
    if (currentBranchId !== previousBranchId) {
        // Lade Daten neu
        if (activeTab === 'todos') {
            loadTasks(undefined, undefined, false, 20, 0);
        } else if (activeTab === 'reservations') {
            loadReservations(undefined, undefined, false, 20, 0);
        }
        // ...
    }
}, [user?.branchId, activeTab]);
```

### 4. branchId NULL Handling

**Konsistente Fallbacks:**
```typescript
// Für alle Controller
if (!branchId) {
    // User hat keine aktive Branch
    if (isAdminRole(req) || isOwnerRole(req)) {
        // Admin: Zeige alle Daten (kein branchId Filter)
    } else {
        // User: Zeige keine Daten (leeres Array)
        return res.json({
            success: true,
            data: [],
            totalCount: 0,
            hasMore: false
        });
    }
}
```

### 5. Reservations-Berechtigungen vs. Rollen

**Entscheidung erforderlich:**
- Option A: Rollen haben Priorität (Admin-Rolle überschreibt Berechtigungen)
- Option B: Berechtigungen haben Priorität (Berechtigungen überschreiben Rollen)
- Option C: Kombination (Admin-Rolle ODER Berechtigungen)

**Empfehlung:** Option A (Rollen haben Priorität)

---

## 📝 ERWEITERTER PLAN

### Phase 0: Kritische Probleme beheben (VOR Implementierung)

1. **Filter-Validierung implementieren** (🔴🔴🔴 KRITISCH)
2. **Private Requests für Admin** (🔴🔴 MITTEL)
3. **branchId NULL Handling** (🔴🔴 MITTEL)
4. **Reservations-Berechtigungen vs. Rollen klären** (🔴🔴 MITTEL)

### Phase 1: To Do's Lade-Problem beheben

- Wie im ursprünglichen Plan

### Phase 2: Filter-Problem beheben

- Wie im ursprünglichen Plan
- **PLUS:** Filter-Validierung hinzufügen

### Phase 3: Rollen-Isolation implementieren

- Wie im ursprünglichen Plan
- **PLUS:** Alle kritischen Probleme beheben

---

## ⚠️ WICHTIGE HINWEISE

1. **Sicherheitslücken müssen ZUERST behoben werden!**
   - Filter-Validierung ist KRITISCH
   - Saved Filters-Validierung ist KRITISCH

2. **Konsistenz-Probleme müssen geklärt werden:**
   - `getDataIsolationFilter` vs. Controller-Logik
   - Reservations-Berechtigungen vs. Rollen

3. **Edge Cases müssen behandelt werden:**
   - `branchId` NULL
   - User ohne aktive Rolle
   - Tasks ohne `roleId`

4. **Performance sollte überwacht werden:**
   - Query-Performance nach Implementierung prüfen
   - Composite Indexes für häufige Kombinationen erwägen

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 KRITISCHE ANALYSE - Vollständige Überprüfung abgeschlossen  
**Nächster Schritt:** Kritische Probleme beheben, dann Implementierung

