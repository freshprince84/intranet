# Tour-Modul für Rollenwechsel nach Organisation-Beitritt - Analyse und Plan

**Erstellt:** 2025-01-30  
**Status:** Analyse abgeschlossen, Planung erstellt  
**Problem:** Tour-Modul fehlt, das User nach Organisation-Beitritt zeigt, dass er die Rolle wechseln kann

## Problembeschreibung

Wenn ein User einer neuen Organisation beitritt:
1. Er erhält eine Notification über die Genehmigung (FAKT: `notifyJoinRequestStatus` wird aufgerufen)
2. Er erhält eine neue Rolle mit `lastUsed: false` (FAKT: Zeile 288 in `joinRequestController.ts`)
3. **PROBLEM:** Es fehlt ein Tour-Modul, das ihm zeigt, dass er die Rolle wechseln kann, um zur neuen Organisation zu wechseln

## Aktuelle Situation - Fakten

### 1. Tour-Schritt existiert bereits

**Datei:** `frontend/src/config/onboardingSteps.ts`

**Aktueller Code (Zeilen 40-57):**
```typescript
{
  id: 'switch_role_after_join',
  title: 'onboarding.steps.switch_role_after_join.title',
  description: 'onboarding.steps.switch_role_after_join.description',
  target: '[data-onboarding="switch-role-menu"]',
  position: 'bottom',
  route: '/dashboard',
  order: 0.5, // Nach Org-Beitritt, vor Dokumenten-Upload
  page: 'dashboard',
  process: 'role-switch',
  action: 'wait', // Wartet auf Rollenwechsel
  roleFilter: ['User', 'Hamburger', 'Admin'],
  // Nur anzeigen wenn User neue Rolle mit Organisation hat, die noch nicht aktiv ist
  showCondition: 'hasInactiveOrgRole'
}
```

**FAKT:** Der Tour-Schritt existiert bereits.

### 2. showCondition 'hasInactiveOrgRole' existiert

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Aktueller Code (Zeilen 79-96):**
```typescript
const hasInactiveOrgRole = useCallback((): boolean => {
  if (!user || !user.roles) return false;
  
  // Finde aktive Rolle (lastUsed: true)
  const activeRole = user.roles.find((r: any) => r.lastUsed === true);
  
  // Wenn aktive Rolle bereits eine Organisation hat, keine neue Rolle vorhanden
  if (activeRole?.role?.organization !== null) {
    return false;
  }
  
  // Prüfe ob es eine Rolle mit Organisation gibt, die nicht aktiv ist
  const hasInactiveOrgRole = user.roles.some((r: any) => 
    !r.lastUsed && r.role.organization !== null
  );
  
  return hasInactiveOrgRole;
}, [user]);
```

**FAKT:** Die Bedingung existiert und prüft korrekt.

### 3. Target-Element existiert

**Datei:** `frontend/src/components/Header.tsx`

**Aktueller Code (Zeile 479):**
```typescript
<button
  data-onboarding="switch-role-menu"
  ref={roleMenuButtonRef}
  onClick={() => setIsRoleSubMenuOpen(!isRoleSubMenuOpen)}
  // ...
>
```

**FAKT:** Das Target-Element existiert im Header.

### 4. Rollenwechsel schließt Tour-Schritt ab

**Datei:** `frontend/src/components/Header.tsx`

**Aktueller Code (Zeilen 202-208):**
```typescript
// Prüfe ob switch_role_after_join Schritt aktiv ist und schließe ihn ab
try {
  await completeStep('switch_role_after_join', t('onboarding.steps.switch_role_after_join.title') || 'Rolle wechseln');
} catch (error) {
  // Fehler beim Abschließen blockiert nicht den Rollenwechsel
  console.error('Fehler beim Abschließen des switch_role_after_join Schritts:', error);
}
```

**FAKT:** Der Rollenwechsel schließt den Tour-Schritt automatisch ab.

### 5. Notification wird gesendet

**Datei:** `backend/src/controllers/joinRequestController.ts`

**Aktueller Code (Zeilen 297-303):**
```typescript
// 🔔 Benachrichtige Requester über Entscheidung
await notifyJoinRequestStatus(
  joinRequest.requesterId,
  joinRequest.organization.displayName,
  action === 'approve' ? 'approved' : 'rejected',
  requestId
);
```

