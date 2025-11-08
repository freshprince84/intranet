# MITARBEITERLEBENSZYKLUS - Prozessbeschreibung (Schritt für Schritt)

## Übersicht

Dieses Dokument beschreibt die konkreten UI-Abläufe für Arbeitszeugnis und Arbeitsvertrag - Schritt für Schritt mit allen Seiten, Boxen, Buttons und Modals.

---

## PROZESS 0: Rollen-Konfiguration (Admin)

### Schritt 1: Organisationseinstellungen öffnen

**Seite**: `/organization` (Organisation-Verwaltung)
**Komponente**: `OrganizationSettings.tsx`

**Container-Struktur** (Standard):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Ablauf**:
1. Admin klickt auf "Organisation" im Sidebar-Menü
2. Seite lädt: `OrganizationSettings.tsx`
3. **Box**: "Organisations-Infos" wird angezeigt
   - Standard-Box-Struktur: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`
4. **Button**: ✏️ (Pencil-Icon) oben rechts in der Box
5. Admin klickt auf ✏️ Button

**Ergebnis**: `EditOrganizationModal` öffnet sich

---

### Schritt 2: Rollen-Konfiguration öffnen

**Modal**: `EditOrganizationModal.tsx`

**WICHTIG**: Verwendet Standard-Sidepane-Pattern (wie `CreateTaskModal.tsx`)

**Technische Details**:
- **Import**: `import { useSidepane } from '../contexts/SidepaneContext.tsx';`
- **Mobile (<640px)**: Wird als Modal gerendert
- **Desktop (≥640px, ≤1070px)**: Sidepane MIT Overlay
- **Large Desktop (>1070px)**: Sidepane OHNE Overlay
- **Position**: `top-16` (beginnt unter Topbar)
- **Animation**: `transform transition-transform duration-350 ease-out` mit `cubic-bezier(0.25, 0.46, 0.45, 0.94)`

**Ablauf**:
1. Modal zeigt Tabs:
   - "Allgemein" (bestehend)
   - "SMTP-Einstellungen" (bestehend)
   - **"Rollen-Konfiguration"** (NEU) ← Admin klickt hier
2. Tab "Rollen-Konfiguration" öffnet sich

**Ergebnis**: Rollen-Konfigurations-Interface wird angezeigt

---

### Schritt 3: Rollen-Zuordnung konfigurieren

**Box**: "Lebenszyklus-Rollen" (in Rollen-Konfiguration Tab)

**Box-Struktur** (Standard):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
  {/* Box-Inhalt */}
</div>
```

**Ablauf**:
1. **Box-Header**: "Lebenszyklus-Rollen" mit Icon 👥
   - Struktur: `flex items-center justify-between mb-4`
   - Icon: `h-6 w-6 mr-2`
   - Titel: `text-xl font-semibold`
2. **Info-Text**: "Definieren Sie, welche Rollen für welche Prozessschritte zuständig sind"
3. **Sektion**: "Admin-Rolle"
   - **Dropdown**: "Admin-Rolle auswählen"
   - Standard: Erste Rolle mit Name "Admin" oder "Administrator"
   - Optionen: Alle Rollen der Organisation (via `/api/roles`)
   - **Hinweis**: "Admin-Rolle hat Zugriff auf alle Funktionen"
4. **Sektion**: "HR-Rolle"
   - **Dropdown**: "HR-Rolle auswählen"
   - Standard: Gleiche wie Admin-Rolle (kann geändert werden)
   - Optionen: Alle Rollen der Organisation
   - **Hinweis**: "HR-Rolle kann Arbeitszeugnisse und Arbeitsverträge erstellen/bearbeiten"
5. **Sektion**: "Legal-Rolle"
   - **Dropdown**: "Legal-Rolle auswählen"
   - Standard: Rolle mit Name "Derecho" (falls vorhanden)
   - Optionen: Alle Rollen der Organisation
   - **Hinweis**: "Legal-Rolle erhält Tasks für Sozialversicherungen (ARL, EPS, Pension, Caja)"
6. **Sektion**: "Mitarbeiter-Rollen"
   - **Multi-Select**: "Mitarbeiter-Rollen auswählen"
   - Standard: Alle Rollen außer Admin, HR und Legal
   - **Hinweis**: "Mitarbeiter-Rollen können nur ihre eigenen Dokumente ansehen"
7. **Button**: "Speichern" (blau)
   - Standard-Button: `bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700`

**Ergebnis**: Rollen-Zuordnung ist in `Organization.settings.lifecycleRoles` gespeichert

---

### Schritt 4: Standard-Zuordnung anwenden

**Button**: "Standard-Zuordnung anwenden" (grau, neben "Speichern")

**Ablauf**:
1. Admin klickt auf "Standard-Zuordnung anwenden"
2. **Bestätigungs-Modal**:
   - "Standard-Zuordnung anwenden?"
   - "Admin-Rolle = HR-Rolle (erste Admin-Rolle)"
   - "Legal-Rolle = 'Derecho' (falls vorhanden)"
   - "Alle anderen = Mitarbeiter"
   - **Button**: "Ja, anwenden" (blau)
   - **Button**: "Abbrechen" (grau)
3. Admin bestätigt
4. System:
   - Findet erste Admin-Rolle (Name enthält "Admin" oder "Administrator")
   - Setzt `lifecycleRoles.adminRoleId` und `hrRoleId` auf diese Rolle
   - Findet Rolle "Derecho" (falls vorhanden)
   - Setzt `lifecycleRoles.legalRoleId` auf "Derecho"
   - Setzt alle anderen Rollen als `employeeRoleIds`
5. Felder werden automatisch ausgefüllt
6. Admin kann noch anpassen und dann "Speichern" klicken

**Ergebnis**: Standard-Zuordnung ist angewendet

---

### Schritt 5: Speichern

**Button**: "Speichern" (unten im Modal, blau)

**Ablauf**:
1. Admin klickt "Speichern"
2. **Loading-Spinner** wird angezeigt
3. System speichert Rollen-Zuordnung in `Organization.settings.lifecycleRoles` (JSON)
4. **Erfolgs-Message**: "Rollen-Zuordnung erfolgreich gespeichert"
5. Modal schließt sich (optional) oder bleibt offen für weitere Konfiguration

**Ergebnis**: Rollen-Zuordnung ist gespeichert und wird in allen Prozessen verwendet

---

## PROZESS 1: Konfiguration (Admin/HR)

### Schritt 1: Organisationseinstellungen öffnen

**Seite**: `/organization` (Organisation-Verwaltung)
**Komponente**: `OrganizationSettings.tsx`

