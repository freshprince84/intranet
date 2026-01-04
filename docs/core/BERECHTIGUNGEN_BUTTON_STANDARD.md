# Berechtigungen für Buttons - Standard-Definition

**Datum:** 2025-01-31  
**Status:** ✅ STANDARD DEFINIERT

---

## 1. GRUNDREGEL

**Für jeden Button (Create, Edit, Delete, etc.) MUSS die entsprechende Button-Berechtigung geprüft werden, NICHT die übergeordnete Box/Tab-Berechtigung.**

### Warum?

- **Granulare Kontrolle:** Eine Rolle kann z.B. Requests sehen (`requests` Box: `all_read`), aber nur eigene erstellen (`request_create` Button: `own_both`).
- **Ownership-Unterstützung:** Bei `own_both` wird geprüft, ob das Element dem User gehört. Das ist nur bei Button-Berechtigungen sinnvoll.
- **Konsistenz:** Alle neueren Komponenten (Tours, Invoices, PriceAnalysis) verwenden bereits Button-Berechtigungen.

---

## 2. STANDARD-PATTERN

### 2.1 Create-Button

```tsx
// ❌ FALSCH: Box/Tab-Berechtigung
{hasPermission('requests', 'write', 'table') && (
  <button onClick={() => setIsCreateModalOpen(true)}>
    <PlusIcon className="h-4 w-4" />
  </button>
)}

// ✅ RICHTIG: Button-Berechtigung
{hasPermission('request_create', 'write', 'button') && (
  <button onClick={() => setIsCreateModalOpen(true)}>
    <PlusIcon className="h-4 w-4" />
  </button>
)}
```

### 2.2 Edit-Button (ohne Ownership-Prüfung)

```tsx
// ❌ FALSCH: Box/Tab-Berechtigung
{hasPermission('requests', 'write', 'table') && (
  <button onClick={() => handleEdit(request)}>
    <PencilIcon className="h-5 w-5" />
  </button>
)}

// ✅ RICHTIG: Button-Berechtigung
{hasPermission('request_edit', 'write', 'button') && (
  <button onClick={() => handleEdit(request)}>
    <PencilIcon className="h-5 w-5" />
  </button>
)}
```

### 2.3 Edit-Button (mit Ownership-Prüfung für `own_both`)

```tsx
// ✅ RICHTIG: Button-Berechtigung mit Ownership-Prüfung
{(() => {
  const editAccessLevel = getAccessLevel('request_edit', 'button');
  
  // all_both: Immer anzeigen
  if (editAccessLevel === 'all_both') return true;
  
  // own_both: Nur anzeigen, wenn User Owner ist
  if (editAccessLevel === 'own_both') {
    return request.requestedBy.id === user?.id || request.responsible.id === user?.id;
  }
  
  return false;
})() && (
  <button onClick={() => handleEdit(request)}>
    <PencilIcon className="h-5 w-5" />
  </button>
)}
```

### 2.4 Delete-Button (mit Ownership-Prüfung für `own_both`)

```tsx
// ✅ RICHTIG: Button-Berechtigung mit Ownership-Prüfung
{(() => {
  const deleteAccessLevel = getAccessLevel('request_delete', 'button');
  
  // all_both: Immer anzeigen
  if (deleteAccessLevel === 'all_both') return true;
  
  // own_both: Nur anzeigen, wenn User Owner ist
  if (deleteAccessLevel === 'own_both') {
    return request.requestedBy.id === user?.id || request.responsible.id === user?.id;
  }
  
  return false;
})() && (
  <button onClick={() => handleDelete(request.id)}>
    <TrashIcon className="h-5 w-5" />
  </button>
)}
```

---

## 3. BUTTON-ENTITÄTEN (aus `frontend/src/config/permissions.ts`)

### 3.1 Request Buttons (Parent: `requests`)
| Entity | Beschreibung |
|--------|--------------|
| `request_create` | Request erstellen |
| `request_edit` | Request bearbeiten |
| `request_delete` | Request löschen |
| `request_status_change` | Request Status ändern |

### 3.2 Task/To-Do Buttons (Parent: `todos`)
| Entity | Beschreibung |
|--------|--------------|
| `task_create` | Task erstellen |
| `task_edit` | Task bearbeiten |
| `task_delete` | Task löschen |
| `task_status_change` | Task Status ändern |

### 3.3 Reservation Buttons (Parent: `reservations`)
| Entity | Beschreibung |
|--------|--------------|
| `reservation_create` | Reservation erstellen |
| `reservation_edit` | Reservation bearbeiten |
| `reservation_delete` | Reservation löschen |
| `reservation_send_invitation` | Einladung senden |
| `reservation_send_passcode` | Passcode senden |

### 3.4 Tour Booking Buttons (Parent: `tour_bookings`)
| Entity | Beschreibung |
|--------|--------------|
| `tour_booking_create` | Tour Buchung erstellen |
| `tour_booking_edit` | Tour Buchung bearbeiten |
| `tour_booking_cancel` | Tour Buchung stornieren |

### 3.5 User Buttons (Parent: `users`)
| Entity | Beschreibung |
|--------|--------------|
| `user_create` | User erstellen |
| `user_edit` | User bearbeiten |
| `user_delete` | User löschen |

### 3.6 Role Buttons (Parent: `roles`)
| Entity | Beschreibung |
|--------|--------------|
| `role_create` | Rolle erstellen |
| `role_edit` | Rolle bearbeiten |
| `role_delete` | Rolle löschen |
| `role_copy` | Rolle kopieren |

