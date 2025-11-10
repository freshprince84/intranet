# MITARBEITERLEBENSZYKLUS - Fortschritts-Tracking

## Übersicht

Dieses Dokument dient zur Verfolgung des Fortschritts bei der Implementierung des Mitarbeiterlebenszyklus-Systems.

**Hauptplan**: [MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md](./MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md)

**Startdatum**: 2025-01-XX
**Aktueller Status**: Implementierung in Phase 4
**Aktuelle Phase**: Phase 4 - Frontend Components (teilweise abgeschlossen)

---

## Phasen-Status

| Phase | Status | Startdatum | Enddatum | Notizen |
|-------|--------|------------|----------|---------|
| Phase 1: Datenmodell | ✅ Abgeschlossen | 2025-01-XX | 2025-01-XX | Prisma Schema, Migration, Models erstellt |
| Phase 2: Backend Services | ✅ Abgeschlossen | 2025-01-XX | 2025-01-XX | lifecycleService, taskAutomationService, Controller, Routes |
| Phase 3: API Endpoints | ✅ Abgeschlossen | 2025-01-XX | 2025-01-XX | Certificate/Contract Endpoints, Download, Organization Settings |
| Phase 4: Frontend Components | 🟡 In Arbeit | 2025-01-XX | - | Basis-Komponenten erstellt, PDF-Vorschau, Auto-Fill, Validierung, Signatur-Positionierung implementiert (~98%) |
| Phase 5: PDF-Generierung | 🟡 In Arbeit | 2025-01-XX | - | documentService.ts vorhanden, Template- & Signatur-System implementiert, Template-Variablen vollständig (~95%) |
| Phase 6: Sozialversicherungen UI | ✅ Abgeschlossen | 2025-01-XX | 2025-01-XX | SocialSecurityEditor vollständig implementiert, Legal-Rolle integriert |
| Phase 7: Offboarding | ⏳ Geplant | - | - | Offboarding-Prozess |
| Phase 8: Dokumentation | 🟡 In Arbeit | 2025-01-XX | - | Fortlaufend |

**Legende**:
- ⏳ Geplant
- 🔄 In Arbeit
- 🟡 Teilweise abgeschlossen
- ✅ Abgeschlossen
- ⚠️ Blockiert
- ❌ Abgebrochen

---

## Phase 1: Datenmodell ✅ Abgeschlossen

### Abgeschlossene Schritte:
1. ✅ Prisma Schema erweitert:
   - `EmployeeLifecycle` Model
   - `LifecycleEvent` Model
   - `EmploymentCertificate` Model
   - `EmploymentContract` Model
   - `ContractDocument` Model
   - `SocialSecurityRegistration` Model
   - Enums: `EmployeeStatus`, `SocialSecurityStatus`
2. ✅ Migration erstellt und angewendet
3. ✅ Relations zu `User` und `Organization` hinzugefügt
4. ✅ Indizes für Performance hinzugefügt

---

## Phase 2: Backend Services ✅ Abgeschlossen

### Abgeschlossene Schritte:
1. ✅ `lifecycleService.ts` - Vollständig implementiert:
   - `getLifecycle(userId)` - Lebenszyklus-Daten abrufen
   - `createLifecycle(userId, organizationId)` - Lebenszyklus erstellen
   - `updateStatus(userId, status)` - Status aktualisieren
   - `getSocialSecurity(userId, type)` - Sozialversicherung abrufen
   - `updateSocialSecurity(userId, type, data)` - Sozialversicherung aktualisieren
   - `getCertificates(userId)` - Arbeitszeugnisse abrufen
   - `createCertificate(...)` - Arbeitszeugnis erstellen
   - `updateCertificate(...)` - Arbeitszeugnis aktualisieren
   - `getContracts(userId)` - Arbeitsverträge abrufen
   - `createContract(...)` - Arbeitsvertrag erstellen
   - `updateContract(...)` - Arbeitsvertrag aktualisieren
