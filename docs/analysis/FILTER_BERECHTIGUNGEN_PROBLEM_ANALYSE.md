# Filter-Berechtigungen Problem-Analyse

**Datum:** 2025-01-31  
**Status:** 🔍 ANALYSE - PROBLEM IDENTIFIZIERT

---

## 1. WAS SOLLTE PASSIEREN?

### Rolle "Reception" mit Berechtigungen:
- **Requests (box)**: "Propios" = `own_both` oder `own_read`
- **To-Do's (tab)**: "Propios" = `own_both` oder `own_read`

### Erwartetes Verhalten:

#### Bei Requests (`requests-table`):
1. **Filtergruppe "Benutzer" (16)**: ❌ **SOLLTE NICHT ANGEZEIGT WERDEN**
   - Grund: Bei `own_both`/`own_read` wird Filtergruppe "Benutzer" ausgeblendet
   - **AKTUELLER ZUSTAND:** Wird trotzdem angezeigt ❌

2. **Standard-Filter**: ✅ Sollten angezeigt werden
   - "Aktuell" ✅
   - "Archiv" ✅

3. **Eigene Filter**: ✅ Sollten angezeigt werden
   - Filter, die der User selbst erstellt hat

#### Bei To-Do's (`worktracker-todos`):
1. **Filtergruppe "Rollen" (14)**: ⚠️ **SOLLTE NUR ZUGEWIESENE ROLLEN ZEIGEN**
   - Grund: Bei `own_both`/`own_read` nur Rollen, die dem User zugewiesen sind
   - **AKTUELLER ZUSTAND:** Zeigt alle Rollen ❌

2. **Filtergruppe "Benutzer" (16)**: ❌ **SOLLTE NICHT ANGEZEIGT WERDEN**
   - Grund: Bei `own_both`/`own_read` wird Filtergruppe "Benutzer" ausgeblendet
   - **AKTUELLER ZUSTAND:** Wird trotzdem angezeigt ❌

3. **Standard-Filter**: ✅ Sollten angezeigt werden
   - "Aktuell" ✅
   - "Archiv" ✅

4. **Eigene Filter**: ✅ Sollten angezeigt werden
   - Filter, die der User selbst erstellt hat

---

## 2. PROBLEM IDENTIFIZIERT

### ❌ HAUPTPROBLEM: Cache lädt ungefilterte Daten

**Code-Stelle:** `backend/src/services/filterListCache.ts` → `getFilterGroups`

**Problem:**
1. `filterListCache.getFilterGroups` lädt Filtergruppen aus DB
2. Diese werden **ungefiltert** im Cache gespeichert
3. `getFilterGroups` Controller filtert die Daten NACH dem Caching
4. ABER: Beim nächsten Mal werden wieder **ungefilterte Daten** aus dem Cache geladen
5. Die Filterung wird **ignoriert**, weil Cache-Hit vor Filterung

**Code-Flow:**
```
1. Frontend ruft GET /api/saved-filters/groups/:tableId auf
2. Controller: getFilterGroups()
3. filterListCache.getFilterGroups(userId, tableId)
   → Cache-Hit? → Gibt ungefilterte Daten zurück ❌
   → Cache-Miss? → Lädt aus DB, speichert ungefiltert im Cache ❌
4. Controller: filterFiltersByPermission()
   → Filtert die Daten ✅
5. ABER: Cache enthält weiterhin ungefilterte Daten ❌
6. Beim nächsten Mal: Cache-Hit → ungefilterte Daten ❌
```

### ❌ PROBLEM 2: Filterung erfolgt zu spät

**Code-Stelle:** `backend/src/controllers/savedFilterController.ts` → `getFilterGroups`

**Problem:**
- Filterung erfolgt NACH dem Caching
- Cache enthält ungefilterte Daten
- Filterung wird nur einmalig angewendet, nicht persistent

### ❌ PROBLEM 3: AccessLevel wird möglicherweise nicht korrekt ermittelt

**Mögliches Problem:**
- "Propios" könnte als Legacy-Format `write` gespeichert sein
- `convertLegacyAccessLevel('write')` → `'own_both'` ✅
- ABER: Wenn `checkUserPermissionWithDetails` `'write'` zurückgibt, wird es konvertiert
- Prüfung nötig: Was steht tatsächlich in der DB?

---

## 3. LÖSUNG

### Lösung 1: Filterung VOR dem Caching (BESTE LÖSUNG)

**Änderung:** `filterListCache.getFilterGroups` muss AccessLevel als Parameter erhalten

**Code-Änderung:**
```typescript
// filterListCache.ts
async getFilterGroups(
  userId: number, 
  tableId: string,
  accessLevel?: AccessLevel  // NEU: AccessLevel als Parameter
): Promise<any[] | null> {
  // ... Cache-Prüfung ...
  
  // Filterung VOR dem Caching
  let parsedGroups = /* ... aus DB laden ... */;
  
  if (accessLevel && (accessLevel === 'own_both' || accessLevel === 'own_read')) {
    // Filterung hier anwenden
    parsedGroups = await filterGroupsByPermission(parsedGroups, accessLevel, userId);
  }
  
  // Cache mit gefilterten Daten speichern
  this.filterGroupListCache.set(cacheKey, {
    groups: parsedGroups,
    timestamp: Date.now()
  });
  
  return parsedGroups;
}
```