**FAKT:** Eine Notification wird gesendet, wenn der Beitritt genehmigt wird.

### 6. Neue Rolle wird mit lastUsed: false erstellt

**Datei:** `backend/src/controllers/joinRequestController.ts`

**Aktueller Code (Zeilen 284-290):**
```typescript
await tx.userRole.create({
  data: {
    userId: joinRequest.requesterId,
    roleId: targetRoleId,
    lastUsed: false // Nicht als aktiv setzen, da User bereits andere Rolle haben könnte
  }
});
```

**FAKT:** Die neue Rolle wird mit `lastUsed: false` erstellt.

## Problem-Analyse

### Warum wird der Tour-Schritt möglicherweise nicht angezeigt?

**Mögliche Ursachen:**

1. **User wird nicht aktualisiert nach Beitritt**
   - **FAKT:** Nach dem Beitritt wird `fetchCurrentUser()` NICHT automatisch aufgerufen
   - **Problem:** `OnboardingContext` verwendet `const { user } = useAuth()`, der nicht aktualisiert wird
   - **Auswirkung:** `hasInactiveOrgRole()` gibt `false` zurück, weil der User im Frontend noch die alte Rolle hat

2. **Tour wird nicht neu evaluiert nach User-Update**
   - **FAKT:** `filteredSteps` wird bei jedem Render neu berechnet (Zeile 184: `const filteredSteps = filterStepsByPermissions(steps)`)
   - **FAKT:** `filterStepsByPermissions` ist ein `useCallback` mit `hasInactiveOrgRole` in Dependencies (Zeile 182)
   - **Problem:** Wenn `user` sich ändert, wird `hasInactiveOrgRole` neu berechnet, aber nur wenn `user` sich im Auth-Context ändert

3. **Tour wird nicht gestartet/fortgesetzt nach Beitritt**
   - **FAKT:** `loadStatus` useEffect prüft User-Status beim Mount (Zeile 264-392)
   - **Problem:** Wenn User nach Beitritt die Seite nicht neu lädt, wird `loadStatus` nicht erneut ausgeführt

## Lösung

### Option A: fetchCurrentUser() nach Notification-Klick aufrufen

**Vorteil:** User wird aktualisiert, wenn er die Notification sieht

**Nachteil:** User muss Notification klicken

### Option B: Automatisches Polling nach Notification

**Vorteil:** User wird automatisch aktualisiert

**Nachteil:** Zusätzliche API-Calls

### Option C: fetchCurrentUser() beim Laden der Notification-Liste

**Vorteil:** User wird aktualisiert, wenn er Notifications ansieht

**Nachteil:** Nur wenn User Notifications ansieht

### Option D: WebSocket/Real-time Update

**Vorteil:** Sofortige Aktualisierung

**Nachteil:** Komplexe Implementierung

## Empfohlene Lösung

**Option E: Kombination aus Option A und automatischer Prüfung**

1. **Notification-Klick aktualisiert User**
   - Wenn User auf Notification klickt, `fetchCurrentUser()` aufrufen
   - Dann wird `hasInactiveOrgRole()` neu evaluiert
   - Tour-Schritt wird angezeigt, wenn Bedingung erfüllt

2. **Automatische Prüfung beim Laden der Notification-Liste**
   - Wenn Notification-Liste geladen wird, prüfe ob `joinApproved` Notification vorhanden
   - Wenn ja, `fetchCurrentUser()` aufrufen
   - Dann wird `hasInactiveOrgRole()` neu evaluiert

3. **Tour automatisch starten/fortsetzen wenn Bedingung erfüllt**
   - In `OnboardingContext` prüfen: Wenn `hasInactiveOrgRole()` `true` wird, Tour starten/fortsetzen
   - `useEffect` mit `hasInactiveOrgRole()` als Dependency

## Detaillierter Implementierungsplan

### Schritt 1: fetchCurrentUser() nach Notification-Klick aufrufen

**Datei:** `frontend/src/components/NotificationBell.tsx` (oder wo Notification-Klick behandelt wird)

**Änderung:** Wenn User auf `joinApproved` Notification klickt, `fetchCurrentUser()` aufrufen.

**Zu prüfen:** Wo wird Notification-Klick behandelt?

### Schritt 2: fetchCurrentUser() beim Laden der Notification-Liste prüfen

**Datei:** `frontend/src/components/NotificationBell.tsx`

