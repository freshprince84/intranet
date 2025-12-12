# Prüfungsplan: Filter-Probleme

## WICHTIG: Screenshot-Interpretation

**Screenshot 1:** IGNORIEREN ❌
**Screenshot 2:** Zeigt AKTUELLEN Zustand (falsch) ❌
**Screenshot 3:** Zeigt SOLL-Zustand (richtig) ✅

---

## PRÜFUNG 1: Screenshots genau analysieren

### ToDos Screenshots

**Screenshot 2 (aktuell - FALSCH):**
- Zeile 1: Responsable = Daniel Arango
- Operator: O (OR)
- Zeile 2: Control de calidad = Daniel Arango
- Operator: Y (AND)
- Zeile 3: Estado ≠ Hecho

**Screenshot 3 (soll - RICHTIG):**
- Zeile 1: Control de calidad = Daniel Arango
- Operator: O (OR)
- Zeile 2: Responsable = Daniel Arango
- Operator: Y (AND)
- Zeile 3: Estado ≠ Hecho

**Erkenntnis:**
- Reihenfolge muss umgedreht werden: `qualityControl` ZUERST, dann `responsible`
- Logik bleibt gleich: `(qualityControl OR responsible) AND status != done`

### Requests Screenshots

**Screenshot 2 (aktuell - FALSCH):**
- Wie viele Bedingungen? (sollte 4 sein)
- Welche Spalten in welcher Reihenfolge?
- Welche Operatoren?

**Screenshot 3 (soll - RICHTIG):**
- Wie viele Bedingungen? (sollte 6 sein)
- Welche Spalten in welcher Reihenfolge?
- Welche Operatoren?
- Wie ist die Logik strukturiert?

**Zu prüfen:**
- Screenshot 3 genau lesen: Welche 6 Bedingungen werden angezeigt?
- Welche Reihenfolge?
- Welche Operatoren zwischen den Bedingungen?

---

## PRÜFUNG 2: DB direkt prüfen

### SQL-Queries

**1. ToDos User-Filter (aktueller Zustand):**
```sql
SELECT 
  id, 
  name, 
  conditions, 
  operators,
  "groupId"
FROM "SavedFilter" 
WHERE "tableId" = 'worktracker-todos'
AND "groupId" IN (
  SELECT id FROM "FilterGroup" 
  WHERE "tableId" = 'worktracker-todos' 
  AND "name" IN ('Users', 'Benutzer', 'Usuarios')
)
LIMIT 1;
```

**2. Requests User-Filter (aktueller Zustand):**
```sql
SELECT 
  id, 
  name, 
  conditions, 
  operators,
  "groupId"
FROM "SavedFilter" 
WHERE "tableId" = 'requests-table'
AND "groupId" IN (
  SELECT id FROM "FilterGroup" 
  WHERE "tableId" = 'requests-table' 
  AND "name" IN ('Users', 'Benutzer', 'Usuarios')
)
LIMIT 1;
```

**3. "Todos" Filter (Requests):**
```sql
SELECT 
  id, 
  name, 
  conditions, 
  operators
FROM "SavedFilter" 
WHERE "tableId" = 'requests-table'
AND (LOWER("name") LIKE '%todo%' OR LOWER("name") LIKE '%alle%');
```

**4. Rollen-Filter (ToDos):**
```sql
SELECT 
  id, 
  name, 
  conditions, 
  operators
FROM "SavedFilter" 
WHERE "tableId" = 'worktracker-todos'
AND "groupId" IN (
  SELECT id FROM "FilterGroup" 
  WHERE "tableId" = 'worktracker-todos' 
  AND "name" IN ('Roles', 'Rollen')
)
LIMIT 1;
```

**5. Tours Filter:**
```sql
SELECT 
  id, 
  name, 
  conditions, 
  operators
FROM "SavedFilter" 
WHERE "tableId" = 'worktracker-tours';
```

---

## PRÜFUNG 3: FilterLogic Interpretation

### Sequenzielle Auswertung testen

**Aktuelle FilterLogic (filterLogic.ts Zeile 216-224):**
```typescript
for (let i = 0; i < conditions.length; i++) {
  // ...
  if (i === 0) {
    result = conditionMet;
  } else {
    const operator = operators[i - 1] || 'AND';
    result = operator === 'AND' 
      ? (result && conditionMet) 
      : (result || conditionMet);
  }
}
```

### Test: 6 Bedingungen mit Operatoren ['AND', 'AND', 'OR', 'AND', 'AND']

**Bedingungen:**
- `[requestedBy = user, status != approved, status != denied, responsible = user, status != approved, status != denied]`
- Operatoren: `['AND', 'AND', 'OR', 'AND', 'AND']`

**Auswertung:**
- `i=0`: `result = (requestedBy = user)`
- `i=1`: `operator = AND` → `result = (requestedBy = user) AND (status != approved)`
- `i=2`: `operator = AND` → `result = (requestedBy = user) AND (status != approved) AND (status != denied)`
- `i=3`: `operator = OR` → `result = ((requestedBy = user) AND (status != approved) AND (status != denied)) OR (responsible = user)`
- `i=4`: `operator = AND` → `result = (((requestedBy = user) AND (status != approved) AND (status != denied)) OR (responsible = user)) AND (status != approved)`
- `i=5`: `operator = AND` → `result = ((((requestedBy = user) AND (status != approved) AND (status != denied)) OR (responsible = user)) AND (status != approved)) AND (status != denied)`

