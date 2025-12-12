# Detaillierte Analyse: Filter-Probleme nach Migration

## Problem 1: "Todos" Filter nicht gelöscht (Requests)

### Analyse

**Migration-Script (Zeile 18-26):**
```typescript
const deletedFilters = await prisma.savedFilter.deleteMany({
  where: {
    tableId: 'requests-table',
    name: {
      in: ['Alle', 'Todos', 'All', 'Alles']
    }
  }
});
```

**Gefundene Probleme:**
1. **Case-sensitive Suche**: Prisma `in` ist case-sensitive. Filter mit Namen "todos" (kleingeschrieben) oder "TODOS" werden nicht gefunden.
2. **Kein "Todos" Filter im Seed**: Grep-Suche zeigt, dass im Seed kein "Todos" Filter für `requests-table` erstellt wird.
3. **Mögliche Ursachen:**
   - Filter wurde manuell erstellt (nicht durch Seed)
   - Filter wurde nach Migration erneut erstellt (z.B. durch Frontend)
   - Filter-Name ist anders (z.B. Übersetzungsschlüssel)

**Was zu prüfen ist:**
- Wie heißt der Filter genau in der DB? (Groß-/Kleinschreibung)
- Wird der Filter automatisch erstellt? (Frontend-Code prüfen)
- Gibt es einen Seed-Lauf nach Migration, der den Filter neu erstellt?

---

## Problem 2: User-Filter Requests ohne Status-Bedingungen

### Analyse

**Migration-Script (Zeile 52-95):**
- Findet User-Filter nur in "Users"/"Benutzer"/"Usuarios" Gruppen
- Prüft ob Status-Bedingungen vorhanden sind
- Aktualisiert Filter mit Status-Bedingungen

**Migration-Output:**
- 1172 Requests-User-Filter aktualisiert

**Frontend zeigt keine Änderungen:**

**Mögliche Ursachen:**

1. **FilterContext Cache (Zeile 75-80):**
   ```typescript
   const FILTER_CACHE_TTL_MS = 60 * 60 * 1000; // 60 Minuten
   ```
   - Filter werden 60 Minuten gecacht
   - Nach Migration werden alte Filter aus Cache angezeigt
   - Cache wird nicht invalidiert

2. **Prüfung `hasStatusConditions` (Zeile 59-61):**
   ```typescript
   const hasStatusConditions = conditions.some((c: any) => 
     c.column === 'status' && c.operator === 'notEquals' && (c.value === 'approved' || c.value === 'denied')
   );
   ```
   - Prüft ob BEIDE Status-Bedingungen vorhanden sind
   - Problem: Wenn nur EINE Bedingung vorhanden ist, wird Filter nicht aktualisiert
   - Problem: Prüft nicht ob BEIDE Bedingungen fehlen

3. **Filter außerhalb von Gruppen:**
   - Migration findet nur Filter in "Users"/"Benutzer"/"Usuarios" Gruppen
   - Filter ohne `groupId` werden nicht gefunden
   - Filter in anderen Gruppen werden nicht gefunden

4. **Filter wurden nach Migration überschrieben:**
   - Seed-Lauf nach Migration könnte Filter zurücksetzen
   - Frontend könnte Filter neu erstellen

**Was zu prüfen ist:**
- Sind Filter tatsächlich in der DB aktualisiert? (DB direkt prüfen)
- Werden Filter aus Cache geladen? (FilterContext prüfen)
- Gibt es Filter ohne `groupId`? (Migration erweitern)
- Wurde Seed nach Migration ausgeführt?

---

## Problem 3: ToDos User-Filter falsche Struktur

### Analyse

**Seed erstellt (Zeile 2224-2231):**
```typescript
conditions = [
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'done' }
];
operators = ['OR', 'AND'];
```

**Bedeutung:**
- `(responsible = user OR qualityControl = user) AND status != done`
- Das ist korrekt!

**FilterLogic Interpretation (filterLogic.ts Zeile 196-224):**
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

**Interpretation:**
- `i=0`: `result = (responsible = user)`
- `i=1`: `operator = operators[0] = 'OR'` → `result = result OR (qualityControl = user)`
- `i=2`: `operator = operators[1] = 'AND'` → `result = result AND (status != done)`
- **Ergebnis:** `(responsible = user OR qualityControl = user) AND status != done` ✅

