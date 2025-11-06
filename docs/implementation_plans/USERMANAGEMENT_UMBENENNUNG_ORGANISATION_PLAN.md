# Plan: Kritische Probleme beheben

## Problem-Analyse

### Problem 1: "UserManagement" Seite muss zu "Organisation" umbenannt werden

**Aktueller Stand:**
- Datei: `frontend/src/pages/UserManagement.tsx` - heißt noch "UserManagement"
- Route: `/users` - sollte `/organization` oder `/organisation` sein
- Komponente: `UserManagement` - sollte `OrganizationManagement` oder `Organisation` heißen
- Übersetzungen: `userManagement` - sollte `organization` oder `organisation` heißen
- Alle Referenzen müssen geändert werden

**Betroffene Dateien:**
1. `frontend/src/pages/UserManagement.tsx` → `OrganizationManagement.tsx` oder `Organisation.tsx`
2. `frontend/src/App.tsx` - Route und Import ändern
3. `frontend/src/i18n/locales/de.json` - Übersetzungs-Schlüssel ändern
4. `frontend/src/i18n/locales/en.json` - Übersetzungs-Schlüssel ändern
5. `frontend/src/i18n/locales/es.json` - Übersetzungs-Schlüssel ändern
6. `frontend/src/components/UserManagementTab.tsx` - Referenzen prüfen
7. `frontend/src/index.css` - Kommentare ändern

### Problem 2: User ohne Organisation muss existieren können

**Dokumentation bestätigt:**
- `docs/technical/BERECHTIGUNGSSYSTEM.md` Zeile 49-57:
  - ✅ **User-Rolle wird bei Registrierung zugewiesen (ohne Organisation)**
  - ✅ User ohne Organisation sind korrekt und erwünscht
  - ✅ User kann später Organisation beitreten oder erstellen

**Aktueller Code:**
- `authController.ts` Zeile 96-104: Erstellt User mit User-Rolle (ID 2), `organizationId` ist NULL ✅
- `organizationMiddleware.ts` Zeile 40-42: Gibt 404 zurück wenn kein `userRole` gefunden wird
- `getJoinRequests` Zeile 802-805: Gibt 400 zurück wenn `req.organizationId` NULL ist

**Problem:**
- Die Middleware sollte NICHT einen Fehler zurückgeben wenn `organizationId` NULL ist
- Das ist korrekt für User ohne Organisation!
- Die Funktion `getJoinRequests` sollte eine klare Fehlermeldung geben, aber die Middleware sollte durchlaufen

### Problem 3: User muss immer aktive Rolle haben

**Dokumentation bestätigt:**
- `authController.ts` Zeile 203-240: Beim Login wird sichergestellt, dass immer eine aktive Rolle existiert
- Wenn keine gefunden wird, wird automatisch die erste Rolle aktiviert
- Wenn User gar keine Rolle hat, gibt Login einen Fehler zurück

**Problem:**
- Die Middleware gibt 404 zurück wenn kein `userRole` gefunden wird
- Das sollte theoretisch nie passieren (Login stellt sicher, dass immer eine Rolle existiert)
- ABER: Falls es doch passiert, sollte die Middleware einen besseren Fehler geben

---

## Lösungsplan

### Phase 1: Umbenennung "UserManagement" → "Organisation"

#### Schritt 1.1: Datei umbenennen
**Datei:** `frontend/src/pages/UserManagement.tsx` → `frontend/src/pages/Organisation.tsx`

**Änderungen:**
- Komponentenname: `UserManagement` → `Organisation`
- Alle internen Referenzen zu `userManagement` durch `organisation` ersetzen
- Titel und Übersetzungs-Schlüssel ändern

#### Schritt 1.2: Route ändern
**Datei:** `frontend/src/App.tsx`

**Änderungen:**
- Import: `const UserManagement = ...` → `const Organisation = ...`
- Route: `<Route path="/users" ...` → `<Route path="/organization" ...` oder `<Route path="/organisation" ...`
- Komponente: `<UserManagement />` → `<Organisation />`

#### Schritt 1.3: Übersetzungen ändern
**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Änderungen:**
- `userManagement` → `organisation` oder `organizationManagement`
- Alle Unter-Schlüssel anpassen

#### Schritt 1.4: Sidebar-Navigation ändern
**Suche:** Wo wird die Route `/users` in der Sidebar referenziert?

**Änderungen:**
- Route-Referenz von `/users` zu `/organization` oder `/organisation` ändern
- Übersetzungs-Schlüssel für Sidebar anpassen

#### Schritt 1.5: CSS-Kommentare ändern
**Datei:** `frontend/src/index.css`

**Änderungen:**
- Kommentare: `USERMANAGEMENTTAB` → `ORGANISATIONTAB` oder entfernen

### Phase 2: Middleware korrigieren - User ohne Organisation erlauben

#### Schritt 2.1: Middleware-Logik anpassen
**Datei:** `backend/src/middleware/organization.ts`

**Aktuelles Problem:**
```typescript
if (!userRole) {
  return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
}
```

**Lösung:**
- Die Middleware sollte durchlaufen, auch wenn `organizationId` NULL ist
- `req.organizationId` kann NULL sein (für User ohne Organisation) - das ist korrekt!
- Nur wenn wirklich KEINE Rolle gefunden wird (was nie passieren sollte), sollte ein Fehler zurückgegeben werden

