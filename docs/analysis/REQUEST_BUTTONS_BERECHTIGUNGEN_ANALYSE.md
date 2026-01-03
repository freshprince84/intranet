# Request-Buttons Berechtigungen - Problem-Analyse

**Datum:** 2025-01-31  
**Status:** 🔍 ANALYSE - PROBLEM IDENTIFIZIERT

---

## 1. PROBLEM

**Symptom:** 
- Create-Request-Button wird nicht angezeigt, obwohl "Cre..." (Create) auf "Sí" gesetzt ist
- Edit-Request-Button wird nicht angezeigt, obwohl "Edit..." (Edit) auf "Propios" gesetzt ist

**Erwartetes Verhalten:**
- Create-Button sollte angezeigt werden, wenn `request_create` Button-Berechtigung vorhanden ist
- Edit-Button sollte angezeigt werden, wenn `request_edit` Button-Berechtigung vorhanden ist (und Request dem User gehört)

---

## 2. ROOT CAUSE ANALYSE

### Problem 1: Create-Button prüft falsche Berechtigung

**Code-Stelle:** `frontend/src/components/Requests.tsx` → Zeile 1121

**Aktueller Code:**
```typescript
{hasPermission('requests', 'write', 'table') && (
  <button onClick={() => setIsCreateModalOpen(true)}>
    <PlusIcon className="h-4 w-4" />
  </button>
)}
```

**Problem:**
- Prüft `hasPermission('requests', 'write', 'table')`
- Das prüft die **Box/Tab-Berechtigung** für `requests`, nicht die **Button-Berechtigung** für `request_create`
- Laut `permissionStructure.ts` gibt es eine separate Button-Berechtigung: `request_create`
- Im Bild sehe ich: "Cre..." (Create) ist auf "Sí" gesetzt → bedeutet `all_both` für `request_create` Button
- ABER: Die Prüfung schaut auf `requests` Box, nicht auf `request_create` Button

**Lösung:**
- Sollte prüfen: `hasPermission('request_create', 'write', 'button')` oder `hasPermission('request_create', 'both', 'button')`

### Problem 2: Edit-Button prüft falsche Berechtigung

**Code-Stelle:** `frontend/src/components/Requests.tsx` → Zeile 1555

**Aktueller Code:**
```typescript
{hasPermission('requests', 'write', 'table') && (
  <button onClick={() => handleEdit(request)}>
    <PencilIcon className="h-5 w-5" />
  </button>
)}
```

**Problem:**
- Prüft `hasPermission('requests', 'write', 'table')`
- Das prüft die **Box/Tab-Berechtigung** für `requests`, nicht die **Button-Berechtigung** für `request_edit`
- Laut `permissionStructure.ts` gibt es eine separate Button-Berechtigung: `request_edit`
- Im Bild sehe ich: "Edit..." (Edit) ist auf "Propios" gesetzt → bedeutet `own_both` für `request_edit` Button
- ABER: Die Prüfung schaut auf `requests` Box, nicht auf `request_edit` Button
- ZUSÄTZLICH: Es wird nicht geprüft, ob der Request dem User gehört (bei `own_both`)

**Lösung:**
- Sollte prüfen: `hasPermission('request_edit', 'write', 'button')` oder `hasPermission('request_edit', 'both', 'button')`
- ZUSÄTZLICH: Bei `own_both` muss geprüft werden, ob `request.requestedBy.id === user.id` oder `request.responsible.id === user.id`

### Problem 3: Permission Structure vs. Implementierung

**Code-Stelle:** `backend/src/config/permissionStructure.ts` → Zeile 59-63

**Definiert:**
```typescript
{
  entity: 'requests',
  label: 'Solicitudes',
  options: 'ternary',
  buttons: [
    { entity: 'request_create', label: 'Erstellen', options: 'ternary' },
    { entity: 'request_edit', label: 'Bearbeiten', options: 'ternary' },
    { entity: 'request_delete', label: 'Löschen', options: 'ternary' }
  ]
}
```

**Problem:**
- Button-Berechtigungen sind definiert (`request_create`, `request_edit`, `request_delete`)
- ABER: Die Frontend-Komponente verwendet sie nicht
- Stattdessen wird die Box-Berechtigung (`requests`) für alle Buttons verwendet

---

## 3. CODE-FLOW ANALYSE

### Aktueller Flow:

1. **User sieht Requests-Seite**
2. **Create-Button:**
   - Prüft: `hasPermission('requests', 'write', 'table')`
   - Das prüft die `requests` Box-Berechtigung
   - Wenn Box-Berechtigung `all_read` oder `none` → Button wird nicht angezeigt
   - ABER: `request_create` Button-Berechtigung könnte `all_both` sein!

3. **Edit-Button:**
   - Prüft: `hasPermission('requests', 'write', 'table')`
   - Das prüft die `requests` Box-Berechtigung
   - Wenn Box-Berechtigung `all_read` oder `none` → Button wird nicht angezeigt
   - ABER: `request_edit` Button-Berechtigung könnte `own_both` sein!

