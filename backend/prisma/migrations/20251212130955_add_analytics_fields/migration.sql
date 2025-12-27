-- AlterTable: Task - Add analytics fields
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "createdById" INTEGER;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "deletedById" INTEGER;

-- AlterTable: Request - Add analytics fields
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "deletedById" INTEGER;

-- CreateTable: RequestStatusHistory
CREATE TABLE IF NOT EXISTS "RequestStatusHistory" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "oldStatus" "RequestStatus",
    "newStatus" "RequestStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "branchId" INTEGER NOT NULL,

    CONSTRAINT "RequestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Task.createdBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Task_createdById_fkey'
    ) THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Task.deletedBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Task_deletedById_fkey'
    ) THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_deletedById_fkey" 
        FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Request.deletedBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Request_deletedById_fkey'
    ) THEN
        ALTER TABLE "Request" ADD CONSTRAINT "Request_deletedById_fkey" 
        FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: RequestStatusHistory.request
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RequestStatusHistory_requestId_fkey'
    ) THEN
        ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_requestId_fkey" 
        FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: RequestStatusHistory.user
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RequestStatusHistory_userId_fkey'
    ) THEN
        ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: RequestStatusHistory.branch
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RequestStatusHistory_branchId_fkey'
    ) THEN
        ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_branchId_fkey" 
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex: Task.createdById + createdAt
CREATE INDEX IF NOT EXISTS "Task_createdById_createdAt_idx" ON "Task"("createdById", "createdAt" DESC);

-- CreateIndex: Task.deletedAt
CREATE INDEX IF NOT EXISTS "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex: Task.deletedById
CREATE INDEX IF NOT EXISTS "Task_deletedById_idx" ON "Task"("deletedById");

-- CreateIndex: Request.deletedAt
CREATE INDEX IF NOT EXISTS "Request_deletedAt_idx" ON "Request"("deletedAt");

-- CreateIndex: Request.deletedById
CREATE INDEX IF NOT EXISTS "Request_deletedById_idx" ON "Request"("deletedById");

-- CreateIndex: RequestStatusHistory.requestId
CREATE INDEX IF NOT EXISTS "RequestStatusHistory_requestId_idx" ON "RequestStatusHistory"("requestId");

-- CreateIndex: RequestStatusHistory.userId
CREATE INDEX IF NOT EXISTS "RequestStatusHistory_userId_idx" ON "RequestStatusHistory"("userId");

-- CreateIndex: RequestStatusHistory.changedAt
CREATE INDEX IF NOT EXISTS "RequestStatusHistory_changedAt_idx" ON "RequestStatusHistory"("changedAt");

-- CreateIndex: RequestStatusHistory.branchId
CREATE INDEX IF NOT EXISTS "RequestStatusHistory_branchId_idx" ON "RequestStatusHistory"("branchId");



