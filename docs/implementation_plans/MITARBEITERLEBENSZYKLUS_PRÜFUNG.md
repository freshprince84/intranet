# MITARBEITERLEBENSZYKLUS - Detaillierte Prüfung gegen Standards

## Übersicht

Dieses Dokument enthält die detaillierte Prüfung der Implementierungspläne gegen bestehende Dokumentation, Code-Standards und Design-Standards.

**Prüfdatum**: 2025-01-XX
**Geprüfte Dokumente**:
- `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md`
- `MITARBEITERLEBENSZYKLUS_PROZESS.md`
- `MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md`

---

## 1. PRISMA SCHEMA - KOMPATIBILITÄT

### ✅ Korrekte Struktur
- Models verwenden korrekte Prisma-Syntax
- Relations sind korrekt definiert
- Indexes sind vorhanden
- Enums sind korrekt definiert

### ⚠️ POTENTIELLE PROBLEME

#### Problem 1: Relation-Namen müssen eindeutig sein
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 578, 595, 614

**Problem**:
```prisma
model LifecycleEvent {
  triggeredByUser User? @relation("LifecycleEventTriggerer", ...)
}

model EmploymentCertificate {
  generatedByUser User? @relation("CertificateGenerator", ...)
}

model ContractDocument {
  generatedByUser User? @relation("ContractGenerator", ...)
}
```

**Prüfung**: ✅ **OK** - Relation-Namen sind eindeutig

#### Problem 2: User-Model muss erweitert werden
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 687-691

**Aktuelles User-Model** (aus schema.prisma):
- Hat bereits `identificationDocuments` Relation
- Hat bereits `roles` Relation (UserRole[])

**Erforderliche Erweiterungen**:
```prisma
model User {
  // ... bestehende Felder ...
  
  // NEU - muss hinzugefügt werden:
  lifecycle              EmployeeLifecycle?
  lifecycleEventsTriggered LifecycleEvent[]   @relation("LifecycleEventTriggerer")
  certificatesGenerated  EmploymentCertificate[] @relation("CertificateGenerator")
  contractsGenerated     ContractDocument[]     @relation("ContractGenerator")
}
```

**Status**: ⚠️ **MUSS HINZUGEFÜGT WERDEN** - In Plan dokumentiert, aber Migration muss erstellt werden

#### Problem 3: Organization-Model - settings Feld existiert bereits
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 696-750

**Aktuelles Organization-Model** (aus schema.prisma Zeile 72):
```prisma
model Organization {
  settings Json?
  // ...
}
```

**Status**: ✅ **OK** - `settings` Feld existiert bereits als JSON, kann erweitert werden

**Wichtig**: Die neue Struktur `lifecycleRoles` und `documentTemplates` muss in bestehendes JSON integriert werden, nicht als separates Feld!

---

## 2. API-ENDPOINT-NAMENSKONVENTIONEN

### ✅ Korrekte Konventionen (aus bestehendem Code)

**Bestehende Patterns**:
- `/api/organizations/current` - Aktuelle Organisation
- `/api/organizations/current/language` - Sprache der Organisation
- `/api/users/:id` - User-spezifische Endpoints
- `/api/tasks/:id` - Task-spezifische Endpoints
- `/api/requests/:id` - Request-spezifische Endpoints

### ⚠️ PROBLEME IN PLAN

#### Problem 4: Inkonsistente Endpoint-Struktur
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 1231-1404

**Plan verwendet**:
```
GET /api/employee-lifecycle/:userId/certificates
POST /api/employee-lifecycle/:userId/certificates/generate
GET /api/employee-lifecycle/:userId/contracts
```

**Bestehende Konvention** (aus users.ts, tasks.ts):
```
GET /api/users/:id
GET /api/tasks/:id
GET /api/requests/:id
```

**Problem**: 
- Plan verwendet `/api/employee-lifecycle/:userId/...` 
- Bestehende Konvention wäre `/api/employee-lifecycle/:id/...` oder `/api/users/:id/lifecycle/...`

