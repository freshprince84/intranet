-- Migration: add_message_templates_and_auto_send_to_branch
-- Fügt messageTemplates und autoSendReservationInvitation Felder zu Branch hinzu

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "messageTemplates" JSONB;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "autoSendReservationInvitation" BOOLEAN DEFAULT false;
