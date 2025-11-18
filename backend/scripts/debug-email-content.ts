/**
 * Script zum Debuggen des Email-Inhalts
 * Zeigt den tatsächlichen Inhalt einer Email an
 */

import { EmailReadingService } from '../src/services/emailReadingService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugEmailContent() {
  try {
    console.log('🔍 Analysiere Email-Inhalt...\n');

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
    console.log('📧 Analysiere erste Email:\n');
    console.log('=== EMAIL METADATEN ===');
    console.log(`Message ID: ${email.messageId}`);
    console.log(`From: ${email.from}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`Date: ${email.date.toISOString()}\n`);

    console.log('=== EMAIL TEXT (erste 2000 Zeichen) ===');
    console.log(email.text.substring(0, 2000));
    console.log('\n...\n');

    if (email.html) {
      console.log('=== EMAIL HTML (erste 2000 Zeichen) ===');
      console.log(email.html.substring(0, 2000));
      console.log('\n...\n');
    }

    // Speichere vollständigen Inhalt in Datei
    const debugDir = path.join(__dirname, '../debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const debugFile = path.join(debugDir, `email-${Date.now()}.txt`);
    const debugContent = `=== EMAIL METADATEN ===
Message ID: ${email.messageId}
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}

=== EMAIL TEXT ===
${email.text}

=== EMAIL HTML ===
${email.html || 'N/A'}
`;

    fs.writeFileSync(debugFile, debugContent, 'utf-8');
    console.log(`\n💾 Vollständiger Email-Inhalt gespeichert in: ${debugFile}`);

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

debugEmailContent();

