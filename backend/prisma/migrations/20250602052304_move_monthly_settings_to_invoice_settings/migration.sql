/*
  Warnings:

  - You are about to drop the column `monthlyReportDay` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyReportEnabled` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyReportRecipient` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InvoiceSettings" ADD COLUMN     "monthlyReportDay" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "monthlyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyReportRecipient" TEXT;

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "monthlyReportDay",
DROP COLUMN "monthlyReportEnabled",
DROP COLUMN "monthlyReportRecipient";