2. ✅ `taskAutomationService.ts` - Vollständig implementiert:
   - `createOnboardingTasks(userId, organizationId)` - Automatische Tasks für ARL, EPS, Pension, Caja
   - `createOffboardingTasks(userId, organizationId)` - Automatische Tasks für Offboarding
   - `createSocialSecurityTask(...)` - Einzelner Task für Sozialversicherung
   - Integration mit `Organization.settings.lifecycleRoles`
   - Automatische Benachrichtigungen
   - Lifecycle-Events werden geloggt
3. ✅ `lifecycleController.ts` - Vollständig implementiert:
   - GET `/users/:id/lifecycle` - Lebenszyklus-Daten
   - PUT `/users/:id/lifecycle/status` - Status aktualisieren
   - GET `/users/:id/lifecycle/social-security/:type` - Sozialversicherung abrufen
   - PUT `/users/:id/lifecycle/social-security/:type` - Sozialversicherung aktualisieren
   - GET `/users/:id/lifecycle/certificates` - Arbeitszeugnisse abrufen
   - GET `/users/:id/lifecycle/certificates/:certId` - Einzelnes Arbeitszeugnis
   - POST `/users/:id/lifecycle/certificates` - Arbeitszeugnis erstellen
   - PUT `/users/:id/lifecycle/certificates/:certId` - Arbeitszeugnis aktualisieren
   - GET `/users/:id/lifecycle/certificates/:certId/download` - PDF herunterladen
   - GET `/users/:id/lifecycle/contracts` - Arbeitsverträge abrufen
   - GET `/users/:id/lifecycle/contracts/:contractId` - Einzelner Arbeitsvertrag
   - POST `/users/:id/lifecycle/contracts` - Arbeitsvertrag erstellen
   - PUT `/users/:id/lifecycle/contracts/:contractId` - Arbeitsvertrag aktualisieren
   - GET `/users/:id/lifecycle/contracts/:contractId/download` - PDF herunterladen
4. ✅ `organizationController.ts` - Erweitert:
   - GET `/organizations/current/lifecycle-roles` - Rollen-Konfiguration abrufen
   - PUT `/organizations/current/lifecycle-roles` - Rollen-Konfiguration aktualisieren
5. ✅ `lifecycleRoles.ts` - Helper-Funktionen:
   - `hasLifecycleRole(req, roleType)` - Rollen-Prüfung
   - `isHROrAdmin(req)` - HR/Admin-Prüfung
   - `isLegalOrAdmin(req)` - Legal/Admin-Prüfung
   - Integration mit `organizationMiddleware`

---

## Phase 3: API Endpoints ✅ Abgeschlossen

### Abgeschlossene Schritte:
1. ✅ Routes in `backend/src/routes/users.ts` hinzugefügt
2. ✅ Routes in `backend/src/routes/organizations.ts` hinzugefügt
3. ✅ API-Endpunkte in `frontend/src/config/api.ts` definiert
4. ✅ Middleware-Integration (`authMiddleware`, `organizationMiddleware`)
5. ✅ Permission-Checks implementiert

---

## Phase 4: Frontend Components 🟡 In Arbeit

### Abgeschlossene Schritte:
1. ✅ `usePermissions` Hook erweitert:
   - `hasLifecycleRole(roleType)` - Rollen-Prüfung
   - `isHR()` - HR-Prüfung
   - `isLegal()` - Legal-Prüfung
   - `loadLifecycleRoles()` - Rollen-Konfiguration laden
2. ✅ `LifecycleTab.tsx` - Für User-Profil erstellt:
   - Onboarding-Status anzeigen
   - Sozialversicherungen-Status anzeigen
   - Progress-Bar für Onboarding
3. ✅ `MyDocumentsTab.tsx` - Für User-Profil erstellt:
   - Arbeitszeugnisse anzeigen und herunterladen
   - Arbeitsverträge anzeigen und herunterladen
   - "Aktuell"-Badge für neueste Versionen
4. ✅ `Profile.tsx` erweitert:
   - Tab "Lebenszyklus" hinzugefügt
   - Tab "Meine Dokumente" hinzugefügt
