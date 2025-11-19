# Schichtplaner Phase 3: Schichttausch-Funktionalität - Dokumentation

## 📋 Übersicht

Phase 3 implementiert die vollständige Schichttausch-Funktionalität. User können Schichten tauschen, Tausch-Anfragen erstellen, erhaltene Anfragen genehmigen oder ablehnen.

**Status:** ✅ Abgeschlossen  
**Datum:** 2025-01-XX  
**Implementiert von:** AI Assistant

---

## 🎯 Ziele

1. UI-Komponente zum Erstellen von Tausch-Anfragen
2. UI-Komponente zur Verwaltung aller Tausch-Anfragen (eigene + erhaltene)
3. Approve/Reject-Funktionalität für erhaltene Anfragen
4. Integration in ShiftPlannerTab und EditShiftModal
5. Vollständige Translations (de, en, es)
6. Responsive Design (Sidepane Desktop, Modal Mobile)

---

## 📁 Implementierte Dateien

### 1. SwapRequestModal.tsx

**Pfad:** `frontend/src/components/teamWorktime/SwapRequestModal.tsx`

**Funktionalität:**
- Modal/Sidepane zum Erstellen einer Tausch-Anfrage
- Zeigt die eigene Schicht (originalShift) an
- Dropdown für Ziel-Schicht (targetShift)
- Optional: Nachricht hinzufügen
- Responsive: Modal auf Mobile (< 640px), Sidepane auf Desktop (≥ 640px)

**Formular-Felder:**
- **Original-Schicht** (read-only): Zeigt Details der eigenen Schicht
- **Ziel-Schicht** (required): Dropdown mit verfügbaren Schichten
- **Nachricht** (optional): Textarea für Nachricht an den anderen User

**Filter für verfügbare Schichten:**
- Gleiche Rolle (`roleId === originalShift.roleId`)
- Gleiche Branch (`branchId === originalShift.branchId`)
- Hat einen User (`userId !== null`)
- Status nicht cancelled oder swapped
- Nicht die eigene Schicht (`id !== originalShift.id`)

**Validierung:**
- Ziel-Schicht muss ausgewählt werden
- API-Validierung: Backend prüft weitere Bedingungen

**API-Integration:**
- Endpoint: `POST /api/shifts/swaps`
- Request Body:
  ```typescript
  {
    originalShiftId: number,
    targetShiftId: number,
    message?: string
  }
  ```
- Response Handling:
  - Erfolg: Ruft `onSwapRequestCreated()` auf
  - Fehler: Zeigt übersetzte Fehlermeldung

**Pattern:**
- Sidepane auf Desktop (≥ 640px)
- Modal auf Mobile (< 640px)
- Verwendet `useSidepane` Context für Sidepane-Management
- Backdrop nur bei Desktop < 1070px

---

### 2. SwapRequestList.tsx

**Pfad:** `frontend/src/components/teamWorktime/SwapRequestList.tsx`

**Funktionalität:**
- Liste aller Swap-Requests (eigene + erhaltene)
- Filter nach Status (all/pending/approved/rejected)
- Approve/Reject Buttons für erhaltene Anfragen (pending)
- Anzeige der Schicht-Details (Original + Ziel)
- Nachrichten und Antworten anzeigen
- Responsive: Modal auf Mobile (< 640px), Sidepane auf Desktop (≥ 640px, max-w-2xl)

**Features:**
- **Filter:** Buttons für all/pending/approved/rejected
- **Trennung:** Eigene Anfragen und erhaltene Anfragen werden getrennt angezeigt
- **Status-Badges:** Farbcodierte Badges für pending/approved/rejected
- **Schicht-Details:** Beide Schichten werden in farbcodierten Boxen angezeigt
- **Actions:** Approve/Reject Buttons nur für erhaltene Anfragen mit Status pending
- **Loading States:** Spinner während Approve/Reject

**API-Integration:**
- Endpoint: `GET /api/shifts/swaps?userId={userId}`
- Approve: `PUT /api/shifts/swaps/:id/approve`
- Reject: `PUT /api/shifts/swaps/:id/reject`

**Nach Approve/Reject:**
- Backend tauscht automatisch die User der beiden Schichten
- Schichten erhalten Status "swapped"
- Benachrichtigungen werden gesendet
- `onSwapRequestUpdated()` wird aufgerufen → ShiftPlannerTab lädt Schichten neu

**Pattern:**
- Sidepane auf Desktop (≥ 640px, max-w-2xl für mehr Platz)
- Modal auf Mobile (< 640px)
- Verwendet `useSidepane` Context für Sidepane-Management
- Backdrop nur bei Desktop < 1070px

