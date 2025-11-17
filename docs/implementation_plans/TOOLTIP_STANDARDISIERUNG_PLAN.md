# Tooltip-Standardisierung - Implementierungsplan

## Executive Summary

**Status:** Plan erstellt, noch nicht umgesetzt (nach Restore)

**Ziel:** Alle Tooltips im Projekt auf einheitliches Standard-Design umstellen

**Umfang:**
- **Phase 1:** 14 Custom-Tooltip-Implementierungen anpassen
- **Phase 2:** 319 HTML `title=` Attribute durch Custom-Tooltips ersetzen
- **Phase 3:** Testing und finale Anpassungen

**Gesamt:** 333 Tooltips zu standardisieren

**Geschätzter Aufwand:** ~20-25 Stunden

**Priorität:** Hoch (UI-Konsistenz)

## Übersicht

Dieser Plan beschreibt die vollständige Standardisierung aller Tooltips im Projekt auf das einheitliche Design, das in der Sidebar verwendet wird.

**Wichtig:** Dieser Plan wurde nach einem Restore erstellt, da bei der ersten Umsetzung Fehler eingebaut wurden. Die Fehlerquellen sind im Abschnitt "Gemachte Fehler (Lernpunkte)" dokumentiert.

## Standard-Tooltip-Design

### Definition

Das Standard-Tooltip-Design ist definiert in `frontend/src/components/Sidebar.tsx` (Zeilen 309, 351, 390):

```tsx
<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
  {tooltipText}
</div>
```

### Erforderliche Klassen

**Positionierung:**
- `absolute` - Absolute Positionierung
- `left-full ml-2` - Rechts neben dem Element (Standard)
- `z-50` - Hoher z-index für Sichtbarkeit

**Design:**
- `bg-gray-800` - Dunkler Hintergrund (NICHT dark:bg-gray-700)
- `text-white` - Weißer Text
- `text-sm` - Kleine Schriftgröße (NICHT text-xs)
- `rounded` - Abgerundete Ecken
- `px-2 py-1` - Padding

**Verhalten:**
- `opacity-0 group-hover:opacity-100` - Erscheint beim Hover (NICHT hidden/block)
- `transition-opacity duration-200` - Sanfte Übergänge
- `whitespace-nowrap` - Kein Zeilenumbruch (NICHT whitespace-normal)
- `pointer-events-none` - Keine Pointer-Events

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

## Aktueller Stand

### ✅ Bereits Standardkonform

1. **Sidebar.tsx** (3 Tooltips)
   - Zeilen 309, 351, 390
   - ✅ Entspricht dem Standard

### ❌ Nicht Standardkonform - Custom Tooltip Implementierungen

#### 1. ArticleStructure.tsx (1 Tooltip)
- **Datei:** `frontend/src/components/cerebro/ArticleStructure.tsx`
- **Zeile:** 349
- **Aktuelles Design:**
  ```tsx
  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
  ```
- **Probleme:**
  - ❌ `text-xs` statt `text-sm`
  - ❌ `hidden group-hover:block` statt `opacity-0 group-hover:opacity-100`
  - ❌ `dark:bg-gray-700` (nicht im Standard)
  - ❌ Position: `bottom-full mb-2` statt `left-full ml-2`
  - ❌ Fehlt: `transition-opacity duration-200`, `pointer-events-none`, `z-50`

#### 2. NotificationSettings.tsx (2 Tooltips)
- **Datei:** `frontend/src/components/NotificationSettings.tsx`
- **Zeilen:** 188, 241
- **Aktuelles Design:**
  ```tsx
  <div className="absolute left-0 bottom-[calc(100%+0.5rem)] px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-normal max-w-xs pointer-events-none z-50">
  ```
- **Probleme:**
  - ❌ `whitespace-normal` statt `whitespace-nowrap`
  - ❌ Position: `bottom-[calc(100%+0.5rem)]` statt `left-full ml-2`
  - ❌ `max-w-xs` (nicht im Standard)