**Empfehlung**: 
- Option A: `/api/users/:userId/lifecycle/certificates` (konsistent mit bestehender Struktur)
- Option B: `/api/employee-lifecycle/:userId/certificates` (eigener Namespace, aber dann konsistent)

**Status**: ⚠️ **MUSS ANGEPASST WERDEN** - Entscheidung erforderlich

#### Problem 5: Organization-Endpoints - Inkonsistenz
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 1408-1452

**Plan verwendet**:
```
GET /api/organizations/:id/lifecycle-roles
PUT /api/organizations/:id/lifecycle-roles
POST /api/organizations/:id/lifecycle-roles/apply-defaults
```

**Bestehende Konvention** (aus organizations.ts):
```
GET /api/organizations/current
PUT /api/organizations/current
GET /api/organizations/current/language
PUT /api/organizations/current/language
```

**Problem**: 
- Plan verwendet `/:id` 
- Bestehende Konvention verwendet `/current` für aktuelle Organisation

**Empfehlung**: 
- Für aktuelle Organisation: `/api/organizations/current/lifecycle-roles`
- Für andere Organisationen (Admin): `/api/organizations/:id/lifecycle-roles`

**Status**: ⚠️ **MUSS ANGEPASST WERDEN**

#### Problem 6: Document-Settings Endpoints
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 1456-1511

**Plan verwendet**:
```
GET /api/organizations/:id/document-settings
PUT /api/organizations/:id/document-settings
POST /api/organizations/:id/document-templates/upload
POST /api/organizations/:id/document-signatures/upload
```

**Bestehende Konvention**:
- Settings werden über `/api/organizations/current` verwaltet
- Uploads könnten über `/api/organizations/current/documents/...` erfolgen

**Empfehlung**:
```
GET /api/organizations/current/document-settings
PUT /api/organizations/current/document-settings
POST /api/organizations/current/document-templates/upload
POST /api/organizations/current/document-signatures/upload
```

**Status**: ⚠️ **MUSS ANGEPASST WERDEN**

---

## 3. FRONTEND-KOMPONENTEN-STANDARDS

### ✅ Container-Strukturen

**Standard** (aus container-structures.md):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Box-Standard**:
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Box-Inhalt */}
</div>
```

### ⚠️ PROBLEME IN PLAN

#### Problem 7: Fehlende Container-Struktur in Prozess-Dokument
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Alle Prozesse

**Problem**: 
- Prozess-Dokument beschreibt Seiten/Boxen, aber nicht die exakte Container-Struktur
- Keine Erwähnung von `min-h-screen dark:bg-gray-900` Wrapper
- Keine Erwähnung von `max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6`

**Empfehlung**: 
- Container-Struktur in Prozess-Dokument ergänzen
- Oder Verweis auf container-structures.md hinzufügen

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

#### Problem 8: Box-Design - Shadow vs. Border
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Box-Beschreibungen

**Standard** (aus DESIGN_STANDARDS.md):
- Boxen haben **KEINEN Shadow** (nur bei Cards)
- Boxen haben **Border**: `border border-gray-300 dark:border-gray-700`
- Boxen haben **KEINEN Shadow**: `shadow` ist NICHT erlaubt

**Plan verwendet**:
- Beschreibt Boxen, aber nicht explizit Shadow/Border-Regeln

**Status**: ✅ **OK** - Sollte bei Implementierung beachtet werden

---

## 4. MODAL/SIDEPANE-STANDARDS

### ✅ Standard-Pattern (aus DESIGN_STANDARDS.md)

**Create/Edit-Komponenten**:
- Mobile (<640px): Modal
- Desktop (≥640px, ≤1070px): Sidepane MIT Overlay
- Large Desktop (>1070px): Sidepane OHNE Overlay

**Referenz-Implementierungen**:
- `CreateTaskModal.tsx` - Standard Sidepane Pattern
- `CreateRequestModal.tsx` - Standard Sidepane Pattern
- `EditTaskModal.tsx` - Standard Sidepane Pattern
- `EditRequestModal.tsx` - Standard Sidepane Pattern

### ⚠️ PROBLEME IN PLAN

#### Problem 9: Modal-Komponenten - Fehlende Details
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Alle Modal-Beschreibungen

**Fehlende Details**:
- Keine Erwähnung von `useSidepane` Hook
- Keine Erwähnung von `top-16` für Sidepane (unter Topbar)
- Keine Erwähnung von `isLargeScreen` Check für >1070px
- Keine Erwähnung von Transform-Animation: `transform transition-transform duration-350 ease-out`

**Empfehlung**: 
- Prozess-Dokument sollte auf Standard-Pattern verweisen
- Oder explizit alle technischen Details auflisten

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

#### Problem 10: Modal-Scroll-Struktur für große Inhalte
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_PROZESS.md` - CertificateCreationModal, ContractCreationModal

