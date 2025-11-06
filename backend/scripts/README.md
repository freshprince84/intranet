# Datenimport aus altem Intranet

Dieses Skript importiert Daten aus dem alten Intranet-System (`lafamili_sopl771.json`) in die neue Datenbank.

**Wichtig:** Alle importierten Daten werden der Organisation **"La Familia Hostel"** (ID 1) zugeordnet.

## Voraussetzungen

1. Datenbank muss laufen und Schema muss aktuell sein
2. **WICHTIG**: Prisma Client muss mit dem aktuellen Schema generiert sein:
   ```bash
   cd backend
   npx prisma generate
   ```
   Falls Fehler auftreten (Datei-Lock), schließe alle laufenden Node-Prozesse und versuche es erneut.
3. Transformierte Daten müssen in `import_data/` vorhanden sein:
   - `branches.json`
   - `roles.json`
   - `users.json`
   - `user_branches.json`
   - `user_roles.json`
   - `requests.json`
   - `cerebro.json`

## Verwendung

```bash
cd backend
npx ts-node scripts/import_data.ts
```

## Was wird importiert?

1. **Organisation** - "La Familia Hostel" wird erstellt/überprüft (ID 1)
2. **Branches** - Alle Standorte (mit `organizationId = 1`)
3. **Roles** - Alle Rollen (mit `organizationId = 1`)
4. **Users** - Alle Benutzer mit Passwörtern, Bank-Details, etc.
5. **User-Branches** - Zuordnungen User ↔ Branch (mit `lastUsed` Flag)
6. **User-Roles** - Zuordnungen User ↔ Role (mit `lastUsed` Flag)
7. **Requests** - Alle Requests/To-Do's (mit `organizationId = 1`)
8. **Cerebro-Artikel** - Alle Cerebro-Artikel (mit `organizationId = 1`)

## Wichtige Hinweise

- **Idempotent**: Das Skript kann mehrfach ausgeführt werden. Bereits vorhandene Einträge werden übersprungen.
- **lastUsed**: Aktive Branch/Role aus dem User-Eintrag wird als `lastUsed: true` markiert.
- **Fehlerbehandlung**: Bei Fehlern wird der Eintrag übersprungen und der Import fortgesetzt.
- **Progress**: Bei vielen Requests wird alle 50 Einträge ein Progress-Update angezeigt.

## Datenstruktur

Die transformierten Daten müssen folgende Struktur haben:

### users.json
```json
{
  "old_id": "3",
  "username": "Pat",
  "email": "Pat@lafamilia.local",
  "password": "...",
  "firstName": "Patrick",
  "lastName": "Ammann",
  "old_branch_id": "1",
  "old_role_id": "0"
}
```

### user_branches.json
```json
{
  "old_user_id": "3",
  "old_branch_id": "1",
  "lastUsed": true
}
```

### user_roles.json
```json
{
  "old_user_id": "3",
  "old_role_id": "0",
  "lastUsed": true
}
```

## Troubleshooting

**Fehler: "Prisma Client nicht generiert" oder "lastUsed does not exist"**
```bash
cd backend
npx prisma generate
# Falls Datei-Lock: Schließe alle Node-Prozesse und versuche es erneut
```

**Fehler: "Schema-Drift erkannt"**
```bash
cd backend
npx prisma migrate dev
```

**Fehler: "Datenbank-Verbindung fehlgeschlagen"**
- Prüfe `.env` Datei und `DATABASE_URL`
- Stelle sicher, dass die Datenbank läuft

