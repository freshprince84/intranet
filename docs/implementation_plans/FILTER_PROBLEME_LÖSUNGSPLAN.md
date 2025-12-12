# Filter-Probleme: Konkreter Lösungsplan

## Screenshot-Analyse

**Screenshot 2 (aktuell - FALSCH):**
- ToDos: Responsable ZUERST, dann Control de calidad
- Requests: 4 Bedingungen

**Screenshot 3 (soll - RICHTIG):**
- ToDos: Control de calidad ZUERST, dann Responsable
- Requests: 6 Bedingungen

---

## FIX 1: "Todos" Filter löschen (Requests)

**Datei:** `backend/prisma/migrate-filters.ts` Zeile 18-26

**Problem:** Case-sensitive Suche

**Lösung:**
```typescript
// Case-insensitive Suche mit Prisma Raw Query
const deletedFilters = await prisma.$executeRaw`
  DELETE FROM "SavedFilter"
  WHERE "tableId" = 'requests-table'
  AND LOWER("name") IN ('alle', 'todos', 'all', 'alles')
`;
```

---

## FIX 2: User-Filter Requests - Von 4 auf 6 Bedingungen

**Datei 1:** `backend/prisma/seed.ts` Zeile 2215-2223

**Aktuell:**
```typescript
conditions = [
  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'approved' },
  { column: 'status', operator: 'notEquals', value: 'denied' }
];
operators = ['OR', 'AND', 'AND'];
```

**Soll:**
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

**Datei 2:** `backend/prisma/migrate-filters.ts` Zeile 52-95

**Problem:** Fügt Status-Bedingungen nur hinten an, behält 4 Bedingungen

**Lösung:** Komplette Umstrukturierung auf 6 Bedingungen:
```typescript
// Prüfe ob bereits 6 Bedingungen vorhanden sind
const hasCorrectStructure = conditions.length === 6 
  && conditions[0]?.column === 'requestedBy'
  && conditions[3]?.column === 'responsible'
  && conditions.filter(c => c.column === 'status' && c.operator === 'notEquals').length === 4;

if (!hasCorrectStructure) {
  // Erstelle neue Struktur: (requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)
  const newConditions = [
    { column: 'requestedBy', operator: 'equals', value: conditions.find(c => c.column === 'requestedBy')?.value || conditions[0]?.value },
    { column: 'status', operator: 'notEquals', value: 'approved' },
    { column: 'status', operator: 'notEquals', value: 'denied' },
    { column: 'responsible', operator: 'equals', value: conditions.find(c => c.column === 'responsible')?.value || conditions[1]?.value },
    { column: 'status', operator: 'notEquals', value: 'approved' },
    { column: 'status', operator: 'notEquals', value: 'denied' }
  ];
  const newOperators = ['AND', 'AND', 'OR', 'AND', 'AND'];
  
  await prisma.savedFilter.update({
    where: { id: filter.id },
    data: {
      conditions: JSON.stringify(newConditions),
      operators: JSON.stringify(newOperators)
    }
  });
}
```

**Zusätzlich:** Finde ALLE User-Filter, nicht nur in Gruppen:
```typescript
// Finde ALLE User-Filter (auch ohne Gruppe)
const allRequestsUserFilters = await prisma.savedFilter.findMany({
  where: {
    tableId: 'requests-table',
    OR: [
      { groupId: { in: usersGroups.map(g => g.id) } },
      { 
        groupId: null,
        name: { not: { in: ['Archiv', 'Aktuell'] } } // Exkludiere Standard-Filter
      }
    ]
  }
});
```

---

## FIX 3: ToDos User-Filter - Reihenfolge umdrehen

**Datei 1:** `backend/prisma/seed.ts` Zeile 2224-2231

**Aktuell:**
```typescript
conditions = [
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'done' }
];
```

**Soll:**
```typescript
conditions = [
  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
  { column: 'status', operator: 'notEquals', value: 'done' }
];
```

**Datei 2:** `backend/prisma/migrate-filters.ts` Zeile 121-161

**Lösung:** Reihenfolge korrigieren:
```typescript
// Prüfe ob Reihenfolge falsch ist (responsible ZUERST)
const isWrongOrder = conditions.length >= 2 
  && conditions[0]?.column === 'responsible'
  && conditions[1]?.column === 'qualityControl';

if (isWrongOrder) {
  // Drehe Reihenfolge um
  const newConditions = [
    conditions[1], // qualityControl ZUERST
    conditions[0], // responsible DANN
    ...conditions.slice(2) // Rest bleibt gleich
  ];
  
  await prisma.savedFilter.update({
    where: { id: filter.id },
    data: {
      conditions: JSON.stringify(newConditions),
      operators: JSON.stringify(operators) // Operatoren bleiben gleich
    }
  });
}
```

---

## FIX 4: Rollen-Filter - Status-Bedingung hinzufügen

**Datei 1:** `backend/prisma/seed.ts` Zeile 2165-2169

**Aktuell:**
```typescript
const conditions = [
  { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
];
const operators: string[] = [];
```

**Soll:**
```typescript
const conditions = [
  { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
  { column: 'status', operator: 'notEquals', value: 'done' }
];
const operators: string[] = ['AND'];
```

