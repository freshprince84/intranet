# Schichtplaner Phase 2: Automatische Schichtplan-Generierung - Dokumentation

## 📋 Übersicht

Phase 2 implementiert die UI für die automatische Schichtplan-Generierung. Das Backend war bereits vollständig implementiert, es fehlte nur noch die Frontend-Integration.

**Status:** ✅ Abgeschlossen  
**Datum:** 2025-01-XX  
**Implementiert von:** AI Assistant

---

## 🎯 Ziele

1. UI-Komponente für automatische Schichtplan-Generierung erstellen
2. Integration in ShiftPlannerTab
3. Vollständige Translations (de, en, es)
4. Responsive Design (Sidepane Desktop, Modal Mobile)

---

## 📁 Implementierte Dateien

### 1. GenerateShiftPlanModal.tsx

**Pfad:** `frontend/src/components/teamWorktime/GenerateShiftPlanModal.tsx`

**Funktionalität:**
- Modal/Sidepane für automatische Schichtplan-Generierung
- Formular mit Validierung
- Ergebnis-Anzeige mit Zusammenfassung und Konflikten
- Responsive: Modal auf Mobile (< 640px), Sidepane auf Desktop (≥ 640px)

**Formular-Felder:**
- **Startdatum** (required): Date-Input
- **Enddatum** (required): Date-Input
- **Niederlassung** (required): Dropdown mit allen Branches
- **Rollen** (optional): Multi-Select mit Checkboxen
  - Wenn keine Rollen ausgewählt: Alle Rollen der Branch werden verwendet
  - "Alle auswählen / Alle abwählen" Button

**Validierung:**
- Pflichtfelder prüfen
- Datumsvalidierung (Start < End)
- ISO-Format für API

**Ergebnis-Anzeige:**
- Zusammenfassung:
  - Gesamt (total)
  - Zugewiesen (assigned)
  - Nicht zugewiesen (unassigned)
  - Konflikte (conflicts)
- Konfliktliste (falls vorhanden):
  - Datum, Grund
- Erfolgsmeldung (wenn keine Konflikte und alle zugewiesen)

**API-Integration:**
- Endpoint: `POST /api/shifts/generate`
- Request Body:
  ```typescript
  {
    startDate: string (ISO format: YYYY-MM-DD),
    endDate: string (ISO format: YYYY-MM-DD),
    branchId: number,
    roleIds?: number[] (optional)
  }
  ```
- Response Handling:
  - Erfolg: Zeigt Zusammenfassung und Konflikte
  - Fehler: Zeigt übersetzte Fehlermeldung
  - Nach Generierung: Ruft `onPlanGenerated()` auf

**Pattern:**
- Sidepane auf Desktop (≥ 640px)
- Modal auf Mobile (< 640px)
- Verwendet `useSidepane` Context für Sidepane-Management
- Backdrop nur bei Desktop < 1070px

---

### 2. ShiftPlannerTab.tsx - Integration

**Änderungen:**
- Import: `GenerateShiftPlanModal` hinzugefügt
- State: `isGenerateModalOpen` hinzugefügt
- Handler: `handleGenerateClick()` und `handlePlanGenerated()` hinzugefügt
- Button: Generate-Button im Header hinzugefügt
  - Position: Rechts neben Refresh-Button
  - Design: Icon-only (Refresh-Symbol) mit Tooltip
  - Tooltip: `teamWorktime.shifts.actions.generate`
- Modal: `GenerateShiftPlanModal` am Ende der Komponente hinzugefügt
  - Initialwerte: Aktuelle Woche (Montag-Sonntag)

**Button-Design:**
- Icon-only Button (wie Refresh-Button)
- Tooltip bei Hover
- Position: Rechts neben Refresh-Button
- Spacing: `gap-1` zwischen Buttons

---

### 3. Translations

**Dateien aktualisiert:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Neue Keys unter `teamWorktime.shifts.generate`:**

```json
{
  "title": "Schichtplan generieren",
  "generate": "Generieren",
  "generating": "Wird generiert...",
  "form": {
    "startDate": "Startdatum",
    "endDate": "Enddatum",
    "branch": "Niederlassung",
    "roles": "Rollen",
    "selectBranch": "Niederlassung auswählen",
    "selectAll": "Alle auswählen",
    "deselectAll": "Alle abwählen",
    "rolesHint": "Wenn keine Rollen ausgewählt werden, werden alle Rollen der Niederlassung verwendet.",
    "selectBranchFirst": "Bitte zuerst eine Niederlassung auswählen",
    "noRolesAvailable": "Keine Rollen verfügbar"
  },
  "result": {
    "summary": "Zusammenfassung",
    "total": "Gesamt",
    "assigned": "Zugewiesen",
    "unassigned": "Nicht zugewiesen",
    "conflicts": "Konflikte",
    "conflictsTitle": "Konflikte",
    "success": "Schichtplan erfolgreich generiert!"
  },
  "errors": {
    "loadBranchesError": "Fehler beim Laden der Niederlassungen",
    "loadRolesError": "Fehler beim Laden der Rollen",
    "fillRequiredFields": "Bitte füllen Sie alle Pflichtfelder aus",
    "invalidDates": "Ungültige Datumsangaben",
    "startDateAfterEndDate": "Startdatum muss vor Enddatum liegen",
    "generateError": "Fehler beim Generieren des Schichtplans"
  }
}
```

