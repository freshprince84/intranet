/**
 * Script zum Testen der Email-Reading-IMAP-Verbindung
 */

import { EmailReadingService } from '../src/services/emailReadingService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testEmailConnection() {
  try {
    console.log('🔍 Teste Email-Reading-IMAP-Verbindung für Organisation 1...\n');

    // Lade Konfiguration
    const emailConfig = await EmailReadingService.loadConfigFromOrganization(1);

    if (!emailConfig) {
      console.error('❌ Keine Email-Reading-Konfiguration für Organisation 1 gefunden');
      console.log('   Bitte zuerst die Konfiguration mit setup-email-reading-la-familia.ts einrichten');
      process.exit(1);
    }

    console.log('✅ Konfiguration geladen:');
    console.log(`   Host: ${emailConfig.host}`);
    console.log(`   Port: ${emailConfig.port}`);
    console.log(`   Secure: ${emailConfig.secure}`);
    console.log(`   User: ${emailConfig.user}`);
    console.log(`   Folder: ${emailConfig.folder}`);
    console.log(`   Processed Folder: ${emailConfig.processedFolder || 'nicht gesetzt'}\n`);

    // Erstelle Email-Service
    const emailService = new EmailReadingService(emailConfig);

    console.log('🔌 Verbinde zum IMAP-Server...');
    await emailService.connect();
    console.log('✅ IMAP-Verbindung erfolgreich!\n');

    console.log('📧 Prüfe auf ungelesene Emails...');
    const emails = await emailService.fetchUnreadEmails({
      from: ['notification@lobbybookings.com'],
      subject: ['Nueva reserva', 'New reservation']
    });

    console.log(`✅ ${emails.length} ungelesene Email(s) gefunden\n`);

    if (emails.length > 0) {
      console.log('📋 Gefundene Emails:');
      emails.forEach((email, index) => {
        console.log(`\n   Email ${index + 1}:`);
        console.log(`   - Message ID: ${email.messageId}`);
        console.log(`   - From: ${email.from}`);
        console.log(`   - Subject: ${email.subject}`);
        console.log(`   - Date: ${email.date.toISOString()}`);
        console.log(`   - Text length: ${email.text.length} Zeichen`);
      });
    } else {
      console.log('ℹ️  Keine neuen Reservation-Emails gefunden');
      console.log('   (Das ist normal, wenn keine neuen Emails vorhanden sind)');
    }

    // Trenne Verbindung
    emailService.disconnect();
    console.log('\n✅ Test erfolgreich abgeschlossen!');

  } catch (error) {
    console.error('\n❌ Fehler beim Testen der Email-Verbindung:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      if (error.message.includes('ENOTFOUND')) {
        console.error('\n💡 Mögliche Ursachen:');
        console.error('   - Falscher IMAP-Host');
        console.error('   - Keine Internetverbindung');
      } else if (error.message.includes('authentication')) {
        console.error('\n💡 Mögliche Ursachen:');
        console.error('   - Falscher Benutzername oder Passwort');
        console.error('   - IMAP nicht aktiviert für dieses Konto');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Mögliche Ursachen:');
        console.error('   - Falscher Port');
        console.error('   - Firewall blockiert Verbindung');
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Test aus
testEmailConnection();

