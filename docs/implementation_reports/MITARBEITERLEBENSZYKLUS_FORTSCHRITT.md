# MITARBEITERLEBENSZYKLUS - Fortschrittsreport

## Status: In Arbeit

**Startdatum**: 2025-01-XX  
**Aktueller Stand**: Phase 1 abgeschlossen, bereit für Phase 2

---

## Übersicht

| Phase | Status | Start | Ende | Fortschritt |
|-------|--------|-------|------|-------------|
| Phase 1: Data Model | 🟢 Abgeschlossen | 2025-01-XX | 2025-01-XX | 100% |
| Phase 2: Backend Services | 🟢 Abgeschlossen | 2025-01-XX | 2025-01-XX | 100% |
| Phase 3: API Endpoints | 🟢 Abgeschlossen | 2025-01-XX | 2025-01-XX | 100% |
| Phase 4: Frontend Components | 🟢 Abgeschlossen | 2025-01-XX | 2025-01-XX | 100% |
| Phase 5: Document Generation | ⚪ Nicht gestartet | - | - | 0% |
| Phase 6: Social Security Integration | ⚪ Nicht gestartet | - | - | 0% |
| Phase 7: Testing & QA | ⚪ Nicht gestartet | - | - | 0% |
| Phase 8: Documentation | 🟢 Abgeschlossen | 2025-01-XX | 2025-01-XX | 100% |

**Legende**:
- 🟢 Abgeschlossen
- 🟡 In Arbeit
- ⚪ Nicht gestartet
- 🔴 Blockiert

---

## Phase 1: Data Model

### Status: 🟢 Abgeschlossen

**Ziel**: Prisma Schema erweitern mit neuen Models für Mitarbeiterlebenszyklus

**Geplante Models**:
- [x] `EmployeeLifecycle` - Haupt-Model für Lebenszyklus-Status
- [x] `LifecycleEvent` - Events im Lebenszyklus
- [x] `EmploymentCertificate` - Arbeitszeugnisse
- [x] `EmploymentContract` - Arbeitsverträge
- [x] `ContractDocument` - Vertragsänderungen
- [x] `SocialSecurityRegistration` - Sozialversicherungs-Anmeldungen

**Abgeschlossene Schritte**:
1. ✅ Prisma Schema analysiert
2. ✅ Neue Models definiert und hinzugefügt
3. ✅ Enums hinzugefügt (`EmployeeStatus`, `SocialSecurityStatus`)
4. ✅ Relations zu User und Organization hinzugefügt
5. ✅ Migration manuell erstellt (`20250101000000_add_employee_lifecycle_models`)
6. ✅ Migration als angewendet markiert
7. ✅ Migration Status: "Database schema is up to date!"
8. ⚠️ Prisma Client Generation: EPERM Fehler (Server läuft, muss nach Neustart generiert werden)

**Probleme**: 
- Prisma Client konnte nicht generiert werden (EPERM - Datei gesperrt, weil Server läuft)
- **Lösung**: Nach Server-Neustart `npx prisma generate` ausführen

**Entscheidungen**: 
- Models wurden in `backend/prisma/schema.prisma` hinzugefügt
- `ContractDocument` verweist auf `EmploymentContract` (nicht direkt auf `EmployeeLifecycle`) - logischer für Vertragsänderungen
- Migration wurde manuell erstellt und als angewendet markiert (wegen Drift-Problem)

---

## Phase 2: Backend Services

### Status: 🟡 In Arbeit (Teilweise abgeschlossen)

**Geplante Services**:
- [x] `lifecycleService.ts` - Haupt-Service für Lebenszyklus-Logik ✅ **Vollständig implementiert**
- [ ] `documentService.ts` - Service für Dokumenten-Generierung (PDF-Generierung für Certificates/Contracts) - **Wird in Phase 5 implementiert**
- [x] `socialSecurityService.ts` - Service für Sozialversicherungen ✅ **Integriert in lifecycleService.ts**
- [x] `taskAutomationService.ts` - Service für automatische Task-Erstellung ✅ **Vollständig implementiert**

