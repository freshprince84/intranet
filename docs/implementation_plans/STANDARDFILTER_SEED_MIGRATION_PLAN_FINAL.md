# Plan: Standardfilter Seed-Migration - FINAL

**Datum:** 2025-01-29  
**Status:** 📋 Vollständig analysiert, alle Fakten geklärt  
**Zweck:** Alle Standardfilter ins Seed verschieben, Frontend-Code entfernen, Unlöschbarkeit sicherstellen, "Hoy" entfernen

---

## 🎯 Ziele

1. **Alle Standardfilter im Seed erstellen** (nicht mehr im Frontend)
2. **Frontend-Code entfernen** (createStandardFilters useEffect)
3. **Unlöschbarkeit sicherstellen** (isStandardFilter erweitern, OHNE Kreuzchen)
4. **"Hoy" Filter entfernen** (weder per Code noch per Seed)
5. **Performance verbessern** (keine unnötige Komplexität im Frontend)

---

## ✅ Was bereits erledigt ist

### Seed (backend/prisma/seed.ts):
- ✅ `worktracker-todos`: "Aktuell", "Archiv"
- ✅ `requests-table`: "Aktuell", "Archiv"
- ❌ `worktracker-reservations`: "Hoy" (MUSS ENTFERNT WERDEN)

### Frontend (Code entfernt):
- ✅ `Requests.tsx`: createStandardFilters entfernt
- ✅ `Worktracker.tsx`: createStandardFilters entfernt (für Todos)

---

## ❌ Probleme identifiziert

### Problem 1: "Hoy" Filter existiert noch

**Fakten:**
- ❌ "Hoy" wird im Seed erstellt (`backend/prisma/seed.ts` Zeile 1644-1668)
- ❌ "Hoy" ist in `isStandardFilter` Liste (`SavedFilterTags.tsx` Zeile 356)
- ❌ "Hoy" wird in `Worktracker.tsx` verwendet (Zeile 819-826, 2341, 3644)
- ❌ "Hoy" zeigt noch das Kreuzchen (sollte unlöschbar sein, aber ist in der Liste)

**Lösung:**
- "Hoy" aus Seed entfernen
- "Hoy" aus `isStandardFilter` Liste entfernen
- `Worktracker.tsx` anpassen: "Hoy" → "Aktuell" (wie Todos)
- Reservations sollte "Aktuell" verwenden (analog zu Todos)

### Problem 2: 6 Tabellen erstellen Standardfilter noch im Frontend

**Betroffene Komponenten:**
1. `ActiveUsersList.tsx` (`workcenter-table`): "Aktive", "Alle"
2. `BranchManagementTab.tsx` (`branches-table`): "Alle"
3. `RoleManagementTab.tsx` (`roles-table`): "Alle"
4. `ConsultationList.tsx` (`consultations-table`): "Archiv", "Heute", "Woche", "Nicht abgerechnet"
5. `MyJoinRequestsList.tsx` (`my-join-requests-table`): "Alle"
6. `JoinRequestsList.tsx` (`join-requests-table`): "Alle"

**Lösung:**
- Alle Standardfilter ins Seed verschieben
- Frontend-Code entfernen

### Problem 3: Weitere Komponenten mit defaultFilterName (ohne Seed)

**Betroffene Komponenten:**
1. `Cerebro.tsx` (`CEREBRO_ARTICLES`): "Alle Artikel" (nur defaultFilterName)
2. `ToursTab.tsx` (`worktracker-tours`): "Aktuell" (nur defaultFilterName)
3. `PasswordManagerTab.tsx` (`PASSWORD_MANAGER_TABLE_ID` = ''): "Alle Einträge" (nur defaultFilterName)
4. `TodoAnalyticsTab.tsx`: "Alle" (nur defaultFilterName)
5. `RequestAnalyticsTab.tsx`: "Alle" (nur defaultFilterName)

**Lösung:**
- Prüfen, ob Standardfilter im Seed erstellt werden sollen
- Wenn ja: Seed erweitern
- Wenn nein: Nur defaultFilterName verwenden (kein Seed nötig)

