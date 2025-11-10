-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('vacation', 'improvement_suggestion', 'sick_leave', 'employment_certificate', 'other');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN "type" "RequestType" NOT NULL DEFAULT 'other';
ALTER TABLE "Request" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;

