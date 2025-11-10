# Button-Analyse: Alle Buttons, die nicht dem Standard entsprechen

## Standard-Definition
- **Buttons müssen IMMER Icon-only sein (OHNE sichtbaren Text)!**
- **Text gehört NUR ins `title` Attribut für Tooltips!**
- **Hinzufügen-Buttons müssen links positioniert sein**
- **Buttons mit farbigem Hintergrund sind nur für spezielle Status-Buttons erlaubt**

---

## 1. BUTTONS MIT TEXT (❌ NICHT STANDARD)

### LifecycleView.tsx
- **Zeile 337-342**: "Offboarding starten" Button
  - Text: `{t('lifecycle.offboarding.startButton') || 'Offboarding starten'}`
  - Hintergrund: `bg-orange-600`
  - Sollte: Icon-only mit Tooltip sein

- **Zeile 346-351**: "Offboarding abschließen" Button
  - Text: `{t('lifecycle.offboarding.complete.button') || 'Offboarding abschließen'}`
  - Hintergrund: `bg-red-600`
  - Sollte: Icon-only mit Tooltip sein

### Requests.tsx
- **Zeile 1541-1546**: "Mehr anzeigen" Button
  - Text: `{t('common.showMore')} ({filteredAndSortedRequests.length - displayLimit} {t('common.remaining')})`
  - Hintergrund: `bg-white border border-blue-300`
  - Sollte: Icon-only mit Tooltip sein

### RoleManagementTab.tsx
- **Zeile 1115-1120**: "Mehr anzeigen" Button (Mobile)
  - Text: `Mehr anzeigen ({filteredAndSortedRoles.length - displayLimit} verbleibend)`
  - Hintergrund: `bg-white border border-blue-300`
  - Sollte: Icon-only mit Tooltip sein

- **Zeile 1147-1152**: "Mehr anzeigen" Button (Desktop)
  - Text: `Mehr anzeigen ({filteredAndSortedRoles.length - displayLimit} verbleibend)`
  - Hintergrund: `bg-white border border-blue-300`
  - Sollte: Icon-only mit Tooltip sein

### ContractCreationModal.tsx
- **Zeile 708-714**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 715-732**: "Erstellen" Button
  - Text: `Erstellen` oder `Wird erstellt...`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### ContractEditModal.tsx
- **Zeile 350-356**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

### CameraCapture.tsx
- **Zeile 132-137**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-gray-200`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

### teamWorktime/UserWorktimeTable.tsx
- **Zeile 540-546**: "Speichern" Button
  - Text: `{savingId === worktime.id ? 'Speichern...' : 'Speichern'}`
  - Hintergrund: `text-blue-600` (nur Text, kein Hintergrund)
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

- **Zeile 547-552**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `text-red-600` (nur Text, kein Hintergrund)
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

### OffboardingStartModal.tsx
- **Zeile 242-249**: "Abbrechen" Button
  - Text: `{t('common.cancel') || 'Abbrechen'}`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 250-266**: "Offboarding starten" Button
  - Text: `{t('lifecycle.offboarding.startButton') || 'Offboarding starten'}` oder `{t('common.saving') || 'Speichern...'}`
  - Hintergrund: `bg-orange-600`
  - Sollte: Icon-only mit Tooltip sein

### OffboardingCompleteModal.tsx
- **Zeile 258-265**: "Abbrechen" Button
  - Text: `{t('common.cancel') || 'Abbrechen'}`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 266-282**: "Offboarding abschließen" Button
  - Text: `{t('lifecycle.offboarding.complete.button') || 'Offboarding abschließen'}` oder `{t('common.saving') || 'Speichern...'}`
  - Hintergrund: `bg-red-600`
  - Sollte: Icon-only mit Tooltip sein

### CertificateCreationModal.tsx
- **Zeile 590-596**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 597-614**: "Erstellen" Button
  - Text: `Erstellen` oder `Wird erstellt...`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### CertificateEditModal.tsx
- **Zeile 350-356**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

### organization/SMTPConfigurationTab.tsx
- **Zeile 263-269**: "Zurücksetzen" Button
  - Text: `{t('organization.smtp.clear')}`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only mit Tooltip sein

- **Zeile 270-274**: "Speichern" Button
  - Text: `{t('organization.smtp.save')}` oder `{t('organization.smtp.saving')}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### organization/ApiConfigurationTab.tsx
