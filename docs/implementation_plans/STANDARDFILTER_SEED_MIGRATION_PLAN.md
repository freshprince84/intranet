# Plan: Standardfilter Seed-Migration

**Datum:** 2025-01-29  
**Status:** 📋 Plan erstellt  
**Zweck:** Alle Standardfilter ins Seed verschieben, Frontend-Code entfernen, Unlöschbarkeit sicherstellen

---

## 🎯 Ziel

1. **Alle Standardfilter im Seed erstellen** (nicht mehr im Frontend)
2. **Frontend-Code entfernen** (createStandardFilters useEffect)
3. **Unlöschbarkeit sicherstellen** (isStandardFilter erweitern)
4. **Performance verbessern** (keine unnötige Komplexität im Frontend)

---

## ✅ Was bereits erledigt ist

### Seed (backend/prisma/seed.ts):
- ✅ `worktracker-todos`: "Aktuell", "Archiv"
- ✅ `requests-table`: "Aktuell", "Archiv"
- ✅ `worktracker-reservations`: "Hoy"

### Frontend (Code entfernt):
- ✅ `Requests.tsx`: createStandardFilters entfernt
- ✅ `Worktracker.tsx`: createStandardFilters entfernt

---

## ❌ Was noch zu tun ist

### 1. Seed erweitern (backend/prisma/seed.ts)

**Hinzuzufügen in `createStandardFilters` Funktion:**

#### `workcenter-table`:
```typescript
// "Aktive" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'workcenter-table',
      name: 'Aktive'
    }
  },
  update: {
    conditions: JSON.stringify([
      { column: 'hasActiveWorktime', operator: 'equals', value: 'true' }
    ]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'workcenter-table',
    name: 'Aktive',
    conditions: JSON.stringify([
      { column: 'hasActiveWorktime', operator: 'equals', value: 'true' }
    ]),
    operators: JSON.stringify([])
  }
});

// "Alle" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'workcenter-table',
      name: 'Alle'
    }
  },
  update: {
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'workcenter-table',
    name: 'Alle',
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  }
});
```

#### `branches-table`:
```typescript
// "Alle" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'branches-table',
      name: 'Alle'
    }
  },
  update: {
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'branches-table',
    name: 'Alle',
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  }
});
```

#### `roles-table`:
```typescript
// "Alle" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'roles-table',
      name: 'Alle'
    }
  },
  update: {
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'roles-table',
    name: 'Alle',
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  }
});
```

#### `consultations-table`:
```typescript
// "Archiv" Filter
const today = new Date().toISOString().split('T')[0];
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'consultations-table',
      name: 'Archiv'
    }
  },
  update: {
    conditions: JSON.stringify([
      { column: 'startTime', operator: 'before', value: today }
    ]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'consultations-table',
    name: 'Archiv',
    conditions: JSON.stringify([
      { column: 'startTime', operator: 'before', value: today }
    ]),
    operators: JSON.stringify([])
  }
});

// "Heute" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'consultations-table',
      name: 'Heute'
    }
  },
  update: {
    conditions: JSON.stringify([
      { column: 'startTime', operator: 'equals', value: '__TODAY__' }
    ]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'consultations-table',
    name: 'Heute',
    conditions: JSON.stringify([
      { column: 'startTime', operator: 'equals', value: '__TODAY__' }
    ]),
    operators: JSON.stringify([])
  }
});

// "Woche" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'consultations-table',
      name: 'Woche'
    }
  },
  update: {
    conditions: JSON.stringify([
      { column: 'startTime', operator: 'after', value: '__TODAY__' },
      { column: 'startTime', operator: 'before', value: '__WEEK_FROM_TODAY__' }
    ]),
    operators: JSON.stringify(['AND'])
  },
  create: {
    userId,
    tableId: 'consultations-table',
    name: 'Woche',
    conditions: JSON.stringify([
      { column: 'startTime', operator: 'after', value: '__TODAY__' },
      { column: 'startTime', operator: 'before', value: '__WEEK_FROM_TODAY__' }
    ]),
    operators: JSON.stringify(['AND'])
  }
});

// "Nicht abgerechnet" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'consultations-table',
      name: 'Nicht abgerechnet'
    }
  },
  update: {
    conditions: JSON.stringify([
      { column: 'invoiceStatus', operator: 'equals', value: 'nicht abgerechnet' }
    ]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'consultations-table',
    name: 'Nicht abgerechnet',
    conditions: JSON.stringify([
      { column: 'invoiceStatus', operator: 'equals', value: 'nicht abgerechnet' }
    ]),
    operators: JSON.stringify([])
  }
});
```

#### `my-join-requests-table`:
```typescript
// "Alle" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'my-join-requests-table',
      name: 'Alle'
    }
  },
  update: {
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'my-join-requests-table',
    name: 'Alle',
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  }
});
```