#### 3. MarkdownPreview.tsx (1 Tooltip)
- **Datei:** `frontend/src/components/MarkdownPreview.tsx`
- **Zeile:** 296
- **Aktuelles Design:**
  ```tsx
  <div className="hidden group-hover:block absolute z-10 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-2 rounded-md -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full max-w-xs">
  ```
- **Probleme:**
  - ❌ `hidden group-hover:block` statt `opacity-0 group-hover:opacity-100`
  - ❌ `bg-white dark:bg-gray-800` statt `bg-gray-800`
  - ❌ `border dark:border-gray-700` (nicht im Standard)
  - ❌ `shadow-lg` (nicht im Standard)
  - ❌ Position komplett anders
  - ❌ Fehlt: `transition-opacity duration-200`, `pointer-events-none`, `z-50`
- **Hinweis:** Dies ist ein Bildvorschau-Tooltip, könnte spezielle Behandlung benötigen

#### 4. Worktracker.tsx (2 große Tooltips)
- **Datei:** `frontend/src/pages/Worktracker.tsx`
- **Zeilen:** 1400, 2243
- **Aktuelles Design:**
  ```tsx
  <div className="hidden group-hover:block absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10">
  ```
- **Probleme:**
  - ❌ `hidden group-hover:block` statt `opacity-0 group-hover:opacity-100`
  - ❌ `bg-white dark:bg-gray-800` statt `bg-gray-800`
  - ❌ `text-gray-800 dark:text-gray-200` statt `text-white`
  - ❌ Viele zusätzliche Klassen (shadow-lg, border, w-144, etc.)
- **Hinweis:** Dies sind große Beschreibungs-Tooltips, nicht einfache Text-Tooltips

#### 5. Requests.tsx (1 großer Tooltip)
- **Datei:** `frontend/src/components/Requests.tsx`
- **Zeile:** 1199
- **Aktuelles Design:** Gleiche Probleme wie Worktracker.tsx
- **Hinweis:** Großer Beschreibungs-Tooltip

#### 6. CreateTaskModal.tsx (1 Bildvorschau-Tooltip)
- **Datei:** `frontend/src/components/CreateTaskModal.tsx`
- **Zeile:** 869
- **Aktuelles Design:**
  ```tsx
  <div className="absolute z-10 invisible group-hover:visible bg-white dark:bg-gray-800 p-2 rounded-md shadow-lg -top-32 left-0 border border-gray-200 dark:border-gray-700">
  ```
- **Probleme:**
  - ❌ `invisible group-hover:visible` statt `opacity-0 group-hover:opacity-100`
  - ❌ `bg-white dark:bg-gray-800` statt `bg-gray-800`
  - ❌ `shadow-lg`, `border` (nicht im Standard)
  - ❌ Fehlt: `transition-opacity duration-200`, `pointer-events-none`
- **Hinweis:** Bildvorschau-Tooltip

#### 7. CreateRequestModal.tsx (1 Bildvorschau-Tooltip)
- **Datei:** `frontend/src/components/CreateRequestModal.tsx`
- **Zeile:** 473
- **Aktuelles Design:** Gleiche Probleme wie CreateTaskModal.tsx

#### 8. EditTaskModal.tsx (2 Bildvorschau-Tooltips)
- **Datei:** `frontend/src/components/EditTaskModal.tsx`
- **Zeilen:** 1069, 1109
- **Aktuelles Design:** Gleiche Probleme wie CreateTaskModal.tsx

#### 9. EditRequestModal.tsx (2 Bildvorschau-Tooltips)
- **Datei:** `frontend/src/components/EditRequestModal.tsx`
- **Zeilen:** 754, 794
- **Aktuelles Design:** Gleiche Probleme wie CreateTaskModal.tsx

