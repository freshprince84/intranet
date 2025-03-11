/*
  Warnings:

  - You are about to drop the column `page` on the `Permission` table. All the data in the column will be lost.
  - Added the required column `entity` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('task', 'request', 'user', 'role', 'worktime', 'system', 'cerebro');

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "page",
ADD COLUMN     "entity" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL DEFAULT 'page';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'CO',
ADD COLUMN     "hourlyRate" DECIMAL(65,30),
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "normalWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 7.6,
ADD COLUMN     "payrollCountry" TEXT NOT NULL DEFAULT 'CH';

-- CreateTable
CREATE TABLE "UserTableSettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tableId" TEXT NOT NULL,
    "columnOrder" TEXT NOT NULL,
    "hiddenColumns" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTableSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "relatedEntityId" INTEGER,
    "relatedEntityType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carticleId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" SERIAL NOT NULL,
    "taskCreate" BOOLEAN NOT NULL DEFAULT true,
    "taskUpdate" BOOLEAN NOT NULL DEFAULT true,
    "taskDelete" BOOLEAN NOT NULL DEFAULT true,
    "taskStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "requestCreate" BOOLEAN NOT NULL DEFAULT true,
    "requestUpdate" BOOLEAN NOT NULL DEFAULT true,
    "requestDelete" BOOLEAN NOT NULL DEFAULT true,
    "requestStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "userCreate" BOOLEAN NOT NULL DEFAULT true,
    "userUpdate" BOOLEAN NOT NULL DEFAULT true,
    "userDelete" BOOLEAN NOT NULL DEFAULT true,
    "roleCreate" BOOLEAN NOT NULL DEFAULT true,
    "roleUpdate" BOOLEAN NOT NULL DEFAULT true,
    "roleDelete" BOOLEAN NOT NULL DEFAULT true,
    "worktimeStart" BOOLEAN NOT NULL DEFAULT true,
    "worktimeStop" BOOLEAN NOT NULL DEFAULT true,
    "worktimeAutoStop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carticleCreate" BOOLEAN NOT NULL DEFAULT true,
    "carticleDelete" BOOLEAN NOT NULL DEFAULT true,
    "carticleLink" BOOLEAN NOT NULL DEFAULT true,
    "carticleMention" BOOLEAN NOT NULL DEFAULT true,
    "carticleUpdate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskCreate" BOOLEAN,
    "taskUpdate" BOOLEAN,
    "taskDelete" BOOLEAN,
    "taskStatusChange" BOOLEAN,
    "requestCreate" BOOLEAN,
    "requestUpdate" BOOLEAN,
    "requestDelete" BOOLEAN,
    "requestStatusChange" BOOLEAN,
    "userCreate" BOOLEAN,
    "userUpdate" BOOLEAN,
    "userDelete" BOOLEAN,
    "roleCreate" BOOLEAN,
    "roleUpdate" BOOLEAN,
    "roleDelete" BOOLEAN,
    "worktimeStart" BOOLEAN,
    "worktimeStop" BOOLEAN,
    "worktimeAutoStop" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carticleCreate" BOOLEAN,
    "carticleDelete" BOOLEAN,
    "carticleLink" BOOLEAN,
    "carticleMention" BOOLEAN,
    "carticleUpdate" BOOLEAN,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayroll" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "regularHours" DOUBLE PRECISION NOT NULL,
    "overtimeHours" DOUBLE PRECISION NOT NULL,
    "nightHours" DOUBLE PRECISION NOT NULL,
    "holidayHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DECIMAL(65,30) NOT NULL,
    "grossPay" DECIMAL(65,30) NOT NULL,
    "socialSecurity" DECIMAL(65,30) NOT NULL,
    "taxes" DECIMAL(65,30) NOT NULL,
    "netPay" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CerebroCarticle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "slug" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CerebroCarticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCerebroCarticle" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "carticleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCerebroCarticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestCerebroCarticle" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "carticleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestCerebroCarticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CerebroMedia" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "carticleId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CerebroMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CerebroExternalLink" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "carticleId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CerebroExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CerebroTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CerebroTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CerebroCarticleToCerebroTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTableSettings_userId_tableId_key" ON "UserTableSettings"("userId", "tableId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CerebroCarticle_slug_key" ON "CerebroCarticle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCerebroCarticle_taskId_carticleId_key" ON "TaskCerebroCarticle"("taskId", "carticleId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestCerebroCarticle_requestId_carticleId_key" ON "RequestCerebroCarticle"("requestId", "carticleId");

-- CreateIndex
CREATE UNIQUE INDEX "CerebroTag_name_key" ON "CerebroTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_CerebroCarticleToCerebroTag_AB_unique" ON "_CerebroCarticleToCerebroTag"("A", "B");

-- CreateIndex
CREATE INDEX "_CerebroCarticleToCerebroTag_B_index" ON "_CerebroCarticleToCerebroTag"("B");

-- AddForeignKey
ALTER TABLE "UserTableSettings" ADD CONSTRAINT "UserTableSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_carticleId_fkey" FOREIGN KEY ("carticleId") REFERENCES "CerebroCarticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayroll" ADD CONSTRAINT "EmployeePayroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroCarticle" ADD CONSTRAINT "CerebroCarticle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroCarticle" ADD CONSTRAINT "CerebroCarticle_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CerebroCarticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroCarticle" ADD CONSTRAINT "CerebroCarticle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCerebroCarticle" ADD CONSTRAINT "TaskCerebroCarticle_carticleId_fkey" FOREIGN KEY ("carticleId") REFERENCES "CerebroCarticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCerebroCarticle" ADD CONSTRAINT "TaskCerebroCarticle_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestCerebroCarticle" ADD CONSTRAINT "RequestCerebroCarticle_carticleId_fkey" FOREIGN KEY ("carticleId") REFERENCES "CerebroCarticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestCerebroCarticle" ADD CONSTRAINT "RequestCerebroCarticle_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroMedia" ADD CONSTRAINT "CerebroMedia_carticleId_fkey" FOREIGN KEY ("carticleId") REFERENCES "CerebroCarticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroMedia" ADD CONSTRAINT "CerebroMedia_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroExternalLink" ADD CONSTRAINT "CerebroExternalLink_carticleId_fkey" FOREIGN KEY ("carticleId") REFERENCES "CerebroCarticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroExternalLink" ADD CONSTRAINT "CerebroExternalLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CerebroCarticleToCerebroTag" ADD CONSTRAINT "_CerebroCarticleToCerebroTag_A_fkey" FOREIGN KEY ("A") REFERENCES "CerebroCarticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CerebroCarticleToCerebroTag" ADD CONSTRAINT "_CerebroCarticleToCerebroTag_B_fkey" FOREIGN KEY ("B") REFERENCES "CerebroTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