**Ablauf**:
1. User klickt auf "Organisation" im Sidebar-Menü
2. Seite lädt: `OrganizationSettings.tsx`
3. **Box**: "Organisations-Infos" wird angezeigt
4. **Button**: ✏️ (Pencil-Icon) oben rechts in der Box
5. User klickt auf ✏️ Button

**Ergebnis**: `EditOrganizationModal` öffnet sich

---

### Schritt 2: Dokumenten-Konfiguration öffnen

**Modal**: `EditOrganizationModal.tsx`

**Ablauf**:
1. Modal zeigt Tabs:
   - "Allgemein" (bestehend)
   - "SMTP-Einstellungen" (bestehend)
   - **"Dokumenten-Konfiguration"** (NEU) ← User klickt hier
2. Tab "Dokumenten-Konfiguration" öffnet sich

**Ergebnis**: Dokumenten-Konfigurations-Interface wird angezeigt

---

### Schritt 3: Arbeitszeugnis-Template hochladen

**Box**: "Arbeitszeugnis-Template" (in Dokumenten-Konfiguration Tab)

**Ablauf**:
1. **Box-Header**: "Arbeitszeugnis-Template" mit Icon 📄
2. **Status-Anzeige**:
   - Falls kein Template: "Kein Template hochgeladen" (rot)
   - Falls Template vorhanden: "Template Version 1.0" (grün) + Upload-Datum
3. **Button**: "Template hochladen" (blau)
4. User klickt auf "Template hochladen"
5. **File-Picker** öffnet sich (nur PDF erlaubt)
6. User wählt PDF-Datei aus
7. **Upload-Progress** wird angezeigt
8. Nach Upload: **Erfolgs-Message**: "Template erfolgreich hochgeladen"
9. Status aktualisiert sich: "Template Version 1.0" (grün)

**Ergebnis**: Template ist in `Organization.settings.documentTemplates.employmentCertificate.path` gespeichert

---

### Schritt 4: Signatur für Arbeitszeugnis hochladen

**Box**: "Signatur für Arbeitszeugnis" (unter Template-Box)

**Ablauf**:
1. **Box-Header**: "Signatur für Arbeitszeugnis" mit Icon ✍️
2. **Status-Anzeige**:
   - Falls keine Signatur: "Keine Signatur hochgeladen" (rot)
   - Falls Signatur vorhanden: "Signatur: Stefan Bossart" (grün)
3. **Button**: "Signatur hochladen" (blau)
4. User klickt auf "Signatur hochladen"
5. **Modal**: `SignatureUploadModal` öffnet sich

**Modal-Inhalt** (`SignatureUploadModal`):
- **File-Upload**: Bild oder PDF (PNG, JPG, PDF)
- **Input-Feld**: "Name des Unterzeichners" (z.B. "Stefan Bossart")
- **Input-Feld**: "Position" (z.B. "Geschäftsführer")
- **Position-Konfiguration**:
  - **Input**: X-Koordinate (Zahl, z.B. 400)
  - **Input**: Y-Koordinate (Zahl, z.B. 100)
  - **Input**: Seitenzahl (Zahl, z.B. 1)
  - **Hinweis**: "Position wird in PDF-Punkten angegeben (1 Punkt = 1/72 Zoll)"
- **Button**: "Vorschau" (zeigt Signatur-Position im Template)
- **Button**: "Speichern" (blau)
- **Button**: "Abbrechen" (grau)

6. User füllt alle Felder aus
7. User klickt "Speichern"
8. **Upload-Progress** wird angezeigt
9. Nach Upload: **Erfolgs-Message**: "Signatur erfolgreich hochgeladen"
10. Modal schließt sich
11. Status aktualisiert sich: "Signatur: Stefan Bossart" (grün)

**Ergebnis**: Signatur ist in `Organization.settings.documentSignatures.employmentCertificate` gespeichert

---

### Schritt 5: Einstellungen für Arbeitszeugnis konfigurieren

**Box**: "Einstellungen für Arbeitszeugnis" (unter Signatur-Box)

**Ablauf**:
1. **Checkbox**: "Gehalt im Arbeitszeugnis anzeigen"
   - Standard: ❌ (nicht angehakt)
   - User kann ankreuzen, wenn gewünscht
2. **Dropdown**: "Standard-Sprache"
   - Optionen: "Spanisch (es)", "Deutsch (de)", "Englisch (en)"
   - Standard: "Spanisch (es)"
3. **Checkbox**: "Automatisch bei Offboarding generieren"
   - Standard: ✅ (angehakt)
   - Wenn angehakt: System generiert automatisch bei Offboarding-Start

**Ergebnis**: Einstellungen sind in `Organization.settings.documentSettings.employmentCertificate` gespeichert

---

### Schritt 6: Arbeitsvertrag-Template hochladen

**Box**: "Arbeitsvertrag-Template" (neue Sektion)

**Ablauf**: Identisch zu Schritt 3, aber für Arbeitsvertrag

**Ergebnis**: Template ist in `Organization.settings.documentTemplates.employmentContract.path` gespeichert

---

### Schritt 7: Signatur für Arbeitsvertrag hochladen

**Box**: "Signatur für Arbeitsvertrag"

**Ablauf**: Identisch zu Schritt 4, aber für Arbeitsvertrag

**Ergebnis**: Signatur ist in `Organization.settings.documentSignatures.employmentContract` gespeichert

---

### Schritt 8: Einstellungen für Arbeitsvertrag konfigurieren

**Box**: "Einstellungen für Arbeitsvertrag"

**Ablauf**:
1. **Dropdown**: "Standard-Sprache"
2. **Checkbox**: "Mitarbeiter-Unterschrift erforderlich"
   - Standard: ❌ (nicht angehakt)
3. **Checkbox**: "Automatisch bei Onboarding generieren"
   - Standard: ✅ (angehakt)

**Ergebnis**: Einstellungen sind in `Organization.settings.documentSettings.employmentContract` gespeichert

---

### Schritt 9: Speichern

**Button**: "Speichern" (unten im Modal, blau)

**Ablauf**:
1. User klickt "Speichern"
2. **Loading-Spinner** wird angezeigt
3. System speichert alle Einstellungen in `Organization.settings` (JSON)
4. **Erfolgs-Message**: "Einstellungen erfolgreich gespeichert"
5. Modal schließt sich
6. `OrganizationSettings` wird neu geladen

**Ergebnis**: Alle Konfigurationen sind gespeichert

---

## PROZESS 2: Onboarding - Automatische Task-Erstellung für Sozialversicherungen

### Schritt 1: User wird zur Organisation hinzugefügt

**Trigger**: User akzeptiert Invitation oder Join Request wird genehmigt

