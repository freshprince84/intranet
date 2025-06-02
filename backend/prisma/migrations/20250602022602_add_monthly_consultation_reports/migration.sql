-- CreateEnum
CREATE TYPE "MonthlyReportStatus" AS ENUM ('GENERATED', 'SENT', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "monthlyReportDay" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "monthlyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyReportRecipient" TEXT;

-- CreateTable
CREATE TABLE "MonthlyConsultationReport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "recipient" TEXT NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "pdfPath" TEXT,
    "status" "MonthlyReportStatus" NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyConsultationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyConsultationReportItem" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL,
    "consultationCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyConsultationReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyConsultationReport_reportNumber_key" ON "MonthlyConsultationReport"("reportNumber");

-- AddForeignKey
ALTER TABLE "MonthlyConsultationReport" ADD CONSTRAINT "MonthlyConsultationReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsultationReportItem" ADD CONSTRAINT "MonthlyConsultationReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyConsultationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsultationReportItem" ADD CONSTRAINT "MonthlyConsultationReportItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
