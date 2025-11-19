# Schichtplaner Phase 6: Filter-Funktionalität - Dokumentation

## 📋 Übersicht

Phase 6 implementiert ein Filter-Panel für den Schichtplaner. User können Schichten nach Branch, Rolle, Status und User filtern.

**Status:** ✅ Abgeschlossen  
**Datum:** 2025-01-XX  
**Implementiert von:** AI Assistant

---

## 🎯 Ziele

1. Filter-Panel für Schichtplaner
2. Multi-Select Filter für Branch, Rolle, Status, User
3. Client-seitige Filterung (keine zusätzlichen API-Calls)
4. Filter-Button mit aktiver Anzahl (Badge)
5. Reset-Funktionalität
6. Vollständige Translations (de, en, es)

---

## 📁 Implementierte Dateien

### 1. ShiftPlannerTab.tsx - Filter-Integration

**Änderungen:**
- **State hinzugefügt:**
  - `allShifts`: Alle geladenen Schichten (vor Filterung)
  - `isFilterPanelOpen`: Filter-Panel sichtbar/unsichtbar
  - `selectedBranchIds`: Array von ausgewählten Branch-IDs
  - `selectedRoleIds`: Array von ausgewählten Role-IDs
  - `selectedStatuses`: Array von ausgewählten Status-Werten
  - `selectedUserIds`: Array von ausgewählten User-IDs
  - `branches`, `roles`, `users`: Daten für Filter-Optionen

- **Filter-Logik:**
  - `fetchShifts` speichert alle Schichten in `allShifts`
  - `useEffect` filtert `allShifts` basierend auf ausgewählten Filtern
  - Filter werden kombiniert (AND-Logik)

- **Filter-Panel UI:**
  - Toggle-Button mit Badge (zeigt Anzahl aktiver Filter)
  - Panel mit 4 Spalten (Branch, Rolle, Status, User)
  - Checkbox-Listen für jede Filter-Kategorie
  - Reset-Button zum Zurücksetzen aller Filter
  - Apply-Button zum Schließen des Panels

**Filter-Button:**
- Position: Links neben Availabilities Button
- Design: Icon-only Button (FunnelIcon) mit Tooltip
- Badge: Zeigt Anzahl aktiver Filter (wenn > 0)
- Highlight: Blauer Hintergrund wenn Filter aktiv

**Filter-Panel:**
- Responsive Grid: 1 Spalte (Mobile), 2 Spalten (Tablet), 4 Spalten (Desktop)
- Scrollbare Listen: Max-Höhe 32 (8rem) für jede Filter-Kategorie
- Checkbox-Listen: Multi-Select für jede Kategorie

---

### 2. Translations

**Dateien aktualisiert:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Neue Keys unter `teamWorktime.shifts.filters`:**

```json
{
  "title": "Filter",
  "branch": "Niederlassung",
  "role": "Rolle",
  "status": "Status",
  "user": "Mitarbeiter",
  "reset": "Zurücksetzen"
}
```

---

## 🔧 Technische Details

### Datenfluss

1. **Schichten laden** → `fetchShifts()` lädt Schichten für aktuelle Woche
2. **Alle Schichten speichern** → `setAllShifts(shiftsArray)` speichert alle Schichten
3. **Filter anwenden** → `useEffect` filtert `allShifts` basierend auf ausgewählten Filtern
4. **Gefilterte Schichten** → `setShifts(filtered)` aktualisiert angezeigte Schichten

### Filter-Logik

**AND-Logik:** Alle ausgewählten Filter werden kombiniert (AND)
- Wenn Branch-Filter aktiv: Nur Schichten mit ausgewählten Branches
- Wenn Role-Filter aktiv: Nur Schichten mit ausgewählten Rollen
- Wenn Status-Filter aktiv: Nur Schichten mit ausgewählten Status
- Wenn User-Filter aktiv: Nur Schichten mit ausgewählten Usern

**Beispiel:**
- Branch: [1, 2] + Role: [3] + Status: ['scheduled', 'confirmed']
- Ergebnis: Schichten die (Branch 1 ODER 2) UND (Role 3) UND (Status scheduled ODER confirmed) haben

### Client-seitige Filterung

- **Vorteil:** Keine zusätzlichen API-Calls, schnelle Filterung
- **Nachteil:** Filtert nur bereits geladene Schichten (aktuelle Woche)
- **Zukunft:** Backend-Filterung könnte für größere Datensätze sinnvoll sein

### Filter-Daten laden

- **Branches:** `GET /api/branches`
- **Roles:** `GET /api/roles`
- **Users:** `GET /api/users/dropdown`
- **Status:** Hardcoded (scheduled, confirmed, cancelled, swapped)

---

## ✅ Abgeschlossene Aufgaben

- [x] Filter-States hinzugefügt
- [x] `allShifts` State für ungefilterte Daten
- [x] Filter-Logik implementiert (useEffect)
- [x] Filter-Panel UI erstellt
- [x] Filter-Button mit Badge
- [x] Multi-Select Checkbox-Listen
- [x] Reset-Funktionalität
- [x] Translations hinzugefügt
- [x] Responsive Design
- [x] Linter-Fehler prüfen und beheben

---

## 🧪 Test-Hinweise

**Zu testen:**
1. Filter-Button öffnet/schließt Panel
2. Badge zeigt korrekte Anzahl aktiver Filter
3. Branch-Filter funktioniert (Multi-Select)
4. Role-Filter funktioniert (Multi-Select)
5. Status-Filter funktioniert (Multi-Select)
6. User-Filter funktioniert (Multi-Select)
7. Filter werden kombiniert (AND-Logik)
8. Reset-Button setzt alle Filter zurück
9. Apply-Button schließt Panel
10. Gefilterte Schichten werden im Kalender angezeigt

---

## 📝 Notizen

- **Client-seitige Filterung:** Filtert nur bereits geladene Schichten
- **Zukunft:** Backend-Filterung könnte für größere Datensätze sinnvoll sein
- **Datumsbereich-Filter:** Wurde nicht implementiert (wird durch Woche-Navigation abgedeckt)
- **Pattern:** Ähnlich wie FilterPane, aber einfacher (nur Multi-Select)

---

## 🔄 Nächste Schritte

**Alle Phasen abgeschlossen!** ✅

Der Schichtplaner ist vollständig implementiert mit:
- ✅ Create/Edit Shifts
- ✅ Automatische Generierung
- ✅ Schichttausch
- ✅ Templates Management
- ✅ Availability Management
- ✅ Filter-Funktionalität

