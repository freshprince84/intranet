# Datenbank-Schema

Dieses Dokument beschreibt die Struktur der Datenbank für das Worktracker-Projekt. Der ausführbare SQL-Code befindet sich in `database/schema.sql`.

## Übersicht der Tabellen

- **`users`**: Speichert Benutzerdaten (ID, Username, Email, Passwort).
- **`roles`**: Definiert Rollen (z. B. Admin, User).
- **`users_roles`**: Verknüpft Benutzer mit Rollen (viele-zu-viele).
- **`work_times`**: Zeichnet Arbeitszeiten eines Benutzers auf.
- **`tasks`**: Verwaltet Aufgaben mit Status: `open`, `in_progress`, `improval`, `quality_control`, `done`.
- **`requests`**: Verwaltet Anfragen mit Status: `approval`, `approved`, `to_improve`, `denied`.
- **`settings`**: Speichert benutzerspezifische Einstellungen (z. B. Firmenlogo).

## Status-Logik
- **Tasks**: 
  - `improval` wird gesetzt, wenn eine Aufgabe von `quality_control` zurückgewiesen wird.
- **Requests**: 
  - `to_improve` wird gesetzt, wenn eine Anfrage von `approval` zurückgewiesen wird.

## Implementierung
Siehe `database/schema.sql` für den vollständigen SQL-Code und `database/seed.sql` für Beispieldaten.