- **Zeile 648-654**: "Zurücksetzen" Button
  - Text: `{t('organization.api.clear')}`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only mit Tooltip sein

- **Zeile 655-659**: "Speichern" Button
  - Text: `{t('organization.api.save')}` oder `{t('organization.api.saving')}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### ConsultationTracker.tsx
- **Zeile 665-671**: "Speichern" Button
  - Text: `{t('consultations.saveConsultation')}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### cerebro/ArticleEdit.tsx
- **Zeile 371-378**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 379-384**: "Speichern" Button
  - Text: `{saving ? 'Speichere...' : 'Speichern'}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### cerebro/AddExternalLink.tsx
- **Zeile 223-230**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-gray-200`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 231-234**: "Hinzufügen" Button
  - Text: `{loading ? 'Wird hinzugefügt...' : 'Hinzufügen'}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (PlusIcon) mit Tooltip sein

### cerebro/AddMedia.tsx
- **Zeile 292-299**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-gray-200`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 300-304**: "Hinzufügen" Button
  - Text: `{loading ? 'Wird hochgeladen...' : 'Hinzufügen'}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (PlusIcon) mit Tooltip sein

### SocialSecurityEditor.tsx
- **Zeile 461-467**: "Abbrechen" Button
  - Text: `Abbrechen`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 468-472**: "Speichern" Button
  - Text: `{saving ? 'Speichere...' : 'Speichern'}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### EmailTemplateBox.tsx
- **Zeile 135-139**: "E-Mail senden" Button
  - Text: `{t('lifecycle.sendEmail') || 'E-Mail senden'}` oder `{t('lifecycle.sending') || 'Wird gesendet...'}`
  - Hintergrund: `bg-green-600`
  - Sollte: Icon-only mit Tooltip sein

### SocialSecurityCompletionBox.tsx
- **Zeile 183-188**: "Speichern" Button
  - Text: `{loading ? 'Speichere...' : 'Speichern'}`
  - Hintergrund: `bg-green-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### organization/DocumentConfigurationTab.tsx
- **Zeile 916-921**: "Zurücksetzen" Button
  - Text: `{t('common.reset') || 'Zurücksetzen'}`
  - Hintergrund: `border border-gray-300`
  - Sollte: Icon-only mit Tooltip sein

- **Zeile 922-927**: "Speichern" Button
  - Text: `{saving ? 'Speichere...' : 'Speichern'}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### organization/RoleConfigurationTab.tsx
- **Zeile 238-244**: "Speichern" Button
  - Text: `{saving ? (t('common.saving') || 'Speichere...') : (t('common.save') || 'Speichern')}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only (CheckIcon) mit Tooltip sein

### teamWorktime/StopWorktimeModal.tsx
- **Zeile 128-135**: "Abbrechen" Button
  - Text: `{t('common.cancel')}`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 136-139**: "Bestätigen" Button
  - Text: `{t('worktime.stop.confirm')}`
  - Hintergrund: `bg-red-600`
  - Sollte: Icon-only mit Tooltip sein

### LinkTaskModal.tsx
- **Zeile 177-183**: "Abbrechen" Button
  - Text: `{t('common.cancel')}`
  - Hintergrund: `bg-white border border-gray-300`
  - Sollte: Icon-only (XMarkIcon) mit Tooltip sein

- **Zeile 184-189**: "Verknüpfen" Button
  - Text: `{t('consultations.linkTask.link')}`
  - Hintergrund: `bg-blue-600`
  - Sollte: Icon-only mit Tooltip sein

### EditClientModal.tsx
- **Zeile 550-592**: Buttons im Sidepane
  - Status: ✅ OK (Icon-only mit Tooltip)

### EditTaskModal.tsx
- **Zeile 1050+**: Buttons im Modal (muss geprüft werden)
  - Status: ⚠️ MUSS GEPRÜFT WERDEN

---

## 2. BUTTONS MIT FARBIGEM HINTERGRUND (⚠️ PRÜFEN)

### Requests.tsx - Status-Buttons in Cards
- **Zeile 1418**: "Genehmigen" Button
  - Hintergrund: `bg-green-600`
  - Status: ✅ OK (Status-Button, Icon-only)

- **Zeile 1428**: "Verbessern" Button
  - Hintergrund: `bg-orange-600`
  - Status: ✅ OK (Status-Button, Icon-only)

- **Zeile 1438**: "Ablehnen" Button
  - Hintergrund: `bg-red-600`
  - Status: ✅ OK (Status-Button, Icon-only)

- **Zeile 1452**: "Erneut prüfen" Button
  - Hintergrund: `bg-yellow-600`
  - Status: ✅ OK (Status-Button, Icon-only)

### LifecycleView.tsx
- **Zeile 337-342**: "Offboarding starten" Button
  - Hintergrund: `bg-orange-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

