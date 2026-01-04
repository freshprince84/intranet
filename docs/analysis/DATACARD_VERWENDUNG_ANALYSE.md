# DataCard Verwendungs-Analyse

## Übersicht: Alle Verwendungen der Card-Ansicht

### 1. **Worktracker Page** (`frontend/src/pages/Worktracker.tsx`)

#### Tab: **Tareas (To Do's)**
- **Zeile**: ~2865-2974
- **Metadaten-Struktur**:
  - `section: 'left'` - Niederlassung (Branch)
  - `section: 'main'` - Verantwortlicher (Responsible) & Qualitätskontrolle (Quality Control)
  - `section: 'right-inline'` - Fälligkeitsdatum (Due Date) - **im Header rechts**
  - `section: 'full'` - Beschreibung (Description)
- **Status**: ✅ Korrekt - Verwendet `right-inline` für Datum im Header
- **Besonderheiten**: 
  - Titel: Task-ID + Titel
  - Status-Badge mit Workflow-Buttons
  - Action-Buttons für Status-Änderungen

#### Tab: **Reservaciones (Reservations)**
- **Zeile**: ~3270-3282
- **Metadaten-Struktur**:
  - `section: 'left'` - Telefon, Email, Branch
  - `section: 'center'` - Zahlungslink, Check-in Link
  - `section: 'right'` - Reservation Status, Payment Status, Betrag, Ankunftszeit
  - `section: 'full'` - Check-in/Check-out Datum, Zimmernummer, etc.
- **Status**: ✅ Korrekt - Verwendet 3-Spalten-Layout (left/center/right)
- **Besonderheiten**:
  - Titel: Gästename
  - Subtitle: Lobby Reservation ID
  - Expandable Content: Notification Logs

---

### 2. **Requests Component** (`frontend/src/components/Requests.tsx`)

#### Box: **Requests (Anträge)**
- **Zeile**: ~1846-1867
- **Metadaten-Struktur**:
  - `section: 'left'` - Niederlassung (Branch)
  - `section: 'main'` - Verantwortlicher (Responsible) & Qualitätskontrolle (Quality Control)
  - `section: 'right-inline'` - Fälligkeitsdatum (Due Date) - **im Header rechts**
  - `section: 'full'` - Beschreibung (Description)
- **Status**: ✅ Korrekt - Gleiche Struktur wie To Do's
- **Besonderheiten**:
  - Titel: Request-ID + Titel
  - Status-Badge mit Workflow-Buttons (approval, denied, etc.)
  - Action-Buttons für Status-Änderungen

---

### 3. **Team Worktime - Active Users List** (`frontend/src/components/teamWorktime/ActiveUsersList.tsx`)

#### Tab: **Aktive Benutzer**
- **Zeile**: ~1471-1481
- **Metadaten-Struktur**:
  - `section: 'left'` - Niederlassung (Branch)
  - `section: 'right'` - Status, Arbeitszeit
  - Keine `section: 'main'` oder `section: 'right-inline'`
- **Status**: ✅ Korrekt - Einfache 2-Spalten-Struktur
- **Besonderheiten**:
  - Titel: Benutzername
  - Expandable Content: Detaillierte Arbeitszeit-Informationen
  - Children Content: Zusätzliche Metadaten in erster Zeile

---

### 4. **Team Worktime - Request Analytics Tab** (`frontend/src/components/teamWorktime/RequestAnalyticsTab.tsx`)

#### Tab: **Request Analytics**
- **Zeile**: ~685-699
- **Metadaten-Struktur**:
  - `section: 'left'` - Niederlassung (Branch)
  - `section: 'main'` - Verantwortlicher (Responsible) & Qualitätskontrolle (Quality Control)
  - `section: 'right'` - Fälligkeitsdatum (Due Date)
  - `section: 'full'` - Beschreibung (Description)
- **Status**: ✅ Korrekt - Ähnlich wie To Do's, aber Datum in `section: 'right'` statt `right-inline`
- **Besonderheiten**:
  - Titel: Request-ID + Titel
  - Status-Badge (nur Anzeige, keine Buttons)
  - **Unterschied**: Datum wird in `section: 'right'` angezeigt (nicht im Header)

---

### 5. **Team Worktime - Todo Analytics Tab** (`frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx`)

#### Tab: **Todo Analytics**
- **Zeile**: ~1422-1441
- **Metadaten-Struktur**:
  - `section: 'left'` - Niederlassung (Branch)
  - `section: 'main'` - Verantwortlicher (Responsible) & Qualitätskontrolle (Quality Control)
  - `section: 'right'` - Fälligkeitsdatum (Due Date)
  - `section: 'full'` - Beschreibung (Description)