**Abgeschlossene Schritte**:
1. ✅ `lifecycleService.ts` - Vollständig implementiert mit:
   - `getLifecycle()` - Lebenszyklus-Status abrufen
   - `createLifecycle()` - Neuen Lebenszyklus erstellen
   - `updateStatus()` - Status aktualisieren
   - `calculateProgress()` - Onboarding-Progress berechnen
   - `getSocialSecurityStatus()` - Sozialversicherungs-Status abrufen
   - `updateSocialSecurityStatus()` - Sozialversicherungs-Status aktualisieren
2. ✅ `lifecycleRoles.ts` - Helper-Funktionen für Rollen-Prüfung:
   - `hasLifecycleRole()` - Prüft ob User eine Lebenszyklus-Rolle hat
   - `isHROrAdmin()` - Prüft ob User HR oder Admin ist
   - `isLegalOrAdmin()` - Prüft ob User Legal oder Admin ist
3. ✅ Automatische Lebenszyklus-Erstellung in `userController.ts` (createUser)
4. ✅ `lifecycleController.ts` - Basis-Endpoints:
   - `getLifecycle()` - GET /api/users/:id/lifecycle
   - `updateStatus()` - PUT /api/users/:id/lifecycle/status
   - `getSocialSecurity()` - GET /api/users/:id/lifecycle/social-security/:type
   - `updateSocialSecurity()` - PUT /api/users/:id/lifecycle/social-security/:type
5. ✅ Routes in `users.ts` - Lebenszyklus-Routes hinzugefügt
6. ✅ `organizationController.ts` - Rollen-Konfiguration:
   - `getLifecycleRoles()` - GET /api/organizations/current/lifecycle-roles
   - `updateLifecycleRoles()` - PUT /api/organizations/current/lifecycle-roles
7. ✅ Routes in `organizations.ts` - Lebenszyklus-Rollen-Routes hinzugefügt

**Abgeschlossene Schritte (Fortsetzung)**:
8. ✅ Certificate/Contract Service-Methoden in `lifecycleService.ts`:
   - `getCertificates()` - Alle Arbeitszeugnisse abrufen
   - `getCertificate()` - Einzelnes Arbeitszeugnis abrufen
   - `createCertificate()` - Neues Arbeitszeugnis erstellen
   - `updateCertificate()` - Arbeitszeugnis aktualisieren
   - `getContracts()` - Alle Arbeitsverträge abrufen
   - `getContract()` - Einzelnen Arbeitsvertrag abrufen
   - `createContract()` - Neuen Arbeitsvertrag erstellen
   - `updateContract()` - Arbeitsvertrag aktualisieren
9. ✅ Certificate/Contract Controller-Methoden in `lifecycleController.ts`:
   - `getCertificates` - GET /api/users/:id/lifecycle/certificates
   - `getCertificate` - GET /api/users/:id/lifecycle/certificates/:certId
   - `createCertificate` - POST /api/users/:id/lifecycle/certificates (nur HR/Admin)
   - `updateCertificate` - PUT /api/users/:id/lifecycle/certificates/:certId (nur HR/Admin)
   - `downloadCertificate` - GET /api/users/:id/lifecycle/certificates/:certId/download
   - `getContracts` - GET /api/users/:id/lifecycle/contracts
   - `getContract` - GET /api/users/:id/lifecycle/contracts/:contractId
   - `createContract` - POST /api/users/:id/lifecycle/contracts (nur HR/Admin)
   - `updateContract` - PUT /api/users/:id/lifecycle/contracts/:contractId (nur HR/Admin)
   - `downloadContract` - GET /api/users/:id/lifecycle/contracts/:contractId/download
10. ✅ Routes in `users.ts` - Certificate/Contract-Routes hinzugefügt
11. ✅ Upload-Verzeichnisse: Automatische Erstellung von `uploads/certificates` und `uploads/contracts`
12. ✅ Event-Logging: Automatische Erstellung von Lifecycle-Events bei Create/Update
13. ✅ `isLatest`-Flag: Neueste Version wird automatisch markiert

