-- AlterTable: Add checkInDataUploaded and checkInDataUploadedAt to Reservation
ALTER TABLE "Reservation" 
ADD COLUMN IF NOT EXISTS "checkInDataUploaded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "checkInDataUploadedAt" TIMESTAMP(3);

