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

- **worktimeStart**: Benachrichtigt den Benutzer, wenn die Zeiterfassung gestartet wird
- **worktimeStop**: Benachrichtigt den Benutzer, wenn die Zeiterfassung beendet wird

## Implementierungsdetails

Die Benachrichtigungen werden im Backend erzeugt und im Frontend über das `NotificationContext` verwaltet. 

### Backend-Implementierung

Die Funktion `createNotificationIfEnabled` überprüft:
1. Ob Benachrichtigungen für den Benutzer aktiviert sind
2. Ob der spezifische Benachrichtigungstyp aktiviert ist
3. Ob der Benutzer die Berechtigung hat, diese Benachrichtigung zu erhalten

### Frontend-Darstellung

Die Benachrichtigungen werden in der `NotificationList`-Komponente angezeigt, die über das Glocken-Symbol in der Navigationsleiste zugänglich ist.

## Integration

Das Notification-System ist in alle relevanten Controller integriert und wird bei allen wichtigen Aktionen im System automatisch ausgelöst. 