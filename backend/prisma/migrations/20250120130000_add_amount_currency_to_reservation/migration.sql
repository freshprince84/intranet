-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "amount" DECIMAL(10,2),
ADD COLUMN "currency" TEXT DEFAULT 'COP';

