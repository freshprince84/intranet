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
- ✅ **SwapRequestModal:** Modal/Sidepane zum Erstellen von Tausch-Anfragen (Phase 3)
- ✅ **SwapRequestList:** Modal/Sidepane zur Verwaltung aller Tausch-Anfragen (Phase 3)
- ✅ **ShiftTemplateManagement:** Modal/Sidepane zur Verwaltung von Schicht-Templates (Phase 4)
- ✅ **AvailabilityManagement:** Modal/Sidepane zur Verwaltung von Verfügbarkeiten (Phase 5)
- ✅ **Filter-Panel:** Filter-Funktionalität für Branch, Rolle, Status, User (Phase 6)

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

### 3. ✅ Schichttausch-Funktionalität (ABGESCHLOSSEN - Phase 3)

**Status:** ✅ Implementiert

**Implementiert:**
- ✅ **SwapRequestModal.tsx** - Modal/Sidepane zum Erstellen einer Tausch-Anfrage
  - Zeigt eigene Schicht an (read-only)
  - Dropdown für Ziel-Schicht (gefiltert: gleiche Rolle/Branch, hat User, nicht cancelled/swapped)
  - Optional: Nachricht hinzufügen
- ✅ **SwapRequestList.tsx** - Liste aller Swap-Requests
  - Eigene Anfragen (Status: pending/approved/rejected)
  - Erhaltene Anfragen (Status: pending/approved/rejected)
  - Filter nach Status (all/pending/approved/rejected)
  - Approve/Reject Buttons (nur für erhaltene pending Anfragen)
  - Schicht-Details anzeigen (Original + Ziel)
  - Nachrichten anzeigen
- ✅ **Integration in EditShiftModal**
  - Button "Schicht tauschen" (nur bei eigenen Schichten, nicht cancelled/swapped)
  - Öffnet SwapRequestModal
- ✅ **Integration in ShiftPlannerTab**
  - Button "Schichttausch-Anfragen" im Header
  - Öffnet SwapRequestList
  - Nach Approve/Reject: Schichten werden neu geladen

**Dateien:**
- `frontend/src/components/teamWorktime/SwapRequestModal.tsx`
- `frontend/src/components/teamWorktime/SwapRequestList.tsx`
- Integration in `frontend/src/components/teamWorktime/EditShiftModal.tsx`
- Integration in `frontend/src/components/teamWorktime/ShiftPlannerTab.tsx`
- Translations in `frontend/src/i18n/locales/{de,en,es}.json` unter `teamWorktime.shifts.swap.*` und `teamWorktime.shifts.swapList.*`

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

### 5. ✅ Shift Templates Management (ABGESCHLOSSEN - Phase 4)

**Status:** ✅ Implementiert

**Implementiert:**
- ✅ **ShiftTemplateManagement.tsx** - Modal/Sidepane zur Verwaltung von Templates
- ✅ **Integration in ShiftPlannerTab** - Button "Schicht-Templates"

**Funktionalität:**
- ✅ Liste aller Templates anzeigen
- ✅ Template erstellen (Name, Startzeit, Endzeit, Branch, Rolle, Dauer optional, Aktiv/Inaktiv)
- ✅ Template bearbeiten
- ✅ Template löschen (mit Bestätigung)
- ✅ Template aktivieren/deaktivieren
- ✅ Inaktiv-Badge bei inaktiven Templates

**Dateien:**
- `frontend/src/components/teamWorktime/ShiftTemplateManagement.tsx`
- Translations in `frontend/src/i18n/locales/{de,en,es}.json` unter `teamWorktime.shifts.templates.*`

---

### 6. ✅ User Availability Management (ABGESCHLOSSEN - Phase 5)

**Status:** ✅ Implementiert

**Implementiert:**
- ✅ **AvailabilityManagement.tsx** - Modal/Sidepane zur Verwaltung von Verfügbarkeiten
- ✅ **Integration in ShiftPlannerTab** - Button "Verfügbarkeiten"

**Funktionalität:**
- ✅ Verfügbarkeiten anzeigen (für aktuellen User)
- ✅ Verfügbarkeit erstellen:
  - ✅ Wochentag (Alle Tage / Sonntag-Samstag)
  - ✅ Zeitfenster (optional: Startzeit, Endzeit)
  - ✅ Typ (available/preferred/unavailable)
  - ✅ Priorität (1-10)
  - ✅ Gültigkeitszeitraum (optional: Startdatum, Enddatum)
  - ✅ Branch-Filter (optional)
  - ✅ Rollen-Filter (optional)
  - ✅ Notizen (optional)
  - ✅ Aktiv/Inaktiv
- ✅ Verfügbarkeit bearbeiten
- ✅ Verfügbarkeit löschen

**Dateien:**
- `frontend/src/components/teamWorktime/AvailabilityManagement.tsx`
- Translations in `frontend/src/i18n/locales/{de,en,es}.json` unter `teamWorktime.shifts.availabilities.*`

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

### Phase 3: Schichttausch (ABGESCHLOSSEN ✅)
**Ziel:** User können Schichten tauschen

1. ✅ **SwapRequestModal.tsx** erstellt
   - Eigene Schicht wird angezeigt (read-only)
   - Ziel-Schicht auswählen (mit Filter: gleiche Rolle/Branch, hat User, nicht cancelled/swapped)
   - Optional: Nachricht hinzufügen
   - Swap-Request erstellen
   - **Datei:** `frontend/src/components/teamWorktime/SwapRequestModal.tsx`

2. ✅ **SwapRequestList.tsx** erstellt
   - Eigene Anfragen anzeigen
   - Erhaltene Anfragen anzeigen
   - Filter nach Status (all/pending/approved/rejected)
   - Annehmen/Ablehnen Buttons (nur für erhaltene pending Anfragen)
   - Schicht-Details anzeigen (Original + Ziel)
   - Nachrichten anzeigen
   - **Datei:** `frontend/src/components/teamWorktime/SwapRequestList.tsx`

3. ✅ **Integration** in EditShiftModal
   - Button "Schicht tauschen" hinzugefügt (nur bei eigenen Schichten, nicht cancelled/swapped)
   - Öffnet SwapRequestModal

4. ✅ **Integration** in ShiftPlannerTab
   - Button "Schichttausch-Anfragen" im Header hinzugefügt
   - Öffnet SwapRequestList
   - Nach Approve/Reject: Schichten werden neu geladen

5. ✅ **Translations** hinzugefügt
   - Keys unter `teamWorktime.shifts.swap.*` und `teamWorktime.shifts.swapList.*`

**Status:** ✅ Abgeschlossen

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
3. ✅ **ABGESCHLOSSEN:** Schichttausch (Phase 3)
4. ✅ **ABGESCHLOSSEN:** Templates Management (Phase 4)
5. ✅ **ABGESCHLOSSEN:** Availability Management (Phase 5)
6. ✅ **ABGESCHLOSSEN:** Filter-Funktionalität (Phase 6)

**🎉 ALLE PHASEN ABGESCHLOSSEN! 🎉**

---

## 📝 Notizen

- **Pattern:** Alle Modals sollten Sidepane auf Desktop, Modal auf Mobile sein (wie CreateTaskModal)
- **Translations:** Alle neuen Texte müssen in de.json, en.json, es.json hinzugefügt werden
- **API:** Alle benötigten Endpoints sind bereits vorhanden
- **Validierung:** Backend prüft bereits Überschneidungen und Verfügbarkeiten
- **Benachrichtigungen:** Werden automatisch vom Backend gesendet

