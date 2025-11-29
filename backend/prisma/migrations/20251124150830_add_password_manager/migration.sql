-- CreateTable
CREATE TABLE "PasswordEntry" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "notes" TEXT,
    "organizationId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordEntryRolePermission" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordEntryRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordEntryUserPermission" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordEntryUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordEntryAuditLog" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordEntryAuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PasswordEntry" ADD CONSTRAINT "PasswordEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntry" ADD CONSTRAINT "PasswordEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntryRolePermission" ADD CONSTRAINT "PasswordEntryRolePermission_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PasswordEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntryRolePermission" ADD CONSTRAINT "PasswordEntryRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntryUserPermission" ADD CONSTRAINT "PasswordEntryUserPermission_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PasswordEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntryUserPermission" ADD CONSTRAINT "PasswordEntryUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntryAuditLog" ADD CONSTRAINT "PasswordEntryAuditLog_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PasswordEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordEntryAuditLog" ADD CONSTRAINT "PasswordEntryAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntry_organizationId_idx" ON "PasswordEntry"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntry_createdById_idx" ON "PasswordEntry"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntry_createdAt_idx" ON "PasswordEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordEntryRolePermission_entryId_roleId_key" ON "PasswordEntryRolePermission"("entryId", "roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryRolePermission_entryId_idx" ON "PasswordEntryRolePermission"("entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryRolePermission_roleId_idx" ON "PasswordEntryRolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordEntryUserPermission_entryId_userId_key" ON "PasswordEntryUserPermission"("entryId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryUserPermission_entryId_idx" ON "PasswordEntryUserPermission"("entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryUserPermission_userId_idx" ON "PasswordEntryUserPermission"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryAuditLog_entryId_idx" ON "PasswordEntryAuditLog"("entryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryAuditLog_userId_idx" ON "PasswordEntryAuditLog"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryAuditLog_action_idx" ON "PasswordEntryAuditLog"("action");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordEntryAuditLog_createdAt_idx" ON "PasswordEntryAuditLog"("createdAt");

