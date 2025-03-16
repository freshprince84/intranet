# Anleitung: Import der Dokumentation in Cerebro

Diese Anleitung beschreibt, wie die neu erstellten Markdown-Dateien als Cerebro-Artikel in die Datenbank importiert werden können.

## Voraussetzungen

- Node.js und npm müssen installiert sein
- Der Backend-Server muss konfiguriert sein (Prisma, Datenbankverbindung)
- Die zu importierenden Markdown-Dateien müssen im Repository-Root vorhanden sein

## Schritte zur Ausführung

1. Navigiere zum Backend-Verzeichnis:
   ```bash
   cd backend
   ```

2. Stelle sicher, dass alle Abhängigkeiten installiert sind:
   ```bash
   npm install
   ```

3. Kompiliere das TypeScript-Skript:
   ```bash
   npx tsc -p tsconfig.json
   ```

4. Führe das Skript aus:
   ```bash
   node dist/scripts/importiereNeueDoku.js
   ```

## Hinweise

- Das Skript fügt automatisch alle in der Konfiguration definierten Markdown-Dateien als Cerebro-Artikel hinzu
- Wenn ein Artikel mit demselben Titel bereits existiert, wird er aktualisiert
- Neue Artikel werden unter dem Hauptartikel "Intranet - Überblick" angeordnet
- Der Import kann je nach Anzahl und Größe der Dateien einige Zeit in Anspruch nehmen

## Fehlerbehandlung

Falls Fehler auftreten:

1. Überprüfe die Konsolenausgabe auf Fehlermeldungen
2. Stelle sicher, dass der Prisma-Client korrekt konfiguriert ist
3. Überprüfe, ob alle Dateipfade korrekt sind
4. Stelle sicher, dass der Benutzer mit ID 1 in der Datenbank existiert (für `createdById`) 