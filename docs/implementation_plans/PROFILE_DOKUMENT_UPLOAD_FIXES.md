# Profile Dokument-Upload Fixes - Behebungsplan

**Datum:** 2025-02-02  
**Status:** 🔴 KRITISCH - Mehrere Probleme blockieren Funktionalität  
**Priorität:** Hoch

---

## 📋 EXECUTIVE SUMMARY

**Probleme:**
1. Erkannte Daten werden nicht gespeichert (User-Felder werden nicht aktualisiert)
2. Dokument wird nicht im Tab "Documentos de Identificación" angezeigt
3. Doppeltes Speichern-Problem (Edit-Button + Speichern unten)

**Ursachen (FAKTEN aus Code-Analyse):**
1. Backend aktualisiert User-Felder nur wenn AI-Erkennung erfolgreich ist (Zeile 211-217 in `identificationDocumentController.ts`). Frontend AI-Erkennung (`recognizeDocumentWithAI` in `frontend/src/utils/aiDocumentRecognition.ts`) erkennt KEINE User-Daten - gibt nur `Partial<IdentificationDocument>` zurück (Zeile 13), das firstName, lastName, birthday NICHT enthält. Wenn AI-Erkennung fehlschlägt oder kein Bild vorhanden, werden User-Felder nicht aktualisiert.
2. `onDocumentSaved` in `Profile.tsx` (Zeile 448-460) ruft nur `fetchUserProfile()` auf (Zeile 450), nicht `loadDocuments()` in `IdentificationDocumentList`. `IdentificationDocumentList` lädt Dokumente über `useEffect` nur wenn `userId` sich ändert (Zeile 41-43), nicht nach Upload.
3. `Profile.tsx` hat Edit-Modus (`isEditing` State, Zeile 65). `UserManagementTab.tsx` hat AUCH Edit-Modus (`isEditingUser` State, Zeile 73, wird auf `true` gesetzt bei Input-Change, Zeile 382). Beide haben Edit-Modus, aber unterschiedliche Implementierung. Nach Dokument-Upload wird `fetchUserProfile()` aufgerufen, was `user` und `formData` neu setzt (Zeile 130-131), aber `isEditing` bleibt unverändert.

---

## 🔴 PROBLEM 1: Erkannte Daten werden nicht gespeichert

### Aktueller Ablauf (FAKTEN):

1. User klickt "Daten automatisch erkennen" → `handleAutoRecognize()` in `IdentificationDocumentForm.tsx` (Zeile 74-143)
2. Frontend ruft `recognizeDocumentWithAI()` auf (Zeile 104) → sendet Request an `/api/document-recognition`
3. Backend `/api/document-recognition` (Zeile 20-134 in `backend/src/routes/documentRecognition.ts`) macht AI-Erkennung → gibt nur Dokument-Daten zurück (documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority) - KEINE User-Daten (firstName, lastName, birthday, gender)
4. Frontend setzt nur Dokument-Felder im State (setDocumentType, setDocumentNumber, etc., Zeile 109-131)
5. User klickt "Speichern" → `handleSubmit()` wird aufgerufen (Zeile 146-246)
6. Frontend sendet nur Dokument-Daten an Backend (Zeile 200-234)
7. Backend (`identificationDocumentController.ts`, Zeile 40-287) macht AI-Erkennung nochmal (nur wenn `imageData || req.file` vorhanden, Zeile 107)
8. Backend aktualisiert User-Felder nur wenn AI-Erkennung erfolgreich ist (Zeile 211-217)

### Problem-Analyse (FAKTEN):

**Datei:** `frontend/src/utils/aiDocumentRecognition.ts`

**Zeile 13:** `recognizeDocumentWithAI` Return-Type
- Return-Type: `Promise<Partial<IdentificationDocument>>`
- `IdentificationDocument` Interface (Zeile 76-91 in `frontend/src/types/interfaces.ts`) enthält: id, userId, documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, documentFile, isVerified, verificationDate, verifiedBy, createdAt, updatedAt
- **ENTHÄLT NICHT:** firstName, lastName, birthday, gender, country

**Datei:** `backend/src/routes/documentRecognition.ts`

**Zeile 20-134:** POST `/api/document-recognition`
- Macht AI-Erkennung mit OpenAI GPT-4o
- System-Prompt (Zeile 56) fordert firstName, lastName, birthday, gender an
- **ABER:** Response gibt nur `documentData` zurück (Zeile 115), das nur Dokument-Daten enthält
- **PROBLEM:** Frontend erhält keine User-Daten aus dieser API

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

**Zeile 48:** Request-Body Destructuring
- Destructured: `documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData`
- **ENTHÄLT NICHT:** firstName, lastName, birthday, gender, country

**Zeile 106-217:** AI-Erkennung und User-Update
- AI-Erkennung wird nur gemacht wenn `imageData || req.file` vorhanden ist (Zeile 107)
- System-Prompt (Zeile 129) fordert firstName, lastName, birthday, gender an
- User-Update wird nur gemacht wenn `Object.keys(userUpdateData).length > 0` (Zeile 211)
- **PROBLEM:** Wenn AI-Erkennung fehlschlägt oder kein Bild vorhanden, werden User-Felder nicht aktualisiert

**Datei:** `frontend/src/components/IdentificationDocumentForm.tsx`

**Zeile 74-143:** `handleAutoRecognize()`
- Ruft `recognizeDocumentWithAI()` auf (Zeile 104)
- Setzt nur Dokument-Felder im State (setDocumentType, setDocumentNumber, etc., Zeile 109-131)
- **SETZT NICHT:** User-Felder (firstName, lastName, birthday, etc.)

**Zeile 146-246:** `handleSubmit()`
- Sendet nur Dokument-Daten an Backend (Zeile 200-234)
- **SENDET NICHT:** User-Daten

### Lösung:

**✅ GEWÄHLT: Frontend erkannte User-Daten an Backend senden**

**Begründung:**
- Backend AI-Erkennung erkennt bereits User-Daten (System-Prompt fordert firstName, lastName, birthday, gender an, Zeile 129)
- Backend aktualisiert User-Felder bereits (Zeile 211-217)
- **ABER:** Frontend AI-Erkennung erkennt KEINE User-Daten (nur Dokument-Daten)
- **LÖSUNG:** Backend AI-Erkennung-Response erweitern um User-Daten, Frontend diese Daten an Backend senden

### Implementierung:

**1. Backend: `backend/src/routes/documentRecognition.ts`**

**Zeile 113-115:** Response erweitern
- Aktuell: `return res.json(documentData);`
- **ÄNDERN ZU:** `return res.json({ ...documentData, firstName: documentData.firstName, lastName: documentData.lastName, birthday: documentData.birthday, gender: documentData.gender, country: documentData.issuingCountry || documentData.country });`
- **FAKT:** System-Prompt (Zeile 56) fordert bereits firstName, lastName, birthday, gender an, diese Daten sind in `documentData` vorhanden

**2. Frontend: `frontend/src/utils/aiDocumentRecognition.ts`**

**Zeile 13:** Return-Type erweitern
- Aktuell: `Promise<Partial<IdentificationDocument>>`
- **ÄNDERN ZU:** `Promise<Partial<IdentificationDocument & { firstName?: string; lastName?: string; birthday?: string; gender?: string; country?: string }>>`

**3. Frontend: `frontend/src/components/IdentificationDocumentForm.tsx`**

**Zeile 33-38:** State erweitern
- **HINZUFÜGEN:**
```typescript
const [recognizedUserData, setRecognizedUserData] = useState<{
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: string;
  country?: string;
} | null>(null);
```

**Zeile 74-143:** `handleAutoRecognize()` erweitern
- **NACH Zeile 106 (nach `recognizedData`):**
```typescript
// User-Daten aus erkannten Daten extrahieren
const userData = {
  firstName: recognizedData.firstName,
  lastName: recognizedData.lastName,
  birthday: recognizedData.birthday,
  gender: recognizedData.gender,
  country: recognizedData.issuingCountry || recognizedData.country
};

setRecognizedUserData(userData);
```

**Zeile 146-246:** `handleSubmit()` erweitern
- **VOR Zeile 198 (vor `if (file)`):**
```typescript
// User-Daten an Backend senden
if (recognizedUserData) {
  // Für FormData (file upload)
  if (file) {
    if (recognizedUserData.firstName) formData.append('firstName', recognizedUserData.firstName);
    if (recognizedUserData.lastName) formData.append('lastName', recognizedUserData.lastName);
    if (recognizedUserData.birthday) formData.append('birthday', recognizedUserData.birthday);
    if (recognizedUserData.gender) formData.append('gender', recognizedUserData.gender);
    if (recognizedUserData.country) formData.append('country', recognizedUserData.country);
  }
  // Für JSON (camera image)
  else if (imageData) {
    // Wird in documentData Object hinzugefügt (siehe Zeile 212-223)
  }
}
```

**Zeile 212-223:** `addDocumentWithCameraImage` erweitern
- **ÄNDERN:**
```typescript
await idDocApi.addDocumentWithCameraImage(
  userId,
  imageData,
  {
    documentType,
    documentNumber,
    issuingCountry,
    issueDate,
    expiryDate,
    issuingAuthority,
    // HINZUFÜGEN:
    firstName: recognizedUserData?.firstName,
    lastName: recognizedUserData?.lastName,
    birthday: recognizedUserData?.birthday,
    gender: recognizedUserData?.gender,
    country: recognizedUserData?.country
  }
);
```

**4. Frontend: `frontend/src/api/identificationDocumentApi.ts`**

**Zeile 38-64:** `addDocumentWithCameraImage` erweitern
- **ÄNDERN documentData Parameter:**
```typescript
documentData: {
  documentType: string;
  documentNumber: string;
  issuingCountry: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  // HINZUFÜGEN:
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: string;
  country?: string;
}
```

**5. Backend: `backend/src/controllers/identificationDocumentController.ts`**

**Zeile 48:** Request-Body Destructuring erweitern
- **ÄNDERN:**
```typescript
const { documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData, firstName, lastName, birthday, gender, country } = req.body;
```

**Zeile 102-281:** User-Update-Logik erweitern
- **VOR Zeile 102 (vor `const document = await prisma.identificationDocument.create`):**
```typescript
// User-Daten aus Request übernehmen (auch ohne Bild)
const userUpdateDataFromRequest: any = {};
if (firstName) userUpdateDataFromRequest.firstName = firstName;
if (lastName) userUpdateDataFromRequest.lastName = lastName;
if (birthday) userUpdateDataFromRequest.birthday = new Date(birthday);
if (gender && ['male', 'female', 'other'].includes(gender)) {
  userUpdateDataFromRequest.gender = gender;
}
if (country) {
  // Validiere Country-Code
  if (['CO', 'CH', 'DE', 'AT'].includes(country)) {
    userUpdateDataFromRequest.country = country;
  }
}

// Update User, falls Daten vorhanden (VOR AI-Erkennung)
if (Object.keys(userUpdateDataFromRequest).length > 0) {
  await prisma.user.update({
    where: { id: userId },
    data: userUpdateDataFromRequest
  });
  logger.log(`[addDocument] User ${userId} aktualisiert mit User-Daten aus Request:`, userUpdateDataFromRequest);
}
```

**Zeile 211-217:** AI-Erkennung User-Update anpassen
- **ÄNDERN:** User-Update aus AI-Erkennung nur wenn noch nicht aus Request aktualisiert
- **ODER:** AI-Erkennung-Daten haben Priorität (überschreiben Request-Daten)

---

## 🔴 PROBLEM 2: Dokument wird nicht im Tab "Documentos de Identificación" angezeigt

### Aktueller Ablauf (FAKTEN):

1. User lädt Dokument hoch → `handleSubmit()` in `IdentificationDocumentForm.tsx` (Zeile 146-246)
2. `onDocumentSaved()` wird aufgerufen (Zeile 240)
3. In `Profile.tsx` wird `fetchUserProfile()` aufgerufen (Zeile 450)
4. `fetchUserProfile()` lädt User-Daten über `/users/profile` (Zeile 118)
5. `/users/profile` leitet auf `getUserById` um (Zeile 56-59 in `backend/src/routes/users.ts`)
6. `getUserById` lädt `identificationDocuments` immer (Zeile 240 in `backend/src/controllers/userController.ts`)
7. `IdentificationDocumentList` lädt Dokumente über `loadDocuments()` → `idDocApi.getUserDocuments(userId)` (Zeile 26-38 in `IdentificationDocumentList.tsx`)
8. **PROBLEM:** `loadDocuments()` wird nur aufgerufen wenn `userId` sich ändert (Zeile 41-43), nicht nach Upload