**Standard** (aus DESIGN_STANDARDS.md Zeile 2045-2119):
- Große Modals müssen `modal-scroll-container`, `modal-scroll-header`, `modal-scroll-content`, `modal-scroll-footer` verwenden

**Plan beschreibt**:
- Tabs "Daten" und "Text bearbeiten"
- PDF-Vorschau
- Text-Bearbeitung

**Problem**: 
- Plan erwähnt nicht die Scroll-Struktur für große Modals
- CertificateCreationModal wird wahrscheinlich groß sein (PDF-Vorschau + Text-Bearbeitung)

**Empfehlung**: 
- Scroll-Struktur in Plan ergänzen
- Oder explizit darauf hinweisen, dass Standard-Pattern verwendet wird

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

---

## 5. TYPESCRIPT-STANDARDS

### ✅ Import-Pfade

**Frontend** (aus CODING_STANDARDS.md):
- ✅ **RICHTIG**: `import Button from '../components/Button.tsx';`
- ❌ **FALSCH**: `import Button from '../components/Button';`

**Backend**:
- ✅ **RICHTIG**: `import { someFunction } from '../utils/helpers';`
- ❌ **FALSCH**: `import { someFunction } from '../utils/helpers.ts';`

### ⚠️ PROBLEME IN PLAN

#### Problem 11: TypeScript-Interfaces - Fehlende .ts Endungen
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 698-750

**Plan zeigt**:
```typescript
interface OrganizationSettings {
  // ...
}
```

**Problem**: 
- Plan zeigt nur Interface-Definition, keine Import-Statements
- Bei Implementierung müssen Frontend-Imports `.tsx` haben

**Status**: ✅ **OK** - Wird bei Implementierung beachtet werden müssen

---

## 6. DESIGN-STANDARDS - BOX-STRUKTUREN

### ✅ Box-Design-Standards

**Standard-Box** (aus DESIGN_STANDARDS.md):
- `bg-white dark:bg-gray-800`
- `rounded-lg`
- `border border-gray-300 dark:border-gray-700`
- `p-6`
- **KEIN** `shadow` (nur bei Cards)

**Box mit Tabelle**:
- Gleiche Klassen wie Standard-Box
- Titelzeile: `flex items-center justify-between mb-4`
- Tabelle: `overflow-x-auto`

### ⚠️ PROBLEME IN PLAN

#### Problem 12: Box-Beschreibungen - Fehlende Details
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Alle Box-Beschreibungen

**Fehlende Details**:
- Keine explizite Erwähnung von `border border-gray-300 dark:border-gray-700`
- Keine Erwähnung, dass `shadow` NICHT verwendet wird
- Keine Erwähnung von `p-6` Padding

**Empfehlung**: 
- Box-Beschreibungen sollten Standard-Klassen explizit erwähnen
- Oder Verweis auf DESIGN_STANDARDS.md hinzufügen

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

---

## 7. API-RESPONSE-FORMATE

### ✅ Bestehende Patterns (aus Code-Analyse)

**Standard-Response**:
```json
{
  "data": [...],
  "message": "..."
}
```

