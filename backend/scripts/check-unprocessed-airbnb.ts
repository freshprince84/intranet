/**
 * Script zum Prüfen, ob es noch ungelesene Airbnb-Emails gibt
 */

import { EmailReadingService } from '../src/services/emailReadingService';
import { EmailReservationParser } from '../src/services/emailReservationParser';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkUnprocessedAirbnb() {
  try {
    console.log('🔍 Prüfe ungelesene Airbnb-Emails...\n');

    // Lade Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);

    if (!emailConfig) {
      console.error('❌ Keine Email-Reading-Konfiguration gefunden');
      process.exit(1);
    }

    // Erstelle Email-Service
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    // Hole ALLE ungelesenen Emails von lobbybookings.com
    const allEmails = await emailService.fetchUnreadEmails({
      from: ['notification@lobbybookings.com']
    });

    // Filtere Airbnb-Reservation-Emails (nicht Stornierungen)
    const airbnbEmails = allEmails.filter(e => 
      (e.subject.toLowerCase().includes('airbnb') || 
       e.text.toLowerCase().includes('airbnb')) &&
      !e.text.toLowerCase().includes('cancelada') &&
      !e.text.toLowerCase().includes('cancelled') &&
      e.from.toLowerCase().includes('lobbybookings.com')
    );

    console.log(`📧 Gefunden: ${airbnbEmails.length} ungelesene Airbnb-Reservation-Email(s)\n`);

    if (airbnbEmails.length > 0) {
      console.log('=== AIRBNB EMAILS ===\n');
      airbnbEmails.forEach((email, index) => {
        console.log(`${index + 1}. Subject: ${email.subject}`);
        console.log(`   Date: ${email.date.toLocaleString('de-DE')}`);
        
        // Teste Parsing
        const parsed = EmailReservationParser.parseReservationEmail(email.text, email.html);
        if (parsed) {
          console.log(`   ✅ Parsing: OK - Code: ${parsed.reservationCode}, Gast: ${parsed.guestName}`);
        } else {
          console.log(`   ❌ Parsing: FEHLGESCHLAGEN`);
        }
        console.log('');
      });

      console.log(`\n💡 Diese ${airbnbEmails.length} Airbnb-Email(s) können jetzt verarbeitet werden!`);
      console.log('   Führe aus: npx ts-node scripts/run-email-check.ts');
    } else {
      console.log('ℹ️  Keine ungelesenen Airbnb-Emails gefunden');
      console.log('   (Mögliche Gründe: Alle bereits verarbeitet oder als gelesen markiert)');
    }

    // Prüfe auch Hostelworld
    const hostelworldEmails = allEmails.filter(e => 
      (e.subject.toLowerCase().includes('hostelworld') || 
       e.text.toLowerCase().includes('hostelworld')) &&
      !e.text.toLowerCase().includes('cancelada') &&
      !e.text.toLowerCase().includes('cancelled') &&
      e.from.toLowerCase().includes('lobbybookings.com')
    );

    console.log(`\n📧 Hostelworld: ${hostelworldEmails.length} ungelesene Reservation-Email(s)\n`);

    if (hostelworldEmails.length > 0) {
      console.log('=== HOSTELWORLD EMAILS ===\n');
      hostelworldEmails.slice(0, 3).forEach((email, index) => {
        console.log(`${index + 1}. Subject: ${email.subject}`);
        console.log(`   Date: ${email.date.toLocaleString('de-DE')}`);
        
        // Teste Parsing
        const parsed = EmailReservationParser.parseReservationEmail(email.text, email.html);
        if (parsed) {
          console.log(`   ✅ Parsing: OK - Code: ${parsed.reservationCode}, Gast: ${parsed.guestName}`);
        } else {
          console.log(`   ❌ Parsing: FEHLGESCHLAGEN`);
          console.log(`   Text (erste 300 Zeichen): ${email.text.substring(0, 300)}...`);
        }
        console.log('');
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

checkUnprocessedAirbnb();

