/**
 * Test: Email ohne Filter laden
 */

import { EmailReadingService } from '../src/services/emailReadingService';
import { EmailReservationParser } from '../src/services/emailReservationParser';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testWithoutFilter() {
  try {
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);
    if (!emailConfig) {
      console.error('❌ Keine Konfiguration');
      process.exit(1);
    }

    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    // OHNE Filter
    console.log('📧 Lade Emails OHNE Filter...\n');
    const allEmails = await emailService.fetchUnreadEmails();
    console.log(`Gefunden: ${allEmails.length} Email(s)\n`);

    // Mit Filter
    console.log('📧 Lade Emails MIT Filter...\n');
    const filteredEmails = await emailService.fetchUnreadEmails({
      from: ['notification@lobbybookings.com'],
      subject: ['Nueva reserva', 'New reservation', 'Airbnb', 'Hostelworld']
    });
    console.log(`Gefunden: ${filteredEmails.length} Email(s)\n`);

    // Finde Airbnb-Emails manuell
    const airbnbEmails = allEmails.filter(e => 
      e.from.toLowerCase().includes('lobbybookings.com') &&
      (e.subject.toLowerCase().includes('airbnb') || e.text.toLowerCase().includes('airbnb')) &&
      !e.text.toLowerCase().includes('cancelada')
    );

    console.log(`📧 Airbnb-Emails (manuell gefiltert): ${airbnbEmails.length}\n`);

    if (airbnbEmails.length > 0) {
      const email = airbnbEmails[0];
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.from}`);
      
      const parsed = EmailReservationParser.parseReservationEmail(email.text, email.html);
      if (parsed) {
        console.log(`✅ Parsing OK: Code ${parsed.reservationCode}, Gast ${parsed.guestName}`);
      } else {
        console.log('❌ Parsing fehlgeschlagen');
      }
    }

    emailService.disconnect();
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWithoutFilter();

