# To-Do Dokumentation - Mitarbeiterlebenszyklus

## Übersicht

Dieses Dokument beschreibt die automatisch erstellten To-Dos (Tasks) beim Onboarding neuer Mitarbeiter.

## Erstellte To-Dos

Beim Erstellen eines neuen Mitarbeiters werden automatisch **4 To-Dos** für die Sozialversicherungen erstellt:

### 1. ARL-Anmeldung durchführen
- **Name**: "ARL-Anmeldung durchführen"
- **Beschreibung**: "ARL-Anmeldung für [Vorname] [Nachname] durchführen. Erforderliche Daten werden automatisch generiert."
- **Typ**: `arl`

### 2. EPS-Anmeldung prüfen/ durchführen
- **Name**: "EPS-Anmeldung prüfen/ durchführen"
- **Beschreibung**: "EPS-Anmeldung für [Vorname] [Nachname] prüfen. Falls erforderlich, Anmeldung durchführen."
- **Typ**: `eps`

### 3. Pension-Anmeldung durchführen
- **Name**: "Pension-Anmeldung durchführen"
- **Beschreibung**: "Pension-Anmeldung für [Vorname] [Nachname] durchführen. Erforderliche Daten werden automatisch generiert."
- **Typ**: `pension`

### 4. Caja-Anmeldung durchführen
- **Name**: "Caja-Anmeldung durchführen"
- **Beschreibung**: "Caja-Anmeldung für [Vorname] [Nachname] durchführen. Erforderliche Daten werden automatisch generiert."
- **Typ**: `caja`

## Parameter der To-Dos

Jeder To-Do hat folgende Parameter:

### Basis-Parameter

| Parameter | Typ | Beschreibung | Standardwert |
|-----------|-----|--------------|--------------|
| `title` | string | Titel des To-Dos | Siehe oben |
| `description` | string | Beschreibung des To-Dos | Siehe oben |
| `status` | enum | Status des To-Dos | `'open'` |
| `roleId` | number \| null | ID der Legal-Rolle (z.B. "Derecho") | Legal-Rolle aus Konfiguration |
| `qualityControlId` | number \| null | ID des Admin-Users für QC | Erster Admin-User der Organisation |
| `responsibleId` | number \| null | ID des verantwortlichen Users | `null` (nicht gesetzt) |
| `branchId` | number | ID der Niederlassung | Erste Niederlassung des neuen Mitarbeiters |
| `organizationId` | number | ID der Organisation | Organisation des neuen Mitarbeiters |
| `dueDate` | Date \| null | Fälligkeitsdatum | 7 Tage nach Erstellung |

### Automatisch generierte Daten

In der Task-Beschreibung werden automatisch folgende Daten generiert und als JSON eingefügt:

```json
{
  "userName": "[Vorname] [Nachname]",
  "userEmail": "[E-Mail]",
  "identificationNumber": "[Ausweisnummer]",
  "organizationName": "[Organisationsname]",
  "currentDate": "[Aktuelles Datum]",
  "startDate": "[Startdatum]",
  "endDate": "[Enddatum]",
  "position": "[Position]",
  "salary": "[Gehalt]",
  "workingHours": "[Arbeitsstunden]"
}
```

### Anmeldung abschließen

Für jeden To-Do können folgende zusätzliche Parameter ausgefüllt werden:

| Parameter | Typ | Beschreibung | Erforderlich |
|-----------|-----|--------------|--------------|
| `registrationNumber` | string | Registrierungsnummer (z.B. 123456789) | Ja |
| `provider` | string | Anbieter (z.B. "ARL Sura", "EPS Sanitas") | Ja |
| `registrationDate` | Date | Registrierungsdatum | Ja |

## Rollen und Berechtigungen

### Legal-Rolle (z.B. "Derecho")
- **Zuständig**: Die Legal-Rolle ist für die Bearbeitung der To-Dos zuständig
- **Sichtbarkeit**: Alle User mit der Legal-Rolle sehen die To-Dos in ihrer Task-Liste
- **Filter**: To-Dos werden nach `roleId` gefiltert

### Admin-Rolle
- **Quality Control**: Ein Admin-User wird automatisch als `qualityControlId` zugewiesen
- **Sichtbarkeit**: Admin-User sehen die To-Dos als QC-Aufgaben
- **Filter**: To-Dos werden nach `qualityControlId` gefiltert

## Erstellungslogik

### Voraussetzungen

