/**
 * Script zum Finden von Hostelworld-Reservation-Emails von lobbybookings.com
 */

import { EmailReadingService } from '../src/services/emailReadingService';
import { EmailReservationParser } from '../src/services/emailReservationParser';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function findHostelworldReservations() {
  try {
    console.log('🔍 Suche Hostelworld-Reservation-Emails von lobbybookings.com...\n');

    // Lade Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);

    if (!emailConfig) {
      console.error('❌ Keine Email-Reading-Konfiguration gefunden');
      process.exit(1);
    }

    // Erstelle Email-Service
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    // Hole ALLE Emails von lobbybookings.com
    const allEmails = await emailService.fetchUnreadEmails({
      from: ['notification@lobbybookings.com']
    });

    // Filtere Hostelworld-Reservation-Emails (nicht Stornierungen)
    const hostelworldReservations = allEmails.filter(e => 
      (e.subject.toLowerCase().includes('hostelworld') || 
       e.text.toLowerCase().includes('hostelworld')) &&
      !e.text.toLowerCase().includes('cancelada') &&
      !e.text.toLowerCase().includes('cancelled') &&
      e.from.toLowerCase().includes('lobbybookings.com')
    );

    console.log(`📧 Gefunden: ${hostelworldReservations.length} Hostelworld-Reservation-Email(s) von lobbybookings.com\n`);

    if (hostelworldReservations.length > 0) {
      console.log('=== HOSTELWORLD RESERVATION-EMAIL BEISPIEL ===\n');
      const email = hostelworldReservations[0];
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.from}`);
      console.log(`Date: ${email.date.toLocaleString('de-DE')}\n`);

      console.log('Email-Text (erste 800 Zeichen):');
      console.log(email.text.substring(0, 800));
      console.log('\n...\n');

      // Teste Parsing
      console.log('=== PARSING TEST ===\n');
      const parsed = EmailReservationParser.parseReservationEmail(email.text, email.html);
      if (parsed) {
        console.log('✅ Parsing erfolgreich!');
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log('❌ Parsing fehlgeschlagen');
      }
    } else {
      console.log('ℹ️  Keine Hostelworld-Reservation-Emails von lobbybookings.com gefunden');
      console.log('   (Mögliche Gründe: Alle bereits verarbeitet, oder nur Marketing-Emails vorhanden)');
    }

    emailService.disconnect();

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

findHostelworldReservations();