#### 10. NotificationList.tsx (2 Material-UI Tooltips)
- **Datei:** `frontend/src/components/NotificationList.tsx`
- **Zeilen:** 277, 289
- **Aktuelles Design:**
  ```tsx
  <Tooltip title={...}>
    <button>...</button>
  </Tooltip>
  ```
- **Probleme:**
  - ❌ Verwendet Material-UI `Tooltip` Komponente
  - ❌ Entspricht nicht dem Standarddesign

### ❌ HTML title-Attribute (319 Vorkommen in 70 Dateien)

Alle `title=` Attribute müssen durch Custom-Tooltips ersetzt werden.

**Dateien mit den meisten `title=` Attributen:**
1. Worktracker.tsx: 36
2. RoleManagementTab.tsx: 23
3. Requests.tsx: 22
4. InvoiceManagementTab.tsx: 14
5. ConsultationList.tsx: 12
6. SavedFilterTags.tsx: 11
7. LifecycleView.tsx: 10
8. ActiveUsersList.tsx: 9
9. MonthlyReportsTab.tsx: 9
10. TodoAnalyticsTab.tsx: 13
11. ... und 61 weitere Dateien

## Implementierungsplan

### Phase 1: Custom-Tooltip-Implementierungen (14 Stück)

#### 1.1 ArticleStructure.tsx
- **Zeile:** 349
- **Änderung:**
  - `text-xs` → `text-sm`
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `dark:bg-gray-700` entfernen
  - Position: `left-0 bottom-full mb-2` → `left-full ml-2`
  - `transition-opacity duration-200` hinzufügen
  - `pointer-events-none` hinzufügen
  - `z-50` hinzufügen

#### 1.2 NotificationSettings.tsx
- **Zeilen:** 188, 241
- **Änderung:**
  - `whitespace-normal` → `whitespace-nowrap`
  - `max-w-xs` entfernen
  - Position: `bottom-[calc(100%+0.5rem)]` → `left-full ml-2`
  - **Hinweis:** Wenn Text zu lang ist, könnte `whitespace-normal` sinnvoll sein, aber Standard ist `whitespace-nowrap`

#### 1.3 MarkdownPreview.tsx
- **Zeile:** 296
- **Änderung:**
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` hinzufügen
  - `pointer-events-none` hinzufügen
  - **Hinweis:** Bildvorschau-Tooltip - Position und Hintergrund können speziell bleiben, aber Basis-Klassen sollten Standard sein

#### 1.4 Worktracker.tsx (2 große Tooltips)
- **Zeilen:** 1400, 2243
- **Änderung:**
  - `hidden group-hover:block` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` hinzufügen
  - `pointer-events-none` hinzufügen
  - **Hinweis:** Große Beschreibungs-Tooltips - Design kann speziell bleiben, aber Basis-Verhalten sollte Standard sein

#### 1.5 Requests.tsx (1 großer Tooltip)
- **Zeile:** 1199
- **Änderung:** Gleiche wie Worktracker.tsx

#### 1.6 Bildvorschau-Tooltips (6 Stück)
- **Dateien:** CreateTaskModal.tsx, CreateRequestModal.tsx, EditTaskModal.tsx, EditRequestModal.tsx
- **Zeilen:** 473, 869, 754, 794, 1069, 1109
- **Änderung:**
  - `invisible group-hover:visible` → `opacity-0 group-hover:opacity-100`
  - `transition-opacity duration-200` hinzufügen
  - `pointer-events-none` hinzufügen
  - **Hinweis:** Bildvorschau-Tooltips - Position und Hintergrund können speziell bleiben

#### 1.7 NotificationList.tsx
- **Zeilen:** 277, 289
- **Änderung:**
  - Material-UI `Tooltip` entfernen
  - Custom-Tooltip mit Standarddesign hinzufügen
  - Import von `Tooltip` aus `@mui/material` entfernen

### Phase 2: HTML title-Attribute ersetzen (319 Stück)

#### Strategie

1. **Systematische Bearbeitung nach Dateien:**
   - Beginne mit Dateien mit den meisten `title=` Attributen
   - Arbeite Datei für Datei durch