**FilterPane Anzeige (FilterPane.tsx Zeile 238-257):**
```typescript
{conditions.map((condition, index) => (
  <React.Fragment key={index}>
    <FilterRow ... />
    {index < conditions.length - 1 && (
      <FilterLogicalOperator
        operator={logicalOperators[index] || 'AND'}
        ...
      />
    )}
  </React.Fragment>
))}
```

**Anzeige:**
- Zeile 1: `responsible = user`
- Operator 1: `OR` (logicalOperators[0])
- Zeile 2: `qualityControl = user`
- Operator 2: `AND` (logicalOperators[1])
- Zeile 3: `status != done`

**Das ist korrekt!**

**Aber Screenshot zeigt:**
- Screenshot 1: `Responsable = Daniel Arango O Estado ≠ Hecho O Control de calidad = Daniel Arango Y Estado = Control de calidad`
- Screenshot 2: `Responsable = Daniel Arango O Control de calidad = Daniel Arango Y Estado ≠ Hecho`

**Problem:**
- Screenshot 1 zeigt eine andere Struktur (4 Bedingungen, 3 Operatoren)
- Screenshot 2 zeigt die korrekte Struktur (3 Bedingungen, 2 Operatoren)
- **Frage:** Welche Struktur ist gewünscht?

**Mögliche Ursachen:**
1. Filter wurde manuell erstellt (nicht durch Seed)
2. Filter wurde nach Migration falsch aktualisiert
3. FilterPane zeigt Filter falsch an (UI-Bug)

**Was zu prüfen ist:**
- Wie sieht der Filter in der DB aus? (Bedingungen + Operatoren)
- Wurde der Filter manuell erstellt oder durch Seed?
- Zeigt FilterPane den Filter korrekt an?

---

## Problem 4: Rollen-Filter fehlen Status-Bedingungen

### Analyse

**Seed erstellt (Zeile 2165-2169):**
```typescript
// ToDos: responsible = role
const conditions = [
  { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
];
const operators: string[] = [];
```

**Soll-Zustand:**
```typescript
// ToDos: responsible = role UND status != done
const conditions = [
  { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
  { column: 'status', operator: 'notEquals', value: 'done' }
];
const operators: string[] = ['AND'];
```

**Migration-Script:**
- Behandelt nur User-Filter (Zeile 97-162)
- Behandelt NICHT Rollen-Filter
- Rollen-Filter werden nicht aktualisiert

**Problem:**
- Rollen-Filter haben keine Status-Bedingungen
- Migration-Script aktualisiert sie nicht
- Seed erstellt sie ohne Status-Bedingungen

**Was zu prüfen ist:**
- Existieren Rollen-Filter in der DB?
- Haben sie Status-Bedingungen?
- Sollen sie Status-Bedingungen haben?

---

## Problem 5: Tours zeigt falsche Filter (Reservations-Filter)

### Analyse

**ToursTab.tsx (Zeile 30, 671):**
```typescript
const TOURS_TABLE_ID = 'worktracker-tours';
// ...
<SavedFilterTags
  tableId={TOURS_TABLE_ID}
  ...
/>
```

**Worktracker.tsx (Zeile 105, 3728):**
```typescript
const RESERVATIONS_TABLE_ID = 'worktracker-reservations';
// ...
<SavedFilterTags
  tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
  ...
/>
```

**FilterContext (Zeile 98-175):**
- Lädt Filter für `tableId`
- Cache für 60 Minuten
- Filter werden pro `tableId` geladen

**Mögliche Ursachen:**

1. **Falsche tableId:**
   - ToursTab verwendet `TOURS_TABLE_ID = 'worktracker-tours'`
   - Aber Filter werden für `worktracker-reservations` geladen?
   - Prüfen ob `tableId` korrekt übergeben wird

2. **Filter existieren nicht:**
   - Filter für `worktracker-tours` existieren nicht in DB
   - FilterContext lädt leeres Array
   - Fallback zeigt Filter von anderer Tabelle?

3. **Cache-Problem:**
   - Filter für `worktracker-reservations` sind im Cache
   - FilterContext gibt falsche Filter zurück

4. **Seed erstellt keine Tours-Filter:**
   - Seed erstellt Filter für `worktracker-reservations` (Zeile 1695-1722)
   - Seed erstellt KEINE Filter für `worktracker-tours`
   - Tours-Filter existieren nicht

**Was zu prüfen ist:**
- Existieren Filter für `worktracker-tours` in der DB?
- Welche Filter werden von FilterContext geladen? (Console-Log)
- Wird `tableId` korrekt übergeben?
- Gibt es einen Fallback, der andere Filter lädt?

