import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { encryptApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function setupSMTP() {
  try {
    const organizationId = 1; // La Familia Hostel

    console.log('📧 Konfiguriere SMTP-Einstellungen für Organisation 1 (La Familia Hostel)...\n');

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

    // SMTP-Einstellungen (verwende gleiche Email wie Email-Reading)
    const smtpHost = 'mail.lafamilia-hostel.com';
    const smtpPort = 587; // Port 587 für STARTTLS, 465 für SSL
    const smtpUser = 'contact-manila@lafamilia-hostel.com';
    const smtpPass = 'Contact-manila123!LaFamilia123!'; // Gleiches Passwort wie Email-Reading
    const smtpFromEmail = 'contact-manila@lafamilia-hostel.com';
    const smtpFromName = organization.displayName || 'La Familia Hostel';

    console.log('📋 SMTP-Einstellungen:');
    console.log(`   Host: ${smtpHost}`);
    console.log(`   Port: ${smtpPort}`);
    console.log(`   User: ${smtpUser}`);
    console.log(`   Pass: ***`);
    console.log(`   From Email: ${smtpFromEmail}`);
    console.log(`   From Name: ${smtpFromName}\n`);

    // Merge SMTP-Einstellungen mit bestehenden Settings
    const updatedSettings = {
      ...currentSettings,
      smtpHost: smtpHost,
      smtpPort: smtpPort,
      smtpUser: smtpUser,
      smtpPass: smtpPass,
      smtpFromEmail: smtpFromEmail,
      smtpFromName: smtpFromName
    };

    // Verschlüssele Settings (Passwort wird verschlüsselt)
    const encryptedSettings = encryptApiSettings(updatedSettings);

    // Aktualisiere Organisation
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: encryptedSettings
      }
    });

    console.log('✅ SMTP-Einstellungen erfolgreich konfiguriert!\n');
    console.log('📋 Nächste Schritte:');
    console.log('   1. Teste die SMTP-Konfiguration mit einem Test-Email-Versand');
    console.log('   2. Prüfe, ob Email-Versand für Reservationen jetzt funktioniert');

  } catch (error) {
    console.error('❌ Fehler beim Konfigurieren der SMTP-Einstellungen:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupSMTP();

