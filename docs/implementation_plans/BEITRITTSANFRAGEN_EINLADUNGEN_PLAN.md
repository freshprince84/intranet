# Plan: Beitrittsanfragen-Anzeige korrigieren & Einladungssystem implementieren

## Übersicht

Dieser Plan adressiert zwei Probleme:
1. **Beitrittsanfragen werden nicht angezeigt** - Analyse und Korrektur
2. **Einladungssystem fehlt komplett** - Implementierung von Grund auf

---

## Problem-Analyse

### Problem 1: Beitrittsanfragen werden nicht angezeigt

**Aktueller Stand:**
- ✅ Backend: `getJoinRequests` in `organizationController.ts` existiert
- ✅ Backend: Route `/organizations/join-requests` existiert
- ✅ Frontend: `JoinRequestsList.tsx` Komponente existiert
- ✅ Frontend: `organizationService.getJoinRequests()` existiert
- ✅ Route verwendet `organizationMiddleware` (User muss in Organisation sein)

**Mögliche Ursachen:**
1. Die Route `/organizations/join-requests` verwendet `getJoinRequests` aus `organizationController.ts`
2. Diese Funktion holt Beitrittsanfragen basierend auf `req.userRole.role.organizationId`
3. Wenn der User keine aktive Rolle hat oder die Rolle keine Organisation hat, wird ein Fehler zurückgegeben
4. Die Funktion `getJoinRequests` in `organizationController.ts` ist nicht identisch mit `getJoinRequestsForOrganization` in `joinRequestController.ts`

**Zu prüfen:**
- Funktioniert die Route korrekt?
- Werden Beitrittsanfragen aus der Datenbank geladen?
- Gibt es Berechtigungsprobleme?
- Ist die Route korrekt registriert?

**Lösungsansatz:**
1. Code-Analyse: Vergleich beider Implementierungen (`organizationController.getJoinRequests` vs `joinRequestController.getJoinRequestsForOrganization`)
2. Route-Überprüfung: Ist die Route korrekt registriert?
3. Frontend-Debugging: Werden Daten korrekt angezeigt?
4. Korrektur falls nötig: Route auf bessere Implementierung umstellen

### Problem 2: Einladungssystem fehlt komplett

**Aktueller Stand:**
- ✅ Datenbank-Schema: `OrganizationInvitation` Model existiert
- ✅ Notification-Typen: `organizationInvitation` existiert
- ✅ Berechtigungen: `canManageInvitations`, `canViewInvitations` existieren
- ❌ Backend Controller: KEINE Funktionen für Einladungen
- ❌ Backend Routen: KEINE Routen für Einladungen
- ❌ Frontend Service: KEINE Methoden für Einladungen
- ❌ Frontend Komponenten: KEINE Komponenten für Einladungen
- ❌ E-Mail-Versand: KEINE E-Mail-Funktionalität für Einladungen

**Dokumentation:**
- `docs/implementation_reports/ORGANISATION_FUNKTIONALITAET_ANALYSE_FINAL.md` Zeile 28-31: Klar dokumentiert als FEHLEND
- `docs/implementation_plans/MULTI_TENANT_SAAS_IMPLEMENTATION.md` Zeile 261-295: Schema-Definition vorhanden, aber keine Implementierung

**Schema-Details (aus `schema.prisma`):**
```prisma
model OrganizationInvitation {
  id             Int          @id @default(autoincrement())
  organizationId Int
  email          String
  roleId         Int
  invitedBy      Int
  token          String       @unique
  expiresAt      DateTime
  acceptedAt     DateTime?
  acceptedBy     Int?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  acceptor       User?        @relation("InvitationAcceptor", fields: [acceptedBy], references: [id])
  inviter        User         @relation("Inviter", fields: [invitedBy], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  role           Role         @relation(fields: [roleId], references: [id])
}
```

---

## Detaillierter Implementierungsplan

### Phase 1: Problem 1 - Beitrittsanfragen-Anzeige korrigieren

#### Schritt 1.1: Code-Analyse durchführen
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 30 Minuten

