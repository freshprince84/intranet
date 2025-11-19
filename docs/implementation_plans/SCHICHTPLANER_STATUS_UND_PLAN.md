# Schichtplaner: Aktueller Stand und Offene Punkte

## ✅ Was ist implementiert

### Backend (100% fertig)
- ✅ **Routes:** Alle Routes in `backend/src/routes/shifts.ts` registriert
- ✅ **Controller:** 
  - `shiftController.ts` - CRUD für Schichten + automatische Generierung
  - `shiftTemplateController.ts` - CRUD für Schicht-Templates
  - `userAvailabilityController.ts` - CRUD für Verfügbarkeiten
  - `shiftSwapController.ts` - CRUD für Schichttausch-Anfragen
- ✅ **Models:** Alle Prisma Models vorhanden (Shift, ShiftTemplate, UserAvailability, ShiftSwapRequest)
- ✅ **Validierung:** Überschneidungsprüfung, Verfügbarkeitsprüfung
- ✅ **Benachrichtigungen:** Automatische Notifications bei Schicht-Zuweisung/Änderung

### Frontend (Grundfunktionalität fertig)
- ✅ **ShiftPlannerTab:** Hauptkomponente mit FullCalendar
- ✅ **Kalender-Ansicht:** Woche/Monat-View mit FullCalendar
- ✅ **Navigation:** Vor/Zurück/Heute Buttons + FullCalendar Navigation
- ✅ **Event-Anzeige:** Schichten werden im Kalender angezeigt mit Farbcodierung
- ✅ **Status-Legende:** Farbcodierung für scheduled/confirmed/cancelled/swapped
- ✅ **Daten-Laden:** API-Integration funktioniert
- ✅ **Fix:** Doppeltes Laden beim Datumwechsel behoben
- ✅ **CreateShiftModal:** Modal/Sidepane zum Erstellen von Schichten (Phase 1)
- ✅ **EditShiftModal:** Modal/Sidepane zum Bearbeiten von Schichten (Phase 1)
- ✅ **GenerateShiftPlanModal:** Modal/Sidepane zur automatischen Schichtplan-Generierung (Phase 2)

## ❌ Was fehlt

### 1. ✅ Schicht erstellen/bearbeiten Modals (ABGESCHLOSSEN - Phase 1)

**Status:** ✅ Implementiert

**Implementiert:**
- ✅ `CreateShiftModal.tsx` - Modal/Sidepane zum Erstellen einer neuen Schicht
- ✅ `EditShiftModal.tsx` - Modal/Sidepane zum Bearbeiten einer bestehenden Schicht

**Funktionalität:**
- ✅ Shift Template auswählen
- ✅ Branch auswählen
- ✅ Rolle auswählen
- ✅ User zuweisen (optional, mit Verfügbarkeitsprüfung)
- ✅ Datum auswählen
- ✅ Notizen hinzufügen
- ✅ Status setzen (scheduled/confirmed/cancelled)

**Pattern:** Sidepane auf Desktop, Modal auf Mobile (wie CreateTaskModal/CreateRequestModal)

**Dateien:**
- `frontend/src/components/teamWorktime/CreateShiftModal.tsx`
- `frontend/src/components/teamWorktime/EditShiftModal.tsx`
- Translations in `frontend/src/i18n/locales/{de,en,es}.json` unter `teamWorktime.shifts.*`

---

### 2. ✅ Automatische Schichtplan-Generierung UI (ABGESCHLOSSEN - Phase 2)

**Status:** ✅ Implementiert

**Implementiert:**
- ✅ Button "Schichtplan generieren" im Header (Icon-Button mit Tooltip)
- ✅ `GenerateShiftPlanModal.tsx` - Modal/Sidepane mit Formular:
  - ✅ Zeitraum auswählen (Startdatum, Enddatum)
  - ✅ Branch auswählen
  - ✅ Rollen auswählen (Multi-Select mit Checkboxen, optional - wenn leer, alle Rollen der Branch)
  - ✅ Button "Generieren"
- ✅ Ergebnis-Anzeige:
  - ✅ Anzahl erstellter Schichten (Gesamt)
  - ✅ Anzahl zugewiesener Schichten
  - ✅ Anzahl unzugewiesener Schichten
  - ✅ Liste der Konflikte (falls vorhanden)

