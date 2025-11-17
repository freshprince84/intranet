# Onboarding-Tour: Vollständiger Implementierungsplan

## Status
**Erstellt:** 2024  
**Letzte Aktualisierung:** 2024  
**Status:** ✅ Implementiert - Alle Änderungen umgesetzt

## Übersicht

Dieses Dokument beschreibt den vollständigen, korrigierten Plan für die Einführungstour mit folgenden Kernprinzipien:

1. **KEINE automatischen Navigationen** - User entscheidet selbst, wohin er navigiert
2. **Modal bleibt bestehen** - Auch wenn User navigiert, wird dasselbe Modal nochmal angezeigt
3. **Bis "Omitir" geklickt wird** - Schritt wird als dismissed markiert und zum nächsten Schritt weitergegangen

## Korrekte Reihenfolge der Tour

1. **Nach Registrierung:** Tour startet im Dashboard (Welcome-Schritt)
2. **Weiter zu Profile:** Basisdaten ausfüllen (email, username, language), falls nötig
3. **Weiter zu Organisation:** Entweder direkt von Dashboard (wenn Basisdaten vollständig) oder von Profile (nach Vervollständigung)
4. **Auf Organisationsseite:** Schulung zu Org-Neugründung & Org-Beitritt
5. **Nach Org-Beitritt (sobald akzeptiert):** Direkt Anweisung zum Rollenwechsel
6. **Nach Rollenwechsel:** Anweisung zum Profil für erweiterte Basisdaten (Pass/ID hochladen)
7. **Danach:** Normale Tour (Dashboard → Requests → ...)
8. **Wenn keine Organisation beigetreten:** Normale Tour (Dashboard → Requests → ...)

## Aktuelle Probleme (Analyse)

### 1. Automatische Navigationen (KRITISCH)
- **Problem:** `completeStep` navigiert automatisch (Zeilen 625-627, 647-649, 669-671, 694-696)
- **Problem:** `startTour` navigiert automatisch (Zeilen 242-248)
- **Auswirkung:** User kann nicht selbst entscheiden, wohin er navigiert

### 2. Modal wird nicht auf allen Seiten angezeigt (KRITISCH)
- **Problem:** `isStepForCurrentRoute` prüft Route (OnboardingTour.tsx Zeile 37-47)
- **Auswirkung:** Modal wird nur auf bestimmter Route angezeigt, nicht auf allen Seiten

### 3. Modal wird nicht wieder angezeigt nach Navigation (KRITISCH)
- **Problem:** `useEffect` zeigt Modal nur wieder an, wenn Profil unvollständig (Zeile 471-493)
- **Auswirkung:** Modal verschwindet nach Navigation und wird nicht wieder angezeigt

### 4. Reihenfolge der Schritte falsch (KRITISCH)
- **Problem:** `switch_role_after_join`: order 0 (sollte 0.5 sein)
- **Problem:** `upload_identification_document`: order 1 (sollte 0.75 sein)
- **Problem:** `welcome`: order 0 (korrekt, aber Konflikt mit switch_role_after_join)

### 5. User-Reload nach Org-Beitritt fehlt (KRITISCH)
- **Problem:** `handleJoinSuccess` ruft nur `fetchOrganization()` auf, nicht `fetchCurrentUser()`
- **Auswirkung:** User-Rollen werden nicht neu geladen, neue Rolle ist nicht sichtbar

### 6. Welcome-Beschreibung falsch (UX)
- **Problem:** Beschreibung sagt "Wir leiten Sie jetzt zur Organisation-Seite weiter"
- **Auswirkung:** Irreführend, da wir nicht automatisch navigieren

## Edge Cases und vergessene Szenarien

### 1. Org-Beitritt wird abgelehnt
- **Frage:** Was passiert, wenn Beitrittsanfrage abgelehnt wird?
- **Lösung:** Modal sollte weiterhin angezeigt werden, bis User "Omitir" klickt

