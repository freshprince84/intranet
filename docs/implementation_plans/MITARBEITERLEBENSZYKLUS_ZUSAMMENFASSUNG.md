# MITARBEITERLEBENSZYKLUS - Prozess-Zusammenfassung

## 1. WELCHE USER KOMMEN UNTER WELCHEN BEDINGUNGEN IN DIESEN PROZESS?

### Eintrittsbedingungen

#### ✅ User kommt in den Prozess, wenn:

1. **Neuer User wird zur Organisation hinzugefügt**
   - **Trigger**: User akzeptiert Invitation ODER Join Request wird genehmigt
   - **Bedingung**: Organisation hat Land "CO" (Kolumbien) konfiguriert
   - **Automatisch**: System erstellt `EmployeeLifecycle` mit Status `onboarding`

2. **Bestehender User wechselt Organisation**
   - **Trigger**: User wird zu neuer Organisation hinzugefügt
   - **Bedingung**: Neue Organisation hat Land "CO" konfiguriert
   - **Automatisch**: System erstellt neuen `EmployeeLifecycle` für neue Organisation

3. **User wird manuell in Onboarding-Phase gesetzt**
   - **Trigger**: HR/Admin setzt Status manuell auf `onboarding`
   - **Bedingung**: User gehört bereits zur Organisation
   - **Manuell**: HR/Admin kann Status ändern

### Rollen und ihre Funktionen

#### 👤 **Admin-Rolle**
- **Zugriff**: Vollzugriff auf alle Funktionen
- **Aufgaben**:
  - Rollen-Konfiguration (PROZESS 0)
  - Dokumenten-Konfiguration (PROZESS 1)
  - Alle HR-Funktionen
  - Alle Legal-Funktionen

#### 👔 **HR-Rolle** (konfigurierbar in `Organization.settings.lifecycleRoles.hrRoleId`)
- **Zugriff**: Arbeitszeugnisse und Arbeitsverträge erstellen/bearbeiten
- **Aufgaben**:
  - Arbeitszeugnis erstellen/bearbeiten (PROZESS 8, 12)
  - Arbeitsvertrag erstellen/bearbeiten (PROZESS 9, 13)
  - EPS-Status prüfen (PROZESS 4)
  - Dokumenten-Konfiguration (PROZESS 1)

#### ⚖️ **Legal-Rolle** (konfigurierbar in `Organization.settings.lifecycleRoles.legalRoleId`)
- **Zugriff**: Sozialversicherungs-Anmeldungen durchführen
- **Aufgaben**:
  - ARL-Anmeldung (PROZESS 3)
  - EPS-Anmeldung (PROZESS 4)
  - Pension-Anmeldung (PROZESS 5)
  - Caja-Anmeldung (PROZESS 6)
  - Email-Vorlagen generieren und versenden

#### 👷 **Mitarbeiter-Rollen** (alle anderen Rollen)
- **Zugriff**: Nur eigene Dokumente ansehen/downloaden
- **Aufgaben**:
  - Onboarding-Progress anzeigen (PROZESS 7)
  - Arbeitszeugnis abrufen (PROZESS 10)
  - Arbeitsvertrag abrufen (PROZESS 11)

---

## 2. WIE SIEHT DER PROZESS AUS?

### Prozess-Übersicht (Chronologisch)

