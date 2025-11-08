# MITARBEITERLEBENSZYKLUS - Detaillierter Implementierungsplan

## Dokumentationsstatus
- **Erstellt am**: 2025-01-XX
- **Status**: Planungsphase
- **Version**: 1.0
- **Fokus**: Kolumbien (CO), Organisation 1 (La Familia Hostel)

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Ziele und Anforderungen](#ziele-und-anforderungen)
3. [Mitarbeiterlebenszyklus - Phasen](#mitarbeiterlebenszyklus---phasen)
4. [Use Cases](#use-cases)
5. [Datenmodell](#datenmodell)
6. [Kolumbien-spezifische Prozesse](#kolumbien-spezifische-prozesse)
7. [Automatisierung](#automatisierung)
8. [Implementierungsphasen](#implementierungsphasen)
9. [Technische Architektur](#technische-architektur)
10. [API-Spezifikation](#api-spezifikation)
11. [Frontend-Komponenten](#frontend-komponenten)
12. [Dokumentation und Fortschrittsverfolgung](#dokumentation-und-fortschrittsverfolgung)

---

## Übersicht

Dieses Dokument beschreibt die vollständige Implementierung eines Systems zur Verwaltung des gesamten Mitarbeiterlebenszyklus - von der Registrierung bis zum Austritt aus der Organisation.

### Scope

**Phase 1 (Aktuell):**
- Fokus: Kolumbien (CO)
- Organisation: La Familia Hostel (ID: 1)
- Vollständige Abdeckung aller Phasen des Lebenszyklus

**Phase 2 (Zukünftig):**
- Erweiterung auf weitere Länder
- Länderspezifische Prozesse
- Multi-Organisation Support

### Kernfunktionen

1. **Automatische Prozesssteuerung**: Workflows werden automatisch ausgelöst basierend auf Events
2. **Rollenbasierte Task-Erstellung**: Tasks werden automatisch für definierte Rollen erstellt
3. **Dokumentenverwaltung**: Zentrale Verwaltung aller Mitarbeiterdokumente
4. **Status-Tracking**: Visueller Fortschrittsbalken für jeden Mitarbeiter
5. **Automatisierung**: Maximale Automatisierung wo möglich (ARL, EPS, Pension, etc.)
6. **Benachrichtigungen**: Automatische Benachrichtigungen an relevante Rollen

---

## Ziele und Anforderungen

### Hauptziele

1. **Vollständige Transparenz**: Jeder Schritt im Mitarbeiterlebenszyklus ist nachvollziehbar
2. **Automatisierung**: Reduzierung manueller Arbeit durch intelligente Automatisierung
3. **Compliance**: Sicherstellung, dass alle gesetzlichen Anforderungen erfüllt werden
4. **Skalierbarkeit**: System muss für weitere Länder/Organisationen erweiterbar sein
5. **Benutzerfreundlichkeit**: Intuitive UI für alle Beteiligten

### Anforderungen

#### Funktionale Anforderungen

- ✅ Automatische Task-Erstellung bei Events
- ✅ Rollenbasierte Zuweisung von Tasks
- ✅ Dokumentenverwaltung und -verknüpfung
- ✅ Status-Tracking mit visueller Darstellung
- ✅ Automatisierung von Anmeldungen (ARL, EPS, Pension, Caja)
- ✅ Email-Versand an externe Partner (Anwalt, etc.)
- ✅ Template-basierte Dokumentenerstellung (Arbeitszeugnisse, etc.)
- ✅ Audit-Log für alle Aktionen

#### Nicht-funktionale Anforderungen

- ✅ Performance: System muss auch bei vielen Mitarbeitern performant bleiben
- ✅ Sicherheit: Sensible Daten müssen geschützt werden
- ✅ Wartbarkeit: Code muss gut strukturiert und dokumentiert sein
- ✅ Erweiterbarkeit: Neue Länder/Prozesse müssen einfach hinzugefügt werden können

---

## Mitarbeiterlebenszyklus - Phasen

### Phase 1: Registrierung / Onboarding

**Trigger**: User wird zur Organisation hinzugefügt (via Invitation oder Join Request)

**Status**: `onboarding`

**Schritte**:
1. User akzeptiert Invitation / Join Request wird genehmigt
2. System erstellt automatisch Onboarding-Tasks
3. Dokumente werden hochgeladen/erkannt
4. Sozialversicherungsanmeldungen werden initiiert

**Dauer**: 1-2 Wochen

### Phase 2: Aktiv / Beschäftigt

**Trigger**: Alle Onboarding-Schritte abgeschlossen

**Status**: `active`

**Schritte**:
1. Reguläre Beschäftigung
2. Dokumente werden verwaltet (Verlängerungen, etc.)
3. Vertragsänderungen werden dokumentiert
4. Regelmäßige Compliance-Checks

**Dauer**: Bis zum Austritt

### Phase 3: Vertragsänderung

**Trigger**: Manuell ausgelöst oder automatisch bei Vertragsende

**Status**: `contract_change`

**Schritte**:
1. Vertragsänderung wird dokumentiert
2. Neue Dokumente werden angefordert (falls nötig)
3. Sozialversicherungen werden aktualisiert
4. Tasks für relevante Rollen werden erstellt

**Dauer**: 1-2 Wochen

### Phase 4: Offboarding / Austritt

**Trigger**: Manuell ausgelöst (Kündigung, Vertragsende, etc.)

**Status**: `offboarding`

**Schritte**:
1. Austrittsdatum wird festgelegt
2. Offboarding-Tasks werden erstellt
3. Dokumente werden archiviert
4. Sozialversicherungen werden abgemeldet
5. Arbeitszeugnis wird generiert
6. Finale Abrechnungen werden durchgeführt

**Dauer**: 2-4 Wochen

### Phase 5: Archiviert

**Trigger**: Offboarding abgeschlossen

**Status**: `archived`

**Schritte**:
1. User wird deaktiviert (nicht gelöscht!)
2. Alle Daten werden archiviert
3. Zugriff nur noch für Administratoren

**Dauer**: Permanently

---

## Use Cases

### UC-1: User-Registrierung / Onboarding starten

**Akteur**: Administrator, HR-Manager

**Vorbedingung**: 
- User existiert noch nicht oder ist nicht Teil der Organisation
- Organisation ist konfiguriert (Land: Kolumbien)

**Hauptszenario**:
1. Administrator erstellt User oder lädt User via Invitation ein
2. User akzeptiert Invitation / Join Request wird genehmigt
3. System erkennt automatisch: Neuer User in Organisation mit Land "CO"
4. System setzt User-Status auf `onboarding`
5. System erstellt automatisch Onboarding-Tasks für definierte Rollen:
   - **HR-Rolle**: "Dokumente prüfen und verifizieren"
   - **HR-Rolle**: "Vertrag erstellen und versenden"
   - **Legal-Rolle**: "ARL-Anmeldung initiieren"
   - **Legal-Rolle**: "EPS-Anmeldung initiieren" (falls erforderlich)
   - **Legal-Rolle**: "Pension-Anmeldung initiieren"
   - **Legal-Rolle**: "Caja-Anmeldung initiieren"
6. System sendet Benachrichtigungen an alle betroffenen Rollen
7. System zeigt Onboarding-Progress-Bar im User-Profil

**Erweiterte Szenarien**:
- **E1**: User hat bereits Dokumente hochgeladen → System erkennt diese automatisch
- **E2**: User ist bereits bei anderen Organisationen → System kopiert relevante Daten (falls erlaubt)

**Nachbedingung**:
- User hat Status `onboarding`
- Alle Onboarding-Tasks sind erstellt
- Progress-Bar zeigt aktuellen Stand

---

### UC-2: Dokument hochladen und automatisch erkennen

**Akteur**: User, Administrator

**Vorbedingung**:
- User ist in Onboarding-Phase
- Dokumenten-Upload ist möglich

**Hauptszenario**:
1. User/Administrator lädt Dokument hoch (Passport, Cédula, etc.)
2. System erkennt Dokumenttyp automatisch (via KI)
3. System extrahiert relevante Daten (Nummer, Ablaufdatum, etc.)
4. System speichert Dokument im `IdentificationDocument`-Modell
5. System aktualisiert Progress-Bar
6. System prüft: Sind alle erforderlichen Dokumente vorhanden?
7. Falls ja: System erstellt Task "Dokumente verifizieren" für HR-Rolle

**Erweiterte Szenarien**:
- **E1**: Dokument kann nicht erkannt werden → Task für manuelle Prüfung wird erstellt
- **E2**: Dokument ist abgelaufen → Warnung wird angezeigt

**Nachbedingung**:
- Dokument ist gespeichert und verknüpft
- Progress-Bar ist aktualisiert

---

### UC-3: ARL-Anmeldung automatisieren

**Akteur**: System (automatisch), Legal-Rolle (manuell)

**Vorbedingung**:
- User ist in Onboarding-Phase
- ARL-Anmeldung ist für Kolumbien konfiguriert
- Erforderliche Daten sind vorhanden

**Hauptszenario**:
1. System erkennt: User hat Status `onboarding`, Land ist "CO"
2. System prüft: Ist ARL-Anmeldung bereits durchgeführt? → Nein
3. System erstellt automatisch Task "ARL-Anmeldung durchführen" für Legal-Rolle
4. System sammelt alle erforderlichen Daten:
   - User-Daten (Name, Cédula, etc.)
   - Vertragsdaten (Startdatum, Gehalt, etc.)
   - Organisationsdaten (NIT, etc.)
5. System generiert Email-Vorlage mit allen Daten
6. System sendet Email an konfigurierte ARL-Kontaktadresse (falls automatisch)
   ODER
7. System zeigt Email-Vorlage im Task an (falls manuell)
8. Legal-Rolle führt Anmeldung durch
9. Legal-Rolle markiert Task als erledigt
10. System aktualisiert Status: `arl_registered: true`
11. System aktualisiert Progress-Bar

**Erweiterte Szenarien**:
- **E1**: ARL-Anmeldung schlägt fehl → Task wird reaktiviert
- **E2**: ARL-Anmeldung erfordert zusätzliche Dokumente → System erstellt Task "Dokumente für ARL bereitstellen"

**Nachbedingung**:
- ARL-Anmeldung ist durchgeführt
- Status ist aktualisiert
- Progress-Bar zeigt "ARL registered"

---

### UC-4: EPS-Anmeldung (falls erforderlich)

**Akteur**: System (automatisch), Legal-Rolle (manuell)

**Vorbedingung**:
- User ist in Onboarding-Phase
- EPS-Anmeldung ist für User erforderlich (konfigurierbar pro User)

**Hauptszenario**:
1. System prüft: Ist EPS für diesen User erforderlich?
   - Standard: Nein (User hat bereits EPS über andere Quelle)
   - Kann pro User konfiguriert werden
2. Falls erforderlich:
   - System erstellt Task "EPS-Anmeldung durchführen" für Legal-Rolle
   - Prozess ähnlich wie UC-3
3. Falls nicht erforderlich:
   - System setzt Status: `eps_required: false`
   - Progress-Bar zeigt "EPS not required"

**Nachbedingung**:
- EPS-Status ist klar (registriert oder nicht erforderlich)

---

### UC-5: Pension-Anmeldung automatisieren

**Akteur**: System (automatisch), Legal-Rolle (manuell)

**Vorbedingung**:
- User ist in Onboarding-Phase
- Pension-Anmeldung ist für Kolumbien konfiguriert

**Hauptszenario**:
1. System erstellt automatisch Task "Pension-Anmeldung durchführen" für Legal-Rolle
2. System sammelt erforderliche Daten
3. System generiert Email-Vorlage oder sendet automatisch
4. Legal-Rolle führt Anmeldung durch
5. System aktualisiert Status: `pension_registered: true`

**Nachbedingung**:
- Pension-Anmeldung ist durchgeführt

---

### UC-6: Caja-Anmeldung automatisieren

**Akteur**: System (automatisch), Legal-Rolle (manuell)

**Vorbedingung**:
- User ist in Onboarding-Phase
- Caja-Anmeldung ist für Kolumbien konfiguriert

**Hauptszenario**:
1. System erstellt automatisch Task "Caja-Anmeldung durchführen" für Legal-Rolle
2. System sammelt erforderliche Daten
3. System generiert Email-Vorlage oder sendet automatisch
4. Legal-Rolle führt Anmeldung durch
5. System aktualisiert Status: `caja_registered: true`

**Nachbedingung**:
- Caja-Anmeldung ist durchgeführt

---

### UC-7: Onboarding abschließen

**Akteur**: HR-Manager, System (automatisch)

**Vorbedingung**:
- Alle erforderlichen Schritte sind abgeschlossen:
  - ✅ Passport/Cédula hochgeladen und verifiziert
  - ✅ ARL registriert
  - ✅ EPS registriert oder als nicht erforderlich markiert
  - ✅ Pension registriert
  - ✅ Caja registriert
  - ✅ Vertrag erstellt und versendet

**Hauptszenario**:
1. System prüft automatisch: Sind alle erforderlichen Schritte abgeschlossen?
2. Falls ja:
   - System setzt User-Status auf `active`
   - System sendet Benachrichtigung an User: "Onboarding abgeschlossen"
   - System sendet Benachrichtigung an HR: "User ist jetzt aktiv"
   - System erstellt Event-Log: "Onboarding abgeschlossen am [Datum]"
3. Falls nein:
   - System zeigt Liste der fehlenden Schritte
   - HR kann manuell abschließen (mit Begründung)

**Nachbedingung**:
- User hat Status `active`
- Alle Onboarding-Tasks sind abgeschlossen

---

### UC-8: Arbeitszeugnis generieren (JEDERZEIT ABRUFBAR)

**Akteur**: HR-Manager, User (selbst), System (automatisch bei Offboarding)

**Vorbedingung**:
- User ist aktiv, in Offboarding-Phase oder archiviert
- Template für Arbeitszeugnis ist in Organization.settings konfiguriert

**Hauptszenario**:
1. User oder HR-Manager ruft Arbeitszeugnis ab (Button im User-Profil)
2. System prüft: Existiert bereits ein aktuelles Arbeitszeugnis?
   - Falls ja: System zeigt vorhandenes Arbeitszeugnis an
   - Falls nein oder veraltet: System generiert neues
3. System sammelt alle relevanten Daten:
   - User-Daten (Name, Cédula, etc.)
   - Eintrittsdatum (aus EmployeeLifecycle.contractStartDate oder User.createdAt)
   - Austrittsdatum (aus EmployeeLifecycle.exitDate, falls vorhanden)
   - Vertragstyp (aus EmployeeLifecycle.contractType)
   - Gehalt (aus User.monthlySalary, falls erlaubt und konfiguriert)
   - Organisationsdaten (Name, NIT, etc.)
4. System lädt Template aus Organization.settings.documentTemplates.employmentCertificate
5. System lädt Signatur aus Organization.settings.documentSignatures.employmentCertificate
6. System füllt Template mit Daten
7. System fügt Signatur hinzu (an konfigurierter Position)
8. System generiert PDF
9. System speichert PDF im `EmploymentCertificate`-Modell
10. System zeigt Download-Link im User-Profil
11. System sendet PDF an User (Email, falls konfiguriert)

**Erweiterte Szenarien**:
- **E1**: Template fehlt → System zeigt Hinweis: "Template muss in Organisationseinstellungen konfiguriert werden"
- **E2**: Signatur fehlt → System zeigt Hinweis: "Signatur muss in Organisationseinstellungen konfiguriert werden"
- **E3**: User ist noch im Onboarding → System zeigt Hinweis: "Arbeitszeugnis kann erst nach Abschluss des Onboardings generiert werden"

**Nachbedingung**:
- Arbeitszeugnis ist generiert und jederzeit abrufbar
- PDF ist im System gespeichert
- Download-Link ist im User-Profil verfügbar

---

### UC-8b: Arbeitsvertrag generieren (JEDERZEIT ABRUFBAR)

**Akteur**: HR-Manager, User (selbst), System (automatisch bei Onboarding)

**Vorbedingung**:
- User ist in Onboarding-Phase, aktiv oder archiviert
- Template für Arbeitsvertrag ist in Organization.settings konfiguriert

**Hauptszenario**:
1. User oder HR-Manager ruft Arbeitsvertrag ab (Button im User-Profil)
2. System prüft: Existiert bereits ein Arbeitsvertrag?
   - Falls ja: System zeigt vorhandenen Vertrag an
   - Falls nein: System generiert neuen
3. System sammelt alle relevanten Daten:
   - User-Daten (Name, Cédula, Adresse, etc.)
   - Vertragsdaten (Startdatum, Enddatum, Typ, Gehalt, etc.)
   - Organisationsdaten (Name, NIT, Adresse, etc.)
   - Arbeitszeiten (aus User.normalWorkingHours)
   - Position/Rolle (aus User-Rollen)
4. System lädt Template aus Organization.settings.documentTemplates.employmentContract
5. System lädt Signatur aus Organization.settings.documentSignatures.employmentContract
6. System füllt Template mit Daten
7. System fügt Signatur hinzu (an konfigurierter Position)
8. System generiert PDF
9. System speichert PDF im `ContractDocument`-Modell
10. System zeigt Download-Link im User-Profil
11. System sendet PDF an User (Email, falls konfiguriert)

**Erweiterte Szenarien**:
- **E1**: Template fehlt → System zeigt Hinweis: "Template muss in Organisationseinstellungen konfiguriert werden"
- **E2**: Signatur fehlt → System zeigt Hinweis: "Signatur muss in Organisationseinstellungen konfiguriert werden"
- **E3**: Vertragsdaten fehlen → System erstellt Task "Vertragsdaten vervollständigen"

**Nachbedingung**:
- Arbeitsvertrag ist generiert und jederzeit abrufbar
- PDF ist im System gespeichert
- Download-Link ist im User-Profil verfügbar

---

### UC-9: Offboarding starten

**Akteur**: HR-Manager, Administrator

**Vorbedingung**:
- User ist aktiv
- Austrittsdatum ist bekannt

**Hauptszenario**:
1. HR-Manager setzt Austrittsdatum im User-Profil
2. System setzt User-Status auf `offboarding`
3. System erstellt automatisch Offboarding-Tasks:
   - **HR-Rolle**: "Arbeitszeugnis generieren"
   - **HR-Rolle**: "Finale Abrechnung durchführen"
   - **Legal-Rolle**: "ARL-Abmeldung durchführen"
   - **Legal-Rolle**: "EPS-Abmeldung durchführen" (falls erforderlich)
   - **Legal-Rolle**: "Pension-Abmeldung durchführen"
   - **Legal-Rolle**: "Caja-Abmeldung durchführen"
   - **IT-Rolle**: "Zugänge deaktivieren"
4. System sendet Benachrichtigungen an alle betroffenen Rollen
5. System zeigt Offboarding-Progress-Bar

**Nachbedingung**:
- User hat Status `offboarding`
- Alle Offboarding-Tasks sind erstellt

---

### UC-10: Offboarding abschließen

**Akteur**: HR-Manager, System (automatisch)

**Vorbedingung**:
- Alle Offboarding-Schritte sind abgeschlossen
- Austrittsdatum ist erreicht

**Hauptszenario**:
1. System prüft automatisch: Sind alle Offboarding-Schritte abgeschlossen?
2. System prüft: Ist Austrittsdatum erreicht?
3. Falls beide Bedingungen erfüllt:
   - System setzt User-Status auf `archived`
   - System deaktiviert User (User kann sich nicht mehr einloggen)
   - System archiviert alle Daten
   - System erstellt Event-Log: "Offboarding abgeschlossen am [Datum]"
4. HR kann manuell abschließen (mit Begründung)

**Nachbedingung**:
- User hat Status `archived`
- User ist deaktiviert
- Alle Daten sind archiviert

---

## Datenmodell

### Neues Prisma Schema

```prisma
// ============================================
// EMPLOYEE LIFECYCLE MODELS
// ============================================

enum EmployeeStatus {
  onboarding      // User wurde hinzugefügt, Onboarding läuft
  active          // User ist aktiv beschäftigt
  contract_change // Vertragsänderung läuft
  offboarding     // Austritt läuft
  archived        // User ist ausgetreten, Daten archiviert
}

enum SocialSecurityStatus {
  not_required    // Nicht erforderlich (z.B. EPS bei bestehender Versicherung)
  pending         // Anmeldung läuft
  registered      // Erfolgreich registriert
  failed          // Anmeldung fehlgeschlagen
  deregistered    // Abgemeldet
}

model EmployeeLifecycle {
  id                    Int                    @id @default(autoincrement())
  userId                Int                    @unique
  user                  User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId        Int
  organization          Organization           @relation(fields: [organizationId], references: [id])
  status                EmployeeStatus         @default(onboarding)
  
  // Onboarding-Daten
  onboardingStartedAt  DateTime?
  onboardingCompletedAt DateTime?
  
  // Vertragsdaten
  contractStartDate     DateTime?
  contractEndDate       DateTime?
  contractType          String?                // "indefinite", "fixed_term", "temporary", etc.
  
  // Sozialversicherungen (Kolumbien)
  arlStatus            SocialSecurityStatus    @default(pending)
  arlRegisteredAt      DateTime?
  arlNumber            String?
  arlProvider          String?                 // Name der ARL-Versicherung
  
  epsStatus            SocialSecurityStatus    @default(not_required)
  epsRequired          Boolean                 @default(false)
  epsRegisteredAt      DateTime?
  epsNumber            String?
  epsProvider          String?
  
  pensionStatus        SocialSecurityStatus    @default(pending)
  pensionRegisteredAt  DateTime?
  pensionNumber        String?
  pensionProvider      String?
  
  cajaStatus           SocialSecurityStatus    @default(pending)
  cajaRegisteredAt     DateTime?
  cajaNumber           String?
  cajaProvider         String?
  
  // Offboarding-Daten
  exitDate             DateTime?
  exitReason           String?                 // "resignation", "termination", "contract_end", etc.
  offboardingStartedAt DateTime?
  offboardingCompletedAt DateTime?
  
  // Metadaten
  createdAt            DateTime                @default(now())
  updatedAt            DateTime                @updatedAt
  
  // Beziehungen
  lifecycleEvents      LifecycleEvent[]
  employmentCertificates EmploymentCertificate[]
  contractDocuments    ContractDocument[]
  
  @@index([organizationId])
  @@index([status])
}

model LifecycleEvent {
  id                    Int                    @id @default(autoincrement())
  lifecycleId           Int
  lifecycle             EmployeeLifecycle     @relation(fields: [lifecycleId], references: [id], onDelete: Cascade)
  eventType             String                // "onboarding_started", "document_uploaded", "arl_registered", etc.
  eventData             Json?                  // Zusätzliche Event-Daten
  triggeredBy           Int?                  // User-ID, der das Event ausgelöst hat
  triggeredByUser       User?                 @relation("LifecycleEventTriggerer", fields: [triggeredBy], references: [id])
  createdAt             DateTime               @default(now())
  
  @@index([lifecycleId])
  @@index([eventType])
}

model EmploymentCertificate {
  id                    Int                    @id @default(autoincrement())
  lifecycleId           Int
  lifecycle             EmployeeLifecycle     @relation(fields: [lifecycleId], references: [id], onDelete: Cascade)
  certificateType       String                 @default("employment") // "employment", "salary", "work_experience", etc.
  issueDate             DateTime               @default(now())
  pdfPath               String
  templateUsed          String?                // Name des verwendeten Templates
  templateVersion       String?                // Version des Templates (für Nachverfolgbarkeit)
  generatedBy           Int?                  // User-ID, der das Zertifikat generiert hat
  generatedByUser        User?                 @relation("CertificateGenerator", fields: [generatedBy], references: [id])
  isLatest              Boolean                @default(true) // Ist dies die neueste Version?
  createdAt             DateTime               @default(now())
  
  @@index([lifecycleId])
  @@index([lifecycleId, isLatest])
}

model ContractDocument {
  id                    Int                    @id @default(autoincrement())
  lifecycleId           Int
  lifecycle             EmployeeLifecycle     @relation(fields: [lifecycleId], references: [id], onDelete: Cascade)
  contractType          String                 // "initial", "amendment", "renewal", etc.
  contractStartDate     DateTime
  contractEndDate       DateTime?
  pdfPath               String
  templateUsed          String?                // Name des verwendeten Templates
  templateVersion       String?                // Version des Templates
  generatedBy           Int?                  // User-ID, der den Vertrag generiert hat
  generatedByUser        User?                 @relation("ContractGenerator", fields: [generatedBy], references: [id])
  isLatest              Boolean                @default(true) // Ist dies die neueste Version?
  signedByEmployee      Boolean                @default(false) // Wurde der Vertrag vom Mitarbeiter unterschrieben?
  signedByOrganization  Boolean                @default(true) // Wurde der Vertrag von der Organisation unterschrieben?
  createdAt             DateTime               @default(now())
  
  @@index([lifecycleId])
  @@index([lifecycleId, isLatest])
}

// Automatisierungs-Konfiguration pro Organisation/Land
model LifecycleConfiguration {
  id                    Int                    @id @default(autoincrement())
  organizationId        Int
  organization          Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  country               String                 // ISO Country Code (z.B. "CO")
  
  // Automatisierungs-Einstellungen
  autoCreateOnboardingTasks Boolean            @default(true)
  autoCreateOffboardingTasks Boolean           @default(true)
  autoSendEmails         Boolean               @default(false) // Vorsicht: Nur wenn sicher konfiguriert
  
  // Rollen-Zuordnung für automatische Task-Erstellung (DEPRECATED - verwende Organization.settings.lifecycleRoles stattdessen)
  hrRoleId              Int?                   // Rolle für HR-Tasks
  legalRoleId           Int?                   // Rolle für Legal-Tasks (ARL, EPS, etc.)
  itRoleId              Int?                   // Rolle für IT-Tasks (Zugänge, etc.)
  
  // Email-Konfiguration
  arlEmail              String?                // Email-Adresse für ARL-Anmeldungen
  epsEmail              String?                // Email-Adresse für EPS-Anmeldungen
  pensionEmail          String?                // Email-Adresse für Pension-Anmeldungen
  cajaEmail             String?                // Email-Adresse für Caja-Anmeldungen
  lawyerEmail           String?                // Email-Adresse für Anwalt
  
  // Template-Pfade (DEPRECATED - verwende Organization.settings stattdessen)
  employmentCertificateTemplate String?        // Pfad zum Arbeitszeugnis-Template
  
  // Metadaten
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
  
  @@unique([organizationId, country])
  @@index([country])
}

// Task-Templates für automatische Erstellung
model LifecycleTaskTemplate {
  id                    Int                    @id @default(autoincrement())
  configurationId       Int
  configuration         LifecycleConfiguration @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  phase                 String                 // "onboarding", "offboarding", "contract_change"
  taskTitle             String
  taskDescription       String?
  assignedRoleId        Int?                   // Rolle, der der Task zugewiesen wird
  assignedRole          Role?                  @relation(fields: [assignedRoleId], references: [id])
  priority              String                 @default("normal") // "low", "normal", "high", "urgent"
  dueDateOffset         Int?                   // Tage nach Event (z.B. 7 = 7 Tage nach Onboarding-Start)
  isRequired            Boolean                @default(true)     // Muss dieser Task erledigt werden?
  order                 Int                   // Reihenfolge der Tasks
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
  
  @@index([configurationId, phase])
}
```

### Erweiterungen am User-Model

```prisma
model User {
  // ... bestehende Felder ...
  
  // Neue Beziehungen
  lifecycle              EmployeeLifecycle?
  lifecycleEventsTriggered LifecycleEvent[]   @relation("LifecycleEventTriggerer")
  certificatesGenerated  EmploymentCertificate[] @relation("CertificateGenerator")
  contractsGenerated     ContractDocument[]     @relation("ContractGenerator")
}
```

### Erweiterungen am Organization-Model - Settings-Struktur

Die `Organization.settings` (JSON-Feld) wird erweitert um Dokumenten-Konfiguration und Rollen-Zuordnung:

```typescript
interface OrganizationSettings {
  // ... bestehende Settings (language, smtp, etc.) ...
  
  // Rollen-Zuordnung für Lebenszyklus-Prozesse
  lifecycleRoles?: {
    adminRoleId?: number;        // ID der Admin-Rolle (Standard: erste Admin-Rolle)
    hrRoleId?: number;            // ID der HR-Rolle (Standard: erste Admin-Rolle)
    legalRoleId?: number;         // ID der Legal-Rolle (Standard: Rolle "Derecho")
    employeeRoleIds?: number[];   // IDs der Mitarbeiter-Rollen (Standard: alle anderen)
  };
  
  documentTemplates?: {
    employmentCertificate?: {
      path: string;              // Pfad zum PDF-Template
      version: string;           // Version des Templates
      uploadDate: string;        // Upload-Datum
    };
    employmentContract?: {
      path: string;              // Pfad zum PDF-Template
      version: string;           // Version des Templates
      uploadDate: string;        // Upload-Datum
    };
  };
  
  documentSignatures?: {
    employmentCertificate?: {
      path: string;              // Pfad zur Signatur (Bild oder PDF)
      signerName: string;        // Name des Unterzeichners (z.B. "Stefan Bossart")
      signerPosition: string;   // Position des Unterzeichners (z.B. "Geschäftsführer")
      position: {                 // Position der Signatur im PDF
        x: number;               // X-Koordinate
        y: number;               // Y-Koordinate
        page: number;            // Seitenzahl (1-basiert)
      };
    };
    employmentContract?: {
      path: string;              // Pfad zur Signatur
      signerName: string;        // Name des Unterzeichners
      signerPosition: string;   // Position des Unterzeichners
      position: {
        x: number;
        y: number;
        page: number;
      };
    };
  };
  
  documentSettings?: {
    employmentCertificate?: {
      includeSalary: boolean;    // Soll Gehalt im Arbeitszeugnis enthalten sein?
      defaultLanguage: string;   // Standard-Sprache (z.B. "es", "de")
      autoGenerateOnOffboarding: boolean; // Automatisch bei Offboarding generieren?
    };
    employmentContract?: {
      defaultLanguage: string;   // Standard-Sprache
      requireEmployeeSignature: boolean; // Muss Mitarbeiter unterschreiben?
      autoGenerateOnOnboarding: boolean; // Automatisch bei Onboarding generieren?
    };
  };
}
```

**Wichtig**: Diese Struktur wird in `Organization.settings` (JSON) gespeichert, NICHT als separates Model!

### Erweiterungen am Organization-Model

```prisma
model Organization {
  // ... bestehende Felder ...
  
  // Neue Beziehungen
  employeeLifecycles     EmployeeLifecycle[]
  lifecycleConfigurations LifecycleConfiguration[]
}
```

---

## Wichtige Ergänzungen: Arbeitszeugnis und Arbeitsvertrag

### Überblick

**Arbeitszeugnis** und **Arbeitsvertrag** sind zwei kritische Dokumente, die:
1. **Jederzeit abrufbar** sein müssen (für jeden Mitarbeiter)
2. **Automatisch generierbar** sein müssen (basierend auf Systemdaten)
3. **Konfigurierbar pro Organisation** sein müssen (Templates, Signaturen, etc.)

### Integration in OrganizationSettings

Die Konfiguration erfolgt über `Organization.settings` (JSON-Feld), das bereits existiert und für andere Einstellungen verwendet wird (z.B. Sprache, SMTP).

**Bestehende Struktur**:
```typescript
Organization.settings = {
  language: "es",
  smtp: { ... },
  // NEU: Dokumenten-Konfiguration
  documentTemplates: { ... },
  documentSignatures: { ... },
  documentSettings: { ... }
}
```

**Vorteile dieser Lösung**:
- ✅ Keine Schema-Änderung nötig (JSON-Feld existiert bereits)
- ✅ Flexibel erweiterbar
- ✅ Organisation-spezifisch konfigurierbar
- ✅ Integration in bestehende OrganizationSettings-Komponente möglich

### Workflow für Konfiguration

1. **Admin öffnet OrganizationSettings**
2. **Neuer Tab/Sektion**: "Dokumenten-Konfiguration"
3. **Template-Upload**:
   - Arbeitszeugnis-Template hochladen (PDF)
   - Arbeitsvertrag-Template hochladen (PDF)
4. **Signatur-Upload**:
   - Signatur-Bild hochladen (PNG, JPG, PDF)
   - Position im PDF konfigurieren (X, Y, Seite)
   - Name und Position des Unterzeichners eingeben
5. **Einstellungen**:
   - Sprache wählen
   - Gehalt im Arbeitszeugnis anzeigen? (Ja/Nein)
   - Automatische Generierung aktivieren?

### Workflow für Mitarbeiter

1. **Mitarbeiter öffnet sein Profil**
2. **Button "Arbeitszeugnis abrufen"** klicken
3. **System prüft**: Existiert bereits ein aktuelles Zeugnis?
   - Ja → Zeigt Download-Link
   - Nein → Generiert neues automatisch
4. **Download** des PDFs

Gleicher Workflow für Arbeitsvertrag.

---

## Kolumbien-spezifische Prozesse

### ARL (Administradora de Riesgos Laborales)

**Was ist ARL?**
- Arbeitsunfallversicherung in Kolumbien
- Pflichtversicherung für alle Arbeitgeber
- Deckt Arbeitsunfälle und Berufskrankheiten

**Anmeldeprozess**:
1. Erforderliche Daten sammeln:
   - User-Daten (Name, Cédula, Geburtsdatum)
   - Vertragsdaten (Startdatum, Gehalt, Position)
   - Organisationsdaten (NIT, Name)
2. Kontakt zur ARL-Versicherung herstellen
3. Anmeldeformular ausfüllen
4. Dokumente bereitstellen (falls erforderlich)
5. Bestätigung erhalten

**Automatisierung**:
- ✅ Task-Erstellung für Legal-Rolle
- ✅ Email-Vorlage mit allen Daten generieren
- ✅ Automatischer Email-Versand (falls konfiguriert)
- ⚠️ Vollautomatische Anmeldung: Nicht möglich (erfordert manuelle Schritte)

### EPS (Entidad Promotora de Salud)

**Was ist EPS?**
- Gesundheitsversicherung in Kolumbien
- Nicht immer erforderlich (User kann bereits versichert sein)

**Anmeldeprozess**:
1. Prüfen: Ist EPS für User erforderlich?
2. Falls ja: Ähnlich wie ARL
3. Falls nein: Status auf "not_required" setzen

**Automatisierung**:
- ✅ Task-Erstellung (nur wenn erforderlich)
- ✅ Email-Vorlage generieren
- ⚠️ Vollautomatische Anmeldung: Nicht möglich

### Pension (Pensión)

**Was ist Pension?**
- Rentenversicherung in Kolumbien
- Pflichtversicherung

**Anmeldeprozess**:
1. Erforderliche Daten sammeln
2. Kontakt zur Rentenversicherung herstellen
3. Anmeldeformular ausfüllen
4. Bestätigung erhalten

**Automatisierung**:
- ✅ Task-Erstellung für Legal-Rolle
- ✅ Email-Vorlage generieren
- ⚠️ Vollautomatische Anmeldung: Nicht möglich

### Caja (Caja de Compensación Familiar)

**Was ist Caja?**
- Familienausgleichskasse in Kolumbien
- Zusätzliche Sozialleistungen

**Anmeldeprozess**:
1. Erforderliche Daten sammeln
2. Kontakt zur Caja herstellen
3. Anmeldeformular ausfüllen
4. Bestätigung erhalten

**Automatisierung**:
- ✅ Task-Erstellung für Legal-Rolle
- ✅ Email-Vorlage generieren
- ⚠️ Vollautomatische Anmeldung: Nicht möglich

---

## Automatisierung

### Automatisierungs-Level

#### Level 1: Vollautomatisch (System führt aus)
- ✅ Task-Erstellung bei Events
- ✅ Status-Updates
- ✅ Progress-Bar Updates
- ✅ Benachrichtigungen
- ✅ Event-Logging

#### Level 2: Semi-Automatisch (System bereitet vor, Mensch führt aus)
- ✅ Email-Vorlagen generieren
- ✅ Daten sammeln und formatieren
- ✅ Task-Zuweisung an Rollen
- ⚠️ Email-Versand (nur wenn explizit konfiguriert)

#### Level 3: Manuell (System unterstützt)
- ⚠️ Anmeldungen bei Behörden (erfordert manuelle Schritte)
- ⚠️ Dokumentenerstellung (Templates müssen gepflegt werden)

### Automatisierungs-Trigger

#### Onboarding-Start
```typescript
// Wird ausgelöst, wenn:
- User akzeptiert Organization Invitation
- Organization Join Request wird genehmigt
- User wird manuell zur Organisation hinzugefügt

// Aktionen:
1. EmployeeLifecycle-Eintrag erstellen
2. Status auf "onboarding" setzen
3. Onboarding-Tasks erstellen (basierend auf Templates)
4. Benachrichtigungen senden
5. Event loggen
```

#### Dokument hochgeladen
```typescript
// Wird ausgelöst, wenn:
- IdentificationDocument wird erstellt/aktualisiert

// Aktionen:
1. Prüfen: Welche Dokumente fehlen noch?
2. Progress-Bar aktualisieren
3. Falls alle Dokumente vorhanden: Task "Dokumente verifizieren" erstellen
```

#### Sozialversicherung registriert
```typescript
// Wird ausgelöst, wenn:
- Task "ARL-Anmeldung" wird auf "done" gesetzt
- Status wird manuell auf "registered" gesetzt

// Aktionen:
1. EmployeeLifecycle.arlStatus auf "registered" setzen
2. Progress-Bar aktualisieren
3. Prüfen: Sind alle Sozialversicherungen registriert?
4. Falls ja: Task "Onboarding abschließen" erstellen
```

#### Onboarding abgeschlossen
```typescript
// Wird ausgelöst, wenn:
- Alle erforderlichen Schritte sind abgeschlossen
- Status wird manuell auf "active" gesetzt

// Aktionen:
1. EmployeeLifecycle.status auf "active" setzen
2. onboardingCompletedAt setzen
3. Benachrichtigungen senden
4. Event loggen
```

#### Offboarding-Start
```typescript
// Wird ausgelöst, wenn:
- exitDate wird gesetzt
- Status wird manuell auf "offboarding" gesetzt

// Aktionen:
1. Status auf "offboarding" setzen
2. Offboarding-Tasks erstellen
3. Benachrichtigungen senden
4. Event loggen
```

---

## Implementierungsphasen

### Phase 1: Datenmodell und Grundstruktur

**Ziel**: Datenmodell erstellen und migrieren

**Tasks**:
1. ✅ Prisma Schema erweitern
2. ✅ Migration erstellen und ausführen
3. ✅ Seed-Daten für La Familia Hostel erstellen
4. ✅ Basis-Controller erstellen

**Dauer**: 1-2 Tage

**Deliverables**:
- Migration-Datei
- Seed-Datei
- Basis-Controller (CRUD)

---

### Phase 2: Onboarding - Automatische Task-Erstellung

**Ziel**: System erstellt automatisch Tasks beim Onboarding-Start

**Tasks**:
1. ✅ LifecycleConfiguration für Kolumbien erstellen
2. ✅ LifecycleTaskTemplate für Onboarding erstellen
3. ✅ Service: `onboardingService.ts` erstellen
4. ✅ Event-Handler: Onboarding-Start erkennen
5. ✅ Automatische Task-Erstellung implementieren
6. ✅ Tests schreiben

**Dauer**: 2-3 Tage

**Deliverables**:
- `onboardingService.ts`
- Event-Handler
- Task-Templates (Seed-Daten)
- Tests

---

### Phase 3: Dokumentenverwaltung und Progress-Tracking

**Ziel**: Dokumente verwalten und Progress-Bar anzeigen

**Tasks**:
1. ✅ Integration mit bestehendem IdentificationDocument-System
2. ✅ Progress-Bar Komponente erstellen
3. ✅ Automatische Progress-Updates implementieren
4. ✅ Frontend: User-Profil erweitern
5. ✅ Tests schreiben

**Dauer**: 2-3 Tage

**Deliverables**:
- Progress-Bar Komponente
- Erweiterte User-Profil-Seite
- Progress-Service

---

### Phase 4: Sozialversicherungen - ARL, EPS, Pension, Caja

**Ziel**: Automatisierung der Sozialversicherungsanmeldungen

**Tasks**:
1. ✅ Service: `socialSecurityService.ts` erstellen
2. ✅ Email-Template-Generator für ARL
3. ✅ Email-Template-Generator für EPS
4. ✅ Email-Template-Generator für Pension
5. ✅ Email-Template-Generator für Caja
6. ✅ Task-Integration: Status-Updates bei Task-Abschluss
7. ✅ Frontend: Status-Anzeige für Sozialversicherungen
8. ✅ Tests schreiben

**Dauer**: 3-4 Tage

**Deliverables**:
- `socialSecurityService.ts`
- Email-Templates
- Status-Management
- Frontend-Komponenten

---

### Phase 5: Arbeitszeugnis und Arbeitsvertrag - Generierung und Verwaltung

**Ziel**: Automatische Generierung von Arbeitszeugnissen und Arbeitsverträgen, jederzeit abrufbar

**Tasks**:
1. ✅ Prisma Schema erweitern: `ContractDocument` Model hinzufügen
2. ✅ Migration erstellen und ausführen
3. ✅ Service: `certificateService.ts` erstellen (erweitert für beide Dokumente)
4. ✅ Service: `contractService.ts` erstellen
5. ✅ PDF-Template-System erstellen
6. ✅ Template-Befüllung implementieren (beide Dokumente)
7. ✅ Signatur-Integration implementieren
8. ✅ Organization.settings Integration für Templates und Signaturen
9. ✅ Backend: API-Endpoints für Dokumenten-Konfiguration
10. ✅ Backend: API-Endpoints für Dokumenten-Generierung und -Download
11. ✅ Frontend: Komponente für Dokumenten-Konfiguration in OrganizationSettings
12. ✅ Frontend: Komponente für Template-Upload
13. ✅ Frontend: Komponente für Signatur-Upload
14. ✅ Frontend: Button "Arbeitszeugnis abrufen" im User-Profil
15. ✅ Frontend: Button "Arbeitsvertrag abrufen" im User-Profil
16. ✅ Frontend: Download-Funktionalität
17. ✅ Frontend: Liste aller generierten Dokumente
18. ✅ Automatische Generierung bei Onboarding (Vertrag) und Offboarding (Zeugnis)
19. ✅ Tests schreiben

**Dauer**: 5-6 Tage

**Deliverables**:
- `certificateService.ts` (erweitert)
- `contractService.ts`
- PDF-Generierung für beide Dokumente
- Template- und Signatur-Verwaltung
- Frontend-Komponenten für Konfiguration
- Frontend-Komponenten für User-Zugriff
- Integration in OrganizationSettings

---

### Phase 6: Offboarding

**Ziel**: Automatisches Offboarding-System

**Tasks**:
1. ✅ Service: `offboardingService.ts` erstellen
2. ✅ Offboarding-Task-Templates erstellen
3. ✅ Automatische Task-Erstellung bei Offboarding-Start
4. ✅ Abmeldungen bei Sozialversicherungen
5. ✅ Finale Abrechnungen
6. ✅ Archivierung
7. ✅ Frontend: Offboarding-Interface
8. ✅ Tests schreiben

**Dauer**: 3-4 Tage

**Deliverables**:
- `offboardingService.ts`
- Offboarding-Templates
- Archivierungs-Logik
- Frontend-Komponenten

---

### Phase 7: Admin-Interface und Konfiguration

**Ziel**: Admin-Interface für Konfiguration und Verwaltung

**Tasks**:
1. ✅ Frontend: LifecycleConfiguration-Interface
2. ✅ Frontend: Task-Template-Verwaltung
3. ✅ Frontend: Übersicht aller Mitarbeiter-Lebenszyklen
4. ✅ Frontend: Filter und Suche
5. ✅ Frontend: Bulk-Operations
6. ✅ Tests schreiben

**Dauer**: 3-4 Tage

**Deliverables**:
- Admin-Interface
- Konfigurations-Seiten
- Übersichts-Seiten

---

### Phase 8: Dokumentation und Finalisierung

**Ziel**: Vollständige Dokumentation und Abschluss

**Tasks**:
1. ✅ API-Dokumentation aktualisieren
2. ✅ User-Dokumentation erstellen
3. ✅ Admin-Dokumentation erstellen
4. ✅ Code-Review
5. ✅ Finale Tests
6. ✅ Deployment-Vorbereitung

**Dauer**: 2-3 Tage

**Deliverables**:
- Vollständige Dokumentation
- Deployment-Guide
- User-Guide

---

## Rollen-Prüfung und Berechtigungen

### Backend-Rollen-Prüfung - Integration mit bestehendem System

**WICHTIG**: Integration statt Migration - Nutzt bestehende `organizationMiddleware` und erweitert diese.

```typescript
// Helper-Funktion: Prüft ob User eine Lebenszyklus-Rolle hat
// Wird in Controllern verwendet, NICHT als separate Middleware
// Nutzt req.organizationId und req.userRole aus organizationMiddleware

import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Prüft ob User eine bestimmte Lebenszyklus-Rolle hat
 * Nutzt req.organizationId und req.userRole aus organizationMiddleware
 */
export async function hasLifecycleRole(
  req: Request,
  roleType: 'admin' | 'hr' | 'legal'
): Promise<boolean> {
  if (!req.organizationId || !req.userRole) {
    return false; // Keine Organisation oder keine aktive Rolle
  }
  
  // 1. Hole Organization mit settings
  const organization = await prisma.organization.findUnique({
    where: { id: req.organizationId },
    select: { settings: true }
  });
  
  if (!organization) return false;
  
  const settings = organization.settings as any;
  const lifecycleRoles = settings?.lifecycleRoles;
  
  // 2. Falls keine Konfiguration: Standard-Zuordnung prüfen
  if (!lifecycleRoles) {
    return checkDefaultRoles(req.userRole.role, roleType);
  }
  
  // 3. Prüfe Rollen-ID gegen konfigurierte Rollen
  const targetRoleId = lifecycleRoles[`${roleType}RoleId`];
  if (!targetRoleId) return false;
  
  // 4. Prüfe ob aktive Rolle die Ziel-Rolle ist
  return req.userRole.roleId === targetRoleId;
}

/**
 * Prüft Standard-Rollen (Fallback wenn keine Konfiguration)
 */
function checkDefaultRoles(
  role: { name: string },
  roleType: 'admin' | 'hr' | 'legal'
): boolean {
  const roleName = role.name.toLowerCase();
  
  if (roleType === 'admin' || roleType === 'hr') {
    // Admin oder HR: Suche nach Admin-Rolle
    return roleName.includes('admin') || roleName.includes('administrator');
  }
  
  if (roleType === 'legal') {
    // Legal: Suche nach "Derecho"-Rolle
    return roleName === 'derecho';
  }
  
  return false;
}

/**
 * Prüft ob User HR oder Admin ist
 */
export async function isHROrAdmin(req: Request): Promise<boolean> {
  const isHR = await hasLifecycleRole(req, 'hr');
  const isAdmin = await hasLifecycleRole(req, 'admin');
  return isHR || isAdmin;
}

/**
 * Prüft ob User Legal oder Admin ist
 */
export async function isLegalOrAdmin(req: Request): Promise<boolean> {
  const isLegal = await hasLifecycleRole(req, 'legal');
  const isAdmin = await hasLifecycleRole(req, 'admin');
  return isLegal || isAdmin;
}
```

### Verwendung in Controllern

```typescript
// Beispiel: Controller für Arbeitszeugnis-Generierung
import { Request, Response } from 'express';
import { isHROrAdmin } from '../utils/lifecycleRoles';

export const generateCertificate = async (req: Request, res: Response) => {
  try {
    // Prüfe Berechtigung
    const canGenerate = await isHROrAdmin(req);
    if (!canGenerate) {
      return res.status(403).json({ 
        message: 'Nur HR oder Admin können Arbeitszeugnisse erstellen' 
      });
    }
    
    // ... Rest der Logik
  } catch (error) {
    // ...
  }
};
```

### Frontend-Rollen-Prüfung - Integration mit usePermissions

**WICHTIG**: Erweitert bestehenden `usePermissions()` Hook statt neuer Hook.

```typescript
// Erweiterung von usePermissions Hook
// frontend/src/hooks/usePermissions.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.tsx';
import axiosInstance from '../config/axios.ts';

export const usePermissions = () => {
  // ... bestehender Code ...
  
  const [lifecycleRoles, setLifecycleRoles] = useState<any>(null);
  
  // Lade Lebenszyklus-Rollen-Konfiguration
  useEffect(() => {
    const loadLifecycleRoles = async () => {
      try {
        const response = await axiosInstance.get('/api/organizations/current/lifecycle-roles');
        setLifecycleRoles(response.data.lifecycleRoles);
      } catch (error) {
        console.error('Fehler beim Laden der Lebenszyklus-Rollen:', error);
        setLifecycleRoles(null);
      }
    };
    
    if (user && currentRole) {
      loadLifecycleRoles();
    }
  }, [user, currentRole]);
  
  /**
   * Prüft ob User eine Lebenszyklus-Rolle hat
   * Integriert mit bestehendem Permission-System
   */
  const hasLifecycleRole = useCallback((roleType: 'admin' | 'hr' | 'legal'): boolean => {
    if (!user || !currentRole || !lifecycleRoles) {
      // Fallback: Standard-Prüfung
      return checkDefaultLifecycleRole(currentRole, roleType);
    }
    
    const targetRoleId = lifecycleRoles[`${roleType}RoleId`];
    if (!targetRoleId) return false;
    
    // Prüfe ob aktive Rolle die Ziel-Rolle ist
    return currentRole.id === targetRoleId;
  }, [user, currentRole, lifecycleRoles]);
  
  /**
   * Prüft Standard-Rollen (Fallback)
   */
  const checkDefaultLifecycleRole = (role: Role, roleType: 'admin' | 'hr' | 'legal'): boolean => {
    const roleName = role.name.toLowerCase();
    
    if (roleType === 'admin' || roleType === 'hr') {
      return roleName.includes('admin') || roleName.includes('administrator');
    }
    
    if (roleType === 'legal') {
      return roleName === 'derecho';
    }
    
    return false;
  };
  
  /**
   * Convenience-Funktionen für Lebenszyklus-Rollen
   */
  const isHR = useCallback((): boolean => {
    return hasLifecycleRole('hr') || hasLifecycleRole('admin');
  }, [hasLifecycleRole]);
  
  const isLegal = useCallback((): boolean => {
    return hasLifecycleRole('legal') || hasLifecycleRole('admin');
  }, [hasLifecycleRole]);
  
  return {
    // ... bestehende Returns ...
    hasLifecycleRole,
    isHR,
    isLegal
  };
};
```

### Verwendung im Frontend

```typescript
// Beispiel: Komponente für Arbeitszeugnis-Erstellung
import { usePermissions } from '../hooks/usePermissions.ts';

const CertificateComponent = () => {
  const { isHR, hasLifecycleRole } = usePermissions();
  
  return (
    <div>
      {isHR() && (
        <button onClick={handleCreateCertificate}>
          Arbeitszeugnis erstellen
        </button>
      )}
    </div>
  );
};
```

---

## Technische Architektur

### Backend-Struktur

```
backend/
├── src/
│   ├── services/
│   │   ├── lifecycle/
│   │   │   ├── onboardingService.ts
│   │   │   ├── offboardingService.ts
│   │   │   ├── socialSecurityService.ts
│   │   │   ├── certificateService.ts
│   │   │   └── lifecycleEventService.ts
│   │   └── ...
│   ├── controllers/
│   │   ├── employeeLifecycleController.ts
│   │   ├── lifecycleConfigurationController.ts
│   │   └── ...
│   ├── routes/
│   │   ├── employeeLifecycle.ts
│   │   └── ...
│   └── utils/
│       ├── emailTemplates/
│       │   ├── arlTemplate.ts
│       │   ├── epsTemplate.ts
│       │   ├── pensionTemplate.ts
│       │   └── cajaTemplate.ts
│       └── ...
```

### Frontend-Struktur

```
frontend/
├── src/
│   ├── components/
│   │   ├── EmployeeLifecycle/
│   │   │   ├── LifecycleProgressBar.tsx
│   │   │   ├── OnboardingView.tsx
│   │   │   ├── OffboardingView.tsx
│   │   │   ├── SocialSecurityStatus.tsx
│   │   │   ├── CertificateRequest.tsx
│   │   │   └── LifecycleAdmin.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── EmployeeLifecyclePage.tsx
│   │   └── ...
│   └── services/
│       ├── lifecycleApi.ts
│       └── ...
```

---

## API-Spezifikation

### Employee Lifecycle Endpoints

#### GET /api/employee-lifecycle/:userId
Ruft den Lebenszyklus-Status eines Users ab.

**Response**:
```json
{
  "id": 1,
  "userId": 123,
  "organizationId": 1,
  "status": "onboarding",
  "onboardingStartedAt": "2025-01-15T10:00:00Z",
  "arlStatus": "pending",
  "epsStatus": "not_required",
  "pensionStatus": "pending",
  "cajaStatus": "pending",
  "progress": {
    "completed": 2,
    "total": 6,
    "percentage": 33.3
  }
}
```

#### POST /api/employee-lifecycle/:userId/start-onboarding
Startet das Onboarding für einen User.

**Request**:
```json
{
  "contractStartDate": "2025-01-15",
  "contractType": "indefinite"
}
```

#### POST /api/employee-lifecycle/:userId/complete-onboarding
Schließt das Onboarding ab (manuell oder automatisch).

#### POST /api/employee-lifecycle/:userId/start-offboarding
Startet das Offboarding für einen User.

**Request**:
```json
{
  "exitDate": "2025-06-30",
  "exitReason": "contract_end"
}
```

#### PUT /api/employee-lifecycle/:userId/social-security/:type
Aktualisiert den Status einer Sozialversicherung.

**Request**:
```json
{
  "status": "registered",
  "number": "123456789",
  "provider": "ARL SURA"
}
```

#### GET /api/users/:id/lifecycle/certificates
Ruft alle Arbeitszeugnisse eines Users ab.

**Berechtigung**: User selbst oder HR/Admin

**Response**:
```json
{
  "certificates": [
    {
      "id": 1,
      "certificateType": "employment",
      "issueDate": "2025-01-15T10:00:00Z",
      "pdfPath": "/uploads/certificates/cert-123-20250115.pdf",
      "isLatest": true,
      "downloadUrl": "/api/users/:id/lifecycle/certificates/1/download"
    }
  ]
}
```

#### GET /api/users/:id/lifecycle/certificates/latest
Ruft das neueste Arbeitszeugnis eines Users ab.

#### POST /api/users/:id/lifecycle/certificates/generate
Generiert ein neues Arbeitszeugnis (nur HR/Admin).

**Berechtigung**: HR oder Admin

**Request**:
```json
{
  "certificateType": "employment",
  "includeSalary": false,
  "language": "es",
  "customText": {
    "introduction": "...",
    "main": "...",
    "conclusion": "..."
  }
}
```

**Response**:
```json
{
  "id": 1,
  "certificateType": "employment",
  "issueDate": "2025-01-15T10:00:00Z",
  "pdfPath": "/uploads/certificates/cert-123-20250115.pdf",
  "downloadUrl": "/api/users/:id/lifecycle/certificates/1/download"
}
```

#### GET /api/users/:id/lifecycle/certificates/:certificateId/download
Lädt ein Arbeitszeugnis herunter.

**Berechtigung**: User selbst oder HR/Admin

---

#### GET /api/users/:id/lifecycle/contracts
Ruft alle Arbeitsverträge eines Users ab.

**Berechtigung**: User selbst oder HR/Admin

**Response**:
```json
{
  "contracts": [
    {
      "id": 1,
      "contractType": "initial",
      "contractStartDate": "2025-01-15",
      "contractEndDate": null,
      "pdfPath": "/uploads/contracts/contract-123-20250115.pdf",
      "isLatest": true,
      "signedByEmployee": true,
      "signedByOrganization": true,
      "downloadUrl": "/api/users/:id/lifecycle/contracts/1/download"
    }
  ]
}
```

#### GET /api/users/:id/lifecycle/contracts/latest
Ruft den neuesten Arbeitsvertrag eines Users ab.

#### POST /api/users/:id/lifecycle/contracts/generate
Generiert einen neuen Arbeitsvertrag (nur HR/Admin).

**Berechtigung**: HR oder Admin

**Request**:
```json
{
  "contractType": "initial",
  "contractStartDate": "2025-01-15",
  "contractEndDate": null,
  "contractType": "indefinite",
  "language": "es",
  "customText": {
    "clauses": "..."
  }
}
```

#### GET /api/users/:id/lifecycle/contracts/:contractId/download
Lädt einen Arbeitsvertrag herunter.

**Berechtigung**: User selbst oder HR/Admin

---

### Rollen-Konfiguration Endpoints

#### GET /api/organizations/current/lifecycle-roles
Ruft die Rollen-Zuordnung der aktuellen Organisation ab.

**Berechtigung**: Admin

**Response**:
```json
{
  "lifecycleRoles": {
    "adminRoleId": 1,
    "hrRoleId": 1,
    "legalRoleId": 3,
    "employeeRoleIds": [2, 4, 5]
  }
}
```

#### PUT /api/organizations/current/lifecycle-roles
Aktualisiert die Rollen-Zuordnung der aktuellen Organisation.

**Berechtigung**: Admin

**Request**:
```json
{
  "adminRoleId": 1,
  "hrRoleId": 1,
  "legalRoleId": 3,
  "employeeRoleIds": [2, 4, 5]
}
```

#### POST /api/organizations/current/lifecycle-roles/apply-defaults
Wendet die Standard-Zuordnung an.

**Berechtigung**: Admin

**Response**:
```json
{
  "lifecycleRoles": {
    "adminRoleId": 1,
    "hrRoleId": 1,
    "legalRoleId": 3,
    "employeeRoleIds": [2, 4, 5]
  },
  "message": "Standard-Zuordnung angewendet"
}
```

---

### Organization Settings Endpoints (Dokumenten-Konfiguration)

#### GET /api/organizations/current/document-settings
Ruft die Dokumenten-Konfiguration der aktuellen Organisation ab.

**Berechtigung**: Admin oder HR

**Response**:
```json
{
  "documentTemplates": {
    "employmentCertificate": {
      "path": "/uploads/templates/certificate-template.pdf",
      "version": "1.0",
      "uploadDate": "2025-01-10T10:00:00Z"
    },
    "employmentContract": {
      "path": "/uploads/templates/contract-template.pdf",
      "version": "1.0",
      "uploadDate": "2025-01-10T10:00:00Z"
    }
  },
  "documentSignatures": {
    "employmentCertificate": {
      "path": "/uploads/signatures/stefan-signature.png",
      "signerName": "Stefan Bossart",
      "signerPosition": "Geschäftsführer",
      "position": {
        "x": 400,
        "y": 100,
        "page": 1
      }
    }
  },
  "documentSettings": {
    "employmentCertificate": {
      "includeSalary": false,
      "defaultLanguage": "es",
      "autoGenerateOnOffboarding": true
    }
  }
}
```

#### PUT /api/organizations/current/document-settings
Aktualisiert die Dokumenten-Konfiguration der aktuellen Organisation.

**Berechtigung**: Admin oder HR

**Request**:
```json
{
  "documentTemplates": {
    "employmentCertificate": {
      "path": "/uploads/templates/certificate-template-v2.pdf",
      "version": "2.0"
    }
  },
  "documentSignatures": {
    "employmentCertificate": {
      "path": "/uploads/signatures/stefan-signature.png",
      "signerName": "Stefan Bossart",
      "signerPosition": "Geschäftsführer",
      "position": {
        "x": 400,
        "y": 100,
        "page": 1
      }
    }
  }
}
```

#### POST /api/organizations/current/document-templates/upload
Lädt ein neues Template hoch.

**Berechtigung**: Admin oder HR

**Request**: Multipart/form-data
- `type`: "employmentCertificate" oder "employmentContract"
- `file`: PDF-Datei

#### POST /api/organizations/current/document-signatures/upload
Lädt eine neue Signatur hoch.

**Berechtigung**: Admin oder HR

**Request**: Multipart/form-data
- `type`: "employmentCertificate" oder "employmentContract"
- `file`: Bild- oder PDF-Datei
- `signerName`: Name des Unterzeichners
- `signerPosition`: Position des Unterzeichners
- `positionX`: X-Koordinate
- `positionY`: Y-Koordinate
- `positionPage`: Seitenzahl

### Configuration Endpoints

#### GET /api/users/:id/lifecycle
Ruft den Lebenszyklus-Status eines Users ab.

**Berechtigung**: User selbst oder HR/Admin

**Response**:
```json
{
  "lifecycle": {
    "id": 1,
    "status": "onboarding",
    "onboardingStartedAt": "2025-01-15T10:00:00Z",
    "contractStartDate": "2025-01-15",
    "arlStatus": "pending",
    "epsStatus": "not_required",
    "pensionStatus": "pending",
    "cajaStatus": "pending"
  },
  "progress": {
    "completed": 1,
    "total": 5,
    "percent": 20
  }
}
```

#### GET /api/users/:id/lifecycle/status
Ruft nur den Status eines Users ab.

**Berechtigung**: User selbst oder HR/Admin

**Response**:
```json
{
  "status": "onboarding",
  "progress": {
    "completed": 1,
    "total": 5,
    "percent": 20
  }
}
```

#### PUT /api/users/:id/lifecycle/status
Aktualisiert den Lebenszyklus-Status eines Users.

**Berechtigung**: HR oder Admin

**Request**:
```json
{
  "status": "active",
  "contractStartDate": "2025-01-15",
  "contractType": "indefinite"
}
```

---

#### GET /api/users/:id/lifecycle/social-security/:type
Ruft den Status einer Sozialversicherung ab.

**Berechtigung**: User selbst oder HR/Admin

**Parameter**: `type` = "arl" | "eps" | "pension" | "caja"

**Response**:
```json
{
  "type": "arl",
  "status": "registered",
  "number": "ARL-123456",
  "provider": "ARL SURA",
  "registeredAt": "2025-01-20T10:00:00Z"
}
```

#### PUT /api/users/:id/lifecycle/social-security/:type
Aktualisiert den Status einer Sozialversicherung.

**Berechtigung**: Legal oder Admin

**Request**:
```json
{
  "status": "registered",
  "number": "ARL-123456",
  "provider": "ARL SURA"
}
```

---

#### GET /api/lifecycle-configuration/:organizationId
Ruft die Konfiguration für eine Organisation ab.

**DEPRECATED**: Verwende `/api/organizations/current/lifecycle-roles` stattdessen

#### PUT /api/lifecycle-configuration/:organizationId
Aktualisiert die Konfiguration.

**Request**:
```json
{
  "country": "CO",
  "autoCreateOnboardingTasks": true,
  "hrRoleId": 5,
  "legalRoleId": 6,
  "arlEmail": "legal@example.com"
}
```

#### GET /api/lifecycle-configuration/:organizationId/task-templates
Ruft alle Task-Templates ab.

#### POST /api/lifecycle-configuration/:organizationId/task-templates
Erstellt ein neues Task-Template.

---

## Frontend-Komponenten

### LifecycleProgressBar

Zeigt den aktuellen Fortschritt im Lebenszyklus an.

**Props**:
```typescript
interface LifecycleProgressBarProps {
  lifecycle: EmployeeLifecycle;
  showDetails?: boolean;
}
```

**Features**:
- Visuelle Darstellung der Phasen
- Status-Anzeige für Sozialversicherungen
- Klickbare Elemente für Details

### OnboardingView

Vollständige Onboarding-Ansicht mit allen Schritten.

**Features**:
- Liste aller Onboarding-Tasks
- Dokumenten-Upload
- Status-Updates
- Progress-Bar

### OffboardingView

Vollständige Offboarding-Ansicht.

**Features**:
- Liste aller Offboarding-Tasks
- Arbeitszeugnis-Generierung
- Finale Abrechnungen
- Archivierung

### SocialSecurityStatus

Zeigt den Status aller Sozialversicherungen an.

**Features**:
- Status-Icons (✅, ⏳, ❌)
- Registrierungsnummern
- Provider-Informationen
- Links zu Tasks

### CertificateRequest

Formular zur Anforderung eines Arbeitszeugnisses.

**Features**:
- Auswahl des Zertifikat-Typs
- Optionen (Gehalt anzeigen, etc.)
- Download nach Generierung

### ContractRequest

Formular zur Anforderung eines Arbeitsvertrags.

**Features**:
- Auswahl des Vertrag-Typs (initial, amendment, renewal)
- Vertragsdaten eingeben/bestätigen
- Download nach Generierung

### DocumentConfiguration

Admin-Interface für Dokumenten-Konfiguration (in OrganizationSettings integriert).

**Features**:
- Template-Upload für Arbeitszeugnis
- Template-Upload für Arbeitsvertrag
- Signatur-Upload und Positionierung
- Einstellungen (Sprache, Gehalt anzeigen, etc.)
- Template-Versionierung

### DocumentList

Liste aller generierten Dokumente eines Users.

**Features**:
- Alle Arbeitszeugnisse anzeigen
- Alle Arbeitsverträge anzeigen
- Download-Links
- Generierungsdatum
- Neueste Version hervorheben

### LifecycleAdmin

Admin-Interface für Konfiguration und Verwaltung.

**Features**:
- Übersicht aller Mitarbeiter
- Filter nach Status
- Bulk-Operations
- Konfiguration

---

## Dokumentation und Fortschrittsverfolgung

### Fortschritts-Dokumentation

Für jede Phase wird ein separates Dokument erstellt:

1. `PHASE_1_DATENMODELL.md` - Datenmodell-Implementierung
2. `PHASE_2_ONBOARDING_TASKS.md` - Onboarding-Task-Erstellung
3. `PHASE_3_DOKUMENTE.md` - Dokumentenverwaltung
4. `PHASE_4_SOZIALVERSICHERUNGEN.md` - Sozialversicherungen
5. `PHASE_5_ARBEITSZEUGNIS.md` - Arbeitszeugnis-Generierung
6. `PHASE_6_OFFBOARDING.md` - Offboarding
7. `PHASE_7_ADMIN_INTERFACE.md` - Admin-Interface
8. `PHASE_8_DOKUMENTATION.md` - Finale Dokumentation

### Problem-Tracking

Jedes Problem wird dokumentiert in:
- `PROBLEME_UND_LOESUNGEN.md`

Format:
```markdown
## Problem: [Titel]
**Phase**: [Phase]
**Datum**: [Datum]
**Beschreibung**: [Beschreibung]
**Lösung**: [Lösung]
**Status**: [gelöst/offen]
```

### Änderungsprotokoll

Alle Änderungen am Plan werden dokumentiert in:
- `AENDERUNGSPROTOKOLL.md`

---

## Nächste Schritte

1. **Review dieses Plans** - Bitte prüfen und Feedback geben
2. **Priorisierung** - Welche Phasen sind am wichtigsten?
3. **Start mit Phase 1** - Datenmodell implementieren
4. **Regelmäßige Reviews** - Nach jeder Phase Review und Anpassung

---

## Anhänge

### A: Kolumbien-spezifische Anforderungen

- [Link zu gesetzlichen Anforderungen]
- [Link zu ARL-Informationen]
- [Link zu EPS-Informationen]

### B: Template-Beispiele

- [Arbeitszeugnis-Template]
- [Email-Templates]

### C: Referenzen

- [Bestehende System-Dokumentation]
- [API-Dokumentation]

---

**Ende des Implementierungsplans**

