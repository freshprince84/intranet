const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBilling() {
  console.log('=== Testing Billing Status ===');
  
  // Hole ein paar WorkTime-Einträge mit Client
  const consultations = await prisma.workTime.findMany({
    where: { clientId: { not: null } },
    take: 5,
    include: {
      client: true,
      invoiceItems: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              issueDate: true,
              total: true
            }
          }
        }
      },
      monthlyReport: {
        select: {
          id: true,
          reportNumber: true,
          status: true
        }
      }
    },
    orderBy: { startTime: 'desc' }
  });
  
  console.log('Sample consultations with billing status:');
  consultations.forEach(c => {
    const hasInvoice = c.invoiceItems && c.invoiceItems.length > 0;
    const hasMonthlyReport = c.monthlyReportId !== null;
    
    console.log({
      id: c.id,
      client: c.client?.name,
      startTime: c.startTime.toISOString().split('T')[0],
      hasInvoice,
      hasMonthlyReport,
      monthlyReportId: c.monthlyReportId,
      invoiceCount: c.invoiceItems?.length || 0
    });
  });
  
  await prisma.$disconnect();
}

testBilling().catch(console.error); 