### 2. Org-Gründung wird abgebrochen
- **Frage:** Was passiert, wenn User Org-Gründung abbricht?
- **Lösung:** Modal sollte weiterhin angezeigt werden, bis User "Omitir" klickt

### 3. User hat bereits Dokument (Kolumbien)
- **Status:** `needsIdentificationDocument` prüft bereits, ob Dokument vorhanden ist
- **Aktion:** Prüfen ob Logik korrekt funktioniert

### 4. User ist nicht in Kolumbien
- **Status:** `needsIdentificationDocument` prüft bereits `organization?.country !== 'CO'`
- **Aktion:** Prüfen ob Logik korrekt funktioniert

### 5. User tritt mehreren Organisationen bei
- **Frage:** Was passiert, wenn User mehreren Organisationen beitritt?
- **Lösung:** Erste inaktive Rolle wird für Rollenwechsel-Schritt verwendet

### 6. Rolle ist nicht im Menü sichtbar
- **Frage:** Ist die Rolle wirklich im Menü sichtbar?
- **Aktion:** Prüfen, ob Header die Rolle anzeigt

## UX-Probleme

### 1. Modal verschwindet nach Navigation
- **Problem:** User navigiert → Modal verschwindet → User ist verwirrt
- **Lösung:** Modal auf allen Seiten anzeigen, bis "Omitir" geklickt wird

### 2. Keine klare Anweisung
- **Problem:** User weiß nicht, was er tun soll
- **Lösung:** Bessere Beschreibungen in den Modals

### 3. Automatische Navigationen sind störend
- **Problem:** User wird "herumgeschubst"
- **Lösung:** Keine automatischen Navigationen, User entscheidet selbst

### 4. Modal wird nicht wieder angezeigt
- **Problem:** User navigiert weg → Modal verschwindet → User vergisst, was zu tun ist
- **Lösung:** Modal immer wieder anzeigen, bis "Omitir" geklickt wird

## Lösungsplan

### 1. Alle automatischen Navigationen entfernen

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

#### In `completeStep` (Zeile 603-702):
- **Entfernen:** Alle `navigate()` Aufrufe (Zeilen 625-627, 647-649, 669-671, 694-696)
- **Behalten:** Nur Schritt als completed markieren und zum nächsten Schritt wechseln (ohne Navigation)

**Konkrete Änderungen:**
```typescript
// ENTFERNEN: Alle navigate() Aufrufe in completeStep
// VORHER:
if (nextStep?.route && nextStep.route !== '/profile') {
  navigate(nextStep.route);
}

// NACHHER:
// Keine Navigation - User entscheidet selbst
```

#### In `startTour` (Zeile 207-265):
- **Entfernen:** Alle Navigationen außer initial zum Dashboard (Zeilen 242-245)
- **Behalten:** Nur initial zum Dashboard navigieren, wenn Tour startet (Zeile 246-248)

**Konkrete Änderungen:**
```typescript
// ENTFERNEN: Navigationen zu /profile und /organization
// VORHER:
if (!profileComplete && location.pathname !== '/profile') {
  navigate('/profile');
} else if (!hasOrganization && organizationStepIndex !== -1 && location.pathname !== '/organization') {
  navigate('/organization');
} else if (location.pathname !== '/dashboard') {
  navigate('/dashboard');
}

// NACHHER:
// Nur initial zum Dashboard navigieren
if (location.pathname !== '/dashboard') {
  navigate('/dashboard');
}
```

### 2. Modal auf allen Seiten anzeigen

**Datei:** `frontend/src/components/OnboardingTour.tsx`

#### In `isStepForCurrentRoute` (Zeile 37-47):
- **Ändern:** Logik so anpassen, dass Modal immer angezeigt wird, wenn Schritt aktiv ist (nicht nur auf bestimmter Route)
- **Ausnahme:** Nur wenn Schritt dismissed ist

