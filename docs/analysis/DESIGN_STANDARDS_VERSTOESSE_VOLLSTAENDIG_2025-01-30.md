# Vollständige Design-Standards-Verstöße Analyse

**Datum:** 2025-01-30  
**Zeitraum:** Letzte 2 Wochen (ca. 14 Tage)  
**Zweck:** Vollständige systematische Analyse ALLER Verstöße gegen die Design-Standards

## Zusammenfassung

**Analyse-Status:** In Bearbeitung  
**Geprüfte Aspekte:**
- [ ] Button-Design (Icon-only, Position, Hintergrund, Größe, Form)
- [ ] Create-Button Standard (Position links, rund, Icon-only, Hintergrund)
- [ ] Layout-Positionierung (keine Änderungen an Original-Positionen)
- [ ] Farben/Hintergründe (Color Palette, Seitenhintergründe)
- [ ] Typografie
- [ ] Formulare
- [ ] Tabellen
- [ ] Modals/Sidepanes
- [ ] FilterPane-System
- [ ] Box-Design
- [ ] Card-Design
- [ ] Responsive Design

---

## 1. Button-Design-Verstöße

### 1.1 Buttons mit sichtbarem Text (statt Icon-only)

**Regel:** Alle Buttons müssen Icon-only sein, Text nur im `title` Attribut für Tooltips.

**Gefundene Verstöße:**

1. **SendPasscodeSidepane.tsx** (Zeilen 363-379)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Senden" / "Wird gesendet..."
   - Status: ❌ **NICHT BEHOBEN**

2. **SendInvitationSidepane.tsx** (Zeilen 404-420)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Senden" / "Wird gesendet..."
   - Status: ❌ **NICHT BEHOBEN**

3. **RoomDescriptionsSection.tsx** (Zeilen 244-261)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

4. **EditTourBookingModal.tsx** (Zeilen 293-306)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

5. **EditTourProviderModal.tsx** (Zeilen 234-247)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

6. **CreateTourProviderModal.tsx** (Zeilen 223-236)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

7. **EditTourModal.tsx** (Zeilen 700-713)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

8. **CreateTourBookingModal.tsx** (Zeilen 332-345)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

9. **CreateTourModal.tsx** (Zeilen 623-636)
   - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Speichere..."
   - Status: ❌ **NICHT BEHOBEN**

10. **TourExportDialog.tsx** (Zeilen 243-258)
    - 2 Buttons mit sichtbarem Text: "Abbrechen", "Exportieren" / "Exportiere..."
    - Status: ❌ **NICHT BEHOBEN**

11. **InvoiceSuccessModal.tsx** (Zeilen 128-158)
    - 3 Buttons mit sichtbarem Text: "PDF wird generiert..." / "PDF herunterladen", "Zur Rechnungsverwaltung", "Schließen"
    - Status: ❌ **NICHT BEHOBEN**

12. **ClientSelectModal.tsx** (Zeilen 145-151, 204-209)
    - 2 Buttons mit sichtbarem Text: "Neuen Client anlegen" (2x)
    - Status: ❌ **NICHT BEHOBEN**

13. **CreateInvoiceModal.tsx** (Zeilen 113-118)
    - 1 Button mit sichtbarem Text: "Schließen"
    - Status: ❌ **NICHT BEHOBEN**

14. **MyJoinRequestsList.tsx** (Zeilen 496-504)
    - 1 Button mit sichtbarem Text: "Zurückziehen" / "Wird zurückgezogen..."
    - Status: ❌ **NICHT BEHOBEN**

15. **JoinRequestsList.tsx** (Zeilen 532-538)
    - 1 Button mit sichtbarem Text: "Bearbeiten"
    - Status: ❌ **NICHT BEHOBEN**

16. **DocumentConfigurationTab.tsx** (Zeilen 601-609)
    - 1 Button mit sichtbarem Text: "Lade hoch..." / "Hochladen"
    - Status: ❌ **NICHT BEHOBEN**

