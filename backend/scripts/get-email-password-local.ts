/**
 * Script zum Auslesen des Email-Reading-Passworts aus der lokalen Datenbank
 * für Organisation 1 (La Familia Hostel)
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

    console.log('📧 Lese Email-Reading-Passwort aus lokaler Datenbank...\n');

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

    // Entschlüssele Settings
    let decryptedSettings;
    try {
      decryptedSettings = decryptApiSettings(settings);
    } catch (error) {
      console.error('❌ Fehler beim Entschlüsseln der Settings:', error);
      process.exit(1);
    }

    const emailReading = decryptedSettings.emailReading;
    const password = emailReading?.imap?.password;

    if (!password) {
      console.error('❌ Passwort ist nicht gesetzt');
      process.exit(1);
    }

    // Ausgabe des Passworts (für Script-Weiterleitung)
    console.log('✅ Passwort gefunden');
    console.log(`Passwort: ${password}`);
    
    // Ausgabe für direkte Verwendung
    process.stdout.write(password);

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
getEmailPassword();

