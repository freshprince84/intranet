# Datenbank-Schema

Dieses Dokument beschreibt die Struktur der Datenbank für das Worktracker-Projekt. Der ausführbare SQL-Code befindet sich in `database/schema.sql`.

## Übersicht der Tabellen

- **`users`**: Speichert Benutzerdaten (Name, Geburtstag, ID, Bank, Vertrag, Gehalt, etc.).
- **`roles`**: Definiert Rollen (z. B. Admin, Cleaning, Reception).
- **`users_roles`**: Verknüpft Benutzer mit Rollen (viele-zu-viele), mit einem Flag `last_used` für die zuletzt verwendete Rolle.
- **`branches`**: Speichert Niederlassungen (z. B. Manila, Parque Poblado).
- **`users_branches`**: Verknüpft Benutzer mit Niederlassungen (viele-zu-viele).
- **`work_times`**: Zeichnet Arbeitszeiten eines Benutzers auf.
- **`tasks`**: Verwaltet Aufgaben mit Status: `open`, `in_progress`, `improval`, `quality_control`, `done`. Beinhaltet Verantwortlichen, Qualitätskontrolle, Niederlassung und Fälligkeit.
- **`requests`**: Verwaltet Anfragen mit Status: `approval`, `approved`, `to_improve`, `denied`. Beinhaltet Anfragenden, Verantwortlichen, Niederlassung, Fälligkeit und Option für To-Do-Erstellung.
- **`settings`**: Speichert benutzerspezifische Einstellungen (z. B. Firmenlogo).
- **`permissions`**: Definiert Berechtigungen pro Rolle und Seite (Lesen, Schreiben, Beides, Nichts).

## Status-Logik
- **Tasks**: 
  - `improval` wird gesetzt, wenn eine Aufgabe von `quality_control` zurückgewiesen wird.
- **Requests**: 
  - `to_improve` wird gesetzt, wenn eine Anfrage von `approval` zurückgewiesen wird.

## Rolle und Berechtigungen
- Ein Benutzer erhält bei der Anmeldung die zuletzt verwendete Rolle (Feld `last_used` in `users_roles`). Falls keine Daten vorhanden sind, wird die Rolle mit der höchsten ID verwendet.
- `permissions` steuert Berechtigungen pro Rolle und Seite (z. B. Dashboard, Worktracker, Reports, Settings) mit Werten: `read`, `write`, `both`, `none`.

## Beziehungen
- `users` → `users_roles` → `roles`: Viele-zu-viele-Beziehung.
- `users` → `users_branches` → `branches`: Viele-zu-viele-Beziehung.
- `tasks` und `requests` verlinken auf `users` (für Verantwortliche, Anfragende, etc.) und `branches`.

## Implementierung
Siehe `database/schema.sql` für den vollständigen SQL-Code und `database/seed.sql` für Beispieldaten.