---

## 📋 Vollständige Liste aller Tabellen mit Standardfiltern

### 1. `worktracker-todos` (Todos)
**Status:** ✅ Bereits im Seed
- ✅ "Aktuell" (status != 'done')
- ✅ "Archiv" (status == 'done')

**Frontend:** `Worktracker.tsx`
- ✅ Kein createStandardFilters mehr
- ✅ defaultFilterName: "Aktuell"

### 2. `requests-table` (Requests)
**Status:** ✅ Bereits im Seed
- ✅ "Aktuell" (status != 'approved' AND status != 'denied')
- ✅ "Archiv" (status == 'approved' OR status == 'denied')

**Frontend:** `Requests.tsx`
- ✅ Kein createStandardFilters mehr
- ✅ defaultFilterName: "Aktuell"

### 3. `worktracker-reservations` (Reservations)
**Status:** ❌ MUSS GEÄNDERT WERDEN
- ❌ "Hoy" (MUSS ENTFERNT WERDEN)
- ✅ "Aktuell" (MUSS HINZUGEFÜGT WERDEN - analog zu Todos)

**Frontend:** `Worktracker.tsx`
- ❌ Verwendet noch "Hoy" (Zeile 819-826, 2341, 3644)
- ❌ Muss auf "Aktuell" geändert werden

**Seed:** `backend/prisma/seed.ts`
- ❌ Erstellt noch "Hoy" (Zeile 1644-1668)
- ❌ Muss "Aktuell" erstellen (analog zu Todos)

### 4. `workcenter-table` (ActiveUsersList)
**Status:** ❌ Noch im Frontend
- ❌ "Aktive" (hasActiveWorktime == 'true')
- ❌ "Alle" (keine Bedingungen)

**Frontend:** `ActiveUsersList.tsx`
- ❌ createStandardFilters useEffect (Zeile 779-859)
- ✅ defaultFilterName: "Aktive"

**Seed:** Muss hinzugefügt werden

### 5. `branches-table` (BranchManagementTab)
**Status:** ❌ Noch im Frontend
- ❌ "Alle" (keine Bedingungen)

**Frontend:** `BranchManagementTab.tsx`
- ❌ createStandardFilters useEffect (Zeile 479-518)
- ✅ defaultFilterName: "Alle"

**Seed:** Muss hinzugefügt werden

### 6. `roles-table` (RoleManagementTab)
**Status:** ❌ Noch im Frontend
- ❌ "Alle" (keine Bedingungen)

**Frontend:** `RoleManagementTab.tsx`
- ❌ createStandardFilters useEffect (Zeile 1314-1353)
- ✅ defaultFilterName: "Alle"

**Seed:** Muss hinzugefügt werden

### 7. `consultations-table` (ConsultationList)
**Status:** ❌ Noch im Frontend
- ❌ "Archiv" (startTime < heute)
- ❌ "Heute" (startTime == '__TODAY__')
- ❌ "Woche" (startTime > '__TODAY__' AND startTime < '__WEEK_FROM_TODAY__')
- ❌ "Nicht abgerechnet" (invoiceStatus == 'nicht abgerechnet')

**Frontend:** `ConsultationList.tsx`
- ❌ createStandardFilters useEffect (Zeile 199-311)
- ✅ defaultFilterName: "Heute" (wird in SavedFilterTags gesetzt)

**Seed:** Muss hinzugefügt werden

### 8. `my-join-requests-table` (MyJoinRequestsList)
**Status:** ❌ Noch im Frontend
- ❌ "Alle" (keine Bedingungen)

**Frontend:** `MyJoinRequestsList.tsx`
- ❌ createStandardFilters useEffect (Zeile 258-297)
- ✅ defaultFilterName: "Alle"

**Seed:** Muss hinzugefügt werden

### 9. `join-requests-table` (JoinRequestsList)
**Status:** ❌ Noch im Frontend
- ❌ "Alle" (keine Bedingungen)

**Frontend:** `JoinRequestsList.tsx`
- ❌ createStandardFilters useEffect (Zeile 275-314)
- ✅ defaultFilterName: "Alle"