### Problem-Analyse (FAKTEN):

**Datei:** `frontend/src/pages/Profile.tsx`

**Zeile 448-460:** `onDocumentSaved` Callback
- Ruft nur `fetchUserProfile()` auf (Zeile 450)
- Ruft NICHT `loadDocuments()` in `IdentificationDocumentList` auf
- **FAKT:** `IdentificationDocumentList` ist separate Komponente, `loadDocuments()` ist nicht direkt zugänglich

**Datei:** `frontend/src/components/IdentificationDocumentList.tsx`

**Zeile 26-38:** `loadDocuments()`
- Lädt Dokumente über `idDocApi.getUserDocuments(userId)` (Zeile 29)
- Wird nur aufgerufen wenn `userId` sich ändert (Zeile 41-43: `useEffect(() => { loadDocuments(); }, [userId])`)
- **FAKT:** `userId` ändert sich nicht nach Upload, daher wird `loadDocuments()` nicht aufgerufen

**Zeile 691-694:** `IdentificationDocumentList` wird gerendert
- Bekommt `userId={user.id}` als Prop
- **FAKT:** Kein Ref oder Callback-Mechanismus vorhanden

### Lösung:

**✅ GEWÄHLT: Ref-Callback**

**Begründung:**
- `fetchUserProfile()` lädt bereits `identificationDocuments` (über `getUserById`)
- **ABER:** `IdentificationDocumentList` lädt Dokumente separat über `getUserDocuments`
- **LÖSUNG:** Ref-Callback implementieren, damit `onDocumentSaved` `loadDocuments()` aufrufen kann

### Implementierung:

**1. Frontend: `frontend/src/pages/Profile.tsx`**

**Zeile 1:** Import erweitern
- **HINZUFÜGEN:**
```typescript
import React, { useState, useEffect, useRef } from 'react';
```

**Zeile 64:** State erweitern
- **HINZUFÜGEN:**
```typescript
const documentListRef = useRef<{ loadDocuments: () => void }>(null);
```

**Zeile 691-694:** `IdentificationDocumentList` erweitern
- **ÄNDERN:**
```typescript
<IdentificationDocumentList 
  userId={user.id} 
  ref={documentListRef}
/>
```

**Zeile 448-460:** `onDocumentSaved` erweitern
- **NACH Zeile 450 (nach `fetchUserProfile()`):**
```typescript
documentListRef.current?.loadDocuments();
```

**2. Frontend: `frontend/src/components/IdentificationDocumentList.tsx`**

**Zeile 1:** Import erweitern
- **ÄNDERN:**
```typescript
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
```

**Zeile 9-12:** Props erweitern
- **ÄNDERN:**
```typescript
interface IdentificationDocumentListProps {
  userId: number;
  isAdmin?: boolean;
}
```

**Zeile 14-264:** Komponente erweitern
- **ÄNDERN:**
```typescript
const IdentificationDocumentList = forwardRef<{ loadDocuments: () => void }, IdentificationDocumentListProps>(
  ({ userId, isAdmin = false }, ref) => {
    // ... bestehender Code ...
    
    // HINZUFÜGEN (nach loadDocuments Definition, vor return):
    useImperativeHandle(ref, () => ({
      loadDocuments
    }));
    
    // ... bestehender Code ...
  }
);

export default IdentificationDocumentList;
```

---

## 🔴 PROBLEM 3: Doppeltes Speichern-Problem

### Aktueller Ablauf (FAKTEN):

**Profile.tsx:**
1. User muss "Edit" klicken → `startEditing()` wird aufgerufen (Zeile 228-231) → `isEditing = true` (Zeile 230)
2. User bearbeitet Felder → `handleInputChange()` wird aufgerufen (Zeile 140-146)
3. User muss ganz unten auf "Speichern" klicken → `handleSubmit()` wird aufgerufen (Zeile 148-222)
4. Nach erfolgreichem Speichern: `setIsEditing(false)` (Zeile 187)

**UserManagementTab.tsx:**
1. User bearbeitet Felder → `handleUserInputChange()` wird aufgerufen (Zeile 371-383)
2. `setIsEditingUser(true)` wird automatisch aufgerufen (Zeile 382)
3. User klickt "Speichern" → `handleUserSubmit()` wird aufgerufen (Zeile 397-483)
4. Nach erfolgreichem Speichern: `setIsEditingUser(false)` (Zeile 466)
5. **FAKT:** Speichern-Button ist nur sichtbar wenn `isEditingUser === true` (Zeile 1242)

**Beim Dokument-Upload:**
1. User lädt Dokument hoch → `onDocumentSaved()` wird aufgerufen (Zeile 448-460 in `Profile.tsx`)
2. `fetchUserProfile()` wird aufgerufen (Zeile 450)
3. `fetchUserProfile()` setzt `user` und `formData` neu (Zeile 130-131)
4. **FAKT:** `isEditing` bleibt unverändert (wird nicht zurückgesetzt)
5. **PROBLEM:** Wenn User im Edit-Modus war, bleibt er im Edit-Modus, aber `formData` wurde neu gesetzt → User kann nicht mehr speichern (weil keine Änderungen mehr vorhanden)

### Problem-Analyse (FAKTEN):

**Datei:** `frontend/src/pages/Profile.tsx`

**Zeile 65:** `const [isEditing, setIsEditing] = useState(false);`
- Edit-Modus wird durch State gesteuert

**Zeile 228-231:** `startEditing()`
- Setzt `isEditing = true`
- Setzt `formData = user` (Zeile 229)

**Zeile 148-222:** `handleSubmit()`
- Setzt `isEditing = false` nach erfolgreichem Speichern (Zeile 187)

**Zeile 448-460:** `onDocumentSaved`
- Ruft `fetchUserProfile()` auf (Zeile 450)
- `fetchUserProfile()` setzt `user` und `formData` neu (Zeile 130-131)
- **FAKT:** `isEditing` bleibt unverändert (wird nicht zurückgesetzt)

**Datei:** `frontend/src/components/UserManagementTab.tsx`

**Zeile 73:** `const [isEditingUser, setIsEditingUser] = useState(false);`
- Edit-Modus wird durch State gesteuert

**Zeile 382:** `setIsEditingUser(true);`
- Wird automatisch aufgerufen bei Input-Change

**Zeile 1242:** `{isEditingUser && (`
- Speichern-Button ist nur sichtbar wenn `isEditingUser === true`