---

## ZUSÄTZLICHE ERKENNTNISSE

### Problem 1: "Todos" Filter - ERWEITERTE ANALYSE

**Gefunden:**
- Im Seed wird KEIN "Todos" Filter für `requests-table` erstellt
- Migration sucht case-sensitive nach `['Alle', 'Todos', 'All', 'Alles']`
- **SavedFilterTags.tsx Zeile 69:** Übersetzt "Todos" zu "Alle" beim Anzeigen
- **Mögliche Ursachen:**
  1. Filter wurde manuell erstellt (nicht durch Seed)
  2. Filter wurde nach Migration durch Seed erneut erstellt (Seed läuft nach Migration?)
  3. Filter-Name ist anders (z.B. "todos" kleingeschrieben)
  4. Filter ist in einer anderen Gruppe oder hat `groupId = null`

**Prüfung nötig:**
- DB direkt abfragen: `SELECT * FROM "SavedFilter" WHERE "tableId" = 'requests-table' AND LOWER("name") LIKE '%todo%' OR LOWER("name") LIKE '%alle%';`

---

### Problem 2: User-Filter Requests - ERWEITERTE ANALYSE

**Gefunden:**
- **FilterContext.tsx Zeile 101-103:** Cache prüft `filtersRef.current[tableId]` - wenn vorhanden, wird sofort zurückgegeben
- **FilterContext.tsx Zeile 75:** Cache-TTL ist 60 Minuten
- **FilterContext.tsx Zeile 144-145:** `filtersRef.current[tableId] = filtersData` wird SOFORT gesetzt (vor State-Update)
- **Migration-Script Zeile 41-50:** Findet nur Filter in "Users"/"Benutzer"/"Usuarios" Gruppen
- **Migration-Script Zeile 59-61:** Prüft ob Status-Bedingungen vorhanden sind - aber prüft nur ob EINE vorhanden ist, nicht ob BEIDE fehlen

**Kritische Probleme:**
1. **Cache-Problem:** Nach Migration werden alte Filter aus Cache angezeigt (60 Min TTL)
2. **Prüfung falsch:** `hasStatusConditions` prüft ob EINE Bedingung vorhanden ist, sollte prüfen ob BEIDE fehlen
3. **Filter außerhalb Gruppen:** Migration findet nur Filter in Gruppen, Filter ohne `groupId` werden übersehen
4. **FilterContext lädt nicht neu:** Nach Migration muss Cache manuell invalidiert werden

**Prüfung nötig:**
- DB direkt prüfen: Haben User-Filter tatsächlich Status-Bedingungen?
- Frontend Console: Welche Filter werden geladen? (FilterContext)
- Browser Cache: Wurde Seite neu geladen nach Migration?

---

### Problem 3: ToDos User-Filter Struktur - ERWEITERTE ANALYSE

**Gefunden:**
- **Seed Zeile 2224-2231:** Erstellt korrekt: `[responsible, qualityControl, status]` mit `['OR', 'AND']`
- **filterLogic.ts Zeile 216-224:** Interpretiert korrekt: `(responsible OR qualityControl) AND status`
- **FilterPane.tsx Zeile 251-256:** Zeigt Operatoren korrekt zwischen Bedingungen an
- **Screenshot zeigt:** Andere Struktur (4 Bedingungen statt 3)

**Mögliche Ursachen:**
1. Filter wurde manuell erstellt (nicht durch Seed)
2. Filter wurde nach Migration falsch aktualisiert
3. FilterPane zeigt Filter falsch an (UI-Bug)
4. Filter wurde nach Migration durch Seed überschrieben

**Prüfung nötig:**
- DB direkt prüfen: Wie sehen die Bedingungen und Operatoren aus?
- FilterPane öffnen: Zeigt Filter korrekt an?
- Screenshot analysieren: Welche Struktur ist gewünscht?

---

### Problem 4: Rollen-Filter - ERWEITERTE ANALYSE

**Gefunden:**
- **Seed Zeile 2165-2169:** Erstellt nur `[responsible = role]` ohne Status-Bedingung
- **Migration-Script:** Behandelt nur User-Filter (Zeile 97-162), NICHT Rollen-Filter
- **Seed Zeile 2150:** Rollen-Filter werden nur für `worktracker-todos` erstellt, nicht für `requests-table`

