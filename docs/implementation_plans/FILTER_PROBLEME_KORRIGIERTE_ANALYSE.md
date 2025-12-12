# KORRIGIERTE Analyse: Filter-Probleme

## WICHTIG: Screenshot-Interpretation

**Screenshot 1:** IGNORIEREN
**Screenshot 2:** Zeigt AKTUELLEN Zustand (falsch)
**Screenshot 3:** Zeigt SOLL-Zustand (richtig)

---

## Problem 3: ToDos User-Filter - Falsche Spaltenreihenfolge

### Aktueller Zustand (Screenshot 2 - FALSCH):
```
Zeile 1: Responsable = Daniel Arango
Operator: O (OR)
Zeile 2: Control de calidad = Daniel Arango
Operator: Y (AND)
Zeile 3: Estado ≠ Hecho
```

**Seed erstellt aktuell (Zeile 2224-2231):**
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

---

## Problem 2: Requests User-Filter - Falsche Struktur

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

**Seed erstellt aktuell (Zeile 2215-2223):**
```typescript
conditions = [
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND'];
```

**Problem:**
- Nur 4 Bedingungen
- Sollte 6 Bedingungen sein (siehe Screenshot 2 & 3)

### Soll-Zustand (6 Bedingungen - RICHTIG):

**Basierend auf Screenshot 2 & 3 (Screenshot 1 ignorieren):**

**Mögliche Struktur 1 (basierend auf ToDos-Pattern):**
```typescript
conditions = [
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },      // ZUERST
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },     // DANN
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND'];
```
- Aber das sind nur 4 Bedingungen, nicht 6!

**Mögliche Struktur 2 (6 Bedingungen):**
```typescript
conditions = [
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND', 'OR', 'AND', 'AND'];
```
- Das würde bedeuten: `(requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)`
- Das macht Sinn!

**Mögliche Struktur 3 (6 Bedingungen, andere Logik):**
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
- Das würde bedeuten: `(requestedBy OR responsible) AND status != approved AND status != denied AND status != approved AND status != denied`
- Das macht keinen Sinn (doppelte Bedingungen)

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
- Bedeutung: `(requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)`
- Das ist die korrekte Logik!

**ODER (basierend auf ToDos-Pattern mit Reihenfolge):**
```typescript
conditions = [
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },     // ZUERST (wie bei ToDos)
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },      // DANN
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND', 'AND', 'AND'];
```
- Das macht keinen Sinn (doppelte Status-Bedingungen)

**WICHTIG: Screenshots 2 & 3 müssen genau analysiert werden, um die korrekte Struktur zu verstehen!**

---

## Problem 1: "Todos" Filter nicht gelöscht

**Bleibt unverändert** - siehe vorherige Analyse

---

## Problem 4: Rollen-Filter fehlen Status-Bedingungen

**Bleibt unverändert** - siehe vorherige Analyse

---

## Problem 5: Tours Filter

**Bleibt unverändert** - siehe vorherige Analyse

---

## NÄCHSTE SCHRITTE (NUR PRÜFUNG)

### 1. Screenshots genau analysieren

**Screenshot 2 (Requests - aktuell):**
- Wie viele Bedingungen?
- Welche Spalten?
- Welche Operatoren?
- Welche Reihenfolge?

**Screenshot 3 (Requests - soll):**
- Wie viele Bedingungen?
- Welche Spalten?
- Welche Operatoren?
- Welche Reihenfolge?

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

**Wie werden Operatoren interpretiert?**
- `filterLogic.ts` Zeile 216-224: Sequenzielle Auswertung
- Keine Klammern möglich
- Reihenfolge ist wichtig!

### 4. Seed-Struktur prüfen

**Aktuelle Struktur:**
- Requests: 4 Bedingungen
- ToDos: 3 Bedingungen

**Soll-Struktur:**
- Requests: 6 Bedingungen (muss aus Screenshots abgeleitet werden)
- ToDos: 3 Bedingungen (Reihenfolge ändern)

---

## OFFENE FRAGEN

1. **Requests 6 Bedingungen:**
   - Wie genau sehen die 6 Bedingungen aus?
   - Welche Reihenfolge?
   - Welche Operatoren?

2. **ToDos Reihenfolge:**
   - Bestätigt: qualityControl ZUERST, dann responsible?
   - Oder umgekehrt?

3. **FilterLogic:**
   - Wie werden Operatoren ohne Klammern interpretiert?
   - Ist die Reihenfolge kritisch für die Logik oder nur für die Anzeige?

