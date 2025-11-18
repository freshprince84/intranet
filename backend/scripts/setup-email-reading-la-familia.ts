/**
 * Script zum Einrichten der Email-Reading-Konfiguration für La Familia Hostel (Organisation 1)
 * 
 * Verwendung:
 *   npx ts-node scripts/setup-email-reading-la-familia.ts <password>
 * 
 * Beispiel:
 *   npx ts-node scripts/setup-email-reading-la-familia.ts "mein-passwort"
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function setupEmailReading() {
  try {
    // Parse Command-Line-Arguments
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('❌ Fehlende Argumente!');
      console.log('\nVerwendung:');
      console.log('  npx ts-node scripts/setup-email-reading-la-familia.ts <password>');
      console.log('\nBeispiel:');
      console.log('  npx ts-node scripts/setup-email-reading-la-familia.ts "mein-passwort"');
      process.exit(1);
    }

    const organizationId = 1;
    const imapHost = 'mail.lafamilia-hostel.com';
    const imapPort = 993;
    const imapUser = 'office@lafamilia-hostel.com';
    const imapPassword = args[0];
    const processedFolder = 'Processed';
    const fromFilter = ['notification@lobbybookings.com'];
    const subjectFilter = ['Nueva reserva', 'New reservation'];

    console.log('📧 Email-Reading-Konfiguration für La Familia Hostel einrichten...');
    console.log(`   Organisation ID: ${organizationId}`);
    console.log(`   IMAP Host: ${imapHost}`);
    console.log(`   IMAP Port: ${imapPort}`);
    console.log(`   IMAP User: ${imapUser}`);
    console.log(`   Processed Folder: ${processedFolder}`);
    console.log(`   From Filter: ${fromFilter.join(', ')}`);
    console.log(`   Subject Filter: ${subjectFilter.join(', ')}`);

    // Prüfe ob Organisation existiert
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, displayName: true, settings: true }
    });

    if (!organization) {
      console.error(`❌ Organisation mit ID ${organizationId} nicht gefunden`);
      process.exit(1);
    }

    console.log(`\n✅ Organisation gefunden: ${organization.displayName || organization.name}`);

    // Lade aktuelle Settings
    const currentSettings = (organization.settings || {}) as any;

    // Erstelle Email-Reading-Konfiguration
    const emailReadingConfig = {
      enabled: true,
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
      console.log('\n✅ Passwort verschlüsselt');
    } catch (error) {
      console.warn('⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt (nur für Development)');
      console.warn('   Stelle sicher, dass ENCRYPTION_KEY in .env gesetzt ist!');
      encryptedSettings = updatedSettings;
    }

    // Aktualisiere Organisation
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('\n✅ Email-Reading-Konfiguration erfolgreich eingerichtet!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Teste die Konfiguration mit: POST /api/email-reservations/check');
    console.log('   2. Prüfe den Status mit: GET /api/email-reservations/status');
    console.log('   3. Der Scheduler läuft automatisch alle 10 Minuten');
    console.log('\n💡 Tipp: Teste zuerst mit /api/email-reservations/parse um das Email-Parsing zu testen');

  } catch (error) {
    console.error('\n❌ Fehler beim Einrichten der Email-Reading-Konfiguration:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
setupEmailReading();

