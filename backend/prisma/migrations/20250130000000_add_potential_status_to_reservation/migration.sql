-- AlterEnum
-- Enum wird erweitert um "potential" Status
-- Keine Datenmigration nötig, da "potential" ein neuer Status ist

ALTER TYPE "ReservationStatus" ADD VALUE 'potential';