1. **Legal-Rolle konfiguriert**: Die Legal-Rolle muss in den Organisationseinstellungen konfiguriert sein
   - Pfad: Organisation → Einstellungen → Rollen-Konfiguration → Legal-Rolle
   - Fallback: Wenn nicht konfiguriert, wird nach einer Rolle mit "Derecho" im Namen gesucht

2. **Admin-Rolle vorhanden**: Mindestens ein Admin-User muss in der Organisation existieren
   - Wird automatisch als `qualityControlId` zugewiesen
   - Fallback: Erster Admin-User mit aktiver Admin-Rolle

3. **Niederlassung zugewiesen**: Der neue Mitarbeiter muss einer Niederlassung zugewiesen sein
   - Die erste Niederlassung des Mitarbeiters wird verwendet

### Erstellungszeitpunkt

Die To-Dos werden automatisch erstellt, wenn:
- Ein neuer Mitarbeiter erstellt wird (über Admin-Bereich)
- Der Lebenszyklus für den Mitarbeiter erstellt wird
- Der Status "Onboarding" gestartet wird

### Fehlerbehandlung

- Wenn keine Legal-Rolle gefunden wird: **Keine To-Dos werden erstellt** (Warnung im Log)
- Wenn keine Niederlassung zugewiesen ist: **Fehler wird geworfen** (Task-Erstellung schlägt fehl)
- Wenn kein Admin-User gefunden wird: **To-Do wird ohne QC erstellt** (Warnung im Log)

## Benachrichtigungen

Bei der Erstellung eines To-Dos werden automatisch Benachrichtigungen erstellt:

- **Für Legal-User**: Alle User mit der Legal-Rolle (als aktive Rolle) erhalten eine Benachrichtigung
- **Titel**: "Neuer Onboarding-Task"
- **Nachricht**: "Ein neuer Task wurde zugewiesen: [Titel des To-Dos]"
- **Typ**: `task`
- **Aktion**: Klick auf Benachrichtigung öffnet den To-Do

## Lifecycle-Events

Für jeden erstellten To-Do wird ein Lifecycle-Event erstellt:

- **Event-Typ**: `task_created_[typ]` (z.B. `task_created_arl`)
- **Event-Daten**:
  ```json
  {
    "taskId": 123,
    "taskTitle": "ARL-Anmeldung durchführen",
    "taskType": "arl"
  }
  ```

## Technische Details

### Backend-Service

- **Datei**: `backend/src/services/taskAutomationService.ts`
- **Methode**: `createOnboardingTasks(userId: number, organizationId: number)`
- **Aufruf**: Automatisch von `LifecycleService.createLifecycle()`

### Frontend-Komponenten

- **Task-Edit-Modal**: `frontend/src/components/EditTaskModal.tsx`
- **Task-Data-Box**: `frontend/src/components/TaskDataBox.tsx` (zeigt automatisch generierte Daten)
- **Email-Template-Box**: `frontend/src/components/EmailTemplateBox.tsx` (zeigt E-Mail-Vorlage)
- **Social-Security-Completion-Box**: `frontend/src/components/SocialSecurityCompletionBox.tsx` (Anmeldung abschließen)

## Übersetzungen

Alle Texte sind übersetzt in:
- Deutsch (`de.json`)
- Spanisch (`es.json`)
- Englisch (`en.json`)

Wichtige Übersetzungsschlüssel:
- `lifecycle.autoGeneratedData`: "Automatisch generierte Daten"
- `lifecycle.taskType`: "Aufgabentyp / To-Do Name"
- `lifecycle.completeRegistration`: "Anmeldung abschließen"
- `lifecycle.registrationNumber`: "Registrierungsnummer"
- `lifecycle.provider`: "Anbieter"
- `lifecycle.registrationDate`: "Registrierungsdatum"

## Änderungshistorie

### 2025-01-XX - Admin als QC hinzugefügt
- Admin-User wird automatisch als `qualityControlId` zugewiesen
- Admin-User kann To-Dos als QC sehen und bearbeiten

### 2025-01-XX - Fehlende Übersetzungen hinzugefügt
- Alle fehlenden Übersetzungsschlüssel für Task-UI hinzugefügt
- Deutsch, Spanisch und Englisch vollständig

### 2025-01-XX - HR-Rolle speichern Problem behoben
- Korrekte Behandlung von leeren Strings in Select-Feldern
- `parseInt` mit Validierung für alle Rollen-Selects