5. ✅ HR-Modals erstellt:
   - `CertificateCreationModal.tsx` - Arbeitszeugnis erstellen
   - `ContractCreationModal.tsx` - Arbeitsvertrag erstellen
   - `CertificateEditModal.tsx` - Arbeitszeugnis bearbeiten
   - `ContractEditModal.tsx` - Arbeitsvertrag bearbeiten
   - Alle verwenden Standard-Sidepane-Pattern
   - Tabs für "Daten" und "PDF hochladen"
6. ✅ `LifecycleView.tsx` - Für User-Management erstellt:
   - Lebenszyklus-Status anzeigen
   - Arbeitszeugnisse anzeigen/bearbeiten/herunterladen
   - Arbeitsverträge anzeigen/bearbeiten/herunterladen
   - Sozialversicherungen-Status anzeigen
   - Integration mit HR-Modals
7. ✅ `UserManagementTab.tsx` erweitert:
   - Tab "Lebenszyklus" hinzugefügt
   - `LifecycleView` integriert

### Abgeschlossene Schritte (neu):
7. ✅ Template-Auswahl in Modals implementiert:
   - `CertificateCreationModal.tsx` - Template-Auswahl mit Checkbox
   - `ContractCreationModal.tsx` - Template-Auswahl mit Checkbox
   - Automatische Aktivierung wenn Templates vorhanden
   - Wechsel zwischen Template und PDF-Upload möglich
8. ✅ `DocumentConfigurationTab.tsx` vollständig implementiert:
   - Template-Upload mit Typ-Auswahl (Arbeitszeugnis/Arbeitsvertrag)
   - Template-Liste mit Versionen
   - Template-Löschen
   - Signatur-Upload mit Name, Position, Datei
   - Signatur-Liste und -Löschen

### Abgeschlossene Schritte (neu):
9. ✅ PDF-Vorschau in Modals implementiert:
   - `CertificateCreationModal.tsx` - PDF-Vorschau vorhanden
   - `ContractCreationModal.tsx` - PDF-Vorschau vorhanden
   - `CertificateEditModal.tsx` - PDF-Vorschau implementiert
   - `ContractEditModal.tsx` - PDF-Vorschau implementiert
10. ✅ Automatische Daten-Vorausfüllung implementiert:
   - `CertificateCreationModal.tsx` - Lädt User-Daten beim Öffnen
   - `ContractCreationModal.tsx` - Lädt User- und Lifecycle-Daten beim Öffnen
   - Automatisches Setzen von Datum, Gehalt, Position, etc.
11. ✅ Validierung verbessert:
   - Inline-Validierung mit visuellen Fehleranzeigen
   - Spezifische Fehlermeldungen für alle Felder
   - ARIA-Attribute für Barrierefreiheit
   - Echtzeit-Validierung beim Eingeben
12. ✅ Sozialversicherungen UI für Legal-Rolle:
   - `SocialSecurityEditor.tsx` - Vollständig implementiert
   - Integration in `LifecycleView.tsx`
   - Status-Updates mit Notizen
   - Inline-Bearbeitung für alle 4 Sozialversicherungen

### Offene Schritte:
- [ ] Text-Bearbeitung in Modals (wenn Template-Editor verfügbar) - **Priorität: Niedrig**

---

## Phase 5: PDF-Generierung 🟡 In Arbeit (~60%)

### Abgeschlossene Schritte:
1. ✅ `documentService.ts` erstellt:
   - `generateCertificate()` - Generiert Arbeitszeugnis-PDF
   - `generateContract()` - Generiert Arbeitsvertrag-PDF
   - PDFKit-Integration vorhanden
   - Automatische Verzeichniserstellung
2. ✅ Integration in `lifecycleService.ts`:
   - `createCertificate()` generiert automatisch PDF, falls `pdfPath` nicht angegeben
   - `createContract()` generiert automatisch PDF, falls `pdfPath` nicht angegeben
   - Rückwärtskompatibel: Manuell hochgeladene PDFs werden unterstützt

### Abgeschlossene Schritte (neu):
3. ✅ Template-Upload-System implementiert:
   - Backend-Endpoints: `GET/POST /api/organizations/current/document-templates`
   - Multer-Konfiguration für PDF-Uploads (10MB Limit)
   - Templates werden in `Organization.settings.documentTemplates` gespeichert
   - Versionierung automatisch (1.0, 1.1, 2.0, etc.)
