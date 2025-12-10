# Filter-Optimierung: Spaltenweise Kombination - Implementierungsplan

**Datum:** 2025-02-01  
**Problem:** Filter-Optimierung funktioniert nicht bei gemischten Operatoren zwischen verschiedenen Spalten  
**Ziel:** Spaltenweise Optimierung, die unabhängig von Operatoren zwischen verschiedenen Spalten funktioniert

## Problem-Analyse

### Aktuelles Problem
- **Globaler Ansatz:** Prüft, ob ALLE Operatoren AND/OR sind
- **Fehler:** Bei gemischten Operatoren (z.B. OR zwischen Spalte A und B, AND zwischen Spalte B und C) wird Optimierung komplett übersprungen
- **Beispiel:** 
  - `De = "Alexis"` OR `Para = "Alexis"` AND `Estado ≠ "Denegado"` AND `Estado ≠ "Aprobado"`
  - Die beiden `Estado ≠` Bedingungen sollten zu `notIn` kombiniert werden, werden aber nicht optimiert

### Root Cause
Die Optimierung prüft global statt spaltenweise. Sie sollte für jede Spalte separat prüfen, ob die Bedingungen dieser Spalte mit AND/OR verknüpft sind.

## Lösung: Spaltenweise Optimierung

### Konzept
**Prinzip:** Für jede Spalte separat prüfen, welche Operatoren zwischen den Bedingungen dieser Spalte stehen.

**Vorgehen:**
1. Bedingungen nach Spalte gruppieren
2. Für jede Spalte prüfen, ob die Bedingungen dieser Spalte mit AND/OR verknüpft sind
3. Nur Bedingungen derselben Spalte kombinieren
4. Reihenfolge und Verknüpfungen zwischen verschiedenen Spalten beibehalten

### Beispiel
```
Bedingungen:
1. De = "Alexis" 
2. Para = "Alexis" (Operator: OR)
3. Estado ≠ "Denegado" (Operator: AND)
4. Estado ≠ "Aprobado" (Operator: AND)

Erwartetes Ergebnis:
1. De = "Alexis"
2. Para = "Alexis" (Operator: OR)
3. Estado: { notIn: ["Denegado", "Aprobado"] } (Operator: AND - bleibt erhalten)
```

## Implementierungsplan

### Phase 1: Datenstruktur für spaltenweise Analyse

**Neue Datenstruktur:**
```typescript
interface ColumnGroup {
  conditions: FilterCondition[];
  operatorIndices: number[]; // Indizes der Operatoren zwischen diesen Bedingungen
  firstIndex: number; // Erste Position dieser Spalte im Original-Array
}
```

**Schritt 1.1:** Bedingungen nach Spalte gruppieren
- Map: `column -> ColumnGroup`
- Für jede Bedingung: Spalte identifizieren, zu entsprechender Gruppe hinzufügen
- Operator-Indizes speichern (welche Operatoren stehen zwischen den Bedingungen dieser Spalte)

### Phase 2: Spaltenweise Operator-Analyse

**Schritt 2.1:** Für jede Spalte prüfen, ob alle Operatoren zwischen den Bedingungen dieser Spalte gleich sind
- Wenn alle AND: `notEquals` zu `notIn` kombinieren
- Wenn alle OR: `equals` zu `in` kombinieren
- Wenn gemischt: Einzeln belassen

**Schritt 2.2:** Operator-Indizes extrahieren
- Für Spalte "Estado" mit Bedingungen an Index 2 und 3:
  - Operator zwischen Index 1 und 2: `operators[1]` (AND)
  - Operator zwischen Index 2 und 3: `operators[2]` (AND)
  - → Alle Operatoren zwischen "Estado"-Bedingungen sind AND

### Phase 3: Optimierte Bedingungen erstellen

**Schritt 3.1:** Reihenfolge beibehalten
- Iteriere über Original-Bedingungen in Reihenfolge
- Wenn Spalte bereits optimiert wurde, überspringe
- Wenn Spalte optimiert werden kann, ersetze alle Bedingungen dieser Spalte durch optimierte Version