**Error-Response**:
```json
{
  "message": "Fehlerbeschreibung",
  "error": "Technische Details"
}
```

### ⚠️ PROBLEME IN PLAN

#### Problem 13: Inkonsistente Response-Struktur
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` - API-Spezifikation

**Plan zeigt**:
```json
{
  "certificates": [...]
}
```

**Bestehende Konvention** (aus tasks.ts, requests.ts):
- Oft direktes Array oder Objekt
- Manchmal mit `data` Wrapper

**Empfehlung**: 
- Konsistenz mit bestehenden Endpoints prüfen
- Standard-Response-Format definieren

**Status**: ⚠️ **SOLLTE ANGEPASST WERDEN**

---

## 8. ROLLEN-PRÜFUNG - MIDDLEWARE

### ✅ Bestehende Patterns

**Bestehende Middleware** (aus Code-Analyse):
- `authMiddleware` - Authentifizierung
- `roleAuthMiddleware` - Rollen-basierte Authentifizierung
- `checkRole(['admin'])` - Spezifische Rollen-Prüfung

### ⚠️ PROBLEME IN PLAN

#### Problem 14: Neue Middleware - Integration mit bestehendem System
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 1267-1307

**Plan definiert**:
```typescript
export const requireHR = async (req, res, next) => { ... }
export const requireLegal = async (req, res, next) => { ... }
```

**Bestehende Middleware**:
- `checkRole(['admin'])` - Prüft Rollen-Namen
- Neue Middleware prüft `Organization.settings.lifecycleRoles`

**Problem**: 
- Zwei verschiedene Rollen-Prüfungs-Systeme
- Inkonsistenz zwischen `checkRole(['admin'])` und `requireHR()`

**Empfehlung**: 
- Integration mit bestehendem `checkRole` System
- Oder Migration von `checkRole` zu neuem System
- Oder beide Systeme parallel unterstützen

**Status**: ⚠️ **MUSS GELÖST WERDEN** - Entscheidung erforderlich

---

## 9. FRONTEND-HOOKS UND SERVICES

### ✅ Bestehende Patterns

**Bestehende Hooks**:
- `useAuth()` - Authentifizierung
- `usePermissions()` - Berechtigungen
- `useMessage()` - Messages

**Bestehende Services**:
- `organizationService.ts` - Organisation-Services
- `userService.ts` - User-Services

### ⚠️ PROBLEME IN PLAN

#### Problem 15: Neuer Hook `useLifecycleRole` - Integration
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` Zeile 1314-1334

**Plan definiert**:
```typescript
export const useLifecycleRole = () => {
  const { hasRole } = useCallback(async (roleType) => { ... });
  return { hasRole };
};
```

**Bestehende Hooks**:
- `usePermissions()` - Hat bereits `hasPermission(entity, accessLevel, entityType)`

**Problem**: 
- Zwei verschiedene Berechtigungs-Systeme
- `usePermissions()` prüft Permissions (aus Permission-Model)
- `useLifecycleRole()` prüft Rollen-Zuordnung (aus Organization.settings)

**Empfehlung**: 
- Integration mit `usePermissions()` prüfen
- Oder klare Trennung dokumentieren
- Oder `usePermissions()` erweitern um Lebenszyklus-Rollen

**Status**: ⚠️ **MUSS GELÖST WERDEN** - Entscheidung erforderlich

---

## 10. DATEI-NAMENSKONVENTIONEN

### ✅ Bestehende Konventionen

**Frontend-Komponenten**:
- PascalCase: `CreateTaskModal.tsx`
- Mit Suffix: `.tsx`

**Backend-Controller**:
- camelCase: `taskController.ts`
- Mit Suffix: `.ts`

**Backend-Routes**:
- camelCase: `tasks.ts`
- Mit Suffix: `.ts`

### ⚠️ PROBLEME IN PLAN