```
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 0: Rollen-Konfiguration (Admin)                    │
│ → Einmalig: Admin konfiguriert Rollen-Zuordnung            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 1: Dokumenten-Konfiguration (Admin/HR)            │
│ → Einmalig: Templates und Signaturen hochladen             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 2: Onboarding - Automatische Task-Erstellung      │
│ → Trigger: User wird zur Organisation hinzugefügt          │
│ → System erstellt automatisch Tasks für:                   │
│   - HR: Dokumente prüfen, Vertrag erstellen                │
│   - Legal: ARL, EPS, Pension, Caja Anmeldungen             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 3-6: Sozialversicherungs-Anmeldungen (Legal)       │
│ → PROZESS 3: ARL-Anmeldung                                 │
│ → PROZESS 4: EPS-Anmeldung (falls erforderlich)            │
│ → PROZESS 5: Pension-Anmeldung                             │
│ → PROZESS 6: Caja-Anmeldung                                │
│ → Für jede: Email generieren → versenden → abschließen    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 7: Onboarding-Progress anzeigen (Mitarbeiter)     │
│ → Mitarbeiter sieht Fortschritt in seinem Profil          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 8-9: Dokumente erstellen (HR)                      │
│ → PROZESS 8: Arbeitszeugnis erstellen                      │
│ → PROZESS 9: Arbeitsvertrag erstellen                      │
│ → HR kann Text bearbeiten, PDF generieren                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 10-11: Dokumente abrufen (Mitarbeiter)            │
│ → PROZESS 10: Arbeitszeugnis abrufen                     │
│ → PROZESS 11: Arbeitsvertrag abrufen                      │
│ → Mitarbeiter sieht Dokumente automatisch nach Erstellung │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 12-13: Dokumente bearbeiten (HR)                  │
│ → PROZESS 12: Arbeitszeugnis bearbeiten (neue Version)    │
│ → PROZESS 13: Arbeitsvertrag bearbeiten (neue Version)     │
│ → HR erstellt neue Version, alte bleibt archiviert        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PROZESS 14: Automatische Generierung bei Offboarding      │
│ → Trigger: User wird auf Status "offboarding" gesetzt     │
│ → System generiert automatisch Arbeitszeugnis             │
│ → HR kann optional bearbeiten                              │
└─────────────────────────────────────────────────────────────┘
```

### Detaillierte Prozess-Beschreibung

#### **PROZESS 0: Rollen-Konfiguration (Admin)**
**Zweck**: Einmalige Konfiguration, welche Rollen für welche Prozessschritte zuständig sind

**Schritte**:
1. Admin öffnet Organisationseinstellungen
2. Admin öffnet Tab "Rollen-Konfiguration"
3. Admin konfiguriert:
   - Admin-Rolle (Standard: erste Rolle mit "Admin" im Namen)
   - HR-Rolle (Standard: gleiche wie Admin)
   - Legal-Rolle (Standard: Rolle "Derecho")
   - Mitarbeiter-Rollen (Standard: alle anderen)
4. Admin speichert Konfiguration

**Ergebnis**: `Organization.settings.lifecycleRoles` ist gespeichert

---

#### **PROZESS 1: Dokumenten-Konfiguration (Admin/HR)**
**Zweck**: Einmalige Konfiguration von Templates und Signaturen

**Schritte**:
1. Admin/HR öffnet Organisationseinstellungen
2. Admin/HR öffnet Tab "Dokumenten-Konfiguration"
3. Admin/HR lädt hoch:
   - Arbeitszeugnis-Template (PDF)
   - Signatur für Arbeitszeugnis (Bild/PDF mit Position)
   - Arbeitsvertrag-Template (PDF)
   - Signatur für Arbeitsvertrag (Bild/PDF mit Position)
4. Admin/HR konfiguriert Einstellungen:
   - Gehalt im Arbeitszeugnis anzeigen? (Ja/Nein)
   - Automatisch bei Offboarding generieren? (Ja/Nein)
   - Mitarbeiter-Unterschrift erforderlich? (Ja/Nein)
5. Admin/HR speichert Konfiguration

**Ergebnis**: `Organization.settings.documentTemplates`, `documentSignatures`, `documentSettings` sind gespeichert

---

#### **PROZESS 2: Onboarding - Automatische Task-Erstellung**
**Zweck**: Automatische Erstellung von Tasks bei User-Hinzufügung

**Trigger**: User wird zur Organisation hinzugefügt (Invitation akzeptiert oder Join Request genehmigt)

