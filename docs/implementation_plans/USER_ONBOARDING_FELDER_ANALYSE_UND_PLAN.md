# User-Onboarding: Felder-Analyse und Anpassungsplan

## 📋 Analyse-Ergebnisse

### 1. Felder-Status

#### ✅ Bereits implementiert:
- **birthday**: Wird aus ID-Dokument extrahiert (✅ `identificationDocumentController.ts:176`)
- **contract & salary**: Admin-To-Do bereits geplant (✅ `createAdminOnboardingTask`)

#### ❌ Fehlt noch:
- **bankDetails**: 
  - ❌ Keine Prüfung für Zeiterfassung vorhanden
  - ❌ Kein automatischer To-Do für User nach Organisation-Beitritt
  - **Anforderung:** User muss bankDetails eingeben, bevor Zeiterfassung möglich ist

### 2. ID-Dokument-Felder Vereinheitlichung

#### Problem:
- **Frontend zeigt an** (aber existieren NICHT im User-Model):
  - `identificationType` ❌
  - `identificationExpiryDate` ❌
  - `identificationIssuingCountry` ❌
- **User-Model hat:**
  - `identificationNumber` ✅ (behalten für Rückwärtskompatibilität)
- **IdentificationDocument-Model hat:**
  - `documentType` ✅ (entspricht identificationType)
  - `documentNumber` ✅ (entspricht identificationNumber)
  - `expiryDate` ✅ (entspricht identificationExpiryDate)
  - `issuingCountry` ✅ (entspricht identificationIssuingCountry)

#### Lösung:
- **User.identificationNumber** behalten (wird automatisch aus Dokument befüllt)
- **Alle anderen ID-Felder** nur aus `IdentificationDocument` anzeigen
- **Frontend-Felder entfernen**, die nicht im User-Model existieren
- **Im Profil anzeigen:** Daten aus dem neuesten `IdentificationDocument` (falls vorhanden)

### 3. Organisation-Seite Sichtbarkeit

#### Anforderung:
- **Nur für User ohne Organisation sichtbar**
- **Sobald User Mitglied einer Organisation ist:** Per Berechtigungen ausblenden (standardmäßig ausgeblendet)

#### Aktueller Stand:
- Organisation-Seite wird über `hasPermission('organization_management', 'read', 'page')` geprüft
- User-Rolle hat standardmäßig `organization_management` = 'both' (in seed.ts)

#### Lösung:
- **Bedingte Sichtbarkeit:** Nur wenn User KEINE Organisation hat
- **Berechtigungen:** Standardmäßig 'none' für User-Rolle (nur wenn User keine Organisation hat, dann 'read')

---

## 🎯 Implementierungsplan

### Phase 1: ID-Dokument-Felder vereinen

#### 1.1 Backend: User-Model bereinigen
- ✅ `User.identificationNumber` behalten (wird automatisch befüllt)
- ❌ `User.identificationType`, `identificationExpiryDate`, `identificationIssuingCountry` existieren NICHT (gut!)

#### 1.2 Frontend: Profile.tsx anpassen
- **Entfernen:**
  - `identificationType` Feld (Zeile 496-514)
  - `identificationExpiryDate` Feld (Zeile 550-562)
  - `identificationIssuingCountry` Feld (Zeile 530-548)
- **Hinzufügen:**
  - Anzeige der ID-Dokument-Daten aus `IdentificationDocument` (neuestes Dokument)
  - Nur anzeigen, wenn Dokument vorhanden ist
  - Felder als readonly anzeigen (werden automatisch aus Dokument befüllt)

#### 1.3 Frontend: UserProfile Interface anpassen
- **Entfernen:**
  - `identificationType: string | null;`
  - `identificationExpiryDate: string | null;`
  - `identificationIssuingCountry: string | null;`
- **Hinzufügen:**
  - `identificationDocuments?: IdentificationDocument[];` (falls nicht vorhanden)

#### 1.4 Backend: User-Controller anpassen
- **Entfernen:** Mapping für `identificationType`, `identificationExpiryDate`, `identificationIssuingCountry`
- **Hinzufügen:** `identificationDocuments` in `getCurrentUser` include

---

### Phase 2: bankDetails To-Do und Zeiterfassungs-Prüfung

#### 2.1 Backend: createUserBankDetailsTask Funktion erstellen
**Datei:** `backend/src/services/taskAutomationService.ts`

**Funktion:** `createUserBankDetailsTask(userId: number, organizationId: number)`
- Erstellt To-Do für User (nicht Admin!)
- Task ist dem User zugewiesen (`responsibleId = userId`)
- Task-Titel: "Bankverbindung eingeben"
- Task-Beschreibung: "Bitte geben Sie Ihre Bankverbindung ein, bevor Sie die Zeiterfassung nutzen können."
- Link: `/profile` (User kann direkt im Profil eingeben)

**Trigger:** Nach Organisation-Beitritt (analog zu `createAdminOnboardingTask`)

#### 2.2 Backend: Zeiterfassungs-Prüfung erweitern
**Datei:** `backend/src/controllers/worktimeController.ts`

**Funktion:** `startWorktime` erweitern
- Prüfe ob `user.bankDetails` ausgefüllt ist
- Wenn nicht: Fehler zurückgeben mit Hinweis auf To-Do
- Fehlermeldung: "Bitte geben Sie zuerst Ihre Bankverbindung im Profil ein."

#### 2.3 Backend: Task-Controller erweitern
**Datei:** `backend/src/controllers/taskController.ts`

**Funktion:** `updateTask` erweitern
- Prüfe ob es ein BankDetails-To-Do ist (Titel-Pattern: "Bankverbindung eingeben")
- Wenn Status "done": Prüfe ob `user.bankDetails` ausgefüllt ist
- Wenn ja: Task als erledigt markieren

---

### Phase 3: Organisation-Seite Sichtbarkeit

#### 3.1 Backend: Seed-Datei anpassen
**Datei:** `backend/prisma/seed.ts`

**Änderung:** User-Rolle Berechtigungen
- Standardmäßig: `organization_management` = 'none' (nicht 'both')
- **Begründung:** User ohne Organisation können Join-Requests sehen, User mit Organisation sehen Seite nur wenn Berechtigung gesetzt
- **Flexibilität:** Jede Organisation kann die Berechtigung selbst anpassen (über DB)

#### 3.2 Frontend: Organisation-Seite anpassen
**Datei:** `frontend/src/pages/Organisation.tsx`

**Änderung:**
- Seite wird über Berechtigungen gesteuert (wie bisher)
- Standardmäßig 'none' = Seite nicht sichtbar
- Organisation kann Berechtigung auf 'read' oder 'both' setzen, wenn gewünscht

---

## ⚠️ Offene Fragen

### ✅ Fragen beantwortet:

1. **bankDetails To-Do:** Nach Organisation-Beitritt ✅
2. **ID-Dokument-Felder im Profil:** Ja, als readonly (automatisch befüllt) ✅
3. **Organisation-Seite Berechtigungen:** Statisch in seed.ts (DB-Einträge) ✅
   - Standardmäßig `organization_management` = 'none' für User-Rolle
   - Jede Organisation kann es selbst anpassen

---

## 📝 Nächste Schritte

1. ✅ Analyse abgeschlossen
2. ⏳ Plan bestätigen lassen
3. ⏳ Implementierung starten

