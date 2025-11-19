# Schichtplaner Phase 5: Availability Management - Dokumentation

## 📋 Übersicht

Phase 5 implementiert die vollständige Verwaltung von User-Verfügbarkeiten. User können ihre Verfügbarkeiten für bestimmte Wochentage, Zeitfenster, Branches und Rollen definieren.

**Status:** ✅ Abgeschlossen  
**Datum:** 2025-01-XX  
**Implementiert von:** AI Assistant

---

## 🎯 Ziele

1. UI-Komponente zur Verwaltung aller Verfügbarkeiten (für aktuellen User)
2. CRUD-Operationen (Create, Read, Update, Delete)
3. Flexible Verfügbarkeits-Definition (Wochentag, Zeitfenster, Datumsbereich, Branch, Rolle)
4. Typ-System (available/preferred/unavailable) mit Priorität
5. Integration in ShiftPlannerTab
6. Vollständige Translations (de, en, es)
7. Responsive Design (Sidepane Desktop, Modal Mobile)

---

## 📁 Implementierte Dateien

### 1. AvailabilityManagement.tsx

**Pfad:** `frontend/src/components/teamWorktime/AvailabilityManagement.tsx`

**Funktionalität:**
- Liste aller Verfügbarkeiten für aktuellen User anzeigen
- Verfügbarkeit erstellen
- Verfügbarkeit bearbeiten
- Verfügbarkeit löschen
- Verfügbarkeit aktivieren/deaktivieren
- Responsive: Modal auf Mobile (< 640px), Sidepane auf Desktop (≥ 640px, max-w-2xl)

**Formular-Felder:**
- **Niederlassung** (optional): Dropdown
- **Rolle** (optional): Dropdown
- **Wochentag** (optional): Dropdown (Alle Tage / Sonntag-Samstag)
- **Startzeit** (optional): Time-Input (HH:mm)
- **Endzeit** (optional): Time-Input (HH:mm)
- **Startdatum** (optional): Date-Input (Gültigkeitszeitraum)
- **Enddatum** (optional): Date-Input (Gültigkeitszeitraum)
- **Typ** (required): Dropdown (available/preferred/unavailable)
- **Priorität** (required): Number-Input (1-10, default: 5)
- **Notizen** (optional): Textarea
- **Aktiv** (optional): Checkbox (default: true)

**Validierung:**
- Backend prüft:
  - Wochentag: 0-6 oder null
  - Zeitformat: HH:mm
  - Startzeit < Endzeit (wenn beide gesetzt)
  - Startdatum < Enddatum (wenn beide gesetzt)
  - Typ: available/preferred/unavailable
  - Priorität: 1-10

**API-Integration:**
- Endpoint: `GET /api/shifts/availabilities?userId={userId}&includeInactive=true`
- Create: `POST /api/shifts/availabilities` (userId wird automatisch gesetzt)
- Update: `PUT /api/shifts/availabilities/:id`
- Delete: `DELETE /api/shifts/availabilities/:id`

**Features:**
- **Liste:** Zeigt alle Verfügbarkeiten mit Details
- **Typ-Badges:** Farbcodierte Badges (available=grün, preferred=blau, unavailable=rot)
- **Inaktiv-Badge:** Zeigt "Inaktiv" Badge bei inaktiven Verfügbarkeiten
- **Priorität:** Zeigt Priorität (1-10)
- **Details:** Zeigt Wochentag, Zeitfenster, Datumsbereich, Branch, Rolle, Notizen
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
- Import: `AvailabilityManagement` hinzugefügt
- State: `isAvailabilityManagementOpen` hinzugefügt
- Button: "Verfügbarkeiten" Button im Header hinzugefügt
  - Position: Links neben Templates Button
  - Design: Icon-only Button (Checkbox-Icon) mit Tooltip
  - Tooltip: `teamWorktime.shifts.availabilities.title`
- Modal: `AvailabilityManagement` am Ende der Komponente hinzugefügt

**Button-Design:**
- Icon-only Button (wie andere Header-Buttons)
- Tooltip bei Hover
- Position: Links neben Templates Button
- Spacing: `gap-1` zwischen Buttons

