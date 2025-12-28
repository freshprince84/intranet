-- AddReservationGrouping
-- Fügt Felder für die Gruppierung zusammenhängender Reservationen hinzu

-- Neue Spalten für Reservation-Gruppierung
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "reservationGroupId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "isPrimaryInGroup" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "combinedPaymentLink" TEXT;

-- Index für effiziente Gruppen-Abfragen
CREATE INDEX IF NOT EXISTS "Reservation_reservationGroupId_idx" ON "Reservation"("reservationGroupId");