**Ablauf** (automatisch):
1. System erkennt: Neuer User in Organisation mit Land "CO"
2. System setzt User-Status auf `onboarding`
3. System erstellt automatisch `EmployeeLifecycle`-Eintrag
4. System erstellt automatisch Tasks für Legal-Rolle:
   - Task "ARL-Anmeldung durchführen"
   - Task "EPS-Anmeldung prüfen" (falls erforderlich)
   - Task "Pension-Anmeldung durchführen"
   - Task "Caja-Anmeldung durchführen"
5. **Notifications** werden an Legal-Rolle gesendet

**Ergebnis**: Alle Onboarding-Tasks sind erstellt

---

### Schritt 2: Legal-Rolle sieht Tasks

**Seite**: `/worktracker` (Task-Übersicht)
**Komponente**: `Tasks.tsx`

**Container-Struktur** (Standard):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Ablauf**:
1. User mit Legal-Rolle öffnet Task-Übersicht
2. **System prüft**: Hat User die Legal-Rolle? 
   - Frontend: `const { isLegal } = usePermissions();`
   - Prüft `Organization.settings.lifecycleRoles.legalRoleId` gegen aktive Rolle
   - Fallback: Prüft ob Rollenname "Derecho" enthält
3. **Filter**: "Status: Open" + "Rolle: Legal" (automatisch gefiltert)
4. **Tabelle** zeigt alle neuen Tasks:
   - "ARL-Anmeldung durchführen" (für User: Stefan Bossart)
   - "Pension-Anmeldung durchführen" (für User: Stefan Bossart)
   - "Caja-Anmeldung durchführen" (für User: Stefan Bossart)
5. Legal-Rolle klickt auf Task "ARL-Anmeldung durchführen"

**Ergebnis**: Task-Detail wird angezeigt

---

## PROZESS 3: ARL-Anmeldung durchführen (Legal-Rolle)

### Schritt 1: ARL-Task öffnen

**Seite**: `/worktracker` → Task-Detail
**Komponente**: `TaskDetail.tsx` oder `EditTaskModal.tsx`

**Container-Struktur** (Standard):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Ablauf**:
1. Legal-Rolle klickt auf Task "ARL-Anmeldung durchführen"
2. Task-Detail öffnet sich
3. **Box**: "Task-Details"
   - Standard-Box-Struktur: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4`
   - Titel: "ARL-Anmeldung durchführen"
   - Beschreibung: "ARL-Anmeldung für Stefan Bossart durchführen"
   - Status: "Open" (Status-Badge: `px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800`)
   - Zugewiesen an: [Legal-Rolle User]
4. **Box**: "Automatisch generierte Daten" (NEU)
   - Standard-Box-Struktur: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4`
   - Zeigt alle gesammelten Daten:
     - User: Stefan Bossart
     - Cédula: 1234567890
     - Eintrittsdatum: 15.01.2024
     - Gehalt: $2.000.000
     - Organisation: La Familia Hostel S.A.S.
     - NIT: 901.726.496-4
   - **Button**: "Daten kopieren" (kopiert alle Daten in Zwischenablage)
     - Standard-Button: `bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700`

**Ergebnis**: Legal-Rolle sieht alle benötigten Daten

---

### Schritt 2: Email-Vorlage anzeigen/generieren

**Box**: "Email-Vorlage" (in Task-Detail)

**Box-Struktur** (Standard):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
  {/* Box-Inhalt */}
</div>
```

**Ablauf**:
1. **Box-Header**: "Email-Vorlage für ARL-Anmeldung"
   - Struktur: `flex items-center justify-between mb-4`
   - Titel: `text-lg font-semibold`
2. **Button**: "Email-Vorlage generieren" (blau)
   - Standard-Button: `bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700`
3. Legal-Rolle klickt auf "Email-Vorlage generieren"
4. System generiert Email-Vorlage mit allen Daten
5. **Text-Box** zeigt Email-Vorlage:
   ```
   Betreff: ARL-Anmeldung - Stefan Bossart
   
   Sehr geehrte Damen und Herren,
   
   wir möchten hiermit die ARL-Anmeldung für folgenden Mitarbeiter beantragen:
   
   Name: Stefan Bossart
   Cédula: 1234567890
   Eintrittsdatum: 15.01.2024
   Gehalt: $2.000.000
   Position: [Position]
   
   Organisation: La Familia Hostel S.A.S.
   NIT: 901.726.496-4
   
   Bitte senden Sie uns die Bestätigung der Anmeldung zu.
   
   Mit freundlichen Grüßen
   [Organisation]
   ```
6. **Button**: "Email kopieren" (kopiert Email in Zwischenablage)
7. **Button**: "Email versenden" (falls automatisch konfiguriert)
8. **Input-Feld**: "ARL-Email-Adresse" (aus Konfiguration oder manuell eingeben)

**Ergebnis**: Email-Vorlage ist bereit

---

### Schritt 3: Email versenden

**Option A: Automatisch versenden** (falls konfiguriert)

**Ablauf**:
1. Legal-Rolle klickt "Email versenden"
2. **Bestätigungs-Modal** öffnet sich:
   - "Email wirklich an [ARL-Email] versenden?"
   - **Button**: "Ja, versenden" (blau)
   - **Button**: "Abbrechen" (grau)
3. Legal-Rolle bestätigt
4. **Loading-Spinner**: "Email wird versendet..."
5. System sendet Email über konfigurierten SMTP
6. **Erfolgs-Message**: "Email erfolgreich versendet"
7. **Checkbox**: "Email-Versand bestätigt" wird angehakt

**Ergebnis**: Email ist versendet

---

**Option B: Manuell versenden**

**Ablauf**:
1. Legal-Rolle kopiert Email-Vorlage
2. Legal-Rolle öffnet sein Email-Programm
3. Legal-Rolle fügt Email ein und sendet manuell
4. **Checkbox**: "Email manuell versendet" wird angehakt
5. **Input-Feld**: "Bestätigungsnummer" (falls vorhanden)

**Ergebnis**: Email ist manuell versendet

---

### Schritt 4: ARL-Anmeldung abschließen

**Box**: "Anmeldung abschließen" (in Task-Detail)

**Box-Struktur** (Standard):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
  {/* Box-Inhalt */}
</div>
```

**Formular-Struktur** (Standard):
```tsx
<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      ARL-Registrierungsnummer
    </label>
    <input
      type="text"
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    />
  </div>
  {/* Weitere Felder... */}
</form>
```

**Ablauf**:
1. **Input-Feld**: "ARL-Registrierungsnummer" (z.B. "ARL-123456")
   - Standard-Input: `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md`
