# Design-Standards Behebungsplan

**Datum:** 2025-01-30  
**Zweck:** Vollständiger Plan zur Behebung ALLER Design-Standards-Verstöße  
**Status:** Planung abgeschlossen, Umsetzung ausstehend

---

## Zusammenfassung aller Verstöße

### Gesamt-Übersicht

**Kritische Verstöße gefunden:**
- **26 Dateien** mit Buttons mit sichtbarem Text (statt Icon-only)
- **1 Datei** mit falscher Create-Button Größe
- **1 Datei** mit Gradienten (muss geprüft werden)
- **Gesamt: ~40+ Buttons** müssen korrigiert werden

---

## Kategorie 1: Buttons mit sichtbarem Text (statt Icon-only)

**Regel:** Alle Buttons müssen Icon-only sein, Text nur im `title` Attribut für Tooltips.

### Priorität: 🔴 HOCH (kritisch)

### Liste aller betroffenen Dateien:

#### Gruppe 1: Sidepane/Modal-Komponenten (11 Dateien)

1. **SendPasscodeSidepane.tsx** (Zeilen 363-379)
   - 2 Buttons: "Abbrechen", "Senden" / "Wird gesendet..."
   - Icons: `XMarkIcon`, `PaperAirplaneIcon`
   - Status: ❌

2. **SendInvitationSidepane.tsx** (Zeilen 404-420)
   - 2 Buttons: "Abbrechen", "Senden" / "Wird gesendet..."
   - Icons: `XMarkIcon`, `PaperAirplaneIcon`
   - Status: ❌

3. **RoomDescriptionsSection.tsx** (Zeilen 244-261)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

4. **EditTourBookingModal.tsx** (Zeilen 293-306)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

5. **EditTourProviderModal.tsx** (Zeilen 234-247)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

6. **CreateTourProviderModal.tsx** (Zeilen 223-236)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

7. **EditTourModal.tsx** (Zeilen 700-713)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

8. **CreateTourBookingModal.tsx** (Zeilen 332-345)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

9. **CreateTourModal.tsx** (Zeilen 623-636)
   - 2 Buttons: "Abbrechen", "Speichern" / "Speichere..."
   - Icons: `XMarkIcon`, `CheckIcon`
   - Status: ❌

10. **CreateReservationModal.tsx** (Zeilen 418-434)
    - 2 Buttons: "Abbrechen", "Erstellen" / "Wird erstellt..."
    - Icons: `XMarkIcon`, `PlusIcon` oder `CheckIcon`
    - Status: ❌

11. **GuestContactModal.tsx** (Zeilen 135-151)
    - 2 Buttons: "Abbrechen", "Speichern" / "Wird gespeichert..."
    - Icons: `XMarkIcon`, `CheckIcon`
    - Status: ❌

#### Gruppe 2: Dialog/Modal-Komponenten (4 Dateien)

12. **TourExportDialog.tsx** (Zeilen 243-258)
    - 2 Buttons: "Abbrechen", "Exportieren" / "Exportiere..."
    - Icons: `XMarkIcon`, `ArrowDownTrayIcon`
    - Status: ❌

13. **InvoiceSuccessModal.tsx** (Zeilen 128-158)
    - 3 Buttons: "PDF wird generiert..." / "PDF herunterladen", "Zur Rechnungsverwaltung", "Schließen"
    - Icons: `ArrowDownTrayIcon`, `DocumentTextIcon`, `XMarkIcon`
    - Status: ❌

14. **ClientSelectModal.tsx** (Zeilen 145-151, 204-209)
    - 2 Buttons: "Neuen Client anlegen" (2x)
    - Icons: `PlusIcon`
    - Status: ❌

15. **CreateInvoiceModal.tsx** (Zeilen 113-118)
    - 1 Button: "Schließen"
    - Icons: `XMarkIcon`
    - Status: ❌

#### Gruppe 3: Tab/List-Komponenten (4 Dateien)

16. **MyJoinRequestsList.tsx** (Zeilen 496-504)
    - 1 Button: "Zurückziehen" / "Wird zurückgezogen..."
    - Icons: `ArrowUturnLeftIcon` oder `XMarkIcon`
    - Status: ❌

17. **JoinRequestsList.tsx** (Zeilen 532-538)
    - 1 Button: "Bearbeiten"
    - Icons: `PencilIcon`
    - Status: ❌

18. **DocumentConfigurationTab.tsx** (Zeilen 601-609)
    - 1 Button: "Lade hoch..." / "Hochladen"
    - Icons: `ArrowUpTrayIcon` oder `DocumentArrowUpIcon`
    - Status: ❌

19. **ActiveUsersList.tsx** (Zeilen 1567-1572)
    - 1 Button: "Mehr anzeigen (X verbleibend)"
    - Icons: `ChevronDownIcon` oder `ArrowDownIcon`
    - Status: ❌

#### Gruppe 4: Analytics/Worktime-Komponenten (2 Dateien)

20. **TodoAnalyticsTab.tsx** (Zeilen 468-479)
    - 2 Buttons: "Häufigkeitsanalyse" / "Schicht-Analyse" (Toggle-Buttons)
    - Icons: `ChartBarIcon`, `CalendarIcon`
    - Status: ❌