**Aufgaben:**
1. Vergleich der beiden Implementierungen:
   - `backend/src/controllers/organizationController.ts` - `getJoinRequests`
   - `backend/src/controllers/joinRequestController.ts` - `getJoinRequestsForOrganization`

2. Prüfen der Unterschiede:
   - Welche Implementierung ist besser?
   - Welche hat mehr Features?
   - Welche ist korrekt?

3. Route-Überprüfung:
   - Welche Route wird verwendet? (`/organizations/join-requests` vs `/join-requests`)
   - Ist die Route korrekt registriert?
   - Welche Middleware wird verwendet?

4. Frontend-Überprüfung:
   - Welcher Endpoint wird im Frontend aufgerufen?
   - Gibt es Fehler in der Konsole?
   - Werden Daten korrekt angezeigt?

**Erwartete Ergebnisse:**
- Klarheit über die Ursache des Problems
- Entscheidung, welche Implementierung verwendet werden soll
- Liste der notwendigen Änderungen

#### Schritt 1.2: Korrektur implementieren
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 1-2 Stunden

**Aufgaben (abhängig von Schritt 1.1):**
1. Route korrigieren falls nötig
2. Controller-Funktion korrigieren falls nötig
3. Frontend-Service korrigieren falls nötig
4. Testen der Anzeige

---

### Phase 2: Problem 2 - Einladungssystem implementieren

#### Schritt 2.1: Backend - Controller-Funktionen erstellen
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 3-4 Stunden

**Neue Datei:** `backend/src/controllers/invitationController.ts`

**Funktionen zu implementieren:**

1. **`createInvitation`** - Einladung erstellen
   - Parameter: `{ email: string, roleId: number, message?: string }`
   - Validierung: E-Mail-Format, Rolle existiert, Rolle gehört zur Organisation, User hat Berechtigung
   - Token generieren (mit `crypto.randomBytes` oder ähnlich)
   - Ablaufdatum setzen (z.B. 7 Tage)
   - Einladung in DB speichern
   - E-Mail senden (siehe Schritt 2.2)
   - Notification an eingeladenen User senden (falls User bereits existiert)
   - Return: `OrganizationInvitation` mit allen Relations

2. **`getInvitations`** - Einladungen für Organisation abrufen
   - Nur für Organisation-Admins
   - Filter: `organizationId` aus `req.organizationId`
   - Include: `organization`, `role`, `inviter`, `acceptor`
   - Sortierung: `createdAt DESC`
   - Filter nach Status möglich (pending, accepted, expired)

3. **`getInvitationByToken`** - Einladung per Token abrufen (öffentlich, für Einladungsseite)
   - Parameter: `token` aus URL
   - Validierung: Token existiert, nicht abgelaufen, nicht bereits akzeptiert
   - Return: `OrganizationInvitation` mit `organization`, `role`, `inviter`

4. **`acceptInvitation`** - Einladung akzeptieren
   - Parameter: `token` aus Request-Body
   - Validierung: Token existiert, nicht abgelaufen, nicht bereits akzeptiert
   - User muss eingeloggt sein ODER E-Mail muss übereinstimmen
   - Wenn User existiert:
     - `UserRole` erstellen (User → Rolle)
     - `acceptedAt` und `acceptedBy` setzen
   - Wenn User nicht existiert:
     - Registrierungsprozess starten (siehe Schritt 2.3)
   - Notification an Inviter senden
   - Return: Success-Message

5. **`deleteInvitation`** - Einladung löschen
   - Parameter: `id` aus URL
   - Validierung: User hat Berechtigung (Organisation-Admin)
   - Einladung löschen
   - Return: Success-Message

6. **`resendInvitation`** - Einladung erneut senden
   - Parameter: `id` aus URL
   - Validierung: User hat Berechtigung
   - Token verlängern (neues Ablaufdatum)
   - E-Mail erneut senden
   - Return: Success-Message

**Referenz-Code:**
- `backend/src/controllers/joinRequestController.ts` - Ähnliche Struktur
- `backend/src/utils/tokenUtils.ts` - Token-Generierung (falls vorhanden)

#### Schritt 2.2: Backend - E-Mail-Service erweitern
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 1-2 Stunden

**Datei:** `backend/src/services/emailService.ts`

