   -- AlterTable
   ALTER TABLE "Task" ADD COLUMN "roleId" INTEGER;
   
   -- AddForeignKey
   ALTER TABLE "Task" ADD CONSTRAINT "Task_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;