**Konkrete Änderungen:**
```typescript
// VORHER:
const isStepForCurrentRoute = currentStepData?.route 
  ? (currentStepData.action === 'navigate' 
      ? location.pathname === currentStepData.route || ...
      : location.pathname === currentStepData.route || ...)
  : true;

// NACHHER:
// Modal immer anzeigen, wenn Schritt aktiv ist (außer wenn dismissed)
const isStepForCurrentRoute = true; // Modal wird auf allen Seiten angezeigt
```

### 3. Modal nach Navigation wieder anzeigen

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

#### In `useEffect` (Zeile 471-493):
- **Ändern:** Logik so anpassen, dass Modal immer wieder angezeigt wird, wenn User navigiert (außer wenn dismissed)
- **Nicht nur für unvollständiges Profil, sondern für alle aktiven Schritte**

**Konkrete Änderungen:**
```typescript
// VORHER:
if (isActive && modalDismissedRef.current && previousPathname.current !== location.pathname) {
  previousPathname.current = location.pathname;
  
  const hasOrganization = user?.roles?.some((r: any) => r.role.organization !== null) || false;
  const profileComplete = hasOrganization ? isProfileComplete() : true;
  
  // Nur wenn Profil unvollständig ist, Modal wieder anzeigen
  if (!profileComplete) {
    setTimeout(() => {
      setModalDismissed(false);
    }, 100);
  }
}

// NACHHER:
if (isActive && modalDismissedRef.current && previousPathname.current !== location.pathname) {
  previousPathname.current = location.pathname;
  
  // Modal immer wieder anzeigen, wenn User navigiert (außer wenn dismissed)
  // WICHTIG: Nur wenn Schritt nicht dismissed ist
  const currentStepIndex = currentStep;
  if (!dismissedSteps.includes(currentStepIndex)) {
    setTimeout(() => {
      setModalDismissed(false);
    }, 100);
  }
}
```

### 4. Reihenfolge der Schritte korrigieren

**Datei:** `frontend/src/config/onboardingSteps.ts`

**Korrekte Reihenfolge:**
- `welcome`: order 0 (Dashboard-Start)
- `profile_complete`: order -1 (vor Welcome, wenn nötig)
- `join_or_create_organization`: order 0.25 (nach Welcome/Profile)
- `switch_role_after_join`: order 0.5 (nach Org-Beitritt)
- `upload_identification_document`: order 0.75 (nach Rollenwechsel)
- `dashboard_layout`: order 1 (normale Tour)
- `requests_section`: order 2 (normale Tour)

**Konkrete Änderungen:**
```typescript
// VORHER:
{
  id: 'switch_role_after_join',
  order: 0, // FALSCH
  ...
},
{
  id: 'upload_identification_document',
  order: 1, // FALSCH
  ...
}

// NACHHER:
{
  id: 'switch_role_after_join',
  order: 0.5, // KORREKT
  ...
},
{
  id: 'upload_identification_document',
  order: 0.75, // KORREKT
  ...
}
```

### 5. User-Reload nach Org-Beitritt

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

#### In `handleJoinSuccess` (Zeile 135-138):
- **Hinzufügen:** `fetchCurrentUser()` aufrufen, damit neue Rolle geladen wird
- **OnboardingContext erkennt dann automatisch die neue Rolle**

**Konkrete Änderungen:**
```typescript
// VORHER:
const handleJoinSuccess = () => {
  // Nach Beitritt: Organisation neu laden
  fetchOrganization();
};

// NACHHER:
const handleJoinSuccess = async () => {
  // Nach Beitritt: Organisation neu laden
  fetchOrganization();
  // WICHTIG: User-Rollen neu laden, damit neue Rolle sichtbar wird
  await fetchCurrentUser();
};
```

**WICHTIG:** `fetchCurrentUser` muss aus `useAuth` importiert werden:
```typescript
const { fetchCurrentUser } = useAuth();
```

### 6. Welcome-Beschreibung anpassen