2. **Input-Feld**: "ARL-Provider" (z.B. "ARL SURA")
3. **Date-Picker**: "Registrierungsdatum" (Standard: heute)
4. **Textarea**: "Notizen" (optional, z.B. "Bestätigung per Email erhalten")
5. **Button**: "Anmeldung abschließen" (grün)
   - Standard-Button: `bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700`
6. Legal-Rolle füllt Felder aus
7. Legal-Rolle klickt "Anmeldung abschließen"
8. **Bestätigungs-Modal**:
   - "ARL-Anmeldung wirklich als abgeschlossen markieren?"
   - **Button**: "Ja, abschließen" (grün)
   - **Button**: "Abbrechen" (grau)
9. Legal-Rolle bestätigt
10. System:
    - Aktualisiert `EmployeeLifecycle.arlStatus` auf "registered"
    - Setzt `EmployeeLifecycle.arlNumber` und `arlProvider`
    - Setzt `EmployeeLifecycle.arlRegisteredAt`
    - Markiert Task als "done"
    - Aktualisiert Progress-Bar
11. **Erfolgs-Message**: "ARL-Anmeldung erfolgreich abgeschlossen"
    - Verwendet `useMessage()` Hook: `showMessage('ARL-Anmeldung erfolgreich abgeschlossen', 'success')`
12. **Notification** wird an User gesendet: "ARL-Anmeldung abgeschlossen"
13. Task verschwindet aus "Open"-Liste

**Ergebnis**: ARL-Anmeldung ist abgeschlossen, Status ist aktualisiert

---

## PROZESS 4: EPS-Anmeldung (falls erforderlich)

### Schritt 1: EPS-Status prüfen

**Seite**: `/users` → User-Detail → Tab "Lebenszyklus"
**Komponente**: `LifecycleView.tsx`

**Ablauf**:
1. HR öffnet User-Detail
2. Tab "Lebenszyklus" öffnet sich
3. **Box**: "Sozialversicherungen"
4. **Sektion**: "EPS"
   - Status: "Nicht erforderlich" (grau) oder "Ausstehend" (orange)
   - **Checkbox**: "EPS erforderlich" (falls nicht angehakt)
   - **Button**: "EPS-Anmeldung starten" (falls erforderlich)

**Ergebnis**: EPS-Status ist sichtbar

---

### Schritt 2a: EPS nicht erforderlich

**Ablauf**:
1. HR sieht: "EPS nicht erforderlich" (grau)
2. **Info-Text**: "User hat bereits EPS über andere Quelle"
3. Keine Aktion nötig
4. System setzt `EmployeeLifecycle.epsStatus` auf "not_required"

**Ergebnis**: EPS ist als nicht erforderlich markiert

---

### Schritt 2b: EPS erforderlich - Anmeldung starten

**Ablauf**:
1. HR klickt Checkbox "EPS erforderlich" an
2. System setzt `EmployeeLifecycle.epsRequired = true`
3. System erstellt automatisch Task "EPS-Anmeldung durchführen" für Legal-Rolle
4. **Notification** wird an Legal-Rolle gesendet
5. Prozess identisch zu ARL-Anmeldung (Prozess 3)

**Ergebnis**: EPS-Anmeldung läuft

---

## PROZESS 5: Pension-Anmeldung durchführen (Legal-Rolle)

### Schritt 1: Pension-Task öffnen

**Ablauf**: Identisch zu Prozess 3, Schritt 1, aber für Pension

---

### Schritt 2: Email-Vorlage generieren

**Ablauf**: Identisch zu Prozess 3, Schritt 2, aber für Pension

**Email-Vorlage**:
```
Betreff: Pension-Anmeldung - Stefan Bossart

[Gleiche Struktur wie ARL, aber für Pension]
```

---

### Schritt 3: Email versenden

**Ablauf**: Identisch zu Prozess 3, Schritt 3

---

### Schritt 4: Pension-Anmeldung abschließen

**Ablauf**: Identisch zu Prozess 3, Schritt 4, aber für Pension

**Felder**:
- Pension-Registrierungsnummer
- Pension-Provider
- Registrierungsdatum

**Ergebnis**: System aktualisiert `EmployeeLifecycle.pensionStatus` auf "registered"

---

## PROZESS 6: Caja-Anmeldung durchführen (Legal-Rolle)

### Schritt 1-4: Identisch zu Prozess 5 (Pension)

**Ergebnis**: System aktualisiert `EmployeeLifecycle.cajaStatus` auf "registered"

---

## PROZESS 7: Onboarding-Progress anzeigen (Mitarbeiter)

### Schritt 1: Profil öffnen

**Seite**: `/profile` → Tab "Lebenszyklus" (NEU)
**Komponente**: `Profile.tsx`

**Container-Struktur** (Standard):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Tab-Struktur** (Standard):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Tab-Navigation */}
  <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
    <nav className="-mb-px flex space-x-8">
      {/* Tab-Buttons */}
    </nav>
  </div>
  
  {/* Tab-Content */}
  <div className="mt-6">
    {/* Tab-Inhalt */}
  </div>
</div>
```

**WICHTIG**: 
- Tab-Content hat `mt-6` (nicht `pt-0`!)
- Tab-Navigation hat `border-b border-gray-200 dark:border-gray-700 mb-6`
- Keine negativen Margins (`-mx-6 px-6`) auf Tab-Header

**Ablauf**:
1. Mitarbeiter öffnet sein Profil
2. **Tabs** werden angezeigt:
   - "Profil"
   - "Dokumente"
   - **"Lebenszyklus"** (NEU) ← Mitarbeiter klickt hier

**Ergebnis**: Tab "Lebenszyklus" öffnet sich

---

### Schritt 2: Progress-Bar anzeigen

**Box**: "Onboarding-Status" (in Tab "Lebenszyklus")

**Box-Struktur** (Standard):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
  {/* Box-Inhalt */}
</div>
```

**Ablauf**:
1. **Progress-Bar** wird angezeigt (horizontal, 5 Schritte):
   ```
   [✅] Passport uploaded
   [⏳] ARL requested
   [⚪] EPS not required
   [⏳] Pension requested
   [⏳] Caja requested
   ```
   - **Struktur**: `flex items-center space-x-4` (horizontal)
   - **Icons**: `h-5 w-5` (Desktop), `h-4 w-4` (Mobile)
   - **Farben**: 
     - ✅ = `text-green-600` (grün)
     - ⏳ = `text-orange-600` (orange)
     - ⚪ = `text-gray-400` (grau)
     - ❌ = `text-red-600` (rot)
2. **Legende**:
   - ✅ = Abgeschlossen (grün)
   - ⏳ = In Bearbeitung (orange)
   - ⚪ = Nicht erforderlich (grau)
   - ❌ = Fehlgeschlagen (rot)
