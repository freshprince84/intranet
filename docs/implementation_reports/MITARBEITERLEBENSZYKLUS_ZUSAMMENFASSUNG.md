# MITARBEITERLEBENSZYKLUS - Aktueller Stand & Nächste Schritte

**Letzte Aktualisierung**: 2025-01-XX  
**Test-Report**: Siehe [MITARBEITERLEBENSZYKLUS_TEST_REPORT.md](./MITARBEITERLEBENSZYKLUS_TEST_REPORT.md)

## ✅ Was wurde bereits gemacht?

### Phase 1: Data Model - **ABGESCHLOSSEN** ✅

1. **Prisma Schema erweitert** (`backend/prisma/schema.prisma`):
   - ✅ 6 neue Models hinzugefügt:
     - `EmployeeLifecycle` - Haupt-Model für Lebenszyklus-Status
     - `LifecycleEvent` - Events im Lebenszyklus
     - `EmploymentCertificate` - Arbeitszeugnisse
     - `EmploymentContract` - Arbeitsverträge
     - `ContractDocument` - Vertragsänderungen
     - `SocialSecurityRegistration` - Sozialversicherungs-Anmeldungen
   - ✅ 2 neue Enums hinzugefügt:
     - `EmployeeStatus` (onboarding, active, contract_change, offboarding, archived)
     - `SocialSecurityStatus` (not_required, pending, registered, failed, deregistered)
   - ✅ Relations zu `User` und `Organization` hinzugefügt

2. **Migration erstellt**:
   - ✅ Migration `20250101000000_add_employee_lifecycle_models` manuell erstellt
   - ✅ Migration als angewendet markiert
   - ✅ Status: "Database schema is up to date!"

3. **Prisma Client generiert**:
   - ✅ `npx prisma generate` erfolgreich ausgeführt
   - ✅ Alle neuen Models verfügbar

### Phase 2: Backend Services - **80% ABGESCHLOSSEN** 🟡

1. **lifecycleService.ts** - ✅ Vollständig implementiert:
   - ✅ `getLifecycle()` - Lebenszyklus-Status abrufen
   - ✅ `createLifecycle()` - Neuen Lebenszyklus erstellen
   - ✅ `updateStatus()` - Status aktualisieren
   - ✅ `calculateProgress()` - Onboarding-Progress berechnen
   - ✅ `getSocialSecurityStatus()` - Sozialversicherungs-Status abrufen
   - ✅ `updateSocialSecurityStatus()` - Sozialversicherungs-Status aktualisieren
   - ✅ `getCertificates()` - Alle Arbeitszeugnisse abrufen
   - ✅ `getCertificate()` - Einzelnes Arbeitszeugnis abrufen
   - ✅ `createCertificate()` - Neues Arbeitszeugnis erstellen
   - ✅ `updateCertificate()` - Arbeitszeugnis aktualisieren
   - ✅ `getContracts()` - Alle Arbeitsverträge abrufen
   - ✅ `getContract()` - Einzelnen Arbeitsvertrag abrufen
   - ✅ `createContract()` - Neuen Arbeitsvertrag erstellen
   - ✅ `updateContract()` - Arbeitsvertrag aktualisieren

2. **lifecycleRoles.ts** - ✅ Vollständig implementiert:
   - ✅ `hasLifecycleRole()` - Prüft ob User eine Lebenszyklus-Rolle hat
   - ✅ `isHROrAdmin()` - Prüft ob User HR oder Admin ist
   - ✅ `isLegalOrAdmin()` - Prüft ob User Legal oder Admin ist

3. **lifecycleController.ts** - ✅ Vollständig implementiert:
   - ✅ Basis-Endpoints (getLifecycle, updateStatus, getSocialSecurity, updateSocialSecurity)
   - ✅ Certificate-Endpoints (getCertificates, getCertificate, createCertificate, updateCertificate, downloadCertificate)
   - ✅ Contract-Endpoints (getContracts, getContract, createContract, updateContract, downloadContract)

4. **Routes** - ✅ Vollständig implementiert:
   - ✅ Routes in `users.ts` hinzugefügt
   - ✅ Routes in `organizations.ts` hinzugefügt (lifecycle-roles)

5. **Automatische Lebenszyklus-Erstellung**:
   - ✅ In `userController.ts` (createUser) integriert

### Phase 3: API Endpoints - **70% ABGESCHLOSSEN** 🟡

1. **Lebenszyklus-Endpoints** - ✅ Vollständig:
   - ✅ GET `/api/users/:id/lifecycle`
   - ✅ PUT `/api/users/:id/lifecycle/status`

