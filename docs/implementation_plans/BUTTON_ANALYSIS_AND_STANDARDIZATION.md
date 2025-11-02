# Button-Analyse und Standardisierung

## Übersicht

Diese Dokumentation analysiert alle Buttons im Frontend, kategorisiert sie und vergleicht sie mit den in `docs/core/DESIGN_STANDARDS.md` definierten Standards.

## Design-Standards (Kurzfassung)

### Button-Typen laut DESIGN_STANDARDS.md:

1. **btn-primary**: Primärer Button (blau, weißer Text)
2. **btn-secondary**: Sekundärer Button (weiß/grau, farbiger Text)
3. **btn-danger**: Löschen-Button (rot)
4. **btn-icon**: Icon-Button (runder Button mit Icon)
5. **btn-action**: Actions-Button (Neu erstellen, Listen anzeigen, Bearbeiten) - runder Button mit Icon

**Wichtig**: Buttons sollen primär Icons verwenden. Text sollte vermieden werden, außer bei primären Aktionen.

---

## Kategorisierung der Buttons

### 1. Edit & Copy Buttons ✅ KORREKT

Diese Buttons entsprechen dem Standard und sind korrekt implementiert.

#### Edit Buttons
- **Location**: `Requests.tsx`, `Worktracker.tsx`, `UserManagementTab.tsx`, `InvoiceManagementTab.tsx`, `ActiveUsersList.tsx`
- **Implementierung**: 
  - Icon: `PencilIcon`
  - Klasse: `text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 edit-button`
  - Größe: `h-5 w-5`
- **Standard**: ✅ Entspricht `btn-icon` - Icon-only, korrekte Farbe

#### Copy Buttons
- **Location**: `Requests.tsx`, `Worktracker.tsx`
- **Implementierung**:
  - Icon: `DocumentDuplicateIcon`
  - Klasse: `text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 copy-button`
  - Größe: `h-5 w-5`
- **Standard**: ✅ Entspricht `btn-icon` - Icon-only, korrekte Farbe

---

### 2. Löschen Buttons ❌ NICHT STANDARDISIERT

Alle Löschen-Buttons sind unterschiedlich implementiert:

#### 2.1 Löschen in Tabellen (Icon-only)
- **Location**: `WorktimeList.tsx`, `ConsultationList.tsx`, `RoleManagementTab.tsx`
- **Implementierung**:
  - Icon: `TrashIcon`
  - Klasse: `text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300`
  - Größe: `h-5 w-5` (WorktimeList) oder `h-4 w-4` (ConsultationList)
- **Standard**: ✅ Entspricht `btn-icon` - aber Größe variiert

#### 2.2 Löschen in Modals/Sidepanes (mit Text)
- **Location**: `EditRequestModal.tsx`, `EditTaskModal.tsx`, `EditClientModal.tsx`
- **Implementierung Variante 1** (EditRequestModal, EditTaskModal):
  ```tsx
  className={`px-4 py-2 rounded-md ${
    confirmDelete
      ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white'
      : 'bg-white text-red-600 border border-red-300 dark:bg-gray-800 dark:text-red-400 dark:border-red-700'
  }`}
  ```
  - Text: `{confirmDelete ? 'Bestätigen' : 'Löschen'}`
  - Standard: ❌ Text-Button statt Icon-only

- **Implementierung Variante 2** (EditClientModal):
  ```tsx
  className={`inline-flex items-center px-4 py-2 border ${
    confirmDelete
      ? 'border-red-300 text-red-700 bg-red-50 dark:border-red-600 dark:text-red-400 dark:bg-red-900/20'
      : 'border-red-300 text-red-700 bg-white hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:bg-gray-700 dark:hover:bg-gray-600'
  } text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed`}
  ```
  - Text: `{confirmDelete ? 'Wirklich löschen?' : 'Löschen'}` + `TrashIcon`
  - Standard: ❌ Text-Button, nicht standardisiert

#### 2.3 Löschen in EditWorktimeModal (Toggle)
- **Location**: `teamWorktime/EditWorktimeModal.tsx`
- **Implementierung**:
  ```tsx
  className={`p-1 rounded ${entry.isDeleted ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300' : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'}`}
  ```
  - Icon: `TrashIcon`
  - Text: `title={entry.isDeleted ? 'Wiederherstellen' : 'Zum Löschen markieren'}`
  - Standard: ⚠️ Funktional anders, aber Icon-only ist gut