#### `join-requests-table`:
```typescript
// "Alle" Filter
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: 'join-requests-table',
      name: 'Alle'
    }
  },
  update: {
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: 'join-requests-table',
    name: 'Alle',
    conditions: JSON.stringify([]),
    operators: JSON.stringify([])
  }
});
```

---

### 2. Frontend-Code entfernen

**Zu entfernen (createStandardFilters useEffect):**

1. `frontend/src/components/teamWorktime/ActiveUsersList.tsx` (Zeile 779-859)
2. `frontend/src/components/BranchManagementTab.tsx` (Zeile 479-518)
3. `frontend/src/components/RoleManagementTab.tsx` (Zeile 1314-1353)
4. `frontend/src/components/ConsultationList.tsx` (Zeile 199-311)
5. `frontend/src/components/organization/MyJoinRequestsList.tsx` (Zeile 258-297)
6. `frontend/src/components/organization/JoinRequestsList.tsx` (Zeile 275-314)

**Hinweis:** `setInitialFilter` useEffect kann bleiben (lädt nur Filter, erstellt keine)

---

### 3. isStandardFilter erweitern

**Datei:** `frontend/src/components/SavedFilterTags.tsx` (Zeile 353-375)

**Aktuell:**
```typescript
const standardFilterNames = [
  'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche', 'Hoy',
  'tasks.filters.archive', 'tasks.filters.current',
  'requests.filters.archiv', 'requests.filters.aktuell'
];
```

**Erweitern um:**
```typescript
const standardFilterNames = [
  'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche', 'Hoy',
  'Nicht abgerechnet', // NEU
  'tasks.filters.archive', 'tasks.filters.current',
  'requests.filters.archiv', 'requests.filters.aktuell'
];
```

**Hinweis:** "Nicht abgerechnet" ist der einzige neue Name, der fehlt. Alle anderen sind bereits in der Liste.

---

## 📋 Implementierungsreihenfolge

1. **Seed erweitern** (backend/prisma/seed.ts)
   - Alle fehlenden Standardfilter hinzufügen
   - Testen: `npm run seed` (oder `npx prisma db seed`)

2. **isStandardFilter erweitern** (SavedFilterTags.tsx)
   - "Nicht abgerechnet" zur Liste hinzufügen

3. **Frontend-Code entfernen** (6 Dateien)
   - createStandardFilters useEffect entfernen
   - Kommentare hinzufügen: "Standard-Filter werden jetzt im Seed erstellt"

4. **Testen:**
   - Seed ausführen
   - Prüfen: Alle Standardfilter vorhanden?
   - Prüfen: Standardfilter unlöschbar? (kein Kreuzchen)
   - Prüfen: Filter funktionieren?

---

## ⚠️ Risiken

### Risiko 1: Bestehende Filter werden überschrieben
**Status:** Gering
- Seed verwendet `upsert` (erstellt oder aktualisiert)
- Bestehende Filter bleiben erhalten, werden nur aktualisiert wenn Name/TableId/UserId übereinstimmen

### Risiko 2: Übersetzungen
**Status:** Gering
- Standardfilter-Namen sind hardcoded (z.B. "Aktuell", "Archiv")
- Übersetzungen erfolgen in `translateFilterName` Funktion
- Keine Änderung nötig

### Risiko 3: Consultations "Archiv" Filter mit statischem Datum
**Status:** Mittel
- Aktuell: Frontend erstellt "Archiv" mit `today` (statisches Datum)
- Seed: Muss auch `today` verwenden (wird beim Seed-Zeitpunkt erstellt)
- **Problem:** Datum wird nicht täglich aktualisiert
- **Lösung:** Filter verwendet `__TODAY__` Placeholder (wird beim Anwenden evaluiert)
- **ABER:** Seed erstellt mit statischem Datum (wie Frontend)
- **Empfehlung:** Seed sollte `__TODAY__` verwenden, nicht statisches Datum

---

## ✅ Erfolgskriterien

- [ ] Alle Standardfilter werden im Seed erstellt
- [ ] Kein createStandardFilters useEffect mehr im Frontend
- [ ] Alle Standardfilter sind unlöschbar (kein Kreuzchen)
- [ ] Filter funktionieren korrekt
- [ ] Performance verbessert (keine unnötige Komplexität)

---

## 📝 Notizen

- **ConsultationList.tsx:** Erstellt auch "Nicht abgerechnet" Filter - muss ins Seed
- **ConsultationList.tsx:** Löscht veraltete Filter ("Alle", "Diese Woche") - kann bleiben (Cleanup)
- **ActiveUsersList.tsx:** Verwendet Übersetzungen (`t('teamWorktime.filters.active')`) - Seed muss hardcoded Namen verwenden
- **isStandardFilter:** Prüft auch `recentClientNames` für consultations-table - bleibt unverändert

















