/**
 * Finde das Reservation-Email (Daniel Oliveira, Code: 5664182399)
 */
import { PrismaClient } from '@prisma/client';
import { EmailReadingService } from '../src/services/emailReadingService';

const prisma = new PrismaClient();

async function findReservationEmail() {
  try {
    const organizationId = 1;
    
    console.log('=== SUCHE RESERVATION-EMAIL ===\n');
    console.log('Erwartet: Daniel Oliveira, Code: 5664182399\n');

    // Lade Email-Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(organizationId);
    if (!emailConfig) {
      console.log('❌ Email-Konfiguration konnte nicht geladen werden');
      return;
    }

    // Verbinde zu Email-Server
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    try {
      // Prüfe alle Emails der letzten 7 Tage (ohne Filter)
      console.log('Suche alle Emails der letzten 7 Tage...');
      const emails = await emailService.fetchUnreadEmails({
        from: undefined,
        subject: undefined
      });

      console.log(`\n📧 Gefunden: ${emails.length} Email(s)\n`);

      // Suche nach Reservation-Email
      const reservationEmails = emails.filter(email => 
        email.subject?.toLowerCase().includes('nueva reserva') ||
        email.subject?.toLowerCase().includes('new reservation') ||
        email.text?.includes('5664182399') ||
        email.text?.includes('Daniel Oliveira') ||
        email.html?.includes('5664182399') ||
        email.html?.includes('Daniel Oliveira')
      );

      if (reservationEmails.length > 0) {
        console.log(`✅ Gefunden: ${reservationEmails.length} Reservation-Email(s)\n`);
        reservationEmails.forEach((email, index) => {
          console.log(`Email ${index + 1}:`);
          console.log(`   From: ${email.from}`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Date: ${email.date?.toLocaleString('de-DE') || 'N/A'}`);
          console.log(`   Text-Länge: ${email.text?.length || 0} Zeichen`);
          if (email.text) {
            const codeMatch = email.text.match(/5664182399|Daniel Oliveira/i);
            if (codeMatch) {
              console.log(`   ✅ Enthält gesuchte Daten!`);
            }
          }
          console.log('');
        });
      } else {
        console.log('❌ Keine Reservation-Email gefunden');
        console.log('\nPrüfe erste 10 Emails auf Reservation-Hinweise:');
        emails.slice(0, 10).forEach((email, index) => {
          const isReservation = email.subject?.toLowerCase().includes('reserva') || 
                               email.from?.toLowerCase().includes('lobby') ||
                               email.from?.toLowerCase().includes('booking');
          if (isReservation) {
            console.log(`   ${index + 1}. From: ${email.from}, Subject: ${email.subject}`);
          }
        });
      }

    } finally {
      await emailService.disconnect();
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

findReservationEmail()
  .then(() => {
    console.log('\n✅ Suche abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