#### Problem 16: Komponenten-Namen - Konsistenz
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_PROZESS.md` - UI-Komponenten-Übersicht

**Plan definiert**:
- `CertificateCreationModal.tsx` ✅
- `ContractCreationModal.tsx` ✅
- `CertificateEditModal.tsx` ✅
- `ContractEditModal.tsx` ✅
- `DocumentConfigurationTab.tsx` ✅
- `RoleConfigurationTab.tsx` ✅

**Bestehende Konvention**:
- `CreateTaskModal.tsx` ✅
- `EditTaskModal.tsx` ✅
- `CreateRequestModal.tsx` ✅
- `EditRequestModal.tsx` ✅

**Status**: ✅ **OK** - Konsistent mit bestehender Konvention

---

## 11. DOKUMENTATIONSSTANDARDS

### ✅ Dokumentationshierarchie

**Stufe 1**: Grundregeln (immer.mdc, mdfiles.mdc) - **NIEMALS direkt aktualisieren**
**Stufe 2**: Überblicksdokumente (README.md, claude/README.md) - **Nur Verweise aktualisieren**
**Stufe 3**: Detaillierte Dokumentation (spezifische .md-Dateien) - **HIER gehören Details hin**

### ⚠️ PROBLEME IN PLAN

#### Problem 17: README.md wurde aktualisiert
**Gefunden in**: README.md Zeile 65-66

**Aktualisierung**:
```markdown
- [MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md](docs/implementation_plans/MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md) - **NEU**: Vollständiger Mitarbeiterlebenszyklus
- [MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md](docs/implementation_plans/MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md) - Fortschritts-Tracking
```

**Status**: ✅ **OK** - README.md ist Stufe 2, Verweise sind erlaubt

#### Problem 18: claude/README.md wurde NICHT aktualisiert
**Gefunden in**: `docs/claude/readme.md` Zeile 68-74

**Aktueller Stand**:
```markdown
## Implementierungspläne

Für die strukturierte Umsetzung neuer Module existieren detaillierte Schritt-für-Schritt Pläne:

- **Consultation-Modul** - Vollständig in 3 Teilen dokumentiert
- **Abrechnungsmodul** - Plan für Swiss QR-Rechnungen mit Zahlungsverfolgung

Details zu allen Plänen siehe `/docs/implementation_plans/`
```

**Fehlt**: Verweis auf MITARBEITERLEBENSZYKLUS-Implementierungspläne

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

---

## 12. FEHLERBEHANDLUNG

### ✅ Bestehende Patterns

**Standard-Fehlerbehandlung** (aus CODING_STANDARDS.md):
```typescript
try {
  // ...
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server-Fehler
    } else if (error.request) {
      // Network-Fehler
    }
  }
}
```

### ⚠️ PROBLEME IN PLAN

#### Problem 19: Fehlende Fehlerbehandlung in API-Spezifikation
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` - API-Spezifikation

**Plan zeigt**:
- Nur Success-Responses
- Keine Error-Responses
- Keine Fehlerbehandlung

**Empfehlung**: 
- Error-Responses für alle Endpoints dokumentieren
- Fehlerbehandlung in Backend-Code-Beispielen ergänzen

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

---

## 13. VALIDIERUNG

### ✅ Bestehende Patterns

**Bestehende Validierung** (aus Code-Analyse):
- Zod-Schemas für Request-Validierung
- Frontend-Validierung in Formularen

### ⚠️ PROBLEME IN PLAN

#### Problem 20: Fehlende Validierung in API-Spezifikation
**Gefunden in**: `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` - API-Spezifikation

**Plan zeigt**:
- Request-Bodies
- Response-Bodies
- **KEINE** Validierungsregeln

**Empfehlung**: 
- Zod-Schemas für alle Request-Bodies definieren
- Validierungsregeln dokumentieren

**Status**: ⚠️ **SOLLTE ERGÄNZT WERDEN**

---

## 14. ZUSAMMENFASSUNG DER KRITISCHEN PROBLEME

### 🔴 KRITISCH (Muss vor Implementierung gelöst werden)

