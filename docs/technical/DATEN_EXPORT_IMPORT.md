# Datenexport/Import für Server-Deployment

Diese Skripte ermöglichen es, Datenbank-Daten zwischen lokaler Umgebung und Server zu übertragen, **ohne Seed-Daten zu überschreiben**.

## Übersicht

- **`export_data.ts`**: Exportiert alle Daten aus der lokalen Datenbank (außer Seed-Daten)
- **`import_exported_data.ts`**: Importiert die exportierten Daten auf dem Server (mit Seed-Schutz)

## Geschützte Seed-Daten

Folgende Daten werden **NICHT** exportiert/importiert:

- **Rollen**: IDs 1, 2, 999 + Rollen mit Namen 'Admin', 'User', 'Hamburger' (global)
- **Organisationen**: IDs 1, 2 + Namen 'la-familia-hostel', 'mosaik', 'default'
- **User**: 'admin', 'rebeca-benitez', 'christina-di-biaso'
- **Branches**: 'Parque Poblado', 'Manila', 'Sonnenhalden', 'Hauptsitz'
- **Clients**: Seed-Clients für Org 2 + Demo-Clients
- **WorkTimes**: Demo-WorkTimes/Beratungen
- **Permissions**: Permissions für Seed-Rollen

## Verwendung

### Schritt 1: Lokaler Export

Auf deinem lokalen Rechner:

```bash
cd backend
npx ts-node scripts/export_data.ts
```

**Ausgabe**: JSON-Dateien in `backend/export_data/`:
- `organizations.json`
- `roles.json`
- `users.json`
- `branches.json`
- `clients.json`
- `worktimes.json`
- `tasks.json`
- `requests.json`
- `cerebro.json`
- `user_roles.json`
- `user_branches.json`
- `permissions.json`

### Schritt 2: Daten auf Server kopieren

```bash
scp -i ~/.ssh/intranet_rsa -r backend/export_data root@65.109.228.106:/var/www/intranet/backend/export_data
```

### Schritt 3: Deployment auf Server

SSH-Verbindung zum Server:

```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

Dann die Deployment-Schritte ausführen:

```bash
# 1. Git Pull
cd /var/www/intranet
git pull

# 2. Dependencies installieren
cd backend
npm install
cd ../frontend
npm install

# 3. Migrationen anwenden
cd /var/www/intranet/backend
npx prisma migrate deploy

# 4. Prisma Client generieren
npx prisma generate

# 5. Seed ausführen (wichtig für neue Berechtigungen!)
npx prisma db seed

# 6. Daten importieren (mit Seed-Schutz)
npx ts-node scripts/import_exported_data.ts

# 7. Builds
npm run build
cd ../frontend
npm run build

# 8. Server-Neustart (NUR nach Absprache!)
pm2 restart intranet-backend
sudo systemctl restart nginx
```

## Wichtige Hinweise

1. **Seed-Daten werden geschützt**: Seed-Daten werden beim Export ausgeschlossen und beim Import übersprungen
2. **Idempotent**: Import kann mehrfach ausgeführt werden ohne Probleme
3. **ID-Mapping**: Das Import-Skript mappt automatisch IDs, falls sich diese geändert haben
4. **Passwörter**: User-Passwörter werden beim Import NICHT aktualisiert (Sicherheit)
5. **⚠️ User active-Status wird geschützt**: 
   - Der `active`-Status von Usern wird beim Import **NUR** aktualisiert, wenn er explizit in den importierten Daten vorhanden ist
   - Wenn `active` nicht in den Daten vorhanden ist, wird der bestehende Status beibehalten
   - Dies verhindert, dass inaktive User (z.B. in Organisation 1) durch Imports wieder aktiviert werden

## Fehlerbehebung

### Fehler: "Datei nicht gefunden"
- Stelle sicher, dass `export_data/` auf dem Server existiert
- Prüfe, ob alle JSON-Dateien vorhanden sind

### Fehler: "User/Branch nicht gefunden"
- Stelle sicher, dass Abhängigkeiten in korrekter Reihenfolge importiert wurden
- Prüfe ID-Mappings im Import-Log

### Fehler: "Seed-Daten werden überschrieben"
- Das sollte nicht passieren - Seed-Daten werden explizit geprüft
- Falls doch: Prüfe Seed-Definitionen in beiden Skripten

## Technische Details

### Export-Logik
- Identifiziert Seed-Daten anhand von IDs, Namen oder anderen Kriterien
- Exportiert alle anderen Daten als JSON
- Behält Referenzen bei (IDs werden mit exportiert)

### Import-Logik
- Prüft jeden Eintrag auf Seed-Daten
- Überspringt Seed-Daten komplett
- Mappt IDs falls nötig (z.B. wenn Organisationen andere IDs haben)
- Verwendet upsert-Logik (erstellt oder aktualisiert)

### Reihenfolge
Import erfolgt in dieser Reihenfolge (wegen Abhängigkeiten):
1. Organisationen
2. Rollen
3. User
4. Branches
5. Clients
6. WorkTimes
7. Tasks
8. Requests
9. Cerebro
10. User-Roles
11. User-Branches
12. Permissions

