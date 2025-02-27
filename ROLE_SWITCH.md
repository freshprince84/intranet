# Rollenauswahl-Funktionalität

Diese Dokumentation beschreibt die Implementierung der Rollenauswahl-Funktionalität im Intranet.

## Überblick

Die Rollenauswahl-Funktionalität ermöglicht es Benutzern, zwischen ihren zugewiesenen Rollen zu wechseln. Diese Funktion ist als Untermenü im Profilmenü der Topbar verfügbar und bietet folgenden Nutzen:

1. Schnelle Umschaltung zwischen verschiedenen Berechtigungsstufen
2. Klare Anzeige der aktuell aktiven Rolle
3. Konsistente Benutzeroberfläche mit anderen Menüoptionen
4. Intuitive Integration in das bestehende Benutzermenü

## Backend-Implementierung

### Datenmodell

Die Funktionalität nutzt das bestehende Datenmodell:

- `User`: Benutzer der Anwendung
- `Role`: Definierte Rollen mit Berechtigungen
- `UserRole`: Verknüpfung zwischen Benutzern und Rollen
  - Enthält das Feld `lastUsed` (Boolean), das angibt, welche Rolle aktiv ist

### API-Endpunkte

#### `PUT /api/users/switch-role`

Dieser Endpunkt wechselt die aktive Rolle eines Benutzers.

**Request-Parameter:**
```json
{
  "roleId": 2
}
```

**Response:**
```json
{
  "id": 1,
  "username": "benutzer",
  "firstName": "Max",
  "lastName": "Mustermann",
  "email": "max@beispiel.de",
  "roles": [
    {
      "role": {
        "id": 1,
        "name": "Administrator",
        "permissions": [...]
      },
      "lastUsed": false
    },
    {
      "role": {
        "id": 2,
        "name": "Mitarbeiter",
        "permissions": [...]
      },
      "lastUsed": true
    }
  ],
  "settings": {...}
}
```

## Frontend-Implementierung

### Komponenten

1. **Header.tsx**
   - Integriert die Rollenauswahl als Untermenü im Profilmenü
   - Zeigt die aktuelle Rolle des Benutzers im Menüpunkt an
   - Ermöglicht das Wechseln zwischen verfügbaren Rollen

2. **useAuth.tsx**
   - Erweitert um die `switchRole`-Funktion
   - Aktualisiert den Benutzerkontext nach dem Rollenwechsel

### Benutzeroberfläche

Die Rollenauswahl ist als Untermenü im Profilmenü implementiert:

1. Der Benutzer klickt auf sein Profilbild/Namen in der Topbar
2. Im geöffneten Profilmenü sieht er die Option "Aktive Rolle: [Rollenname]"
3. Beim Klick auf diese Option öffnet sich ein Untermenü rechts daneben
4. In diesem Untermenü werden alle verfügbaren Rollen angezeigt
5. Die aktuelle Rolle ist farblich hervorgehoben

## Beispiel-Nutzung

1. Benutzer klickt auf sein Profilbild/Namen in der Topbar
2. Profilmenü öffnet sich mit Optionen wie "Profil", "Einstellungen" und "Aktive Rolle: [Rollenname]"
3. Klick auf "Aktive Rolle" öffnet das Rollen-Untermenü
4. Benutzer wählt eine andere Rolle aus dem Untermenü
5. Das Backend aktualisiert die `lastUsed`-Eigenschaft
6. Die Benutzeroberfläche schließt die Menüs und aktualisiert die Anzeige

## Fehlerbehandlung

- Wenn der Benutzer versucht, eine Rolle auszuwählen, die ihm nicht zugewiesen ist, wird eine Fehlermeldung angezeigt.
- Bei Netzwerkfehlern wird der Rollenwechsel nicht durchgeführt und eine entsprechende Nachricht im Frontend angezeigt.
- Die Rollenauswahl-Option wird nur angezeigt, wenn der Benutzer mehr als eine Rolle hat. 