**Änderung:** Nach dem Laden der Notifications prüfen, ob `joinApproved` Notification vorhanden ist. Wenn ja, `fetchCurrentUser()` aufrufen.

### Schritt 3: Tour automatisch starten/fortsetzen wenn hasInactiveOrgRole() true wird

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Änderung:** `useEffect` hinzufügen, der prüft ob `hasInactiveOrgRole()` `true` wird und Tour startet/fortsetzt.

**Code:**
```typescript
// Automatischer Tour-Start wenn User inaktive Org-Rolle erhält
useEffect(() => {
  if (!isActive && hasInactiveOrgRole() && user) {
    // Prüfe ob Tour bereits gestartet wurde
    if (status?.onboardingStartedAt) {
      // Tour fortsetzen
      setIsActive(true);
      // Finde switch_role_after_join Schritt
      const stepIndex = filteredSteps.findIndex(s => s.id === 'switch_role_after_join');
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
        if (!modalDismissedRef.current) {
          setModalDismissed(false);
        }
      }
    } else {
      // Tour starten
      setTimeout(() => {
        startTour();
      }, 500);
    }
  }
}, [hasInactiveOrgRole, isActive, user, status, filteredSteps, startTour]);
```

## Offene Fragen - BEANTWORTET

### 1. Wo wird Notification-Klick behandelt?

**FAKT:** `NotificationBell.tsx` Zeile 169-178
```typescript
const handleNotificationClick = (notification: Notification) => {
  if (!notification.read) {
    markAsRead(notification.id);
  }
  
  const route = getRouteForNotificationType(notification);
  navigate(route);
  
  setAnchorEl(null);
};
```

**Problem:** `getRouteForNotificationType` (Zeile 152-167) behandelt `joinApproved` nicht speziell - es gibt keinen Fall für `organization` oder `joinApproved` Type.

### 2. Wird Notification-Liste automatisch aktualisiert?

**FAKT:** 
- Polling alle 60 Sekunden für `unreadCount` (Zeile 196-201 in `NotificationBell.tsx`)
- Notification-Liste wird beim Öffnen des Popovers geladen (Zeile 236-239)
- Page Visibility API wird verwendet - Polling stoppt wenn Seite nicht sichtbar (Zeile 217-227)

### 3. Soll Tour sofort angezeigt werden oder nach kurzer Verzögerung?

**Empfehlung:** Kurze Verzögerung (500ms) damit User Notification sehen kann

## Detaillierter Implementierungsplan

### Schritt 1: fetchCurrentUser() nach joinApproved Notification-Klick aufrufen

**Datei:** `frontend/src/components/NotificationBell.tsx`

**Änderung:** In `handleNotificationClick` prüfen ob Notification-Type `joinApproved` ist, dann `fetchCurrentUser()` aufrufen.

**Code:**
```typescript
const handleNotificationClick = (notification: Notification) => {
  if (!notification.read) {
    markAsRead(notification.id);
  }
  
  // Wenn joinApproved Notification, User aktualisieren damit Tour-Schritt angezeigt wird
  if (notification.type === 'joinApproved') {
    const { fetchCurrentUser } = useAuth();
    fetchCurrentUser().catch(error => {
      console.error('Fehler beim Aktualisieren des Users nach Org-Beitritt:', error);
    });
  }
  
  const route = getRouteForNotificationType(notification);
  navigate(route);
  
  setAnchorEl(null);
};
```

**Problem:** `useAuth()` kann nicht in `handleNotificationClick` verwendet werden (Hook-Regel). Muss außerhalb aufgerufen werden.

**Lösung:** `useAuth()` Hook am Anfang der Komponente verwenden:
```typescript
const { fetchCurrentUser } = useAuth();
```

### Schritt 2: fetchCurrentUser() beim Laden der Notification-Liste prüfen

**Datei:** `frontend/src/components/NotificationBell.tsx`

**Änderung:** In `fetchRecentNotifications` nach dem Laden prüfen, ob `joinApproved` Notification vorhanden ist. Wenn ja, `fetchCurrentUser()` aufrufen.