### 3.7 Branch Buttons (Parent: `branches`)
| Entity | Beschreibung |
|--------|--------------|
| `branch_create` | Branch erstellen |
| `branch_edit` | Branch bearbeiten |
| `branch_delete` | Branch löschen |

### 3.8 Weitere Buttons
Siehe `frontend/src/config/permissions.ts` für die vollständige Liste.

---

## 4. OWNERSHIP-FELDER

Für `own_both`/`own_read` Berechtigungen wird geprüft, ob der User Owner ist. Die Ownership-Felder sind in `frontend/src/config/permissions.ts` definiert:

| Entity | Ownership-Felder |
|--------|------------------|
| `requests` | `requesterId`, `responsibleId` |
| `todos` | `responsibleId`, `qualityControlId`, `roleId` |
| `reservations` | `branchId` |
| `tour_bookings` | `bookedById`, `branchId` |
| `working_times` | `userId` |
| `consultations` | `userId` |

---

## 5. BESTANDSAUFNAHME: KOMPONENTEN MIT FEHLER

### 5.1 Falsche Verwendung (Box/Tab statt Button)

| Komponente | Aktuelle Prüfung | Korrekte Prüfung |
|------------|------------------|------------------|
| `Requests.tsx` | `hasPermission('requests', 'write', 'table')` | `hasPermission('request_create', 'write', 'button')` etc. |
| `Worktracker.tsx` (Tasks) | `hasPermission('tasks', 'write', 'table')` | `hasPermission('task_create', 'write', 'button')` etc. |
| `Worktracker.tsx` (Reservations) | `hasPermission('reservations', 'write', 'tab')` | `hasPermission('reservation_create', 'write', 'button')` etc. |
| `BranchManagementTab.tsx` | `hasPermission('branches', 'write', 'table')` | `hasPermission('branch_create', 'write', 'button')` etc. |
| `RoleManagementTab.tsx` | `hasPermission('roles', 'write', 'table')` | `hasPermission('role_create', 'write', 'button')` etc. |
| `Cerebro.tsx` | `hasPermission('cerebro', 'both', 'button')` | `hasPermission('cerebro_article_create', 'write', 'button')` etc. |

### 5.2 Korrekte Verwendung (als Referenz)

| Komponente | Prüfung |
|------------|---------|
| `ToursTab.tsx` | `hasPermission('tour_create', 'write', 'button')`, `hasPermission('tour_edit', 'write', 'button')` |
| `PasswordManagerTab.tsx` | `hasPermission('password_entry_create', 'write', 'button')` |
| `PricingRulesTab.tsx` | `hasPermission('price_analysis_create_rule', 'write', 'button')` etc. |
| `InvoiceManagementTab.tsx` | `hasPermission('invoice_mark_paid', 'write', 'button')` etc. |
| `OrganizationSettings.tsx` | `hasPermission('organization_edit', 'write', 'button')` |

---

## 6. CHECKLISTE FÜR NEUE IMPLEMENTIERUNGEN

### 6.1 Bei neuen Komponenten

- [ ] Prüfe, welche Button-Entitäten existieren (siehe `frontend/src/config/permissions.ts`)
- [ ] Für jeden Button (Create, Edit, Delete, etc.) die entsprechende Button-Berechtigung verwenden
- [ ] Bei `own_both` Berechtigung: Ownership-Prüfung hinzufügen
- [ ] NIEMALS Box/Tab-Berechtigung für Buttons verwenden

### 6.2 Bei bestehenden Komponenten (Fehler gefunden)

- [ ] Prüfe, ob Box/Tab-Berechtigung für Buttons verwendet wird
- [ ] Ersetze durch entsprechende Button-Berechtigung
- [ ] Füge Ownership-Prüfung hinzu, wenn nötig

---

## 7. HELPER-FUNKTIONEN (OPTIONAL)

Für häufig verwendete Muster können Helper-Funktionen in `usePermissions.ts` hinzugefügt werden:

```typescript
/**
 * Prüft, ob User eine Aktion auf einem Element ausführen kann
 * Berücksichtigt Ownership bei own_both/own_read
 * 
 * @param buttonEntity - Button-Entity (z.B. 'request_edit')
 * @param requiredLevel - 'read' oder 'write'
 * @param isOwner - Ob der User Owner des Elements ist
 */
const canPerformAction = (
  buttonEntity: string,
  requiredLevel: 'read' | 'write',
  isOwner: boolean
): boolean => {
  const accessLevel = getAccessLevel(buttonEntity, 'button');
  
  if (accessLevel === 'none') return false;
  if (accessLevel === 'all_both') return true;
  if (accessLevel === 'all_read') return requiredLevel === 'read';
  
  if (!isOwner) return false;
  
  if (accessLevel === 'own_both') return true;
  if (accessLevel === 'own_read') return requiredLevel === 'read';
  
  return false;
};
```

---

## 8. ZUSAMMENFASSUNG

| Bereich | Regel |
|---------|-------|
| **Create-Button** | `hasPermission('{entity}_create', 'write', 'button')` |
| **Edit-Button** | `hasPermission('{entity}_edit', 'write', 'button')` + Ownership-Prüfung bei `own_both` |
| **Delete-Button** | `hasPermission('{entity}_delete', 'write', 'button')` + Ownership-Prüfung bei `own_both` |
| **Sichtbarkeit von Box/Tab** | `canView('{entity}', 'box')` oder `canView('{entity}', 'tab')` |
| **Daten-Filterung** | `getAccessLevel('{entity}', 'box')` oder `getAccessLevel('{entity}', 'tab')` für Backend-Filter |

---

**Erstellt:** 2025-01-31  
**Status:** ✅ STANDARD DEFINIERT