**Kritische Probleme:**
1. Rollen-Filter haben keine Status-Bedingungen
2. Migration aktualisiert sie nicht
3. Seed erstellt sie ohne Status-Bedingungen

**Prüfung nötig:**
- DB direkt prüfen: Existieren Rollen-Filter? Haben sie Status-Bedingungen?
- Seed prüfen: Werden Rollen-Filter für Requests erstellt? (Laut Kommentar Zeile 2194: NEIN)

---

### Problem 5: Tours Filter - ERWEITERTE ANALYSE

**Gefunden:**
- **Seed Zeile 1824-1825:** Erstellt Filter für `worktracker-tours` (Tours-Filter existieren im Seed!)
- **Seed Zeile 1695-1722:** Erstellt Filter für `worktracker-reservations` (Reservations-Filter)
- **ToursTab.tsx Zeile 30:** Verwendet `TOURS_TABLE_ID = 'worktracker-tours'`
- **ToursTab.tsx Zeile 671:** `SavedFilterTags` verwendet `tableId={TOURS_TABLE_ID}`
- **SavedFilterTags.tsx Zeile 89:** Lädt Filter über `filterContext.getFilters(tableId)`
- **FilterContext.tsx Zeile 98-175:** Lädt Filter für `tableId` von API

**Mögliche Ursachen:**
1. Filter für `worktracker-tours` existieren nicht in DB (Seed nicht ausgeführt?)
2. FilterContext lädt Filter für falsche `tableId`
3. Filter werden geladen, aber nicht angezeigt (UI-Bug)
4. Cache zeigt alte Filter (von Reservations?)

**Prüfung nötig:**
- DB direkt prüfen: Existieren Filter für `worktracker-tours`?
- Frontend Console: Welche Filter werden geladen? (API-Response prüfen)
- SavedFilterTags: Welche Filter werden angezeigt? (Console-Log)

---

## Zusammenfassung der Probleme

### Problem 1: "Todos" Filter
- **Ursache:** Case-sensitive Suche oder Filter wurde nach Migration erneut erstellt
- **Lösung:** Case-insensitive Suche, alle Varianten prüfen, Seed prüfen ob Filter erstellt wird

### Problem 2: User-Filter Requests
- **Ursache:** FilterContext Cache (60 Min) ODER Prüfung findet Bedingungen nicht ODER Filter außerhalb Gruppen
- **Lösung:** Cache invalidieren, Prüfung verbessern (beide Bedingungen separat prüfen), alle Filter prüfen (nicht nur in Gruppen)

### Problem 3: ToDos User-Filter Struktur
- **Ursache:** Unklar - Screenshot zeigt andere Struktur als Seed, möglicherweise manuell erstellt
- **Lösung:** DB prüfen, Filter-Struktur verifizieren, Screenshot-Struktur klären

### Problem 4: Rollen-Filter
- **Ursache:** Seed erstellt keine Status-Bedingungen, Migration behandelt sie nicht
- **Lösung:** Seed erweitern (Status-Bedingung hinzufügen), Migration erweitern (Rollen-Filter behandeln)

### Problem 5: Tours Filter
- **Ursache:** Filter für `worktracker-tours` existieren möglicherweise nicht in DB ODER werden falsch geladen
- **Lösung:** DB prüfen, Seed prüfen, Filter-Laden prüfen (API-Response)

---

## Nächste Schritte

1. **DB direkt prüfen:**
   - Welche Filter existieren für `requests-table`? (Name "Todos"?)
   - Haben User-Filter Status-Bedingungen? (Requests & ToDos)
   - Wie sehen ToDos User-Filter aus? (Bedingungen + Operatoren)
   - Existieren Rollen-Filter? Haben sie Status-Bedingungen?
   - Existieren Filter für `worktracker-tours`?

2. **Frontend prüfen:**
   - FilterContext Cache prüfen (welche Filter werden geladen?)
   - FilterPane Anzeige prüfen (zeigt Filter korrekt an?)
   - ToursTab tableId prüfen (wird korrekt übergeben?)

3. **Migration-Script erweitern:**
   - Case-insensitive Suche für "Todos"
   - Alle User-Filter prüfen (nicht nur in Gruppen)
   - Rollen-Filter behandeln
   - Prüfung verbessern (beide Status-Bedingungen separat prüfen)

4. **Seed erweitern:**
   - Rollen-Filter mit Status-Bedingungen
   - Tours-Filter erstellen (falls gewünscht)