---

## 🔧 Technische Details

### Multi-Select für Rollen

**Pattern:** Wie in `RoleManagementTab.tsx`

**Implementierung:**
- Checkbox-Liste mit Scroll-Container (`max-h-48 overflow-y-auto`)
- "Alle auswählen / Alle abwählen" Button oben rechts
- Hinweis-Text: "Wenn keine Rollen ausgewählt werden, werden alle Rollen der Niederlassung verwendet."
- State: `selectedRoleIds` (Array von Zahlen)

**Code-Struktur:**
```typescript
const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

const handleRoleToggle = (roleId: number) => {
  setSelectedRoleIds(prev => 
    prev.includes(roleId)
      ? prev.filter(id => id !== roleId)
      : [...prev, roleId]
  );
};

const handleSelectAllRoles = () => {
  if (selectedRoleIds.length === roles.length) {
    setSelectedRoleIds([]);
  } else {
    setSelectedRoleIds(roles.map(r => r.id));
  }
};
```

### Datenfluss

1. **Modal öffnet** → `useEffect` lädt Branches
2. **Branch ausgewählt** → `useEffect` lädt Rollen für diese Branch
3. **Formular ausgefüllt** → `handleSubmit` validiert und sendet API-Request
4. **Erfolg** → Ergebnis anzeigen (`setShowResult(true)`)
5. **`onPlanGenerated()`** → ShiftPlannerTab lädt Daten neu (`fetchShifts(currentWeek)`)

### API-Endpoints verwendet

- `GET /api/branches` - Lädt alle Branches
- `GET /api/roles` - Lädt alle Rollen (Backend filtert basierend auf Branch)
- `POST /api/shifts/generate` - Generiert Schichtplan

### Fehlerbehandlung

- **Laden der Branches:** Zeigt Fehlermeldung, wenn API-Call fehlschlägt
- **Laden der Rollen:** Zeigt Fehlermeldung, wenn API-Call fehlschlägt
- **Generierung:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Validierung:** Client-seitige Validierung vor API-Call

---

## ✅ Abgeschlossene Aufgaben

- [x] GenerateShiftPlanModal.tsx erstellen
- [x] Formular mit allen Feldern
- [x] Multi-Select für Rollen (Checkboxen)
- [x] Validierung (Pflichtfelder, Datumsvalidierung)
- [x] Ergebnis-Anzeige (Zusammenfassung + Konflikte)
- [x] Responsive Design (Modal Mobile, Sidepane Desktop)
- [x] Integration in ShiftPlannerTab
- [x] Generate-Button hinzufügen
- [x] Translations (de, en, es)
- [x] API-Integration
- [x] Fehlerbehandlung
- [x] Linter-Fehler prüfen und beheben

---

## 🧪 Test-Hinweise

**Zu testen:**
1. Button "Schichtplan generieren" öffnet Modal/Sidepane
2. Formular-Validierung funktioniert
3. Branches werden geladen
4. Rollen werden nach Branch-Auswahl geladen
5. Multi-Select für Rollen funktioniert
6. "Alle auswählen / Alle abwählen" funktioniert
7. Generierung funktioniert (mit/ohne Rollen-Auswahl)
8. Ergebnis wird korrekt angezeigt
9. Konflikte werden angezeigt (falls vorhanden)
10. Nach Generierung werden Schichten im Kalender angezeigt
11. Responsive Design funktioniert (Mobile/Desktop)

---

## 📝 Notizen

- **Pattern:** Sidepane auf Desktop, Modal auf Mobile (wie CreateTaskModal)
- **Translations:** Alle Texte in de.json, en.json, es.json
- **API:** Endpoint `/api/shifts/generate` war bereits vorhanden
- **Backend:** Generierung-Logik war bereits vollständig implementiert
- **Initialwerte:** Modal wird mit aktueller Woche (Montag-Sonntag) geöffnet

---

## 🔄 Nächste Schritte

**Phase 3:** Schichttausch-Funktionalität
- SwapRequestModal.tsx erstellen
- SwapRequestList Komponente
- Integration in Event-Details

**Phase 4:** Templates Management
- Templates Tab/Modal
- CRUD für Templates

**Phase 5:** Availability Management
- Availability Tab/Modal
- CRUD für Verfügbarkeiten