### Erwarteter Flow:

1. **User sieht Requests-Seite**
2. **Create-Button:**
   - Prüft: `hasPermission('request_create', 'write', 'button')` oder `hasPermission('request_create', 'both', 'button')`
   - Das prüft die `request_create` Button-Berechtigung
   - Wenn Button-Berechtigung `all_both` oder `own_both` → Button wird angezeigt

3. **Edit-Button:**
   - Prüft: `hasPermission('request_edit', 'write', 'button')` oder `hasPermission('request_edit', 'both', 'button')`
   - Das prüft die `request_edit` Button-Berechtigung
   - Wenn Button-Berechtigung `all_both` → Button wird immer angezeigt
   - Wenn Button-Berechtigung `own_both` → Button wird nur angezeigt, wenn `request.requestedBy.id === user.id` oder `request.responsible.id === user.id`

---

## 4. LÖSUNGSANSÄTZE

### Lösung 1: Button-Berechtigungen verwenden (BESTE LÖSUNG)

**Änderung:** `frontend/src/components/Requests.tsx`

**Create-Button (Zeile 1121):**
```typescript
// ALT:
{hasPermission('requests', 'write', 'table') && (

// NEU:
{(hasPermission('request_create', 'write', 'button') || hasPermission('request_create', 'both', 'button')) && (
```

**Edit-Button (Zeile 1555):**
```typescript
// ALT:
{hasPermission('requests', 'write', 'table') && (

// NEU:
{(hasPermission('request_edit', 'write', 'button') || hasPermission('request_edit', 'both', 'button')) && (
  // ZUSÄTZLICH: Bei own_both prüfen, ob Request dem User gehört
  (() => {
    const canEditAll = hasPermission('request_edit', 'both', 'button') && 
                       (getAccessLevel('request_edit', 'button') === 'all_both');
    const canEditOwn = hasPermission('request_edit', 'write', 'button') && 
                       (getAccessLevel('request_edit', 'button') === 'own_both') &&
                       (request.requestedBy.id === user?.id || request.responsible.id === user?.id);
    return canEditAll || canEditOwn;
  })() && (
```

**Vorteil:**
- Verwendet die korrekten Button-Berechtigungen
- Entspricht der Permission Structure
- Granulare Kontrolle pro Button

**Nachteil:**
- Code wird komplexer (besonders Edit-Button mit Ownership-Prüfung)

### Lösung 2: Helper-Funktion erstellen

**Änderung:** Neue Helper-Funktion in `usePermissions.ts`

```typescript
const canEditRequest = (request: Request): boolean => {
  const editAccessLevel = getAccessLevel('request_edit', 'button');
  
  if (editAccessLevel === 'none') return false;
  if (editAccessLevel === 'all_both' || editAccessLevel === 'all_read') return true;
  if (editAccessLevel === 'own_both' || editAccessLevel === 'own_read') {
    return request.requestedBy.id === user?.id || request.responsible.id === user?.id;
  }
  return false;
};
```

**Vorteil:**
- Code wird sauberer
- Wiederverwendbar

**Nachteil:**
- Zusätzliche Funktion nötig

---

## 5. IMPLEMENTIERUNGSPLAN

### Schritt 1: Create-Button korrigieren
- [ ] `hasPermission('requests', 'write', 'table')` → `hasPermission('request_create', 'write', 'button') || hasPermission('request_create', 'both', 'button')`

### Schritt 2: Edit-Button korrigieren
- [ ] `hasPermission('requests', 'write', 'table')` → `hasPermission('request_edit', 'write', 'button') || hasPermission('request_edit', 'both', 'button')`
- [ ] Ownership-Prüfung hinzufügen für `own_both`

### Schritt 3: Delete-Button prüfen
- [ ] Prüfen, ob Delete-Button auch korrigiert werden muss
- [ ] Gleiche Logik wie Edit-Button

### Schritt 4: Testing
- [ ] Create-Button mit `all_both` testen
- [ ] Create-Button mit `own_both` testen
- [ ] Edit-Button mit `all_both` testen
- [ ] Edit-Button mit `own_both` testen (eigene Requests)
- [ ] Edit-Button mit `own_both` testen (fremde Requests - sollte nicht angezeigt werden)

---

## 6. ZUSAMMENFASSUNG

**Problem:**
- Create-Button prüft `requests` Box-Berechtigung statt `request_create` Button-Berechtigung
- Edit-Button prüft `requests` Box-Berechtigung statt `request_edit` Button-Berechtigung
- Ownership-Prüfung fehlt bei Edit-Button für `own_both`

**Lösung:**
1. Create-Button: `request_create` Button-Berechtigung prüfen
2. Edit-Button: `request_edit` Button-Berechtigung prüfen + Ownership-Prüfung für `own_both`

**Erstellt:** 2025-01-31  
**Status:** 🔍 ANALYSE - PROBLEM IDENTIFIZIERT