2. **Ersetzungsmuster:**

   **Pattern 1: Einfacher Button**
   ```tsx
   // VORHER:
   <button title={t('key')}>...</button>
   
   // NACHHER:
   <div className="relative group">
     <button>...</button>
     <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
       {t('key')}
     </div>
   </div>
   ```

   **Pattern 2: Button in bestehender Struktur**
   - Button in `div` mit `relative group` wrappen
   - Tooltip-Div nach Button einfügen

   **Pattern 3: Icon/Element ohne Button**
   ```tsx
   // VORHER:
   <span title={t('key')}>🔒</span>
   
   // NACHHER:
   <div className="relative group inline-block">
     <span>🔒</span>
     <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
       {t('key')}
     </div>
   </div>
   ```

3. **Priorisierung:**
   - **Hoch:** Worktracker.tsx (36), RoleManagementTab.tsx (23), Requests.tsx (22)
   - **Mittel:** InvoiceManagementTab.tsx (14), ConsultationList.tsx (12), SavedFilterTags.tsx (11)
   - **Niedrig:** Restliche Dateien

#### Dateien-Liste (nach Priorität)

**Hoch (≥20 title=):**
1. Worktracker.tsx: 36
2. RoleManagementTab.tsx: 23
3. Requests.tsx: 22

**Mittel (10-19 title=):**
4. InvoiceManagementTab.tsx: 14
5. TodoAnalyticsTab.tsx: 13
6. ConsultationList.tsx: 12
7. SavedFilterTags.tsx: 11
8. LifecycleView.tsx: 10
9. ActiveUsersList.tsx: 9
10. MonthlyReportsTab.tsx: 9

**Niedrig (<10 title=):**
11. UserManagementTab.tsx: 8
12. ActiveUsersList.tsx: 8
13. BranchManagementTab.tsx: 8
14. EditTaskModal.tsx: 7
15. EditRequestModal.tsx: 7
16. CreateRequestModal.tsx: 7
17. CreateTaskModal.tsx: 6
18. CameraCapture.tsx: 6
19. Sidebar.tsx: 5 (davon 3 bereits Standard-Tooltips, 2 title=)
20. DataCard.tsx: 5
21. DocumentConfigurationTab.tsx: 5
22. FilterRow.tsx: 5
23. FilterPane.tsx: 5
24. EditClientModal.tsx: 5
25. ConsultationTracker.tsx: 5
26. WorktimeStats.tsx: 4
27. TableColumnConfig.tsx: 4
28. ProcessJoinRequestModal.tsx: 4
29. JoinOrganizationModal.tsx: 4
30. EditOrganizationModal.tsx: 4
31. CreateOrganizationModal.tsx: 4
32. MyDocumentsTab.tsx: 4
33. CreateClientModal.tsx: 4
34. RequestAnalyticsTab.tsx: 3
35. EditWorktimeModal.tsx: 3
36. LifecycleTab.tsx: 3
37. InvoiceDetailModal.tsx: 3
38. ContractEditModal.tsx: 3
39. CertificateEditModal.tsx: 3
40. CertificateCreationModal.tsx: 3
41. ContractCreationModal.tsx: 3
42. SocialSecurityEditor.tsx: 3
43. DatabaseManagement.tsx: 3
44. Profile.tsx: 2
45. Settings.tsx: 2
46. StopWorktimeModal.tsx: 2
47. LinkTaskModal.tsx: 2
48. SMTPConfigurationTab.tsx: 2
49. ApiConfigurationTab.tsx: 2
50. CreateInvoiceModal.tsx: 2
51. ClientSelectModal.tsx: 2
52. MonthlyReportSettingsModal.tsx: 2
53. OffboardingCompleteModal.tsx: 2
54. OffboardingStartModal.tsx: 2
55. UserWorktimeTable.tsx: 2
56. WorktimeTracker.tsx: 1
57. IdentificationDocumentForm.tsx: 2
58. ReservationCard.tsx: 3
59. ArticleEdit.tsx: 4
60. ArticleView.tsx: 1
61. AddMedia.tsx: 2
62. AddExternalLink.tsx: 2
63. GitHubLinkManager.tsx: 1
64. OnboardingTour.tsx: 1
65. OrganizationSettings.tsx: 3
66. MyJoinRequestsList.tsx: 1
67. JoinRequestsList.tsx: 1
68. RoleConfigurationTab.tsx: 1
69. EmailTemplateBox.tsx: 1
70. SocialSecurityCompletionBox.tsx: 1

