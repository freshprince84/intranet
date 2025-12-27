# Berechtigungssystem v2 - Komplette Überarbeitung

**Datum:** 2024-12-17  
**Status:** ✅ IMPLEMENTIERT

---

## Überblick

Die Permission-Struktur wurde komplett neu aufgebaut gemäß dem definierten Plan. Die neue Struktur ist:
- **Zentral definiert** in `permissionStructure.ts`
- **Hierarchisch**: PAGE > BOX/TAB > BUTTON
- **Korrekte Ausprägungen** pro Element-Typ

---

## Neue Dateien

### 1. `frontend/src/config/permissionStructure.ts`
Zentrale Definition der Permission-Struktur mit:
- `PERMISSION_STRUCTURE`: Hierarchische Struktur aller Pages, Boxes, Tabs, Buttons
- `PermissionOptions`: 'binary' (ja/nein) oder 'ternary' (alle/eigene/nein)
- Hilfsfunktionen: `getAllEntities()`, `getDefaultPermissionsForRole()`, `getAccessLevelOptions()`

### 2. `frontend/src/components/PermissionEditor.tsx`
Neue UI-Komponente für das Bearbeiten von Berechtigungen:
- Hierarchische Darstellung gemäß Plan
- Aufklapp-/Zuklapp-Funktionalität pro Page
- Bulk-Actions: "Alle auf Ja", "Alle auf Nein"
- Korrekte Dropdowns je nach Element-Typ

### 3. `backend/src/config/permissionStructure.ts`
Synchronisierte Kopie für das Backend.

---

## Permission-Struktur (gemäß Plan)

```
PAGE dashboard (ja/nein)
  └ BOX requests (alle/eigene/nein)
      └ BUTTON request_create/edit/delete (alle/eigene/nein)

PAGE worktracker (ja/nein)
  └ BOX zeiterfassung
      └ BUTTON worktime_start/stop (ja/nein)
  └ TAB todos (alle/eigene/nein)
      └ BUTTON todo_create/edit/delete (alle/eigene/nein)
  └ TAB reservations (alle/eigene/nein)
      └ BUTTON reservation_create/edit/delete (alle/eigene/nein)
  └ TAB tours (alle/eigene/nein)
      └ BUTTON tour_booking_create/edit/delete (alle/eigene/nein)

PAGE consultations (ja/nein)
  └ BOX consultas (Container)
      └ BUTTON consultation_start/stop/plan (ja/nein)
      └ BUTTON client_create (ja/nein)
  └ BOX consultation_list (alle/eigene/nein)
      └ BUTTON consultation_edit/delete (alle/eigene/nein)

PAGE team_worktime_control (ja/nein) - Workcenter
  └ TAB arbeitszeiten (alle/eigene/nein)
      └ BUTTON team_worktime_create/edit/delete (alle/eigene/nein)
  └ TAB plan_de_turnos (alle/eigene/nein)
      └ BUTTON shift_create/edit/delete (ja/nein)
      └ BUTTON shift_exchange_request (ja/nein)
  └ TAB task_analytics (alle/eigene/nein)
  └ TAB request_analytics (alle/eigene/nein)

PAGE payroll (ja/nein) - Nómina
  └ TAB beratungsrechnungen (alle/eigene/nein)
  └ TAB monatsrechnungen (alle/eigene/nein)
  └ TAB lohnabrechnungen (alle/eigene/nein)

PAGE cerebro (ja/nein)

PAGE organization_management (ja/nein)
  └ TAB users_tab (alle/eigene/nein)
      └ BUTTON user_create/edit/delete (ja/nein)
  └ TAB roles_tab (alle/eigene/nein)
      └ BUTTON role_create/edit/delete (ja/nein)
  └ TAB branches_tab (alle/eigene/nein)
      └ BUTTON branch_create/edit/delete (ja/nein)
  └ TAB provedores_tab (alle/eigene/nein)
      └ BUTTON tour_provider_create/edit/delete (ja/nein)
      └ BUTTON tour_create/edit/delete (ja/nein)
  └ TAB organization_tab (alle/eigene/nein)
      └ BUTTON organization_create/edit/delete (ja/nein)

PAGE price_analysis (ja/nein)

PAGE settings (ja/nein) - Konfiguration
  └ TAB password_manager (alle/eigene/nein)

PAGE profile (ja/nein)
```

---

## Ausprägungen

| Element-Typ | Optionen | Werte |
|-------------|----------|-------|
| PAGE | binary | `none`, `all_both` |
| BOX (Container) | - | keine eigene Berechtigung |
| BOX (mit Daten) | ternary | `none`, `own_both`, `all_both` |
| TAB | ternary | `none`, `own_both`, `all_both` |
| BUTTON | binary | `none`, `all_both` |
| BUTTON (Daten-Aktionen) | ternary | `none`, `own_both`, `all_both` |

---

## Änderungen an bestehenden Dateien

### `frontend/src/components/RoleManagementTab.tsx`
- Import der neuen `PermissionEditor` Komponente
- Ersetzen der komplexen alten Permission-Rendering-Logik durch `<PermissionEditor />`
- Beide Ansichten (Mobile Modal + Desktop Sidepane) verwenden jetzt die neue Komponente

### `frontend/src/i18n/locales/{de,en,es}.json`
- Neue Übersetzungen: `common.expandAll`, `common.collapseAll`

---

## Branch-Migration

- **18 Tasks** von "Nowhere" → "Parque Poblado" migriert
- **45 Requests** migriert
- **31 UsersBranches** migriert
- **Branch "Nowhere"** gelöscht
- **"Hauptsitz"** bleibt (hat noch 40 Referenzen)

---

## Backend-Fix: Datenisolation

In `backend/src/middleware/organization.ts`:
- Admin bekommt jetzt `{ organizationId: req.organizationId }` statt leeren Filter `{}`
- Verhindert organisationsübergreifende Datenzugriffe

---

## Nächste Schritte

1. **Server neu starten** (Backend-Änderungen erfordern Neustart)
2. **Testen** der neuen Permission-UI im Frontend
3. **Seed-Daten prüfen** ob sie mit der neuen Struktur kompatibel sind
