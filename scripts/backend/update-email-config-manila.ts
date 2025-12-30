/**
 * Script zum Aktualisieren der Email-Reading-Konfiguration für La Familia Hostel
 * Neue Email-Adresse: contact-manila@lafamilia-hostel.com
 */
import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function updateEmailConfig() {
  try {
    const organizationId = 1; // La Familia Hostel
    const imapHost = 'mail.lafamilia-hostel.com';
    const imapPort = 993;
    const imapUser = 'contact-manila@lafamilia-hostel.com';
    const imapPassword = 'Contact-manila123!LaFamilia123!';
    const processedFolder = 'Processed';
    const fromFilter = ['notification@lobbybookings.com'];
    const subjectFilter = ['Nueva reserva', 'New reservation'];

    console.log('📧 Aktualisiere Email-Reading-Konfiguration für La Familia Hostel...');
    console.log(`   Organisation ID: ${organizationId}`);
    console.log(`   IMAP Host: ${imapHost}`);
    console.log(`   IMAP Port: ${imapPort}`);
    console.log(`   IMAP User: ${imapUser}`);
    console.log(`   Processed Folder: ${processedFolder}`);
    console.log(`   From Filter: ${fromFilter.join(', ')}`);
    console.log(`   Subject Filter: ${subjectFilter.join(', ')}`);
    console.log('');

    // Prüfe ob Organisation existiert
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, displayName: true, settings: true }
    });

    if (!organization) {
      console.error(`❌ Organisation mit ID ${organizationId} nicht gefunden`);
      process.exit(1);
    }

    console.log(`✅ Organisation gefunden: ${organization.displayName || organization.name}`);
    console.log('');

    // Lade aktuelle Settings
    const currentSettings = (organization.settings || {}) as any;

    // Erstelle Email-Reading-Konfiguration
    const emailReadingConfig = {
      enabled: true, // STANDARD: IMMER aktiviert für Organisation 1
      provider: 'imap' as const,
      imap: {
        host: imapHost,
        port: imapPort,
        secure: true, // Port 993 ist SSL/TLS
        user: imapUser,
        password: imapPassword,
        folder: 'INBOX',
        processedFolder: processedFolder
      },
      filters: {
        from: fromFilter,
        subject: subjectFilter
      }
    };

    // Merge mit bestehenden Settings
    const updatedSettings = {
      ...currentSettings,
      emailReading: emailReadingConfig
    };

    // Verschlüssele API-Settings (Passwort)
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(updatedSettings);
      console.log('✅ Settings verschlüsselt');
    } catch (error) {
      console.error('❌ Fehler beim Verschlüsseln:', error);
      process.exit(1);
    }

    // Aktualisiere Organisation
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('\n✅ Email-Reading-Konfiguration erfolgreich aktualisiert!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Teste die Konfiguration mit: POST /api/email-reservations/check');
    console.log('   2. Prüfe den Status mit: GET /api/email-reservations/status');
    console.log('   3. Der Scheduler läuft automatisch alle 10 Minuten');

  } catch (error) {
    console.error('\n❌ Fehler beim Aktualisieren der Email-Konfiguration:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
updateEmailConfig();