- **Zeile 346-351**: "Offboarding abschließen" Button
  - Hintergrund: `bg-red-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

### OffboardingStartModal.tsx
- **Zeile 250-266**: "Offboarding starten" Button
  - Hintergrund: `bg-orange-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

### OffboardingCompleteModal.tsx
- **Zeile 266-282**: "Offboarding abschließen" Button
  - Hintergrund: `bg-red-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

### EmailTemplateBox.tsx
- **Zeile 135-139**: "E-Mail senden" Button
  - Hintergrund: `bg-green-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

### SocialSecurityCompletionBox.tsx
- **Zeile 183-188**: "Speichern" Button
  - Hintergrund: `bg-green-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

### teamWorktime/StopWorktimeModal.tsx
- **Zeile 136-139**: "Bestätigen" Button
  - Hintergrund: `bg-red-600`
  - Status: ❌ NICHT OK (hat Text, sollte Icon-only sein)

### organization/ProcessJoinRequestModal.tsx
- **Zeile 306-320**: "Genehmigen/Ablehnen" Button
  - Hintergrund: `bg-green-600` oder `bg-red-600`
  - Status: ✅ OK (Icon-only mit Tooltip)

---

## 3. HINZUFÜGEN-BUTTONS RECHTS STATT LINKS (❌ NICHT STANDARD)

### LifecycleView.tsx
- **Zeile 641-649**: "Arbeitsvertrag erstellen" Button
  - Position: Rechts (`justify-between` mit Titel links)
  - Status: ❌ NICHT OK (sollte links sein)
  - Aktuell: Rechts neben dem Titel
  - Sollte: Links positioniert sein

---

## 4. SONSTIGE FALSCH POSITIONIERTE BUTTONS

### Keine weiteren gefunden

---

## ZUSAMMENFASSUNG

### Buttons mit Text: **~40+ Buttons**
- Alle Modals haben "Abbrechen" und "Speichern/Erstellen" Buttons mit Text
- Alle "Mehr anzeigen" Buttons haben Text
- Lifecycle-Buttons haben Text
- Viele Form-Buttons haben Text

### Buttons mit farbigem Hintergrund: **~10 Buttons**
- Status-Buttons in Requests sind OK (Icon-only)
- Lifecycle-Buttons haben Text (NICHT OK)
- Einige Spezial-Buttons haben Text (NICHT OK)

### Hinzufügen-Buttons rechts statt links: **1 Button**
- LifecycleView.tsx: "Arbeitsvertrag erstellen" Button ist rechts

### Gesamt: **~55+ Buttons** müssen angepasst werden

---

## HINWEISE

### ✅ Bereits korrekt implementiert (Icon-only):
- EditClientModal.tsx (Sidepane-Version)
- EditOrganizationModal.tsx
- CreateOrganizationModal.tsx
- JoinOrganizationModal.tsx
- CreateClientModal.tsx
- CreateInvoiceModal.tsx
- InvoiceDetailModal.tsx (Button ist Icon-only, Text nur im Tooltip)
- MonthlyReportSettingsModal.tsx
- CreateRequestModal.tsx (Sidepane-Version)
- EditRequestModal.tsx
- BranchManagementTab.tsx (Modal-Buttons)
- RoleManagementTab.tsx (Modal-Buttons)
- CreateTaskModal.tsx
- EditTaskModal.tsx (muss noch vollständig geprüft werden)

### ⚠️ Noch zu prüfen:
- EditClientModal.tsx (Sidepane-Version - Buttons am Ende)
- EditTaskModal.tsx (Modal-Version - Buttons am Ende)
- Weitere Modals, die möglicherweise übersehen wurden

