-- AlterEnum: Add notification_sent to ReservationStatus
ALTER TYPE "ReservationStatus" ADD VALUE 'notification_sent';

-- AlterTable: Add sentMessage and sentMessageAt to Reservation
ALTER TABLE "Reservation" ADD COLUMN "sentMessage" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "sentMessageAt" TIMESTAMP(3);