**API-Endpoint:** `POST /api/shifts/generate` - Generiert Schichtplan

**Dateien:**
- `frontend/src/components/teamWorktime/GenerateShiftPlanModal.tsx`
- Integration in `frontend/src/components/teamWorktime/ShiftPlannerTab.tsx`
- Translations in `frontend/src/i18n/locales/{de,en,es}.json` unter `teamWorktime.shifts.generate.*`

---

### 3. Schichttausch-Funktionalität

**Status:** Backend fertig, Frontend fehlt komplett

**Benötigt:**
- **Für User (Schicht abgeben):**
  - Button "Schicht tauschen" in Event-Details
  - Modal: Andere Schicht auswählen (mit Filter: gleiche Rolle, Branch, etc.)
  - Swap-Request erstellen
- **Für User (Schicht übernehmen):**
  - Liste der Swap-Requests (wo User als Empfänger vorgeschlagen wurde)
  - Button "Annehmen" / "Ablehnen"
- **Swap-Request-Liste:**
  - Eigene Anfragen (Status: pending/approved/rejected)
  - Erhaltene Anfragen (Status: pending)

**API-Endpoints:** Bereits vorhanden
- `POST /api/shifts/swaps` - Swap-Request erstellen
- `GET /api/shifts/swaps` - Alle Swap-Requests laden
- `PUT /api/shifts/swaps/:id/approve` - Swap-Request annehmen
- `PUT /api/shifts/swaps/:id/reject` - Swap-Request ablehnen

**Priorität:** 🟡 MITTEL

---

### 4. Filter-Funktionalität

**Status:** Fehlt komplett

**Benötigt:**
- Filter-Panel (ähnlich wie in anderen Tabs)
- Filter-Optionen:
  - Branch (Multi-Select)
  - Rolle (Multi-Select)
  - Status (Multi-Select: scheduled/confirmed/cancelled/swapped)
  - User (Multi-Select)
  - Datumsbereich (optional, überschreibt Woche-Navigation)

**API-Endpoint:** Bereits vorhanden (Query-Parameter in `GET /api/shifts`)

**Priorität:** 🟢 NIEDRIG

---

### 5. Shift Templates Management

**Status:** Backend fertig, Frontend fehlt komplett

**Benötigt:**
- Eigener Tab oder Modal für Template-Verwaltung
- Liste aller Templates
- CRUD-Operationen:
  - Template erstellen (Name, Startzeit, Endzeit, Branch, Rolle)
  - Template bearbeiten
  - Template löschen
  - Template aktivieren/deaktivieren

**API-Endpoints:** Bereits vorhanden
- `GET /api/shifts/templates` - Alle Templates
- `POST /api/shifts/templates` - Template erstellen
- `PUT /api/shifts/templates/:id` - Template bearbeiten
- `DELETE /api/shifts/templates/:id` - Template löschen

**Priorität:** 🟡 MITTEL

---

### 6. User Availability Management

**Status:** Backend fertig, Frontend fehlt komplett

**Benötigt:**
- Eigener Tab oder Modal für Verfügbarkeits-Verwaltung
- Für jeden User:
  - Verfügbarkeiten anzeigen
  - Verfügbarkeit erstellen:
    - Wochentag (Montag-Sonntag oder alle)
    - Zeitfenster (optional: Startzeit, Endzeit)
    - Typ (available/preferred mit Priorität)
    - Gültigkeitszeitraum (optional: Startdatum, Enddatum)
    - Branch-Filter (optional)
    - Rollen-Filter (optional)
  - Verfügbarkeit bearbeiten
  - Verfügbarkeit löschen

**API-Endpoints:** Bereits vorhanden
- `GET /api/shifts/availabilities` - Alle Verfügbarkeiten
- `POST /api/shifts/availabilities` - Verfügbarkeit erstellen
- `PUT /api/shifts/availabilities/:id` - Verfügbarkeit bearbeiten
- `DELETE /api/shifts/availabilities/:id` - Verfügbarkeit löschen

**Priorität:** 🟡 MITTEL

---

## 📋 Implementierungsplan

### Phase 1: Kern-Funktionalität (ABGESCHLOSSEN ✅)
**Ziel:** Schichten können erstellt und bearbeitet werden