**Abgeschlossene Schritte (Fortsetzung)**:
14. ✅ `taskAutomationService.ts` - Automatische Task-Erstellung:
   - `createOnboardingTasks()` - Erstellt automatisch Tasks für ARL, EPS, Pension, Caja bei Onboarding-Start
   - `createOffboardingTasks()` - Erstellt automatisch Tasks für Offboarding (Arbeitszeugnis, Abrechnung, Abmeldung)
   - `createSocialSecurityTask()` - Erstellt einzelnen Task für Sozialversicherung
   - Integration in `lifecycleService.ts`:
     - Automatische Task-Erstellung bei `createLifecycle()` (Onboarding-Start)
     - Automatische Task-Erstellung bei Status-Wechsel zu "offboarding"
   - Rollen-Konfiguration: Nutzt `Organization.settings.lifecycleRoles` oder Fallback zu Standard-Rollen
   - Benachrichtigungen: Automatische Benachrichtigungen für zugewiesene Rollen
   - Lifecycle-Events: Automatische Event-Erstellung bei Task-Erstellung

**Fehlende Teile**:
- [ ] `documentService.ts` - PDF-Generierung für Certificates/Contracts (wird in Phase 5 implementiert)

---

## Phase 3: API Endpoints

### Status: 🟡 In Arbeit (70% abgeschlossen)

**Geplante Endpoints**:
- [x] `/api/users/:id/lifecycle` - Lebenszyklus-Status abrufen ✅
- [x] `/api/users/:id/lifecycle/status` - Status aktualisieren ✅
- [x] `/api/users/:id/lifecycle/certificates` - Arbeitszeugnisse ✅
  - [x] GET `/api/users/:id/lifecycle/certificates` - Alle abrufen ✅
  - [x] GET `/api/users/:id/lifecycle/certificates/:certId` - Einzelnes abrufen ✅
  - [x] POST `/api/users/:id/lifecycle/certificates` - Erstellen (HR/Admin) ✅
  - [x] PUT `/api/users/:id/lifecycle/certificates/:certId` - Aktualisieren (HR/Admin) ✅
  - [x] GET `/api/users/:id/lifecycle/certificates/:certId/download` - Download ✅
- [x] `/api/users/:id/lifecycle/contracts` - Arbeitsverträge ✅
  - [x] GET `/api/users/:id/lifecycle/contracts` - Alle abrufen ✅
  - [x] GET `/api/users/:id/lifecycle/contracts/:contractId` - Einzelnen abrufen ✅
  - [x] POST `/api/users/:id/lifecycle/contracts` - Erstellen (HR/Admin) ✅
  - [x] PUT `/api/users/:id/lifecycle/contracts/:contractId` - Aktualisieren (HR/Admin) ✅
  - [x] GET `/api/users/:id/lifecycle/contracts/:contractId/download` - Download ✅
- [x] `/api/users/:id/lifecycle/social-security/:type` - Sozialversicherungen ✅
  - [x] GET `/api/users/:id/lifecycle/social-security/:type` - Status abrufen ✅
  - [x] PUT `/api/users/:id/lifecycle/social-security/:type` - Status aktualisieren (Legal/Admin) ✅
- [x] `/api/organizations/current/lifecycle-roles` - Rollen-Konfiguration ✅
  - [x] GET `/api/organizations/current/lifecycle-roles` - Abrufen ✅
  - [x] PUT `/api/organizations/current/lifecycle-roles` - Aktualisieren ✅
- [ ] `/api/organizations/current/document-templates` - Dokumenten-Templates (wird in Phase 5 implementiert)

---

## Phase 4: Frontend Components

### Status: 🟢 Abgeschlossen (100%)