4. ✅ Signatur-Upload-System implementiert:
   - Backend-Endpoints: `GET/POST /api/organizations/current/document-signatures`
   - Multer-Konfiguration für Bild-/PDF-Uploads (5MB Limit)
   - Signaturen werden in `Organization.settings.documentSignatures` gespeichert
   - Unterstützt: Name, Position, Position (x, y, page)
5. ✅ Signatur-Integration in PDF-Generierung:
   - Automatisches Laden von Signaturen aus Organization-Settings
   - Einfügen von Signatur-Bildern in PDFs (Arbeitszeugnis & Arbeitsvertrag)
   - Fallback auf Text-Unterschrift wenn keine Signatur vorhanden
   - Fehlerbehandlung mit Fallback

### Abgeschlossene Schritte (neu):
6. ✅ Template-Variablen-System (Grundstruktur):
   - `loadTemplatePDF()` - Lädt Template-PDFs aus Organization-Settings
   - `fillTemplatePDF()` - Grundstruktur vorhanden (PDF-Lib integriert)
   - Template-Erkennung in `generateCertificate()` und `generateContract()`
   - Fallback auf Standard-Generierung wenn Template nicht vorhanden
   - **Hinweis**: Text-Einfügung in Template-PDFs noch nicht vollständig (benötigt Positionen-Definition)

### Abgeschlossene Schritte (neu):
7. ✅ Template-Variablen-System vollständig implementiert:
   - `getDefaultFieldPositions()` - Standard-Positionen für alle Felder
   - `drawTextAtPosition()` - Text-Einfügung an Positionen
   - Positionen aus Settings oder Standard-Positionen als Fallback
   - Unterstützung für Certificate und Contract
   - Automatische Skalierung für verschiedene Seitengrößen
8. ✅ Erweiterte Signatur-Positionierung implementiert:
   - Eingabefelder für X, Y, Seite in `DocumentConfigurationTab.tsx`
   - Positionen werden beim Upload an Backend gesendet
   - Positionen werden in Signatur-Liste angezeigt
   - Standardwerte: X=400, Y=100, Seite=1

### Offene Schritte:
- [ ] Template-Editor für Text-Bearbeitung
- [ ] Positionen-Konfiguration in Organization.settings (UI für Template-Feld-Positionen)

---

## Phase 6: Sozialversicherungen UI ✅ Abgeschlossen

### Abgeschlossene Schritte:
1. ✅ `SocialSecurityEditor.tsx` - Vollständig implementiert:
   - UI für Legal-Rolle zur Bearbeitung von Sozialversicherungen
   - Status-Updates mit Notizen
   - Inline-Bearbeitung für ARL, EPS, Pension, Caja
   - Visuelle Statusanzeige mit Icons
   - Automatisches Laden beim Öffnen
   - Infinite-Loop-Prävention mit `useRef`
   - Network-Error-Behandlung
2. ✅ Integration in `LifecycleView.tsx`:
   - `SocialSecurityEditor` wird für Legal/Admin angezeigt
   - Automatisches Update nach Änderungen
3. ✅ Backend-Berechtigungen:
   - GET-Endpoint erlaubt Legal-Rolle
   - PUT-Endpoint erlaubt Legal-Rolle (war bereits vorhanden)
4. ✅ Seed-File erweitert:
   - "Derecho"-Rolle wird für beide Organisationen erstellt
   - Berechtigungen für Legal-Rolle konfiguriert

### Offene Schritte:
- [ ] Email-Template-Generierung für Anwalt - **Priorität: Niedrig**
- [ ] Automatische Daten-Generierung für Anmeldungen - **Priorität: Niedrig**

---

## Phase 7: Offboarding ⏳ Geplant

### Geplante Schritte:
- [ ] Offboarding-Prozess-UI
- [ ] Automatische Arbeitszeugnis-Generierung
- [ ] Abrechnungs-Tasks
- [ ] Abmeldung bei Sozialversicherungen

