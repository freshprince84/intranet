-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
-- 
-- PostgreSQL 12+ allows multiple ALTER TYPE ADD VALUE in a single transaction
-- when adding values at the end of the enum.

ALTER TYPE "RequestType" ADD VALUE 'event';
ALTER TYPE "RequestType" ADD VALUE 'permit';
ALTER TYPE "RequestType" ADD VALUE 'buy_order';
ALTER TYPE "RequestType" ADD VALUE 'repair';