### Phase 3: Spezielle Fälle

#### 3.1 Große Beschreibungs-Tooltips
- **Dateien:** Worktracker.tsx, Requests.tsx
- **Problem:** Zeigen große MarkdownPreview-Inhalte
- **Lösung:** Basis-Verhalten (opacity statt hidden) anpassen, Design kann speziell bleiben

#### 3.2 Bildvorschau-Tooltips
- **Dateien:** CreateTaskModal.tsx, CreateRequestModal.tsx, EditTaskModal.tsx, EditRequestModal.tsx, MarkdownPreview.tsx
- **Problem:** Zeigen Bilder, brauchen weißen Hintergrund
- **Lösung:** Basis-Verhalten (opacity statt invisible) anpassen, Design kann speziell bleiben

#### 3.3 Lange Tooltip-Texte
- **Problem:** `whitespace-nowrap` könnte zu Problemen führen
- **Lösung:** Standard ist `whitespace-nowrap`, bei Bedarf kann `whitespace-normal` mit `max-w-xs` verwendet werden, aber das ist nicht Standard

#### 3.4 Position-Anpassungen
- **Problem:** Standard ist `left-full ml-2` (rechts)
- **Lösung:** Bei Bedarf kann Position angepasst werden (z.B. `right-full mr-2` für links, `bottom-full mb-2` für oben), aber Standard ist rechts

## Vorgehensweise

### Schritt-für-Schritt

1. **Phase 1: Custom-Tooltips (14 Stück)**
   - Datei für Datei durchgehen
   - Jede Änderung einzeln testen
   - Linter-Fehler sofort beheben

2. **Phase 2: HTML title-Attribute (319 Stück)**
   - Beginne mit RoleManagementTab.tsx (23)
   - Dann Worktracker.tsx (21)
   - Dann InvoiceManagementTab.tsx (14)
   - Dann TodoAnalyticsTab.tsx (13)
   - Dann ConsultationList.tsx (12)
   - Dann die restlichen Dateien systematisch

3. **Phase 3: Testing**
   - Alle Tooltips testen
   - Positionen prüfen
   - Responsive Verhalten prüfen
   - Dark Mode prüfen

### Wichtige Regeln

1. **NIEMALS mehrere Änderungen gleichzeitig ohne Testing**
2. **Jede Datei einzeln bearbeiten und testen**
3. **Linter-Fehler sofort beheben**
4. **Struktur prüfen:** Button muss in `div` mit `relative group` sein
5. **Position prüfen:** Standard ist `left-full ml-2`, bei Bedarf anpassen

### Fehlerquellen

1. **Vergessene Wrapper:** Button nicht in `div` mit `relative group`
2. **Falsche Position:** Tooltip-Div außerhalb des Wrappers
3. **Doppelte `>` Zeichen:** Bei unvollständigen Ersetzungen
4. **Fehlende Schließ-Tags:** Bei komplexen Strukturen
5. **JSX-Struktur:** Tooltip muss innerhalb des `group`-divs sein

## Zusammenfassung

### Zu erledigen