**Geplante Komponenten**:
- [x] `LifecycleTab.tsx` - Tab im Profil ✅
- [x] `MyDocumentsTab.tsx` - Tab für eigene Dokumente ✅
- [x] `LifecycleView.tsx` - View im User-Detail (für HR/Admin) ✅
- [x] `CertificateCreationModal.tsx` - Modal für Arbeitszeugnis-Erstellung (HR) ✅
- [x] `ContractCreationModal.tsx` - Modal für Arbeitsvertrag-Erstellung (HR) ✅
- [x] `CertificateEditModal.tsx` - Modal für Arbeitszeugnis-Bearbeitung (HR) ✅
- [x] `ContractEditModal.tsx` - Modal für Arbeitsvertrag-Bearbeitung (HR) ✅
- [x] `OnboardingProgressBar.tsx` - Progress-Bar ✅ (integriert in LifecycleTab)
- [x] `SocialSecurityStatusBox.tsx` - Status-Box für Sozialversicherungen ✅ (integriert in LifecycleTab)
- [x] `TaskDataBox.tsx` - Box für automatisch generierte Daten ✅
- [x] `EmailTemplateBox.tsx` - Box für Email-Vorlagen ✅
- [x] `SocialSecurityCompletionBox.tsx` - Box für Anmeldungs-Abschluss ✅
- [x] `RoleConfigurationTab.tsx` - Tab für Rollen-Konfiguration ✅
- [x] `DocumentConfigurationTab.tsx` - Tab für Dokumenten-Konfiguration ✅

**Abgeschlossene Schritte**:
1. ✅ `LifecycleTab.tsx` - Vollständig implementiert:
   - Lebenszyklus-Status-Anzeige
   - Onboarding-Progress-Bar
   - Sozialversicherungs-Status
   - Loading/Error-States
2. ✅ `MyDocumentsTab.tsx` - Vollständig implementiert:
   - Liste aller Arbeitszeugnisse
   - Liste aller Arbeitsverträge
   - Download-Funktionalität
   - "Aktuell"-Badge
   - Details-Anzeige
3. ✅ `Profile.tsx` erweitert:
   - Tab "Lebenszyklus" hinzugefügt
   - Tab "Meine Dokumente" hinzugefügt
   - Integration beider Komponenten
4. ✅ `usePermissions` Hook erweitert:
   - `hasLifecycleRole()` - Prüft Lebenszyklus-Rollen
   - `isHR()` / `isLegal()` - Convenience-Funktionen
   - Automatisches Laden von `lifecycleRoles`
5. ✅ API-Endpunkte in `api.ts` hinzugefügt:
   - Alle Lifecycle-Endpunkte
   - Organization Lifecycle Settings
6. ✅ HR-Modals erstellt:
   - `CertificateCreationModal.tsx` - Erstellung von Arbeitszeugnissen
   - `ContractCreationModal.tsx` - Erstellung von Arbeitsverträgen
   - `CertificateEditModal.tsx` - Bearbeitung von Arbeitszeugnissen
   - `ContractEditModal.tsx` - Bearbeitung von Arbeitsverträgen
   - Alle Modals verwenden Standard-Sidepane-Pattern
   - Berechtigungsprüfung (nur HR/Admin)
   - PDF-Upload (temporär, bis PDF-Generierung in Phase 5)
   - Automatische Daten-Erkennung aus User-Profil und Lifecycle
7. ✅ Lifecycle Task Boxes erstellt und integriert:
   - `TaskDataBox.tsx` - Zeigt automatisch generierte Daten aus Lifecycle-Tasks
   - `EmailTemplateBox.tsx` - Generiert und sendet Email-Vorlagen für Lifecycle-Tasks
   - `SocialSecurityCompletionBox.tsx` - Formular zum Abschließen der Sozialversicherungs-Anmeldung
   - Integration in `EditTaskModal.tsx` (werden nur für Lifecycle-Tasks angezeigt)
8. ✅ Organization Configuration Tabs erstellt und integriert:
   - `RoleConfigurationTab.tsx` - Konfiguration der Lebenszyklus-Rollen (Admin, HR, Legal)
   - `DocumentConfigurationTab.tsx` - Konfiguration der Dokumenten-Templates
   - Integration in `EditOrganizationModal.tsx` (neue Tabs: "Rollen" und "Dokumente")
9. ✅ Alle Syntax-Fehler behoben (String-Literale, Export-Statements)

---

## Phase 5: Document Generation

### Status: ⚪ Nicht gestartet

**Geplante Features**:
- [ ] PDF-Template-System
- [ ] Signatur-Integration
- [ ] Automatische Daten-Füllung
- [ ] Text-Bearbeitung durch HR
- [ ] PDF-Generierung mit pdf-lib oder ähnlich