**Automatische Aktionen**:
1. System erstellt `EmployeeLifecycle` mit Status `onboarding`
2. System erstellt automatisch Tasks:
   - **HR-Rolle**: "Dokumente prüfen und verifizieren"
   - **HR-Rolle**: "Vertrag erstellen und versenden"
   - **Legal-Rolle**: "ARL-Anmeldung durchführen"
   - **Legal-Rolle**: "EPS-Anmeldung durchführen" (falls erforderlich)
   - **Legal-Rolle**: "Pension-Anmeldung durchführen"
   - **Legal-Rolle**: "Caja-Anmeldung durchführen"
3. System sendet Benachrichtigungen an alle betroffenen Rollen
4. System zeigt Onboarding-Progress-Bar im User-Profil

**Ergebnis**: Alle Onboarding-Tasks sind erstellt, Benachrichtigungen sind versendet

---

#### **PROZESS 3: ARL-Anmeldung durchführen (Legal-Rolle)**
**Zweck**: ARL-Anmeldung für neuen Mitarbeiter durchführen

**Schritte**:
1. Legal-Rolle öffnet Task "ARL-Anmeldung durchführen"
2. Legal-Rolle sieht automatisch generierte Daten (User, Cédula, Gehalt, etc.)
3. Legal-Rolle generiert Email-Vorlage (automatisch mit allen Daten gefüllt)
4. Legal-Rolle versendet Email (manuell oder automatisch)
5. Legal-Rolle schließt Anmeldung ab:
   - Eingabe: ARL-Registrierungsnummer
   - Eingabe: ARL-Provider
   - Eingabe: Registrierungsdatum
   - Optional: Notizen
6. System aktualisiert `EmployeeLifecycle.arlStatus` auf "registered"
7. System markiert Task als "done"
8. System sendet Benachrichtigung an Mitarbeiter

**Ergebnis**: ARL-Anmeldung ist abgeschlossen, Status ist aktualisiert

---

#### **PROZESS 4: EPS-Anmeldung (falls erforderlich)**
**Zweck**: EPS-Anmeldung nur wenn erforderlich

**Schritte**:
1. HR prüft EPS-Status im User-Profil
2. **Falls EPS nicht erforderlich**:
   - HR setzt Checkbox "EPS erforderlich" auf "Nein"
   - System setzt `EmployeeLifecycle.epsStatus` auf "not_required"
3. **Falls EPS erforderlich**:
   - HR setzt Checkbox "EPS erforderlich" auf "Ja"
   - System erstellt Task "EPS-Anmeldung durchführen" für Legal-Rolle
   - Prozess identisch zu ARL-Anmeldung (PROZESS 3)

**Ergebnis**: EPS-Status ist geklärt, ggf. Anmeldung läuft

---

#### **PROZESS 5: Pension-Anmeldung durchführen (Legal-Rolle)**
**Zweck**: Pension-Anmeldung für neuen Mitarbeiter durchführen

**Schritte**: Identisch zu PROZESS 3 (ARL), aber für Pension

**Ergebnis**: Pension-Anmeldung ist abgeschlossen

---

#### **PROZESS 6: Caja-Anmeldung durchführen (Legal-Rolle)**
**Zweck**: Caja-Anmeldung für neuen Mitarbeiter durchführen

**Schritte**: Identisch zu PROZESS 3 (ARL), aber für Caja

**Ergebnis**: Caja-Anmeldung ist abgeschlossen

---

#### **PROZESS 7: Onboarding-Progress anzeigen (Mitarbeiter)**
**Zweck**: Mitarbeiter sieht seinen Onboarding-Fortschritt

**Schritte**:
1. Mitarbeiter öffnet sein Profil
2. Mitarbeiter öffnet Tab "Lebenszyklus"
3. Mitarbeiter sieht:
   - Progress-Bar mit 5 Schritten (Passport, ARL, EPS, Pension, Caja)
   - Status jeder Sozialversicherung (pending, registered, not_required, etc.)
   - Details zu jeder Sozialversicherung (expandable)