21. **EditShiftModal.tsx** (Zeilen 403-410, 420-434)
    - 3 Buttons: "Löschen", "Ja", "Nein"
    - Icons: `TrashIcon`, `CheckIcon`, `XMarkIcon`
    - Status: ❌

#### Gruppe 5: Seiten-Komponenten (3 Dateien)

22. **Settings.tsx** (Zeilen 402-421, 573-604)
    - 2 Buttons: "Onboarding-Tour neu starten", "Vollständigen Sync starten" / "Sync läuft..."
    - Icons: `AcademicCapIcon` oder `ArrowPathIcon`, `ArrowPathIcon`
    - Status: ❌

23. **Profile.tsx** (Zeilen 433-441)
    - 1 Button: "Dokument hochladen"
    - Icons: `DocumentTextIcon` (bereits vorhanden)
    - Status: ❌

24. **Organisation.tsx** (Zeilen 267-277, 278-288)
    - 2 Buttons: "Touren", "Proveedores" (Toggle-Buttons)
    - Icons: `MapIcon` oder `CalendarIcon`, `TruckIcon` (bereits importiert)
    - Status: ❌

---

## Kategorie 2: Create-Button Standard-Verstöße

**Regel:** Create-Buttons müssen IMMER links positioniert sein, IMMER rund (`rounded-full`), IMMER Icon-only, IMMER weißen Hintergrund mit blauem Icon und blauem Rand haben, IMMER die Größe `p-1.5` mit `style={{ width: '30.19px', height: '30.19px' }}`.

### Priorität: 🟡 MITTEL

### Liste aller betroffenen Dateien:

1. **WorktimeStats.tsx** (Zeile 623)
   - Problem: Button hat NICHT die exakte Größe `30.19px × 30.19px`
   - Stattdessen: `p-1 sm:p-1.5` mit `min-w-7 min-h-7 sm:min-w-8 sm:min-h-8 w-7 h-7 sm:w-8 sm:h-8`
   - Korrektur: Auf `p-1.5` mit `style={{ width: '30.19px', height: '30.19px' }}` ändern
   - Status: ❌

---

## Kategorie 3: Farben/Hintergründe-Verstöße

**Regel:** Seitenhintergründe sind IMMER einfarbig - keine Gradienten!

### Priorität: 🟢 NIEDRIG (muss geprüft werden)

### Liste aller betroffenen Dateien:

1. **MarkdownPreview.tsx** (Zeilen 117, 132)
   - Problem: Verwendet `bg-gradient-to-br from-blue-500 to-purple-600` für Link-Vorschau-Platzhalter
   - Status: ⚠️ **ZU PRÜFEN** - Ist das ein Seitenhintergrund oder ein UI-Element?
   - Entscheidung erforderlich: Laut Regel sind Gradienten für spezifische UI-Elemente erlaubt, NICHT für Seitenhintergründe

---

## Behebungsplan

### Phase 1: Buttons mit sichtbarem Text (Priorität: 🔴 HOCH)

#### Schritt 1.1: Sidepane/Modal-Komponenten (11 Dateien)

**Vorgehen:**
1. Für jede Datei:
   - Text aus Button entfernen
   - Icon hinzufügen (falls nicht vorhanden)
   - `title` Attribut für Tooltip hinzufügen
   - Größe auf `p-2` ändern (Icon-only)
   - Hintergrund transparent machen (außer Speichern-Buttons)
   - `rounded-md` verwenden

**Standard-Pattern für Abbrechen/Speichern-Buttons:**
```tsx
// Abbrechen-Button
<button
  type="button"
  onClick={onClose}
  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
  title={t('common.cancel')}
>
  <XMarkIcon className="h-5 w-5" />
</button>

// Speichern-Button (darf blauen Hintergrund haben)
<button
  type="submit"
  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
  title={t('common.save')}
>
  <CheckIcon className="h-5 w-5" />
</button>
```

**Dateien (in dieser Reihenfolge):**
1. SendPasscodeSidepane.tsx
2. SendInvitationSidepane.tsx
3. RoomDescriptionsSection.tsx
4. EditTourBookingModal.tsx
5. EditTourProviderModal.tsx
6. CreateTourProviderModal.tsx
7. EditTourModal.tsx
8. CreateTourBookingModal.tsx
9. CreateTourModal.tsx
10. CreateReservationModal.tsx
11. GuestContactModal.tsx

**Geschätzte Zeit:** 2-3 Stunden

---

#### Schritt 1.2: Dialog/Modal-Komponenten (4 Dateien)

**Vorgehen:**
1. Für jede Datei:
   - Text aus Button entfernen
   - Icon hinzufügen (falls nicht vorhanden)
   - `title` Attribut für Tooltip hinzufügen
   - Größe auf `p-2` ändern
   - Hintergrund transparent machen (außer Speichern-Buttons)

**Dateien:**
1. TourExportDialog.tsx
2. InvoiceSuccessModal.tsx
3. ClientSelectModal.tsx
4. CreateInvoiceModal.tsx

