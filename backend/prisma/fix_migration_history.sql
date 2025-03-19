-- 1. responsibleId-Spalte auf NULL erlauben
ALTER TABLE "Task" ALTER COLUMN "responsibleId" DROP NOT NULL;

-- 2. Die problematische Migration aus der History löschen
DELETE FROM "_prisma_migrations" WHERE migration_name = '20250318201510_add_task_roles';

-- 3. Eine neue "Dummy"-Migration einfügen, die unsere Änderungen enthält
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid(), 
  '12345678901234567890123456789012345678901234567890', 
  NOW(), 
  '20250320000000_fix_responsible_nullable', 
  NULL, 
  NULL, 
  NOW(), 
  1
);