**Ergebnis**: Mitarbeiter sieht aktuellen Fortschritt

---

#### **PROZESS 8: Arbeitszeugnis erstellen (HR)**
**Zweck**: HR erstellt Arbeitszeugnis für Mitarbeiter

**Schritte**:
1. HR öffnet User-Detail → Tab "Lebenszyklus"
2. HR klickt "Arbeitszeugnis erstellen"
3. Modal öffnet sich mit Tabs "Daten" und "Text bearbeiten"
4. **Tab "Daten"**:
   - HR prüft/bearbeitet automatisch erkannte Daten
   - HR wählt Optionen (Sprache, Gehalt anzeigen, etc.)
5. **Tab "Text bearbeiten"**:
   - HR sieht PDF-Vorschau (Template mit Daten gefüllt)
   - HR bearbeitet Text-Felder (Einleitung, Haupttext, Schlusstext)
   - HR aktualisiert Vorschau
6. HR klickt "Generieren und speichern"
7. System generiert PDF mit Signatur
8. System speichert Dokument
9. **Mitarbeiter sieht Dokument automatisch** in seinem Profil

**Ergebnis**: Arbeitszeugnis ist erstellt, Mitarbeiter kann es abrufen

---

#### **PROZESS 9: Arbeitsvertrag erstellen (HR)**
**Zweck**: HR erstellt Arbeitsvertrag für Mitarbeiter

**Schritte**: Identisch zu PROZESS 8, aber für Arbeitsvertrag

**Ergebnis**: Arbeitsvertrag ist erstellt, Mitarbeiter kann es abrufen

---

#### **PROZESS 10: Arbeitszeugnis abrufen (Mitarbeiter)**
**Zweck**: Mitarbeiter ruft sein Arbeitszeugnis ab

**Schritte**:
1. Mitarbeiter öffnet sein Profil
2. Mitarbeiter öffnet Tab "Meine Dokumente"
3. Mitarbeiter sieht Liste aller Arbeitszeugnisse
4. Mitarbeiter klickt "Download" oder "Vorschau"
5. PDF wird heruntergeladen oder angezeigt

**Ergebnis**: Mitarbeiter hat Zugriff auf sein Arbeitszeugnis

---

#### **PROZESS 11: Arbeitsvertrag abrufen (Mitarbeiter)**
**Zweck**: Mitarbeiter ruft seinen Arbeitsvertrag ab

**Schritte**: Identisch zu PROZESS 10, aber für Arbeitsvertrag

**Ergebnis**: Mitarbeiter hat Zugriff auf seinen Arbeitsvertrag

---

#### **PROZESS 12: Arbeitszeugnis bearbeiten (HR) - NEUE VERSION**
**Zweck**: HR erstellt neue Version eines bestehenden Arbeitszeugnisses

**Schritte**:
1. HR öffnet User-Detail → Tab "Lebenszyklus" → Box "Dokumente"
2. HR klickt "Bearbeiten" bei bestehendem Arbeitszeugnis
3. Modal öffnet sich mit bestehenden Daten
4. HR bearbeitet Daten/Text (wie in PROZESS 8)
5. HR klickt "Neue Version speichern"
6. System:
   - Setzt `isLatest = false` für alte Version
   - Erstellt neue Version mit `isLatest = true`
   - Speichert beide Versionen

**Ergebnis**: Neue Version ist erstellt, alte bleibt archiviert

---

#### **PROZESS 13: Arbeitsvertrag bearbeiten (HR) - NEUE VERSION**
**Zweck**: HR erstellt neue Version eines bestehenden Arbeitsvertrags

**Schritte**: Identisch zu PROZESS 12, aber für Arbeitsvertrag

**Ergebnis**: Neue Version ist erstellt, alte bleibt archiviert

---