**Funktion hinzufügen:**

```typescript
export async function sendInvitationEmail(
  invitation: OrganizationInvitation,
  inviterName: string,
  organizationName: string,
  roleName: string,
  invitationUrl: string
): Promise<void> {
  // E-Mail-Template für Einladung
  // HTML- und Text-Version
  // Token-Link einbetten
  // Absender: System oder Inviter
}
```

**E-Mail-Inhalt:**
- Betreff: "Einladung zur Organisation [Organisationsname]"
- Inhalt:
  - Begrüßung
  - Einladung von [Inviter-Name]
  - Organisationsname
  - Rolle, die vergeben wird
  - Link zur Einladungsseite (mit Token)
  - Ablaufdatum
  - Hinweis: Falls kein Account existiert, Registrierung erforderlich

**Referenz:**
- Existierende E-Mail-Funktionen in `emailService.ts`
- E-Mail-Templates aus anderen Teilen des Systems

#### Schritt 2.3: Backend - Routen erstellen
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 1 Stunde

**Neue Datei:** `backend/src/routes/invitations.ts`

**Routen:**
```typescript
// POST /api/invitations - Einladung erstellen
router.post('/', authMiddleware, organizationMiddleware, createInvitation);

// GET /api/invitations - Einladungen für Organisation abrufen
router.get('/', authMiddleware, organizationMiddleware, getInvitations);

// GET /api/invitations/token/:token - Einladung per Token abrufen (öffentlich)
router.get('/token/:token', getInvitationByToken);

// POST /api/invitations/accept - Einladung akzeptieren
router.post('/accept', authMiddleware, acceptInvitation);

// DELETE /api/invitations/:id - Einladung löschen
router.delete('/:id', authMiddleware, organizationMiddleware, deleteInvitation);

// POST /api/invitations/:id/resend - Einladung erneut senden
router.post('/:id/resend', authMiddleware, organizationMiddleware, resendInvitation);
```

**In `backend/src/index.ts` registrieren:** ⚠️ **WICHTIG:** Routes werden in `index.ts` registriert, NICHT in `app.ts`!
```typescript
app.use('/api/invitations', invitationsRouter);
```

#### Schritt 2.4: Frontend - Service-Methoden erstellen
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 1 Stunde

**Datei:** `frontend/src/services/organizationService.ts`

**Methoden hinzufügen:**

```typescript
// Einladung erstellen
createInvitation: async (data: CreateInvitationRequest): Promise<OrganizationInvitation>

// Einladungen abrufen
getInvitations: async (): Promise<OrganizationInvitation[]>

// Einladung per Token abrufen (öffentlich)
getInvitationByToken: async (token: string): Promise<OrganizationInvitation>

// Einladung akzeptieren
acceptInvitation: async (token: string): Promise<void>

// Einladung löschen
deleteInvitation: async (id: number): Promise<void>

// Einladung erneut senden
resendInvitation: async (id: number): Promise<void>
```

**API-Endpoints in `frontend/src/config/api.ts` hinzufügen:**
```typescript
INVITATIONS: {
  BASE: '/invitations',
  CREATE: '/invitations',
  LIST: '/invitations',
  BY_TOKEN: (token: string) => `/invitations/token/${token}`,
  ACCEPT: '/invitations/accept',
  DELETE: (id: number) => `/invitations/${id}`,
  RESEND: (id: number) => `/invitations/${id}/resend`
}
```

**Types in `frontend/src/types/organization.ts` hinzufügen:**
```typescript
export interface OrganizationInvitation {
  id: number;
  organizationId: number;
  email: string;
  roleId: number;
  invitedBy: number;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: number;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  role?: Role;
  inviter?: User;
  acceptor?: User;
}

export interface CreateInvitationRequest {
  email: string;
  roleId: number;
  message?: string;
}
```

#### Schritt 2.5: Frontend - Komponente für Einladungsverwaltung erstellen
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 3-4 Stunden

**Neue Datei:** `frontend/src/components/organization/InvitationsList.tsx`

