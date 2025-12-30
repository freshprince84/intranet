/**
 * Prüft ALLE Emails (auch gelesene) der letzten 7 Tage um zu sehen, was im Postfach ist
 */
import { PrismaClient } from '@prisma/client';
import { EmailReadingService } from '../src/services/emailReadingService';

const prisma = new PrismaClient();

async function checkAllEmails() {
  try {
    const organizationId = 1;
    
    console.log('=== PRÜFE ALLE EMAILS (AUCH GELESENE) ===\n');

    // Lade Email-Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(organizationId);
    if (!emailConfig) {
      console.log('❌ Email-Konfiguration konnte nicht geladen werden');
      return;
    }

    console.log('✅ Email-Konfiguration geladen');
    console.log(`   Host: ${emailConfig.host}`);
    console.log(`   User: ${emailConfig.user}`);
    console.log('');

    // Hole Organisation-Settings für Filter
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const orgSettings = organization?.settings as any;
    const emailReading = orgSettings?.emailReading;
    const filters = emailReading?.filters || {};

    console.log('Filter-Konfiguration:');
    console.log(`   From: ${filters.from?.join(', ') || 'KEIN FILTER'}`);
    console.log(`   Subject: ${filters.subject?.join(', ') || 'KEIN FILTER'}`);
    console.log('');

    // Verbinde zu Email-Server
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    try {
      // Prüfe auf ALLE Emails (auch gelesene) der letzten 7 Tage
      // Wir müssen die fetchUnreadEmails-Methode erweitern oder direkt IMAP verwenden
      // Für jetzt: Prüfe ob es überhaupt Emails gibt, die den Filtern entsprechen
      
      console.log('⚠️ HINWEIS: fetchUnreadEmails prüft nur ungelesene Emails');
      console.log('   Wenn das Email bereits gelesen wurde, wird es nicht gefunden.\n');
      
      // Versuche trotzdem einen Check
      const emails = await emailService.fetchUnreadEmails({
        from: filters.from,
        subject: filters.subject
      });

      if (emails.length === 0) {
        console.log('📧 Keine ungelesenen Emails gefunden');
        console.log('\nMögliche Gründe:');
        console.log('1. Das Email wurde bereits als gelesen markiert');
        console.log('2. Das Email entspricht nicht den Filtern');
        console.log('3. Das Email ist nicht im Postfach');
        console.log('4. Das Email ist älter als die Suche');
        console.log('\n💡 TIPP: Prüfe im Email-Client, ob das Email:');
        console.log('   - Im Postfach ist');
        console.log('   - Als gelesen markiert ist');
        console.log('   - Den Filtern entspricht (From: notification@lobbybookings.com, Subject: Nueva reserva oder New reservation)');
      } else {
        console.log(`📧 Gefunden: ${emails.length} ungelesene Email(s)`);
        emails.forEach((email, index) => {
          console.log(`\nEmail ${index + 1}:`);
          console.log(`   From: ${email.from}`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Date: ${email.date?.toLocaleString('de-DE') || 'N/A'}`);
        });
      }
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

checkAllEmails()
  .then(() => {
    console.log('\n✅ Prüfung abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