---

### 3. EditShiftModal.tsx - Integration

**Änderungen:**
- Import: `SwapRequestModal` hinzugefügt
- Import: `ArrowsRightLeftIcon` hinzugefügt
- State: `isSwapModalOpen` hinzugefügt
- Button: "Schicht tauschen" Button hinzugefügt
  - Nur sichtbar wenn `shift.userId === user?.id`
  - Nur sichtbar wenn Status != cancelled/swapped
  - Position: Vor Delete-Button
  - Design: Blauer Button mit Icon
- Modal: `SwapRequestModal` am Ende der Komponente hinzugefügt
  - Nur gerendert wenn `shift.userId === user?.id`
  - Callback: `onSwapRequestUpdated` aktualisiert Schicht

**Button-Design:**
- Icon: `ArrowsRightLeftIcon`
- Farbe: Blau (`bg-blue-50 dark:bg-blue-900/20 border border-blue-200`)
- Text: `teamWorktime.shifts.actions.swap`

---

### 4. ShiftPlannerTab.tsx - Integration

**Änderungen:**
- Import: `SwapRequestList` hinzugefügt
- State: `isSwapListOpen` hinzugefügt
- Button: "Schichttausch-Anfragen" Button im Header hinzugefügt
  - Position: Links neben Generate-Button
  - Design: Icon-only Button (Pfeil-Icon) mit Tooltip
  - Tooltip: `teamWorktime.shifts.swapList.title`
- Modal: `SwapRequestList` am Ende der Komponente hinzugefügt
  - Callback: `onSwapRequestUpdated` lädt Schichten neu

**Button-Design:**
- Icon-only Button (wie Generate/Refresh)
- Tooltip bei Hover
- Position: Links neben Generate-Button
- Spacing: `gap-1` zwischen Buttons

---

### 5. Translations

**Dateien aktualisiert:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Neue Keys unter `teamWorktime.shifts.swap`:**

```json
{
  "title": "Schicht tauschen",
  "submit": "Tausch-Anfrage senden",
  "submitting": "Wird gesendet...",
  "form": {
    "yourShift": "Ihre Schicht",
    "shift": "Schicht",
    "targetShift": "Ziel-Schicht",
    "selectTargetShift": "Ziel-Schicht auswählen",
    "message": "Nachricht (optional)",
    "messagePlaceholder": "Optionale Nachricht an den anderen Mitarbeiter...",
    "noShiftsAvailable": "Keine verfügbaren Schichten zum Tauschen gefunden"
  },
  "errors": {
    "loadShiftsError": "Fehler beim Laden der verfügbaren Schichten",
    "selectTargetShift": "Bitte wählen Sie eine Ziel-Schicht aus",
    "createError": "Fehler beim Erstellen der Tausch-Anfrage"
  }
}
```

**Neue Keys unter `teamWorktime.shifts.swapList`:**

```json
{
  "title": "Schichttausch-Anfragen",
  "status": {
    "pending": "Ausstehend",
    "approved": "Genehmigt",
    "rejected": "Abgelehnt"
  },
  "filter": {
    "all": "Alle",
    "pending": "Ausstehend",
    "approved": "Genehmigt",
    "rejected": "Abgelehnt"
  },
  "receivedRequests": "Erhaltene Anfragen",
  "yourRequests": "Ihre Anfragen",
  "wantsToSwap": "möchte mit Ihnen eine Schicht tauschen",
  "youRequestedSwap": "Sie haben eine Tausch-Anfrage an",
  "yourShift": "Ihre Schicht",
  "theirShift": "Ihre Schicht",
  "message": "Nachricht",
  "response": "Antwort",
  "approve": "Genehmigen",
  "reject": "Ablehnen",
  "approving": "Wird genehmigt...",
  "rejecting": "Wird abgelehnt...",
  "noRequests": "Keine Tausch-Anfragen gefunden",
  "errors": {
    "loadError": "Fehler beim Laden der Tausch-Anfragen",
    "approveError": "Fehler beim Genehmigen der Tausch-Anfrage",
    "rejectError": "Fehler beim Ablehnen der Tausch-Anfrage"
  }
}
```

**Neuer Key unter `teamWorktime.shifts.actions`:**

```json
{
  "swap": "Schicht tauschen"
}
```

---

## 🔧 Technische Details

### Datenfluss

#### Tausch-Anfrage erstellen:
1. User klickt auf Schicht im Kalender → EditShiftModal öffnet
2. User klickt "Schicht tauschen" → SwapRequestModal öffnet
3. User wählt Ziel-Schicht aus → API-Call `POST /api/shifts/swaps`
4. Erfolg → Modal schließt, Benachrichtigung wird gesendet