---

### 3. Translations

**Dateien aktualisiert:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Neue Keys unter `teamWorktime.shifts.availabilities`:**

```json
{
  "title": "Verfügbarkeiten",
  "createTitle": "Verfügbarkeit erstellen",
  "editTitle": "Verfügbarkeit bearbeiten",
  "noAvailabilities": "Keine Verfügbarkeiten gefunden",
  "inactive": "Inaktiv",
  "priority": "Priorität",
  "deleteConfirm": "Möchten Sie diese Verfügbarkeit wirklich löschen?",
  "form": {
    "branch": "Niederlassung",
    "role": "Rolle",
    "dayOfWeek": "Wochentag",
    "allDays": "Alle Tage",
    "sunday": "Sonntag",
    "monday": "Montag",
    "tuesday": "Dienstag",
    "wednesday": "Mittwoch",
    "thursday": "Donnerstag",
    "friday": "Freitag",
    "saturday": "Samstag",
    "startTime": "Startzeit",
    "endTime": "Endzeit",
    "startDate": "Startdatum",
    "endDate": "Enddatum",
    "type": "Typ",
    "priority": "Priorität",
    "notes": "Notizen",
    "isActive": "Aktiv",
    "selectBranch": "Niederlassung auswählen (optional)",
    "selectRole": "Rolle auswählen (optional)",
    "startTimeHint": "Optional: Wenn leer, ganzer Tag verfügbar",
    "endTimeHint": "Optional: Wenn leer, ganzer Tag verfügbar",
    "startDateHint": "Optional: Gültigkeitszeitraum Start",
    "endDateHint": "Optional: Gültigkeitszeitraum Ende",
    "notesPlaceholder": "Optionale Notizen..."
  },
  "type": {
    "available": "Verfügbar",
    "preferred": "Bevorzugt",
    "unavailable": "Nicht verfügbar"
  },
  "errors": {
    "loadError": "Fehler beim Laden der Verfügbarkeiten",
    "fillRequiredFields": "Bitte füllen Sie alle Pflichtfelder aus",
    "saveError": "Fehler beim Speichern der Verfügbarkeit",
    "deleteError": "Fehler beim Löschen der Verfügbarkeit"
  }
}
```

---

## 🔧 Technische Details

### Datenfluss

1. **Komponente öffnet** → `fetchData()` lädt Verfügbarkeiten, Rollen, Branches
2. **Verfügbarkeit erstellen** → Formular öffnet, User füllt aus → `POST /api/shifts/availabilities` (userId automatisch)
3. **Verfügbarkeit bearbeiten** → Formular öffnet mit Daten → `PUT /api/shifts/availabilities/:id`
4. **Verfügbarkeit löschen** → Bestätigung → `DELETE /api/shifts/availabilities/:id`
5. **Nach CRUD** → `fetchData()` lädt Daten neu

### API-Endpoints verwendet

- `GET /api/shifts/availabilities?userId={userId}&includeInactive=true` - Lädt alle Verfügbarkeiten für User
- `GET /api/roles` - Lädt alle Rollen
- `GET /api/branches` - Lädt alle Branches
- `POST /api/shifts/availabilities` - Erstellt neue Verfügbarkeit (userId automatisch)
- `PUT /api/shifts/availabilities/:id` - Aktualisiert Verfügbarkeit
- `DELETE /api/shifts/availabilities/:id` - Löscht Verfügbarkeit

### Backend-Validierung

**Beim Erstellen:**
- `userId` wird automatisch gesetzt (eingeloggter User)
- `dayOfWeek`: 0-6 oder null (null = alle Tage)
- `startTime`/`endTime`: Format HH:mm (optional)
- `startTime` < `endTime` (wenn beide gesetzt)
- `startDate` < `endDate` (wenn beide gesetzt)
- `type`: available/preferred/unavailable
- `priority`: 1-10 (default: 5)

