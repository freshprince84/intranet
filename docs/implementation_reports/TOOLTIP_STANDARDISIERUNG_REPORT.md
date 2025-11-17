# Tooltip-Standardisierung - Implementierungsreport

## Executive Summary

**Status:** ✅ Phase 1 und Phase 2 (Teilweise) abgeschlossen

**Datum:** 2024-12-19

**Ziel:** Alle Tooltips im Projekt auf einheitliches Standard-Design umstellen

**Umfang:**
- ✅ **Phase 1:** 14 Custom-Tooltip-Implementierungen angepasst
- 🔄 **Phase 2:** 127 von 319 HTML `title=` Attributen ersetzt (40%)
- ⏳ **Phase 3:** Testing und finale Anpassungen (ausstehend)

**Gesamt Fortschritt:** 141 von 333 Tooltips standardisiert (42%)

## Standard-Tooltip-Design

### Definition

Das Standard-Tooltip-Design ist definiert in `frontend/src/components/Sidebar.tsx`:

```tsx
<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
  {tooltipText}
</div>
```

### Wrapper-Struktur

Jedes Element mit Tooltip muss in einem Wrapper sein:

```tsx
<div className="relative group">
  {/* Element (Button, Icon, etc.) */}
  <button>...</button>
  {/* Tooltip */}
  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
    {tooltipText}
  </div>
</div>
```

## Phase 1: Custom-Tooltip-Implementierungen (14 Stück) ✅

### 1. ArticleStructure.tsx ✅
- **Datei:** `frontend/src/components/cerebro/ArticleStructure.tsx`
- **Zeile:** 349
- **Änderungen:**
  - `text-xs` → `text-sm`
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `dark:bg-gray-700` entfernt
  - Position: `bottom-full mb-2` → `left-full ml-2`
  - `transition-opacity duration-200`, `pointer-events-none`, `z-50` hinzugefügt

### 2. NotificationSettings.tsx ✅
- **Datei:** `frontend/src/components/NotificationSettings.tsx`
- **Zeilen:** 188, 241
- **Änderungen:**
  - `whitespace-normal` → `whitespace-nowrap`
  - `max-w-xs` entfernt
  - Position: `bottom-[calc(100%+0.5rem)]` → `left-full ml-2`

### 3. MarkdownPreview.tsx ✅
- **Datei:** `frontend/src/components/MarkdownPreview.tsx`
- **Zeile:** ~150
- **Änderungen:**
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` und `pointer-events-none` hinzugefügt
  - Spezifische Positionierung und Design beibehalten (Bildvorschau-Funktionalität)

### 4. Worktracker.tsx ✅
- **Datei:** `frontend/src/pages/Worktracker.tsx`
- **Zeilen:** ~1447, ~2418
- **Änderungen:**
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` und `pointer-events-none` hinzugefügt
  - Spezifisches Design für große Beschreibungen beibehalten

### 5. Requests.tsx ✅
- **Datei:** `frontend/src/components/Requests.tsx`
- **Zeile:** ~800
- **Änderungen:**
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` und `pointer-events-none` hinzugefügt
  - Spezifisches Design für große Beschreibungen beibehalten

### 6. Bildvorschau-Tooltips (6 Stück) ✅
- **Dateien:**
  - `CreateTaskModal.tsx`
  - `CreateRequestModal.tsx`
  - `EditTaskModal.tsx`
  - `EditRequestModal.tsx`
- **Änderungen:**
  - `invisible group-hover:visible` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` und `pointer-events-none` hinzugefügt
  - Spezifische Positionierung und Design beibehalten (Bildvorschau-Funktionalität)

### 7. NotificationList.tsx ✅
- **Datei:** `frontend/src/components/NotificationList.tsx`
- **Zeilen:** Mehrere
- **Änderungen:**
  - Material-UI `Tooltip` Komponente entfernt
  - Custom Tooltip-Struktur mit Standard-Design hinzugefügt
  - Import von `Tooltip` aus `@mui/material` entfernt

## Phase 2: HTML title-Attribute ersetzen (127 von 319) 🔄

### Abgeschlossene Dateien