2. **Certificate-Endpoints** - ✅ Vollständig:
   - ✅ GET `/api/users/:id/lifecycle/certificates`
   - ✅ GET `/api/users/:id/lifecycle/certificates/:certId`
   - ✅ POST `/api/users/:id/lifecycle/certificates` (HR/Admin)
   - ✅ PUT `/api/users/:id/lifecycle/certificates/:certId` (HR/Admin)
   - ✅ GET `/api/users/:id/lifecycle/certificates/:certId/download`

3. **Contract-Endpoints** - ✅ Vollständig:
   - ✅ GET `/api/users/:id/lifecycle/contracts`
   - ✅ GET `/api/users/:id/lifecycle/contracts/:contractId`
   - ✅ POST `/api/users/:id/lifecycle/contracts` (HR/Admin)
   - ✅ PUT `/api/users/:id/lifecycle/contracts/:contractId` (HR/Admin)
   - ✅ GET `/api/users/:id/lifecycle/contracts/:contractId/download`

4. **Social Security-Endpoints** - ✅ Vollständig:
   - ✅ GET `/api/users/:id/lifecycle/social-security/:type`
   - ✅ PUT `/api/users/:id/lifecycle/social-security/:type` (Legal/Admin)

5. **Organization-Endpoints** - ✅ Vollständig:
   - ✅ GET `/api/organizations/current/lifecycle-roles`
   - ✅ PUT `/api/organizations/current/lifecycle-roles`

---

## ⚠️ Offene Punkte

1. **Document Service**:
   - ⚠️ PDF-Generierung für Certificates/Contracts noch nicht implementiert
   - **Status**: Wird in Phase 5 (Document Generation) implementiert
   - **Aktuell**: `pdfPath` wird erwartet (temporär)

2. **Task Automation Service**:
   - ⚠️ Automatische Task-Erstellung bei Events noch nicht implementiert
   - **Status**: Wird in Phase 6 (Social Security Integration) implementiert

---

## 🎯 Nächste Schritte - Phase 4: Frontend Components

### 1. Task Automation Service erstellen

**Geplante Services** (in `backend/src/services/`):

#### 2.1. `lifecycleService.ts` - Haupt-Service
**Zweck**: Zentrale Logik für Lebenszyklus-Verwaltung

**Funktionen**:
- `getLifecycle(userId)` - Lebenszyklus-Status abrufen
- `updateStatus(userId, status, data)` - Status aktualisieren
- `createLifecycle(userId, organizationId)` - Neuen Lebenszyklus erstellen (bei User-Hinzufügung)
- `getProgress(userId)` - Onboarding-Progress berechnen
- `triggerEvent(userId, eventType, eventData)` - Event erstellen

#### 2.2. `documentService.ts` - Dokumenten-Service
**Zweck**: PDF-Generierung für Arbeitszeugnisse und Arbeitsverträge

**Funktionen**:
- `generateCertificate(userId, data, template)` - Arbeitszeugnis generieren
- `generateContract(userId, data, template)` - Arbeitsvertrag generieren
- `getCertificates(userId)` - Alle Arbeitszeugnisse abrufen
- `getContracts(userId)` - Alle Arbeitsverträge abrufen
- `updateCertificate(certificateId, data)` - Arbeitszeugnis aktualisieren
- `updateContract(contractId, data)` - Arbeitsvertrag aktualisieren

**Abhängigkeiten**:
- PDF-Library (z.B. `pdf-lib` oder `pdfkit`)
- Template-System (PDF-Templates aus `Organization.settings`)

#### 2.3. `socialSecurityService.ts` - Sozialversicherungs-Service
**Zweck**: Verwaltung der Sozialversicherungs-Anmeldungen

**Funktionen**:
- `getSocialSecurityStatus(userId, type)` - Status abrufen
- `updateSocialSecurityStatus(userId, type, data)` - Status aktualisieren
- `completeRegistration(userId, type, registrationData)` - Anmeldung abschließen
- `generateEmailTemplate(userId, type)` - Email-Vorlage generieren

#### 2.4. `taskAutomationService.ts` - Task-Automatisierung
**Zweck**: Automatische Task-Erstellung bei Lebenszyklus-Events

**Funktionen**:
- `createOnboardingTasks(userId, organizationId)` - Onboarding-Tasks erstellen
- `createOffboardingTasks(userId, organizationId)` - Offboarding-Tasks erstellen
- `getLifecycleRoles(organizationId)` - Rollen-Konfiguration abrufen

**Integration**:
- Nutzt bestehendes Task-System
- Erstellt Tasks für konfigurierte Rollen (aus `Organization.settings.lifecycleRoles`)

---

## 📋 Detaillierte Nächste Schritte

### Schritt 1: Prisma Client generieren
```bash
cd backend
npx prisma generate
```