#### 2.4 Weitere Löschen-Buttons
- **SavedFilterTags**: `p-1 text-gray-400 hover:text-red-600` - Icon-only ✅
- **ClientSelectModal**: `text-red-600 hover:text-red-800` - Icon-only ✅
- **NotificationList**: Button-Komponente mit `color="error"` - Text "Löschen" ❌

**Problem**: Löschen-Buttons in Modals/Sidepanes haben Text, sollten aber Icon-only sein laut Standard.

---

### 3. Speichern & Abbrechen Buttons ❌ NICHT STANDARDISIERT

Diese Buttons sind in verschiedenen Modals/Sidepanes unterschiedlich implementiert:

#### 3.1 Speichern Buttons

##### Variante 1: Standard Modal Buttons
- **Location**: `EditRequestModal.tsx`, `EditTaskModal.tsx`, `CreateRequestModal.tsx`, `CreateTaskModal.tsx`
- **Implementierung**:
  ```tsx
  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
  ```
  - Text: `{loading ? 'Wird gespeichert...' : 'Speichern'}` oder `{loading ? 'Wird erstellt...' : 'Erstellen'}`
  - Standard: ✅ Entspricht `btn-primary`, aber mit Text

##### Variante 2: Sidepane Buttons (gleiche Klasse, aber Text)
- **Location**: `CreateClientModal.tsx`, `EditClientModal.tsx` (Sidepane)
- **Implementierung**: Gleiche Klasse wie Variante 1
- **Text**: `{loading ? 'Speichere...' : 'Speichern'}` oder `'Erstellen'`
- **Standard**: ✅ Entspricht `btn-primary`, aber mit Text

##### Variante 3: Spezialfälle
- **UserManagementTab.tsx**: 
  ```tsx
  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-md hover:bg-blue-700 dark:hover:bg-blue-800"
  ```
  - Text: `"Speichern"` oder `"Erstellen"`
- **RoleManagementTab.tsx**:
  ```tsx
  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
  ```
  - Text: `{editingRole ? 'Aktualisieren' : 'Erstellen'}`
- **Profile.tsx**:
  ```tsx
  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
  ```
  - Text: `"Speichern"`

##### Variante 4: Mini-Speichern Buttons (in Inline-Edits)
- **Location**: `ConsultationList.tsx` (Zeit-Edit, Notizen-Edit)
- **Implementierung**:
  ```tsx
  className="p-0.5 text-green-600 hover:text-green-700" // Speichern
  className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded" // Notizen
  ```
  - Text: Icon (Check-SVG) oder `"Speichern"`
  - Größe: Sehr klein (`p-0.5`, `px-2 py-1 text-xs`)

##### Variante 5: Andere Spezialfälle
- **EditWorktimeModal.tsx**:
  ```tsx
  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
  ```
  - Text: `{loading ? 'Wird gespeichert...' : 'Speichern'}`
- **OrganizationSettings.tsx**:
  ```tsx
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
  ```
  - Text: `{saving ? 'Speichern...' : 'Speichern'}`
- **MonthlyReportSettingsModal.tsx**:
  ```tsx
  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
  ```
  - Text: `{isSaving ? 'Speichere...' : 'Aktivieren'}`

**Problem**: Alle verwenden Text statt Icons. Laut Standard sollten primäre Actions Icon-only sein.

#### 3.2 Abbrechen Buttons

##### Variante 1: Standard Modal Buttons
- **Location**: `EditRequestModal.tsx`, `EditTaskModal.tsx`, `CreateRequestModal.tsx`, `CreateTaskModal.tsx`
- **Implementierung**:
  ```tsx
  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
  ```
  - Text: `"Abbrechen"`
  - Standard: ⚠️ Entspricht `btn-secondary`, aber mit Text

##### Variante 2: Sidepane Buttons
- **Location**: `CreateClientModal.tsx`, `EditClientModal.tsx`, `RoleManagementTab.tsx` (Sidepane)
- **Implementierung**:
  ```tsx
  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
  ```
  - Text: `"Abbrechen"`
  - Standard: ⚠️ Kein Border/Background, anders als Variante 1

##### Variante 3: Mini-Abbrechen Buttons
- **Location**: `ConsultationList.tsx` (Zeit-Edit, Notizen-Edit)
- **Implementierung**:
  ```tsx
  className="p-0.5 text-red-600 hover:text-red-700" // Zeit-Edit
  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" // Notizen
  ```
  - Text: `"Abbrechen"` oder Icon (`XMarkIcon`)

##### Variante 4: Andere Spezialfälle
- **EditWorktimeModal.tsx**:
  ```tsx
  className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
  ```
- **UserManagementTab.tsx**:
  ```tsx
  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
  ```