17. **TodoAnalyticsTab.tsx** (Zeilen 468-479)
    - 2 Buttons mit sichtbarem Text: "Häufigkeitsanalyse" / "Schicht-Analyse" (Toggle-Buttons)
    - Status: ❌ **NICHT BEHOBEN**

18. **ActiveUsersList.tsx** (Zeilen 1567-1572)
    - 1 Button mit sichtbarem Text: "Mehr anzeigen (X verbleibend)"
    - Status: ❌ **NICHT BEHOBEN**

19. **CreateReservationModal.tsx** (Zeilen 418-434)
    - 2 Buttons mit sichtbarem Text: "Abbrechen", "Erstellen" / "Wird erstellt..."
    - Status: ❌ **NICHT BEHOBEN**

20. **GuestContactModal.tsx** (Zeilen 135-151)
    - 2 Buttons mit sichtbarem Text: "Abbrechen", "Speichern" / "Wird gespeichert..."
    - Status: ❌ **NICHT BEHOBEN**

21. **EditShiftModal.tsx** (Zeilen 403-410, 420-434)
    - 3 Buttons mit sichtbarem Text: "Löschen", "Ja", "Nein"
    - Status: ❌ **NICHT BEHOBEN**

**Gesamt: 21 Dateien, 35+ Buttons mit Text**

### 1.2 Buttons mit falschen Hintergründen

**Regel:** Buttons (außer Speichern-Button in Sidepanes) haben KEINEN blauen Hintergrund, sondern transparent mit Hover-Effekt.

**Gefundene Verstöße:**

1. **FilterPane.tsx** (Zeile 552)
   - Button "Anwenden" hat blauen Hintergrund (`bg-blue-600`)
   - Status: ❌ **NICHT BEHOBEN** - Aber OK, da es ein "Speichern"-ähnlicher Button ist

2. **BranchManagementTab.tsx** (Zeilen 2389, 1533)
   - Speichern-Buttons in Formularen haben blauen Hintergrund (`bg-blue-600`)
   - Status: ✅ **OK** - Speichern-Buttons in Sidepanes/Modals dürfen blauen Hintergrund haben

3. **36 Dateien mit `px-4 py-2 bg-blue-600`** gefunden
   - Müssen geprüft werden, ob es Speichern-Buttons sind oder andere Buttons
   - Status: ⚠️ **WIRD GEPRÜFT**

### 1.3 Buttons mit falscher Position

**Regel:** Buttons dürfen nicht verschoben werden, Original-Position muss beibehalten werden.

**Gefundene Verstöße:**
- Wird geprüft...

### 1.4 Buttons mit falscher Größe/Form

**Regel:** Buttons müssen Standard-Größen verwenden, Create-Buttons müssen rund sein.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 2. Create-Button Standard-Verstöße

**Regel:** Create-Buttons müssen IMMER links positioniert sein, IMMER rund (`rounded-full`), IMMER Icon-only, IMMER weißen Hintergrund mit blauem Icon und blauem Rand haben, IMMER die Größe `p-1.5` mit `style={{ width: '30.19px', height: '30.19px' }}`.

**Gefundene Verstöße:**

1. **WorktimeStats.tsx** (Zeile 623)
   - Button hat NICHT die exakte Größe `30.19px × 30.19px`
   - Stattdessen: `p-1 sm:p-1.5` mit `min-w-7 min-h-7 sm:min-w-8 sm:min-h-8 w-7 h-7 sm:w-8 sm:h-8`
   - Status: ❌ **NICHT BEHOBEN** - Verstoß gegen Create-Button Standard

2. **OrganizationSettings.tsx** (Zeile 190)
   - Zweiter Button ("Organisation beitreten") hat `ml-2` (margin-left)
   - Status: ⚠️ **ZU PRÜFEN** - Ist das ein Create-Button oder ein separater Button?