**Ergebnis:**
- `((requestedBy = user AND status != approved AND status != denied) OR responsible = user) AND status != approved AND status != denied`

**Gewünscht:**
- `(requestedBy = user AND status != approved AND status != denied) OR (responsible = user AND status != approved AND status != denied)`

**Problem:** Die sequenzielle Auswertung liefert NICHT die gewünschte Logik!

### Alternative Struktur prüfen

**Mögliche Alternative:**
- Bedingungen: `[requestedBy = user, responsible = user, status != approved, status != denied, status != approved, status != denied]`
- Operatoren: `['OR', 'AND', 'AND', 'AND', 'AND']`
- Ergebnis: `(requestedBy = user OR responsible = user) AND status != approved AND status != denied AND status != approved AND status != denied`
- Problem: Doppelte Status-Bedingungen!

**WICHTIG: Die genaue Struktur muss aus Screenshot 3 abgeleitet werden!**

---

## PRÜFUNG 4: Frontend FilterContext

### Cache prüfen

**FilterContext.tsx:**
- Zeile 75: Cache-TTL 60 Minuten
- Zeile 101-103: Wenn Filter im Cache, wird sofort zurückgegeben
- Zeile 144-145: Cache wird SOFORT gesetzt

**Zu prüfen:**
- Browser Console: `localStorage` prüfen
- React DevTools: FilterContext State prüfen
- Network Tab: API-Response prüfen (welche Filter werden geladen?)

### SavedFilterTags prüfen

**SavedFilterTags.tsx:**
- Zeile 89: Lädt Filter über `filterContext.getFilters(tableId)`
- Zeile 208: `loadFilters(tableId)` wird aufgerufen

**Zu prüfen:**
- Console-Log: Welche Filter werden geladen?
- React DevTools: Welche Filter werden angezeigt?

---

## PRÜFUNG 5: Seed-Struktur

### Aktuelle Struktur prüfen

**Requests (Zeile 2217-2223):**
- 4 Bedingungen
- Operatoren: `['OR', 'AND', 'AND']`
- Logik: `(requestedBy OR responsible) AND status != approved AND status != denied`

**ToDos (Zeile 2226-2231):**
- 3 Bedingungen
- Operatoren: `['OR', 'AND']`
- Logik: `(responsible OR qualityControl) AND status != done`

### Soll-Struktur (basierend auf Screenshots)

**Requests:**
- 6 Bedingungen (muss aus Screenshot 3 abgeleitet werden)
- Operatoren: ? (muss aus Screenshot 3 abgeleitet werden)
- Logik: `(requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)`

**ToDos:**
- 3 Bedingungen (Reihenfolge ändern)
- Operatoren: `['OR', 'AND']` (bleibt gleich)
- Logik: `(qualityControl OR responsible) AND status != done` (Reihenfolge geändert)

---

## PRÜFUNG 6: Migration-Script

### Aktuelle Migration prüfen

**migrate-filters.ts:**
- Zeile 18-26: "Todos" Filter löschen (case-sensitive)
- Zeile 41-50: User-Filter Requests finden (nur in Gruppen)
- Zeile 59-61: Prüfung ob Status-Bedingungen vorhanden (falsche Logik)
- Zeile 97-119: User-Filter ToDos finden (nur in Gruppen)
- Zeile 128-130: Prüfung ob Status-Bedingung vorhanden

**Probleme:**
1. Case-sensitive Suche für "Todos"
2. Findet nur Filter in Gruppen
3. Prüfung findet Bedingungen nicht korrekt
4. Behandelt keine Rollen-Filter
5. Korrigiert keine Reihenfolge (ToDos)
6. Erweitert nicht auf 6 Bedingungen (Requests)

---

## ZUSAMMENFASSUNG DER PRÜFUNGEN

### 1. Screenshots analysieren ✅
- ToDos: Reihenfolge bestätigt (qualityControl ZUERST)
- Requests: 6 Bedingungen-Struktur muss abgeleitet werden

### 2. DB prüfen ⏳
- SQL-Queries oben ausführen
- Aktuelle Filter-Struktur dokumentieren

### 3. FilterLogic testen ⏳
- Sequenzielle Auswertung verstehen
- Prüfen ob gewünschte Logik erreicht werden kann

### 4. Frontend prüfen ⏳
- FilterContext Cache prüfen
- SavedFilterTags prüfen

### 5. Seed prüfen ✅
- Aktuelle Struktur dokumentiert
- Soll-Struktur muss aus Screenshots abgeleitet werden

### 6. Migration prüfen ✅
- Probleme dokumentiert
- Muss erweitert werden

---

## NÄCHSTE SCHRITTE

1. **Screenshots genau lesen:**
   - Screenshot 3 (Requests): Welche 6 Bedingungen werden angezeigt?
   - Reihenfolge dokumentieren
   - Operatoren dokumentieren

2. **DB-Queries ausführen:**
   - Aktuelle Filter-Struktur dokumentieren
   - Mit Screenshots vergleichen

3. **FilterLogic testen:**
   - Test mit 6 Bedingungen durchführen
   - Prüfen ob Logik korrekt ist

4. **Plan erstellen:**
   - Basierend auf allen Prüfungen
   - Konkrete Fixes definieren