**Schritt 3.2:** Operatoren anpassen
- Wenn mehrere Bedingungen zu einer kombiniert werden, müssen die Operatoren angepasst werden
- Beispiel: 2 `Estado ≠` Bedingungen werden zu 1 `Estado: notIn` → 1 Operator weniger nötig

### Phase 4: Operatoren-Array anpassen

**Schritt 4.1:** Operatoren-Array neu erstellen
- Wenn Bedingungen kombiniert werden, müssen die Operatoren zwischen ihnen entfernt werden
- Beispiel: 
  - Original: `[OR, AND, AND]` (4 Bedingungen)
  - Nach Optimierung: `[OR, AND]` (3 Bedingungen: De, Para, Estado:notIn)

**Schritt 4.2:** Operatoren zwischen verschiedenen Spalten beibehalten
- Operatoren zwischen verschiedenen Spalten bleiben unverändert
- Nur Operatoren zwischen Bedingungen derselben Spalte werden entfernt

## Algorithmus (Pseudocode)

```
function optimizeFilterConditions(conditions, operators):
  if conditions.length <= 1:
    return conditions, operators
  
  // 1. Gruppiere nach Spalte
  columnGroups = Map<column, ColumnGroup>()
  
  for i in range(conditions.length):
    cond = conditions[i]
    if not columnGroups.has(cond.column):
      columnGroups[cond.column] = {
        conditions: [],
        operatorIndices: [],
        firstIndex: i
      }
    columnGroups[cond.column].conditions.push(cond)
    
    // Speichere Operator-Indizes zwischen Bedingungen dieser Spalte
    if i > 0 and conditions[i-1].column === cond.column:
      columnGroups[cond.column].operatorIndices.push(i-1)
  
  // 2. Optimiere jede Spalte separat
  optimized = []
  optimizedOperators = []
  processedColumns = Set()
  
  for i in range(conditions.length):
    cond = conditions[i]
    
    if processedColumns.has(cond.column):
      continue
    
    group = columnGroups[cond.column]
    
    // Prüfe, ob alle Operatoren zwischen Bedingungen dieser Spalte gleich sind
    if group.conditions.length > 1:
      operatorsForColumn = group.operatorIndices.map(idx => operators[idx])
      allAnd = operatorsForColumn.every(op => op === 'AND')
      allOr = operatorsForColumn.every(op => op === 'OR')
      
      if allAnd and group.notEquals.length > 1:
        // Kombiniere notEquals zu notIn
        optimized.push({
          column: cond.column,
          operator: 'notIn',
          value: group.notEquals.map(c => c.value)
        })
        // Entferne Operatoren zwischen diesen Bedingungen
        // (werden nicht zu optimizedOperators hinzugefügt)
        
      else if allOr and group.equals.length > 1:
        // Kombiniere equals zu in
        optimized.push({
          column: cond.column,
          operator: 'in',
          value: group.equals.map(c => c.value)
        })
        
      else:
        // Keine Optimierung möglich, behalte alle Bedingungen
        optimized.push(...group.conditions)
        // Operatoren beibehalten (aber nur die zwischen verschiedenen Spalten)
    
    else:
      // Nur eine Bedingung für diese Spalte
      optimized.push(cond)
    
    processedColumns.add(cond.column)
  
  // 3. Operatoren-Array neu erstellen (nur Operatoren zwischen verschiedenen Spalten)
  // ... (komplex, muss die Reihenfolge berücksichtigen)
  
  return optimized, optimizedOperators
```

## Vereinfachter Ansatz (Empfohlen)

### Einfacherer Algorithmus

**Idee:** Statt komplexe Operatoren-Anpassung, verwende einen einfacheren Ansatz:

1. **Gruppiere nach Spalte** (wie bisher)
2. **Für jede Spalte prüfen:** Sind die Bedingungen dieser Spalte direkt aufeinanderfolgend?
3. **Wenn ja:** Prüfe den Operator zwischen ihnen
4. **Wenn alle AND/OR:** Kombiniere

**Vorteil:** Einfacher, weniger Fehleranfällig, performanter

**Nachteil:** Funktioniert nur, wenn Bedingungen derselben Spalte direkt aufeinanderfolgen

