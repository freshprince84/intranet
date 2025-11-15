# Onboarding-Tour: Organisation-Schritt für neue Benutzer

## Problem-Analyse

### Aktuelles Problem
Bei einem ganz neuen Benutzer (Rolle "user") ohne Organisation kommt **gar keine Tour-Anweisung**.

### Root Cause Analyse

1. **Tour wird nicht gestartet für User ohne Organisation:**
   - In `OnboardingContext.tsx` Zeile 256: Wenn User keine Organisation hat, wird `profileComplete` als `true` gesetzt ("Vor Organisation: Profil gilt als vollständig")
   - In Zeile 290-295: Wenn Profil vollständig ist UND Tour noch nicht gestartet wurde, wird die Tour **NICHT** gestartet
   - **Ergebnis**: Neue Benutzer ohne Organisation bekommen keine Tour

2. **Kein Organisation-Schritt vorhanden:**
   - In `onboardingSteps.ts` gibt es keinen Schritt, der den Benutzer zur Organisation-Seite führt
   - Es gibt nur `switch_role_after_join` (Zeile 25-39), aber das setzt voraus, dass der User bereits einer Organisation beigetreten ist

3. **Country als Mussfeld markiert:**
   - In `Profile.tsx` Zeile 400: `{t('profile.country')} <span className="text-red-500">*</span>`
   - In i18n-Dateien wird "country" noch als Pflichtfeld erwähnt
   - Laut Anforderung soll country **KEIN** Mussfeld sein (nur username, email, language)

## Anforderungen

1. **Wenn Profil-Basisdaten vollständig sind** (username, email, sprache; **NICHT** country):
   - Danach per Tour zu Organisation geleitet werden
   - Dort kann einer Organisation beigetreten werden oder eine gegründet werden

2. **Falls Organisation-Schritt übersprungen wird:**
   - Bei Dashboard weitermachen mit der Tour

3. **Country ist KEIN Mussfeld:**
   - `*` für country entfernen
   - `required` Attribut entfernen
   - i18n-Dateien aktualisieren

## Lösungsplan

### Schritt 1: Country als Mussfeld entfernen

**Datei:** `frontend/src/pages/Profile.tsx`
- Zeile 400: `*` entfernen
- Zeile 408: `required` Attribut entfernen

**Dateien:** `frontend/src/i18n/locales/*.json` (de.json, en.json, es.json)
- `onboarding.steps.profile_complete.description`: "country" aus der Liste der Pflichtfelder entfernen

### Schritt 2: Organisation-Schritt in onboardingSteps.ts hinzufügen

**Datei:** `frontend/src/config/onboardingSteps.ts`

Neuer Schritt nach `profile_complete` und vor `switch_role_after_join`:

```typescript
{
  id: 'join_or_create_organization',
  title: 'onboarding.steps.join_or_create_organization.title',
  description: 'onboarding.steps.join_or_create_organization.description',
  target: '[data-onboarding="organization-buttons"]',
  position: 'bottom',
  route: '/organisation',
  order: 0.25, // Zwischen profile_complete (-1) und switch_role_after_join (0)
  page: 'organisation',
  process: 'organization-setup',
  action: 'wait', // Wartet auf Organisation-Beitritt/Gründung
  roleFilter: ['User', 'Hamburger', 'Admin'],
  showCondition: 'hasNoOrganization' // NEU: Nur anzeigen wenn User KEINE Organisation hat
}
```

### Schritt 3: showCondition 'hasNoOrganization' in OnboardingContext.tsx implementieren

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

1. **Neue Funktion hinzufügen** (nach `needsIdentificationDocument`, ca. Zeile 117):
```typescript
// Prüfe ob User keine Organisation hat
const hasNoOrganization = useCallback((): boolean => {
  if (!user || !user.roles) return true; // Keine Rollen = keine Organisation
  
  // Prüfe ob User eine Rolle mit Organisation hat
  const hasOrg = user.roles.some((r: any) => r.role.organization !== null);
  
  return !hasOrg; // true wenn KEINE Organisation vorhanden
}, [user]);
```

2. **In filterStepsByPermissions erweitern** (ca. Zeile 132):
```typescript
if (step.showCondition === 'hasNoOrganization') {
  if (!hasNoOrganization()) {
    return false;
  }
}
```

3. **hasNoOrganization zu Dependencies hinzufügen** (Zeile 164):
```typescript
}, [permissions, currentRole, hasInactiveOrgRole, needsIdentificationDocument, hasNoOrganization]);
```

### Schritt 4: Tour-Start-Logik anpassen

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Problem:** Zeile 256 setzt `profileComplete = true` für User ohne Organisation, was dazu führt, dass die Tour nicht gestartet wird (Zeile 290-295).

**Lösung:** Logik anpassen, damit Tour auch für User ohne Organisation gestartet wird, wenn Profil vollständig ist:

