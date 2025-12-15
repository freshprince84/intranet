# Filter ODER-Operator Fix

**Datum:** 2025-12-11
**Status:** ✅ Implementiert
**Priorität:** 🔴 KRITISCH

---

## Problem

Der ODER-Operator im Filtersystem funktionierte nicht korrekt. Bei gemischten AND/OR-Filtern wurde das OR ignoriert.

### Beispiel des Problems

**Filter:** `De = Alexis OR Para = Alexis AND Estado ≠ Denegado AND Estado ≠ Aprobado`

**Erwartet:** `(De = Alexis) OR (Para = Alexis AND Estado ≠ Denegado AND Estado ≠ Aprobado)`

**Tatsächlich (Bug):** `De = Alexis AND Para = Alexis AND Estado ≠ Denegado AND Estado ≠ Aprobado`

---

## Ursache

Die Logik in `backend/src/utils/filterToPrisma.ts` war fehlerhaft implementiert:
- Sequentielle Auswertung von links nach rechts führte zu falscher Gruppierung
- OR-Operatoren wurden effektiv zu AND

---

## Lösung

**Datei:** `backend/src/utils/filterToPrisma.ts`

**Prinzip:** AND hat höhere Präzedenz als OR (wie in Mathematik/Logik)

```typescript
// ✅ KORREKT: AND hat höhere Präzedenz als OR (wie in Mathematik/Logik)
// Beispiel: A OR B AND C AND D = A OR (B AND C AND D)
// 
// Algorithmus:
// 1. Gruppiere aufeinanderfolgende ANDs
// 2. Verbinde die Gruppen mit OR

if (prismaConditions.length === 1) {
  return prismaConditions[0];
}

// Schritt 1: Teile bei OR in Gruppen auf
const groups: any[][] = [[prismaConditions[0]]];

for (let i = 1; i < prismaConditions.length; i++) {
  const operator = operators[i - 1] || 'AND';
  
  if (operator === 'OR') {
    // OR: Neue Gruppe starten
    groups.push([prismaConditions[i]]);
  } else {
    // AND: Zur aktuellen Gruppe hinzufügen
    groups[groups.length - 1].push(prismaConditions[i]);
  }
}

// Schritt 2: Jede Gruppe zu AND-Klausel konvertieren
const groupClauses = groups.map(group => {
  if (group.length === 1) {
    return group[0];
  }
  return { AND: group };
});

// Schritt 3: Alle Gruppen mit OR verbinden
if (groupClauses.length === 1) {
  return groupClauses[0];
}
return { OR: groupClauses };
```

---

## Beispiele

| Filter | Ergebnis |
|--------|----------|
| `A AND B` | `{ AND: [A, B] }` |
| `A OR B` | `{ OR: [A, B] }` |
| `A OR B AND C` | `{ OR: [A, { AND: [B, C] }] }` |
| `A AND B OR C AND D` | `{ OR: [{ AND: [A, B] }, { AND: [C, D] }] }` |

---

## Commits

- `f149010` - Fix: AND hat höhere Präzedenz als OR (A OR B AND C = A OR (B AND C))

---

## Verwandte Dokumentation

- `docs/modules/MODUL_FILTERSYSTEM.md` - Filtersystem-Übersicht
- `docs/modules/MODUL_FILTERSYSTEM_STANDARDS.md` - Filter-Standards
- `backend/src/utils/filterToPrisma.ts` - Backend Filter-Konvertierung
- `frontend/src/utils/filterLogic.ts` - Frontend Filter-Logik






