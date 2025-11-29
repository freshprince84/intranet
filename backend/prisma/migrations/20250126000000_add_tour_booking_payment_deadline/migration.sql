-- AlterTable
ALTER TABLE "TourBooking" ADD COLUMN "paymentDeadline" TIMESTAMP(3),
ADD COLUMN "autoCancelEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reservedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TourBooking_paymentDeadline_idx" ON "TourBooking"("paymentDeadline");


