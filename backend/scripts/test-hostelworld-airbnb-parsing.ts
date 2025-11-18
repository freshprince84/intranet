/**
 * Script zum Testen des Parsings für Hostelworld und Airbnb Emails
 */

import { EmailReservationParser } from '../src/services/emailReservationParser';
import { EmailReadingService } from '../src/services/emailReadingService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testHostelworldAirbnbParsing() {
  try {
    console.log('🔍 Teste Parsing für Hostelworld und Airbnb Emails...\n');

    // Lade Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);

    if (!emailConfig) {
      console.error('❌ Keine Email-Reading-Konfiguration gefunden');
      process.exit(1);
    }

    // Erstelle Email-Service
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    // Hole ALLE Emails (auch gelesene) - wir müssen die Filter anpassen
    // Für diesen Test holen wir alle Emails und filtern manuell
    const allEmails = await emailService.fetchUnreadEmails();

    // Finde Hostelworld und Airbnb Emails
    const hostelworldEmails = allEmails.filter(e => 
      e.subject.toLowerCase().includes('hostelworld') || 
      e.text.toLowerCase().includes('hostelworld')
    ).filter(e => !e.text.toLowerCase().includes('cancelada')); // Keine Stornierungen

    const airbnbEmails = allEmails.filter(e => 
      (e.subject.toLowerCase().includes('airbnb') || 
       e.text.toLowerCase().includes('airbnb')) &&
      !e.text.toLowerCase().includes('cancelada')
    );

    console.log(`📧 Gefunden: ${hostelworldEmails.length} Hostelworld-Email(s), ${airbnbEmails.length} Airbnb-Email(s)\n`);

    // Teste Hostelworld
    if (hostelworldEmails.length > 0) {
      console.log('=== HOSTELWORLD EMAIL TEST ===\n');
      const email = hostelworldEmails[0];
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.from}\n`);

      const parsed = EmailReservationParser.parseReservationEmail(email.text, email.html);
      if (parsed) {
        console.log('✅ Parsing erfolgreich!');
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log('❌ Parsing fehlgeschlagen');
        console.log('\nEmail-Text (erste 1000 Zeichen):');
        console.log(email.text.substring(0, 1000));
      }
      console.log('\n');
    }

    // Teste Airbnb
    if (airbnbEmails.length > 0) {
      console.log('=== AIRBNB EMAIL TEST ===\n');
      const email = airbnbEmails[0];
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.from}\n`);

      const parsed = EmailReservationParser.parseReservationEmail(email.text, email.html);
      if (parsed) {
        console.log('✅ Parsing erfolgreich!');
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log('❌ Parsing fehlgeschlagen');
        console.log('\nEmail-Text (erste 1000 Zeichen):');
        console.log(email.text.substring(0, 1000));
      }
      console.log('\n');
    }

    emailService.disconnect();

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testHostelworldAirbnbParsing();