**Code:**
```typescript
const fetchRecentNotifications = useCallback(async () => {
  if (!open) return;
  
  setLoading(true);
  try {
    const response = await notificationApi.getNotifications(1, 5);
    // ... existing code ...
    setNotifications(notifications);
    
    // Prüfe ob joinApproved Notification vorhanden ist
    const hasJoinApproved = notifications.some(n => n.type === 'joinApproved' && !n.read);
    if (hasJoinApproved) {
      // User aktualisieren damit Tour-Schritt angezeigt wird
      fetchCurrentUser().catch(error => {
        console.error('Fehler beim Aktualisieren des Users nach Org-Beitritt:', error);
      });
    }
    
    setError(null);
  } catch (err) {
    // ... existing error handling ...
  } finally {
    setLoading(false);
  }
}, [open, fetchCurrentUser]);
```

### Schritt 3: Tour automatisch starten/fortsetzen wenn hasInactiveOrgRole() true wird

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Änderung:** `useEffect` hinzufügen, der prüft ob `hasInactiveOrgRole()` `true` wird und Tour startet/fortsetzt.

**Code:**
```typescript
// Automatischer Tour-Start wenn User inaktive Org-Rolle erhält
useEffect(() => {
  if (!user) return;
  
  const shouldShowTour = hasInactiveOrgRole();
  
  if (shouldShowTour && !isActive) {
    // Prüfe ob Tour bereits gestartet wurde
    if (status?.onboardingStartedAt) {
      // Tour fortsetzen
      setIsActive(true);
      // Finde switch_role_after_join Schritt
      const stepIndex = filteredSteps.findIndex(s => s.id === 'switch_role_after_join');
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
        if (!modalDismissedRef.current) {
          setModalDismissed(false);
        }
      }
    } else {
      // Tour starten
      setTimeout(() => {
        startTour();
      }, 500);
    }
  }
}, [hasInactiveOrgRole, isActive, user, status, filteredSteps, startTour]);
```

### Schritt 4: Navigation für joinApproved Notification

**Datei:** `frontend/src/components/NotificationBell.tsx`

**Änderung:** In `getRouteForNotificationType` Fall für `joinApproved` hinzufügen.

**Code:**
```typescript
const getRouteForNotificationType = (notification: Notification) => {
  switch (notification.type) {
    case 'task':
      return '/tasks';
    case 'request':
      return '/requests';
    case 'user':
      return '/users';
    case 'role':
      return '/roles';
    case 'worktime':
      return '/worktime';
    case 'joinApproved':
      return '/dashboard'; // Navigiere zum Dashboard, wo Tour-Schritt angezeigt wird
    default:
      return '/';
  }
};
```

## Implementierungsreihenfolge

1. **Schritt 1:** `useAuth()` Hook in `NotificationBell.tsx` hinzufügen
2. **Schritt 2:** `fetchCurrentUser()` nach `joinApproved` Notification-Klick aufrufen
3. **Schritt 3:** `fetchCurrentUser()` beim Laden der Notification-Liste prüfen
4. **Schritt 4:** Navigation für `joinApproved` Notification hinzufügen
5. **Schritt 5:** Tour automatisch starten/fortsetzen wenn `hasInactiveOrgRole()` `true` wird

## Übersetzungen

**FAKT:** Übersetzungen existieren bereits:
- `onboarding.steps.switch_role_after_join.title` (de.json, en.json, es.json)
- `onboarding.steps.switch_role_after_join.description` (de.json, en.json, es.json)

**Prüfung:** Keine neuen Übersetzungen erforderlich.

## Berechtigungen

**FAKT:** Keine neuen Berechtigungen erforderlich. Tour-Anzeige verwendet bestehende Berechtigungen.

**Prüfung:** Keine Berechtigungs-Änderungen erforderlich.

## Performance

**Auswirkung:**
- Zusätzlicher `fetchCurrentUser()` Call nach Notification-Klick (minimal)
- Zusätzlicher `fetchCurrentUser()` Call beim Laden der Notification-Liste (nur wenn `joinApproved` vorhanden)
- `useEffect` in `OnboardingContext` prüft `hasInactiveOrgRole()` bei jedem User-Update (minimal)

**Ergebnis:** Keine Performance-Probleme.

## Memory Leaks

**Prüfung:**
- ✅ Keine Timer werden erstellt
- ✅ Keine Event-Listener werden erstellt
- ✅ Keine Subscriptions werden erstellt
- ✅ `useCallback` Dependencies sind korrekt

**Ergebnis:** Keine Memory-Leak-Gefahr.

