# Screenshot-Analyse: Filter-Struktur

## WICHTIG: Screenshot-Interpretation

**Screenshot 1:** IGNORIEREN ❌
**Screenshot 2:** Zeigt AKTUELLEN Zustand (falsch) ❌
**Screenshot 3:** Zeigt SOLL-Zustand (richtig) ✅

---

## Problem 3: ToDos User-Filter - Spaltenreihenfolge

### Aktueller Zustand (Screenshot 2 - FALSCH):
```
Zeile 1: Responsable = Daniel Arango
Operator: O (OR)
Zeile 2: Control de calidad = Daniel Arango
Operator: Y (AND)
Zeile 3: Estado ≠ Hecho
```

**Seed erstellt aktuell (Zeile 2226-2231):**
```typescript
conditions = [
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },      // ZUERST
  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },   // DANN
  { column: 'status', operator: 'notEquals', value: 'done' }
];
operators = ['OR', 'AND'];
```

**Problem:**
- Reihenfolge ist falsch: `responsible` ZUERST, dann `qualityControl`
- Da im Frontend keine Klammern setzbar sind, ist die Reihenfolge wichtig für die visuelle Darstellung

### Soll-Zustand (Screenshot 3 - RICHTIG):
```
Zeile 1: Control de calidad = Daniel Arango
Operator: O (OR)
Zeile 2: Responsable = Daniel Arango
Operator: Y (AND)
Zeile 3: Estado ≠ Hecho
```

**Soll-Struktur:**
```typescript
conditions = [
  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },   // ZUERST
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },      // DANN
  { column: 'status', operator: 'notEquals', value: 'done' }
];
operators = ['OR', 'AND'];
```

**Lösung:**
- Reihenfolge in Seed umdrehen: `qualityControl` ZUERST, dann `responsible`
- Migration muss bestehende Filter korrigieren (Reihenfolge ändern)

**Logik bleibt gleich:**
- `(qualityControl = user OR responsible = user) AND status != done`
- Nur die visuelle Reihenfolge ändert sich

---

## Problem 2: Requests User-Filter - Von 4 auf 6 Bedingungen

### Aktueller Zustand (4 Bedingungen - FALSCH):
```
Zeile 1: requestedBy = user
Operator: O (OR)
Zeile 2: responsible = user
Operator: Y (AND)
Zeile 3: status != approved
Operator: Y (AND)
Zeile 4: status != denied
```

**Seed erstellt aktuell (Zeile 2217-2223):**
```typescript
conditions = [
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND'];
```

**Aktuelle Logik:**
- `(requestedBy = user OR responsible = user) AND status != approved AND status != denied`
- Das sind 4 Bedingungen

### Soll-Zustand (6 Bedingungen - RICHTIG):

**Basierend auf Screenshot 2 & 3 (Screenshot 1 ignorieren):**

**Wahrscheinlichste Struktur (basierend auf Logik):**
```typescript
conditions = [
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['AND', 'AND', 'OR', 'AND', 'AND'];
```

**Bedeutung:**
- `(requestedBy = user AND status != approved AND status != denied) OR (responsible = user AND status != approved AND status != denied)`
- Das sind 6 Bedingungen

**ODER (mit Reihenfolge wie bei ToDos):**
```typescript
conditions = [
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },      // ZUERST (wie bei ToDos)
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' },
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },     // DANN
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['AND', 'AND', 'OR', 'AND', 'AND'];
```

**Bedeutung:**
- `(responsible = user AND status != approved AND status != denied) OR (requestedBy = user AND status != approved AND status != denied)`
- Das sind 6 Bedingungen

**WICHTIG: Screenshots 2 & 3 müssen genau analysiert werden, um die korrekte Reihenfolge zu verstehen!**

---

## FilterLogic Interpretation (ohne Klammern)

**filterLogic.ts Zeile 216-224:**
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

**Beispiel: 6 Bedingungen mit Operatoren ['AND', 'AND', 'OR', 'AND', 'AND']:**
- `i=0`: `result = (requestedBy = user)`
- `i=1`: `operator = AND` → `result = (requestedBy = user) AND (status != approved)`
- `i=2`: `operator = AND` → `result = (requestedBy = user) AND (status != approved) AND (status != denied)`
- `i=3`: `operator = OR` → `result = ((requestedBy = user) AND (status != approved) AND (status != denied)) OR (responsible = user)`
- `i=4`: `operator = AND` → `result = (((requestedBy = user) AND (status != approved) AND (status != denied)) OR (responsible = user)) AND (status != approved)`
- `i=5`: `operator = AND` → `result = ((((requestedBy = user) AND (status != approved) AND (status != denied)) OR (responsible = user)) AND (status != approved)) AND (status != denied)`