3. **Status-Text**: "Onboarding zu 20% abgeschlossen (1 von 5 Schritten)"
   - **Struktur**: `text-sm text-gray-600 dark:text-gray-400 mt-2`

**Ergebnis**: Mitarbeiter sieht aktuellen Fortschritt

---

### Schritt 3: Details anzeigen

**Box**: "Sozialversicherungen" (unter Progress-Bar)

**Box-Struktur** (Standard):
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
  {/* Box-Inhalt */}
</div>
```

**Ablauf**:
1. **Liste** zeigt alle Sozialversicherungen:
   - **ARL**: ⏳ "Anmeldung läuft" (orange Badge)
     - **Badge**: `px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`
     - Registrierungsnummer: [noch nicht vorhanden]
     - Provider: [noch nicht vorhanden]
   - **EPS**: ⚪ "Nicht erforderlich" (grau Badge)
     - **Badge**: `px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`
   - **Pension**: ⏳ "Anmeldung läuft" (orange Badge)
   - **Caja**: ⏳ "Anmeldung läuft" (orange Badge)
2. **Klick auf Eintrag**: Zeigt Details (wann gestartet, wer zuständig, etc.)
   - **Struktur**: Expandable Content (kann eingeklappt/ausgeklappt werden)

**Ergebnis**: Mitarbeiter sieht detaillierten Status

---

## PROZESS 8: Arbeitszeugnis erstellen (HR) - MIT BEARBEITUNG

### Schritt 1: User-Detail öffnen

**Seite**: `/users` → User auswählen → Tab "Lebenszyklus"
**Komponente**: `UserManagementTab.tsx` → `LifecycleView.tsx`

**Container-Struktur** (Standard):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Ablauf**:
1. User öffnet User-Detail
2. **System prüft**: Hat User HR-Rolle oder Admin-Rolle?
   - Frontend: `const { isHR } = usePermissions();`
   - Prüft `Organization.settings.lifecycleRoles.hrRoleId` oder `adminRoleId` gegen aktive Rolle
   - Fallback: Prüft ob Rollenname "admin" enthält
   - Falls ja: Button "Arbeitszeugnis erstellen" wird angezeigt
   - Falls nein: Button wird nicht angezeigt (nur Ansicht)
3. Tab "Lebenszyklus" öffnet sich
4. **Box**: "Dokumente" (Standard-Box-Struktur: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`)
5. **Sektion**: "Arbeitszeugnis"
   - Status: "Nicht vorhanden" oder "Vorhanden"
   - **Button**: "Arbeitszeugnis erstellen" (blau, groß) ← Nur für HR/Admin sichtbar (`{isHR() && <button>...`})
   - **Button**: "Arbeitszeugnis anzeigen" (grau) ← Für alle sichtbar

**Ergebnis**: Modal öffnet sich (nur wenn HR/Admin)

---

### Schritt 2: Arbeitszeugnis-Modal öffnen

**Modal**: `CertificateCreationModal.tsx` (NEU - für HR mit Bearbeitung)

**WICHTIG**: Verwendet Standard-Sidepane-Pattern (wie `CreateTaskModal.tsx`)

**Technische Details**:
- **Import**: `import { useSidepane } from '../contexts/SidepaneContext.tsx';`
- **Mobile (<640px)**: Wird als Modal gerendert
- **Desktop (≥640px, ≤1070px)**: Sidepane MIT Overlay
- **Large Desktop (>1070px)**: Sidepane OHNE Overlay
- **Position**: `top-16` (beginnt unter Topbar)
- **Animation**: `transform transition-transform duration-350 ease-out` mit `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- **Scroll-Struktur**: Für große Inhalte (PDF-Vorschau + Text-Bearbeitung) muss `modal-scroll-container` verwendet werden

**Ablauf**:
1. Modal öffnet sich
2. **Überschrift**: "Arbeitszeugnis erstellen für [User-Name]"
3. **Tabs** im Modal:
   - "Daten" (Standard)
   - "Text bearbeiten" (NEU - für HR)

**Ergebnis**: Tab "Daten" wird angezeigt

---

### Schritt 3: Daten prüfen/bearbeiten

**Tab**: "Daten" (in Modal)

**Ablauf**:
1. **Box**: "Automatisch erkannte Daten"
   - Name: "Stefan Bossart" (aus User-Profil)
   - Cédula: "1234567890" (aus User-Profil)
   - Eintrittsdatum: "15.01.2024" (aus EmployeeLifecycle)
   - Austrittsdatum: [leer oder aus EmployeeLifecycle]
   - Vertragstyp: "Unbefristet" (aus EmployeeLifecycle)
   - Gehalt: "$2.000.000" (aus User-Profil, falls erlaubt)
   - Position: [aus User-Rollen]
2. **Input-Felder** (editierbar):
   - Eintrittsdatum (Date-Picker)
   - Austrittsdatum (Date-Picker, optional)
   - Vertragstyp (Dropdown)
   - Gehalt (Input, falls erlaubt)
   - Position (Input)
3. HR kann alle Felder bearbeiten
4. **Button**: "Weiter" (blau) → Wechselt zu Tab "Text bearbeiten"

**Ergebnis**: Daten sind geprüft/bearbeitet

---

### Schritt 4: Text bearbeiten (HR)

**Tab**: "Text bearbeiten" (in Modal)

**WICHTIG**: Modal-Scroll-Struktur für große Inhalte

**Struktur**:
```tsx
<Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl modal-scroll-container">
  {/* Header - immer sichtbar */}
  <div className="modal-scroll-header">
    {/* Titel und Close-Button */}
  </div>
  
  {/* Content - scrollbar */}
  <div className="modal-scroll-content">
    {/* PDF-Vorschau + Text-Bearbeitung */}
  </div>
  
  {/* Footer - immer sichtbar */}
  <div className="modal-scroll-footer">
    {/* Buttons */}
  </div>
