/**
 * Interaktives Script zum Einrichten der Email-Reading-Konfiguration
 * Fragt nach allen erforderlichen Daten
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

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

// Erstelle readline Interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEmailReadingInteractive() {
  try {
    console.log('📧 Email-Reading-Konfiguration für Organisation 1\n');
    console.log('Dieses Script richtet die Email-Reading-Konfiguration ein.\n');

    // Prüfe ob Organisation existiert
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { id: true, name: true, displayName: true, settings: true }
    });

    if (!organization) {
      console.error('❌ Organisation mit ID 1 nicht gefunden');
      process.exit(1);
    }

    console.log(`✅ Organisation gefunden: ${organization.displayName || organization.name}\n`);

    // Frage nach IMAP-Daten
    console.log('=== IMAP-Konfiguration ===\n');

    const imapHost = await question('IMAP Host (z.B. imap.gmail.com): ');
    if (!imapHost) {
      console.error('❌ IMAP Host ist erforderlich');
      process.exit(1);
    }

    const imapPortStr = await question('IMAP Port (993 für SSL, 143 für TLS) [993]: ');
    const imapPort = imapPortStr ? parseInt(imapPortStr, 10) : 993;
    if (isNaN(imapPort)) {
      console.error('❌ Ungültiger Port');
      process.exit(1);
    }

    const imapUser = await question('Email-Adresse / Benutzername: ');
    if (!imapUser) {
      console.error('❌ Email-Adresse ist erforderlich');
      process.exit(1);
    }

    const imapPassword = await question('Passwort / App-Passwort: ');
    if (!imapPassword) {
      console.error('❌ Passwort ist erforderlich');
      process.exit(1);
    }

    const processedFolder = await question('Processed Folder (optional, Enter für keine) [Processed]: ');
    const finalProcessedFolder = processedFolder || 'Processed';

    // Frage nach Filtern
    console.log('\n=== Filter-Konfiguration ===\n');

    const fromFilterStr = await question('From-Filter (kommagetrennt, Enter für Standard) [notification@lobbybookings.com]: ');
    const fromFilter = fromFilterStr 
      ? fromFilterStr.split(',').map(f => f.trim()).filter(f => f.length > 0)
      : ['notification@lobbybookings.com'];

    const subjectFilterStr = await question('Subject-Filter (kommagetrennt, Enter für Standard) [Nueva reserva,New reservation]: ');
    const subjectFilter = subjectFilterStr
      ? subjectFilterStr.split(',').map(f => f.trim()).filter(f => f.length > 0)
      : ['Nueva reserva', 'New reservation'];

    // Zusammenfassung
    console.log('\n=== Zusammenfassung ===\n');
    console.log(`Organisation: ${organization.displayName || organization.name}`);
    console.log(`IMAP Host: ${imapHost}`);
    console.log(`IMAP Port: ${imapPort}`);
    console.log(`IMAP User: ${imapUser}`);
    console.log(`Processed Folder: ${finalProcessedFolder || 'nicht gesetzt'}`);
    console.log(`From Filter: ${fromFilter.join(', ')}`);
    console.log(`Subject Filter: ${subjectFilter.join(', ')}`);

    const confirm = await question('\nKonfiguration speichern? (j/n) [j]: ');
    if (confirm.toLowerCase() !== 'n' && confirm.toLowerCase() !== 'no') {
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
          processedFolder: finalProcessedFolder || undefined
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
      } catch (error) {
        console.warn('⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt (nur für Development)');
        encryptedSettings = updatedSettings;
      }

      // Aktualisiere Organisation
      await prisma.organization.update({
        where: { id: 1 },
        data: {
          settings: encryptedSettings
        }
      });

      console.log('\n✅ Email-Reading-Konfiguration erfolgreich eingerichtet!');
      console.log('\n📋 Nächste Schritte:');
      console.log('   1. Teste die Konfiguration mit: POST /api/email-reservations/check');
      console.log('   2. Prüfe den Status mit: GET /api/email-reservations/status');
      console.log('   3. Der Scheduler läuft automatisch alle 10 Minuten');
    } else {
      console.log('\n❌ Abgebrochen');
    }

  } catch (error) {
    console.error('\n❌ Fehler beim Einrichten der Email-Reading-Konfiguration:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Führe Script aus
setupEmailReadingInteractive();

