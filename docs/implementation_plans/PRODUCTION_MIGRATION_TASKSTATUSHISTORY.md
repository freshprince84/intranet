# Produktions-Migration: TaskStatusHistory

## Übersicht

Dieses Dokument beschreibt die Schritte zur sicheren Migration der `TaskStatusHistory` Tabelle auf dem Produktivserver **ohne Datenverlust**.

## Migration: `20251101155554_add_task_status_history`

### Was wird migriert?

- **Neue Tabelle**: `TaskStatusHistory`
  - Speichert alle Statusänderungen von Tasks
  - Ermöglicht historische Auswertungen
  - Keine bestehenden Daten werden gelöscht oder geändert

### Risiko-Bewertung

- **Risiko**: ⭐ Niedrig
- **Datenverlust**: Nein (nur neue Tabelle hinzufügen)
- **Downtime erforderlich**: Nein (CREATE TABLE ist non-blocking in PostgreSQL)

## Migrations-Schritte für Produktion

### Vorbereitung

1. **Backup erstellen**:
   ```bash
   # Auf dem Produktivserver
   pg_dump -U postgres -d intranet > backup_before_taskstatushistory_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Migration-Datei prüfen**:
   Die Migration-Datei befindet sich in:
   ```
   backend/prisma/migrations/20251101155554_add_task_status_history/migration.sql
   ```

### Durchführung

1. **Git Pull** (falls noch nicht geschehen):
   ```bash
   cd /var/www/intranet
   git pull
   ```

2. **Migration anwenden**:
   ```bash
   cd /var/www/intranet/backend
   npx prisma migrate deploy
   ```

   Dies wendet alle ausstehenden Migrationen an, einschließlich `20251101155554_add_task_status_history`.

3. **Prisma Client aktualisieren**:
   ```bash
   npx prisma generate
   ```

4. **Server neu starten** (falls der Server läuft):
   - Der Benutzer startet den Server manuell neu

### Verifikation

1. **Prüfen ob Tabelle existiert**:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'TaskStatusHistory';
   ```

2. **Prüfen ob Indizes erstellt wurden**:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'TaskStatusHistory';
   ```

   Erwartete Indizes:
   - `TaskStatusHistory_pkey` (Primary Key)
   - `TaskStatusHistory_taskId_idx`
   - `TaskStatusHistory_userId_idx`
   - `TaskStatusHistory_changedAt_idx`
   - `TaskStatusHistory_branchId_idx`

3. **Prüfen ob Foreign Keys erstellt wurden**:
   ```sql
   SELECT conname, contype 
   FROM pg_constraint 
   WHERE conrelid = 'TaskStatusHistory'::regclass;
   ```

   Erwartete Foreign Keys:
   - `TaskStatusHistory_taskId_fkey` (zu `Task`)
   - `TaskStatusHistory_userId_fkey` (zu `User`)
   - `TaskStatusHistory_branchId_fkey` (zu `Branch`)

### Rollback-Plan (falls nötig)

Falls die Migration Probleme verursacht:

1. **Tabelle löschen** (NUR wenn wirklich nötig):
   ```sql
   -- VORSICHT: Dies löscht alle Status-History-Daten!
   DROP TABLE IF EXISTS "TaskStatusHistory" CASCADE;
   ```

2. **Migration als rolled-back markieren**:
   ```bash
   npx prisma migrate resolve --rolled-back 20251101155554_add_task_status_history
   ```

3. **Backup wiederherstellen** (falls Daten korrupt):
   ```bash
   # Backup wiederherstellen
   psql -U postgres -d intranet < backup_before_taskstatushistory_YYYYMMDD_HHMMSS.sql
   ```

## Nach der Migration

Nach erfolgreicher Migration werden automatisch alle zukünftigen Task-Statusänderungen in der `TaskStatusHistory` Tabelle gespeichert.

**Wichtig**: Historische Statusänderungen (vor der Migration) werden nicht nachträglich erfasst. Nur neue Statusänderungen werden ab dem Zeitpunkt der Migration gespeichert.

## Checkliste

- [ ] Backup erstellt
- [ ] Git Pull durchgeführt
- [ ] Migration angewendet (`npx prisma migrate deploy`)
- [ ] Prisma Client aktualisiert (`npx prisma generate`)
- [ ] Tabelle verifiziert
- [ ] Indizes verifiziert
- [ ] Foreign Keys verifiziert
- [ ] Server neu gestartet
- [ ] Funktionstest durchgeführt

## Support

Bei Problemen:
1. Migration-Status prüfen: `npx prisma migrate status`
2. Logs überprüfen
3. Backup wiederherstellen falls nötig



