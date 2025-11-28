/**
 * Script zum Auslesen des Email-Reading-Passworts aus der Produktivserver-Datenbank
 * für Organisation 1 (La Familia Hostel) - contact-manila@lafamilia-hostel.com
 * 
 * Verwendung auf dem Produktivserver:
 * cd /var/www/intranet/backend
 * npx ts-node scripts/get-email-password-server.ts
 */

import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function getEmailPassword() {
  try {
    const organizationId = 1; // La Familia Hostel

    console.log('📧 Lese Email-Reading-Passwort aus Produktivserver-Datenbank...\n');
    console.log(`   Organisation ID: ${organizationId}\n`);

    // Hole Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, displayName: true, settings: true }
    });

    if (!organization) {
      console.error(`❌ Organisation mit ID ${organizationId} nicht gefunden`);
      process.exit(1);
    }

    console.log(`✅ Organisation gefunden: ${organization.displayName || organization.name}\n`);

    // Lade Settings
    const settings = organization.settings as any;
    
    if (!settings || !settings.emailReading) {
      console.error('❌ Email-Reading ist nicht konfiguriert');
      process.exit(1);
    }

    console.log('📋 Email-Reading-Konfiguration gefunden');
    console.log(`   Enabled: ${settings.emailReading.enabled}`);
    console.log(`   Provider: ${settings.emailReading.provider}`);
    console.log(`   IMAP Host: ${settings.emailReading.imap?.host || 'N/A'}`);
    console.log(`   IMAP User: ${settings.emailReading.imap?.user || 'N/A'}\n`);

    // Entschlüssele Settings
    let decryptedSettings;
    try {
      decryptedSettings = decryptApiSettings(settings);
      console.log('✅ Settings erfolgreich entschlüsselt\n');
    } catch (error) {
      console.error('❌ Fehler beim Entschlüsseln der Settings:', error);
      if (error instanceof Error) {
        console.error('   Fehlermeldung:', error.message);
      }
      process.exit(1);
    }

    const emailReading = decryptedSettings.emailReading;
    const password = emailReading?.imap?.password;

    if (!password) {
      console.error('❌ Passwort ist nicht gesetzt');
      process.exit(1);
    }

    // Ausgabe des Passworts
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ PASSWORT GEFUNDEN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📧 Email-Adresse: ${emailReading.imap?.user || 'N/A'}`);
    console.log(`🔑 Passwort: ${password}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
getEmailPassword();
















