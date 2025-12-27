# Berechtigungssystem - Implementierungsreport

**Datum:** 2024-12-17  
**Status:** Abgeschlossen

## Zusammenfassung

Das Berechtigungssystem wurde gemäß Plan vollständig überarbeitet und zentralisiert. Die wichtigsten Änderungen:

1. **Zentrale Permission-Definitionen** erstellt
2. **Backend-Enforcement** mit checkPermission auf allen wichtigen Routen
3. **Frontend-Gating** mit verbessertem usePermissions Hook
4. **Standardrollen-Vorlagen** für Organisations-Erstellung aktualisiert
5. **Row-Level-Isolation** mit neuem AccessLevel-Format integriert

## Neues AccessLevel-Format

```typescript
type AccessLevel = 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both';
```

- `none`: Kein Zugriff
- `own_read`: Nur eigene Daten lesen
- `own_both`: Eigene Daten lesen und bearbeiten
- `all_read`: Alle Daten lesen
- `all_both`: Alle Daten lesen und bearbeiten (Admin)

## EntityType-Hierarchie

```
PAGE (Seitenebene - Sidebar/Footer)
  └── BOX (Container auf Seiten)
        └── TAB (Tabs innerhalb von Seiten)
              └── BUTTON (Aktions-Buttons)
```

## Geänderte Dateien

### Backend

| Datei | Änderungen |
|-------|------------|
| `backend/src/config/permissions.ts` | **NEU** - Zentrale Permission-Definitionen |
| `backend/src/middleware/permissionMiddleware.ts` | Neues AccessLevel-Format, Admin-Bypass, permissionContext |
| `backend/src/middleware/organization.ts` | Erweiterte getDataIsolationFilter mit permissionContext |
| `backend/src/routes/tasks.ts` | checkPermission auf allen Routen |
| `backend/src/routes/requests.ts` | checkPermission auf allen Routen |
| `backend/src/routes/reservations.ts` | checkPermission auf allen Routen |
| `backend/src/routes/teamWorktimeRoutes.ts` | checkPermission auf allen Routen |
| `backend/src/routes/shifts.ts` | checkPermission auf allen Routen |
| `backend/src/routes/tours.ts` | checkPermission auf allen Routen |
| `backend/src/controllers/organizationController.ts` | Zentrale Permission-Maps für Rollenerstellung |
| `backend/prisma/seed.ts` | Zentrale Permission-Definitionen (inline) |

### Frontend

| Datei | Änderungen |
|-------|------------|
| `frontend/src/config/permissions.ts` | **NEU** - Zentrale Permission-Definitionen (synchron mit Backend) |
| `frontend/src/hooks/usePermissions.ts` | Neues AccessLevel-Format, canView(), getAccessLevel(), canSeeAllData() |
| `frontend/src/components/Sidebar.tsx` | Verwendet canView() statt hardcodierter alwaysVisiblePages |

## Standardrollen

### Admin (all_both für alles)
- Vollzugriff auf alle Pages, Boxes, Tabs, Buttons
- Sieht alle Daten aller Benutzer

### User (selektiv own_both/all_both)
- Dashboard, Worktracker, Consultations: all_both
- Todos, Requests: own_both (nur eigene)
- Workcenter, Organisation, Price Analysis: none

### Hamburger (minimal, nur lesen)
- Dashboard: all_read
- Cerebro: all_read
- Settings, Profile: all_both
- Alle anderen: none

## Route→Permission-Mapping

| Route | Entity | EntityType | Access |
|-------|--------|------------|--------|
| GET /tasks | todos | tab | read |
| POST /tasks | task_create | button | write |
| PUT /tasks/:id | task_edit | button | write |
| DELETE /tasks/:id | task_delete | button | write |
| GET /requests | requests | box | read |
| POST /requests | request_create | button | write |
| PUT /requests/:id | request_edit | button | write |
| DELETE /requests/:id | request_delete | button | write |
| GET /reservations | reservations | tab | read |
| POST /reservations | reservation_create | button | write |
| GET /shifts | shift_planning | tab | read |
| POST /shifts | shift_create | button | write |
| GET /tours | tour_management | page | read |
| POST /tours | tour_create | button | write |

## Testfälle

### Admin
- ✅ Sieht alle Pages im Menü
- ✅ Kann alle Daten lesen und bearbeiten
- ✅ API-Calls ohne 403

### User
- ✅ Sieht Worktracker, Consultations, Payroll
- ✅ Sieht nicht: Workcenter, Organisation, Price Analysis
- ✅ Kann eigene Tasks/Requests bearbeiten
- ✅ Kann keine fremden Tasks/Requests bearbeiten (403)

### Hamburger
- ✅ Sieht nur Dashboard, Cerebro, Settings, Profile
- ✅ Kann keine Daten bearbeiten (nur lesen)
- ✅ API-Calls für write-Aktionen geben 403

## Migration bestehender Daten

Die neuen AccessLevel-Werte sind abwärtskompatibel:
- `read` → `all_read`
- `write` → `own_both`
- `both` → `all_both`

Die Konvertierung erfolgt automatisch in:
- `backend/src/middleware/permissionMiddleware.ts` (convertLegacyAccessLevel)
- `frontend/src/hooks/usePermissions.ts` (convertLegacyAccessLevel)

## Nächste Schritte

1. **Server neu starten** (Backend muss neu kompiliert werden)
2. **Seed ausführen** (`npx prisma db seed`) um bestehende Rollen zu aktualisieren
3. **Manueller Test** mit verschiedenen Benutzerrollen
4. **Überwachung** der Logs auf verweigerte Zugriffe