#### Tausch-Anfrage genehmigen/ablehnen:
1. User öffnet SwapRequestList → Lädt alle Swap-Requests
2. User sieht erhaltene Anfragen → Klickt Approve/Reject
3. API-Call `PUT /api/shifts/swaps/:id/approve` oder `/reject`
4. Backend tauscht automatisch die User der beiden Schichten
5. Schichten erhalten Status "swapped"
6. `onSwapRequestUpdated()` → ShiftPlannerTab lädt Schichten neu

### API-Endpoints verwendet

- `GET /api/shifts/swaps?userId={userId}` - Lädt alle Swap-Requests für User
- `POST /api/shifts/swaps` - Erstellt neue Tausch-Anfrage
- `PUT /api/shifts/swaps/:id/approve` - Genehmigt Tausch-Anfrage
- `PUT /api/shifts/swaps/:id/reject` - Lehnt Tausch-Anfrage ab

### Backend-Logik

**Beim Approve:**
- Backend prüft Berechtigung (User muss requestee sein)
- Backend prüft Status (muss pending sein)
- Backend tauscht User der beiden Schichten in einer Transaction
- Beide Schichten erhalten Status "swapped"
- Swap-Request erhält Status "approved"
- Benachrichtigungen werden gesendet

**Beim Reject:**
- Backend prüft Berechtigung (User muss requestee sein)
- Backend prüft Status (muss pending sein)
- Swap-Request erhält Status "rejected"
- Benachrichtigungen werden gesendet

### Fehlerbehandlung

- **Laden der verfügbaren Schichten:** Zeigt Fehlermeldung, wenn API-Call fehlschlägt
- **Erstellen der Tausch-Anfrage:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Laden der Swap-Requests:** Zeigt Fehlermeldung, wenn API-Call fehlschlägt
- **Approve/Reject:** Zeigt übersetzte Fehlermeldung bei API-Fehler
- **Validierung:** Client-seitige Validierung vor API-Call

---

## ✅ Abgeschlossene Aufgaben

- [x] SwapRequestModal.tsx erstellen
- [x] Formular mit allen Feldern
- [x] Filter für verfügbare Schichten
- [x] Validierung (Pflichtfelder)
- [x] Responsive Design (Modal Mobile, Sidepane Desktop)
- [x] Integration in EditShiftModal
- [x] SwapRequestList.tsx erstellen
- [x] Filter nach Status
- [x] Trennung eigene/erhaltene Anfragen
- [x] Approve/Reject Buttons
- [x] Anzeige Schicht-Details
- [x] Integration in ShiftPlannerTab
- [x] Translations (de, en, es)
- [x] API-Integration
- [x] Fehlerbehandlung
- [x] Linter-Fehler prüfen und beheben

---

## 🧪 Test-Hinweise

**Zu testen:**
1. Button "Schicht tauschen" erscheint nur bei eigenen Schichten
2. Button "Schicht tauschen" erscheint nicht bei cancelled/swapped Schichten
3. SwapRequestModal öffnet sich korrekt
4. Verfügbare Schichten werden korrekt gefiltert
5. Tausch-Anfrage kann erstellt werden
6. SwapRequestList zeigt alle Swap-Requests
7. Filter funktioniert (all/pending/approved/rejected)
8. Eigene und erhaltene Anfragen werden getrennt angezeigt
9. Approve-Button funktioniert (nur bei erhaltenen pending Anfragen)
10. Reject-Button funktioniert (nur bei erhaltenen pending Anfragen)
11. Nach Approve werden Schichten getauscht
12. Nach Approve/Reject werden Schichten im Kalender neu geladen
13. Responsive Design funktioniert (Mobile/Desktop)

---

## 📝 Notizen

- **Pattern:** Sidepane auf Desktop, Modal auf Mobile (wie CreateTaskModal)
- **Translations:** Alle Texte in de.json, en.json, es.json
- **API:** Endpoints `/api/shifts/swaps/*` waren bereits vorhanden
- **Backend:** Tausch-Logik war bereits vollständig implementiert
- **Filter:** Verfügbare Schichten werden nach Rolle, Branch, User und Status gefiltert
- **Status:** Nach Approve erhalten beide Schichten Status "swapped"

---

## 🔄 Nächste Schritte

**Phase 4:** Templates Management
- Templates Tab/Modal
- CRUD für Templates

**Phase 5:** Availability Management
- Availability Tab/Modal
- CRUD für Verfügbarkeiten

**Phase 6:** Filter-Funktionalität
- Filter-Panel
- Branch, Rolle, Status, User Filter