**Phase 1: Custom-Tooltips (14 Stück)**
- [ ] ArticleStructure.tsx (1)
- [ ] NotificationSettings.tsx (2)
- [ ] MarkdownPreview.tsx (1)
- [ ] Worktracker.tsx (2)
- [ ] Requests.tsx (1)
- [ ] CreateTaskModal.tsx (1)
- [ ] CreateRequestModal.tsx (1)
- [ ] EditTaskModal.tsx (2)
- [ ] EditRequestModal.tsx (2)
- [ ] NotificationList.tsx (2)

**Phase 2: HTML title-Attribute (319 Stück in 70 Dateien)**
- [ ] RoleManagementTab.tsx: 23
- [ ] Worktracker.tsx: 21
- [ ] InvoiceManagementTab.tsx: 14
- [ ] TodoAnalyticsTab.tsx: 13
- [ ] ConsultationList.tsx: 12
- [ ] SavedFilterTags.tsx: 11
- [ ] LifecycleView.tsx: 10
- [ ] MonthlyReportsTab.tsx: 9
- [ ] UserManagementTab.tsx: 8
- [ ] ActiveUsersList.tsx: 8
- [ ] BranchManagementTab.tsx: 8
- [ ] EditTaskModal.tsx: 7
- [ ] EditRequestModal.tsx: 7
- [ ] CreateRequestModal.tsx: 7
- [ ] CreateTaskModal.tsx: 6
- [ ] CameraCapture.tsx: 6
- [ ] Sidebar.tsx: 5 (davon 3 bereits Standard-Tooltips)
- [ ] DataCard.tsx: 5
- [ ] DocumentConfigurationTab.tsx: 5
- [ ] FilterRow.tsx: 5
- [ ] FilterPane.tsx: 5
- [ ] EditClientModal.tsx: 5
- [ ] ConsultationTracker.tsx: 5
- [ ] ... und 48 weitere Dateien (siehe detaillierte Liste oben)

**Gesamt: 333 Tooltips zu standardisieren**
- Phase 1: 14 Custom-Tooltip-Implementierungen
- Phase 2: 319 HTML title-Attribute

### Detaillierte Dateien-Liste mit title= Attributen

**Aktuelle Anzahl: 319 title= Attribute in 70 Dateien**

1. RoleManagementTab.tsx: 23
2. Worktracker.tsx: 21
3. InvoiceManagementTab.tsx: 14
4. TodoAnalyticsTab.tsx: 13
5. ConsultationList.tsx: 12
6. SavedFilterTags.tsx: 11
7. LifecycleView.tsx: 10
8. MonthlyReportsTab.tsx: 9
9. UserManagementTab.tsx: 8
10. ActiveUsersList.tsx: 8
11. BranchManagementTab.tsx: 8
12. EditTaskModal.tsx: 7
13. EditRequestModal.tsx: 7
14. CreateRequestModal.tsx: 7
15. CreateTaskModal.tsx: 6
16. CameraCapture.tsx: 6
17. Sidebar.tsx: 5 (davon 3 bereits Standard-Tooltips)
18. DataCard.tsx: 5
19. DocumentConfigurationTab.tsx: 5
20. FilterRow.tsx: 5
21. FilterPane.tsx: 5
22. EditClientModal.tsx: 5
23. ConsultationTracker.tsx: 5
24. WorktimeStats.tsx: 4
25. TableColumnConfig.tsx: 4
26. ProcessJoinRequestModal.tsx: 4
27. JoinOrganizationModal.tsx: 4
28. EditOrganizationModal.tsx: 4
29. CreateOrganizationModal.tsx: 4
30. MyDocumentsTab.tsx: 4
31. CreateClientModal.tsx: 4
32. ArticleEdit.tsx: 4
33. RequestAnalyticsTab.tsx: 3
34. EditWorktimeModal.tsx: 3
35. LifecycleTab.tsx: 3
36. InvoiceDetailModal.tsx: 3
37. ContractEditModal.tsx: 3
38. CertificateEditModal.tsx: 3
39. CertificateCreationModal.tsx: 3
40. ContractCreationModal.tsx: 3
41. SocialSecurityEditor.tsx: 3
42. DatabaseManagement.tsx: 3
43. OrganizationSettings.tsx: 3
44. ReservationCard.tsx: 3
45. Profile.tsx: 2
46. Settings.tsx: 2
47. StopWorktimeModal.tsx: 2
48. LinkTaskModal.tsx: 2
49. SMTPConfigurationTab.tsx: 2
50. ApiConfigurationTab.tsx: 2
51. CreateInvoiceModal.tsx: 2
52. ClientSelectModal.tsx: 2
53. MonthlyReportSettingsModal.tsx: 2
54. OffboardingCompleteModal.tsx: 2
55. OffboardingStartModal.tsx: 2
56. UserWorktimeTable.tsx: 2
57. IdentificationDocumentForm.tsx: 2
58. AddMedia.tsx: 2
59. AddExternalLink.tsx: 2
60. WorktimeTracker.tsx: 1
61. ArticleView.tsx: 1
62. GitHubLinkManager.tsx: 1
63. OnboardingTour.tsx: 1
64. MyJoinRequestsList.tsx: 1
65. JoinRequestsList.tsx: 1
66. RoleConfigurationTab.tsx: 1
67. EmailTemplateBox.tsx: 1
68. SocialSecurityCompletionBox.tsx: 1
69. MarkdownPreview.tsx: 2 (davon 1 Custom-Tooltip)
70. Requests.tsx: 1 (davon 1 großer Tooltip)

