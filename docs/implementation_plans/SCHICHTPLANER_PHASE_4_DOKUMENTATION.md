# Schichtplaner Phase 4: Templates Management - Dokumentation

## 📋 Übersicht

Phase 4 implementiert die vollständige Verwaltung von Schicht-Templates. User können Templates erstellen, bearbeiten, löschen und aktivieren/deaktivieren.

**Status:** ✅ Abgeschlossen  
**Datum:** 2025-01-XX  
**Implementiert von:** AI Assistant

---

## 🎯 Ziele

1. UI-Komponente zur Verwaltung aller Schicht-Templates
2. CRUD-Operationen (Create, Read, Update, Delete)
3. Aktivieren/Deaktivieren von Templates
4. Integration in ShiftPlannerTab
5. Vollständige Translations (de, en, es)
6. Responsive Design (Sidepane Desktop, Modal Mobile)

---

## 📁 Implementierte Dateien

### 1. ShiftTemplateManagement.tsx

**Pfad:** `frontend/src/components/teamWorktime/ShiftTemplateManagement.tsx`

**Funktionalität:**
- Liste aller Templates anzeigen
- Template erstellen
- Template bearbeiten
- Template löschen
- Template aktivieren/deaktivieren
- Responsive: Modal auf Mobile (< 640px), Sidepane auf Desktop (≥ 640px, max-w-2xl)

**Formular-Felder:**
- **Name** (required): Text-Input
- **Niederlassung** (required): Dropdown (beim Editieren disabled)
- **Rolle** (required): Dropdown (beim Editieren disabled)
- **Startzeit** (required): Time-Input (HH:mm)
- **Endzeit** (required): Time-Input (HH:mm)
- **Dauer** (optional): Number-Input (Minuten)
- **Aktiv** (optional): Checkbox (default: true)

**Validierung:**
- Pflichtfelder prüfen
- Backend prüft:
  - Name-Eindeutigkeit (Rolle + Branch)
  - Zeitformat (HH:mm)
  - Startzeit < Endzeit

**API-Integration:**
- Endpoint: `GET /api/shifts/templates?includeInactive=true`
- Create: `POST /api/shifts/templates`
- Update: `PUT /api/shifts/templates/:id`
- Delete: `DELETE /api/shifts/templates/:id`

**Features:**
- **Liste:** Zeigt alle Templates mit Details (Name, Branch, Rolle, Zeiten, Status)
- **Inaktiv-Badge:** Zeigt "Inaktiv" Badge bei inaktiven Templates
- **Edit/Delete Buttons:** Icon-Buttons für jede Aktion
- **Formular:** Inline-Formular (öffnet sich in der Liste)
- **Bestätigung:** Delete-Bestätigung per `window.confirm`

**Pattern:**
- Sidepane auf Desktop (≥ 640px, max-w-2xl)
- Modal auf Mobile (< 640px)
- Verwendet `useSidepane` Context für Sidepane-Management
- Backdrop nur bei Desktop < 1070px

---

### 2. ShiftPlannerTab.tsx - Integration

**Änderungen:**
- Import: `ShiftTemplateManagement` hinzugefügt
- State: `isTemplateManagementOpen` hinzugefügt
- Button: "Schicht-Templates" Button im Header hinzugefügt
  - Position: Links neben Swap List Button
  - Design: Icon-only Button (Dokument-Icon) mit Tooltip
  - Tooltip: `teamWorktime.shifts.templates.title`
- Modal: `ShiftTemplateManagement` am Ende der Komponente hinzugefügt

**Button-Design:**
- Icon-only Button (wie andere Header-Buttons)
- Tooltip bei Hover
- Position: Links neben Swap List Button
- Spacing: `gap-1` zwischen Buttons

---

### 3. Translations

**Dateien aktualisiert:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Neue Keys unter `teamWorktime.shifts.templates`:**