**Zeile 466:** `setIsEditingUser(false);`
- Wird nach erfolgreichem Speichern aufgerufen

### Lösung:

**✅ GEWÄHLT: Profile.tsx Edit-Modus entfernen, wie UserManagementTab.tsx**

**Begründung:**
- Beide haben Edit-Modus, aber unterschiedliche Implementierung
- UserManagementTab.tsx: Edit-Modus wird automatisch aktiviert bei Input-Change (Zeile 382)
- Profile.tsx: Edit-Modus muss manuell aktiviert werden (Edit-Button)
- **KONSISTENZ:** Beide sollten gleich funktionieren
- **EINFACHER:** Edit-Modus automatisch aktivieren bei Input-Change

### Implementierung:

**1. Frontend: `frontend/src/pages/Profile.tsx`**

**Zeile 65:** State ändern
- **ÄNDERN:**
```typescript
// ENTFERNEN:
const [isEditing, setIsEditing] = useState(false);

// HINZUFÜGEN (wie UserManagementTab):
const [isEditing, setIsEditing] = useState(false); // Bleibt, aber wird automatisch aktiviert
```

**Zeile 140-146:** `handleInputChange()` erweitern
- **NACH Zeile 144 (nach `setFormData`):**
```typescript
setIsEditing(true); // Automatisch Edit-Modus aktivieren (wie UserManagementTab)
```

**Zeile 228-231:** `startEditing()` entfernen
- **ENTFERNEN:** Komplette Funktion

**Zeile 323-330:** Edit-Button entfernen
- **ENTFERNEN:** Kompletten Button-Block

**Zeile 376-686:** Felder immer editierbar machen
- **ENTFERNEN:** `disabled={!isEditing}` von allen Input-Feldern
- **FAKT:** Felder sind bereits editierbar (disabled wird nur gesetzt wenn `!isEditing`)

**Zeile 668-686:** Speichern-Button immer sichtbar machen
- **ÄNDERN:**
```typescript
// VORHER:
{isEditing && (
  <div className="flex mt-6 space-x-3">
    ...
  </div>
)}

// NACHHER:
<div className="flex mt-6 space-x-3">
  ...
</div>
```

**Zeile 187:** `setIsEditing(false)` entfernen
- **ENTFERNEN:** Diese Zeile

**Zeile 448-460:** `onDocumentSaved` anpassen
- **HINZUFÜGEN (nach `fetchUserProfile()`):**
```typescript
setIsEditing(false); // Edit-Modus nach Upload zurücksetzen
```

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: Problem 3 (Doppeltes Speichern) - EINFACHSTE

**1. Profile.tsx Edit-Modus anpassen**
- `handleInputChange()` erweitern: `setIsEditing(true)` hinzufügen
- `startEditing()` entfernen
- Edit-Button entfernen
- `disabled={!isEditing}` von allen Input-Feldern entfernen
- Speichern-Button immer sichtbar machen
- `setIsEditing(false)` nach erfolgreichem Speichern entfernen
- `setIsEditing(false)` nach Dokument-Upload hinzufügen

**2. Testen**
- Profile-Seite öffnen
- Felder direkt bearbeiten (ohne Edit-Button)
- Prüfen ob `isEditing` automatisch auf `true` gesetzt wird
- Speichern klicken
- Prüfen ob Änderungen gespeichert werden
- Prüfen ob `isEditing` auf `false` gesetzt wird
- Dokument hochladen
- Prüfen ob `isEditing` auf `false` gesetzt wird
- Prüfen ob Speichern noch funktioniert

### Phase 2: Problem 2 (Dokument wird nicht angezeigt) - MITTEL

**1. IdentificationDocumentList Ref-Callback implementieren**
- `useRef` in Profile.tsx importieren
- `documentListRef` State hinzufügen
- `forwardRef` und `useImperativeHandle` in IdentificationDocumentList importieren
- `IdentificationDocumentList` mit `forwardRef` umschließen
- `useImperativeHandle` hinzufügen
- Ref an `IdentificationDocumentList` übergeben
- `onDocumentSaved` erweitern: `documentListRef.current?.loadDocuments()` aufrufen

**2. Testen**
- Dokument hochladen
- Tab "Documentos de Identificación" öffnen
- Prüfen ob Dokument angezeigt wird
- Dokument bearbeiten
- Prüfen ob Änderungen angezeigt werden
- Dokument löschen
- Prüfen ob Dokument aus Liste entfernt wird

### Phase 3: Problem 1 (Erkannte Daten werden nicht gespeichert) - KOMPLEX

**1. Backend: documentRecognition.ts erweitern**
- Response erweitern um User-Daten (firstName, lastName, birthday, gender, country)

**2. Frontend: aiDocumentRecognition.ts erweitern**
- Return-Type erweitern um User-Daten

**3. Frontend: IdentificationDocumentForm erweitern**
- `recognizedUserData` State hinzufügen
- `handleAutoRecognize()` erweitern: User-Daten extrahieren und im State speichern
- `handleSubmit()` erweitern: User-Daten an Backend senden (FormData und JSON)

**4. Frontend: identificationDocumentApi.ts erweitern**
- `addDocumentWithCameraImage` Parameter erweitern um User-Daten

**5. Backend: identificationDocumentController.ts erweitern**
- Request-Body Destructuring erweitern um User-Daten
- User-Update-Logik erweitern: User-Daten aus Request übernehmen (VOR AI-Erkennung)

**6. Testen**
- Dokument hochladen mit "Daten automatisch erkennen"
- Prüfen ob User-Felder (firstName, lastName, birthday, etc.) aktualisiert werden
- Prüfen ob Daten in Datenbank gespeichert werden
- Seite neu laden
- Prüfen ob Daten noch vorhanden sind
- Dokument hochladen OHNE "Daten automatisch erkennen"
- Prüfen ob User-Felder NICHT aktualisiert werden

---

## 🔍 DETAILLIERTE CODE-ÄNDERUNGEN

### Phase 1: Profile.tsx Edit-Modus anpassen

**Datei:** `frontend/src/pages/Profile.tsx`

**Zeile 140-146:** `handleInputChange()` erweitern
```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value === '' ? null : value
  }));
  setIsEditing(true); // HINZUFÜGEN: Automatisch Edit-Modus aktivieren
};
```

**Zeile 228-231:** `startEditing()` entfernen
```typescript
// ENTFERNEN: Komplette Funktion
```

