# Tour-Assistent ID-Dokument Fix - Analyse und Plan

**Erstellt:** 2025-01-30  
**Status:** Analyse abgeschlossen, Planung erstellt  
**Problem:** Tour-Assistent erscheint weiterhin, obwohl ID-Dokument hochgeladen wurde

## Problembeschreibung

Der Tour-Assistent zeigt weiterhin den Schritt "Identitätsdokument hochladen" an, obwohl der Benutzer bereits ein ID-Dokument hochgeladen hat.

## Ursachenanalyse

### 1. User-Update nach Dokumenten-Upload

**Datei:** `frontend/src/pages/Profile.tsx`

**Aktueller Ablauf (Zeilen 112-144):**
- Nach erfolgreichem Upload wird `fetchUserProfile()` aufgerufen (Zeile 122)
- `fetchUserProfile()` lädt User-Daten vom Backend (`/users/profile`) und speichert sie im lokalen State
- `fetchCurrentUser()` wird NICHT aufgerufen
- `completeStep('upload_identification_document', ...)` wird aufgerufen (Zeile 131)

**Problem:** Der lokale User-State wird aktualisiert, aber der Auth-Context-User nicht.

### 2. OnboardingContext verwendet Auth-Context-User

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Aktueller Code (Zeile 65):**
```typescript
const { user } = useAuth();
```

**Problem:** `OnboardingContext` verwendet den User aus dem Auth-Context, nicht den lokalen User-State aus Profile.tsx.

### 3. needsIdentificationDocument() prüft Auth-Context-User

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Aktueller Code (Zeilen 99-119):**
```typescript
const needsIdentificationDocument = useCallback((): boolean => {
  if (!user || !user.roles) return false;
  
  // Finde aktive Rolle mit Organisation
  const activeRole = user.roles.find((r: any) => r.lastUsed === true && r.role.organization !== null);
  
  if (!activeRole) {
    return false; // Keine aktive Rolle mit Organisation
  }
  
  // Prüfe ob Organisation in Kolumbien ist
  const organization = activeRole.role.organization;
  if (organization?.country !== 'CO') {
    return false; // Nur für Kolumbien
  }
  
  // Prüfe ob User bereits ein Identitätsdokument hat
  const hasDocument = user.identificationDocuments && user.identificationDocuments.length > 0;
  
  return !hasDocument; // Nur anzeigen wenn kein Dokument vorhanden
}, [user]);
```

**Problem:** Die Funktion prüft `user.identificationDocuments` aus dem Auth-Context. Da dieser nicht aktualisiert wird, bleibt `hasDocument` `false` und die Funktion gibt `true` zurück.

### 4. Backend lädt identificationDocuments IMMER

**Datei:** `backend/src/controllers/userController.ts`

**Aktueller Code (Zeilen 204-207):**
```typescript
identificationDocuments: {
  orderBy: { createdAt: 'desc' },
  take: 1 // Neuestes Dokument
},
```

**FAKT:** Das Backend lädt `identificationDocuments` IMMER, unabhängig von Query-Parametern. Es gibt keinen `includeDocuments` Parameter im Backend.

**Datei:** `frontend/src/hooks/useAuth.tsx`

**Aktueller Code (Zeilen 72-83):**
```typescript
const fetchCurrentUser = async (signal?: AbortSignal) => {
  try {
    // ✅ PERFORMANCE: Beim initialen Laden nur notwendige Daten laden
    // Settings, invoiceSettings, documents werden nicht benötigt für initiales Laden
    const response = await axiosInstance.get('/users/profile', {
      signal,
      params: {
        includeSettings: 'false',
        includeInvoiceSettings: 'false',
        includeDocuments: 'false'  // ← Parameter wird gesendet, aber Backend ignoriert ihn
      }
    });
    // ...
    setUser(response.data);
  }
  // ...
}
```

**Problem:** `fetchCurrentUser()` wird nach dem Dokumenten-Upload NICHT aufgerufen, daher wird der Auth-Context-User nicht aktualisiert. Der `includeDocuments: 'false'` Parameter wird gesendet, aber das Backend ignoriert ihn und lädt Dokumente trotzdem.

### 5. filterStepsByPermissions() filtert basierend auf needsIdentificationDocument()

**Datei:** `frontend/src/contexts/OnboardingContext.tsx`

**Aktueller Code (Zeilen 150-154):**
```typescript
if (step.showCondition === 'needsIdentificationDocument') {
  if (!needsIdentificationDocument()) {
    return false;
  }
}
```

**Problem:** Da `needsIdentificationDocument()` `true` zurückgibt (weil Auth-Context-User keine Dokumente hat), bleibt der Schritt in `filteredSteps` und wird weiterhin angezeigt.

## Zusammenfassung der Ursache

**Hauptursache:** Nach dem Dokumenten-Upload wird der Auth-Context-User nicht aktualisiert. `OnboardingContext` verwendet den Auth-Context-User aus `useAuth()`, der nicht aktualisiert wird, obwohl das Backend die Dokumente immer lädt.

