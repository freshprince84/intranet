-- AlterTable
ALTER TABLE "WorkTime" ADD COLUMN     "monthlyReportId" INTEGER;

-- AddForeignKey
ALTER TABLE "WorkTime" ADD CONSTRAINT "WorkTime_monthlyReportId_fkey" FOREIGN KEY ("monthlyReportId") REFERENCES "MonthlyConsultationReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
