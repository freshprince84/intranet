-- Migration: Add lastUsed column to UsersBranches
-- Execute this SQL directly in your database

ALTER TABLE "UsersBranches" 
ADD COLUMN IF NOT EXISTS "lastUsed" BOOLEAN NOT NULL DEFAULT false;