```json
{
  "title": "Schicht-Templates",
  "createTitle": "Template erstellen",
  "editTitle": "Template bearbeiten",
  "noTemplates": "Keine Templates gefunden",
  "inactive": "Inaktiv",
  "minutes": "Minuten",
  "deleteConfirm": "Möchten Sie dieses Template wirklich löschen?",
  "form": {
    "name": "Name",
    "branch": "Niederlassung",
    "role": "Rolle",
    "startTime": "Startzeit",
    "endTime": "Endzeit",
    "duration": "Dauer (Minuten)",
    "durationPlaceholder": "Optional",
    "isActive": "Aktiv",
    "selectBranch": "Niederlassung auswählen",
    "selectRole": "Rolle auswählen"
  },
  "errors": {
    "loadError": "Fehler beim Laden der Templates",
    "fillRequiredFields": "Bitte füllen Sie alle Pflichtfelder aus",
    "saveError": "Fehler beim Speichern des Templates",
    "deleteError": "Fehler beim Löschen des Templates"
  }
}
```

---

## 🔧 Technische Details

### Datenfluss

1. **Komponente öffnet** → `fetchData()` lädt Templates, Rollen, Branches
2. **Template erstellen** → Formular öffnet, User füllt aus → `POST /api/shifts/templates`
3. **Template bearbeiten** → Formular öffnet mit Daten → `PUT /api/shifts/templates/:id`
4. **Template löschen** → Bestätigung → `DELETE /api/shifts/templates/:id`
5. **Nach CRUD** → `fetchData()` lädt Daten neu

### API-Endpoints verwendet

- `GET /api/shifts/templates?includeInactive=true` - Lädt alle Templates (inkl. inaktive)
- `GET /api/roles` - Lädt alle Rollen
- `GET /api/branches` - Lädt alle Branches
- `POST /api/shifts/templates` - Erstellt neues Template
- `PUT /api/shifts/templates/:id` - Aktualisiert Template
- `DELETE /api/shifts/templates/:id` - Löscht Template

### Backend-Validierung

**Beim Erstellen:**
- `roleId` und `branchId` müssen existieren
- `name` muss eindeutig sein (Kombination: roleId + branchId + name)
- `startTime` und `endTime` müssen im Format HH:mm sein
- `startTime` muss vor `endTime` liegen

**Beim Bearbeiten:**
- Name-Eindeutigkeit wird nur geprüft, wenn sich Name geändert hat
- Branch und Rolle können nicht geändert werden (disabled im Frontend)

### Fehlerbehandlung

- **Laden der Daten:** Zeigt Fehlermeldung, wenn API-Call fehlschlägt
- **Speichern:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Löschen:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Validierung:** Client-seitige Validierung vor API-Call

---

## ✅ Abgeschlossene Aufgaben

- [x] ShiftTemplateManagement.tsx erstellen
- [x] Liste aller Templates anzeigen
- [x] Template erstellen (Formular)
- [x] Template bearbeiten (Formular)
- [x] Template löschen (mit Bestätigung)
- [x] Aktiv/Inaktiv Toggle
- [x] Responsive Design (Modal Mobile, Sidepane Desktop)
- [x] Integration in ShiftPlannerTab
- [x] Translations (de, en, es)
- [x] API-Integration
- [x] Fehlerbehandlung
- [x] Linter-Fehler prüfen und beheben

---

## 🧪 Test-Hinweise

**Zu testen:**
1. Button "Schicht-Templates" öffnet Modal/Sidepane
2. Liste zeigt alle Templates korrekt an
3. "Inaktiv" Badge wird bei inaktiven Templates angezeigt
4. Template erstellen funktioniert
5. Formular-Validierung funktioniert
6. Template bearbeiten funktioniert
7. Branch/Rolle sind beim Editieren disabled
8. Template löschen funktioniert (mit Bestätigung)
9. Aktiv/Inaktiv Toggle funktioniert
10. Responsive Design funktioniert (Mobile/Desktop)

---

## 📝 Notizen

- **Pattern:** Sidepane auf Desktop, Modal auf Mobile (wie CreateTaskModal)
- **Translations:** Alle Texte in de.json, en.json, es.json
- **API:** Endpoints `/api/shifts/templates/*` waren bereits vorhanden
- **Backend:** CRUD-Logik war bereits vollständig implementiert
- **Eindeutigkeit:** Template-Name muss eindeutig sein pro Rolle + Branch
- **Editieren:** Branch und Rolle können nicht geändert werden (disabled)

---

## 🔄 Nächste Schritte

**Phase 5:** Availability Management
- Availability Tab/Modal
- CRUD für Verfügbarkeiten

**Phase 6:** Filter-Funktionalität
- Filter-Panel
- Branch, Rolle, Status, User Filter