**Funktionalität:**
- Liste aller Einladungen für die Organisation
- Filter nach Status (pending, accepted, expired)
- Neue Einladung erstellen (Modal öffnen)
- Einladung löschen
- Einladung erneut senden
- Design gemäß DESIGN_STANDARDS.md (Box-Struktur, Cards, Dark Mode)

**Features:**
- Status-Badges (pending: yellow, accepted: green, expired: red)
- E-Mail-Adresse anzeigen
- Rolle anzeigen
- Einladungsdatum anzeigen
- Ablaufdatum anzeigen
- Inviter-Name anzeigen
- Acceptor-Name anzeigen (falls akzeptiert)
- Actions: Löschen, Erneut senden

**Referenz-Komponenten:**
- `JoinRequestsList.tsx` - Ähnliche Struktur
- `NotificationList.tsx` - Card-Design

#### Schritt 2.6: Frontend - Modal für neue Einladung erstellen
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 2-3 Stunden

**Neue Datei:** `frontend/src/components/organization/CreateInvitationModal.tsx`

**Funktionalität:**
- E-Mail-Eingabefeld
- Rollenauswahl-Dropdown (Rollen der Organisation)
- Nachricht-Feld (optional, Textarea)
- Validierung:
  - E-Mail-Format
  - Rolle muss ausgewählt sein
  - E-Mail darf nicht bereits eingeladen sein (pending)
- Submit: Einladung erstellen
- Success-Message nach Erstellung
- Design gemäß DESIGN_STANDARDS.md (Headless UI Dialog)

**Referenz-Komponenten:**
- `ProcessJoinRequestModal.tsx` - Ähnliche Struktur
- `CreateClientModal.tsx` - Modal-Struktur

#### Schritt 2.7: Frontend - Einladungsseite erstellen (öffentlich)
**Priorität: 🟡 HOCH**
**Geschätzte Zeit:** 2-3 Stunden

**Neue Datei:** `frontend/src/pages/InvitationAccept.tsx`

**Funktionalität:**
- Route: `/invitation/:token`
- Token aus URL lesen
- Einladung per Token abrufen
- Anzeige:
  - Organisationsname
  - Rolle
  - Inviter-Name
  - Ablaufdatum
- Wenn User eingeloggt:
  - Button "Einladung akzeptieren"
  - Validierung: E-Mail muss übereinstimmen
- Wenn User nicht eingeloggt:
  - Button "Registrieren und akzeptieren"
  - Weiterleitung zur Registrierung mit Token
- Validierung: Token gültig, nicht abgelaufen, nicht bereits akzeptiert
- Design gemäß DESIGN_STANDARDS.md

#### Schritt 2.8: Frontend - Integration in OrganizationSettings
**Priorität: 🔴 KRITISCH**
**Geschätzte Zeit:** 1 Stunde

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Änderungen:**
- `InvitationsList` Komponente importieren
- Nach `JoinRequestsList` einfügen
- Nur anzeigen wenn `canViewInvitations()` Berechtigung vorhanden

**Datei:** `frontend/src/pages/UserManagement.tsx`

**Änderungen:**
- `InvitationsList` wird bereits über `OrganizationSettings` angezeigt
- Keine zusätzlichen Änderungen nötig

#### Schritt 2.9: Übersetzungen hinzufügen
**Priorität: 🟡 HOCH**
**Geschätzte Zeit:** 30 Minuten

**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Hinzufügen:**
- `invitationsList.title`
- `invitationsList.status.pending`
- `invitationsList.status.accepted`
- `invitationsList.status.expired`
- `invitationsList.createInvitation`
- `invitationsList.deleteInvitation`
- `invitationsList.resendInvitation`
- `invitationsList.noInvitations`
- `invitationsList.invitationCreated`
- `invitationsList.invitationDeleted`
- `invitationsList.invitationResent`
- `createInvitationModal.title`
- `createInvitationModal.email`
- `createInvitationModal.role`
- `createInvitationModal.message`
- `createInvitationModal.submit`
- `invitationAccept.title`
- `invitationAccept.accept`
- `invitationAccept.registerAndAccept`
- etc.

---

## Priorisierte Aufgabenliste

### 🔴 Sofort umsetzen (Blockierend):