### Schritt 2: Helper-Funktionen für Rollen-Checks erstellen
**Datei**: `backend/src/utils/lifecycleRoles.ts` (NEU)

**Funktionen**:
- `hasLifecycleRole(req, roleType)` - Prüft ob User eine Lebenszyklus-Rolle hat
- `isHROrAdmin(req)` - Prüft ob User HR oder Admin ist
- `isLegalOrAdmin(req)` - Prüft ob User Legal oder Admin ist
- `checkDefaultRoles(role, roleType)` - Fallback für Standard-Rollen

**Integration**: Nutzt `req.organizationId` und `req.userRole` aus `organizationMiddleware`

### Schritt 3: lifecycleService.ts erstellen
**Datei**: `backend/src/services/lifecycleService.ts` (NEU)

**Grundfunktionen implementieren**:
- `getLifecycle(userId)` - Mit Prisma Client
- `createLifecycle(userId, organizationId)` - Automatisch bei User-Hinzufügung
- `updateStatus(userId, status, data)` - Status aktualisieren

### Schritt 4: API Controller erstellen
**Datei**: `backend/src/controllers/lifecycleController.ts` (NEU)

**Endpoints**:
- `getLifecycle(req, res)` - GET `/api/users/:id/lifecycle`
- `updateStatus(req, res)` - PUT `/api/users/:id/lifecycle/status`
- `getSocialSecurity(req, res)` - GET `/api/users/:id/lifecycle/social-security/:type`
- `updateSocialSecurity(req, res)` - PUT `/api/users/:id/lifecycle/social-security/:type`

### Schritt 5: Routes hinzufügen
**Datei**: `backend/src/routes/users.ts` (erweitern)

**Neue Routen**:
```typescript
router.get('/:id/lifecycle', organizationMiddleware, lifecycleController.getLifecycle);
router.put('/:id/lifecycle/status', organizationMiddleware, lifecycleController.updateStatus);
router.get('/:id/lifecycle/social-security/:type', organizationMiddleware, lifecycleController.getSocialSecurity);
router.put('/:id/lifecycle/social-security/:type', organizationMiddleware, lifecycleController.updateSocialSecurity);
```

### Schritt 6: Automatische Lebenszyklus-Erstellung
**Datei**: `backend/src/routes/users.ts` oder `backend/src/services/userService.ts` (erweitern)

**Integration**: Beim User-Hinzufügung automatisch `EmployeeLifecycle` erstellen, wenn:
- Organisation hat Land "CO" (Kolumbien)
- User hat noch keinen Lebenszyklus

---

## 🔄 Reihenfolge der Implementierung

1. ✅ **Phase 1: Data Model** - ABGESCHLOSSEN
2. 🟡 **Phase 2: Backend Services** - 80% ABGESCHLOSSEN
   - ✅ Prisma Client generiert
   - ✅ Helper-Funktionen für Rollen-Checks
   - ✅ lifecycleService.ts
   - ✅ lifecycleController.ts
   - ✅ Routes hinzugefügt
   - ✅ Automatische Lebenszyklus-Erstellung
   - ⏭️ Task Automation Service (noch offen)
3. 🟡 **Phase 3: API Endpoints** - 70% ABGESCHLOSSEN
   - ✅ Alle Basis-Endpoints
   - ✅ Certificate/Contract-Endpoints
   - ✅ Social Security-Endpoints
   - ✅ Organization-Endpoints
   - ⏭️ Document-Templates-Endpoints (Phase 5)
4. ⏭️ **Phase 4: Frontend Components** - NÄCHSTER SCHRITT
5. ⏭️ **Phase 5: Document Generation** - Nach Phase 4
6. ⏭️ **Phase 6: Social Security Integration** - Nach Phase 5

---

## 📝 Wichtige Hinweise

1. **Prisma Client**: Muss generiert werden, bevor Backend-Services verwendet werden können
2. **Rollen-Checks**: Nutzen `organizationMiddleware` (bereits vorhanden)
3. **Integration**: Alle neuen Services integrieren sich nahtlos in bestehende Strukturen
4. **Keine Breaking Changes**: Bestehende Funktionalitäten bleiben unverändert

---

## ✅ Checkliste für nächste Session

- [x] Prisma Client generieren (`npx prisma generate`)
- [x] Helper-Funktionen für Rollen-Checks erstellen
- [x] lifecycleService.ts erstellen
- [x] lifecycleController.ts erstellen
- [x] Routes in users.ts hinzufügen
- [x] Automatische Lebenszyklus-Erstellung implementieren
- [x] Certificate/Contract Endpoints implementieren
- [x] Fortschrittsreport aktualisieren
- [ ] Task Automation Service erstellen
- [ ] Frontend Components beginnen (Phase 4)

