/*
  Warnings:

  - You are about to drop the unique constraint covering the columns `[name]` on the table `Role`. This will fail if there are existing duplicate values in that column.
  - A unique constraint covering the columns `[name,organizationId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX IF EXISTS "Role_name_key";

-- CreateIndex
-- Note: NULL values are considered distinct in PostgreSQL, so multiple NULL organizationId values with same name are allowed
CREATE UNIQUE INDEX "Role_name_organizationId_key" ON "Role"("name", "organizationId") WHERE "organizationId" IS NOT NULL;

-- For roles without organization (organizationId IS NULL), they should have unique names
CREATE UNIQUE INDEX "Role_name_null_org_key" ON "Role"("name") WHERE "organizationId" IS NULL;