1. **In loadStatus useEffect (ca. Zeile 253-295):**
   - Prüfe: Wenn Profil vollständig ist (username, email, language) UND User keine Organisation hat → Tour starten mit Organisation-Schritt
   - Prüfe: Wenn Profil vollständig ist UND User hat Organisation → Tour starten mit Welcome-Schritt (Dashboard)

2. **In startTour Funktion (ca. Zeile 189-235):**
   - Prüfe: Wenn Profil vollständig ist UND User keine Organisation hat → Starte mit Organisation-Schritt
   - Prüfe: Wenn Profil vollständig ist UND User hat Organisation → Starte mit Welcome-Schritt

**Konkrete Änderungen:**

**Zeile 189-235 (startTour):**
```typescript
const startTour = useCallback(async () => {
  if (!user) return;

  // Prüfe ob Profil vollständig ist (username, email, language)
  const profileComplete = isProfileComplete();
  const hasOrganization = user.roles?.some((r: any) => r.role.organization !== null) || false;
  
  // Finde Schritte
  const profileStepIndex = filteredSteps.findIndex(s => s.id === 'profile_complete');
  const organizationStepIndex = filteredSteps.findIndex(s => s.id === 'join_or_create_organization');
  const welcomeStepIndex = filteredSteps.findIndex(s => s.id === 'welcome');
  
  let initialStep = 0;
  
  if (!profileComplete && profileStepIndex !== -1) {
    // Profil unvollständig → Starte mit Profil-Schritt
    initialStep = profileStepIndex;
  } else if (!hasOrganization && organizationStepIndex !== -1) {
    // Profil vollständig, aber keine Organisation → Starte mit Organisation-Schritt
    initialStep = organizationStepIndex;
  } else if (welcomeStepIndex !== -1) {
    // Profil vollständig und Organisation vorhanden → Starte mit Welcome-Schritt
    initialStep = welcomeStepIndex;
  }
  
  setIsActive(true);
  setCurrentStep(initialStep);
  setCompletedSteps([]);

  // Modal nur anzeigen, wenn es nicht explizit geschlossen wurde
  if (!modalDismissedRef.current) {
    setModalDismissed(false);
  }

  // Navigiere zur entsprechenden Seite
  if (!profileComplete && location.pathname !== '/profile') {
    navigate('/profile');
  } else if (!hasOrganization && organizationStepIndex !== -1 && location.pathname !== '/organisation') {
    navigate('/organisation');
  } else if (hasOrganization && location.pathname !== '/dashboard') {
    navigate('/dashboard');
  }

  // Track Start-Event
  await trackEvent('tour', 'Onboarding Tour', 'started');

  // Speichere Start-Zeitpunkt
  try {
    await axiosInstance.put(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, {
      currentStep: initialStep,
      completedSteps: [],
      onboardingStartedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fehler beim Speichern des Start-Zeitpunkts:', error);
  }
}, [user, trackEvent, filteredSteps, isProfileComplete, location.pathname, navigate]);
```

**Zeile 253-295 (loadStatus useEffect):**
```typescript
if (!statusData.onboardingCompleted) {
  // Prüfe ob Profil vollständig ist (username, email, language)
  const profileComplete = isProfileComplete();
  const hasOrganization = user.roles?.some((r: any) => r.role.organization !== null) || false;
  
  // Wenn Profil vollständig ist UND Tour bereits gestartet wurde, setze Tour fort
  if (profileComplete && statusData.onboardingStartedAt) {
    // Profil vollständig und Tour bereits gestartet → Tour fortsetzen
    if (statusData.onboardingProgress) {
      setCurrentStep(statusData.onboardingProgress.currentStep);
      setCompletedSteps(statusData.onboardingProgress.completedSteps);
    }
    setIsActive(true);
    if (!modalDismissedRef.current) {
      setModalDismissed(false);
    }
  } else if (!profileComplete) {
    // Profil unvollständig → Tour starten/fortsetzen
    if (statusData.onboardingProgress) {
      setCurrentStep(statusData.onboardingProgress.currentStep);
      setCompletedSteps(statusData.onboardingProgress.completedSteps);
    }
    if (!statusData.onboardingStartedAt) {
      setTimeout(() => {
        startTour();
      }, 500);
    } else {
      setIsActive(true);
      if (!modalDismissedRef.current) {
        setModalDismissed(false);
      }
    }
  } else if (!hasOrganization) {
    // Profil vollständig, aber keine Organisation → Tour starten mit Organisation-Schritt
    if (statusData.onboardingProgress) {
      setCurrentStep(statusData.onboardingProgress.currentStep);
      setCompletedSteps(statusData.onboardingProgress.completedSteps);
    }
    if (!statusData.onboardingStartedAt) {
      setTimeout(() => {
        startTour();
      }, 500);
    } else {
      setIsActive(true);
      if (!modalDismissedRef.current) {
        setModalDismissed(false);
      }
    }
  } else {
    // Profil vollständig und Organisation vorhanden, aber Tour noch nicht gestartet → Tour starten mit Welcome
    if (!statusData.onboardingStartedAt) {
      setTimeout(() => {
        startTour();
      }, 500);
    } else {
      setIsActive(true);
      if (!modalDismissedRef.current) {
        setModalDismissed(false);
      }
    }
  }
} else {
  // Onboarding bereits abgeschlossen → Tour nicht anzeigen
  setIsActive(false);
  setModalDismissed(true);
}
```

