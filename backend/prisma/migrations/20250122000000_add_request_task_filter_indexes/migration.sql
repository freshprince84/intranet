-- Performance-Indizes für Filter-Queries
-- Erstellt: 2025-01-22
-- Zweck: Optimierung von server-seitigem Filtering (implementiert am 20.11.2025)

-- Request-Indizes
CREATE INDEX IF NOT EXISTS "Request_organizationId_isPrivate_createdAt_idx" ON "Request"("organizationId", "isPrivate", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Request_requesterId_isPrivate_idx" ON "Request"("requesterId", "isPrivate");
CREATE INDEX IF NOT EXISTS "Request_responsibleId_isPrivate_idx" ON "Request"("responsibleId", "isPrivate");
CREATE INDEX IF NOT EXISTS "Request_status_idx" ON "Request"("status");
CREATE INDEX IF NOT EXISTS "Request_type_idx" ON "Request"("type");
CREATE INDEX IF NOT EXISTS "Request_branchId_idx" ON "Request"("branchId");
CREATE INDEX IF NOT EXISTS "Request_dueDate_idx" ON "Request"("dueDate");
CREATE INDEX IF NOT EXISTS "Request_title_idx" ON "Request"("title");

-- Task-Indizes
CREATE INDEX IF NOT EXISTS "Task_organizationId_status_createdAt_idx" ON "Task"("organizationId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Task_responsibleId_idx" ON "Task"("responsibleId");
CREATE INDEX IF NOT EXISTS "Task_qualityControlId_idx" ON "Task"("qualityControlId");
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_branchId_idx" ON "Task"("branchId");
CREATE INDEX IF NOT EXISTS "Task_roleId_idx" ON "Task"("roleId");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX IF NOT EXISTS "Task_title_idx" ON "Task"("title");

