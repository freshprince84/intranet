-- Migration: add_branch_to_reservation
-- Fügt branchId Feld zu Reservation hinzu (optional für Rückwärtskompatibilität)

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "branchId" INTEGER;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Reservation_branchId_idx" ON "Reservation"("branchId");