**Problem:** Cache-Key muss AccessLevel enthalten, sonst werden gefilterte und ungefilterte Daten vermischt

### Lösung 2: Cache nach Filterung invalidiert (EINFACHERE LÖSUNG)

**Änderung:** Cache wird nach Filterung invalidiert

**Code-Änderung:**
```typescript
// savedFilterController.ts → getFilterGroups
const { groups: filteredGroups } = await filterFiltersByPermission(
  [],
  parsedGroups as FilterGroup[],
  accessLevel,
  userId
);

// Cache invalidieren, damit beim nächsten Mal neu geladen wird
if (accessLevel === 'own_both' || accessLevel === 'own_read') {
  filterListCache.invalidate(userId, tableId);
}

return res.status(200).json(filteredGroups);
```

**Problem:** Cache wird ständig invalidiert, Performance-Problem

### Lösung 3: Cache-Key mit AccessLevel (BESTE LÖSUNG)

**Änderung:** Cache-Key enthält AccessLevel

**Code-Änderung:**
```typescript
// filterListCache.ts
async getFilterGroups(
  userId: number, 
  tableId: string,
  accessLevel: AccessLevel  // NEU: AccessLevel als Parameter
): Promise<any[] | null> {
  // Cache-Key mit AccessLevel
  const cacheKey = `${userId}:${tableId}:${accessLevel}`;
  
  // ... Rest wie bisher ...
}
```

**Vorteil:** 
- Gefilterte und ungefilterte Daten werden getrennt gecacht
- Keine Cache-Invalidierung nötig
- Performance bleibt erhalten

---

## 4. ZUSÄTZLICHE PROBLEME

### Problem 4: Filtergruppen werden im Frontend aus Cache geladen

**Code-Stelle:** `frontend/src/contexts/FilterContext.tsx`

**Problem:**
- Frontend lädt Filtergruppen über API
- API gibt gefilterte Daten zurück
- ABER: Frontend-Cache könnte alte (ungefilterte) Daten enthalten

**Prüfung nötig:**
- Werden Filtergruppen im Frontend-Cache gespeichert?
- Werden gefilterte Daten korrekt angezeigt?

### Problem 5: AccessLevel-Format in DB

**Prüfung nötig:**
- Wie wird "Propios" in der DB gespeichert?
- Als `own_both`, `own_read`, oder als Legacy-Format `write`?
- Wird `convertLegacyAccessLevel` korrekt aufgerufen?

---

## 5. DEBUGGING-PLAN

### Schritt 1: AccessLevel prüfen
1. Logging in `getAccessLevelForTableId` hinzufügen
2. Prüfen, was für "Reception" zurückgegeben wird
3. Prüfen, ob `own_both`/`own_read` korrekt erkannt wird

### Schritt 2: Cache-Verhalten prüfen
1. Logging in `filterListCache.getFilterGroups` hinzufügen
2. Prüfen, ob Cache-Hit oder Cache-Miss
3. Prüfen, ob gefilterte oder ungefilterte Daten zurückgegeben werden

### Schritt 3: Filterung prüfen
1. Logging in `filterFiltersByPermission` hinzufügen
2. Prüfen, ob Filtergruppe "Benutzer" entfernt wird
3. Prüfen, ob Filtergruppe "Rollen" nur zugewiesene Rollen enthält

### Schritt 4: Frontend-Verhalten prüfen
1. Browser-Console prüfen
2. API-Response prüfen
3. Prüfen, ob gefilterte Daten ankommen

---

## 6. VERMUTETE HAUPTURSACHE

**Vermutung:** Cache lädt ungefilterte Daten, Filterung wird ignoriert

**Begründung:**
1. `filterListCache.getFilterGroups` lädt Filtergruppen aus DB
2. Diese werden **ungefiltert** im Cache gespeichert
3. `getFilterGroups` Controller filtert die Daten
4. ABER: Cache enthält weiterhin ungefilterte Daten
5. Beim nächsten Mal: Cache-Hit → ungefilterte Daten werden zurückgegeben

**Lösung:**
- Cache-Key muss AccessLevel enthalten
- Oder: Filterung muss VOR dem Caching erfolgen
- Oder: Cache muss nach Filterung invalidiert werden (Performance-Problem)

---

## 7. NÄCHSTE SCHRITTE

1. ✅ Problem identifiziert: Cache lädt ungefilterte Daten
2. ⏳ Lösung implementieren: Cache-Key mit AccessLevel
3. ⏳ Testing: Alle 4 Table-IDs testen
4. ⏳ Frontend-Verhalten prüfen

---

**Erstellt:** 2025-01-31  
**Status:** 🔍 ANALYSE - PROBLEM IDENTIFIZIERT