**FAKT:** Das Backend lädt `identificationDocuments` IMMER (Zeile 204-207 in `userController.ts`). Der `includeDocuments` Parameter im Frontend wird ignoriert.

## Lösungsplan

### Schritt 1: fetchCurrentUser() nach Upload aufrufen

**Datei:** `frontend/src/pages/Profile.tsx`

**Änderung:** Nach erfolgreichem Upload `fetchCurrentUser()` mit `includeDocuments: true` aufrufen.

**Aktueller Code (Zeilen 121-135):**
```typescript
async () => {
  await fetchUserProfile();
  // Lade Dokumente neu, wenn die Komponente gemountet ist
  if (documentListRef.current) {
    documentListRef.current.loadDocuments();
  }
  showMessage(t('profile.documentUploadSuccess', { defaultValue: 'Dokument erfolgreich hochgeladen. Felder werden automatisch ausgefüllt.' }), 'success');
  
  // Schließe Onboarding-Schritt ab, wenn aktiv
  try {
    await completeStep('upload_identification_document', t('onboarding.steps.upload_identification_document.title') || 'Dokument hochladen');
  } catch (error) {
    // Fehler beim Abschließen blockiert nicht den Upload
    console.error('Fehler beim Abschließen des upload_identification_document Schritts:', error);
  }
}
```

**Neuer Code:**
```typescript
async () => {
  await fetchUserProfile();
  // Lade Dokumente neu, wenn die Komponente gemountet ist
  if (documentListRef.current) {
    documentListRef.current.loadDocuments();
  }
  
  // Auth-Context-User aktualisieren, damit OnboardingContext die Dokumente sieht
  // Backend lädt identificationDocuments IMMER, daher einfach fetchCurrentUser() aufrufen
  try {
    await fetchCurrentUser();
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Auth-Context-Users:', error);
    // Fehler blockiert nicht den Upload, aber Tour-Assistent wird möglicherweise nicht aktualisiert
  }
  
  showMessage(t('profile.documentUploadSuccess', { defaultValue: 'Dokument erfolgreich hochgeladen. Felder werden automatisch ausgefüllt.' }), 'success');
  
  // Schließe Onboarding-Schritt ab, wenn aktiv
  try {
    await completeStep('upload_identification_document', t('onboarding.steps.upload_identification_document.title') || 'Dokument hochladen');
  } catch (error) {
    // Fehler beim Abschließen blockiert nicht den Upload
    console.error('Fehler beim Abschließen des upload_identification_document Schritts:', error);
  }
}
```

## Implementierungsreihenfolge

1. **fetchCurrentUser() nach Upload aufrufen** (Profile.tsx)
   - `fetchCurrentUser()` nach `fetchUserProfile()` aufrufen
   - Fehlerbehandlung hinzufügen (Fehler blockiert nicht den Upload)

2. **Testen**
   - Dokument hochladen
   - Prüfen ob Tour-Assistent verschwindet
   - Prüfen ob `needsIdentificationDocument()` `false` zurückgibt
   - Prüfen ob `filteredSteps` neu berechnet wird (automatisch durch useCallback Dependencies)

## Erwartetes Verhalten nach Fix

1. Benutzer lädt ID-Dokument hoch
2. `fetchUserProfile()` aktualisiert lokalen State in Profile.tsx
3. `fetchCurrentUser()` aktualisiert Auth-Context-User (Backend lädt Dokumente automatisch)
4. `OnboardingContext` erhält aktualisierten User mit `identificationDocuments` (durch `useAuth()` Hook)
5. `needsIdentificationDocument()` wird neu berechnet (useCallback mit `[user]` Dependency)
6. `filterStepsByPermissions()` wird neu berechnet (useCallback mit `needsIdentificationDocument` Dependency)
7. `filteredSteps` wird neu berechnet (Zeile 184: `const filteredSteps = filterStepsByPermissions(steps)`)
8. Tour-Assistent zeigt Schritt nicht mehr an (Schritt ist nicht mehr in `filteredSteps`)

## Zusätzliche Überlegungen

### Backend-Endpoint Verhalten

**FAKT:** `getUserById` in `backend/src/controllers/userController.ts` lädt `identificationDocuments` IMMER (Zeilen 204-207).

**FAKT:** Der `includeDocuments` Query-Parameter wird im Backend nicht verwendet/geprüft.

**Auswirkung:** Keine Backend-Änderungen erforderlich. Dokumente werden automatisch geladen.

### Performance

**Aktuell:** `fetchCurrentUser()` wird beim initialen Laden aufgerufen (Zeile 48 in useAuth.tsx), Backend lädt Dokumente immer.

**Nach Fix:** `fetchCurrentUser()` wird zusätzlich nach Dokumenten-Upload aufgerufen.

**Auswirkung:** Minimal - ein zusätzlicher API-Call nach Upload. Backend lädt Dokumente sowieso immer, daher keine zusätzliche Last.

