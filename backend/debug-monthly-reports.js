const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('=== DEBUG: Checking database structure ===');
  
  // Prüfe ein paar WorkTime-Einträge
  const workTimes = await prisma.workTime.findMany({
    where: { clientId: { not: null } },
    take: 3,
    select: {
      id: true,
      clientId: true,
      monthlyReportId: true,
      invoiceItems: true,
      startTime: true,
      endTime: true
    }
  });
  
  console.log('Sample WorkTime entries:');
  console.log(JSON.stringify(workTimes, null, 2));
  
  // Prüfe MonthlyReports
  const reports = await prisma.monthlyConsultationReport.findMany({
    take: 2,
    select: {
      id: true,
      reportNumber: true,
      workTimes: {
        select: { id: true }
      }
    }
  });
  
  console.log('\nSample Monthly Reports:');
  console.log(JSON.stringify(reports, null, 2));
  
  // Prüfe nicht-abgerechnete Beratungen
  const unbilledCount = await prisma.workTime.count({
    where: {
      clientId: { not: null },
      endTime: { not: null },
      AND: [
        { invoiceItems: { none: {} } },
        { monthlyReportId: null }
      ]
    }
  });
  
  console.log('\nUnbilled consultations count:', unbilledCount);
  
  await prisma.$disconnect();
}

debug().catch(console.error); 