- **Status**: ✅ Korrekt - Ähnlich wie To Do's, aber Datum in `section: 'right'` statt `right-inline`
- **Besonderheiten**:
  - Titel: Todo-ID + Titel
  - Status-Badge (nur Anzeige, keine Buttons)
  - Expandable Content: Detaillierte Analytics-Informationen
  - **Unterschied**: Datum wird in `section: 'right'` angezeigt (nicht im Header)

---

### 6. **Monthly Reports Tab** (`frontend/src/components/MonthlyReportsTab.tsx`)

#### Tab: **Monatsberichte**
- **Zeile**: ~810-826
- **Metadaten-Struktur**:
  - `section: 'left'` - Kunde (Client)
  - `section: 'right'` - Status, Betrag, etc.
  - Keine `section: 'main'` oder `section: 'right-inline'`
- **Status**: ✅ Korrekt - Einfache 2-Spalten-Struktur
- **Besonderheiten**:
  - Titel: Report-Nummer
  - Subtitle: Generierungsdatum
  - Status-Badge
  - Expandable Content: Detaillierte Report-Informationen
  - Action-Buttons: Download, etc.

---

### 7. **Invoice Management Tab** (`frontend/src/components/InvoiceManagementTab.tsx`)

#### Tab: **Rechnungen**
- **Zeile**: ~1253-1268
- **Metadaten-Struktur**:
  - `section: 'left'` - Kunde (Client)
  - `section: 'right'` - Status, Betrag, etc.
  - Keine `section: 'main'` oder `section: 'right-inline'`
- **Status**: ✅ Korrekt - Einfache 2-Spalten-Struktur
- **Besonderheiten**:
  - Titel: Rechnungsnummer
  - Status-Badge
  - Expandable Content: Detaillierte Rechnungs-Informationen
  - Action-Buttons: Bearbeiten, etc.

---

### 8. **Tours Tab** (`frontend/src/components/tours/ToursTab.tsx`)

#### Tab: **Tours**
- **Zeile**: ~1142-1274
- **Verwendet**: ❌ **KEINE DataCard** - Eigene Card-Implementierung
- **Status**: ✅ Korrekt - Verwendet eigenes Card-Design (nicht DataCard)
- **Besonderheiten**:
  - Eigene Card-Struktur mit Bildern
  - Nicht Teil der DataCard-Komponente

---

## Zusammenfassung: Code-Korrektheit

### ✅ **Korrekte Verwendungen:**

1. **Worktracker - To Do's**: 
   - ✅ Verwendet `right-inline` für Datum im Header
   - ✅ Korrekte Metadaten-Struktur

2. **Worktracker - Reservations**: 
   - ✅ Verwendet 3-Spalten-Layout (left/center/right)
   - ✅ Korrekte Metadaten-Struktur

3. **Requests**: 
   - ✅ Verwendet `right-inline` für Datum im Header
   - ✅ Gleiche Struktur wie To Do's

4. **Active Users List**: 
   - ✅ Einfache 2-Spalten-Struktur
   - ✅ Keine Konflikte

5. **Request Analytics**: 
   - ✅ Verwendet `section: 'right'` für Datum (nicht im Header)
   - ✅ Korrekte Metadaten-Struktur

6. **Todo Analytics**: 
   - ✅ Verwendet `section: 'right'` für Datum (nicht im Header)
   - ✅ Korrekte Metadaten-Struktur

7. **Monthly Reports**: 
   - ✅ Einfache 2-Spalten-Struktur
   - ✅ Keine Konflikte

8. **Invoice Management**: 
   - ✅ Einfache 2-Spalten-Struktur
   - ✅ Keine Konflikte

### ⚠️ **Unterschiede (aber korrekt):**

- **To Do's & Requests**: Verwenden `right-inline` für Datum im Header
- **Analytics Tabs**: Verwenden `section: 'right'` für Datum (nicht im Header)
- **Reservations**: Verwenden 3-Spalten-Layout (left/center/right)

### ✅ **Fazit:**

**Kein Durcheinander im Code!** Alle Verwendungen sind korrekt und konsistent:
- Jede Box/Tab verwendet die passende Metadaten-Struktur
- Keine Konflikte zwischen verschiedenen Boxen/Tabs
- Die Struktur ist logisch und nachvollziehbar