#### 1. RoleManagementTab.tsx ✅ (23 Attribute)
- **Datei:** `frontend/src/components/RoleManagementTab.tsx`
- **Ersetzt:** 23 `title=` Attribute
- **Gruppen:**
  - Action Buttons (Copy, Edit, Delete, Show More)
  - View-Mode Toggle
  - Filter Button
  - Status Badges

#### 2. Worktracker.tsx ✅ (21 Attribute)
- **Datei:** `frontend/src/pages/Worktracker.tsx`
- **Ersetzt:** 21 `title=` Attribute
- **Gruppen:**
  - View-Mode Toggle (2x)
  - Filter Button (2x)
  - Show Description (2x)
  - Copy Task (2x)
  - View Details (4x)
  - Create Buttons (2x)
  - Sync Button (1x)
  - Action Buttons (6x)

#### 3. InvoiceManagementTab.tsx ✅ (14 Attribute)
- **Datei:** `frontend/src/components/InvoiceManagementTab.tsx`
- **Ersetzt:** 14 `title=` Attribute
- **Gruppen:**
  - Header Buttons (Filter, View-Mode, Column Config)
  - Table Actions (Expand, Edit, Download, Mark as Paid)
  - Card Actions (Edit, Download, Mark as Paid)
  - Sidepane Actions (Delete Position, Cancel, Save)

#### 4. TodoAnalyticsTab.tsx ✅ (13 Attribute)
- **Datei:** `frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx`
- **Ersetzt:** 13 `title=` Attribute
- **Gruppen:**
  - Header Buttons (View-Mode, Filter)
  - Expand Buttons (Show Todos, Status-Historie)
  - Balkendiagramm divs (9x verschiedene Status-Balken)

#### 5. ConsultationList.tsx ✅ (12 Attribute)
- **Datei:** `frontend/src/components/ConsultationList.tsx`
- **Ersetzt:** 12 `title=` Attribute
- **Gruppen:**
  - Header Buttons (Filter, Create Invoice)
  - Status Buttons (Invoice, Monthly Report)
  - Time Edit Buttons (Save/Cancel für startTime/endTime)
  - Action Buttons (Link Task, Delete)
  - Notes Buttons (Cancel, Save)

#### 6. SavedFilterTags.tsx ✅ (11 Attribute)
- **Datei:** `frontend/src/components/SavedFilterTags.tsx`
- **Ersetzt:** 11 `title=` Attribute
- **Gruppen:**
  - Group Tag & Filter Tags (3x)
  - Group Edit Buttons (Save, Cancel, Rename, Ungroup)
  - Filter Actions (Delete Buttons)
  - Dropdown Items (Show More, Filter in Dropdown)

#### 7. LifecycleView.tsx ✅ (10 Attribute)
- **Datei:** `frontend/src/components/LifecycleView.tsx`
- **Ersetzt:** 10 `title=` Attribute
- **Gruppen:**
  - Offboarding Buttons (Start, Complete)
  - Contract Date Edit Buttons (2x)
  - Certificate Buttons (Create, Edit, Download)
  - Contract Buttons (Create, Edit, Download)

#### 8. MonthlyReportsTab.tsx ✅ (7 Attribute)
- **Datei:** `frontend/src/components/MonthlyReportsTab.tsx`
- **Ersetzt:** 7 `title=` Attribute (2 DataCard props bleiben unverändert)
- **Gruppen:**
  - Table Actions (Expand, Download, Edit Consultations)
  - Card Actions (Download, Edit Consultations)
  - Sidepane Actions (Save, Delete)

#### 9. UserManagementTab.tsx ✅ (8 Attribute)
- **Datei:** `frontend/src/components/UserManagementTab.tsx`
- **Ersetzt:** 8 `title=` Attribute
- **Gruppen:**
  - Create Button
  - Edit Buttons (Cancel, Save)
  - Activate/Deactivate Button
  - Modal Buttons (Cancel, Create)

#### 10. ActiveUsersList.tsx ✅ (8 Attribute)
- **Datei:** `frontend/src/components/teamWorktime/ActiveUsersList.tsx`
- **Ersetzt:** 8 `title=` Attribute (1 DataCard prop bleibt unverändert)
- **Gruppen:**
  - Navigation Buttons (Previous Day, Next Day)
  - View-Mode Toggle
  - Filter Button
  - Action Buttons (Stop Tracking, Edit Worktimes) - Table & Card

