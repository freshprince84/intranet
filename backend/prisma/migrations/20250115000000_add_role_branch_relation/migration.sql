-- AlterTable: Add allBranches field to Role
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "allBranches" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: RoleBranch
CREATE TABLE IF NOT EXISTS "RoleBranch" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint for roleId and branchId
CREATE UNIQUE INDEX IF NOT EXISTS "RoleBranch_roleId_branchId_key" ON "RoleBranch"("roleId", "branchId");

-- AddForeignKey: RoleBranch.roleId -> Role.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RoleBranch_roleId_fkey'
    ) THEN
        ALTER TABLE "RoleBranch" ADD CONSTRAINT "RoleBranch_roleId_fkey" 
        FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: RoleBranch.branchId -> Branch.id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RoleBranch_branchId_fkey'
    ) THEN
        ALTER TABLE "RoleBranch" ADD CONSTRAINT "RoleBranch_branchId_fkey" 
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