- **Profile.tsx**:
  ```tsx
  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
  ```

**Problem**: Unterschiedliche Styles, alle mit Text. Sollten einheitlich sein.

---

### 4. Statuswechsel Buttons ❌ NICHT STANDARDISIERT

Status-Buttons haben unterschiedliche Größen und Farben:

#### 4.1 Requests Status-Buttons
- **Location**: `Requests.tsx`
- **Implementierung**:
  ```tsx
  // Genehmigen
  className="p-1 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
  
  // Verbessern
  className="p-1 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600"
  
  // Ablehnen
  className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
  ```
  - Größe: `p-1` (sehr klein)
  - Icons: `CheckIcon`, `ExclamationTriangleIcon`, `XMarkIcon`
  - Größe: `h-5 w-5`

#### 4.2 Tasks Status-Buttons
- **Location**: `Worktracker.tsx`
- **Implementierung**:
  ```tsx
  // Zurück (backward)
  className="p-1 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600"
  
  // Weiter (forward) - verschiedene Farben je nach Status
  className="p-1 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600" // open -> in_progress
  className="p-1 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600" // in_progress -> quality_control
  className="p-1 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600" // quality_control -> done
  ```
  - Größe: `p-1`
  - Icons: `ArrowLeftIcon`, `ArrowRightIcon`
  - Größe: `h-5 w-5`

**Problem**: 
- Beide verwenden `p-1`, aber könnten konsistenter sein
- Farben sind unterschiedlich (grün, orange, rot, blau, lila, grau)
- Standard definiert keine spezifischen Status-Button-Farben

---

### 5. Buttons mit Text ❌ ALLE NICHT STANDARDISIERT

Alle Buttons, die Text enthalten, entsprechen nicht dem Standard (der Icon-only bevorzugt):

#### 5.1 "Neu erstellen" / "Erstellen" Buttons

##### Haupt-Create Buttons (rund, mit Icon + Text)
- **Location**: `Requests.tsx`, `Worktracker.tsx`, `UserManagementTab.tsx`
- **Implementierung**:
  ```tsx
  className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
  ```
  - Icon: `PlusIcon` (`h-5 w-5`)
  - Text: "Neuen Request erstellen" (als `title` oder `aria-label`)
  - Standard: ⚠️ Runder Button ist gut, aber Text sollte nur im Tooltip sein

##### "Rechnung erstellen" Button
- **Location**: `ConsultationList.tsx`
- **Implementierung**:
  ```tsx
  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors ml-2"
  ```
  - Text: `"Rechnung erstellen"`
  - Standard: ❌ Text-Button statt Icon-only

##### "Rechnung erstellen" im Modal
- **Location**: `CreateInvoiceModal.tsx`
- **Implementierung**:
  ```tsx
  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
  ```
  - Text: `{loading ? 'Erstelle Rechnung...' : 'Rechnung erstellen'}`
  - Standard: ❌ Text-Button

#### 5.2 "Organisation beitreten" / "Neue Organisation erstellen"
- **Location**: `OrganizationSettings.tsx`
- **Implementierung**:
  ```tsx
  // Beitreten
  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
  
  // Neu erstellen
  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md dark:bg-green-700 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
  ```
  - Text: `<span className="hidden sm:inline">Beitreten</span>` oder `<span className="hidden sm:inline">Neu</span>`
  - Icons: `UserPlusIcon`, `PlusIcon`
  - Standard: ❌ Text sichtbar (wenn nicht mobil)

#### 5.3 "Aktualisieren" Buttons
- **Location**: `RoleManagementTab.tsx`, `IdentificationDocumentForm.tsx`
- **Implementierung**:
  ```tsx
  // RoleManagementTab
  {editingRole ? 'Aktualisieren' : 'Erstellen'}
  
  // IdentificationDocumentForm
  {isLoading ? 'Wird gespeichert...' : document ? 'Aktualisieren' : 'Speichern'}
  ```
  - Standard: ❌ Text statt Icon-only

#### 5.4 "Als bezahlt markieren"
- **Location**: `InvoiceManagementTab.tsx`, `InvoiceDetailModal.tsx`
- **Implementierung**:
  ```tsx
  // InvoiceManagementTab (Icon-only, gut!)
  className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
  Icon: CurrencyDollarIcon
  
  // InvoiceDetailModal (mit Text, schlecht!)
  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
  Text: "Als bezahlt markieren"
  ```
  - Standard: ⚠️ Inkonsistent - einmal Icon-only, einmal mit Text