**Aber:** Das ist der häufigste Fall! Und wenn sie nicht aufeinanderfolgen, macht die Kombination auch weniger Sinn.

## Empfohlene Implementierung

### Schritt 1: Vereinfachte Gruppierung
```typescript
// Finde aufeinanderfolgende Bedingungen derselben Spalte
for (let i = 0; i < conditions.length; i++) {
  const current = conditions[i];
  const consecutive: FilterCondition[] = [current];
  const operatorIndices: number[] = [];
  
  // Sammle aufeinanderfolgende Bedingungen derselben Spalte
  for (let j = i + 1; j < conditions.length; j++) {
    if (conditions[j].column === current.column) {
      consecutive.push(conditions[j]);
      operatorIndices.push(j - 1); // Operator zwischen j-1 und j
    } else {
      break; // Nicht mehr aufeinanderfolgend
    }
  }
  
  // Wenn mehrere aufeinanderfolgende Bedingungen gefunden
  if (consecutive.length > 1) {
    // Prüfe Operatoren zwischen ihnen
    const operatorsBetween = operatorIndices.map(idx => operators[idx]);
    const allAnd = operatorsBetween.every(op => op === 'AND');
    const allOr = operatorsBetween.every(op => op === 'OR');
    
    // Optimiere wenn möglich
    if (allAnd && consecutive.every(c => c.operator === 'notEquals')) {
      // Kombiniere zu notIn
    } else if (allOr && consecutive.every(c => c.operator === 'equals')) {
      // Kombiniere zu in
    }
  }
}
```

### Schritt 2: Operatoren-Array anpassen
- Wenn N Bedingungen zu 1 kombiniert werden, entferne N-1 Operatoren
- Operatoren zwischen verschiedenen Spalten bleiben erhalten

## Performance-Überlegungen

- **Komplexität:** O(n) - Ein Durchlauf über alle Bedingungen
- **Speicher:** O(n) - Map für Gruppierung
- **Vorteil:** Einfacher als komplexe Analyse aller Operatoren

## Test-Szenarien

1. **Einfach:** `Estado ≠ "A"` AND `Estado ≠ "B"` → `Estado: { notIn: ["A", "B"] }`
2. **Gemischte Spalten:** `De = "A"` OR `Para = "A"` AND `Estado ≠ "X"` AND `Estado ≠ "Y"` → `Estado: { notIn: ["X", "Y"] }`
3. **Nicht aufeinanderfolgend:** `De = "A"` AND `Estado ≠ "X"` AND `Para = "B"` AND `Estado ≠ "Y"` → Keine Optimierung (nicht aufeinanderfolgend)
4. **Gemischte Operatoren:** `Estado ≠ "X"` AND `Estado ≠ "Y"` OR `Estado ≠ "Z"` → Keine Optimierung (gemischte Operatoren)

## Implementierungsreihenfolge

1. ✅ Vereinfachte Gruppierung implementieren
2. ✅ Spaltenweise Operator-Prüfung
3. ✅ Kombination zu notIn/in
4. ✅ Operatoren-Array anpassen
5. ✅ Tests mit verschiedenen Szenarien
6. ✅ Edge Cases behandeln

## Code-Struktur

```typescript
function optimizeFilterConditions(
  conditions: FilterCondition[],
  operators: ('AND' | 'OR')[]
): { conditions: FilterCondition[], operators: ('AND' | 'OR')[] } {
  // 1. Finde aufeinanderfolgende Bedingungen derselben Spalte
  // 2. Prüfe Operatoren zwischen ihnen
  // 3. Kombiniere wenn möglich
  // 4. Passe Operatoren-Array an
  // 5. Gib optimierte Arrays zurück
}
```

## Vorteile dieser Lösung

1. ✅ **Einfach:** Klarer Algorithmus, leicht verständlich
2. ✅ **Performant:** O(n) Komplexität, ein Durchlauf
3. ✅ **Robust:** Funktioniert auch bei gemischten Operatoren zwischen verschiedenen Spalten
4. ✅ **Wartbar:** Klare Struktur, gut dokumentiert
5. ✅ **Standard-konform:** Folgt SQL/Prisma Best Practices (notIn/in statt mehrere not/equals)

