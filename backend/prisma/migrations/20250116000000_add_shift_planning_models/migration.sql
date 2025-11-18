-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('available', 'preferred', 'unavailable');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('scheduled', 'confirmed', 'cancelled', 'swapped');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- AlterEnum (add new notification types)
ALTER TYPE "NotificationType" ADD VALUE 'shift';
ALTER TYPE "NotificationType" ADD VALUE 'shift_swap';

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAvailability" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "roleId" INTEGER,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "type" "AvailabilityType" NOT NULL DEFAULT 'available',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "shiftTemplateId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "userId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdBy" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSwapRequest" (
    "id" SERIAL NOT NULL,
    "originalShiftId" INTEGER NOT NULL,
    "targetShiftId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "requestedFrom" INTEGER NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplate_roleId_branchId_name_key" ON "ShiftTemplate"("roleId", "branchId", "name");

-- CreateIndex
CREATE INDEX "ShiftTemplate_roleId_branchId_idx" ON "ShiftTemplate"("roleId", "branchId");

-- CreateIndex
CREATE INDEX "UserAvailability_userId_idx" ON "UserAvailability"("userId");

-- CreateIndex
CREATE INDEX "UserAvailability_branchId_idx" ON "UserAvailability"("branchId");

-- CreateIndex
CREATE INDEX "UserAvailability_roleId_idx" ON "UserAvailability"("roleId");

-- CreateIndex
CREATE INDEX "UserAvailability_dayOfWeek_idx" ON "UserAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "Shift_branchId_date_idx" ON "Shift"("branchId", "date");

-- CreateIndex
CREATE INDEX "Shift_roleId_date_idx" ON "Shift"("roleId", "date");

-- CreateIndex
CREATE INDEX "Shift_userId_date_idx" ON "Shift"("userId", "date");

-- CreateIndex
CREATE INDEX "Shift_date_idx" ON "Shift"("date");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requestedBy_idx" ON "ShiftSwapRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requestedFrom_idx" ON "ShiftSwapRequest"("requestedFrom");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest"("status");

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAvailability" ADD CONSTRAINT "UserAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAvailability" ADD CONSTRAINT "UserAvailability_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAvailability" ADD CONSTRAINT "UserAvailability_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shiftTemplateId_fkey" FOREIGN KEY ("shiftTemplateId") REFERENCES "ShiftTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_originalShiftId_fkey" FOREIGN KEY ("originalShiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_targetShiftId_fkey" FOREIGN KEY ("targetShiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requestedFrom_fkey" FOREIGN KEY ("requestedFrom") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Add shift notification settings to UserNotificationSettings
ALTER TABLE "UserNotificationSettings" ADD COLUMN "shiftAssigned" BOOLEAN,
ADD COLUMN "shiftUpdated" BOOLEAN,
ADD COLUMN "shiftCancelled" BOOLEAN,
ADD COLUMN "shiftSwapRequest" BOOLEAN,
ADD COLUMN "shiftSwapApproved" BOOLEAN,
ADD COLUMN "shiftSwapRejected" BOOLEAN;

