-- AlterTable: Add missing payment-related and cancellation fields to Reservation
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'COP',
ADD COLUMN IF NOT EXISTS "paymentDeadline" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "autoCancelEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT,
ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- CreateIndex: Index for paymentDeadline (for automatic cancellation queries)
CREATE INDEX IF NOT EXISTS "Reservation_paymentDeadline_idx" ON "Reservation"("paymentDeadline");

-- CreateIndex: Index for autoCancelEnabled (for automatic cancellation queries)
CREATE INDEX IF NOT EXISTS "Reservation_autoCancelEnabled_idx" ON "Reservation"("autoCancelEnabled");