</Dialog.Panel>
```

**Ablauf**:
1. **Box**: "PDF-Vorschau"
   - System lädt Template
   - System füllt Template mit Daten (aus Schritt 3)
   - **PDF-Vorschau** wird angezeigt (iframe oder PDF-Viewer)
   - **Höhe**: Maximal verfügbarer Platz im `modal-scroll-content`
2. **Box**: "Text-Felder bearbeiten"
   - **Textarea**: "Einleitungstext" (aus Template, editierbar)
   - **Textarea**: "Haupttext" (aus Template, editierbar)
   - **Textarea**: "Schlusstext" (aus Template, editierbar)
   - **Hinweis**: "Änderungen werden in der Vorschau aktualisiert"
3. **Button**: "Vorschau aktualisieren" (blau)
   - Aktualisiert PDF-Vorschau mit geändertem Text
4. HR bearbeitet Text nach Bedarf
5. **Button**: "Generieren und speichern" (grün) - Im Footer, immer sichtbar

**Ergebnis**: Text ist bearbeitet, PDF ist generiert

---

### Schritt 5: PDF generieren und speichern

**Ablauf**:
1. HR klickt "Generieren und speichern"
2. **Loading-Spinner**: "Arbeitszeugnis wird generiert..."
3. System:
   - Lädt Template
   - Füllt Template mit bearbeiteten Daten
   - Ersetzt Text-Felder mit bearbeitetem Text
   - Fügt Signatur hinzu
   - Generiert PDF
   - Speichert PDF im `EmploymentCertificate`-Model
4. **Erfolgs-Message**: "Arbeitszeugnis erfolgreich erstellt"
5. Modal schließt sich
6. **Notification** wird an Mitarbeiter gesendet: "Ihr Arbeitszeugnis wurde erstellt"
7. **Notification** wird an HR gesendet: "Arbeitszeugnis für [User] wurde erstellt"

**Ergebnis**: Arbeitszeugnis ist erstellt und gespeichert

---

### Schritt 6: Mitarbeiter sieht Arbeitszeugnis automatisch

**Seite**: `/profile` → Tab "Meine Dokumente"
**Komponente**: `Profile.tsx`

**Ablauf** (automatisch):
1. Mitarbeiter öffnet sein Profil
2. Tab "Meine Dokumente" öffnet sich
3. **Box**: "Arbeitszeugnis"
   - **Status**: "Neues Arbeitszeugnis verfügbar" (grüner Badge) ← NEU
   - **Liste** zeigt:
     - "Arbeitszeugnis vom 15.01.2025" (neueste, hervorgehoben)
     - Erstellt von: [HR-Name]
     - **Button**: "Download" (blau)
4. **Notification-Badge** (oben rechts): Zeigt "1 neue Benachrichtigung"
5. Mitarbeiter klickt auf Notification
6. **Notification** zeigt: "Ihr Arbeitszeugnis wurde erstellt"
7. Mitarbeiter klickt auf "Download"
8. PDF wird heruntergeladen

**Ergebnis**: Mitarbeiter sieht Arbeitszeugnis automatisch nach Erstellung durch HR

---

## PROZESS 9: Arbeitsvertrag erstellen/bearbeiten (HR) - MIT BEARBEITUNG

### Schritt 1: User-Detail öffnen

**Ablauf**: Identisch zu Prozess 8, Schritt 1, aber für Arbeitsvertrag

---

### Schritt 2: Arbeitsvertrag-Modal öffnen

**Modal**: `ContractCreationModal.tsx` (NEU - für HR mit Bearbeitung)

**Ablauf**:
1. Modal öffnet sich
2. **Überschrift**: "Arbeitsvertrag erstellen für [User-Name]"
3. **Tabs** im Modal:
   - "Vertragsdaten" (Standard)
   - "Text bearbeiten" (NEU - für HR)

**Ergebnis**: Tab "Vertragsdaten" wird angezeigt

---

### Schritt 3: Vertragsdaten eingeben/bearbeiten

**Tab**: "Vertragsdaten" (in Modal)

**Ablauf**:
1. **Box**: "Automatisch erkannte Daten"
   - Name, Cédula, etc. (aus User-Profil)
2. **Input-Felder** (editierbar):
   - Vertragstyp (Dropdown: Erstvertrag, Änderung, Verlängerung)
   - Vertragsstart (Date-Picker)
   - Vertragsende (Date-Picker, optional)
   - Gehalt (Input)
   - Arbeitsstunden (Input)
   - Position (Input)
   - Kündigungsfrist (Input)
   - etc.
3. HR füllt alle Felder aus
4. **Button**: "Weiter" (blau) → Wechselt zu Tab "Text bearbeiten"

**Ergebnis**: Vertragsdaten sind eingegeben

---

### Schritt 4: Text bearbeiten (HR)

**Ablauf**: Identisch zu Prozess 8, Schritt 4, aber für Arbeitsvertrag

---

### Schritt 5: PDF generieren und speichern

**Ablauf**: Identisch zu Prozess 8, Schritt 5, aber für Arbeitsvertrag

**Ergebnis**: Arbeitsvertrag ist erstellt, Mitarbeiter erhält Notification

---

### Schritt 6: Mitarbeiter sieht Arbeitsvertrag automatisch

**Ablauf**: Identisch zu Prozess 8, Schritt 6, aber für Arbeitsvertrag

---

## PROZESS 10: Arbeitszeugnis abrufen (Mitarbeiter) - NUR ANSICHT

### Schritt 1: Profil öffnen

**Seite**: `/profile` → Tab "Meine Dokumente"
**Komponente**: `Profile.tsx`

**Container-Struktur** (Standard):
```tsx
<div className="min-h-screen dark:bg-gray-900">
  <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
    {/* Seiteninhalt */}
  </div>
</div>
```

**Ablauf**:
1. User öffnet sein Profil
2. **System prüft**: Hat User HR-Rolle oder Admin-Rolle?
   - Frontend: `const { isHR } = usePermissions();`
   - Prüft `Organization.settings.lifecycleRoles.hrRoleId` oder `adminRoleId` gegen aktive Rolle
   - Fallback: Prüft ob Rollenname "admin" enthält
   - Falls nein: Nur Ansicht/Download möglich
   - Falls ja: Zusätzlich Button "Arbeitszeugnis erstellen" sichtbar
3. Tab "Meine Dokumente" öffnet sich
4. **Box**: "Arbeitszeugnis" (Standard-Box-Struktur: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`)
   - Status: "Arbeitszeugnis verfügbar" (grün)
   - **Liste** zeigt alle Zeugnisse:
     - "Arbeitszeugnis vom 15.01.2025" (neueste, hervorgehoben)
     - Erstellt von: [HR-Name]
     - Erstellt am: 15.01.2025, 10:30 Uhr
     - **Button**: "Download" (blau) ← Für alle sichtbar
     - **Button**: "Vorschau" (grau) ← Für alle sichtbar
     - **Button**: "Bearbeiten" (blau) ← Nur für HR/Admin sichtbar (`{isHR() && <button>...`})
5. User klickt auf "Download"
6. PDF wird heruntergeladen

**Wichtig**: 
- **Mitarbeiter** (ohne HR/Admin-Rolle) kann **KEIN** neues Zeugnis generieren - nur ansehen/downloaden
- **HR/Admin** kann Arbeitszeugnis erstellen und bearbeiten

**Ergebnis**: Mitarbeiter sieht und lädt Arbeitszeugnis herunter

---

## PROZESS 11: Arbeitsvertrag abrufen (Mitarbeiter) - NUR ANSICHT