---

## Probleme und Lösungen

### Problem #1: Prisma Migration Drift
**Datum**: 2025-01-XX
**Phase**: Phase 1
**Beschreibung**: Datenbank-Schema war nicht synchron mit Migration-Historie
**Lösung**: Manuelle SQL-Migration erstellt und als "applied" markiert
**Status**: ✅ Gelöst

### Problem #2: Frontend ChunkLoadError
**Datum**: 2025-01-XX
**Phase**: Phase 4
**Beschreibung**: Browser versuchte veraltete JavaScript-Chunks zu laden
**Lösung**: Build-Verzeichnis gelöscht, npm cache geleert, Hard-Refresh durchgeführt
**Status**: ✅ Gelöst

### Problem #3: TypeScript Export-Fehler
**Datum**: 2025-01-XX
**Phase**: Phase 3
**Beschreibung**: `getLifecycleRoles` und `updateLifecycleRoles` nicht exportiert
**Lösung**: `export` Keywords in `organizationController.ts` hinzugefügt
**Status**: ✅ Gelöst

### Problem #4: Prisma Task-Create Type-Error
**Datum**: 2025-01-XX
**Phase**: Phase 2
**Beschreibung**: `organizationId` nicht assignable zu `never` in `TaskCreateInput`
**Lösung**: `as any` Type-Assertion verwendet (wie in `taskController.ts`)
**Status**: ✅ Gelöst

### Problem #5: Import-Pfad-Fehler
**Datum**: 2025-01-XX
**Phase**: Phase 4
**Beschreibung**: `import useMessage from '../hooks/useMessage';` ohne `.ts` Extension
**Lösung**: `.ts` Extension hinzugefügt
**Status**: ✅ Gelöst

### Problem #6: LifecycleView fetchData Initialization Error
**Datum**: 2025-01-XX
**Phase**: Phase 4
**Beschreibung**: `Cannot access 'fetchData' before initialization` - fetchData wurde im useEffect verwendet, bevor es definiert war
**Lösung**: `fetchData` wird jetzt vor dem `useEffect` definiert
**Status**: ✅ Gelöst

### Problem #7: Task branchId Prisma Validation Error
**Datum**: 2025-01-XX
**Phase**: Phase 2
**Beschreibung**: `Argument 'branch' is missing` - Prisma erwartet `branch: { connect: { id: ... } }` statt `branchId`
**Lösung**: Alle Task-Erstellungen in `taskAutomationService.ts` verwenden jetzt `branch: { connect: { id: ... } }`
**Status**: ✅ Gelöst

### Problem #8: HR-Rolle kann nicht gespeichert werden
**Datum**: 2025-01-XX
**Phase**: Phase 3
**Beschreibung**: Fehler "Eine oder mehrere Rollen gehören nicht zu dieser Organisation" beim Speichern der HR-Rolle
**Lösung**: Validierung prüft jetzt, ob Rollen-IDs > 0 sind, bevor sie validiert werden (verhindert, dass 0 oder leere Strings als gültige IDs behandelt werden)
**Status**: ✅ Gelöst

---

## Entscheidungen

### Entscheidung #1: API-Endpunkt-Struktur
**Datum**: 2025-01-XX
**Thema**: Konsistenz mit bestehenden Endpunkten
**Entscheidung**: `/api/users/:id/lifecycle/...` statt `/api/employee-lifecycle/:userId/...`
**Begründung**: Konsistenz mit bestehenden `/api/users/:id` Endpunkten

### Entscheidung #2: Rollen-Konfiguration
**Datum**: 2025-01-XX
**Thema**: Konfigurierbare Rollen für Lebenszyklus-Prozesse
**Entscheidung**: `Organization.settings.lifecycleRoles` statt separater Tabelle
**Begründung**: Flexibilität, einfache Verwaltung, konsistent mit anderen Settings

### Entscheidung #3: PDF-Upload vs. Generierung
**Datum**: 2025-01-XX
**Thema**: Temporäre Lösung für PDF-Handling
**Entscheidung**: Zuerst PDF-Upload, später Template-basierte Generierung
**Begründung**: Schrittweise Implementierung, HR kann sofort arbeiten

