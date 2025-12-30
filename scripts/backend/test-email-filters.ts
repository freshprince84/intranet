/**
 * Test: Prüfe ob Email-Filter korrekt sind
 */
import { PrismaClient } from '@prisma/client';
import { EmailReadingService } from '../src/services/emailReadingService';

const prisma = new PrismaClient();

async function testEmailFilters() {
  try {
    const organizationId = 1;
    
    console.log('=== TEST: EMAIL-FILTER ===\n');

    // Lade Email-Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(organizationId);
    if (!emailConfig) {
      console.log('❌ Email-Konfiguration konnte nicht geladen werden');
      return;
    }

    // Hole Organisation-Settings für Filter
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const orgSettings = organization?.settings as any;
    const emailReading = orgSettings?.emailReading;
    const filters = emailReading?.filters || {};

    console.log('Aktuelle Filter:');
    console.log(`   From: ${filters.from?.join(', ') || 'KEIN FILTER'}`);
    console.log(`   Subject: ${filters.subject?.join(', ') || 'KEIN FILTER'}`);
    console.log('');

    console.log('⚠️ PROBLEM:');
    console.log('   Aus dem Screenshot: From = "LobbyBookings.com"');
    console.log('   Filter erwartet: "notification@lobbybookings.com"');
    console.log('   → Filter ist zu spezifisch!');
    console.log('');

    // Verbinde zu Email-Server
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    try {
      // Test 1: Prüfe ohne From-Filter (nur Subject)
      console.log('Test 1: Prüfe nur mit Subject-Filter (ohne From-Filter)...');
      const emails1 = await emailService.fetchUnreadEmails({
        from: undefined,
        subject: filters.subject
      });
      console.log(`   Gefunden: ${emails1.length} Email(s)`);
      if (emails1.length > 0) {
        emails1.forEach((email, index) => {
          console.log(`   ${index + 1}. From: ${email.from}, Subject: ${email.subject}`);
        });
      }
      console.log('');

      // Test 2: Prüfe ohne Filter (alle Emails der letzten 7 Tage)
      console.log('Test 2: Prüfe ohne Filter (alle Emails der letzten 7 Tage)...');
      const emails2 = await emailService.fetchUnreadEmails({
        from: undefined,
        subject: undefined
      });
      console.log(`   Gefunden: ${emails2.length} Email(s)`);
      if (emails2.length > 0) {
        console.log('   Erste 5 Emails:');
        emails2.slice(0, 5).forEach((email, index) => {
          console.log(`   ${index + 1}. From: ${email.from}, Subject: ${email.subject}`);
        });
      }
      console.log('');

    } finally {
      await emailService.disconnect();
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testEmailFilters()
  .then(() => {
    console.log('\n✅ Test abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