### Schritt 5: data-onboarding Attribute in OrganizationSettings.tsx hinzufügen

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Zeile 146-167:** Buttons mit `data-onboarding` Attribut versehen:

```typescript
<div className="flex items-center" data-onboarding="organization-buttons">
  {/* Button: Neue Organisation erstellen */}
  <button
    onClick={() => setIsCreateModalOpen(true)}
    data-onboarding="create-organization-button"
    className="..."
  >
    <PlusIcon className="h-4 w-4" />
  </button>
  
  {/* Button: Organisation beitreten */}
  <button
    onClick={() => setIsJoinModalOpen(true)}
    data-onboarding="join-organization-button"
    className="..."
  >
    <UserPlusIcon className="h-4 w-4" />
  </button>
</div>
```

### Schritt 6: i18n-Übersetzungen hinzufügen

**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Hinzufügen in `onboarding.steps`:**
```json
"join_or_create_organization": {
  "title": "Organisation beitreten oder gründen",
  "description": "Um das System vollständig nutzen zu können, müssen Sie einer Organisation beitreten oder eine neue gründen. Klicken Sie auf die Buttons oben, um eine Organisation zu erstellen oder einer beizutreten."
}
```

**Aktualisieren in `onboarding.steps.profile_complete.description`:**
- "country" aus der Liste der Pflichtfelder entfernen
- Nur noch: "username, email, and language"

### Schritt 7: Automatischer Schritt-Wechsel nach Organisation-Beitritt/Gründung

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**In completeStep Funktion (ca. Zeile 497-552):**
- Nach `profile_complete` automatisch zum nächsten Schritt wechseln (bereits vorhanden)
- **NEU:** Nach `join_or_create_organization` automatisch zum nächsten Schritt wechseln

```typescript
// Wenn join_or_create_organization Schritt abgeschlossen, automatisch zum nächsten Schritt wechseln
if (stepId === 'join_or_create_organization' && currentStep === stepIndex) {
  // Warte kurz, damit UI aktualisiert werden kann
  setTimeout(() => {
    setCurrentStep(prevStep => {
      if (prevStep < filteredSteps.length - 1) {
        const nextStepIndex = prevStep + 1;
        saveProgress(nextStepIndex, newCompletedSteps);
        
        // Navigiere zum nächsten Schritt (switch_role_after_join oder welcome)
        const nextStep = filteredSteps[nextStepIndex];
        if (nextStep?.route) {
          navigate(nextStep.route);
        }
        
        return nextStepIndex;
      }
      return prevStep;
    });
  }, 500);
}
```

**WICHTIG:** Der Schritt `join_or_create_organization` muss als "abgeschlossen" markiert werden, wenn:
- User einer Organisation beigetreten ist ODER
- User eine Organisation gegründet hat

Dies kann durch einen `useEffect` in `OnboardingContext.tsx` oder durch eine Prüfung in `completeStep` erfolgen.

## Implementierungsreihenfolge

1. ✅ **Schritt 1:** Country als Mussfeld entfernen (Profile.tsx + i18n)
2. ✅ **Schritt 2:** Organisation-Schritt in onboardingSteps.ts hinzufügen
3. ✅ **Schritt 3:** showCondition 'hasNoOrganization' implementieren
4. ✅ **Schritt 4:** Tour-Start-Logik anpassen
5. ✅ **Schritt 5:** data-onboarding Attribute hinzufügen
6. ✅ **Schritt 6:** i18n-Übersetzungen hinzufügen
7. ✅ **Schritt 7:** Automatischer Schritt-Wechsel implementieren

## Test-Szenarien

1. **Neuer Benutzer ohne Organisation:**
   - Profil vollständig (username, email, language) → Tour startet mit Organisation-Schritt
   - Organisation-Schritt führt zu `/organisation`
   - Nach Organisation-Beitritt/Gründung → Weiter mit Dashboard-Tour

2. **Neuer Benutzer mit unvollständigem Profil:**
   - Profil unvollständig → Tour startet mit Profil-Schritt
   - Nach Profil-Vollständigkeit → Weiter mit Organisation-Schritt

3. **Organisation-Schritt überspringen:**
   - User kann Schritt überspringen → Weiter mit Dashboard-Tour

4. **Country ist optional:**
   - Profil kann ohne country gespeichert werden
   - Kein `*` und kein `required` Attribut