#### **PROZESS 14: Automatische Generierung bei Offboarding**
**Zweck**: System generiert automatisch Arbeitszeugnis bei Offboarding

**Trigger**: User wird auf Status "offboarding" gesetzt

**Automatische Aktionen**:
1. System prüft: Ist `autoGenerateOnOffboarding = true`? → Ja
2. System generiert Arbeitszeugnis automatisch (mit Standard-Text)
3. System speichert Dokument
4. **Optional**: HR kann Dokument bearbeiten (wie in PROZESS 12)

**Ergebnis**: Arbeitszeugnis ist automatisch generiert, HR kann optional bearbeiten

---

## 3. WELCHE FRONTEND-KOMPONENTEN SIND FÜR WELCHE PROZESSSCHRITTE ANGEDACHT?

### Übersicht: Komponenten nach Prozess

#### **PROZESS 0: Rollen-Konfiguration**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Organisationseinstellungen öffnen | `OrganizationSettings.tsx` | `frontend/src/components/OrganizationSettings.tsx` |
| Rollen-Konfiguration öffnen | `EditOrganizationModal.tsx` | `frontend/src/components/organization/EditOrganizationModal.tsx` |
| Rollen-Zuordnung konfigurieren | `RoleConfigurationTab.tsx` | **NEU**: `frontend/src/components/organization/RoleConfigurationTab.tsx` |
| Rollen auswählen | `RoleSelector.tsx` | **NEU**: `frontend/src/components/organization/RoleSelector.tsx` |
| Standard-Zuordnung anwenden | `StandardRoleAssignmentButton.tsx` | **NEU**: `frontend/src/components/organization/StandardRoleAssignmentButton.tsx` |

---

#### **PROZESS 1: Dokumenten-Konfiguration**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Dokumenten-Konfiguration öffnen | `EditOrganizationModal.tsx` | `frontend/src/components/organization/EditOrganizationModal.tsx` |
| Template hochladen | `DocumentConfigurationTab.tsx` | **NEU**: `frontend/src/components/organization/DocumentConfigurationTab.tsx` |
| Signatur hochladen | `SignatureUploadModal.tsx` | **NEU**: `frontend/src/components/organization/SignatureUploadModal.tsx` |
| Einstellungen konfigurieren | `DocumentConfigurationTab.tsx` | **NEU**: `frontend/src/components/organization/DocumentConfigurationTab.tsx` |

---

#### **PROZESS 2: Onboarding - Automatische Task-Erstellung**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Tasks anzeigen | `Tasks.tsx` | `frontend/src/components/Tasks.tsx` (bestehend) |
| Task-Detail anzeigen | `EditTaskModal.tsx` | `frontend/src/components/EditTaskModal.tsx` (bestehend) |

**Backend**: Automatische Task-Erstellung beim User-Hinzufügen

---

#### **PROZESS 3-6: Sozialversicherungs-Anmeldungen**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Task-Detail anzeigen | `EditTaskModal.tsx` | `frontend/src/components/EditTaskModal.tsx` (bestehend) |
| Automatisch generierte Daten anzeigen | `TaskDataBox.tsx` | **NEU**: `frontend/src/components/lifecycle/TaskDataBox.tsx` |
| Email-Vorlage generieren | `EmailTemplateBox.tsx` | **NEU**: `frontend/src/components/lifecycle/EmailTemplateBox.tsx` |
| Email versenden | `EmailTemplateBox.tsx` | **NEU**: `frontend/src/components/lifecycle/EmailTemplateBox.tsx` |
| Anmeldung abschließen | `SocialSecurityCompletionBox.tsx` | **NEU**: `frontend/src/components/lifecycle/SocialSecurityCompletionBox.tsx` |

---