### Entscheidung #4: Sidepane-Pattern
**Datum**: 2025-01-XX
**Thema**: Modal-Implementierung für HR-Actions
**Entscheidung**: Standard-Sidepane-Pattern wie `CreateTaskModal.tsx`
**Begründung**: Konsistenz mit bestehenden UI-Patterns

---

## Notizen

### 2025-01-XX - LifecycleView Integration
- `LifecycleView.tsx` erfolgreich in `UserManagementTab.tsx` integriert
- Tab "Lebenszyklus" hinzugefügt
- Alle HR-Modals funktionieren
- Download-Funktionalität implementiert

### 2025-01-XX - HR-Modals erstellt
- Alle 4 Modals (Create/Edit für Certificates/Contracts) erstellt
- Standard-Sidepane-Pattern verwendet
- Temporär: PDF-Upload statt Template-Generierung

### 2025-01-XX - Task Automation
- Automatische Task-Erstellung bei Onboarding-Start implementiert
- Rollen-Konfiguration aus `Organization.settings.lifecycleRoles` verwendet
- Fallback zu Standard-Rollen-Namen

### 2025-01-XX - Template- und Signatur-System
- Template-Upload in OrganizationSettings implementiert
- Template-Auswahl in CertificateCreationModal und ContractCreationModal hinzugefügt
- Signatur-Upload in OrganizationSettings implementiert
- Signatur-Integration in PDF-Generierung (documentService.ts)
- Backend-Endpoints für Template- und Signatur-Verwaltung erstellt

### 2025-01-XX - PDF-Vorschau, Auto-Fill, Validierung
- PDF-Vorschau in allen Modals implementiert (Certificate/Contract Create/Edit)
- Automatische Daten-Vorausfüllung in Create-Modals implementiert
- Validierung mit inline Fehlermeldungen und visuellen Hinweisen
- ARIA-Attribute für Barrierefreiheit hinzugefügt

### 2025-01-XX - Sozialversicherungen UI für Legal-Rolle
- `SocialSecurityEditor.tsx` vollständig implementiert
- Integration in `LifecycleView.tsx`
- Backend-Berechtigungen erweitert (GET-Endpoint für Legal)
- Seed-File erweitert (Derecho-Rolle)
- Infinite-Loop-Prävention und Network-Error-Behandlung implementiert

### 2025-01-XX - Template-Variablen-System vollständig
- `getDefaultFieldPositions()` - Standard-Positionen für alle Felder
- `drawTextAtPosition()` - Text-Einfügung an Positionen
- Positionen aus Settings oder Standard-Positionen als Fallback
- Unterstützung für Certificate und Contract
- Automatische Skalierung für verschiedene Seitengrößen

### 2025-01-XX - Erweiterte Signatur-Positionierung
- Eingabefelder für X, Y, Seite in `DocumentConfigurationTab.tsx`
- Positionen werden beim Upload an Backend gesendet
- Positionen werden in Signatur-Liste angezeigt
- Standardwerte: X=400, Y=100, Seite=1

---

## Metriken

- **Gesamt-Fortschritt**: ~92%
- **Abgeschlossene Phasen**: 4/8 (Phase 1, 2, 3, 6)
- **Teilweise abgeschlossene Phasen**: 2/8 (Phase 4: ~98%, Phase 5: ~95%)
- **Offene Tasks**: ~2
- **Gelöste Probleme**: 8 (inkl. Infinite-Loop, LifecycleView fetchData, Task branchId, HR-Rolle)

**Detaillierter Status**: Siehe [MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md](./MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md)

---

## Nächste Schritte

**Detaillierte nächste Schritte**: Siehe [MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md](./MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md)

### Prioritäten:

1. **🟡 MITTEL - Als nächstes**:
   - Positionen-Konfiguration in Organization.settings (UI für Template-Feld-Positionen)

2. **🟢 NIEDRIG - Später**:
   - Text-Bearbeitung in Modals (Rich-Text-Editor)
   - Email-Template-Generierung für Anwalt
   - Offboarding-Prozess