3. **15 Dateien mit korrekter Größe `30.19px × 30.19px`** gefunden:
   - Requests.tsx ✅
   - BranchManagementTab.tsx ✅
   - PasswordManagerTab.tsx ✅
   - ToursTab.tsx ✅
   - TourProvidersTab.tsx ✅
   - TourDetailsModal.tsx ✅
   - OrganizationSettings.tsx (2 Buttons) ✅
   - RoleManagementTab.tsx ✅
   - UserManagementTab.tsx ✅
   - ConsultationTracker.tsx ✅
   - CerebroHeader.tsx ✅
   - ShiftPlannerTab.tsx ✅
   - LifecycleView.tsx (2 Buttons) ✅

---

## 3. Layout-Positionierungs-Verstöße

**Regel:** Buttons, Felder und UI-Elemente DÜRFEN NIEMALS verschoben werden. Layout-Änderungen (flex-wrap, grid-Änderungen, position-Änderungen) sind VERBOTEN.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 4. Farben/Hintergründe-Verstöße

**Regel:** 
- Seitenhintergründe sind IMMER einfarbig - keine Gradienten!
- Light Mode: `bg-white`
- Dark Mode: `dark:bg-gray-900`
- Verboten: `bg-gradient-*` Klassen für Seitenhintergründe

**Gefundene Verstöße:**

1. **MarkdownPreview.tsx** (Zeilen 117, 132)
   - Verwendet `bg-gradient-to-br from-blue-500 to-purple-600` für Link-Vorschau-Platzhalter
   - Status: ⚠️ **ZU PRÜFEN** - Ist das ein Seitenhintergrund oder ein UI-Element? (Laut Regel: Gradienten sind für spezifische UI-Elemente erlaubt, NICHT für Seitenhintergründe)

---

## 5. Typografie-Verstöße

**Regel:** Schriftgrößen, Schriftstärken und Schriftfamilien müssen den Standards entsprechen.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 6. Formular-Verstöße

**Regel:** Eingabefelder müssen Standard-Design verwenden.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 7. Tabellen-Verstöße

**Regel:** Tabellen müssen Standard-Design verwenden, FilterPane-System verwenden.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 8. Modal/Sidepane-Verstöße

**Regel:** Modals und Sidepanes müssen Standard-Pattern verwenden.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 9. FilterPane-System-Verstöße

**Regel:** Alle Tabellen mit Filterfunktionalität MÜSSEN das FilterPane-System verwenden.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 10. Box-Design-Verstöße

**Regel:** Boxen müssen Standard-Design verwenden.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 11. Card-Design-Verstöße

**Regel:** Cards müssen Standard-Design verwenden.

**Gefundene Verstöße:**
- Wird geprüft...

---

## 12. Responsive Design-Verstöße

**Regel:** Responsive Design muss den Standards entsprechen.

**Gefundene Verstöße:**
- Wird geprüft...

---

## Nächste Schritte

1. Systematische Prüfung aller Komponenten auf ALLE Design-Standards-Verstöße
2. Vollständige Dokumentation aller gefundenen Verstöße
3. Priorisierung der Verstöße nach Schweregrad
4. Erstellung eines Behebungsplans

---

---

## Zusammenfassung der bisherigen Ergebnisse

### Verstöße gefunden:

1. **Buttons mit sichtbarem Text:** 21 Dateien, 35+ Buttons
2. **Create-Button Größe:** 1 Datei (WorktimeStats.tsx) mit falscher Größe
3. **Gradienten:** 1 Datei (MarkdownPreview.tsx) - muss geprüft werden ob erlaubt
4. **Buttons mit blauem Hintergrund:** 36 Dateien gefunden - müssen geprüft werden ob Speichern-Buttons

### Noch zu prüfen:

- Layout-Positionierungs-Verstöße (flex-wrap, grid-Änderungen, position-Änderungen)
- Typografie-Verstöße
- Formular-Verstöße
- Tabellen-Verstöße
- Modal/Sidepane-Verstöße
- FilterPane-System-Verstöße
- Box-Design-Verstöße
- Card-Design-Verstöße
- Responsive Design-Verstöße

---

**Status:** Analyse läuft... Diese Dokumentation wird kontinuierlich aktualisiert.