#### 11. BranchManagementTab.tsx ✅ (8 Attribute)
- **Datei:** `frontend/src/components/BranchManagementTab.tsx`
- **Ersetzt:** 8 `title=` Attribute
- **Gruppen:**
  - Action Buttons (Edit, Delete)
  - Create Button
  - Filter Button
  - Modal Buttons (Cancel, Update/Create) - 2x

#### 12. EditTaskModal.tsx ✅ (7 Attribute)
- **Datei:** `frontend/src/components/EditTaskModal.tsx`
- **Ersetzt:** 7 `title=` Attribute
- **Gruppen:**
  - File Upload Button
  - Delete Button (mit Confirm)
  - Cancel/Save Buttons
  - Attachment Actions (Download, Remove)

#### 13. EditRequestModal.tsx ✅ (7 Attribute)
- **Datei:** `frontend/src/components/EditRequestModal.tsx`
- **Ersetzt:** 7 `title=` Attribute
- **Gruppen:**
  - File Upload Button
  - Attachment Actions (Download, Remove)
  - Delete Button (mit Confirm)
  - Cancel/Save Buttons

#### 14. CreateRequestModal.tsx ✅ (7 Attribute)
- **Datei:** `frontend/src/components/CreateRequestModal.tsx`
- **Ersetzt:** 7 `title=` Attribute
- **Gruppen:**
  - File Upload Button (2x)
  - Remove Attachment Button
  - Cancel/Create Buttons (2x)

#### 15. CreateTaskModal.tsx ✅ (4 Attribute)
- **Datei:** `frontend/src/components/CreateTaskModal.tsx`
- **Ersetzt:** 4 `title=` Attribute (2 TaskForm props bleiben unverändert)
- **Gruppen:**
  - File Upload Button
  - Remove Attachment Button
  - Cancel/Create Buttons

#### 16. CameraCapture.tsx ✅ (6 Attribute)
- **Datei:** `frontend/src/components/CameraCapture.tsx`
- **Ersetzt:** 6 `title=` Attribute
- **Gruppen:**
  - Back Buttons (2x)
  - Cancel/Capture Buttons
  - Retake/Confirm Buttons

#### 17. Sidebar.tsx ✅ (5 Attribute)
- **Datei:** `frontend/src/components/Sidebar.tsx`
- **Ersetzt:** 5 `title=` Attribute (3 bereits Standard-Tooltips)
- **Gruppen:**
  - Disabled Profile Spans (4x)
  - Toggle Collapse Button

#### 18. FilterRow.tsx ✅ (5 Attribute)
- **Datei:** `frontend/src/components/FilterRow.tsx`
- **Ersetzt:** 5 `title=` Attribute
- **Gruppen:**
  - Move Up/Down Buttons
  - Sort Direction Button
  - Remove/Add Condition Buttons

### Zusammenfassung Phase 2

**Abgeschlossen:** 19 Dateien, 148 `title=` Attribute ersetzt

**Verbleibend:** ~171 `title=` Attribute in weiteren 56 Dateien (viele sind Props, nicht Tooltips)

**Nächste Prioritäten:**
- EditTaskModal.tsx (7)
- EditRequestModal.tsx (7)
- CreateRequestModal.tsx (7)
- CreateTaskModal.tsx (6)
- CameraCapture.tsx (6)
- Sidebar.tsx (5 - davon 3 bereits Standard-Tooltips)
- DataCard.tsx (5)
- DocumentConfigurationTab.tsx (5)
- FilterRow.tsx (5)
- FilterPane.tsx (5)
- EditClientModal.tsx (5)
- ConsultationTracker.tsx (5)
- ... und weitere Dateien

## Technische Details

### Ersetzungsmuster

**Vorher:**
```tsx
<button
  onClick={handleClick}
  title={t('common.save')}
>
  <CheckIcon className="h-5 w-5" />
</button>
```

**Nachher:**
```tsx
<div className="relative group">
  <button
    onClick={handleClick}
  >
    <CheckIcon className="h-5 w-5" />
  </button>
  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
    {t('common.save')}
  </div>
</div>
```

### Besondere Fälle

