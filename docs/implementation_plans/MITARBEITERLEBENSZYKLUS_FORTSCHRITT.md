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
| Phase 4: Frontend Components | 🟡 In Arbeit | 2025-01-XX | - | Basis-Komponenten erstellt, Integration läuft |
| Phase 5: PDF-Generierung | ⏳ Geplant | - | - | Template-basierte PDF-Generierung |
| Phase 6: Sozialversicherungen UI | ⏳ Geplant | - | - | UI für ARL, EPS, Pension, Caja |
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

### Offene Schritte:
- [ ] PDF-Vorschau in Modals (wenn PDF hochgeladen)
- [ ] Template-Auswahl in Modals (wenn Templates verfügbar)
- [ ] Text-Bearbeitung in Modals (wenn Template-Editor verfügbar)
- [ ] Automatische Daten-Vorausfüllung aus User-Profil
- [ ] Validierung und Fehlerbehandlung verbessern

---

## Phase 5: PDF-Generierung ⏳ Geplant

### Geplante Schritte:
- [ ] `documentService.ts` erstellen
- [ ] Template-Engine integrieren (z.B. PDFKit, Puppeteer)
- [ ] Template-Parameter aus User-Daten füllen
- [ ] Signatur-Integration
- [ ] PDF-Generierung in `createCertificate` und `createContract` integrieren

---

## Phase 6: Sozialversicherungen UI ⏳ Geplant

### Geplante Schritte:
- [ ] UI für Legal-Rolle zur Bearbeitung von Sozialversicherungen
- [ ] Email-Template-Generierung für Anwalt
- [ ] Status-Updates mit Notizen
- [ ] Automatische Daten-Generierung für Anmeldungen

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

---

## Metriken

- **Gesamt-Fortschritt**: ~60%
- **Abgeschlossene Phasen**: 3/8 (Phase 1, 2, 3)
- **Teilweise abgeschlossene Phasen**: 1/8 (Phase 4)
- **Offene Tasks**: ~15
- **Gelöste Probleme**: 5

---

## Nächste Schritte

1. **Phase 4 abschließen**:
   - PDF-Vorschau in Modals
   - Template-Auswahl (wenn verfügbar)
   - Automatische Daten-Vorausfüllung
   - Validierung verbessern

2. **Phase 5 starten**:
   - `documentService.ts` erstellen
   - Template-Engine auswählen und integrieren
   - PDF-Generierung implementieren

3. **Phase 6 starten**:
   - UI für Sozialversicherungen
   - Email-Template-Generierung

4. **Testing**:
   - End-to-End Tests für Certificate/Contract Flow
   - Integration Tests für Task Automation
   - UI-Tests für Modals
