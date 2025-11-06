# Notification-System

Dieses Dokument beschreibt das Notification-System des Intranet-Projekts, das für die Benachrichtigung von Benutzern über verschiedene Ereignisse im System verantwortlich ist.

## Überblick

Das System verwendet die zentrale Funktion `createNotificationIfEnabled` für alle Benachrichtigungen. Diese Funktion berücksichtigt die Benutzer- und Systemeinstellungen und sendet Benachrichtigungen nur, wenn sie aktiviert sind.

## Implementierte Notification-Trigger

### 1. Task-Trigger

- **taskCreate**: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein neuer Task erstellt wird
- **taskUpdate**: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein Task aktualisiert wird
- **taskDelete**: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein Task gelöscht wird
- **taskStatusChange**: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn sich der Status eines Tasks ändert

### 2. Request-Trigger

- **requestCreate**: Benachrichtigt den Verantwortlichen, wenn ein neuer Request erstellt wird
- **requestUpdate**: Benachrichtigt den Verantwortlichen und den Ersteller, wenn ein Request aktualisiert wird
- **requestDelete**: Benachrichtigt den Verantwortlichen und den Ersteller, wenn ein Request gelöscht wird
- **requestStatusChange**: Benachrichtigt den Ersteller, wenn sich der Status eines Requests ändert, mit spezifischen Nachrichten für verschiedene Status (approved, denied, to_improve)

### 3. User-Trigger

- **userCreate**: Benachrichtigt Administratoren, wenn ein neuer Benutzer erstellt wird
- **userUpdate**: Benachrichtigt den aktualisierten Benutzer und Administratoren, wenn ein Benutzer aktualisiert wird
- **userDelete**: Benachrichtigt Administratoren, wenn ein Benutzer gelöscht wird

### 4. Role-Trigger

- **roleCreate**: Benachrichtigt Administratoren, wenn eine neue Rolle erstellt wird
- **roleUpdate**: Benachrichtigt Administratoren und Benutzer mit dieser Rolle, wenn eine Rolle aktualisiert wird
- **roleDelete**: Benachrichtigt Administratoren und Benutzer mit dieser Rolle, wenn eine Rolle gelöscht wird

### 5. Worktime-Trigger

- **worktimeStart**: Benachrichtigt den Benutzer, wenn die Zeiterfassung gestartet wird (`relatedEntityType: 'start'`)
- **worktimeStop**: Benachrichtigt den Benutzer, wenn die Zeiterfassung beendet wird (`relatedEntityType: 'stop'`)
- **worktimeAutoStop**: Benachrichtigt den Benutzer, wenn die Zeiterfassung automatisch beendet wurde (`relatedEntityType: 'auto_stop'`)

## Implementierungsdetails

Die Benachrichtigungen werden im Backend erzeugt und im Frontend über das `NotificationContext` verwaltet. 

### Backend-Implementierung

Die Funktion `createNotificationIfEnabled` überprüft:
1. Ob Benachrichtigungen für den Benutzer aktiviert sind
2. Ob der spezifische Benachrichtigungstyp aktiviert ist
3. Ob der Benutzer die Berechtigung hat, diese Benachrichtigung zu erhalten

**Wichtig:** Beim Aufruf von `createNotificationIfEnabled` müssen folgende Parameter verwendet werden:
- `relatedEntityId`: Die ID der zugehörigen Entity (Task, Request, WorkTime, etc.)
- `relatedEntityType`: Der Typ der Aktion (`'create'`, `'update'`, `'delete'`, `'status'`, `'start'`, `'stop'`, `'auto_stop'`)

**NICHT verwenden:** `targetId` und `targetType` - diese Parameter werden nicht verwendet und führen dazu, dass Notifications ohne korrekte Metadaten gespeichert werden!

### Parameter-Mapping

- **Task-Notifications**: `relatedEntityType` kann sein: `'create'`, `'update'`, `'delete'`, `'status'`
- **Request-Notifications**: `relatedEntityType` kann sein: `'create'`, `'update'`, `'delete'`, `'status'`
- **Worktime-Notifications**: `relatedEntityType` kann sein: `'start'`, `'stop'`, `'auto_stop'`

### Bekannte Probleme und Lösungen

**Problem 1 (behoben):** Request-Notifications verwendeten `targetId`/`targetType` statt `relatedEntityId`/`relatedEntityType`. Dies führte dazu, dass Notifications ohne korrekte Metadaten gespeichert wurden.

**Problem 2 (behoben):** Worktime-Notifications verwendeten `'worktime_start'`/`'worktime_stop'` statt `'start'`/`'stop'`. Dies führte dazu, dass die Prüfung in `isNotificationEnabled` nicht korrekt funktionierte.

**Problem 3 (behoben - HAUPTPROBLEM):** Die Funktion `isNotificationEnabled` prüfte für Task- und Request-Notifications alle Settings mit OR-Verknüpfung, anstatt die spezifische Aktion basierend auf `relatedEntityType` zu prüfen. Dies führte dazu, dass:
- Wenn IRGENDEINE Setting aktiviert war, wurden ALLE Notifications erlaubt
- Die spezifische Prüfung für `create`, `update`, `delete`, `status` wurde nicht durchgeführt

**Lösung:** 
1. Alle Notification-Aufrufe wurden korrigiert, um die korrekten Parameter zu verwenden
2. Die Logik in `isNotificationEnabled` wurde angepasst, um die spezifische Aktion basierend auf `relatedEntityType` zu prüfen (wie bereits bei Worktime-Notifications implementiert)
3. Alle Notification-Typen verwenden jetzt konsistent die gleiche Prüfungslogik mit Fallback auf `true` als Default

### Frontend-Darstellung

Die Benachrichtigungen werden in der `NotificationList`-Komponente angezeigt, die über das Glocken-Symbol in der Navigationsleiste zugänglich ist.

## Integration

Das Notification-System ist in alle relevanten Controller integriert und wird bei allen wichtigen Aktionen im System automatisch ausgelöst. 