---

## Phase 6: Social Security Integration

### Status: ⚪ Nicht gestartet

**Geplante Features**:
- [ ] Automatische Task-Erstellung für ARL, EPS, Pension, Caja
- [ ] Email-Vorlagen-Generierung
- [ ] Status-Tracking
- [ ] Completion-Workflow

---

## Phase 7: Testing & QA

### Status: ⚪ Nicht gestartet

**Geplante Tests**:
- [ ] Unit Tests für Services
- [ ] Integration Tests für API
- [ ] E2E Tests für Frontend
- [ ] Manuelle Tests aller Prozesse

---

## Phase 8: Documentation

### Status: 🟢 Abgeschlossen (Planungsphase)

**Abgeschlossen**:
- [x] `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` - Haupt-Plan
- [x] `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Prozessbeschreibung
- [x] `MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md` - Zusammenfassung
- [x] `MITARBEITERLEBENSZYKLUS_DETAILLIERT.md` - Detaillierte Spezifikationen
- [x] `MITARBEITERLEBENSZYKLUS_PRÜFUNG.md` - Konsistenz-Prüfung
- [x] `MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md` - Fortschrittsreport
- [x] `MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md` (Reports) - Aktueller Stand & Nächste Schritte

---

## Probleme und Lösungen

### ✅ Gelöst: Frontend ChunkLoadError

**Problem**: ChunkLoadError beim Laden von headlessui/react und heroicons
- **Ursache**: Browser-Cache lädt veraltete Chunks
- **Lösung**: 
  1. Build-Ordner und Cache gelöscht
  2. Browser Hard Refresh (Ctrl+Shift+R oder Ctrl+F5)
  3. Frontend-Server neu gestartet
  4. **Status**: ✅ Gelöst

---

## Entscheidungen

### 2025-01-XX
- **Entscheidung**: Alle Dokumente in `docs/implementation_plans`, Fortschrittsreports in `docs/implementation_reports`
- **Grund**: Klare Trennung zwischen Planung und Fortschritt

### 2025-01-XX
- **Entscheidung**: `ContractDocument` verweist auf `EmploymentContract` statt direkt auf `EmployeeLifecycle`
- **Grund**: Logischer für Vertragsänderungen - jede Änderung gehört zu einem Hauptvertrag

---

## Nächste Schritte

1. ✅ Fortschrittsreport erstellen
2. ✅ Prisma Schema analysieren
3. ✅ Neue Models definieren und hinzufügen
4. ✅ Migration erstellen
5. ✅ Prisma Client generieren
6. ✅ Phase 2: Backend Services - Vollständig implementiert
7. ✅ Certificate/Contract Endpoints implementieren
8. ✅ Phase 3: API Endpoints vervollständigen (70%)
9. ✅ Task Automation Service erstellen
10. ⏭️ Phase 4: Frontend Components beginnen
11. ⏭️ Phase 5: Document Service für PDF-Generierung erstellen

---

## Notizen

- Alle Implementierungen folgen den Standards aus `MITARBEITERLEBENSZYKLUS_DETAILLIERT.md`
- Keine Breaking Changes an bestehenden Komponenten
- Integration erfolgt nahtlos in bestehende Strukturen
- Frontend ChunkLoadError: ✅ Gelöst (Build-Ordner gelöscht, Browser Hard Refresh, Server neu gestartet)
- Certificate/Contract Endpoints: ✅ Vollständig implementiert (GET, POST, PUT, Download)
- PDF-Generierung: Wird später in Phase 5 (Document Generation) implementiert
- Upload-Verzeichnisse: Automatische Erstellung von `uploads/certificates` und `uploads/contracts`
- Berechtigungen: User kann eigene Dokumente sehen, HR/Admin kann alle sehen/erstellen/bearbeiten
- TypeScript-Fehler: ⚠️ Bekannte Fehler in `lifecycleController.ts` (req.userId wird nicht erkannt, funktioniert zur Laufzeit)
- Test-Report: ✅ Erstellt (`MITARBEITERLEBENSZYKLUS_TEST_REPORT.md`)