**Seed:** Muss hinzugefügt werden

### 10. `worktracker-tours` (ToursTab)
**Status:** ❓ Nur defaultFilterName
- ❓ "Aktuell" (nur defaultFilterName, kein Seed)

**Frontend:** `ToursTab.tsx`
- ✅ Kein createStandardFilters
- ✅ defaultFilterName: "Aktuell"

**Entscheidung:** Soll "Aktuell" im Seed erstellt werden? (analog zu Todos/Requests)

### 11. `CEREBRO_ARTICLES` (Cerebro)
**Status:** ❓ Nur defaultFilterName
- ❓ "Alle Artikel" (nur defaultFilterName, kein Seed)

**Frontend:** `Cerebro.tsx`
- ✅ Kein createStandardFilters
- ✅ defaultFilterName: "Alle Artikel"

**Entscheidung:** Soll "Alle Artikel" im Seed erstellt werden?

### 12. `PASSWORD_MANAGER_TABLE_ID` (PasswordManagerTab)
**Status:** ❓ Nur defaultFilterName
- ❓ "Alle Einträge" (nur defaultFilterName, kein Seed, tableId = '')

**Frontend:** `PasswordManagerTab.tsx`
- ✅ Kein createStandardFilters
- ✅ defaultFilterName: "Alle Einträge"

**Entscheidung:** Soll "Alle Einträge" im Seed erstellt werden? (tableId ist leer!)

### 13. `TodoAnalyticsTab.tsx`
**Status:** ❓ Nur defaultFilterName
- ❓ "Alle" (nur defaultFilterName, kein Seed, keine tableId)

**Frontend:** `TodoAnalyticsTab.tsx`
- ✅ Kein createStandardFilters
- ✅ defaultFilterName: "Alle"

**Entscheidung:** Soll "Alle" im Seed erstellt werden? (keine tableId!)

### 14. `RequestAnalyticsTab.tsx`
**Status:** ❓ Nur defaultFilterName
- ❓ "Alle" (nur defaultFilterName, kein Seed, keine tableId)

**Frontend:** `RequestAnalyticsTab.tsx`
- ✅ Kein createStandardFilters
- ✅ defaultFilterName: "Alle"

**Entscheidung:** Soll "Alle" im Seed erstellt werden? (keine tableId!)

---

## 🔧 Implementierungsschritte

### Schritt 1: Seed erweitern (backend/prisma/seed.ts)

#### 1.1. "Hoy" entfernen, "Aktuell" hinzufügen (Reservations)

**Entfernen (Zeile 1641-1668):**
```typescript
// ❌ ENTFERNEN: "Hoy" Filter
```

**Hinzufügen:**
```typescript
// Standard-Filter für Reservations (worktracker-reservations)
const reservationsTableId = 'worktracker-reservations';

// "Aktuell" Filter (analog zu Todos)
await prisma.savedFilter.upsert({
  where: {
    userId_tableId_name: {
      userId,
      tableId: reservationsTableId,
      name: 'Aktuell'
    }
  },
  update: {
    conditions: JSON.stringify([
      { column: 'checkInDate', operator: 'greaterThanOrEqual', value: '__TODAY__' }
    ]),
    operators: JSON.stringify([])
  },
  create: {
    userId,
    tableId: reservationsTableId,
    name: 'Aktuell',
    conditions: JSON.stringify([
      { column: 'checkInDate', operator: 'greaterThanOrEqual', value: '__TODAY__' }
    ]),
    operators: JSON.stringify([])
  }
});
```

#### 1.2. Weitere Standardfilter hinzufügen

**Siehe:** `docs/implementation_plans/STANDARDFILTER_SEED_MIGRATION_PLAN.md` für Details

### Schritt 2: Frontend-Code entfernen

#### 2.1. Worktracker.tsx anpassen (Reservations)