#### **PROZESS 7: Onboarding-Progress anzeigen**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Profil öffnen | `Profile.tsx` | `frontend/src/pages/Profile.tsx` (bestehend, erweitern) |
| Tab "Lebenszyklus" | `LifecycleTab.tsx` | **NEU**: `frontend/src/components/profile/LifecycleTab.tsx` |
| Progress-Bar anzeigen | `OnboardingProgressBar.tsx` | **NEU**: `frontend/src/components/lifecycle/OnboardingProgressBar.tsx` |
| Sozialversicherungen anzeigen | `SocialSecurityStatusBox.tsx` | **NEU**: `frontend/src/components/lifecycle/SocialSecurityStatusBox.tsx` |

---

#### **PROZESS 8: Arbeitszeugnis erstellen**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| User-Detail öffnen | `UserManagementTab.tsx` | `frontend/src/components/UserManagementTab.tsx` (bestehend) |
| Tab "Lebenszyklus" | `LifecycleView.tsx` | **NEU**: `frontend/src/components/user/LifecycleView.tsx` |
| Arbeitszeugnis erstellen | `CertificateCreationModal.tsx` | **NEU**: `frontend/src/components/lifecycle/CertificateCreationModal.tsx` |
| Daten prüfen/bearbeiten | `CertificateCreationModal.tsx` (Tab "Daten") | **NEU**: `frontend/src/components/lifecycle/CertificateCreationModal.tsx` |
| Text bearbeiten | `CertificateCreationModal.tsx` (Tab "Text bearbeiten") | **NEU**: `frontend/src/components/lifecycle/CertificateCreationModal.tsx` |
| PDF-Vorschau | `CertificateCreationModal.tsx` (PDF-Viewer) | **NEU**: `frontend/src/components/lifecycle/CertificateCreationModal.tsx` |

---

#### **PROZESS 9: Arbeitsvertrag erstellen**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Arbeitsvertrag erstellen | `ContractCreationModal.tsx` | **NEU**: `frontend/src/components/lifecycle/ContractCreationModal.tsx` |
| Vertragsdaten eingeben | `ContractCreationModal.tsx` (Tab "Vertragsdaten") | **NEU**: `frontend/src/components/lifecycle/ContractCreationModal.tsx` |
| Text bearbeiten | `ContractCreationModal.tsx` (Tab "Text bearbeiten") | **NEU**: `frontend/src/components/lifecycle/ContractCreationModal.tsx` |

---

#### **PROZESS 10: Arbeitszeugnis abrufen**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Profil öffnen | `Profile.tsx` | `frontend/src/pages/Profile.tsx` (bestehend, erweitern) |
| Tab "Meine Dokumente" | `MyDocumentsTab.tsx` | **NEU**: `frontend/src/components/profile/MyDocumentsTab.tsx` |
| Arbeitszeugnis-Liste | `CertificateList.tsx` | **NEU**: `frontend/src/components/lifecycle/CertificateList.tsx` |
| Download/Vorschau | `CertificateList.tsx` (Buttons) | **NEU**: `frontend/src/components/lifecycle/CertificateList.tsx` |

---

#### **PROZESS 11: Arbeitsvertrag abrufen**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Arbeitsvertrag-Liste | `ContractList.tsx` | **NEU**: `frontend/src/components/lifecycle/ContractList.tsx` |
| Download/Vorschau | `ContractList.tsx` (Buttons) | **NEU**: `frontend/src/components/lifecycle/ContractList.tsx` |

---

#### **PROZESS 12: Arbeitszeugnis bearbeiten**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Bestehendes Zeugnis öffnen | `LifecycleView.tsx` | **NEU**: `frontend/src/components/user/LifecycleView.tsx` |
| Bearbeitungs-Modal | `CertificateEditModal.tsx` | **NEU**: `frontend/src/components/lifecycle/CertificateEditModal.tsx` |
| Text bearbeiten | `CertificateEditModal.tsx` (Tab "Text bearbeiten") | **NEU**: `frontend/src/components/lifecycle/CertificateEditModal.tsx` |

---

#### **PROZESS 13: Arbeitsvertrag bearbeiten**