**Datei:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Konkrete Änderungen:**
```json
// VORHER:
"welcome": {
  "title": "Willkommen!",
  "description": "Herzlich willkommen im Intranet! Um das System vollständig nutzen zu können, müssen Sie zunächst einer Organisation beitreten oder eine neue gründen. Wir leiten Sie jetzt zur Organisation-Seite weiter."
}

// NACHHER:
"welcome": {
  "title": "Willkommen!",
  "description": "Herzlich willkommen im Intranet! Als Nächstes müssen Sie einer Organisation beitreten oder eine neue gründen. Sie können selbst zur Organisationsseite navigieren, um eine Organisation zu erstellen oder einer beizutreten."
}
```

### 7. Automatischer Übergang nach Org-Beitritt (ohne Navigation)

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

#### In `useEffect` (Zeile 704-725):
- **Behalten:** Nach Org-Beitritt automatisch zum nächsten Schritt wechseln (Rollenwechsel)
- **Entfernen:** Keine Navigation, nur Schritt-Wechsel

**Konkrete Änderungen:**
```typescript
// VORHER: completeStep ruft navigate() auf
// NACHHER: completeStep ruft KEIN navigate() mehr auf
// User entscheidet selbst, wohin er navigiert
```

### 8. Prüfung: Rolle im Menü sichtbar

**Datei:** `frontend/src/components/Header.tsx`

**Zu prüfen:**
- Werden inaktive Rollen im Rollenmenü angezeigt?
- Wenn nicht, muss das gefixt werden

**Aktueller Code (Header.tsx Zeile 345-410):**
- Prüfen ob `availableRoles` alle Rollen enthält (auch inaktive)
- Prüfen ob Filter korrekt ist

## Implementierungsreihenfolge

1. ✅ **Schritt 1:** Alle automatischen Navigationen entfernen - **FERTIG**
2. ✅ **Schritt 2:** Modal auf allen Seiten anzeigen - **FERTIG**
3. ✅ **Schritt 3:** Modal nach Navigation wieder anzeigen - **FERTIG**
4. ✅ **Schritt 4:** Reihenfolge der Schritte korrigieren - **FERTIG**
5. ✅ **Schritt 5:** User-Reload nach Org-Beitritt - **FERTIG**
6. ✅ **Schritt 6:** Welcome-Beschreibung anpassen - **FERTIG**
7. ✅ **Schritt 7:** Prüfung: Rolle im Menü sichtbar - **FERTIG** (Rollen werden korrekt angezeigt)

## Test-Szenarien

### 1. Neuer Benutzer ohne Organisation
- **Szenario:** Profil vollständig (username, email, language) → Tour startet mit Welcome auf Dashboard
- **Erwartung:** Modal wird angezeigt, User kann selbst zur Organisation navigieren
- **Nach Navigation:** Modal wird wieder angezeigt (außer wenn dismissed)

### 2. Neuer Benutzer mit unvollständigem Profil
- **Szenario:** Profil unvollständig → Tour startet mit Profil-Schritt
- **Erwartung:** Modal wird angezeigt, User kann Profil vervollständigen
- **Nach Profil-Vollständigkeit:** Modal wechselt zu Organisation-Schritt (ohne Navigation)

### 3. Organisation-Schritt überspringen
- **Szenario:** User klickt "Omitir" auf Organisation-Schritt
- **Erwartung:** Schritt wird als dismissed markiert, Tour geht weiter mit normaler Tour (Dashboard → Requests)

### 4. Org-Beitritt wird akzeptiert
- **Szenario:** User tritt Organisation bei → Beitritt wird akzeptiert
- **Erwartung:** User-Rollen werden neu geladen, Rollenwechsel-Schritt wird angezeigt
- **Nach Rollenwechsel:** Dokumenten-Upload-Schritt wird angezeigt (wenn Kolumbien)

### 5. User navigiert während Tour
- **Szenario:** User ist auf Organisation-Schritt, navigiert zu Dashboard
- **Erwartung:** Modal wird auf Dashboard wieder angezeigt (außer wenn dismissed)