**Geschätzte Zeit:** 1-2 Stunden

---

#### Schritt 1.3: Tab/List-Komponenten (4 Dateien)

**Vorgehen:**
1. Für jede Datei:
   - Text aus Button entfernen
   - Icon hinzufügen (falls nicht vorhanden)
   - `title` Attribut für Tooltip hinzufügen
   - Größe auf `p-2` ändern
   - Hintergrund transparent machen

**Dateien:**
1. MyJoinRequestsList.tsx
2. JoinRequestsList.tsx
3. DocumentConfigurationTab.tsx
4. ActiveUsersList.tsx

**Geschätzte Zeit:** 1-2 Stunden

---

#### Schritt 1.4: Analytics/Worktime-Komponenten (2 Dateien)

**Vorgehen:**
1. Für jede Datei:
   - Text aus Button entfernen
   - Icon hinzufügen (falls nicht vorhanden)
   - `title` Attribut für Tooltip hinzufügen
   - Größe auf `p-2` ändern
   - Hintergrund transparent machen

**Dateien:**
1. TodoAnalyticsTab.tsx
2. EditShiftModal.tsx

**Geschätzte Zeit:** 1 Stunde

---

#### Schritt 1.5: Seiten-Komponenten (3 Dateien)

**Vorgehen:**
1. Für jede Datei:
   - Text aus Button entfernen
   - Icon hinzufügen (falls nicht vorhanden)
   - `title` Attribut für Tooltip hinzufügen
   - Größe auf `p-2` ändern
   - Hintergrund transparent machen (außer Speichern-Buttons)

**Dateien:**
1. Settings.tsx
2. Profile.tsx
3. Organisation.tsx

**Geschätzte Zeit:** 1 Stunde

---

### Phase 2: Create-Button Standard (Priorität: 🟡 MITTEL)

#### Schritt 2.1: WorktimeStats.tsx korrigieren

**Vorgehen:**
1. Create-Button Größe auf `p-1.5` mit `style={{ width: '30.19px', height: '30.19px' }}` ändern
2. Responsive Klassen entfernen (`min-w-7 min-h-7 sm:min-w-8 sm:min-h-8 w-7 h-7 sm:w-8 sm:h-8`)
3. Referenz-Implementierung verwenden (z.B. `UserManagementTab.tsx` Zeile 738-752)

**Geschätzte Zeit:** 15 Minuten

---

### Phase 3: Farben/Hintergründe (Priorität: 🟢 NIEDRIG)

#### Schritt 3.1: MarkdownPreview.tsx prüfen

**Vorgehen:**
1. Prüfen, ob Gradient für UI-Element (Link-Vorschau-Platzhalter) erlaubt ist
2. Entscheidung treffen: Behalten oder durch einfarbigen Hintergrund ersetzen
3. Falls erlaubt: Dokumentation aktualisieren
4. Falls nicht erlaubt: Durch einfarbigen Hintergrund ersetzen

**Geschätzte Zeit:** 15 Minuten

---

## Zeitplan

### Gesamt-Geschätzte Zeit: 6-8 Stunden

**Phase 1 (Buttons mit Text):** 6-7 Stunden
- Schritt 1.1: 2-3 Stunden
- Schritt 1.2: 1-2 Stunden
- Schritt 1.3: 1-2 Stunden
- Schritt 1.4: 1 Stunde
- Schritt 1.5: 1 Stunde

**Phase 2 (Create-Button):** 15 Minuten

**Phase 3 (Gradienten):** 15 Minuten

---

## Checkliste für jede Korrektur

Für jede Datei, die korrigiert wird:

- [ ] Text aus Button entfernt
- [ ] Icon hinzugefügt (falls nicht vorhanden)
- [ ] `title` Attribut für Tooltip hinzugefügt
- [ ] Größe auf `p-2` geändert (Icon-only)
- [ ] Hintergrund transparent gemacht (außer Speichern-Buttons)
- [ ] `rounded-md` verwendet
- [ ] Dark Mode Support geprüft
- [ ] Responsive Verhalten geprüft
- [ ] Code-Review durchgeführt
- [ ] Dokumentation aktualisiert (falls nötig)

---

## Referenz-Implementierungen

### Korrekte Icon-only Buttons:

1. **Abbrechen-Button:**
   - `Profile.tsx` Zeile 677-684 ✅

2. **Speichern-Button:**
   - `Profile.tsx` Zeile 670-676 ✅

3. **Create-Button:**
   - `UserManagementTab.tsx` Zeile 738-752 ✅
   - `Worktracker.tsx` Zeile 3319-3333 ✅
   - `Requests.tsx` Zeile 1010-1024 ✅

---

## Nächste Schritte

1. ✅ Vollständige Analyse abgeschlossen
2. ✅ Behebungsplan erstellt
3. ⏳ **WARTEN AUF BESTÄTIGUNG** des Plans
4. ⏳ Umsetzung starten (Phase 1 → Phase 2 → Phase 3)
5. ⏳ Code-Review durchführen
6. ⏳ Dokumentation aktualisieren

---

**Status:** Planung abgeschlossen, wartet auf Bestätigung zur Umsetzung