1. **Schritt 1.1:** Code-Analyse durchführen - Ursache des Problems finden
2. **Schritt 1.2:** Korrektur implementieren - Beitrittsanfragen korrekt anzeigen
3. **Schritt 2.1:** Backend Controller erstellen - Basis für Einladungen
4. **Schritt 2.2:** E-Mail-Service erweitern - E-Mails versenden
5. **Schritt 2.3:** Backend Routen erstellen - API-Endpoints
6. **Schritt 2.4:** Frontend Service-Methoden - API-Anbindung
7. **Schritt 2.5:** InvitationsList Komponente - Verwaltung
8. **Schritt 2.6:** CreateInvitationModal - Neue Einladungen
9. **Schritt 2.8:** Integration in OrganizationSettings - Sichtbar machen

### 🟡 Kurzfristig (Diese Woche):

10. **Schritt 2.7:** Einladungsseite erstellen - Öffentliche Seite
11. **Schritt 2.9:** Übersetzungen hinzufügen - Mehrsprachigkeit

---

## Zusammenfassung der Datei-Änderungen

### Backend:
1. ✅ `backend/src/controllers/invitationController.ts` - **NEUE DATEI**
2. ✅ `backend/src/services/emailService.ts` - Funktion `sendInvitationEmail` hinzufügen
3. ✅ `backend/src/routes/invitations.ts` - **NEUE DATEI**
4. ✅ `backend/src/index.ts` - Route registrieren ⚠️ **WICHTIG:** Routes werden in `index.ts` registriert, NICHT in `app.ts`!
5. ⚠️ `backend/src/controllers/organizationController.ts` - `getJoinRequests` prüfen/korrigieren (falls nötig)
6. ⚠️ `backend/src/routes/organizations.ts` - Route prüfen/korrigieren (falls nötig)

### Frontend:
1. ✅ `frontend/src/types/organization.ts` - Types hinzufügen
2. ✅ `frontend/src/config/api.ts` - Endpoints hinzufügen
3. ✅ `frontend/src/services/organizationService.ts` - Methoden hinzufügen
4. ✅ `frontend/src/components/organization/InvitationsList.tsx` - **NEUE DATEI**
5. ✅ `frontend/src/components/organization/CreateInvitationModal.tsx` - **NEUE DATEI**
6. ✅ `frontend/src/pages/InvitationAccept.tsx` - **NEUE DATEI**
7. ✅ `frontend/src/components/organization/OrganizationSettings.tsx` - Integration
8. ✅ `frontend/src/i18n/locales/de.json` - Übersetzungen hinzufügen
9. ✅ `frontend/src/i18n/locales/en.json` - Übersetzungen hinzufügen
10. ✅ `frontend/src/i18n/locales/es.json` - Übersetzungen hinzufügen
11. ✅ `frontend/src/App.tsx` - Route für `/invitation/:token` hinzufügen (falls nötig)

---

## Test-Szenarien

### Problem 1 - Beitrittsanfragen:
1. ✅ Beitrittsanfragen werden in `JoinRequestsList` angezeigt
2. ✅ Filter funktionieren korrekt
3. ✅ Status-Badges werden korrekt angezeigt
4. ✅ Bearbeitung funktioniert

### Problem 2 - Einladungen:
1. ✅ Organisation-Admin kann Einladung erstellen
2. ✅ E-Mail wird versendet
3. ✅ Einladung erscheint in Liste
4. ✅ Token-Link funktioniert
5. ✅ Eingeladener User kann Einladung akzeptieren
6. ✅ User erhält Rolle nach Akzeptierung
7. ✅ Inviter erhält Notification
8. ✅ Abgelaufene Einladungen werden korrekt angezeigt
9. ✅ Einladung kann gelöscht werden
10. ✅ Einladung kann erneut gesendet werden

---

## Geschätzte Gesamtzeit

- **Problem 1:** 1.5-2.5 Stunden
- **Problem 2:** 14-18 Stunden
- **Gesamt:** 15.5-20.5 Stunden

---

## Reihenfolge der Implementierung

1. **Zuerst Problem 1 lösen** (Beitrittsanfragen)
2. **Dann Problem 2 implementieren** (Einladungen)


