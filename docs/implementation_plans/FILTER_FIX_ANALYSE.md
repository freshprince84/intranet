# Analyse: Filter-Fix Implementierung

## ✅ Was korrekt implementiert wurde:

1. **Backend (Seed):**
   - ✅ "Alle" Filter für Requests entfernt
   - ✅ User-Filter für Requests erweitert (status-Bedingungen)
   - ✅ User-Filter für ToDos erweitert (status-Bedingungen)

2. **Frontend (FilterRow):**
   - ✅ Operator-Dropdown für "type": nur equals/notEquals
   - ✅ Operator-Dropdown für "branch": nur equals/notEquals

3. **Frontend (Worktracker):**
   - ✅ "actions" aus FilterPane entfernt
   - ✅ "responsibleAndQualityControl" aus FilterPane entfernt

4. **Frontend (SavedFilterTags):**
   - ✅ "todos" als Standardfilter erkannt
   - ✅ "Todos" Übersetzung hinzugefügt

5. **Übersetzungen:**
   - ✅ Alle verwendeten Übersetzungsschlüssel existieren
   - ✅ `filterPaneColumns` verwendet `t()` korrekt

6. **Memory Leaks:**
   - ✅ `filterPaneColumns` ist `useMemo` (korrekt)
   - ✅ Keine neuen useEffect ohne Cleanup hinzugefügt

7. **Berechtigungen:**
   - ✅ Keine neuen Berechtigungen nötig (nur Filter-Logik)

8. **Notifications:**
   - ✅ Keine neuen Notifications nötig

---

## ❌ Probleme gefunden:

### 1. Code-Duplikation in Worktracker.tsx

**Problem:** `filterPaneColumns` dupliziert Labels, die bereits in `availableColumns` und `filterOnlyColumns` definiert sind.

**Aktueller Code:**
```typescript
const filterPaneColumns = useMemo(() => [
    { id: 'title', label: t('tasks.columns.title') },
    { id: 'status', label: t('tasks.columns.status') },
    { id: 'branch', label: t('tasks.columns.branch') },
    { id: 'dueDate', label: t('tasks.columns.dueDate') },
    { id: 'responsible', label: t('tasks.columns.responsible') },
    { id: 'qualityControl', label: t('tasks.columns.qualityControl') },
], [t]);
```

**Besser:** Aus `availableColumns` und `filterOnlyColumns` ableiten:
```typescript
const filterPaneColumns = useMemo(() => {
    const fromAvailable = availableColumns
        .filter(col => col.id !== 'actions' && col.id !== 'responsibleAndQualityControl')
        .map(col => ({ id: col.id, label: col.label }));
    const fromFilterOnly = filterOnlyColumns.map(col => ({ id: col.id, label: col.label }));
    return [...fromAvailable, ...fromFilterOnly];
}, [availableColumns, filterOnlyColumns]);
```

**Vorteil:** 
- Keine Duplikation
- Änderungen an `availableColumns`/`filterOnlyColumns` werden automatisch übernommen
- DRY-Prinzip befolgt

---

### 2. Fehlende Migration für bestehende Filter

**Problem:** Bestehende User-Filter in der DB haben noch nicht die neuen Status-Bedingungen.

**Lösung:** Migration-Script erstellen, das:
- Alle User-Filter für `requests-table` findet
- Status-Bedingungen hinzufügt (falls noch nicht vorhanden)
- Alle User-Filter für `worktracker-todos` findet
- Status-Bedingungen hinzufügt (falls noch nicht vorhanden)

**Optional:** Könnte auch im Seed gemacht werden (beim nächsten Seed-Lauf werden Filter aktualisiert).

---

### 3. "Alle" Filter in DB nicht gelöscht

**Problem:** Der "Alle" Filter wurde nur aus dem Seed entfernt, aber bestehende Filter in der DB bleiben.

**Lösung:** Migration-Script oder manuelles Löschen:
```sql
DELETE FROM "SavedFilter" 
WHERE "tableId" = 'requests-table' 
AND "name" IN ('Alle', 'Todos');
```

---

## 🔍 Weitere Prüfungen:

### ✅ Übersetzungen:
- Alle verwendeten Schlüssel existieren in de.json, en.json, es.json
- "Todos" wird korrekt zu "Alle" übersetzt

### ✅ Memory Leaks:
- Keine neuen Memory Leaks
- `filterPaneColumns` ist `useMemo` (korrekt)
- Keine neuen useEffect ohne Cleanup

### ✅ Berechtigungen:
- Keine neuen Berechtigungen nötig
- Filter-Logik ändert keine Berechtigungen

### ✅ Notifications:
- Keine neuen Notifications nötig
- Filter-Änderungen sind UI-only

### ✅ Code-Komplexität:
- `filterPaneColumns` könnte vereinfacht werden (siehe Problem 1)
- Sonst keine unnötige Komplexität

---

## 📝 Empfohlene Fixes:

1. **Code-Duplikation beheben:** `filterPaneColumns` aus bestehenden Arrays ableiten
2. **Migration-Script erstellen:** Für bestehende User-Filter in DB
3. **"Alle" Filter löschen:** Migration oder manuell