**Zeile 323-330:** Edit-Button entfernen
```typescript
// ENTFERNEN: Kompletten Button-Block
{!isEditing && (
  <button
    onClick={startEditing}
    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
  >
    <PencilIcon className="h-5 w-5" />
  </button>
)}
```

**Zeile 376, 390, 404, 539, 639, 658:** `disabled={!isEditing}` entfernen
```typescript
// ÄNDERN:
disabled={!isEditing}
// ZU:
// (entfernen - Felder sind immer editierbar)
```

**Zeile 668-686:** Speichern-Button immer sichtbar machen
```typescript
// ÄNDERN:
{isEditing && (
  <div className="flex mt-6 space-x-3">
    <button type="submit" ...>
      <CheckIcon className="h-5 w-5" />
    </button>
    <button type="button" onClick={() => setIsEditing(false)} ...>
      <XMarkIcon className="h-5 w-5" />
    </button>
  </div>
)}

// ZU:
<div className="flex mt-6 space-x-3">
  <button type="submit" ...>
    <CheckIcon className="h-5 w-5" />
  </button>
  <button type="button" onClick={() => setIsEditing(false)} ...>
    <XMarkIcon className="h-5 w-5" />
  </button>
</div>
```

**Zeile 187:** `setIsEditing(false)` entfernen
```typescript
// ENTFERNEN:
setIsEditing(false);
```

**Zeile 448-460:** `onDocumentSaved` erweitern
```typescript
onDocumentSaved={async () => {
  setShowDocumentUpload(false);
  fetchUserProfile();
  setIsEditing(false); // HINZUFÜGEN: Edit-Modus nach Upload zurücksetzen
  showMessage('Dokument erfolgreich hochgeladen. Felder werden automatisch ausgefüllt.', 'success');
  // ...
}}
```

### Phase 2: IdentificationDocumentList Ref-Callback

**Datei:** `frontend/src/pages/Profile.tsx`

**Zeile 1:** Import erweitern
```typescript
import React, { useState, useEffect, useRef } from 'react';
```

**Zeile 64:** State hinzufügen
```typescript
const documentListRef = useRef<{ loadDocuments: () => void }>(null);
```

**Zeile 691-694:** `IdentificationDocumentList` erweitern
```typescript
<IdentificationDocumentList 
  userId={user.id} 
  ref={documentListRef}
/>
```

**Zeile 448-460:** `onDocumentSaved` erweitern
```typescript
onDocumentSaved={async () => {
  setShowDocumentUpload(false);
  fetchUserProfile();
  documentListRef.current?.loadDocuments(); // HINZUFÜGEN
  setIsEditing(false);
  showMessage('Dokument erfolgreich hochgeladen. Felder werden automatisch ausgefüllt.', 'success');
  // ...
}}
```

**Datei:** `frontend/src/components/IdentificationDocumentList.tsx`

**Zeile 1:** Import erweitern
```typescript
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
```

**Zeile 14-264:** Komponente erweitern
```typescript
const IdentificationDocumentList = forwardRef<{ loadDocuments: () => void }, IdentificationDocumentListProps>(
  ({ userId, isAdmin = false }, ref) => {
    // ... bestehender Code (loadDocuments, etc.) ...
    
    // HINZUFÜGEN (nach loadDocuments Definition, Zeile 38):
    useImperativeHandle(ref, () => ({
      loadDocuments
    }));
    
    // ... bestehender Code (return, etc.) ...
  }
);

export default IdentificationDocumentList;
```

### Phase 3: Erkannte Daten speichern

**Datei:** `backend/src/routes/documentRecognition.ts`

**Zeile 113-115:** Response erweitern
```typescript
// VORHER:
logger.log('Dokumentdaten erfolgreich extrahiert:', documentData);
return res.json(documentData);

// NACHHER:
logger.log('Dokumentdaten erfolgreich extrahiert:', documentData);
return res.json({
  ...documentData,
  firstName: documentData.firstName,
  lastName: documentData.lastName,
  birthday: documentData.birthday,
  gender: documentData.gender,
  country: documentData.issuingCountry || documentData.country
});
```

**Datei:** `frontend/src/utils/aiDocumentRecognition.ts`

**Zeile 13:** Return-Type erweitern
```typescript
// VORHER:
export const recognizeDocumentWithAI = async (imageData: string): Promise<Partial<IdentificationDocument>> => {

// NACHHER:
export const recognizeDocumentWithAI = async (imageData: string): Promise<Partial<IdentificationDocument & { firstName?: string; lastName?: string; birthday?: string; gender?: string; country?: string }>> => {
```

**Datei:** `frontend/src/components/IdentificationDocumentForm.tsx`

**Zeile 33-38:** State erweitern
```typescript
const [recognizedUserData, setRecognizedUserData] = useState<{
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: string;
  country?: string;
} | null>(null);
```

**Zeile 74-143:** `handleAutoRecognize()` erweitern
```typescript
const handleAutoRecognize = async () => {
  // ... bestehender Code (Zeile 74-106) ...
  
  const recognizedData = await recognizeDocumentWithAI(documentImage);
  
  logger.log("Erkannte Daten:", recognizedData);
  
  // HINZUFÜGEN (nach Zeile 106):
  // User-Daten aus erkannten Daten extrahieren
  const userData = {
    firstName: recognizedData.firstName,
    lastName: recognizedData.lastName,
    birthday: recognizedData.birthday,
    gender: recognizedData.gender,
    country: recognizedData.issuingCountry || recognizedData.country
  };
  
  setRecognizedUserData(userData);
  
  // ... bestehender Code (Zeile 109-143) ...
};
```