### Geschätzter Aufwand

- **Phase 1:** ~2-3 Stunden (14 Custom-Tooltips)
- **Phase 2:** ~15-20 Stunden (319 title-Attribute)
- **Phase 3:** ~2-3 Stunden (Testing und Anpassungen)

**Gesamt: ~20-25 Stunden**

## Gemachte Fehler (Lernpunkte)

### Fehler 1: Vergessene Wrapper-Struktur
- **Problem:** Tooltip-Div wurde außerhalb des `group`-divs platziert
- **Fehler:** JSX-Struktur-Fehler, Tooltip muss innerhalb des `relative group`-divs sein
- **Lösung:** Immer sicherstellen, dass Button UND Tooltip innerhalb des `div className="relative group">` sind

### Fehler 2: Unvollständige Ersetzungen
- **Problem:** Bei `replace_all` wurden manchmal nur Teile ersetzt, was zu doppelten `>` Zeichen führte
- **Fehler:** Syntax-Fehler durch unvollständige Ersetzungen
- **Lösung:** Immer die komplette Struktur ersetzen, nicht nur Teile

### Fehler 3: Fehlende Schließ-Tags
- **Problem:** Bei komplexen Strukturen wurden Schließ-Tags vergessen
- **Fehler:** JSX-Parsing-Fehler
- **Lösung:** Immer die komplette Struktur prüfen, besonders bei verschachtelten Elementen

### Fehler 4: Falsche Positionierung
- **Problem:** Tooltip-Div wurde an falscher Stelle eingefügt
- **Fehler:** Tooltip erscheint nicht oder an falscher Position
- **Lösung:** Tooltip-Div muss direkt nach dem Element (Button/Icon) kommen, innerhalb des `group`-divs

## Notizen

- Große Beschreibungs-Tooltips (Worktracker, Requests) können spezielles Design behalten, aber Basis-Verhalten sollte Standard sein
- Bildvorschau-Tooltips können spezielles Design behalten, aber Basis-Verhalten sollte Standard sein
- Bei sehr langen Tooltip-Texten kann `whitespace-normal` mit `max-w-xs` verwendet werden, aber das ist nicht Standard
- Position kann bei Bedarf angepasst werden, aber Standard ist `left-full ml-2` (rechts)
- **WICHTIG:** Immer nach jeder Änderung Linter-Fehler prüfen und sofort beheben
- **WICHTIG:** Jede Datei einzeln bearbeiten und testen, nicht mehrere gleichzeitig

