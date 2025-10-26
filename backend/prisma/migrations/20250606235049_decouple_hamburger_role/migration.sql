/*
  Warnings:

  - You are about to drop the column `joinRequestApproved` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `joinRequestReceived` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `joinRequestRejected` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `organizationInvitationReceived` on the `NotificationSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `CerebroCarticle` will be added. If there are existing duplicate values, this will fail.
  - Made the column `username` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "NotificationSettings" DROP COLUMN "joinRequestApproved",
DROP COLUMN "joinRequestReceived",
DROP COLUMN "joinRequestRejected",
DROP COLUMN "organizationInvitationReceived";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CerebroCarticle_slug_key" ON "CerebroCarticle"("slug");

-- Entkopple Hamburger-Rolle (ID 999) von der Organisation
-- Diese Rolle soll für User ohne Organisation verwendet werden

-- Setze organizationId der Hamburger-Rolle auf NULL (falls sie existiert)
UPDATE "Role" SET "organizationId" = NULL WHERE id = 999;
