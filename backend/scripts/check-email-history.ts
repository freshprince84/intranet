import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmailHistory() {
  try {
    // Prüfe wann Branch 3 Settings zuletzt geändert wurden
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        updatedAt: true
      }
    });
    console.log('BRANCH_3_LAST_UPDATED:', branch?.updatedAt);
    
    // Prüfe Notification-Logs mit erfolgreichen Emails (letzte 7 Tage)
    const successLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        success: true,
        channel: 'email',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reservationId: true,
        createdAt: true,
        sentAt: true
      }
    });
    console.log('SUCCESSFUL_EMAILS_LAST_7_DAYS:', successLogs.length);
    if (successLogs.length > 0) {
      console.log('LAST_SUCCESSFUL_EMAIL:', successLogs[0].createdAt);
      console.log('SUCCESSFUL_EMAILS:', JSON.stringify(successLogs, null, 2));
    }
    
    // Prüfe fehlgeschlagene Emails (letzte 7 Tage)
    const errorLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        success: false,
        channel: 'email',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reservationId: true,
        createdAt: true,
        errorMessage: true
      }
    });
    console.log('FAILED_EMAILS_LAST_7_DAYS:', errorLogs.length);
    if (errorLogs.length > 0) {
      console.log('FIRST_FAILED_EMAIL:', errorLogs[errorLogs.length - 1].createdAt);
      console.log('FAILED_EMAILS:', JSON.stringify(errorLogs, null, 2));
    }
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailHistory();