**Berechtigung:**
- User kann nur eigene Verfügbarkeiten erstellen/bearbeiten/löschen
- Admin kann Verfügbarkeiten für alle User verwalten

### Verfügbarkeits-Logik

**Wochentag:**
- `null` = alle Tage
- `0` = Sonntag
- `1` = Montag
- ...
- `6` = Samstag

**Zeitfenster:**
- `startTime`/`endTime` beide `null` = ganzer Tag
- `startTime`/`endTime` gesetzt = spezifisches Zeitfenster

**Gültigkeitszeitraum:**
- `startDate`/`endDate` beide `null` = unbegrenzt
- `startDate`/`endDate` gesetzt = spezifischer Zeitraum

**Typ:**
- `available`: Standard-Verfügbarkeit
- `preferred`: Bevorzugte Verfügbarkeit (höhere Priorität bei automatischer Planung)
- `unavailable`: Nicht verfügbar

**Priorität:**
- 1-10, höher = bevorzugt bei automatischer Planung
- Wird zusammen mit Typ verwendet

### Fehlerbehandlung

- **Laden der Daten:** Zeigt Fehlermeldung, wenn API-Call fehlschlägt
- **Speichern:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Löschen:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Validierung:** Backend prüft alle Bedingungen

---

## ✅ Abgeschlossene Aufgaben

- [x] AvailabilityManagement.tsx erstellen
- [x] Liste aller Verfügbarkeiten anzeigen
- [x] Verfügbarkeit erstellen (Formular)
- [x] Verfügbarkeit bearbeiten (Formular)
- [x] Verfügbarkeit löschen (mit Bestätigung)
- [x] Aktiv/Inaktiv Toggle
- [x] Typ-System (available/preferred/unavailable)
- [x] Priorität (1-10)
- [x] Wochentag-Auswahl (Alle Tage / Sonntag-Samstag)
- [x] Zeitfenster (optional)
- [x] Gültigkeitszeitraum (optional)
- [x] Branch/Rolle Filter (optional)
- [x] Responsive Design (Modal Mobile, Sidepane Desktop)
- [x] Integration in ShiftPlannerTab
- [x] Translations (de, en, es)
- [x] API-Integration
- [x] Fehlerbehandlung
- [x] Linter-Fehler prüfen und beheben

---

## 🧪 Test-Hinweise

**Zu testen:**
1. Button "Verfügbarkeiten" öffnet Modal/Sidepane
2. Liste zeigt alle Verfügbarkeiten des aktuellen Users korrekt an
3. "Inaktiv" Badge wird bei inaktiven Verfügbarkeiten angezeigt
4. Typ-Badges werden korrekt angezeigt (available/preferred/unavailable)
5. Verfügbarkeit erstellen funktioniert
6. Wochentag-Auswahl funktioniert (Alle Tage / Sonntag-Samstag)
7. Zeitfenster (optional) funktioniert
8. Gültigkeitszeitraum (optional) funktioniert
9. Branch/Rolle Filter (optional) funktioniert
10. Typ-Auswahl funktioniert
11. Priorität (1-10) funktioniert
12. Verfügbarkeit bearbeiten funktioniert
13. Verfügbarkeit löschen funktioniert (mit Bestätigung)
14. Responsive Design funktioniert (Mobile/Desktop)

---

## 📝 Notizen

- **Pattern:** Sidepane auf Desktop, Modal auf Mobile (wie CreateTaskModal)
- **Translations:** Alle Texte in de.json, en.json, es.json
- **API:** Endpoints `/api/shifts/availabilities/*` waren bereits vorhanden
- **Backend:** CRUD-Logik war bereits vollständig implementiert
- **User-Filter:** Verfügbarkeiten werden automatisch für aktuellen User gefiltert
- **Flexibilität:** Alle Felder außer Typ und Priorität sind optional
- **Automatische Planung:** Verfügbarkeiten werden bei automatischer Schichtplan-Generierung berücksichtigt

---

## 🔄 Nächste Schritte

**Phase 6:** Filter-Funktionalität
- Filter-Panel
- Branch, Rolle, Status, User Filter
- Datumsbereich-Filter

