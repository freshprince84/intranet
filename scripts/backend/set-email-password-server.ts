/**
 * Script zum Setzen des Email-Reading-Passworts auf dem Server
 * für Organisation 1 (La Familia Hostel)
 * 
 * Verwendung:
 *   npx ts-node scripts/set-email-password-server.ts <password>
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function setEmailPassword() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('❌ Fehlende Argumente!');
      console.log('\nVerwendung:');
      console.log('  npx ts-node scripts/set-email-password-server.ts <password>');
      process.exit(1);
    }

    const password = args[0];
    const organizationId = 1; // La Familia Hostel

    console.log('📧 Setze Email-Reading-Passwort für Organisation 1 (La Familia Hostel)...\n');

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

    // Lade aktuelle Settings
    const currentSettings = (organization.settings || {}) as any;
    const emailReading = currentSettings.emailReading;

    if (!emailReading) {
      console.error('❌ Email-Reading ist nicht konfiguriert. Führe zuerst enable-email-reading-org1.ts aus!');
      process.exit(1);
    }

    // Aktualisiere Passwort
    emailReading.imap = {
      ...emailReading.imap,
      password: password
    };

    // Stelle sicher, dass enabled: true ist
    emailReading.enabled = true;

    // Merge mit bestehenden Settings
    const updatedSettings = {
      ...currentSettings,
      emailReading: emailReading
    };

    // Verschlüssele API-Settings
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

    console.log('\n✅ Email-Reading-Passwort erfolgreich gesetzt!');
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. Teste die Konfiguration mit: POST /api/email-reservations/check');
    console.log('   2. Prüfe den Status mit: GET /api/email-reservations/status');
    console.log('   3. Der Scheduler läuft automatisch alle 10 Minuten');

  } catch (error) {
    console.error('\n❌ Fehler beim Setzen des Passworts:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
setEmailPassword();