#### 5.5 "Herunterladen" Buttons
- **Location**: `EditRequestModal.tsx`, `EditTaskModal.tsx`, `InvoiceManagementTab.tsx`
- **Implementierung**:
  ```tsx
  // EditRequestModal, EditTaskModal (Icon-only, gut!)
  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
  Icon: ArrowDownTrayIcon
  title="Herunterladen"
  
  // InvoiceManagementTab (Icon-only, gut!)
  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
  Icon: DocumentArrowDownIcon
  ```
  - Standard: ✅ Icon-only ist korrekt

#### 5.6 Andere Text-Buttons
- **"Schließen"** (`InvoiceDetailModal.tsx`): `className="...bg-blue-600..."`
- **"Senden"** (`JoinOrganizationModal.tsx`): `{loading ? 'Sende...' : 'Senden'}`
- **"Aktivieren"** (`MonthlyReportSettingsModal.tsx`): `{isSaving ? 'Speichere...' : 'Aktivieren'}`
- **"Bestätigen"** (verschiedene Modals): `"Bestätigen"` oder `{loading ? 'Wird gelöscht...' : 'Bestätigen'}`
- **"Zurücksetzen & neu befüllen"** (`DatabaseManagement.tsx`): `"Zurücksetzen & neu befüllen"`
- **"Demo-Clients entfernen"** (`DatabaseManagement.tsx`): `"Demo-Clients entfernen"`
- **"Aktualisieren"** (`DatabaseManagement.tsx`): `"Aktualisieren"`
- **"Zurück"** (Back-Buttons in verschiedenen Modals): Icon-only (XMarkIcon) ✅

**Problem**: Fast alle primären Actions haben sichtbaren Text statt Icon-only.

---

## Zusammenfassung der Probleme

### ✅ Korrekt implementiert:
1. Edit & Copy Buttons (Icon-only, korrekte Farben)
2. Herunterladen Buttons (Icon-only)
3. Haupt-Create Buttons (rund, Icon, Text nur als Tooltip)
4. Status-Buttons in Requests & Tasks (Icon-only, konsistente Größe `p-1`)

### ❌ Probleme:

1. **Löschen Buttons in Modals/Sidepanes**:
   - Haben Text statt Icon-only
   - Unterschiedliche Styles (Variante 1 vs. Variante 2)

2. **Speichern & Abbrechen Buttons**:
   - Alle haben Text statt Icons
   - Unterschiedliche Styles zwischen Modals und Sidepanes
   - Inkonsistente Padding/Größen

3. **Status-Buttons**:
   - Unterschiedliche Farben (was okay sein kann für verschiedene Status)
   - Aber Größe ist konsistent (`p-1`)

4. **Text-Buttons allgemein**:
   - Fast alle primären Actions haben sichtbaren Text
   - Sollten laut Standard Icon-only sein (Text nur im Tooltip)

---

## Empfehlungen

### 1. Edit & Copy Buttons
✅ **Keine Änderungen nötig** - sind korrekt implementiert

### 2. Löschen Buttons
- **In Tabellen**: Bleiben Icon-only ✅
- **In Modals/Sidepanes**: Sollten zu Icon-only geändert werden
  - Verwende `btn-icon` mit `TrashIcon`
  - Text nur im `title` Attribut
  - Bestätigungsdialog kann bleiben

### 3. Speichern & Abbrechen Buttons
- **Speichern**: Sollte Icon-only werden (z.B. `CheckIcon` oder `ArrowDownTrayIcon`)
- **Abbrechen**: Sollte Icon-only werden (z.B. `XMarkIcon` oder `ArrowLeftIcon`)
- **Einheitlicher Style**: Gleiche Padding/Größen in allen Modals/Sidepanes

### 4. Status-Buttons
- **Größe**: Bleibt `p-1` ✅
- **Farben**: Können unterschiedlich bleiben (Status-spezifisch)

### 5. Text-Buttons
- **Alle primären Actions**: Text entfernen, nur Icons verwenden
- **Tooltips**: Text in `title` Attribut verschieben
- **Ausnahmen**: Sehr selten, wenn wirklich notwendig (z.B. Formular-Submit in großen Modals)

---

## Nächste Schritte

1. **Priorität 1**: Löschen Buttons in Modals/Sidepanes standardisieren
2. **Priorität 2**: Speichern & Abbrechen Buttons zu Icon-only ändern
3. **Priorität 3**: Alle anderen Text-Buttons analysieren und standardisieren
4. **Priorität 4**: Einheitliche Button-Styles in allen Modals/Sidepanes durchsetzen