| Prozessschritt | Komponente | Datei |
|---------------|------------|-------|
| Bearbeitungs-Modal | `ContractEditModal.tsx` | **NEU**: `frontend/src/components/lifecycle/ContractEditModal.tsx` |
| Text bearbeiten | `ContractEditModal.tsx` (Tab "Text bearbeiten") | **NEU**: `frontend/src/components/lifecycle/ContractEditModal.tsx` |

---

### Komponenten-Übersicht (Alphabetisch)

#### **Neue Komponenten (zu erstellen)**

1. **`CertificateCreationModal.tsx`**
   - Zweck: Arbeitszeugnis erstellen (HR)
   - Tabs: "Daten", "Text bearbeiten"
   - Features: PDF-Vorschau, Text-Bearbeitung, PDF-Generierung

2. **`CertificateEditModal.tsx`**
   - Zweck: Arbeitszeugnis bearbeiten (HR)
   - Tabs: "Daten", "Text bearbeiten"
   - Features: Bestehende Daten laden, neue Version erstellen

3. **`CertificateList.tsx`**
   - Zweck: Liste aller Arbeitszeugnisse anzeigen
   - Features: Download, Vorschau, Sortierung nach Datum

4. **`ContractCreationModal.tsx`**
   - Zweck: Arbeitsvertrag erstellen (HR)
   - Tabs: "Vertragsdaten", "Text bearbeiten"
   - Features: PDF-Vorschau, Text-Bearbeitung, PDF-Generierung

5. **`ContractEditModal.tsx`**
   - Zweck: Arbeitsvertrag bearbeiten (HR)
   - Tabs: "Vertragsdaten", "Text bearbeiten"
   - Features: Bestehende Daten laden, neue Version erstellen

6. **`ContractList.tsx`**
   - Zweck: Liste aller Arbeitsverträge anzeigen
   - Features: Download, Vorschau, Sortierung nach Datum

7. **`DocumentConfigurationTab.tsx`**
   - Zweck: Dokumenten-Konfiguration (Templates, Signaturen, Einstellungen)
   - Features: Template-Upload, Signatur-Upload, Einstellungen konfigurieren

8. **`EmailTemplateBox.tsx`**
   - Zweck: Email-Vorlage generieren und versenden (Legal)
   - Features: Automatische Daten-Füllung, Email-Versand, Bestätigung

9. **`LifecycleTab.tsx`**
   - Zweck: Lebenszyklus-Status im Profil anzeigen (Mitarbeiter)
   - Features: Progress-Bar, Sozialversicherungen-Status

10. **`LifecycleView.tsx`**
    - Zweck: Lebenszyklus-Status im User-Detail anzeigen (HR/Admin)
    - Features: Dokumente erstellen/bearbeiten, Status anzeigen

11. **`MyDocumentsTab.tsx`**
    - Zweck: Eigene Dokumente anzeigen (Mitarbeiter)
    - Features: Arbeitszeugnis-Liste, Arbeitsvertrag-Liste, Download/Vorschau

12. **`OnboardingProgressBar.tsx`**
    - Zweck: Onboarding-Fortschritt visuell anzeigen
    - Features: 5 Schritte (Passport, ARL, EPS, Pension, Caja), Status-Icons

13. **`RoleConfigurationTab.tsx`**
    - Zweck: Rollen-Konfiguration (Admin)
    - Features: Admin/HR/Legal-Rolle auswählen, Mitarbeiter-Rollen auswählen

14. **`RoleSelector.tsx`**
    - Zweck: Einzelne Rolle auswählen (Dropdown)
    - Features: Alle Rollen der Organisation, Standard-Wert

15. **`SocialSecurityCompletionBox.tsx`**
    - Zweck: Sozialversicherungs-Anmeldung abschließen (Legal)
    - Features: Registrierungsnummer, Provider, Datum eingeben