### Schritt 1-5: Identisch zu Prozess 10, aber für Arbeitsvertrag

**Wichtig**: Mitarbeiter kann **KEINEN** neuen Vertrag generieren - nur HR kann das!

---

## PROZESS 12: Arbeitszeugnis bearbeiten (HR) - NEUE VERSION

### Schritt 1: Bestehendes Zeugnis öffnen

**Seite**: `/users` → User-Detail → Tab "Lebenszyklus" → Box "Dokumente"

**Ablauf**:
1. HR öffnet User-Detail
2. Tab "Lebenszyklus" → Box "Dokumente"
3. **Sektion**: "Arbeitszeugnis"
   - Liste zeigt: "Arbeitszeugnis vom 15.01.2025"
   - **Button**: "Bearbeiten" (blau) ← HR klickt hier

**Ergebnis**: Modal öffnet sich mit bestehenden Daten

---

### Schritt 2: Bearbeitungs-Modal öffnen

**Modal**: `CertificateEditModal.tsx` (NEU)

**Ablauf**:
1. Modal öffnet sich
2. **Hinweis**: "Sie erstellen eine neue Version des Arbeitszeugnisses"
3. **Tabs**: "Daten" und "Text bearbeiten"
4. Alle Felder sind mit bestehenden Daten vorausgefüllt
5. HR kann alle Felder bearbeiten
6. HR klickt "Neue Version speichern"
7. System:
   - Markiert altes Zeugnis: `isLatest = false`
   - Erstellt neues Zeugnis: `isLatest = true`
   - Speichert beide Versionen
8. **Notification** wird an Mitarbeiter gesendet: "Neue Version Ihres Arbeitszeugnisses verfügbar"

**Ergebnis**: Neue Version ist erstellt, Mitarbeiter sieht sie automatisch

---

## PROZESS 13: Arbeitsvertrag bearbeiten (HR) - NEUE VERSION

### Schritt 1-2: Identisch zu Prozess 12, aber für Arbeitsvertrag

**Ergebnis**: Neue Vertragsversion ist erstellt, Mitarbeiter sieht sie automatisch

---

## PROZESS 14: Automatische Generierung bei Offboarding

### Schritt 1: Offboarding starten

**Seite**: `/users` → User-Detail → Tab "Lebenszyklus"

**Ablauf**:
1. HR öffnet User-Detail
2. Tab "Lebenszyklus"
3. **Box**: "Offboarding"
4. **Button**: "Offboarding starten" (rot)
5. HR klickt auf Button
6. **Modal**: `OffboardingStartModal` öffnet sich
7. HR gibt Austrittsdatum ein
8. HR wählt Austrittsgrund (Kündigung, Vertragsende, etc.)
9. HR klickt "Offboarding starten"
10. System:
    - Setzt Status auf `offboarding`
    - Setzt `exitDate`
    - Erstellt Offboarding-Tasks
    - **Prüft**: `autoGenerateOnOffboarding === true`?
    - Falls ja: System generiert automatisch Arbeitszeugnis (ohne HR-Bearbeitung, da automatisch)

**Ergebnis**: Offboarding ist gestartet, Arbeitszeugnis ist automatisch generiert (falls aktiviert)

---

### Schritt 2: HR bearbeitet automatisch generiertes Zeugnis (optional)

**Ablauf**:
1. HR sieht: "Arbeitszeugnis automatisch generiert" (Notification)
2. HR öffnet User-Detail → Tab "Lebenszyklus"
3. **Box**: "Dokumente" → "Arbeitszeugnis"
4. **Status**: "Automatisch generiert" (gelber Badge)
5. **Button**: "Bearbeiten" (blau)
6. HR klickt "Bearbeiten"
7. Prozess 12 (Bearbeitung) wird ausgeführt
8. HR kann Text anpassen für spezielle Situation

**Ergebnis**: Arbeitszeugnis ist bearbeitet, neue Version ist verfügbar

---

## Rollen-Zuordnung und Berechtigungen

### Konfigurierbare Rollen

Die Rollen-Zuordnung wird in `Organization.settings.lifecycleRoles` gespeichert:

```typescript
lifecycleRoles: {
  adminRoleId: number;        // Admin-Rolle (hat alle Rechte)
  hrRoleId: number;          // HR-Rolle (kann Dokumente erstellen/bearbeiten)
  legalRoleId: number;       // Legal-Rolle (erhält Tasks für Sozialversicherungen)
  employeeRoleIds: number[]; // Mitarbeiter-Rollen (nur Ansicht)
}
```

### Standard-Zuordnung

**Bei Erstellung einer neuen Organisation**:
1. **Admin-Rolle**: Erste Rolle mit Name "Admin" oder "Administrator"
2. **HR-Rolle**: Gleiche wie Admin-Rolle (kann später getrennt werden)
3. **Legal-Rolle**: Rolle mit Name "Derecho" (falls vorhanden)
4. **Mitarbeiter-Rollen**: Alle anderen Rollen

**Bei Import/Migration**:
- System versucht automatisch, Rollen zuzuordnen
- Admin kann in Organisationseinstellungen anpassen

### Berechtigungen pro Rolle

#### Admin-Rolle
- ✅ Alle Rechte (wie HR + Legal + zusätzliche Admin-Funktionen)
- ✅ Kann Rollen-Konfiguration ändern
- ✅ Kann alle Dokumente erstellen/bearbeiten
- ✅ Kann alle Tasks sehen und verwalten

#### HR-Rolle
- ✅ Kann Arbeitszeugnisse erstellen/bearbeiten
- ✅ Kann Arbeitsverträge erstellen/bearbeiten
- ✅ Kann User-Details ansehen
- ✅ Kann Lebenszyklus-Status ändern
- ❌ Kann keine Sozialversicherungs-Tasks abschließen (nur Legal)

#### Legal-Rolle
- ✅ Erhält automatisch Tasks für Sozialversicherungen (ARL, EPS, Pension, Caja)
- ✅ Kann Email-Vorlagen generieren und versenden
- ✅ Kann Anmeldungen abschließen
- ✅ Kann Status aktualisieren
- ❌ Kann keine Arbeitszeugnisse/Arbeitsverträge erstellen (nur HR)

#### Mitarbeiter-Rolle
- ✅ Kann eigene Dokumente ansehen (Arbeitszeugnis, Arbeitsvertrag)
- ✅ Kann eigene Dokumente downloaden
- ✅ Kann eigenen Lebenszyklus-Status ansehen (Progress-Bar, Sozialversicherungen)
- ❌ Kann keine Dokumente erstellen/bearbeiten
- ❌ Kann keine Tasks sehen (außer eigene)