**Das ist FALSCH!** Die Logik wird nicht korrekt interpretiert.

**Korrekte Interpretation sollte sein:**
- `(requestedBy = user AND status != approved AND status != denied) OR (responsible = user AND status != approved AND status != denied)`

**Problem:** Ohne Klammern kann die Logik nicht korrekt dargestellt werden!

**Mögliche Lösung:** Die Struktur muss so sein, dass die sequenzielle Auswertung das gewünschte Ergebnis liefert.

**Alternative Struktur (mit OR am Anfang):**
```typescript
conditions = [
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND', 'AND', 'AND'];
```

**Das macht keinen Sinn (doppelte Status-Bedingungen).**

**WICHTIG: Die genaue Struktur muss aus den Screenshots abgeleitet werden!**

---

## PRÜFUNG NÖTIG

### 1. Screenshots genau analysieren

**Screenshot 2 (Requests - aktuell):**
- Wie viele Bedingungen? (sollte 4 sein)
- Welche Spalten in welcher Reihenfolge?
- Welche Operatoren?

**Screenshot 3 (Requests - soll):**
- Wie viele Bedingungen? (sollte 6 sein)
- Welche Spalten in welcher Reihenfolge?
- Welche Operatoren?
- Wie ist die Logik strukturiert?

**Screenshot 2 (ToDos - aktuell):**
- Zeile 1: Responsable = ...
- Zeile 2: Control de calidad = ...
- Zeile 3: Estado ≠ Hecho

**Screenshot 3 (ToDos - soll):**
- Zeile 1: Control de calidad = ...
- Zeile 2: Responsable = ...
- Zeile 3: Estado ≠ Hecho

### 2. DB direkt prüfen

**ToDos User-Filter:**
```sql
SELECT id, name, conditions, operators
FROM "SavedFilter" 
WHERE "tableId" = 'worktracker-todos'
AND "groupId" IN (SELECT id FROM "FilterGroup" WHERE "tableId" = 'worktracker-todos' AND "name" IN ('Users', 'Benutzer', 'Usuarios'))
LIMIT 1;
```

**Requests User-Filter:**
```sql
SELECT id, name, conditions, operators
FROM "SavedFilter" 
WHERE "tableId" = 'requests-table'
AND "groupId" IN (SELECT id FROM "FilterGroup" WHERE "tableId" = 'requests-table' AND "name" IN ('Users', 'Benutzer', 'Usuarios'))
LIMIT 1;
```

### 3. FilterLogic prüfen

**Wie werden Operatoren ohne Klammern interpretiert?**
- Sequenzielle Auswertung von links nach rechts
- Reihenfolge ist kritisch!
- Muss die Struktur so sein, dass die sequenzielle Auswertung das gewünschte Ergebnis liefert?

### 4. Seed-Struktur prüfen

**Aktuelle Struktur:**
- Requests: 4 Bedingungen → `(requestedBy OR responsible) AND status != approved AND status != denied`
- ToDos: 3 Bedingungen → `(responsible OR qualityControl) AND status != done`

**Soll-Struktur:**
- Requests: 6 Bedingungen → `(requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)`
- ToDos: 3 Bedingungen → `(qualityControl OR responsible) AND status != done` (Reihenfolge geändert)

---

## OFFENE FRAGEN

1. **Requests 6 Bedingungen:**
   - Wie genau sehen die 6 Bedingungen aus? (Reihenfolge?)
   - Welche Operatoren? (['AND', 'AND', 'OR', 'AND', 'AND']?)
   - Wie wird die Logik ohne Klammern interpretiert?

2. **ToDos Reihenfolge:**
   - Bestätigt: qualityControl ZUERST, dann responsible?
   - Oder umgekehrt?

3. **FilterLogic:**
   - Wie werden Operatoren ohne Klammern interpretiert?
   - Ist die Reihenfolge kritisch für die Logik oder nur für die Anzeige?
   - Kann die gewünschte Logik mit sequenzieller Auswertung erreicht werden?

