-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'partially_paid', 'refunded');

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "lobbyReservationId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3),
    "roomNumber" TEXT,
    "roomDescription" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'confirmed',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentLink" TEXT,
    "doorPin" TEXT,
    "doorAppName" TEXT,
    "ttlLockId" TEXT,
    "ttlLockPassword" TEXT,
    "onlineCheckInCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onlineCheckInCompletedAt" TIMESTAMP(3),
    "sireRegistered" BOOLEAN NOT NULL DEFAULT false,
    "sireRegistrationId" TEXT,
    "sireRegisteredAt" TIMESTAMP(3),
    "sireRegistrationError" TEXT,
    "guestNationality" TEXT,
    "guestPassportNumber" TEXT,
    "guestBirthDate" TIMESTAMP(3),
    "organizationId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationSyncHistory" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "syncType" TEXT NOT NULL,
    "syncData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,

    CONSTRAINT "ReservationSyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_lobbyReservationId_key" ON "Reservation"("lobbyReservationId");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_idx" ON "Reservation"("organizationId");

-- CreateIndex
CREATE INDEX "Reservation_checkInDate_idx" ON "Reservation"("checkInDate");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_paymentStatus_idx" ON "Reservation"("paymentStatus");

-- CreateIndex
CREATE INDEX "ReservationSyncHistory_reservationId_idx" ON "ReservationSyncHistory"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationSyncHistory_syncedAt_idx" ON "ReservationSyncHistory"("syncedAt");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationSyncHistory" ADD CONSTRAINT "ReservationSyncHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add reservationId to Task (optional, unique)
ALTER TABLE "Task" ADD COLUMN "reservationId" INTEGER;

-- CreateIndex: Unique constraint on Task.reservationId
CREATE UNIQUE INDEX "Task_reservationId_key" ON "Task"("reservationId");

-- CreateIndex: Index on Task.reservationId for performance
CREATE INDEX "Task_reservationId_idx" ON "Task"("reservationId");

-- AddForeignKey: Task.reservationId -> Reservation.id
ALTER TABLE "Task" ADD CONSTRAINT "Task_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;