### Rollen-Prüfung in Prozessen

**System prüft Rollen bei**:
1. **Button-Sichtbarkeit**: Nur HR/Admin sieht "Arbeitszeugnis erstellen"
2. **Task-Zuweisung**: Legal-Rolle erhält automatisch Tasks für Sozialversicherungen
3. **API-Endpoints**: Backend prüft Rollen vor jeder Aktion
4. **Frontend-Komponenten**: Buttons/Modals werden basierend auf Rolle angezeigt/versteckt

---

## Zusammenfassung der Änderungen

### Arbeitszeugnis/Arbeitsvertrag - Neuer Workflow

**Vorher** (falsch):
- Mitarbeiter kann selbst generieren
- Keine Bearbeitungsmöglichkeit

**Jetzt** (richtig):
- ✅ **HR erstellt** Arbeitszeugnis/Arbeitsvertrag
- ✅ **HR kann Text bearbeiten** (für spezielle Situationen)
- ✅ **Mitarbeiter sieht es automatisch** nach Erstellung
- ✅ **Mitarbeiter kann nur ansehen/downloaden**, nicht generieren
- ✅ **HR kann neue Versionen erstellen** (z.B. bei Änderungen)

### Sozialversicherungen - Vollständiger Prozess

- ✅ **ARL**: Task → Email-Vorlage → Versand → Abschluss → Status-Update
- ✅ **EPS**: Status-Prüfung → Task (falls erforderlich) → Anmeldung
- ✅ **Pension**: Task → Email-Vorlage → Versand → Abschluss → Status-Update
- ✅ **Caja**: Task → Email-Vorlage → Versand → Abschluss → Status-Update
- ✅ **Progress-Bar**: Zeigt Fortschritt aller Sozialversicherungen
- ✅ **Mitarbeiter-Ansicht**: Sieht Status, kann aber nicht selbst anmelden

---

## UI-Komponenten-Übersicht (Aktualisiert)

### Neue Komponenten für Dokumenten-Konfiguration

1. **`DocumentConfigurationTab.tsx`**
   - Tab in `EditOrganizationModal`
   - Enthält alle Konfigurations-Boxen für Templates und Signaturen

2. **`TemplateUploadBox.tsx`**
   - Box für Template-Upload
   - Zeigt Status und Upload-Button

3. **`SignatureUploadModal.tsx`**
   - Modal für Signatur-Upload
   - Enthält File-Upload und Position-Konfiguration

### Neue Komponenten für HR (Dokumenten-Erstellung mit Bearbeitung)

4. **`CertificateCreationModal.tsx`** (NEU - für HR)
   - Modal für Arbeitszeugnis-Erstellung durch HR
   - Tabs: "Daten" und "Text bearbeiten"
   - PDF-Vorschau mit Text-Bearbeitung

5. **`ContractCreationModal.tsx`** (NEU - für HR)
   - Modal für Arbeitsvertrag-Erstellung durch HR
   - Tabs: "Vertragsdaten" und "Text bearbeiten"
   - PDF-Vorschau mit Text-Bearbeitung

6. **`CertificateEditModal.tsx`** (NEU - für HR)
   - Modal für Arbeitszeugnis-Bearbeitung (neue Version)
   - Gleiche Funktionalität wie CreationModal, aber mit bestehenden Daten

7. **`ContractEditModal.tsx`** (NEU - für HR)
   - Modal für Arbeitsvertrag-Bearbeitung (neue Version)
   - Gleiche Funktionalität wie CreationModal, aber mit bestehenden Daten

### Neue Komponenten für Mitarbeiter (Nur Ansicht)

8. **`DocumentList.tsx`**
   - Liste aller Dokumente (Zeugnisse + Verträge)
   - Zeigt Download-Links und Status
   - Nur Ansicht, keine Generierung

### Neue Komponenten für Lebenszyklus

9. **`LifecycleView.tsx`** (NEU)
   - Hauptkomponente für Lebenszyklus-Ansicht
   - Zeigt Progress-Bar, Sozialversicherungen, Dokumente

10. **`LifecycleDocumentsTab.tsx`**
    - Tab in User-Detail-Ansicht
    - Zeigt Lebenszyklus-Dokumente

11. **`SocialSecurityStatusBox.tsx`** (NEU)
    - Box für Sozialversicherungs-Status
    - Zeigt ARL, EPS, Pension, Caja mit Status-Badges

12. **`OnboardingProgressBar.tsx`** (NEU)
    - Progress-Bar für Onboarding-Status
    - Zeigt Fortschritt aller Schritte

### Neue Komponenten für Tasks (Sozialversicherungen)

13. **`TaskDataBox.tsx`** (NEU)
    - Box in Task-Detail
    - Zeigt automatisch generierte Daten für Sozialversicherungen

14. **`EmailTemplateBox.tsx`** (NEU)
    - Box in Task-Detail
    - Zeigt Email-Vorlage für Sozialversicherungen
    - Button zum Kopieren/Versenden

15. **`SocialSecurityCompletionBox.tsx`** (NEU)
    - Box in Task-Detail
    - Formular zum Abschließen der Anmeldung
    - Eingabe von Registrierungsnummer, Provider, etc.

### Erweiterte Komponenten

1. **`Profile.tsx`**
   - Neuer Tab: "Meine Dokumente" (nur Ansicht)
   - Neuer Tab: "Lebenszyklus" (Progress-Bar, Sozialversicherungen)
   - Boxen für Arbeitszeugnis und Arbeitsvertrag (nur Download)

2. **`OrganizationSettings.tsx`**
   - Keine Änderung (bestehend)

3. **`EditOrganizationModal.tsx`**
   - Neuer Tab: "Dokumenten-Konfiguration"

4. **`UserManagementTab.tsx`**
   - User-Detail erweitert um "Lebenszyklus"-Tab

5. **`Tasks.tsx`** (bestehend)
   - Erweitert um automatisch generierte Daten in Task-Detail
   - Erweitert um Email-Vorlage-Box
   - Erweitert um Abschluss-Formular

### Neue Komponenten für Rollen-Konfiguration

16. **`RoleConfigurationTab.tsx`** (NEU)
    - Tab in `EditOrganizationModal`
    - Enthält Rollen-Zuordnung für Lebenszyklus-Prozesse

17. **`RoleSelector.tsx`** (NEU)
    - Dropdown/Multi-Select für Rollen-Auswahl
    - Zeigt alle Rollen der Organisation

18. **`StandardRoleAssignmentButton.tsx`** (NEU)
    - Button zum Anwenden der Standard-Zuordnung
    - Zeigt Vorschau der Standard-Zuordnung

---

**Ende der erweiterten Prozessbeschreibung**

