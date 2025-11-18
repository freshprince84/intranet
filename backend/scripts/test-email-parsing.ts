/**
 * Script zum Testen des Email-Parsings mit einer echten Email
 */

import { EmailReservationParser } from '../src/services/emailReservationParser';
import { EmailReadingService } from '../src/services/emailReadingService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testEmailParsing() {
  try {
    console.log('🔍 Teste Email-Parsing...\n');

    // Lade Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);

    if (!emailConfig) {
      console.error('❌ Keine Email-Reading-Konfiguration gefunden');
      process.exit(1);
    }

    // Erstelle Email-Service
    const emailService = new EmailReadingService(emailConfig);
    await emailService.connect();

    // Hole die erste ungelesene Email
    const emails = await emailService.fetchUnreadEmails({
      from: ['notification@lobbybookings.com'],
      subject: ['Nueva reserva', 'New reservation']
    });

    if (emails.length === 0) {
      console.log('❌ Keine Emails gefunden');
      emailService.disconnect();
      process.exit(1);
    }

    const email = emails[0];
    console.log('📧 Teste Parsing für erste Email:\n');
    console.log(`From: ${email.from}`);
    console.log(`Subject: ${email.subject}\n`);

    // Teste Parsing mit Text
    console.log('=== Parsing mit TEXT ===');
    const parsedText = EmailReservationParser.parseReservationEmail(email.text);
    if (parsedText) {
      console.log('✅ Parsing erfolgreich!');
      console.log(JSON.stringify(parsedText, null, 2));
    } else {
      console.log('❌ Parsing fehlgeschlagen mit Text');
    }

    console.log('\n=== Parsing mit HTML ===');
    if (email.html) {
      const parsedHtml = EmailReservationParser.parseReservationEmail(email.html);
      if (parsedHtml) {
        console.log('✅ Parsing erfolgreich!');
        console.log(JSON.stringify(parsedHtml, null, 2));
      } else {
        console.log('❌ Parsing fehlgeschlagen mit HTML');
      }
    }

    emailService.disconnect();

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailParsing();