**Ändern (Zeile 819-826):**
```typescript
// ❌ ALT: Suche nach "Hoy" Filter
const hoyFilter = filters.find((filter: any) => filter.name === 'Hoy');
if (hoyFilter) {
    setReservationActiveFilterName('Hoy');
    setReservationSelectedFilterId(hoyFilter.id);
    applyReservationFilterConditions(hoyFilter.conditions, hoyFilter.operators);
    await loadReservations(hoyFilter.id, undefined, false, 20, 0);
}

// ✅ NEU: Suche nach "Aktuell" Filter
const aktuellFilter = filters.find((filter: any) => filter.name === 'Aktuell');
if (aktuellFilter) {
    setReservationActiveFilterName('Aktuell');
    setReservationSelectedFilterId(aktuellFilter.id);
    applyReservationFilterConditions(aktuellFilter.conditions, aktuellFilter.operators);
    await loadReservations(aktuellFilter.id, undefined, false, 20, 0);
}
```

**Ändern (Zeile 2341, 3644):**
```typescript
// ❌ ALT:
defaultFilterName={activeTab === 'todos' ? t('tasks.filters.current') : t('reservations.filters.current', 'Aktuell')}

// ✅ NEU: (bleibt gleich, aber "Aktuell" wird jetzt verwendet)
defaultFilterName={activeTab === 'todos' ? t('tasks.filters.current') : t('reservations.filters.current', 'Aktuell')}
```

#### 2.2. createStandardFilters useEffect entfernen

**Zu entfernen:**
1. `ActiveUsersList.tsx` (Zeile 779-859)
2. `BranchManagementTab.tsx` (Zeile 479-518)
3. `RoleManagementTab.tsx` (Zeile 1314-1353)
4. `ConsultationList.tsx` (Zeile 199-311)
5. `MyJoinRequestsList.tsx` (Zeile 258-297)
6. `JoinRequestsList.tsx` (Zeile 275-314)

**Hinweis:** `setInitialFilter` useEffect kann bleiben (lädt nur Filter, erstellt keine)

### Schritt 3: isStandardFilter erweitern

**Datei:** `frontend/src/components/SavedFilterTags.tsx` (Zeile 353-375)

**Aktuell:**
```typescript
const standardFilterNames = [
  'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche', 'Hoy',
  'tasks.filters.archive', 'tasks.filters.current',
  'requests.filters.archiv', 'requests.filters.aktuell'
];
```

**Ändern:**
```typescript
const standardFilterNames = [
  'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche',
  'Nicht abgerechnet', // NEU
  'tasks.filters.archive', 'tasks.filters.current',
  'requests.filters.archiv', 'requests.filters.aktuell'
];
// ❌ ENTFERNEN: 'Hoy'
```

**Hinweis:** "Hoy" entfernen, "Nicht abgerechnet" hinzufügen

---

## ⚠️ Risiken

### Risiko 1: Bestehende "Hoy" Filter in Datenbank
**Status:** Mittel
- **Problem:** Wenn "Hoy" Filter bereits in Datenbank existieren, werden sie nicht automatisch gelöscht
- **Lösung:** Migration-Script oder manuelles Löschen
- **Empfehlung:** Seed sollte bestehende "Hoy" Filter löschen (vor dem Erstellen von "Aktuell")

### Risiko 2: Reservations "Aktuell" Filter-Logik
**Status:** Gering
- **Problem:** "Aktuell" für Reservations muss definiert werden
- **Lösung:** Analog zu Todos (checkInDate >= '__TODAY__')
- **Empfehlung:** Prüfen, ob Logik korrekt ist

### Risiko 3: Übersetzungen
**Status:** Gering
- **Problem:** Standardfilter-Namen sind hardcoded (z.B. "Aktuell", "Archiv")
- **Lösung:** Übersetzungen erfolgen in `translateFilterName` Funktion
- **Empfehlung:** Keine Änderung nötig

### Risiko 4: Consultations "Archiv" Filter mit statischem Datum
**Status:** Mittel
- **Problem:** Aktuell: Frontend erstellt "Archiv" mit `today` (statisches Datum)
- **Lösung:** Seed sollte `__TODAY__` Placeholder verwenden (wird beim Anwenden evaluiert)
- **ABER:** Seed erstellt mit statischem Datum (wie Frontend)
- **Empfehlung:** Seed sollte `__TODAY__` verwenden, nicht statisches Datum

