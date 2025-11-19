import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmailReadingConfig() {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { id: true, name: true, displayName: true, settings: true }
    });

    if (!org) {
      console.log('❌ Organisation 1 nicht gefunden');
      return;
    }

    const settings = org.settings as any;
    const emailReading = settings?.emailReading;

    console.log('=== EMAIL-READING KONFIGURATION FÜR ORGANISATION 1 ===');
    console.log(`Organisation: ${org.displayName} (${org.name})`);
    console.log('');
    console.log('Email-Reading konfiguriert:', !!emailReading);
    if (emailReading) {
      console.log('Email-Reading enabled:', emailReading.enabled);
      console.log('IMAP Host:', emailReading.imap?.host || 'NICHT GESETZT');
      console.log('IMAP User:', emailReading.imap?.user || 'NICHT GESETZT');
      console.log('IMAP Port:', emailReading.imap?.port || 'NICHT GESETZT');
      console.log('From Filter:', emailReading.filters?.from?.join(', ') || 'KEIN FILTER');
      console.log('Subject Filter:', emailReading.filters?.subject?.join(', ') || 'KEIN FILTER');
    } else {
      console.log('❌ Email-Reading ist NICHT konfiguriert');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailReadingConfig();

