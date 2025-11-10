-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "TaskStatusHistory" DROP CONSTRAINT "TaskStatusHistory_taskId_fkey";

-- DropForeignKey
ALTER TABLE "TaskStatusHistory" DROP CONSTRAINT "TaskStatusHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "TaskStatusHistory" DROP CONSTRAINT "TaskStatusHistory_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationSyncHistory" DROP CONSTRAINT "ReservationSyncHistory_reservationId_fkey";

-- DropIndex
DROP INDEX "Role_name_organizationId_key";

-- DropIndex
DROP INDEX "Task_reservationId_key";

-- DropIndex
DROP INDEX "Task_reservationId_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_token_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "reservationId";

-- DropTable
DROP TABLE "Reservation";

-- DropTable
DROP TABLE "ReservationSyncHistory";

-- DropEnum
DROP TYPE "ReservationStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

