   -- Spalte hinzufügen
   ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "roleId" INTEGER;
   
   -- Foreign Key hinzufügen (nur wenn Spalte noch nicht existiert)
   DO $$ 
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'Task_roleId_fkey'
     ) THEN
       ALTER TABLE "Task" ADD CONSTRAINT "Task_roleId_fkey" 
       FOREIGN KEY ("roleId") REFERENCES "Role"("id") 
       ON DELETE SET NULL ON UPDATE CASCADE;
     END IF;
   END
   $$;