/**
 * Script zum Einrichten der Email-Reading-Konfiguration für eine Organisation
 * 
 * Verwendung:
 *   npx ts-node scripts/setup-email-reading.ts <organizationId> <imapHost> <imapPort> <imapUser> <imapPassword> [processedFolder]
 * 
 * Beispiel:
 *   npx ts-node scripts/setup-email-reading.ts 1 imap.gmail.com 993 user@example.com password123 Processed
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

interface EmailReadingConfig {
  enabled: boolean;
  provider: 'imap';
  imap: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    folder: string;
    processedFolder?: string;
  };
  filters?: {
    from?: string[];
    subject?: string[];
  };
}

async function setupEmailReading() {
  try {
    // Parse Command-Line-Arguments
    const args = process.argv.slice(2);
    
    if (args.length < 5) {
      console.error('❌ Fehlende Argumente!');
      console.log('\nVerwendung:');
      console.log('  npx ts-node scripts/setup-email-reading.ts <organizationId> <imapHost> <imapPort> <imapUser> <imapPassword> [processedFolder] [fromFilter] [subjectFilter]');
      console.log('\nBeispiel:');
      console.log('  npx ts-node scripts/setup-email-reading.ts 1 imap.gmail.com 993 user@example.com password123 Processed "notification@lobbybookings.com" "Nueva reserva"');
      process.exit(1);
    }

    const organizationId = parseInt(args[0], 10);
    const imapHost = args[1];
    const imapPort = parseInt(args[2], 10);
    const imapUser = args[3];
    const imapPassword = args[4];
    const processedFolder = args[5] || undefined;
    const fromFilter = args[6] ? [args[6]] : ['notification@lobbybookings.com'];
    const subjectFilter = args[7] ? [args[7]] : ['Nueva reserva', 'New reservation'];

    if (isNaN(organizationId)) {
      console.error('❌ Ungültige Organisation-ID:', args[0]);
      process.exit(1);
    }

    if (isNaN(imapPort)) {
      console.error('❌ Ungültiger IMAP-Port:', args[2]);
      process.exit(1);
    }

    console.log('📧 Email-Reading-Konfiguration einrichten...');
    console.log(`   Organisation ID: ${organizationId}`);
    console.log(`   IMAP Host: ${imapHost}`);
    console.log(`   IMAP Port: ${imapPort}`);
    console.log(`   IMAP User: ${imapUser}`);
    console.log(`   Processed Folder: ${processedFolder || 'nicht gesetzt'}`);
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
    const emailReadingConfig: EmailReadingConfig = {
      enabled: true,
      provider: 'imap',
      imap: {
        host: imapHost,
        port: imapPort,
        secure: imapPort === 993, // TLS/SSL für Port 993
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
    const encryptedSettings = encryptApiSettings(updatedSettings);

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

  } catch (error) {
    console.error('❌ Fehler beim Einrichten der Email-Reading-Konfiguration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
setupEmailReading();