### Risiko 5: Performance
**Status:** Gering
- **Problem:** Seed erstellt Filter für alle Benutzer (kann viele sein)
- **Lösung:** Seed verwendet `upsert` (effizient)
- **Empfehlung:** Keine Performance-Probleme erwartet

---

## ✅ Erfolgskriterien

- [ ] "Hoy" Filter entfernt (Seed + Frontend)
- [ ] "Aktuell" Filter für Reservations erstellt (Seed)
- [ ] Alle Standardfilter werden im Seed erstellt (9 Tabellen)
- [ ] Kein createStandardFilters useEffect mehr im Frontend (6 Dateien)
- [ ] Alle Standardfilter sind unlöschbar (kein Kreuzchen)
- [ ] `isStandardFilter` Liste vollständig ("Hoy" entfernt, "Nicht abgerechnet" hinzugefügt)
- [ ] Filter funktionieren korrekt
- [ ] Performance verbessert (keine unnötige Komplexität)

---

## 📝 Offene Fragen

### Frage 1: Tours "Aktuell" Filter
**Frage:** Soll "Aktuell" für Tours im Seed erstellt werden?
**Antwort:** ❓ Muss geklärt werden

### Frage 2: Cerebro "Alle Artikel" Filter
**Frage:** Soll "Alle Artikel" für Cerebro im Seed erstellt werden?
**Antwort:** ❓ Muss geklärt werden

### Frage 3: PasswordManager "Alle Einträge" Filter
**Frage:** Soll "Alle Einträge" für PasswordManager im Seed erstellt werden? (tableId ist leer!)
**Antwort:** ❓ Muss geklärt werden

### Frage 4: Analytics Tabs "Alle" Filter
**Frage:** Soll "Alle" für Analytics Tabs im Seed erstellt werden? (keine tableId!)
**Antwort:** ❓ Muss geklärt werden

---

## 🚀 Implementierungsreihenfolge

1. **Seed erweitern** (backend/prisma/seed.ts)
   - "Hoy" entfernen
   - "Aktuell" für Reservations hinzufügen
   - Alle fehlenden Standardfilter hinzufügen (6 Tabellen)
   - Testen: `npm run seed` (oder `npx prisma db seed`)

2. **isStandardFilter erweitern** (SavedFilterTags.tsx)
   - "Hoy" entfernen
   - "Nicht abgerechnet" hinzufügen

3. **Worktracker.tsx anpassen** (Reservations)
   - "Hoy" → "Aktuell" ändern (3 Stellen)

4. **Frontend-Code entfernen** (6 Dateien)
   - createStandardFilters useEffect entfernen
   - Kommentare hinzufügen: "Standard-Filter werden jetzt im Seed erstellt"

5. **Testen:**
   - Seed ausführen
   - Prüfen: Alle Standardfilter vorhanden?
   - Prüfen: "Hoy" nicht mehr vorhanden?
   - Prüfen: Standardfilter unlöschbar? (kein Kreuzchen)
   - Prüfen: Filter funktionieren?

---

## 📊 Zusammenfassung

**Probleme:**
- ❌ "Hoy" Filter existiert noch (Seed + Frontend)
- ❌ "Hoy" zeigt noch das Kreuzchen (sollte unlöschbar sein)
- ❌ 6 Tabellen erstellen Standardfilter noch im Frontend

**Lösung:**
- ✅ "Hoy" aus Seed entfernen
- ✅ "Aktuell" für Reservations hinzufügen
- ✅ Alle Standardfilter ins Seed verschieben
- ✅ Frontend-Code entfernen
- ✅ `isStandardFilter` erweitern

**Risiken:**
- ⚠️ Bestehende "Hoy" Filter in Datenbank (Migration nötig)
- ⚠️ Consultations "Archiv" Filter mit statischem Datum (sollte `__TODAY__` verwenden)

**Performance:**
- ✅ Keine Performance-Probleme erwartet
- ✅ Seed verwendet `upsert` (effizient)