### 6. Mehrere Organisationen
- **Szenario:** User tritt mehreren Organisationen bei
- **Erwartung:** Erste inaktive Rolle wird für Rollenwechsel-Schritt verwendet

## Zusammenfassung der Änderungen

1. ✅ Alle `navigate()` Aufrufe in `completeStep` entfernen
2. ✅ Alle `navigate()` Aufrufe in `startTour` entfernen (außer initial zum Dashboard)
3. ✅ `isStepForCurrentRoute` Logik anpassen: Modal immer anzeigen, wenn Schritt aktiv ist
4. ✅ Modal nach Navigation wieder anzeigen (für alle aktiven Schritte)
5. ✅ Reihenfolge der Schritte korrigieren
6. ✅ `handleJoinSuccess` erweitern: `fetchCurrentUser()` aufrufen
7. ✅ Welcome-Beschreibung anpassen
8. ✅ Automatischer Übergang nach Org-Beitritt (ohne Navigation)
9. ✅ Prüfung: Rolle im Menü sichtbar

## Offene Fragen

1. **Was passiert, wenn Org-Beitritt abgelehnt wird?**
   - Modal sollte weiterhin angezeigt werden, bis User "Omitir" klickt

2. **Was passiert, wenn Org-Gründung abgebrochen wird?**
   - Modal sollte weiterhin angezeigt werden, bis User "Omitir" klickt

3. **Ist Rolle wirklich im Menü sichtbar?**
   - Muss geprüft werden in Header.tsx

## Implementierungsdetails

### Durchgeführte Änderungen

#### 1. Automatische Navigationen entfernt
- ✅ Alle `navigate()` Aufrufe in `completeStep` entfernt
- ✅ Alle `navigate()` Aufrufe in `startTour` entfernt (außer initial Dashboard)
- ✅ `navigate` aus Dependencies von `completeStep` entfernt

#### 2. Modal auf allen Seiten angezeigt
- ✅ `isStepForCurrentRoute` auf `true` gesetzt
- ✅ Modal wird jetzt auf allen Seiten angezeigt, wenn Schritt aktiv ist

#### 3. Modal nach Navigation wieder angezeigt
- ✅ `useEffect` angepasst: Modal wird immer wieder angezeigt (außer wenn dismissed)
- ✅ Prüfung auf `dismissedSteps` statt nur auf Profil-Vollständigkeit

#### 4. Reihenfolge korrigiert
- ✅ `switch_role_after_join`: order von 0 auf 0.5 geändert
- ✅ `upload_identification_document`: order von 1 auf 0.75 geändert

#### 5. User-Reload nach Org-Beitritt
- ✅ `handleJoinSuccess` erweitert: `fetchCurrentUser()` wird aufgerufen
- ✅ `useAuth` importiert

#### 6. Welcome-Beschreibung angepasst
- ✅ Deutsch: "Sie können selbst zur Organisationsseite navigieren"
- ✅ Englisch: "You can navigate to the organization page yourself"
- ✅ Spanisch: "Puede navegar a la página de organización usted mismo"

#### 7. Interface aktualisiert
- ✅ `showCondition` Typ erweitert: `'hasInactiveOrgRole' | 'needsIdentificationDocument' | 'hasNoOrganization'`

### Wichtige Hinweise

**Automatischer Schritt-Wechsel für Navigations-Schritte:**
- Es gibt noch einen `useEffect` (Zeile 419-455), der automatisch zum nächsten Schritt wechselt, wenn User zu einer Ziel-Route navigiert hat
- Dies betrifft nur Schritte mit `action: 'navigate'` (z.B. worktracker_menu, cerebro_menu)
- Dies ist OK, da diese Schritte explizit den User auffordern zu navigieren
- Der User navigiert selbst, und dann wechselt der Schritt automatisch - keine automatische Navigation

## Nächste Schritte

1. ✅ Implementierung abgeschlossen
2. ⏳ Test-Szenarien durchführen
3. ⏳ Dokumentation finalisieren