1. **API-Endpoint-Struktur** (Problem 4, 5, 6)
   - Inkonsistenz zwischen Plan und bestehender Konvention
   - Entscheidung erforderlich: `/api/users/:id/lifecycle/...` vs. `/api/employee-lifecycle/:userId/...`
   - Organization-Endpoints: `/current` vs. `/:id`

2. **Rollen-Prüfung - Zwei Systeme** (Problem 14, 15)
   - Bestehendes `checkRole(['admin'])` vs. neues `requireHR()`
   - Bestehendes `usePermissions()` vs. neues `useLifecycleRole()`
   - Integration oder Migration erforderlich

3. **User-Model Erweiterung** (Problem 2)
   - Migration muss erstellt werden
   - Relations müssen hinzugefügt werden

### 🟡 WICHTIG (Sollte ergänzt werden)

4. **Container-Strukturen** (Problem 7)
   - Prozess-Dokument sollte Container-Struktur erwähnen

5. **Modal/Sidepane Details** (Problem 9, 10)
   - Technische Details für Sidepane-Implementierung fehlen
   - Scroll-Struktur für große Modals fehlt

6. **Box-Design Details** (Problem 12)
   - Standard-Klassen sollten explizit erwähnt werden

7. **Fehlerbehandlung** (Problem 19)
   - Error-Responses sollten dokumentiert werden

8. **Validierung** (Problem 20)
   - Validierungsregeln sollten dokumentiert werden

### 🟢 MINOR (Kann bei Implementierung beachtet werden)

9. **claude/README.md** (Problem 18)
   - Verweis auf neue Implementierungspläne ergänzen

10. **Response-Struktur** (Problem 13)
    - Konsistenz mit bestehenden Endpoints prüfen

---

## 15. EMPFEHLUNGEN

### Priorität 1: Vor Implementierung

1. **API-Endpoint-Struktur festlegen**
   - Entscheidung: `/api/users/:id/lifecycle/...` oder `/api/employee-lifecycle/:userId/...`
   - Organization-Endpoints: `/current` für aktuelle Organisation
   - Dokumentation aktualisieren

2. **Rollen-Prüfung integrieren**
   - Entscheidung: Integration mit bestehendem System oder neues System
   - Middleware-Strategie festlegen
   - Hook-Strategie festlegen

3. **Prisma Migration planen**
   - User-Model erweitern
   - Neue Models hinzufügen
   - Migration-Script erstellen

### Priorität 2: Während Implementierung

4. **Container-Strukturen befolgen**
   - Standard-Container-Struktur verwenden
   - Box-Design-Standards befolgen

5. **Modal/Sidepane Standards befolgen**
   - Standard-Pattern verwenden (CreateTaskModal als Referenz)
   - Scroll-Struktur für große Modals implementieren

6. **Fehlerbehandlung implementieren**
   - Error-Responses für alle Endpoints
   - Frontend-Fehlerbehandlung

### Priorität 3: Dokumentation

7. **Dokumentation ergänzen**
   - claude/README.md aktualisieren
   - Validierungsregeln dokumentieren
   - Fehlerbehandlung dokumentieren

---

## 16. CHECKLISTE FÜR IMPLEMENTIERUNG

### Vor Implementierung

- [ ] API-Endpoint-Struktur festgelegt
- [ ] Rollen-Prüfung integriert
- [ ] Prisma Migration erstellt
- [ ] Validierungsregeln definiert
- [ ] Fehlerbehandlung geplant

### Während Implementierung

- [ ] Container-Strukturen befolgt
- [ ] Box-Design-Standards befolgt
- [ ] Modal/Sidepane Standards befolgt
- [ ] TypeScript-Standards befolgt (Imports mit .tsx)
- [ ] API-Response-Formate konsistent

### Nach Implementierung

- [ ] Dokumentation aktualisiert
- [ ] claude/README.md aktualisiert
- [ ] Code-Review durchgeführt
- [ ] Tests geschrieben

---

**Ende der Prüfung**