16. **`SocialSecurityStatusBox.tsx`**
    - Zweck: Status aller Sozialversicherungen anzeigen
    - Features: ARL, EPS, Pension, Caja Status, Details expandable

17. **`StandardRoleAssignmentButton.tsx`**
    - Zweck: Standard-Zuordnung anwenden (Admin)
    - Features: Button, Bestätigungs-Modal

18. **`SignatureUploadModal.tsx`**
    - Zweck: Signatur hochladen (Admin/HR)
    - Features: Datei-Upload, Position konfigurieren, Vorschau

19. **`TaskDataBox.tsx`**
    - Zweck: Automatisch generierte Daten anzeigen (Legal)
    - Features: User-Daten, Organisation-Daten, "Daten kopieren" Button

#### **Bestehende Komponenten (zu erweitern)**

1. **`EditOrganizationModal.tsx`**
   - Erweitern: Neue Tabs "Rollen-Konfiguration" und "Dokumenten-Konfiguration"

2. **`EditTaskModal.tsx`**
   - Erweitern: Neue Boxen für Lebenszyklus-Tasks (TaskDataBox, EmailTemplateBox, SocialSecurityCompletionBox)

3. **`OrganizationSettings.tsx`**
   - Erweitern: Button für Rollen-Konfiguration (falls nicht vorhanden)

4. **`Profile.tsx`**
   - Erweitern: Neue Tabs "Lebenszyklus" und "Meine Dokumente"

5. **`Tasks.tsx`**
   - Erweitern: Filter für Lebenszyklus-Tasks (optional)

6. **`UserManagementTab.tsx`**
   - Erweitern: Neuer Tab "Lebenszyklus" mit LifecycleView

---

### Komponenten-Hierarchie

```
Profile.tsx
├── LifecycleTab.tsx (NEU)
│   ├── OnboardingProgressBar.tsx (NEU)
│   └── SocialSecurityStatusBox.tsx (NEU)
└── MyDocumentsTab.tsx (NEU)
    ├── CertificateList.tsx (NEU)
    └── ContractList.tsx (NEU)

UserManagementTab.tsx
└── LifecycleView.tsx (NEU)
    ├── CertificateCreationModal.tsx (NEU)
    ├── CertificateEditModal.tsx (NEU)
    ├── ContractCreationModal.tsx (NEU)
    └── ContractEditModal.tsx (NEU)

OrganizationSettings.tsx
└── EditOrganizationModal.tsx
    ├── RoleConfigurationTab.tsx (NEU)
    │   ├── RoleSelector.tsx (NEU)
    │   └── StandardRoleAssignmentButton.tsx (NEU)
    └── DocumentConfigurationTab.tsx (NEU)
        └── SignatureUploadModal.tsx (NEU)

EditTaskModal.tsx
├── TaskDataBox.tsx (NEU)
├── EmailTemplateBox.tsx (NEU)
└── SocialSecurityCompletionBox.tsx (NEU)
```

---

## Zusammenfassung

### User-Flows

1. **Admin**: Rollen konfigurieren → Dokumenten-Templates hochladen
2. **HR**: Arbeitszeugnisse/Arbeitsverträge erstellen/bearbeiten
3. **Legal**: Sozialversicherungs-Anmeldungen durchführen
4. **Mitarbeiter**: Onboarding-Progress anzeigen → Dokumente abrufen

### Prozess-Phasen

1. **Konfiguration** (einmalig): Rollen, Templates, Signaturen
2. **Onboarding** (automatisch): Tasks erstellen, Anmeldungen durchführen
3. **Aktiv** (laufend): Dokumente erstellen/bearbeiten, abrufen
4. **Offboarding** (automatisch): Arbeitszeugnis generieren

### Komponenten-Status

- **19 neue Komponenten** müssen erstellt werden
- **6 bestehende Komponenten** müssen erweitert werden
- **Alle Komponenten** folgen Design-Standards (Container-Struktur, Box-Design, Modal/Sidepane-Pattern)

