# Anleitung: Filter-Migration ausführen

## Übersicht

Das Migration-Script `backend/prisma/migrate-filters.ts` aktualisiert bestehende Filter in der Datenbank:

1. **Löscht** "Alle"/"Todos" Filter für `requests-table`
2. **Erweitert** User-Filter für `requests-table` mit Status-Bedingungen (`status != 'approved' AND status != 'denied'`)
3. **Erweitert** User-Filter für `worktracker-todos` mit Status-Bedingungen (`status != 'done'`)

## Ausführung

### Option 1: Mit npm Script (empfohlen)

```bash
cd backend
npm run migrate-filters
```

### Option 2: Direkt mit ts-node

```bash
cd backend
npx ts-node prisma/migrate-filters.ts
```

## Was das Script macht

### Schritt 1: Löschen von "Alle"/"Todos" Filtern
- Sucht alle Filter mit Namen: `'Alle'`, `'Todos'`, `'All'`, `'Alles'`
- Für Tabelle: `requests-table`
- Löscht diese Filter aus der Datenbank

### Schritt 2: Erweitern von Requests-User-Filtern
- Findet alle User-Filter für `requests-table` (in "Users"/"Benutzer"/"Usuarios" Gruppen)
- Prüft ob Status-Bedingungen bereits vorhanden sind
- Fügt hinzu (falls nicht vorhanden):
  - `status != 'approved'`
  - `status != 'denied'`
- Aktualisiert Operatoren entsprechend

### Schritt 3: Erweitern von ToDos-User-Filtern
- Findet alle User-Filter für `worktracker-todos` (in "Users"/"Benutzer"/"Usuarios" Gruppen)
- Prüft ob Status-Bedingung bereits vorhanden ist
- Fügt hinzu (falls nicht vorhanden):
  - `status != 'done'`
- Aktualisiert Operatoren entsprechend

## Sicherheit

- **Idempotent:** Script kann mehrfach ausgeführt werden
- **Prüft vor Update:** Nur Filter ohne Status-Bedingungen werden aktualisiert
- **Logging:** Detaillierte Ausgabe über alle Änderungen
- **Fehlerbehandlung:** Einzelne Fehler stoppen nicht das gesamte Script

## Beispiel-Output

```
🚀 Starte Filter-Migration...

📋 Schritt 1: Lösche "Alle"/"Todos" Filter für requests-table...
   ✅ 2 Filter gelöscht

📋 Schritt 2: Erweitere User-Filter für requests-table...
   ✅ Filter "John Doe" aktualisiert
   ✅ Filter "Jane Smith" aktualisiert
   ⏭️  Filter "Bob Wilson" bereits aktualisiert (Status-Bedingungen vorhanden)
   ✅ 2 Filter aktualisiert

📋 Schritt 3: Erweitere User-Filter für worktracker-todos...
   ✅ Filter "John Doe" aktualisiert
   ✅ Filter "Jane Smith" aktualisiert
   ✅ 2 Filter aktualisiert

✅ Filter-Migration erfolgreich abgeschlossen!

Zusammenfassung:
- 2 "Alle"/"Todos" Filter gelöscht
- 2 Requests-User-Filter aktualisiert
- 2 ToDos-User-Filter aktualisiert
```

## Wann ausführen?

- **Nach Deployment** der Filter-Fixes
- **Vor dem ersten Seed-Lauf** (optional, da Seed auch aktualisiert)
- **Bei bestehenden Daten** in Produktion

## Hinweise

- Script benötigt Datenbankzugriff (DATABASE_URL in .env)
- Keine Backup-Erstellung (vorher manuell machen falls gewünscht)
- Änderungen sind permanent (können nicht rückgängig gemacht werden)

