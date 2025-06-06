/*
  Warnings:

  - Added the required column `organizationId` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('basic', 'pro', 'enterprise', 'trial');

-- DropIndex
DROP INDEX "CerebroCarticle_slug_key";

-- DropIndex
DROP INDEX "ConsultationInvoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "MonthlyConsultationReport_reportNumber_key";

-- CreateTable (Organization ZUERST erstellen)
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUsers" INTEGER NOT NULL DEFAULT 50,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'basic',
    "subscriptionEnd" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationJoinRequest" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "response" TEXT,
    "processedBy" INTEGER,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "invitedBy" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

-- Insert Standard-Organisation
INSERT INTO "Organization" (id, name, "displayName", "subscriptionPlan", "maxUsers", "isActive", "createdAt", "updatedAt") 
VALUES (1, 'default', 'Standard Organisation', 'enterprise', 1000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable (NACH Organisation-Erstellung)
ALTER TABLE "Role" ADD COLUMN "organizationId" INTEGER NOT NULL DEFAULT 1;

-- Update alle bestehenden Rollen zur Standard-Organisation
UPDATE "Role" SET "organizationId" = 1;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationJoinRequest_organizationId_requesterId_key" ON "OrganizationJoinRequest"("organizationId", "requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- AddForeignKey
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationJoinRequest" ADD CONSTRAINT "OrganizationJoinRequest_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