1. ✅ **CreateShiftModal.tsx** erstellt
   - Pattern: Sidepane auf Desktop, Modal auf Mobile
   - Felder: Template, Branch, Rolle, User (optional), Datum, Notizen
   - Validierung: Überschneidungen prüfen (Backend)
   - Integration: `handleDateClick` öffnet Modal mit vorausgewähltem Datum
   - **Datei:** `frontend/src/components/teamWorktime/CreateShiftModal.tsx`

2. ✅ **EditShiftModal.tsx** erstellt
   - Pattern: Sidepane auf Desktop, Modal auf Mobile
   - Felder: Alle Felder bearbeitbar (außer ID)
   - Validierung: Überschneidungen prüfen (Backend)
   - Integration: `handleEventClick` öffnet Modal mit Schicht-Daten
   - Löschen-Funktionalität integriert
   - **Datei:** `frontend/src/components/teamWorktime/EditShiftModal.tsx`

3. ✅ **Translations** hinzugefügt
   - Alle neuen Texte in de.json, en.json, es.json
   - Keys unter `teamWorktime.shifts.*`

**Status:** ✅ Abgeschlossen

---

### Phase 2: Automatische Generierung (ABGESCHLOSSEN ✅)
**Ziel:** Schichtplan kann automatisch generiert werden

1. ✅ **GenerateShiftPlanModal.tsx** erstellt
   - Formular: Zeitraum, Branch, Rollen (Multi-Select mit Checkboxen)
   - Ergebnis-Anzeige: Zusammenfassung + Konflikte
   - Validierung: Pflichtfelder, Datumsvalidierung
   - **Datei:** `frontend/src/components/teamWorktime/GenerateShiftPlanModal.tsx`

2. ✅ **Integration** in ShiftPlannerTab
   - Button "Schichtplan generieren" (Icon-Button mit Tooltip)
   - Nach Generierung: Daten neu laden via `handlePlanGenerated`
   - Initialwerte: Aktuelle Woche (Montag-Sonntag)

3. ✅ **Translations** hinzugefügt
   - Keys unter `teamWorktime.shifts.generate.*`

**Status:** ✅ Abgeschlossen

---

### Phase 3: Schichttausch
**Ziel:** User können Schichten tauschen

1. ✅ **SwapRequestModal.tsx** erstellen
   - Eigene Schicht auswählen
   - Ziel-Schicht auswählen (mit Filter)
   - Swap-Request erstellen

2. ✅ **SwapRequestList** Komponente
   - Eigene Anfragen anzeigen
   - Erhaltene Anfragen anzeigen
   - Annehmen/Ablehnen Buttons

3. ✅ **Integration** in Event-Details
   - Button "Schicht tauschen" hinzufügen

**Geschätzte Zeit:** 3-4 Stunden

---

### Phase 4: Filter & Verwaltung
**Ziel:** Erweiterte Funktionalität

1. ✅ **Filter-Panel** hinzufügen
   - Branch, Rolle, Status, User Filter
   - Datumsbereich-Filter

2. ✅ **Templates Management** Tab/Modal
   - CRUD für Templates

3. ✅ **Availability Management** Tab/Modal
   - CRUD für Verfügbarkeiten

**Geschätzte Zeit:** 4-5 Stunden

---

## 🎯 Nächste Schritte (Priorität)

1. ✅ **ABGESCHLOSSEN:** CreateShiftModal + EditShiftModal (Phase 1)
2. ✅ **ABGESCHLOSSEN:** Automatische Generierung UI (Phase 2)
3. **🟡 MITTEL:** Schichttausch (Phase 3) - **NÄCHSTER SCHRITT**
4. **🟡 MITTEL:** Templates Management (Phase 4)
5. **🟡 MITTEL:** Availability Management (Phase 5)
6. **🟢 NIEDRIG:** Filter & Verwaltung (Phase 6)

---

## 📝 Notizen

- **Pattern:** Alle Modals sollten Sidepane auf Desktop, Modal auf Mobile sein (wie CreateTaskModal)
- **Translations:** Alle neuen Texte müssen in de.json, en.json, es.json hinzugefügt werden
- **API:** Alle benötigten Endpoints sind bereits vorhanden
- **Validierung:** Backend prüft bereits Überschneidungen und Verfügbarkeiten
- **Benachrichtigungen:** Werden automatisch vom Backend gesendet

