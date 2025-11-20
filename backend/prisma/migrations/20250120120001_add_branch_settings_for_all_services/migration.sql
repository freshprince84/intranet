-- Migration: add_branch_settings_for_all_services
-- Fügt Settings-Felder für alle Services zu Branch hinzu

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "lobbyPmsSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "boldPaymentSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "doorSystemSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "sireSettings" JSONB;
ALTER TABLE "Branch" ADD COLUMN "emailSettings" JSONB;