**Zeile 146-246:** `handleSubmit()` erweitern
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!documentType || !documentNumber || !issuingCountry) {
    showMessage(t('identificationDocuments.form.fillRequiredFields'), 'error');
    return;
  }
  
  setIsLoading(true);
  
  try {
    if (document) {
      // ... bestehender Code (Zeile 157-195) ...
    } else {
      // Erstellen eines neuen Dokuments
      if (file) {
        // Mit Datei erstellen
        const formData = new FormData();
        formData.append('documentType', documentType);
        formData.append('documentNumber', documentNumber);
        formData.append('issuingCountry', issuingCountry);
        if (issueDate) formData.append('issueDate', issueDate);
        if (expiryDate) formData.append('expiryDate', expiryDate);
        if (issuingAuthority) formData.append('issuingAuthority', issuingAuthority);
        
        // HINZUFÜGEN: User-Daten an FormData anhängen
        if (recognizedUserData) {
          if (recognizedUserData.firstName) formData.append('firstName', recognizedUserData.firstName);
          if (recognizedUserData.lastName) formData.append('lastName', recognizedUserData.lastName);
          if (recognizedUserData.birthday) formData.append('birthday', recognizedUserData.birthday);
          if (recognizedUserData.gender) formData.append('gender', recognizedUserData.gender);
          if (recognizedUserData.country) formData.append('country', recognizedUserData.country);
        }
        
        formData.append('documentFile', file);
        
        await idDocApi.addDocumentWithFile(userId, formData);
      } else if (imageData) {
        // Mit Kamerabild erstellen
        await idDocApi.addDocumentWithCameraImage(
          userId,
          imageData,
          {
            documentType,
            documentNumber,
            issuingCountry,
            issueDate,
            expiryDate,
            issuingAuthority,
            // HINZUFÜGEN: User-Daten
            firstName: recognizedUserData?.firstName,
            lastName: recognizedUserData?.lastName,
            birthday: recognizedUserData?.birthday,
            gender: recognizedUserData?.gender,
            country: recognizedUserData?.country
          }
        );
      } else {
        // ... bestehender Code (Zeile 225-234) ...
      }
      
      showMessage(t('identificationDocuments.form.createSuccess'), 'success');
    }
    
    onDocumentSaved();
  } catch (error: any) {
    // ... bestehender Code ...
  } finally {
    setIsLoading(false);
  }
};
```

**Datei:** `frontend/src/api/identificationDocumentApi.ts`

**Zeile 38-64:** `addDocumentWithCameraImage` erweitern
```typescript
// VORHER:
export const addDocumentWithCameraImage = async (
  userId: number,
  imageData: string,
  documentData: {
    documentType: string;
    documentNumber: string;
    issuingCountry: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
  }
): Promise<IdentificationDocument> => {

// NACHHER:
export const addDocumentWithCameraImage = async (
  userId: number,
  imageData: string,
  documentData: {
    documentType: string;
    documentNumber: string;
    issuingCountry: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    gender?: string;
    country?: string;
  }
): Promise<IdentificationDocument> => {
```

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

**Zeile 48:** Request-Body Destructuring erweitern
```typescript
// VORHER:
const { documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData } = req.body;

// NACHHER:
const { documentType, documentNumber, issueDate, expiryDate, issuingCountry, issuingAuthority, imageData, firstName, lastName, birthday, gender, country } = req.body;
```

**Zeile 102-281:** User-Update-Logik erweitern
```typescript
// HINZUFÜGEN (VOR Zeile 102, vor `const document = await prisma.identificationDocument.create`):
// User-Daten aus Request übernehmen (auch ohne Bild)
const userUpdateDataFromRequest: any = {};
if (firstName) userUpdateDataFromRequest.firstName = firstName;
if (lastName) userUpdateDataFromRequest.lastName = lastName;
if (birthday) userUpdateDataFromRequest.birthday = new Date(birthday);
if (gender && ['male', 'female', 'other'].includes(gender)) {
  userUpdateDataFromRequest.gender = gender;
}
if (country) {
  // Validiere Country-Code
  if (['CO', 'CH', 'DE', 'AT'].includes(country)) {
    userUpdateDataFromRequest.country = country;
  }
}

// Update User, falls Daten vorhanden (VOR AI-Erkennung)
if (Object.keys(userUpdateDataFromRequest).length > 0) {
  await prisma.user.update({
    where: { id: userId },
    data: userUpdateDataFromRequest
  });
  logger.log(`[addDocument] User ${userId} aktualisiert mit User-Daten aus Request:`, userUpdateDataFromRequest);
}

// ... bestehender Code (Zeile 102-281, AI-Erkennung bleibt unverändert) ...
```

---

## ⚠️ FEHLENDE PUNKTE: Übersetzungen, Notifications, Berechtigungen

### Übersetzungen

**FAKT:** Alle Texte in `Profile.tsx` und `IdentificationDocumentForm.tsx` verwenden bereits `t()` Funktion.

**Zu prüfen:**
- [ ] Alle neuen Texte haben Übersetzungskeys in `de.json`, `en.json`, `es.json`
- [ ] Keine hardcoded Texte vorhanden

**Dateien zu prüfen:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Bestehende Übersetzungskeys (FAKTEN):**
- `profile.*` - Profile-bezogene Texte
- `identificationDocuments.*` - Dokument-bezogene Texte
- `common.save`, `common.cancel` - Allgemeine Texte

**Neue Übersetzungskeys (falls nötig):**
- Keine neuen Texte werden hinzugefügt (nur bestehende verwendet)

### Notifications

**FAKT:** `identificationDocumentController.ts` hat KEINE `createNotificationIfEnabled` Aufrufe.

**FAKT:** `userController.ts` hat `createNotificationIfEnabled` Aufrufe für User-Updates (Zeile 956, 989, 1159, 1190, 1716, 1927, 1958, 2047).

**FAKT:** `getUserNotificationText` existiert bereits in `backend/src/utils/translations.ts` (Zeile 878-901).

**Implementierung erforderlich:**

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

**Zeile 1-9:** Imports erweitern
```typescript
// HINZUFÜGEN:
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getUserNotificationText, getUserLanguage } from '../utils/translations';
```

**Zeile 281 (nach erfolgreichem Dokument-Upload, vor `res.status(201).json(document)`):**
```typescript
// HINZUFÜGEN: Notification für User-Update
try {
  const language = await getUserLanguage(userId);
  const notificationText = getUserNotificationText(language, 'updated', true);
  
  await createNotificationIfEnabled({
    userId: userId,
    title: notificationText.title,
    message: notificationText.message,
    type: NotificationType.user,
    relatedEntityId: userId,
    relatedEntityType: 'update'
  });
} catch (notificationError) {
  logger.error('[addDocument] Fehler beim Erstellen der Notification:', notificationError);
  // Fehler blockiert nicht die Dokumentenerstellung
}
```

### Berechtigungen

**FAKT:** `Profile.tsx` hat KEINE `usePermissions` Hook.

**FAKT:** `seed.ts` hat `page_profile` Berechtigungen (Zeile 373, 437).

**FAKT:** `UserManagementTab.tsx` hat `usePermissions` Hook (Zeile 8, 79).

**Implementierung erforderlich:**

**Datei:** `frontend/src/pages/Profile.tsx`

**Zeile 1-13:** Imports erweitern
```typescript
// HINZUFÜGEN:
import { usePermissions } from '../hooks/usePermissions.ts';
```

**Zeile 59-63:** Hook hinzufügen
```typescript
const { hasPermission } = usePermissions();
```

**Zeile 316-689:** Berechtigungsprüfung hinzufügen
```typescript
// VOR return (Zeile 244):
if (!hasPermission('page_profile', 'read', 'page')) {
  return <div className="flex justify-center items-center h-screen">{t('common.noPermission', { defaultValue: 'Keine Berechtigung' })}</div>;
}
```

**Backend-Berechtigungen:**

**FAKT:** `backend/src/routes/users.ts` hat bereits `authMiddleware` (Zeile 55).

**FAKT:** `backend/src/routes/identificationDocuments.ts` hat bereits `authMiddleware` (Zeile 15).

**KEINE ÄNDERUNGEN ERFORDERLICH:** Berechtigungen sind bereits implementiert.

---

## 🔍 MEMORY LEAKS & PERFORMANCE

### Memory Leaks

**FAKT:** `useRef` wird verwendet (Phase 2), aber kein Cleanup nötig (Ref ist kein Subscription).

**FAKT:** `useEffect` in `Profile.tsx` (Zeile 85-109) hat `authUser` als Dependency - das ist korrekt.

**FAKT:** `useEffect` in `IdentificationDocumentList.tsx` (Zeile 41-43) hat `userId` als Dependency - das ist korrekt.

**FAKT:** `useImperativeHandle` in `IdentificationDocumentList.tsx` (Phase 2) hat `ref` und `loadDocuments` als Dependencies - das ist korrekt.

**KEINE MEMORY LEAKS:** Alle Hooks sind korrekt implementiert.

### Performance

**FAKT:** `fetchUserProfile()` wird mehrfach aufgerufen:
- Beim Mount (Zeile 107)
- Nach Dokument-Upload (Zeile 450)
- Nach Profil-Update (Zeile 191)

**FAKT:** `getUserById` lädt `identificationDocuments` immer (Zeile 240 in `userController.ts`).

**FAKT:** `IdentificationDocumentList` lädt Dokumente separat über `getUserDocuments` (Zeile 29).

**Performance-Impact:**
- **NEGLIGIBEL:** `fetchUserProfile()` wird nur bei User-Aktionen aufgerufen, nicht kontinuierlich
- **NEGLIGIBEL:** `getUserDocuments` lädt nur Dokumente für einen User (kleine Datenmenge)
- **KEINE OPTIMIERUNG ERFORDERLICH:** Performance-Impact ist minimal

---

## ✅ TEST-CHECKLISTE

### Phase 1: Edit-Modus anpassen
- [ ] Profile-Seite öffnen
- [ ] Felder direkt bearbeiten (ohne Edit-Button)
- [ ] Prüfen ob `isEditing` automatisch auf `true` gesetzt wird (Browser DevTools)
- [ ] Speichern klicken
- [ ] Prüfen ob Änderungen gespeichert werden
- [ ] Prüfen ob `isEditing` auf `false` gesetzt wird
- [ ] Dokument hochladen
- [ ] Prüfen ob `isEditing` auf `false` gesetzt wird
- [ ] Prüfen ob Speichern noch funktioniert

### Phase 2: Dokument wird angezeigt
- [ ] Dokument hochladen
- [ ] Tab "Documentos de Identificación" öffnen
- [ ] Prüfen ob Dokument angezeigt wird
- [ ] Dokument bearbeiten
- [ ] Prüfen ob Änderungen angezeigt werden
- [ ] Dokument löschen
- [ ] Prüfen ob Dokument aus Liste entfernt wird

### Phase 3: Erkannte Daten speichern
- [ ] Dokument hochladen mit "Daten automatisch erkennen"
- [ ] Prüfen ob User-Felder (firstName, lastName, birthday, etc.) aktualisiert werden
- [ ] Prüfen ob Daten in Datenbank gespeichert werden (Prisma Studio)
- [ ] Seite neu laden
- [ ] Prüfen ob Daten noch vorhanden sind
- [ ] Dokument hochladen OHNE "Daten automatisch erkennen"
- [ ] Prüfen ob User-Felder NICHT aktualisiert werden

### Übersetzungen
- [ ] Profile-Seite in Deutsch öffnen
- [ ] Profile-Seite in Englisch öffnen
- [ ] Profile-Seite in Spanisch öffnen
- [ ] Prüfen ob alle Texte übersetzt sind

### Notifications
- [ ] Dokument hochladen
- [ ] Prüfen ob Notification erstellt wird (Backend-Logs)
- [ ] Prüfen ob Notification im Frontend angezeigt wird

### Berechtigungen
- [ ] Profile-Seite mit Admin-Benutzer öffnen
- [ ] Profile-Seite mit User-Benutzer öffnen
- [ ] Prüfen ob Berechtigungen korrekt funktionieren

---

## 📚 REFERENZEN

- [PROFILE_REORGANISATION_PLAN.md](PROFILE_REORGANISATION_PLAN.md) - Profil-Reorganisation Plan
- [MODUL_DOKUMENT_ERKENNUNG.md](../modules/MODUL_DOKUMENT_ERKENNUNG.md) - Dokumentenerkennungs-Modul
- [CODING_STANDARDS.md](../core/CODING_STANDARDS.md) - Coding-Standards
- [IMPLEMENTATION_CHECKLIST.md](../core/IMPLEMENTATION_CHECKLIST.md) - Implementierungs-Checkliste
- [MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md](../technical/MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md) - Memory Leak Fixes

---

## 🚨 KRITISCH: Diese Punkte MÜSSEN vor Deployment beachtet werden!

1. **Edit-Modus anpassen:** Profile.tsx muss wie UserManagementTab.tsx funktionieren (automatische Aktivierung bei Input-Change)
2. **Dokument-Liste aktualisieren:** Nach Upload muss Liste neu geladen werden (Ref-Callback)
3. **User-Daten speichern:** Erkannte Daten müssen auf User-Felder geschrieben werden (Frontend → Backend)
4. **Notifications:** Notification für User-Update muss erstellt werden
5. **Berechtigungen:** Profile-Seite muss Berechtigungsprüfung haben
6. **Übersetzungen:** Alle Texte müssen in allen 3 Sprachen vorhanden sein

**Ohne diese Fixes:**
- User kann Dokumente nicht sehen
- Erkannte Daten gehen verloren
- Inkonsistente User Experience
- Keine Notifications bei wichtigen Aktionen
- Keine Berechtigungsprüfung

---

## 🔍 RISIKEN

### Risiko 1: Backend API-Änderung

**Beschreibung:**
- Backend `addDocument` muss User-Daten aus Request akzeptieren
- Aktuell werden nur Dokument-Daten akzeptiert (Zeile 48)

**Risiko:** 🟡 MITTEL
- Wenn User-Daten nicht akzeptiert werden, werden sie ignoriert
- Kein Breaking Change, da User-Daten optional sind

**Mitigation:**
- User-Daten sind optional (nur wenn vorhanden)
- Backend validiert User-Daten (gender muss 'male', 'female', 'other' sein)
- Backend validiert Country-Code (muss 'CO', 'CH', 'DE', 'AT' sein)

### Risiko 2: Frontend-Backend Dateninkonsistenz

**Beschreibung:**
- Frontend sendet User-Daten, Backend macht AI-Erkennung nochmal
- Mögliche Konflikte zwischen Frontend-Daten und Backend-AI-Daten

**Risiko:** 🟡 MITTEL
- Backend AI-Daten haben Priorität (überschreiben Frontend-Daten)
- Oder: Frontend-Daten haben Priorität (überschreiben Backend-AI-Daten)

**Mitigation:**
- **GEWÄHLT:** Frontend-Daten werden VOR AI-Erkennung gespeichert
- Backend AI-Daten überschreiben Frontend-Daten (falls AI-Erkennung erfolgreich)
- Logging hinzufügen um Konflikte zu erkennen

### Risiko 3: Performance bei vielen Dokumenten

**Beschreibung:**
- `fetchUserProfile()` lädt `identificationDocuments` immer
- Dokumente sind kleine Datenmengen (nur Metadaten, keine Binary-Daten)

**Risiko:** 🟢 NIEDRIG
- `getUserById` lädt Dokumente bereits (keine zusätzliche Query)
- Performance-Impact ist minimal (Dokumente sind kleine Datenmengen)

**Mitigation:**
- Keine Optimierung erforderlich (Performance-Impact ist minimal)

### Risiko 4: Memory Leaks durch Ref

**Beschreibung:**
- `useRef` wird verwendet, aber kein Cleanup

**Risiko:** 🟢 NIEDRIG
- `useRef` erfordert kein Cleanup (ist kein Subscription)
- `useImperativeHandle` erfordert kein Cleanup

**Mitigation:**
- Keine Änderung erforderlich (korrekt implementiert)

---

## 📊 PERFORMANCE-ANALYSE

### Frontend Performance

**Aktuelle Implementierung:**
- `fetchUserProfile()` wird bei Mount und nach Aktionen aufgerufen
- `IdentificationDocumentList` lädt Dokumente separat

**Performance-Impact:**
- **API-Calls:** 2 Calls (fetchUserProfile + loadDocuments) nach Dokument-Upload
- **Datenmenge:** ~10-50 KB pro Call (abhängig von Dokumentanzahl)
- **Ladezeit:** ~100-300ms pro Call

**Optimierung:**
- **NICHT ERFORDERLICH:** Performance-Impact ist minimal
- **ALTERNATIVE:** `IdentificationDocumentList` könnte `user.identificationDocuments` verwenden statt separater API-Call (würde 1 API-Call sparen)

### Backend Performance

**Aktuelle Implementierung:**
- `getUserById` lädt `identificationDocuments` immer (Zeile 240)
- `getUserDocuments` lädt Dokumente separat

**Performance-Impact:**
- **DB-Queries:** 2 Queries (getUserById + getUserDocuments) nach Dokument-Upload
- **Datenmenge:** ~10-50 KB pro Query
- **Query-Zeit:** ~50-150ms pro Query

**Optimierung:**
- **NICHT ERFORDERLICH:** Performance-Impact ist minimal
- **ALTERNATIVE:** `IdentificationDocumentList` könnte `user.identificationDocuments` verwenden statt separater Query (würde 1 Query sparen)

---

## 🔒 SECURITY

### Berechtigungen

**FAKT:** `Profile.tsx` hat KEINE `usePermissions` Hook.

**FAKT:** Backend hat bereits `authMiddleware` (Zeile 15 in `identificationDocuments.ts`, Zeile 55 in `users.ts`).

**Implementierung erforderlich:**
- Frontend-Berechtigungsprüfung hinzufügen (siehe Abschnitt "Berechtigungen")

### Input-Validierung

**FAKT:** Backend validiert bereits:
- `documentType`, `documentNumber`, `issuingCountry` sind erforderlich (Zeile 51-53)
- `gender` muss 'male', 'female', 'other' sein (wird in User-Update geprüft)
- `country` muss 'CO', 'CH', 'DE', 'AT' sein (wird in User-Update geprüft)

**KEINE ÄNDERUNGEN ERFORDERLICH:** Validierung ist bereits implementiert.

---

## 📝 ZUSAMMENFASSUNG DER ÄNDERUNGEN

### Frontend-Änderungen:
1. `Profile.tsx`: Edit-Modus anpassen (automatische Aktivierung bei Input-Change)
2. `Profile.tsx`: Ref-Callback für `IdentificationDocumentList` hinzufügen
3. `IdentificationDocumentList.tsx`: `forwardRef` und `useImperativeHandle` hinzufügen
4. `IdentificationDocumentForm.tsx`: User-Daten State und Logik hinzufügen
5. `aiDocumentRecognition.ts`: Return-Type erweitern
6. `identificationDocumentApi.ts`: Parameter erweitern
7. `Profile.tsx`: Berechtigungsprüfung hinzufügen

### Backend-Änderungen:
1. `documentRecognition.ts`: Response erweitern um User-Daten
2. `identificationDocumentController.ts`: Request-Body Destructuring erweitern
3. `identificationDocumentController.ts`: User-Update-Logik erweitern (VOR AI-Erkennung)
4. `identificationDocumentController.ts`: Notification hinzufügen

### Keine Änderungen:
- Übersetzungen (alle Texte verwenden bereits `t()`)
- Backend-Berechtigungen (bereits implementiert)
- Memory Leaks (keine vorhanden)
- Performance (keine Optimierung erforderlich)
