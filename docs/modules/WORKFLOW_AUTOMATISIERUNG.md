# Workflow-Automatisierung im Intranet

## KERNANWEISUNGEN - DIESE MÜSSEN BEACHTET WERDEN

1. JEDE Task-Beschreibung ist eine KONKRETE Arbeitsanweisung. Die Beschreibung MUSS vollständig umgesetzt werden.
2. Status-Änderungen OHNE Umsetzung der Task-Beschreibung sind NICHT erlaubt.
3. Bei jeder Task MUSS zuerst die Beschreibung gelesen und verstanden werden.
4. Die Umsetzung MUSS der Task-Beschreibung exakt entsprechen.
5. Nach der Umsetzung MUSS die Task-Beschreibung aktualisiert werden mit einer Notiz über die durchgeführten Änderungen.

## Workflow-Ablauf

1. Anmeldung im System
2. Zeiterfassung starten/prüfen
3. Tasks in dieser Reihenfolge bearbeiten:
   - Zuerst "in_progress" Tasks
   - Dann "improval" Tasks
   - Zuletzt "open" Tasks
4. Zeiterfassung stoppen

## Anmeldeprozess

### Anmeldedaten
- Server: http://localhost:5000
- Benutzername: cursor
- Passwort: Cursor123!

### Anmeldevorgang
1. Anmeldung am System über die API:

```
curl -X POST "http://localhost:5000/api/auth/login" -H "Content-Type: application/json" -d '{"username": "cursor", "password": "Cursor123!"}'
```

2. Speicherung des erhaltenen Auth-Tokens für nachfolgende Anfragen

Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGVJZCI6OTk5LCJpYXQiOjE3NDIyNzY5NjMsImV4cCI6MTc0MjM2MzM2M30.u0vnSt6iWQlGYHDU1-p5ekUWLxnT3yDuapAKfq5TYh8

## Zeiterfassung

### Prüfung auf aktive Zeiterfassung
1. Abrufen aller aktiven Zeiterfassungen für den angemeldeten Benutzer

```
curl -X GET "http://localhost:5000/api/worktime/active" -H "Authorization: Bearer [TOKEN]"
```

2. Wenn eine aktive Zeiterfassung gefunden wird, diese weiterverwenden
3. Wenn keine aktive Zeiterfassung gefunden wird, eine neue starten

### Starten einer neuen Zeiterfassung
1. Neue Zeiterfassung über die API starten:

```
curl -X POST "http://localhost:5000/api/worktime/start" -H "Content-Type: application/json" -H "Authorization: Bearer [TOKEN]" -d '{"branchId": 1}'
```

## Task-Verarbeitung

### Prioritätsreihenfolge
Die Tasks werden in folgender Reihenfolge bearbeitet:

1. Zuerst Tasks mit Status "in_progress"
2. Dann Tasks mit Status "improval" (ohne Statusänderung)
3. Zuletzt Tasks mit Status "open"

Innerhalb jedes Status werden die Tasks nach Fälligkeitsdatum sortiert und bearbeitet.

### Verarbeitung von "in_progress" Tasks
1. Abrufen aller Tasks mit Status "in_progress":

```
curl -X GET "http://localhost:5000/api/tasks?status=in_progress" -H "Authorization: Bearer [TOKEN]"
```

2. Für JEDEN Task:
   - Beschreibung LESEN und VERSTEHEN
   - Beschriebene Aufgabe UMSETZEN
   - Nach erfolgreicher Umsetzung: Notiz zur Beschreibung hinzufügen (MAX. 120 Zeichen!)
   - Status auf "quality_control" setzen

### Verarbeitung von "improval" Tasks
1. Abrufen aller Tasks mit Status "improval":

```
curl -X GET "http://localhost:5000/api/tasks?status=improval" -H "Authorization: Bearer [TOKEN]"
```

2. Für JEDEN Task:
   - Beschreibung LESEN und VERSTEHEN
   - Beschriebene Aufgabe UMSETZEN
   - Nach erfolgreicher Umsetzung: Notiz mit Präfix "Nachbesserung: " hinzufügen (MAX. 120 Zeichen!)
   - Status auf "quality_control" setzen

### Verarbeitung von "open" Tasks
1. Abrufen aller Tasks mit Status "open":

```
curl -X GET "http://localhost:5000/api/tasks?status=open" -H "Authorization: Bearer [TOKEN]"
```

2. Für JEDEN Task:
   - Status auf "in_progress" setzen
   - Beschreibung LESEN und VERSTEHEN
   - Beschriebene Aufgabe UMSETZEN
   - Nach erfolgreicher Umsetzung: Notiz zur Beschreibung hinzufügen (MAX. 120 Zeichen!)
   - Status auf "quality_control" setzen

## Zeiterfassung stoppen

Nach Abschluss aller Task-Bearbeitungen:

```
curl -X POST "http://localhost:5000/api/worktime/stop" -H "Authorization: Bearer [TOKEN]"
```

## Fehlerbehandlung

Der KI-Assistent soll Fehler während des Prozesses wie folgt behandeln:

- **Anmeldungsfehler**: Bei Problemen bei der Anmeldung wird der Workflow abgebrochen und ein Hinweis ausgegeben.
- **Zeiterfassungsfehler**: Fehler beim Starten oder Stoppen der Zeiterfassung werden protokolliert.
- **Task-Abruf-Fehler**: Fehler beim Abrufen von Tasks werden protokolliert, der Workflow wird fortgesetzt.
- **Status-Aktualisierungsfehler**: Fehler beim Aktualisieren des Task-Status werden protokolliert.

Bei schwerwiegenden Fehlern soll der Assistent versuchen, die Zeiterfassung zu stoppen, bevor der Prozess beendet wird. 