#### 1. DataCard Props
- `title` und `subtitle` Props von DataCard-Komponenten werden **NICHT** ersetzt
- Diese sind Teil der Komponenten-API und keine Tooltips

#### 2. Große Tooltips (Beschreibungen)
- Tooltips mit langem Inhalt behalten spezifisches Design
- Verhalten (`opacity-0 group-hover:opacity-100`) wird standardisiert
- Positionierung kann abweichen (z.B. `bottom-full` für Beschreibungen)

#### 3. Bildvorschau-Tooltips
- Behalten spezifische Positionierung und Design
- Verhalten wird standardisiert (`opacity-0 group-hover:opacity-100`)

## Qualitätssicherung

### Linter-Checks
- ✅ Alle bearbeiteten Dateien wurden auf Linter-Fehler geprüft
- ✅ Keine Fehler gefunden

### Verifikation
- ✅ Nach jeder Datei: `grep -c "title="` zur Verifikation
- ✅ Alle `title=` Attribute auf Buttons/Interaktive Elemente wurden ersetzt
- ✅ DataCard props korrekt identifiziert und nicht ersetzt

## Lessons Learned

### Erfolgreiche Strategien
1. **Systematisches Vorgehen:** Datei für Datei, Gruppe für Gruppe
2. **Verifikation nach jeder Datei:** Linter-Check und `title=` Count
3. **Klare Gruppierung:** Ähnliche Buttons zusammen bearbeiten

### Herausforderungen
1. **Große Dateien:** Worktracker.tsx mit 3000+ Zeilen erfordert sorgfältiges Vorgehen
2. **Duplikate:** Viele ähnliche Patterns erfordern präzise Kontext-Suche
3. **DataCard Props:** Unterscheidung zwischen Tooltips und Props wichtig

## Nächste Schritte

### Phase 2 Fortsetzung
1. EditTaskModal.tsx (7 Attribute)
2. EditRequestModal.tsx (7 Attribute)
3. CreateRequestModal.tsx (7 Attribute)
4. CreateTaskModal.tsx (6 Attribute)
5. CameraCapture.tsx (6 Attribute)
6. Sidebar.tsx (5 Attribute - 3 bereits Standard)
7. DataCard.tsx (5 Attribute)
8. ... weitere Dateien

### Phase 3: Testing
- Manuelle Tests aller Tooltips
- Responsive Design prüfen
- Dark Mode prüfen
- Accessibility prüfen

## Statistik

**Gesamt Fortschritt:**
- Phase 1: 14/14 (100%) ✅
- Phase 2: 148/319 (46%) 🔄
- **Gesamt: 162/333 (49%)**

**Dateien bearbeitet:**
- Phase 1: 7 Dateien
- Phase 2: 19 Dateien
- **Gesamt: 26 Dateien**

**Verbleibende Dateien (Priorität):**
- FilterPane.tsx (5 Attribute)
- DocumentConfigurationTab.tsx (5 Attribute)
- EditClientModal.tsx (5 Attribute)
- ConsultationTracker.tsx (5 Attribute)
- DataCard.tsx (6 Attribute - props, NICHT ersetzen)
- CreateTaskModal.tsx (2 Attribute - TaskForm props, NICHT ersetzen)
- ... und weitere 50+ Dateien (viele enthalten Props, nicht Tooltips)

**Geschätzter verbleibender Aufwand:**
- ~12-15 Stunden für verbleibende ~171 `title=` Attribute (nach Abzug der Props)
- ~2-3 Stunden für Testing

## Anmerkungen

### Wichtige Erkenntnisse

1. **DataCard Props:** `title` und `subtitle` Props von DataCard-Komponenten sind **KEINE** Tooltips und sollten **NICHT** ersetzt werden.

2. **TaskForm Props:** In CreateTaskModal.tsx sind 2 `title=` Attribute Props für die TaskForm-Komponente, nicht Tooltips.

3. **Systematisches Vorgehen:** Jede Datei wurde einzeln bearbeitet, verifiziert (Linter + `title=` Count) und dokumentiert.

4. **Qualitätssicherung:** Nach jeder Datei wurden Linter-Checks durchgeführt und die Anzahl der verbleibenden `title=` Attribute verifiziert.