**Neuer Code:**
```typescript
if (!userRole) {
  console.error('❌ KRITISCH: User hat keine aktive Rolle! userId:', userId);
  return res.status(500).json({ 
    message: 'Interner Fehler: Keine aktive Rolle gefunden. Bitte kontaktieren Sie den Administrator.' 
  });
}

// organizationId kann NULL sein - das ist korrekt für User ohne Organisation!
req.organizationId = userRole.role.organizationId; // Kann NULL sein
req.userRole = userRole;
```

**Wichtig:** Die Middleware sollte NICHT einen Fehler zurückgeben wenn `organizationId` NULL ist. Das ist normal für User ohne Organisation!

### Phase 3: Funktionen korrigieren - User ohne Organisation unterstützen

#### Schritt 3.1: `getJoinRequests` Fehlermeldung verbessern
**Datei:** `backend/src/controllers/organizationController.ts`

**Aktuell:**
```typescript
if (!req.organizationId) {
  return res.status(400).json({ 
    message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
  });
}
```

**Das ist korrekt!** User ohne Organisation können keine Beitrittsanfragen für ihre Organisation sehen (weil sie keine haben).

**Aber:** Die Fehlermeldung könnte freundlicher sein:
```typescript
if (!req.organizationId) {
  return res.status(400).json({ 
    message: 'Sie sind noch keiner Organisation zugeordnet. Bitte treten Sie einer Organisation bei oder erstellen Sie eine neue.' 
  });
}
```

### Phase 4: Dokumentation aktualisieren

#### Schritt 4.1: Middleware-Verhalten dokumentieren
**Datei:** `backend/src/middleware/organization.ts`

**Hinzufügen:**
- Kommentar: `organizationId` kann NULL sein für User ohne Organisation
- Kommentar: Das ist korrekt und erwünscht
- Kommentar: Funktionen die eine Organisation benötigen sollten prüfen und entsprechende Fehlermeldung geben

---

## Detaillierte Umsetzung

### Schritt 1: Datei umbenennen und Komponente anpassen

**Datei:** `frontend/src/pages/UserManagement.tsx` → `frontend/src/pages/Organisation.tsx`

**Änderungen:**
1. Dateiname ändern
2. Komponentenname: `const UserManagement` → `const Organisation`
3. Export: `export default UserManagement` → `export default Organisation`
4. Alle `t('userManagement.xxx')` → `t('organisation.xxx')`
5. Variablennamen: `canViewUserManagement` → `canViewOrganisation` (optional)

### Schritt 2: Route in App.tsx ändern

**Datei:** `frontend/src/App.tsx`

**Änderungen:**
```typescript
// Zeile 27:
const Organisation = React.lazy(() => import('./pages/Organisation.tsx'));

// Zeile 112-116:
<Route path="/organization" element={
  <Suspense fallback={<LoadingScreen />}>
    <Organisation />
  </Suspense>
} />
```

### Schritt 3: Übersetzungen anpassen

**Datei:** `frontend/src/i18n/locales/de.json`

**Änderungen:**
```json
// ALT:
"userManagement": {
  "title": "Benutzerverwaltung",
  ...
}

// NEU:
"organisation": {
  "title": "Organisation",
  ...
}
```

**Alle 3 Sprachen ändern:** `de.json`, `en.json`, `es.json`

### Schritt 4: Sidebar-Navigation finden und ändern

**Suche:** Wo wird `/users` referenziert?

**Änderungen:**
- Route von `/users` zu `/organization` oder `/organisation`
- Übersetzungs-Schlüssel anpassen

### Schritt 5: Middleware korrigieren

**Datei:** `backend/src/middleware/organization.ts`

**Wichtig:**
- `organizationId` NULL zu sein ist KORREKT für User ohne Organisation
- Middleware sollte durchlaufen, auch wenn `organizationId` NULL ist
- Funktionen die Organisation benötigen sollten selbst prüfen

---

## Reihenfolge der Implementierung

1. **Schritt 1:** Datei umbenennen (`UserManagement.tsx` → `Organisation.tsx`)
2. **Schritt 2:** Komponente anpassen (Komponentenname, Übersetzungs-Schlüssel)
3. **Schritt 3:** Route in App.tsx ändern
4. **Schritt 4:** Übersetzungen ändern (alle 3 Sprachen)
5. **Schritt 5:** Sidebar-Navigation finden und ändern
6. **Schritt 6:** Middleware-Kommentare verbessern (klarstellen dass NULL korrekt ist)
7. **Schritt 7:** Fehlermeldungen verbessern (freundlicher für User ohne Organisation)

---

## Wichtige Erkenntnisse

### User ohne Organisation:
- ✅ **MUSS existieren können** - laut Dokumentation korrekt
- ✅ **User-Rolle ohne Organisation** ist der Standard bei Registrierung
- ✅ **organizationId = NULL** ist korrekt für User ohne Organisation
- ✅ Middleware sollte durchlaufen, auch wenn `organizationId` NULL ist

### User muss immer aktive Rolle haben:
- ✅ Login stellt sicher, dass immer eine aktive Rolle existiert
- ✅ Wenn keine gefunden wird, wird automatisch eine aktiviert
- ✅ Wenn User gar keine Rolle hat, gibt Login Fehler zurück
- ⚠️ Middleware sollte trotzdem prüfen (Defensive Programming)

### Beitrittsanfragen für User ohne Organisation:
- ❌ **Können keine Beitrittsanfragen für ihre Organisation sehen** (weil sie keine haben)
- ✅ **Sollten klare Fehlermeldung bekommen** statt leerer Liste
- ✅ **Sollten Beitrittsanfragen STELLEN können** (über `/join-request` Route ohne Middleware)


