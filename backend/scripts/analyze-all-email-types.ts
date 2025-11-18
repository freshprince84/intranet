/**
 * Script zum Analysieren aller Email-Typen (Booking, Hostelworld, Airbnb)
 */

import { EmailReadingService } from '../src/services/emailReadingService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function analyzeEmailTypes() {
  try {
    console.log('🔍 Analysiere alle Email-Typen...\n');

    // Lade Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);

    if (!emailConfig) {
      console.error('❌ Keine Email-Reading-Konfiguration gefunden');
      process.exit(1);
    }

    // Erstelle Email-Service
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    // Hole ALLE ungelesenen Emails (ohne Filter)
    const allEmails = await emailService.fetchUnreadEmails();

    console.log(`📧 Gesamt: ${allEmails.length} ungelesene Email(s)\n`);

    // Analysiere nach Betreff
    const bookingEmails = allEmails.filter(e => 
      e.subject.toLowerCase().includes('booking') || 
      e.text.toLowerCase().includes('booking.com')
    );
    
    const hostelworldEmails = allEmails.filter(e => 
      e.subject.toLowerCase().includes('hostelworld') || 
      e.text.toLowerCase().includes('hostelworld')
    );
    
    const airbnbEmails = allEmails.filter(e => 
      e.subject.toLowerCase().includes('airbnb') || 
      e.text.toLowerCase().includes('airbnb')
    );

    const otherEmails = allEmails.filter(e => 
      !e.subject.toLowerCase().includes('booking') &&
      !e.subject.toLowerCase().includes('hostelworld') &&
      !e.subject.toLowerCase().includes('airbnb') &&
      (e.subject.toLowerCase().includes('reserva') || 
       e.subject.toLowerCase().includes('reservation'))
    );

    console.log('=== EMAIL-STATISTIK ===\n');
    console.log(`Booking.com: ${bookingEmails.length} Email(s)`);
    console.log(`Hostelworld: ${hostelworldEmails.length} Email(s)`);
    console.log(`Airbnb: ${airbnbEmails.length} Email(s)`);
    console.log(`Andere Reservation-Emails: ${otherEmails.length} Email(s)`);
    console.log(`Gesamt: ${allEmails.length} Email(s)\n`);

    // Zeige Beispiel-Emails
    if (hostelworldEmails.length > 0) {
      console.log('=== HOSTELWORLD EMAIL BEISPIEL ===\n');
      const example = hostelworldEmails[0];
      console.log(`Subject: ${example.subject}`);
      console.log(`From: ${example.from}`);
      console.log(`Text (erste 500 Zeichen):`);
      console.log(example.text.substring(0, 500));
      console.log('\n...\n');
    }

    if (airbnbEmails.length > 0) {
      console.log('=== AIRBNB EMAIL BEISPIEL ===\n');
      const example = airbnbEmails[0];
      console.log(`Subject: ${example.subject}`);
      console.log(`From: ${example.from}`);
      console.log(`Text (erste 500 Zeichen):`);
      console.log(example.text.substring(0, 500));
      console.log('\n...\n');
    }

    if (otherEmails.length > 0) {
      console.log('=== ANDERE RESERVATION-EMAILS ===\n');
      otherEmails.slice(0, 3).forEach((email, index) => {
        console.log(`${index + 1}. Subject: ${email.subject}`);
        console.log(`   From: ${email.from}`);
        console.log(`   Text (erste 200 Zeichen): ${email.text.substring(0, 200)}...\n`);
      });
    }

    emailService.disconnect();

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeEmailTypes();

