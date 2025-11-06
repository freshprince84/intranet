-- AlterTable
ALTER TABLE "Task" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "WorkTime" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "ConsultationInvoice" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "MonthlyConsultationReport" ADD COLUMN "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "CerebroCarticle" ADD COLUMN "organizationId" INTEGER;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationInvoice" ADD CONSTRAINT "ConsultationInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyConsultationReport" ADD CONSTRAINT "MonthlyConsultationReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerebroCarticle" ADD CONSTRAINT "CerebroCarticle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;


