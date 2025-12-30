# Berechtigungssystem - Vollständige Dokumentation

**Datum:** 2024-12-17 (letzte Aktualisierung: 2024-12-28)  
**Status:** Implementierung abgeschlossen

---

## Übersicht

Dieses Dokument fasst alle Analysen, Probleme, Lösungen und Implementierungen zum Berechtigungssystem zusammen.

---

## 1. Implementierung

### 1.1 Zentrale Permission-Definitionen

**Neues AccessLevel-Format:**
```typescript
type AccessLevel = 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both';
```

- `none`: Kein Zugriff
- `own_read`: Nur eigene Daten lesen
- `own_both`: Eigene Daten lesen und bearbeiten
- `all_read`: Alle Daten lesen
- `all_both`: Alle Daten lesen und bearbeiten (Admin)

### 1.2 EntityType-Hierarchie

```
PAGE (Seitenebene - Sidebar/Footer)
  └── BOX (Container auf Seiten)
        └── TAB (Tabs innerhalb von Seiten)
              └── BUTTON (Aktions-Buttons)
```

### 1.3 Standardrollen

**Admin (all_both für alles):**
- Vollzugriff auf alle Pages, Boxes, Tabs, Buttons
- Sieht alle Daten aller Benutzer

**User (selektiv own_both/all_both):**
- Dashboard, Worktracker, Consultations: all_both
- Todos, Requests: own_both (nur eigene)
- Workcenter, Organisation, Price Analysis: none

**Hamburger (minimal, nur lesen):**
- Dashboard: all_read
- Cerebro: all_read
- Settings, Profile: all_both
- Alle anderen: none

---

## 2. Identifizierte Probleme

### 2.1 Sprachinkonsistenzen

**4 Stellen identifiziert:**
1. `organisation.tabs.providers` in de.json hat spanischen Wert "Proveedores" → sollte "Anbieter" sein
2. Fehlende Keys: `roles.form.allBranches`, `roles.form.specificBranches` in allen Sprachen
3. Hardcodierte deutsche Texte in `RoleManagementTab.tsx` (2 Stellen)

**Lösung:**
- ✅ Übersetzungskeys korrigiert
- ✅ Fehlende Keys hinzugefügt
- ✅ Hardcodierte Texte durch `t()` ersetzt

### 2.2 Organisationsübergreifende Daten-Anzeige

**Problem:**
- 11 Entities betroffen (role, branch, request, worktime, client, invoice, etc.)
- 17 Controller verwenden `getDataIsolationFilter`
- `getDataIsolationFilter` gibt `{ organizationId: req.organizationId }` zurück, auch wenn `null`/`undefined`
- Prisma-Verhalten:
  - `{ organizationId: null }` → Findet Einträge wo `organizationId IS NULL`
  - `{ organizationId: undefined }` → Filter wird ignoriert → **ALLE Einträge**

**Lösung:**
- ✅ `getDataIsolationFilter` prüft jetzt explizit auf `null`/`undefined`
- ✅ Nur wenn `organizationId` gesetzt ist, wird Filter angewendet
- ✅ Alle 17 Controller aktualisiert

---

## 3. Implementierte Fixes

### 3.1 Fix v1-v3

**v1 (berechtigungssystem_fix_2024-12-17.md):**
- Sprachinkonsistenzen behoben
- Fehlende Übersetzungskeys hinzugefügt

**v2 (berechtigungssystem_v2_2024-12-17.md):**
- Zentrale Permission-Definitionen
- Neues AccessLevel-Format
- Backend-Enforcement mit checkPermission

**v3 (berechtigungssystem_fixes_v3_2024-12-17.md):**
- Organisationsübergreifende Daten-Anzeige behoben
- `getDataIsolationFilter` korrigiert
- Alle Controller aktualisiert

### 3.2 Dokumentations-Aktualisierung (2024-12-28)

- ✅ Vollständige Dokumentation aktualisiert
- ✅ Alle Code-Referenzen korrigiert
- ✅ Testfälle dokumentiert

---

## 4. Geänderte Dateien

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
| `frontend/src/components/RoleManagementTab.tsx` | Hardcodierte Texte durch t() ersetzt |
| `frontend/src/i18n/locales/de.json` | Übersetzungskeys korrigiert/hinzugefügt |
| `frontend/src/i18n/locales/en.json` | Übersetzungskeys hinzugefügt |
| `frontend/src/i18n/locales/es.json` | Übersetzungskeys hinzugefügt |

---

## 5. Route→Permission-Mapping

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

---

## 6. Testfälle

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

---

## 7. Migration bestehender Daten

Die neuen AccessLevel-Werte sind abwärtskompatibel:
- `read` → `all_read`
- `write` → `own_both`
- `both` → `all_both`

Die Konvertierung erfolgt automatisch in:
- `backend/src/middleware/permissionMiddleware.ts` (convertLegacyAccessLevel)
- `frontend/src/hooks/usePermissions.ts` (convertLegacyAccessLevel)

---

## 8. Code-Referenzen

### Zentrale Dateien
- **Backend Permissions**: `backend/src/config/permissions.ts`
- **Frontend Permissions**: `frontend/src/config/permissions.ts`
- **Permission Middleware**: `backend/src/middleware/permissionMiddleware.ts`
- **Organization Middleware**: `backend/src/middleware/organization.ts`
- **Permissions Hook**: `frontend/src/hooks/usePermissions.ts`

### Seed-Datei
- **Permission-Definitionen**: `backend/prisma/seed.ts` (inline)

---

## 9. Nächste Schritte

1. ✅ Server neu gestartet (Backend neu kompiliert)
2. ✅ Seed ausgeführt (`npx prisma db seed`) um bestehende Rollen zu aktualisieren
3. ✅ Manueller Test mit verschiedenen Benutzerrollen
4. ✅ Überwachung der Logs auf verweigerte Zugriffe

---

## 10. Zusammenfassung der Probleme und Lösungen

### Problem 1: Sprachinkonsistenzen ✅ GELÖST
- **Ursache:** Fehlende Übersetzungskeys, falsche Übersetzung in de.json
- **Lösung:** Alle Übersetzungskeys korrigiert/hinzugefügt, hardcodierte Texte durch t() ersetzt

### Problem 2: Organisationsübergreifende Daten-Anzeige ✅ GELÖST
- **Ursache:** `getDataIsolationFilter` gab `{ organizationId: null }` zurück
- **Lösung:** Explizite Prüfung auf `null`/`undefined`, Filter nur wenn gesetzt

### Problem 3: Zentrale Permission-Definitionen ✅ IMPLEMENTIERT
- **Lösung:** Zentrale Dateien `backend/src/config/permissions.ts` und `frontend/src/config/permissions.ts`
- **Vorteil:** Einheitliche Definitionen, einfache Wartung