**Memory:** Keine Memory-Leak-Gefahr, da:
- `fetchCurrentUser()` verwendet `axiosInstance.get()` mit AbortSignal-Support
- Keine Timer oder Event-Listener werden erstellt
- Keine Subscriptions die aufgeräumt werden müssen

### Reaktivität von OnboardingContext

**FAKT:** `needsIdentificationDocument` ist ein `useCallback` mit `[user]` Dependency (Zeile 119).

**FAKT:** `filterStepsByPermissions` ist ein `useCallback` mit `needsIdentificationDocument` in Dependencies (Zeile 182).

**FAKT:** `filteredSteps` wird bei jedem Render neu berechnet (Zeile 184: `const filteredSteps = filterStepsByPermissions(steps)`).

**Auswirkung:** Wenn `user` sich ändert (durch `fetchCurrentUser()`), werden `needsIdentificationDocument` und `filterStepsByPermissions` automatisch neu berechnet, und `filteredSteps` wird aktualisiert.

### Edge Cases

**Edge Case 1: fetchCurrentUser() schlägt fehl**
- **Szenario:** Netzwerkfehler oder Backend-Fehler beim Aufruf von `fetchCurrentUser()`
- **Lösung:** Fehler wird in try-catch gefangen und geloggt, blockiert aber nicht den Upload
- **Auswirkung:** Tour-Assistent wird möglicherweise nicht sofort aktualisiert, aber Upload ist erfolgreich
- **Workaround:** User kann Seite neu laden, dann wird `fetchCurrentUser()` beim initialen Laden aufgerufen

**Edge Case 2: User hat mehrere Dokumente**
- **FAKT:** Backend lädt nur das neueste Dokument (`take: 1`, Zeile 206 in userController.ts)
- **Auswirkung:** `needsIdentificationDocument()` prüft `user.identificationDocuments.length > 0`, funktioniert korrekt

**Edge Case 3: User wechselt Organisation**
- **Szenario:** User hat Dokument, wechselt aber zu Organisation außerhalb Kolumbien
- **FAKT:** `needsIdentificationDocument()` prüft `organization?.country !== 'CO'` (Zeile 111)
- **Auswirkung:** Schritt wird nicht angezeigt, auch wenn kein Dokument vorhanden (korrekt)

**Edge Case 4: User hat keine aktive Rolle mit Organisation**
- **FAKT:** `needsIdentificationDocument()` gibt `false` zurück wenn keine aktive Rolle mit Organisation (Zeile 106)
- **Auswirkung:** Schritt wird nicht angezeigt (korrekt)

### Übersetzungen

**FAKT:** Keine neuen Übersetzungen erforderlich. Alle verwendeten Texte existieren bereits:
- `t('profile.documentUploadSuccess')` - existiert
- `t('onboarding.steps.upload_identification_document.title')` - existiert

**Prüfung:** Keine neuen Übersetzungs-Schlüssel erforderlich.

### Notifications

**FAKT:** Keine neuen Notifications erforderlich. Dokumenten-Upload hat bereits eigene Success-Message.

**Prüfung:** Keine Notification-Änderungen erforderlich.

### Berechtigungen

**FAKT:** Keine neuen Berechtigungen erforderlich. Dokumenten-Upload verwendet bestehende Berechtigungen.

**Prüfung:** Keine Berechtigungs-Änderungen erforderlich.

### Memory Leaks

**Prüfung:**
- ✅ Keine Timer (`setTimeout`/`setInterval`) werden erstellt
- ✅ Keine Event-Listener werden erstellt
- ✅ Keine Subscriptions werden erstellt
- ✅ `fetchCurrentUser()` verwendet `axiosInstance.get()` - Standard-HTTP-Request, kein Memory-Leak-Risiko
- ✅ `useCallback` Dependencies sind korrekt (`[user]` für `needsIdentificationDocument`, Zeile 119)

**Ergebnis:** Keine Memory-Leak-Gefahr.

### Code-Standards

**Prüfung:**
- ✅ TypeScript: Keine neuen Typen erforderlich
- ✅ React: Verwendet bestehende Hooks korrekt
- ✅ Fehlerbehandlung: try-catch vorhanden
- ✅ DRY: Wiederverwendet bestehende Funktion `fetchCurrentUser()`
- ✅ Konsistenz: Folgt bestehendem Muster (ähnlich wie `fetchCurrentUser()` in Profile.tsx Zeile 227)

**Ergebnis:** Entspricht allen Code-Standards.

## Zusammenfassung der Implementierung

**Minimale Änderung:** Nur eine Zeile Code hinzufügen:
```typescript
await fetchCurrentUser();
```

**Keine Breaking Changes:** Bestehende Funktionalität bleibt unverändert.

**Keine Risiken:** 
- Keine Memory Leaks
- Keine Performance-Probleme
- Keine Breaking Changes
- Fehlerbehandlung vorhanden

**Vollständig geplant:** Alle Aspekte geprüft und dokumentiert.