**Datei 2:** `backend/prisma/migrate-filters.ts`

**Lösung:** Neuer Abschnitt nach Zeile 162:
```typescript
// 4. Erweitere Rollen-Filter für worktracker-todos
console.log('📋 Schritt 4: Erweitere Rollen-Filter für worktracker-todos...');

const rolesGroups = await prisma.filterGroup.findMany({
  where: {
    tableId: 'worktracker-todos',
    name: {
      in: ['Roles', 'Rollen']
    }
  }
});

const rolesFilters = rolesGroups.length > 0
  ? await prisma.savedFilter.findMany({
      where: {
        tableId: 'worktracker-todos',
        groupId: { in: rolesGroups.map(g => g.id) }
      }
    })
  : [];

let rolesUpdated = 0;
for (const filter of rolesFilters) {
  try {
    const conditions = JSON.parse(filter.conditions as string);
    const operators = JSON.parse(filter.operators as string);
    
    const hasStatusCondition = conditions.some((c: any) => 
      c.column === 'status' && c.operator === 'notEquals' && c.value === 'done'
    );
    
    if (!hasStatusCondition) {
      const newConditions = [
        ...conditions,
        { column: 'status', operator: 'notEquals', value: 'done' }
      ];
      const newOperators = [...operators, 'AND'];
      
      await prisma.savedFilter.update({
        where: { id: filter.id },
        data: {
          conditions: JSON.stringify(newConditions),
          operators: JSON.stringify(newOperators)
        }
      });
      
      rolesUpdated++;
      console.log(`   ✅ Rollen-Filter "${filter.name}" aktualisiert`);
    }
  } catch (error) {
    console.error(`   ❌ Fehler beim Aktualisieren von Rollen-Filter "${filter.name}":`, error);
  }
}
console.log(`   ✅ ${rolesUpdated} Rollen-Filter aktualisiert\n`);
```

---

## FIX 5: Migration-Script - Prüfung verbessern

**Datei:** `backend/prisma/migrate-filters.ts` Zeile 58-61

**Problem:** Prüft nur ob EINE Status-Bedingung vorhanden ist

**Lösung:**
```typescript
// Prüfe ob BEIDE Status-Bedingungen fehlen
const hasApprovedCondition = conditions.some((c: any) => 
  c.column === 'status' && c.operator === 'notEquals' && c.value === 'approved'
);
const hasDeniedCondition = conditions.some((c: any) => 
  c.column === 'status' && c.operator === 'notEquals' && c.value === 'denied'
);

if (!hasApprovedCondition || !hasDeniedCondition) {
  // Erweitere Bedingungen
  const newConditions = [...conditions];
  const newOperators = [...operators];
  
  if (!hasApprovedCondition) {
    newConditions.push({ column: 'status', operator: 'notEquals', value: 'approved' });
    newOperators.push('AND');
  }
  if (!hasDeniedCondition) {
    newConditions.push({ column: 'status', operator: 'notEquals', value: 'denied' });
    newOperators.push('AND');
  }
  
  await prisma.savedFilter.update({
    where: { id: filter.id },
    data: {
      conditions: JSON.stringify(newConditions),
      operators: JSON.stringify(newOperators)
    }
  });
}
```

---

## Zusammenfassung der Änderungen

### Backend - Seed (`backend/prisma/seed.ts`)

1. **Zeile 2215-2223 (Requests User-Filter):**
   - Von 4 auf 6 Bedingungen erweitern
   - Operatoren: `['AND', 'AND', 'OR', 'AND', 'AND']`

2. **Zeile 2224-2231 (ToDos User-Filter):**
   - Reihenfolge umdrehen: `qualityControl` ZUERST, dann `responsible`

3. **Zeile 2165-2169 (Rollen-Filter):**
   - Status-Bedingung hinzufügen: `status != done`
   - Operator hinzufügen: `['AND']`

### Backend - Migration (`backend/prisma/migrate-filters.ts`)

1. **Zeile 18-26 ("Todos" Filter löschen):**
   - Case-insensitive Suche implementieren

2. **Zeile 41-50 (User-Filter Requests finden):**
   - ALLE User-Filter finden (auch ohne Gruppe)

3. **Zeile 52-95 (User-Filter Requests erweitern):**
   - Prüfung verbessern (beide Status-Bedingungen separat prüfen)
   - Komplette Umstrukturierung auf 6 Bedingungen

4. **Zeile 121-161 (User-Filter ToDos erweitern):**
   - Reihenfolge korrigieren (qualityControl ZUERST)

5. **Nach Zeile 162 (Rollen-Filter erweitern):**
   - Neuer Abschnitt für Rollen-Filter

---

## Implementierungsreihenfolge

1. **Migration-Script erweitern** (alle Fixes)
2. **Seed anpassen** (für zukünftige Seeds)
3. **Migration ausführen** (bestehende Daten korrigieren)

---

## Test-Checkliste

- [ ] "Todos" Filter gelöscht (Requests)
- [ ] User-Filter Requests haben 6 Bedingungen
- [ ] User-Filter ToDos: qualityControl ZUERST, dann responsible
- [ ] Rollen-Filter haben Status-Bedingung
- [ ] Filter funktionieren korrekt (Backend-Logik prüfen)

