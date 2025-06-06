# Implementierungsplan: System-Aufräumung für Intranet

## Übersicht
Dieses Dokument enthält den detaillierten Schritt-für-Schritt Plan zur systematischen Aufräumung des gesamten Intranet-Systems. Jeder Schritt hat eine Checkbox zum Abhaken nach Fertigstellung.

**WICHTIG**: Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message (z.B. "cleanup: remove unused imports from backend controllers")
3. Zum nächsten Schritt gehen

**Ziele der Aufräumung:**
- Logeinträge entfernen (falls nicht unbedingt nötig)
- Nicht benutzten Code entfernen
- Code-Duplikationen aufräumen und in wiederverwendbare Utilities umwandeln
- Konsistenz in Coding-Standards sicherstellen
- Performance-Optimierungen durch reduzierte Bundle-Größe

## Phase 1: Backend - Code-Analyse und Cleanup

### Schritt 1.1: Backend Controllers analysieren und aufräumen ⚠️ ERWEITERT
- [ ] **Auth & User Management Controllers:**
  - [ ] `authController.ts` - Referenz: [BERECHTIGUNGSSYSTEM.md](../technical/BERECHTIGUNGSSYSTEM.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Prüfe auf nicht verwendete Imports
    - [ ] Extrahiere JWT-Token-Validierung in Utility (siehe claude/patterns/api_error_handling.md)
    - [ ] Standardisiere Password-Hashing Pattern
  
  - [ ] `userController.ts` - Referenz: [BENUTZERHANDBUCH.md](../user/BENUTZERHANDBUCH.md)
    - [ ] Entferne unnötige console.log statements  
    - [ ] Identifiziere doppelte CRUD-Patterns und extrahiere in Base-Controller
    - [ ] Konsolidiere User-Role-Zuweisungslogik
    - [ ] Prüfe auf Memory Anchor: a7c238f1-9d6a-42e5-8af1-6d8b2e9a4f18
    
  - [ ] `roleController.ts` - Referenz: [BERECHTIGUNGSSYSTEM.md](../technical/BERECHTIGUNGSSYSTEM.md)  
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Permission-Checking Logic in Service
    - [ ] Konsolidiere Role-Hierarchy-Validierung
    
  - [ ] `organizationController.ts` - Referenz: [API_REFERENZ.md](../technical/API_REFERENZ.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Vergleiche mit userController für Pattern-Duplikation
    - [ ] Extrahiere gemeinsame CRUD-Operationen

- [ ] **Worktime & Task Management Controllers:**
  - [ ] `worktimeController.ts` - Referenz: [MODUL_ZEITERFASSUNG.md](../modules/MODUL_ZEITERFASSUNG.md), [claude/qa/timezone_handling.md](../claude/qa/timezone_handling.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Identifiziere Zeit-Calculation Duplikation
    - [ ] Extrahiere Timezone-Handling Utils (kritisch für Zeitzonenfehler!)
    - [ ] Implementiere safeDateParse aus qa/timezone_handling.md
    
  - [ ] `teamWorktimeController.ts` - Referenz: [MODUL_TEAMKONTROLLE.md](../modules/MODUL_TEAMKONTROLLE.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Konsolidiere Team-Calculation Logic mit worktimeController
    - [ ] Extrahiere Report-Generation Utils
    
  - [ ] `taskController.ts` - Referenz: [MODUL_WORKTRACKER.md](../modules/MODUL_WORKTRACKER.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Vergleiche Attachment-Handling mit requestController
    - [ ] Vereinheitliche Status-Management Logic
    - [ ] Extrahiere Task-Workflow-Engine
    
  - [ ] `taskAttachmentController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Konsolidiere mit requestAttachmentController
    - [ ] Extrahiere File-Upload-Service

- [ ] **Request & Client Management Controllers:**
  - [ ] `requestController.ts` - Referenz: [WORKFLOW_AUTOMATISIERUNG.md](../modules/WORKFLOW_AUTOMATISIERUNG.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Identifiziere Attachment-Handling Duplikation
    - [ ] Extrahiere File-Upload Logic in Service
    - [ ] Konsolidiere Workflow-Automation Logic
    
  - [ ] `requestAttachmentController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Merge mit taskAttachmentController in unified attachmentController
    
  - [ ] `clientController.ts` - Referenz: [MODUL_CONSULTATIONS.md](../modules/MODUL_CONSULTATIONS.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Vergleiche CRUD-Pattern mit anderen Controllern
    - [ ] Extrahiere Client-Validation in Service

- [ ] **Consultation & Invoicing Controllers:**
  - [ ] `consultationController.ts` - Referenz: [MODUL_CONSULTATIONS.md](../modules/MODUL_CONSULTATIONS.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Identifiziere Overlap mit worktimeController
    - [ ] Konsolidiere Time-Tracking Logic
    
  - [ ] `consultationInvoiceController.ts` - Referenz: [CONSULTATION_INVOICE_IMPLEMENTATION.md](../implementation_plans/CONSULTATION_INVOICE_IMPLEMENTATION.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere QR-Code-Generation in Service
    - [ ] Konsolidiere PDF-Generation Logic
    
  - [ ] `monthlyConsultationReportController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Report-Generation in Service
    - [ ] Konsolidiere mit anderen Report-Controllern
    
  - [ ] `invoiceSettingsController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Settings-Management Pattern
    - [ ] Merge mit settingsController

- [ ] **Payroll & Reporting Controllers:**
  - [ ] `payrollController.ts` - Referenz: [MODUL_ABRECHNUNG.md](../modules/MODUL_ABRECHNUNG.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Salary-Calculation in Service
    - [ ] Implementiere Error-Handling aus claude/patterns/api_error_handling.md
    
  - [ ] `branchController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Vergleiche mit userController für Pattern-Duplikation
    - [ ] Extrahiere gemeinsame CRUD-Operationen

- [ ] **Cerebro & Content Management Controllers:**
  - [ ] `cerebroController.ts` - Referenz: [MODUL_CEREBRO.md](../modules/MODUL_CEREBRO.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Markdown-Processing in Service
    - [ ] Konsolidiere mit cerebroExternalLinksController und cerebroMediaController
    
  - [ ] `cerebroExternalLinksController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Merge mit cerebroController
    
  - [ ] `cerebroMediaController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Merge mit cerebroController
    - [ ] Nutze gemeinsame File-Upload-Service

- [ ] **System & Utility Controllers:**
  - [ ] `notificationController.ts` - Referenz: [NOTIFICATION_SYSTEM.md](../modules/NOTIFICATION_SYSTEM.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Notification-Logic in Service
    - [ ] Implementiere Event-Driven Architecture
    
  - [ ] `databaseController.ts` - Referenz: [DATENBANKSCHEMA.md](../technical/DATENBANKSCHEMA.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Database-Maintenance Utils
    - [ ] Security-Review für Direct-DB-Access
    
  - [ ] `settingsController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Konsolidiere mit invoiceSettingsController und tableSettingsController
    
  - [ ] `tableSettingsController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Merge mit settingsController
    
  - [ ] `savedFilterController.ts` - Referenz: [MODUL_FILTERSYSTEM.md](../modules/MODUL_FILTERSYSTEM.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere Filter-Logic in Service
    
  - [ ] `identificationDocumentController.ts` - Referenz: [MODUL_DOKUMENT_ERKENNUNG.md](../modules/MODUL_DOKUMENT_ERKENNUNG.md)
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere OCR-Processing in Service
    - [ ] Konsolidiere mit File-Upload-Service
    
  - [ ] `urlMetadataController.ts`
    - [ ] Entferne unnötige console.log statements
    - [ ] Extrahiere URL-Metadata-Fetching in Service
    - [ ] Security-Review für External-URL-Fetching

### Schritt 1.2: Backend Base-Controller erstellen
- [ ] Erstelle `backend/src/controllers/baseController.ts`
  - [ ] Implementiere Standard CRUD-Operationen
  - [ ] Definiere einheitliche Error-Handling Patterns
  - [ ] Implementiere Standard Response-Formatter
  - [ ] Erstelle Validation-Utilities

- [ ] Refaktoriere alle Controller um baseController zu nutzen
  - [ ] authController aktualisieren
  - [ ] userController aktualisieren
  - [ ] branchController aktualisieren
  - [ ] requestController aktualisieren
  - [ ] taskController aktualisieren
  - [ ] worktimeController aktualisieren
  - [ ] clientController aktualisieren
  - [ ] consultationController aktualisieren

### Schritt 1.3: Backend Services analysieren und aufräumen
- [ ] Überprüfe `backend/src/services/` Verzeichnis
  - [ ] Inventarisiere alle Service-Dateien
  - [ ] Identifiziere nicht verwendete Services
  - [ ] Prüfe auf Service-Duplikation

- [ ] Für jede Service-Datei:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports/Exports
  - [ ] Konsolidiere ähnliche Services
  - [ ] Extrahiere gemeinsame Utilities

### Schritt 1.4: Backend Utils aufräumen
- [ ] Analysiere `backend/src/utils/` Verzeichnis
  - [ ] Inventarisiere alle Utility-Dateien
  - [ ] Identifiziere Duplikationen zwischen Utils
  - [ ] Prüfe auf nicht verwendete Funktionen

- [ ] Erstelle konsolidierte Utility-Struktur:
  - [ ] `dateUtils.ts` - Alle Datum/Zeit-Funktionen
  - [ ] `validationUtils.ts` - Validierungs-Funktionen
  - [ ] `responseUtils.ts` - Response-Formatting
  - [ ] `fileUtils.ts` - File-Handling Operationen
  - [ ] `emailUtils.ts` - E-Mail-Funktionen

### Schritt 1.5: Backend Routes aufräumen
- [ ] Öffne alle Dateien in `backend/src/routes/`
  - [ ] `auth.ts` - Prüfe auf nicht verwendete Imports
  - [ ] `users.ts` - Standardisiere Route-Pattern
  - [ ] `branches.ts` - Prüfe Route-Konsistenz
  - [ ] `requests.ts` - Vereinheitliche Middleware-Usage
  - [ ] `tasks.ts` - Standardisiere Error-Handling
  - [ ] `worktime.ts` - Prüfe auf Duplikation mit consultations
  - [ ] `clients.ts` - Standardisiere CRUD-Routes
  - [ ] `consultations.ts` - Eliminiere Overlap mit worktime

### Schritt 1.6: Backend Middleware aufräumen
- [ ] Analysiere `backend/src/middleware/` Verzeichnis
  - [ ] Inventarisiere alle Middleware-Dateien
  - [ ] Prüfe auf nicht verwendete Middleware
  - [ ] Identifiziere Duplikation in Auth/Permission Logic

- [ ] Für jede Middleware-Datei:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports
  - [ ] Konsolidiere ähnliche Middleware
  - [ ] Verbessere Error-Handling

### Schritt 1.7: Backend Validation aufräumen
- [ ] Analysiere `backend/src/validation/` Verzeichnis
  - [ ] Inventarisiere alle Validation-Schemas
  - [ ] Identifiziere doppelte Validierungsregeln
  - [ ] Extrahiere gemeinsame Validierungslogik

- [ ] Erstelle konsolidierte Validation-Struktur:
  - [ ] `commonValidations.ts` - Wiederverwendbare Validierungen
  - [ ] Aktualisiere alle Schema-Dateien um common validations zu nutzen

## Phase 2: Frontend - Komponenten-Cleanup

### Schritt 2.1: Frontend Components - Auth-Komponenten
- [ ] Analysiere `frontend/src/components/auth/`
  - [ ] Inventarisiere alle Auth-Komponenten
  - [ ] Prüfe auf nicht verwendete Komponenten
  - [ ] Identifiziere gemeinsame Patterns

- [ ] Für jede Auth-Komponente:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports
  - [ ] Extrahiere gemeinsame Form-Validierungslogik
  - [ ] Konsolidiere Styling-Pattern

### Schritt 2.2: Frontend Components - Cerebro-Komponenten
- [ ] Analysiere `frontend/src/components/cerebro/`
  - [ ] Inventarisiere alle Cerebro-Komponenten
  - [ ] Prüfe auf nicht verwendete Komponenten
  - [ ] Identifiziere Wiki-spezifische Utilities

- [ ] Für jede Cerebro-Komponente:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports
  - [ ] Extrahiere Markdown-Handling in Service
  - [ ] Konsolidiere Editor-Funktionalität

### Schritt 2.3: Frontend Components - Organisation-Komponenten
- [ ] Analysiere `frontend/src/components/organization/`
  - [ ] Inventarisiere alle Organization-Komponenten
  - [ ] Prüfe auf nicht verwendete Komponenten
  - [ ] Identifiziere CRUD-Pattern Duplikation

- [ ] Für jede Organization-Komponente:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports
  - [ ] Extrahiere gemeinsame CRUD-Operationen
  - [ ] Erstelle wiederverwendbare Table-Komponenten

### Schritt 2.4: Frontend Components - TeamWorktime-Komponenten
- [ ] Analysiere `frontend/src/components/teamWorktime/`
  - [ ] Inventarisiere alle TeamWorktime-Komponenten
  - [ ] Prüfe auf nicht verwendete Komponenten
  - [ ] Identifiziere Zeiterfassungs-Duplikation

- [ ] Für jede TeamWorktime-Komponente:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports
  - [ ] Konsolidiere Zeit-Calculation Logic
  - [ ] Extrahiere Chart/Report-Utilities

### Schritt 2.5: Frontend Components - Root-Level Komponenten ⚠️ ERWEITERT
- [ ] **User & Role Management Komponenten:**
  - [ ] `UserManagementTab.tsx` - Referenz: [BENUTZERHANDBUCH.md](../user/BENUTZERHANDBUCH.md)
    - [ ] Entferne console.log statements (40KB, 873 lines!)
    - [ ] Extrahiere User-CRUD-Operations in Service
    - [ ] Konsolidiere mit RoleManagementTab
    
  - [ ] `RoleManagementTab.tsx` - Referenz: [BERECHTIGUNGSSYSTEM.md](../technical/BERECHTIGUNGSSYSTEM.md)
    - [ ] Entferne console.log statements (62KB, 1511 lines!)
    - [ ] Extrahiere Role-Permission-Logic
    - [ ] Implementiere Permission-Matrix Component

- [ ] **Invoice & Financial Komponenten:**
  - [ ] `InvoiceManagementTab.tsx` - Referenz: [CONSULTATION_INVOICE_IMPLEMENTATION.md](../implementation_plans/CONSULTATION_INVOICE_IMPLEMENTATION.md)
    - [ ] Entferne console.log statements (46KB, 1046 lines!)
    - [ ] Extrahiere Invoice-Generation Logic
    - [ ] Konsolidiere mit MonthlyReportsTab
    
  - [ ] `MonthlyReportsTab.tsx` - Referenz: [MODUL_ABRECHNUNG.md](../modules/MODUL_ABRECHNUNG.md)
    - [ ] Entferne console.log statements (28KB, 583 lines!)
    - [ ] Extrahiere Report-Generation Utils
    - [ ] Merge Report-Logic mit anderen Report-Komponenten
    
  - [ ] `InvoiceDetailModal.tsx`, `CreateInvoiceModal.tsx`, `InvoiceSuccessModal.tsx`
    - [ ] Konsolidiere Modal-Pattern
    - [ ] Extrahiere gemeinsame Invoice-Validation

- [ ] **Consultation & Client Management:**
  - [ ] `ConsultationTracker.tsx` - Referenz: [MODUL_CONSULTATIONS.md](../modules/MODUL_CONSULTATIONS.md), [claude/patterns/worktime_tracking.md](../claude/patterns/worktime_tracking.md)
    - [ ] Entferne console.log statements (29KB, 688 lines!)
    - [ ] Prüfe Overlap mit WorktimeTracker (Memory Anchor: 8c721a3e-3f18-4d1b-b2ed-3c6a5e9b5c8f)
    - [ ] Konsolidiere Time-Tracking Logic
    
  - [ ] `ConsultationList.tsx` - Referenz: [MODUL_CONSULTATIONS.md](../modules/MODUL_CONSULTATIONS.md)
    - [ ] Entferne console.log statements (59KB, 1341 lines!)
    - [ ] Konsolidiere List-Pattern mit anderen List-Komponenten
    - [ ] Extrahiere Pagination Logic
    
  - [ ] `ClientSelectModal.tsx`, `CreateClientModal.tsx`
    - [ ] Standardisiere Modal-Pattern
    - [ ] Extrahiere Client-Management Utils

- [ ] **Worktime & Task Management:**
  - [ ] `WorktimeTracker.tsx` - Referenz: [MODUL_ZEITERFASSUNG.md](../modules/MODUL_ZEITERFASSUNG.md), [claude/cheatsheets/worktracker.md](../claude/cheatsheets/worktracker.md)
    - [ ] Entferne console.log statements (20KB, 472 lines!)
    - [ ] Implementiere Timezone-Fixes aus claude/qa/timezone_handling.md
    - [ ] Memory Anchor: a7c238f1-9d6a-42e5-8af1-6d8b2e9a4f18
    
  - [ ] `WorktimeStats.tsx`, `WorktimeModal.tsx`, `WorktimeList.tsx`
    - [ ] Konsolidiere Worktime-Display Logic
    - [ ] Extrahiere Time-Calculation Utils
    
  - [ ] `CreateTaskModal.tsx`, `EditTaskModal.tsx` - Referenz: [MODUL_WORKTRACKER.md](../modules/MODUL_WORKTRACKER.md)
    - [ ] Entferne console.log statements (45KB + 48KB = 93KB!)
    - [ ] Konsolidiere Task-Form Logic
    - [ ] Extrahiere Task-Validation
    
  - [ ] `LinkTaskModal.tsx`
    - [ ] Merge mit anderen Task-Modals

- [ ] **Request Management:**
  - [ ] `CreateRequestModal.tsx`, `EditRequestModal.tsx` - Referenz: [WORKFLOW_AUTOMATISIERUNG.md](../modules/WORKFLOW_AUTOMATISIERUNG.md)
    - [ ] Entferne console.log statements (30KB + 30KB = 60KB!)
    - [ ] Konsolidiere Request-Form Logic
    - [ ] Extrahiere Request-Workflow Engine
    
  - [ ] `Requests.tsx`
    - [ ] Entferne console.log statements (42KB, 981 lines!)
    - [ ] Konsolidiere mit Task-List Pattern

- [ ] **Filter & Search System:**
  - [ ] `FilterRow.tsx`, `FilterPane.tsx`, `SavedFilterTags.tsx` - Referenz: [MODUL_FILTERSYSTEM.md](../modules/MODUL_FILTERSYSTEM.md)
    - [ ] Entferne console.log statements
    - [ ] Konsolidiere Filter-Logic in einzelne Filter-Engine
    - [ ] Extrahiere Filter-Persistence Logic
    
  - [ ] `FilterLogicalOperator.tsx`
    - [ ] Merge mit FilterRow

- [ ] **Notification & Communication:**
  - [ ] `NotificationList.tsx`, `NotificationBell.tsx` - Referenz: [NOTIFICATION_SYSTEM.md](../modules/NOTIFICATION_SYSTEM.md)
    - [ ] Entferne console.log statements
    - [ ] Konsolidiere Notification-Display Logic
    - [ ] Extrahiere Real-time Updates
    
  - [ ] `NotificationSettings.tsx`
    - [ ] Merge mit anderen Settings-Komponenten

- [ ] **Document & Media Management:**
  - [ ] `IdentificationDocumentForm.tsx`, `IdentificationDocumentList.tsx` - Referenz: [MODUL_DOKUMENT_ERKENNUNG.md](../modules/MODUL_DOKUMENT_ERKENNUNG.md)
    - [ ] Entferne console.log statements
    - [ ] Extrahiere OCR-Processing Logic
    - [ ] Konsolidiere Document-Upload Pattern
    
  - [ ] `CameraCapture.tsx`
    - [ ] Integriere mit IdentificationDocument-Flow
    
  - [ ] `MarkdownPreview.tsx` - Referenz: [MODUL_CEREBRO.md](../modules/MODUL_CEREBRO.md)
    - [ ] Extrahiere Markdown-Rendering Utils

- [ ] **System & Utility Komponenten:**
  - [ ] `DatabaseManagement.tsx` - Referenz: [DATENBANKSCHEMA.md](../technical/DATENBANKSCHEMA.md)
    - [ ] Security-Review für Direct-DB-Access
    - [ ] Extrahiere Database-Maintenance Utils
    
  - [ ] `PayrollComponent.tsx` - Referenz: [MODUL_ABRECHNUNG.md](../modules/MODUL_ABRECHNUNG.md)
    - [ ] Konsolidiere mit anderen Payroll-Komponenten
    
  - [ ] `TableColumnConfig.tsx`
    - [ ] Extrahiere Table-Configuration Utils
    
  - [ ] `Sidebar.tsx`, `Header.tsx`, `Layout.tsx` - Referenz: [DESIGN_STANDARDS.md](../core/DESIGN_STANDARDS.md)
    - [ ] Konsolidiere Layout-Logic
    - [ ] Extrahiere Navigation-Utils
    
  - [ ] `ErrorBoundary.tsx`, `ErrorDisplay.tsx`
    - [ ] Implementiere Error-Patterns aus claude/patterns/api_error_handling.md
    
  - [ ] `HeaderMessage.tsx`, `AppDownload.tsx`, `FaviconLoader.tsx`
    - [ ] Konsolidiere Utility-Komponenten

- [ ] **Pages-Verzeichnis analysieren:** ⚠️ FEHLEND IM URSPRUNGSPLAN
  - [ ] Alle Dateien in `frontend/src/pages/` systematisch durchgehen
  - [ ] Dashboard, Settings, Profile, Login, Register etc.
  - [ ] Konsolidiere Page-Level Logic

### Schritt 2.6: Frontend Hooks aufräumen
- [ ] Analysiere `frontend/src/hooks/` Verzeichnis
  - [ ] Inventarisiere alle Custom Hooks
  - [ ] Prüfe auf nicht verwendete Hooks
  - [ ] Identifiziere Hook-Duplikation

- [ ] Für jeden Custom Hook:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Dependencies
  - [ ] Konsolidiere ähnliche Data-Fetching Logic
  - [ ] Extrahiere gemeinsame State-Management

### Schritt 2.7: Frontend Services aufräumen
- [ ] Analysiere `frontend/src/services/` Verzeichnis
  - [ ] Inventarisiere alle Service-Dateien
  - [ ] Prüfe auf nicht verwendete Services
  - [ ] Identifiziere API-Call Duplikation

- [ ] Für jeden Service:
  - [ ] Entferne console.log statements
  - [ ] Prüfe nicht verwendete Imports/Exports
  - [ ] Konsolidiere ähnliche API-Operationen
  - [ ] Erstelle Base-API-Service

### Schritt 2.8: Frontend Utils aufräumen
- [ ] Analysiere `frontend/src/utils/` Verzeichnis
  - [ ] Inventarisiere alle Utility-Dateien
  - [ ] Prüfe auf Duplikation mit Backend-Utils
  - [ ] Identifiziere nicht verwendete Funktionen

- [ ] Erstelle konsolidierte Frontend-Utils:
  - [ ] `dateUtils.ts` - Client-seitige Datum-Funktionen
  - [ ] `formatUtils.ts` - Formatierungs-Funktionen
  - [ ] `validationUtils.ts` - Client-Validierungen
  - [ ] `storageUtils.ts` - LocalStorage/SessionStorage

## Phase 3: Shared Code - Duplikations-Eliminierung

### Schritt 3.1: Type-Definitionen konsolidieren
- [ ] Analysiere `frontend/src/types/` Verzeichnis
  - [ ] Inventarisiere alle Type-Dateien
  - [ ] Identifiziere doppelte Interface-Definitionen
  - [ ] Vergleiche mit Backend-Types

- [ ] Erstelle konsolidierte Type-Struktur:
  - [ ] `shared/` Verzeichnis für gemeinsame Types
  - [ ] Eliminiere doppelte Interface-Definitionen
  - [ ] Erstelle Type-Guards für Runtime-Validation

### Schritt 3.2: API-Endpunkt Definitionen konsolidieren
- [ ] Analysiere `frontend/src/config/api.ts`
  - [ ] Prüfe auf nicht verwendete Endpoints
  - [ ] Standardisiere Endpoint-Naming
  - [ ] Gruppiere verwandte Endpoints

- [ ] Vergleiche mit Backend-Route-Definitionen:
  - [ ] Stelle sicher, dass alle Frontend-Endpoints existieren
  - [ ] Entferne verwaiste Endpoint-Definitionen
  - [ ] Standardisiere Parameter-Passing

### Schritt 3.3: Validation-Schema Konsolidierung
- [ ] Vergleiche Frontend und Backend Validierungen:
  - [ ] Identifiziere unterschiedliche Validierungsregeln
  - [ ] Harmonisiere Client/Server-Validierung
  - [ ] Extrahiere gemeinsame Validation-Utilities

## Phase 4: Database und Prisma Cleanup

### Schritt 4.1: Prisma Schema aufräumen
- [ ] Analysiere `backend/prisma/schema.prisma`
  - [ ] Prüfe auf nicht verwendete Models
  - [ ] Identifiziere redundante Felder
  - [ ] Optimiere Index-Definitionen

- [ ] Prüfe Migration-History:
  - [ ] Analysiere `backend/prisma/migrations/`
  - [ ] Identifiziere überflüssige Migrations
  - [ ] Dokumentiere Schema-Änderungen

### Schritt 4.2: Database Queries optimieren
- [ ] Analysiere Prisma-Queries in allen Controllern:
  - [ ] Identifiziere ineffiziente Queries
  - [ ] Prüfe auf N+1 Query-Probleme
  - [ ] Optimiere Include/Select-Statements

- [ ] Erstelle Query-Utilities:
  - [ ] Gemeinsame Query-Builder-Funktionen
  - [ ] Standard-Include-Definitionen
  - [ ] Performance-optimierte Query-Patterns

## Phase 5: Mobile App (React Native) Cleanup

### Schritt 5.1: Mobile App Components
- [ ] Analysiere `IntranetMobileApp/src/components/`
  - [ ] Inventarisiere alle Komponenten
  - [ ] Prüfe auf nicht verwendete Komponenten
  - [ ] Identifiziere Duplikation mit Web-Komponenten

### Schritt 5.2: Mobile App Services
- [ ] Analysiere `IntranetMobileApp/src/api/`
  - [ ] Prüfe API-Service Konsistenz mit Web-App
  - [ ] Entferne nicht verwendete API-Calls
  - [ ] Konsolidiere ähnliche Services

### Schritt 5.3: Mobile App Utils
- [ ] Analysiere `IntranetMobileApp/src/utils/`
  - [ ] Identifiziere Duplikation mit Web-App Utils
  - [ ] Extrahiere plattform-agnostische Utilities
  - [ ] Prüfe auf mobile-spezifische Optimierungen

## Phase 6: Scripts und Configuration Cleanup

### Schritt 6.1: Package.json Cleanup
- [ ] Analysiere Root `package.json`
  - [ ] Prüfe auf nicht verwendete Dependencies
  - [ ] Aktualisiere veraltete Pakete
  - [ ] Konsolidiere Script-Definitionen

- [ ] Analysiere Backend `package.json`
  - [ ] Prüfe auf nicht verwendete Dependencies
  - [ ] Entferne Development-Dependencies aus Production
  - [ ] Optimiere Dependency-Versionen

- [ ] Analysiere Frontend `package.json`
  - [ ] Prüfe auf nicht verwendete Dependencies
  - [ ] Identifiziere Bundle-Size-Optimierungen
  - [ ] Aktualisiere Build-Scripts

### Schritt 6.2: Build und Deploy Scripts
- [ ] Analysiere `backend/scripts/` Verzeichnis
  - [ ] Prüfe auf nicht verwendete Scripts
  - [ ] Aktualisiere veraltete Scripts
  - [ ] Dokumentiere Script-Funktionalität

### Schritt 6.3: Environment Configuration
- [ ] Prüfe Environment-Variablen:
  - [ ] Identifiziere nicht verwendete ENV-Vars
  - [ ] Dokumentiere erforderliche Configuration
  - [ ] Standardisiere ENV-Naming

## Phase 7: Tests und Documentation Cleanup

### Schritt 7.1: Test-Dateien analysieren
- [ ] Suche nach Test-Dateien im gesamten Projekt
  - [ ] Identifiziere veraltete Tests
  - [ ] Prüfe Test-Coverage für neue Features
  - [ ] Aktualisiere Test-Utilities

### Schritt 7.2: Documentation aufräumen
- [ ] Analysiere `docs/` Verzeichnis systematisch:
  - [ ] Prüfe auf veraltete Dokumentation
  - [ ] Identifiziere Inkonsistenzen zwischen Docs und Code
  - [ ] Aktualisiere API-Dokumentation

### Schritt 7.3: README und Setup-Guides
- [ ] Prüfe alle README-Dateien:
  - [ ] Aktualisiere Setup-Anweisungen
  - [ ] Teste Installation-Steps
  - [ ] Dokumentiere neue Dependencies

## Phase 8: Performance und Bundle-Size Optimierung

### Schritt 8.1: Frontend Bundle-Analysis
- [ ] Führe Bundle-Analyzer aus:
  - [ ] Identifiziere große Dependencies
  - [ ] Prüfe auf nicht verwendete Imports
  - [ ] Implementiere Code-Splitting

### Schritt 8.2: Asset-Optimierung
- [ ] Analysiere `frontend/src/assets/`
  - [ ] Prüfe auf nicht verwendete Assets
  - [ ] Optimiere Bild-Größen
  - [ ] Implementiere Asset-Compression

### Schritt 8.3: Backend Performance
- [ ] Analysiere Server-Performance:
  - [ ] Identifiziere langsame Endpoints
  - [ ] Optimiere Database-Queries
  - [ ] Implementiere Caching-Strategien

## Phase 9: Security und Error-Handling Review

### Schritt 9.1: Security-Audit
- [ ] Prüfe alle Input-Validierungen:
  - [ ] Client-seitige Validierung
  - [ ] Server-seitige Validierung
  - [ ] SQL-Injection Prevention

### Schritt 9.2: Error-Handling Standardisierung
- [ ] Konsolidiere Error-Handling:
  - [ ] Standardisiere Error-Response Formate
  - [ ] Implementiere Global Error-Handler
  - [ ] Verbessere User-Facing Error-Messages

## Phase 10: Final Review und Testing

### Schritt 10.1: Code-Review
- [ ] Führe vollständigen Code-Review durch:
  - [ ] Prüfe Coding-Standards Compliance
  - [ ] Teste alle Major-Features
  - [ ] Verifiziere Performance-Verbesserungen

### Schritt 10.2: Integration-Testing
- [ ] Teste komplette User-Flows:
  - [ ] Login/Logout-Prozess
  - [ ] Zeiterfassung-Workflows
  - [ ] Task-Management-Flows
  - [ ] Consultation-Management

### Schritt 10.3: Documentation Update
- [ ] Aktualisiere finale Dokumentation:
  - [ ] API-Referenz aktualisieren
  - [ ] Architektur-Dokumentation aktualisieren
  - [ ] Setup-Guides überprüfen

## Cleanup-Utilities erstellen

### Schritt 11.1: Automatisierte Cleanup-Scripts - Referenz: [CODING_STANDARDS.md](../core/CODING_STANDARDS.md)
- [ ] Erstelle `scripts/cleanup/unused-imports.js`
  - [ ] Script zum Finden nicht verwendeter Imports
  - [ ] Automatisches Entfernen sicherer Imports
  - [ ] TypeScript-spezifische Import-Analysis
  - [ ] Berücksichtigung von Memory Anchors

- [ ] Erstelle `scripts/cleanup/console-logs.js`
  - [ ] Script zum Finden aller console.log statements
  - [ ] Selektives Entfernen von Debug-Logs
  - [ ] Behalte Error-Logs und Production-relevante Logs
  - [ ] Referenz: claude/debug_history/ für bekannte Log-Patterns

- [ ] Erstelle `scripts/cleanup/duplicate-code.js`
  - [ ] Script zum Identifizieren von Code-Duplikation
  - [ ] Vorschläge für Refactoring-Möglichkeiten
  - [ ] AST-basierte Code-Similarity-Analysis
  - [ ] Integration mit claude/patterns/ für Best-Practice-Vorschläge

- [ ] Erstelle `scripts/cleanup/timezone-fix.js` - Referenz: [claude/qa/timezone_handling.md](../claude/qa/timezone_handling.md)
  - [ ] Automatische Erkennung von Timezone-Problemen
  - [ ] Implementierung von safeDateParse Pattern
  - [ ] Migration von Date-Constructor Calls

- [ ] Erstelle `scripts/cleanup/controller-consolidation.js`
  - [ ] Automatische Erkennung von CRUD-Pattern Duplikation
  - [ ] Vorschläge für BaseController-Extraktion
  - [ ] API-Endpoint Konsistenz-Check

### Schritt 11.2: Code-Quality Tools einrichten - Referenz: [VIBES.md](../core/VIBES.md)
- [ ] Konfiguriere ESLint Rules:
  - [ ] Keine console.log in Production (außer Error-Handling)
  - [ ] Keine nicht verwendeten Imports
  - [ ] Konsistente Coding-Standards aus VIBES.md
  - [ ] TypeScript-strict-Mode Enforcement
  - [ ] React-Hooks-Rules für Performance
  - [ ] Security-Rules (No-Eval, SQL-Injection Prevention)

- [ ] Konfiguriere Prettier:
  - [ ] Einheitliche Code-Formatierung
  - [ ] Automatische Format-on-Save
  - [ ] Tailwind CSS Class-Sorting
  - [ ] Import-Statement-Sorting

- [ ] Konfiguriere Husky Pre-commit Hooks:
  - [ ] Automatic Linting und Formatting
  - [ ] Type-Checking vor Commit
  - [ ] Test-Execution für geänderte Files
  - [ ] Memory-Anchor-Validation

### Schritt 11.3: Documentation-Sync Tools - NEU
- [ ] Erstelle `scripts/cleanup/doc-sync.js`
  - [ ] Automatische Erkennung von Code-Documentation-Mismatches
  - [ ] Update von API-Referenz basierend auf aktuellem Code
  - [ ] Validation von Memory-Anchor-References
  - [ ] Prüfung der 3-stufigen Dokumentationshierarchie

- [ ] Erstelle `scripts/cleanup/claude-metadata-update.js`
  - [ ] Automatisches Update von claude/metadata/ Files
  - [ ] Component-Dependency-Graph Generation
  - [ ] Error-Pattern-Detection basierend auf claude/qa/
  - [ ] Performance-Metrics-Collection

## Erfolgsmessung

### Metrics vor Cleanup dokumentieren:
- [ ] Bundle-Size (Frontend)
- [ ] Number of Files
- [ ] Lines of Code
- [ ] Number of Dependencies
- [ ] Build-Time
- [ ] Test-Coverage

### Metrics nach Cleanup messen:
- [ ] Bundle-Size Reduktion
- [ ] Code-Reduktion (LoC)
- [ ] Dependency-Reduktion
- [ ] Build-Time Verbesserung
- [ ] Maintainability-Index

## Abschluss-Checkliste

- [ ] Alle Komponenten getestet
- [ ] Keine console.log statements in Production-Code
- [ ] Keine nicht verwendeten Imports
- [ ] Code-Duplikation auf Minimum reduziert
- [ ] Dokumentation aktualisiert
- [ ] Performance-Verbesserungen dokumentiert
- [ ] Final-Commit mit Cleanup-Summary erstellt

## Hinweise für die Implementierung

1. **SYSTEMATIC APPROACH**: Arbeite ordnerweise und dateiweise durch
2. **TEST AFTER EACH STEP**: Nach jeder Änderung testen
3. **DOCUMENT EVERYTHING**: Alle Änderungen dokumentieren
4. **PERFORMANCE FIRST**: Fokus auf echte Performance-Gewinne
5. **BACKWARDS COMPATIBILITY**: Keine Breaking Changes ohne Dokumentation

## Geschätzte Zeitaufwand

- **Phase 1-2**: 15-20 Stunden (Backend + Frontend Cleanup)
- **Phase 3-4**: 8-10 Stunden (Shared Code + Database)
- **Phase 5-6**: 6-8 Stunden (Mobile + Scripts)
- **Phase 7-8**: 8-10 Stunden (Tests + Performance)
- **Phase 9-10**: 6-8 Stunden (Security + Final Review)

**Gesamt**: 43-56 Stunden

## Backup-Strategie

- [ ] Vollständiges Backup vor Start erstellen
- [ ] Nach jeder Phase Zwischensicherung
- [ ] Git-Branches für größere Refactoring-Schritte
- [ ] Rollback-Plan für kritische Änderungen
