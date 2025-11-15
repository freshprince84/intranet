# MITARBEITERLEBENSZYKLUS - Nutzungsanleitung

**Erstellt am**: 2025-01-XX  
**Version**: 1.0  
**Status**: Vollständig implementiert (~92%)

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Ersteinrichtung](#ersteinrichtung)
3. [Prozess: Onboarding](#prozess-onboarding)
4. [Prozess: Dokumentenverwaltung](#prozess-dokumentenverwaltung)
5. [Prozess: Sozialversicherungen](#prozess-sozialversicherungen)
6. [Rollen und Berechtigungen](#rollen-und-berechtigungen)
7. [Templates und Signaturen](#templates-und-signaturen)

---

## 📖 Übersicht

Das Mitarbeiterlebenszyklus-System verwaltet den kompletten Lebenszyklus eines Mitarbeiters von der Anstellung bis zum Austritt. Es automatisiert Prozesse, erstellt Tasks und generiert Dokumente.

### Hauptfunktionen

- ✅ **Automatische Task-Erstellung** bei Onboarding
- ✅ **Dokumentenverwaltung** (Arbeitszeugnisse, Arbeitsverträge)
- ✅ **Template-basierte PDF-Generierung** mit automatischer Datenfüllung
- ✅ **Sozialversicherungen-Verwaltung** (ARL, EPS, Pension, Caja)
- ✅ **Rollenbasierte Zugriffe** (Admin, HR, Legal, Mitarbeiter)

---

## 🚀 Ersteinrichtung

### Schritt 1: Rollen-Konfiguration (Admin)

**Zugriff**: Organisation → Einstellungen → Rollen-Konfiguration

1. **Rollen zuweisen**:
   - **Admin-Rolle**: Wählen Sie die Admin-Rolle Ihrer Organisation
   - **HR-Rolle**: Wählen Sie die HR-Rolle (z.B. "HR", "Human Resources")
   - **Legal-Rolle**: Wählen Sie die Legal-Rolle (z.B. "Derecho", "Legal")
   - **Mitarbeiter-Rollen**: Wählen Sie Rollen, die als Mitarbeiter gelten sollen

2. **Speichern**: Klicken Sie auf "Speichern"

**Hinweis**: Falls die HR-Rolle nicht gespeichert werden kann, stellen Sie sicher, dass:
- Die Rolle zur Organisation gehört
- Die Rollen-ID > 0 ist (nicht leer oder 0)

### Schritt 2: Templates hochladen (Admin/HR)

**Zugriff**: Organisation → Einstellungen → Dokumenten-Konfiguration

1. **Template hochladen**:
   - Wählen Sie Template-Typ: "Arbeitszeugnis" oder "Arbeitsvertrag"
   - Laden Sie ein PDF-Template hoch (max. 10MB)
   - Template wird automatisch versioniert (1.0, 1.1, 2.0, etc.)

2. **Feld-Positionen konfigurieren** (optional):
   - Wählen Sie Template-Typ
   - Konfigurieren Sie X, Y, FontSize für jedes Feld:
     - **Certificate**: userName, organizationName, currentDate, identificationNumber, startDate, endDate
     - **Contract**: zusätzlich position, salary, workingHours
   - Klicken Sie auf "Speichern"
   - **Hinweis**: Falls keine Positionen konfiguriert sind, werden Standard-Positionen verwendet

3. **Signatur hochladen**:
   - Wählen Sie Signatur-Typ: "Arbeitszeugnis" oder "Arbeitsvertrag"
   - Geben Sie Name des Unterzeichners ein (Pflichtfeld)
   - Geben Sie Position ein (optional, z.B. "Geschäftsführer")
   - Konfigurieren Sie Position im PDF:
     - **X**: Horizontal-Position (Standard: 400)
     - **Y**: Vertikal-Position (Standard: 100)
     - **Seite**: Seitennummer (Standard: 1)
   - Laden Sie Signatur-Datei hoch (JPEG, PNG, GIF oder PDF, max. 5MB)
   - Klicken Sie auf "Datei auswählen"

**Koordinaten-Hinweis**: 
- Koordinaten in PDF-Punkten (1 Punkt = 1/72 Zoll)
- A4-Größe: 595 x 842 Punkte
- Y-Koordinate: 0 = unten, 842 = oben

---

## 👤 Prozess: Onboarding

### Schritt 1: Mitarbeiter hinzufügen (Admin)

**Zugriff**: Organisation → Benutzerverwaltung → Benutzer hinzufügen

1. Erstellen Sie einen neuen Benutzer oder fügen Sie einen bestehenden Benutzer zur Organisation hinzu
2. Das System erstellt automatisch einen `EmployeeLifecycle`-Eintrag
3. Der Status wird auf "onboarding" gesetzt

### Schritt 2: Automatische Task-Erstellung

**Automatisch ausgelöst** beim Hinzufügen eines Mitarbeiters:

Das System erstellt automatisch Tasks für die Legal-Rolle:
- ✅ **ARL-Anmeldung durchführen**
- ✅ **EPS-Anmeldung prüfen/durchführen**
- ✅ **Pension-Anmeldung durchführen**
- ✅ **Caja-Anmeldung durchführen**

**Zuständig**: Legal-Rolle (konfiguriert in Rollen-Konfiguration)

**Fälligkeitsdatum**: 7 Tage nach Erstellung

### Schritt 3: Sozialversicherungen registrieren (Legal)

**Zugriff**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"

1. **Sozialversicherungen bearbeiten**:
   - Klicken Sie auf "Bearbeiten" bei der gewünschten Sozialversicherung (ARL, EPS, Pension, Caja)
   - Wählen Sie Status: "pending", "registered", "not_required"
   - Geben Sie Registrierungsnummer ein (optional)
   - Geben Sie Anbieter ein (optional)
   - Geben Sie Registrierungsdatum ein (optional)
   - Geben Sie Notizen ein (optional)
   - Klicken Sie auf "Speichern"

2. **Status-Updates**:
   - Status wird visuell angezeigt (✅ registered, ⏰ pending, ❌ not_required)
   - Notizen werden gespeichert

### Schritt 4: Onboarding abschließen (HR/Admin)

**Zugriff**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"

1. Prüfen Sie den Onboarding-Status
2. Wenn alle Schritte abgeschlossen sind, kann der Status manuell auf "active" gesetzt werden
3. Das System setzt automatisch `onboardingCompletedAt`

---

## 📄 Prozess: Dokumentenverwaltung

### Arbeitszeugnis erstellen (HR/Admin)

**Zugriff**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus" → "Arbeitszeugnis erstellen"

1. **Daten eingeben**:
   - **Ausstellungsdatum**: Wird automatisch auf heute gesetzt (kann geändert werden)
   - **Zertifikatstyp**: Wählen Sie Typ (Standard: "employment")

2. **PDF-Quelle wählen**:
   - **Option A: Template verwenden**:
     - Aktivieren Sie "Template verwenden"
     - Wählen Sie Template aus Dropdown (falls vorhanden)
     - PDF wird automatisch generiert mit eingefügten Daten
   - **Option B: PDF hochladen**:
     - Deaktivieren Sie "Template verwenden"
     - Laden Sie PDF-Datei hoch
     - PDF-Vorschau wird angezeigt

3. **Validierung**:
   - Ausstellungsdatum darf nicht in der Zukunft liegen
   - Entweder Template oder PDF muss ausgewählt sein

4. **Speichern**: Klicken Sie auf "Erstellen"

**Automatische Datenfüllung**:
- Benutzername (Vor- und Nachname)
- Organisationsname
- Aktuelles Datum
- Ausweisnummer
- Startdatum (aus Lifecycle)
- Enddatum (aus Lifecycle)

### Arbeitsvertrag erstellen (HR/Admin)

**Zugriff**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus" → "Arbeitsvertrag erstellen"

1. **Daten eingeben**:
   - **Startdatum**: Wird automatisch aus Lifecycle-Daten gefüllt (Pflichtfeld)
   - **Enddatum**: Wird automatisch aus Lifecycle-Daten gefüllt (optional)
   - **Gehalt**: Wird automatisch aus Lifecycle-Daten gefüllt (optional)
   - **Arbeitsstunden**: Wird automatisch aus Lifecycle-Daten gefüllt (optional)
   - **Position**: Wird automatisch aus Lifecycle-Daten gefüllt (optional)
   - **Vertragstyp**: Wählen Sie Typ (Standard: "employment")

2. **PDF-Quelle wählen**:
   - **Option A: Template verwenden**:
     - Aktivieren Sie "Template verwenden"
     - Wählen Sie Template aus Dropdown (falls vorhanden)
     - PDF wird automatisch generiert mit eingefügten Daten
   - **Option B: PDF hochladen**:
     - Deaktivieren Sie "Template verwenden"
     - Laden Sie PDF-Datei hoch
     - PDF-Vorschau wird angezeigt

3. **Validierung**:
   - Startdatum ist Pflichtfeld
   - Enddatum muss nach Startdatum liegen (falls angegeben)
   - Gehalt darf nicht negativ sein
   - Arbeitsstunden müssen zwischen 0 und 168 liegen

4. **Speichern**: Klicken Sie auf "Erstellen"

**Automatische Datenfüllung**:
- Benutzername (Vor- und Nachname)
- Organisationsname
- Aktuelles Datum
- Ausweisnummer
- Startdatum
- Enddatum
- Position
- Gehalt (formatiert als Währung)
- Arbeitsstunden

### Dokumente bearbeiten (HR/Admin)

**Zugriff**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"

1. **Arbeitszeugnis bearbeiten**:
   - Klicken Sie auf "Bearbeiten" bei einem Arbeitszeugnis
   - Ändern Sie Ausstellungsdatum oder Zertifikatstyp
   - Laden Sie optional neues PDF hoch
   - PDF-Vorschau wird angezeigt
   - Klicken Sie auf "Aktualisieren"

2. **Arbeitsvertrag bearbeiten**:
   - Klicken Sie auf "Bearbeiten" bei einem Arbeitsvertrag
   - Ändern Sie Daten (Startdatum, Enddatum, Gehalt, etc.)
   - Laden Sie optional neues PDF hoch
   - PDF-Vorschau wird angezeigt
   - Klicken Sie auf "Aktualisieren"

### Dokumente herunterladen (Alle)

**Zugriff**: 
- **Mitarbeiter**: Profil → Tab "Meine Dokumente"
- **HR/Admin**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"

1. Klicken Sie auf "Herunterladen" bei einem Dokument
2. PDF wird automatisch heruntergeladen

**Hinweis**: Das neueste Dokument wird mit einem "Aktuell"-Badge markiert.

---

## 🏥 Prozess: Sozialversicherungen

### Sozialversicherungen verwalten (Legal/Admin)

**Zugriff**: Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"

1. **Sozialversicherungen anzeigen**:
   - Status wird visuell angezeigt:
     - ✅ **registered**: Registriert
     - ⏰ **pending**: Ausstehend
     - ❌ **not_required**: Nicht erforderlich

2. **Sozialversicherung bearbeiten**:
   - Klicken Sie auf "Bearbeiten" bei der gewünschten Sozialversicherung
   - **Status ändern**: Wählen Sie neuen Status
   - **Registrierungsnummer**: Geben Sie Nummer ein (optional)
   - **Anbieter**: Geben Sie Anbieter ein (optional)
   - **Registrierungsdatum**: Geben Sie Datum ein (optional)
   - **Notizen**: Geben Sie Notizen ein (optional)
   - Klicken Sie auf "Speichern"

**Unterstützte Sozialversicherungen**:
- **ARL**: Arbeitsunfallversicherung
- **EPS**: Gesundheitsversicherung
- **Pension**: Rentenversicherung
- **Caja**: Ausgleichskasse

---

## 👥 Rollen und Berechtigungen

### Admin-Rolle

**Zugriff auf alles**:
- ✅ Rollen-Konfiguration
- ✅ Templates und Signaturen hochladen
- ✅ Feld-Positionen konfigurieren
- ✅ Arbeitszeugnisse erstellen/bearbeiten
- ✅ Arbeitsverträge erstellen/bearbeiten
- ✅ Sozialversicherungen verwalten
- ✅ Onboarding-Status ändern

### HR-Rolle

**Zugriff auf**:
- ✅ Arbeitszeugnisse erstellen/bearbeiten
- ✅ Arbeitsverträge erstellen/bearbeiten
- ✅ Dokumente herunterladen
- ✅ Onboarding-Status anzeigen
- ❌ Sozialversicherungen verwalten (nur anzeigen)
- ❌ Templates/Signaturen hochladen

**Konfiguration**: 
- HR-Rolle muss in "Rollen-Konfiguration" zugewiesen werden
- Standard-Rollen-Namen: "HR", "Human Resources", "Recursos Humanos"

### Legal-Rolle

**Zugriff auf**:
- ✅ Sozialversicherungen verwalten (ARL, EPS, Pension, Caja)
- ✅ Sozialversicherungen anzeigen
- ✅ Dokumente anzeigen (nur Lesen)
- ❌ Arbeitszeugnisse erstellen/bearbeiten
- ❌ Arbeitsverträge erstellen/bearbeiten

**Konfiguration**:
- Legal-Rolle muss in "Rollen-Konfiguration" zugewiesen werden
- Standard-Rollen-Namen: "Derecho", "Legal"
- Seed-File erstellt automatisch "Derecho"-Rolle mit Berechtigungen

### Mitarbeiter-Rolle

**Zugriff auf**:
- ✅ Eigene Dokumente anzeigen (Profil → Tab "Meine Dokumente")
- ✅ Eigene Dokumente herunterladen
- ✅ Onboarding-Status anzeigen (Profil → Tab "Lebenszyklus")
- ✅ Sozialversicherungen-Status anzeigen
- ❌ Dokumente erstellen/bearbeiten
- ❌ Sozialversicherungen verwalten

---

## 📝 Templates und Signaturen

### Template-System

**Funktionsweise**:
1. Admin/HR lädt PDF-Template hoch
2. Template wird in `Organization.settings.documentTemplates` gespeichert
3. Beim Erstellen eines Dokuments kann Template ausgewählt werden
4. System füllt Template automatisch mit Daten:
   - Lädt Positionen aus Settings oder verwendet Standard-Positionen
   - Fügt Text an definierten Positionen ein
   - Fügt Signatur ein (falls konfiguriert)
   - Generiert finales PDF

**Template-Variablen**:
- `userName`: Vor- und Nachname des Mitarbeiters
- `organizationName`: Name der Organisation
- `currentDate`: Aktuelles Datum (dd.MM.yyyy)
- `identificationNumber`: Ausweisnummer
- `startDate`: Startdatum (dd.MM.yyyy)
- `endDate`: Enddatum (dd.MM.yyyy)
- `position`: Position (nur Contract)
- `salary`: Gehalt (nur Contract, formatiert als Währung)
- `workingHours`: Arbeitsstunden (nur Contract)

**Positionen-Konfiguration**:
- X, Y: Koordinaten in PDF-Punkten
- FontSize: Schriftgröße (8-72)
- Standard-Positionen werden verwendet, falls keine konfiguriert sind

### Signatur-System

**Funktionsweise**:
1. Admin/HR lädt Signatur-Datei hoch (JPEG, PNG, GIF oder PDF)
2. Signatur wird in `Organization.settings.documentSignatures` gespeichert
3. Beim Generieren eines PDFs wird Signatur automatisch eingefügt:
   - Position: X, Y, Seite (konfigurierbar)
   - Fallback: Text-Unterschrift (Name + Position)

**Signatur-Position**:
- **X**: Horizontal-Position (Standard: 400)
- **Y**: Vertikal-Position (Standard: 100)
- **Seite**: Seitennummer (Standard: 1)

---

## 🔄 Vollständiger Prozess: A-Z

### Phase 1: Ersteinrichtung (Admin)

1. **Rollen-Konfiguration**:
   - Organisation → Einstellungen → Rollen-Konfiguration
   - Admin-Rolle, HR-Rolle, Legal-Rolle zuweisen
   - Speichern

2. **Templates hochladen**:
   - Organisation → Einstellungen → Dokumenten-Konfiguration
   - Template für Arbeitszeugnis hochladen
   - Template für Arbeitsvertrag hochladen
   - Feld-Positionen konfigurieren (optional)

3. **Signaturen hochladen**:
   - Organisation → Einstellungen → Dokumenten-Konfiguration
   - Signatur für Arbeitszeugnis hochladen (Name, Position, Datei, X, Y, Seite)
   - Signatur für Arbeitsvertrag hochladen (Name, Position, Datei, X, Y, Seite)

### Phase 2: Mitarbeiter hinzufügen (Admin)

1. **Benutzer erstellen/hinzufügen**:
   - Organisation → Benutzerverwaltung → Benutzer hinzufügen
   - Benutzer wird automatisch zum Onboarding-Prozess hinzugefügt
   - Status: "onboarding"

2. **Automatische Tasks**:
   - System erstellt automatisch 4 Tasks für Legal-Rolle:
     - ARL-Anmeldung
     - EPS-Anmeldung
     - Pension-Anmeldung
     - Caja-Anmeldung
   - Fälligkeitsdatum: 7 Tage

### Phase 3: Sozialversicherungen registrieren (Legal)

1. **Tasks bearbeiten**:
   - Legal-Rolle sieht Tasks in Task-Liste
   - Task bearbeiten und Status auf "done" setzen

2. **Sozialversicherungen verwalten**:
   - Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"
   - Bei jeder Sozialversicherung auf "Bearbeiten" klicken
   - Status, Registrierungsnummer, Anbieter, Datum, Notizen eingeben
   - Speichern

### Phase 4: Arbeitsvertrag erstellen (HR)

1. **Arbeitsvertrag erstellen**:
   - Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"
   - "Arbeitsvertrag erstellen" klicken
   - Daten werden automatisch vorausgefüllt (kann angepasst werden)
   - Template auswählen oder PDF hochladen
   - Validierung prüft Eingaben
   - "Erstellen" klicken

2. **PDF-Generierung**:
   - Falls Template verwendet wird:
     - System lädt Template-PDF
     - Füllt Daten an konfigurierten Positionen ein
     - Fügt Signatur ein (falls konfiguriert)
     - Generiert finales PDF
   - Falls PDF hochgeladen wird:
     - Hochgeladenes PDF wird verwendet

### Phase 5: Onboarding abschließen (HR/Admin)

1. **Status prüfen**:
   - Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"
   - Onboarding-Status anzeigen
   - Progress-Bar zeigt Fortschritt

2. **Status ändern** (falls erforderlich):
   - Status manuell auf "active" setzen
   - System setzt `onboardingCompletedAt`

### Phase 6: Arbeitszeugnis erstellen (HR)

1. **Arbeitszeugnis erstellen**:
   - Organisation → Benutzerverwaltung → [Benutzer auswählen] → Tab "Lebenszyklus"
   - "Arbeitszeugnis erstellen" klicken
   - Ausstellungsdatum wird automatisch auf heute gesetzt
   - Template auswählen oder PDF hochladen
   - Validierung prüft Eingaben
   - "Erstellen" klicken

2. **PDF-Generierung**:
   - Gleicher Prozess wie bei Arbeitsvertrag

### Phase 7: Dokumente anzeigen (Mitarbeiter)

1. **Eigene Dokumente anzeigen**:
   - Profil → Tab "Meine Dokumente"
   - Alle Arbeitszeugnisse und Arbeitsverträge werden angezeigt
   - Neueste Version wird mit "Aktuell"-Badge markiert

2. **Dokumente herunterladen**:
   - Klicken Sie auf "Herunterladen" bei einem Dokument
   - PDF wird automatisch heruntergeladen

---

## 🎯 Best Practices

### Templates

1. **Template-Erstellung**:
   - Verwenden Sie A4-Format
   - Platzieren Sie Platzhalter an gewünschten Positionen
   - Konfigurieren Sie Feld-Positionen nach Upload

2. **Positionen-Konfiguration**:
   - Testen Sie Positionen mit einem Test-PDF
   - Passen Sie X, Y, FontSize an
   - Speichern und erneut testen

### Signaturen

1. **Signatur-Qualität**:
   - Verwenden Sie hochauflösende Bilder (mind. 300 DPI)
   - PNG oder PDF für beste Qualität
   - Transparenter Hintergrund empfohlen

2. **Positionierung**:
   - Testen Sie Position mit einem Test-PDF
   - Passen Sie X, Y, Seite an
   - Speichern und erneut testen

### Dokumentenverwaltung

1. **Template vs. PDF-Upload**:
   - **Template**: Automatische Datenfüllung, konsistentes Format
   - **PDF-Upload**: Flexibel, manuelle Bearbeitung möglich

2. **Versionierung**:
   - System markiert automatisch neueste Version als "Aktuell"
   - Alte Versionen bleiben erhalten

---

## ❓ Häufige Fragen

### Q: Warum wird die HR-Rolle nicht gespeichert?

**A**: Stellen Sie sicher, dass:
- Die Rolle zur Organisation gehört
- Die Rollen-ID > 0 ist (nicht leer oder 0)
- Die Rolle im Dropdown angezeigt wird

**Lösung**: Problem wurde behoben - leere Strings oder "0" werden jetzt korrekt behandelt.

### Q: Wie funktioniert die automatische Datenfüllung?

**A**: 
- System lädt User- und Lifecycle-Daten beim Öffnen des Modals
- Felder werden automatisch vorausgefüllt
- Benutzer kann Werte anpassen

### Q: Kann ich mehrere Templates pro Typ haben?

**A**: 
- Aktuell: Ein Template pro Typ (Certificate/Contract)
- Neue Version überschreibt alte Version
- Versionierung wird automatisch verwaltet (1.0, 1.1, 2.0, etc.)

### Q: Wie werden Positionen gespeichert?

**A**:
- Positionen werden in `Organization.settings.documentTemplates[type].fields` gespeichert
- Format: `{ fieldName: { x: number, y: number, fontSize?: number } }`
- Falls keine Positionen konfiguriert sind, werden Standard-Positionen verwendet

---

## 📚 Technische Details

### Datenstruktur

**Organization.settings.documentTemplates**:
```json
{
  "employmentCertificate": {
    "path": "document-templates/template-xxx.pdf",
    "version": "1.0",
    "uploadDate": "2025-01-XX",
    "fields": {
      "userName": { "x": 50, "y": 800, "fontSize": 14 },
      "organizationName": { "x": 50, "y": 780, "fontSize": 12 }
    }
  }
}
```

**Organization.settings.documentSignatures**:
```json
{
  "employmentCertificate": {
    "path": "document-signatures/signature-xxx.png",
    "signerName": "Stefan Bossart",
    "signerPosition": "Geschäftsführer",
    "position": { "x": 400, "y": 100, "page": 1 },
    "uploadDate": "2025-01-XX"
  }
}
```

**Organization.settings.lifecycleRoles**:
```json
{
  "adminRoleId": 1,
  "hrRoleId": 5,
  "legalRoleId": 16,
  "employeeRoleIds": [2, 3, 4]
}
```

---

## 🔗 Weitere Ressourcen

- **Hauptplan**: [MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md](./MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md)
- **Fortschritts-Tracking**: [MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md](./MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md)
- **Status-Report**: [MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md](./MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md)
- **Aktueller Stand**: [MITARBEITERLEBENSZYKLUS_AKTUELLER_STAND.md](./MITARBEITERLEBENSZYKLUS_AKTUELLER_STAND.md)

---

**Letzte Aktualisierung**: 2025-01-XX  
**Version**: 1.0

