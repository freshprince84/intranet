/**
 * Script zum Aktivieren von Email-Reading für Organisation 1 (La Familia Hostel)
 * 
 * Dieses Script aktiviert Email-Reading, wenn es bereits konfiguriert, aber deaktiviert ist.
 * Oder es erstellt eine Standard-Konfiguration (ohne Passwort - muss separat gesetzt werden).
 * 
 * Verwendung:
 *   npx ts-node scripts/enable-email-reading-org1.ts
 * 
 * WICHTIG: Wenn Email-Reading noch nicht konfiguriert ist, muss das Passwort
 * separat über setup-email-reading-la-familia.ts gesetzt werden.
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function enableEmailReading() {
  try {
    const organizationId = 1; // La Familia Hostel

    console.log('📧 Aktiviere Email-Reading für Organisation 1 (La Familia Hostel)...\n');

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

    // Standard-Konfiguration (ohne Passwort - muss separat gesetzt werden)
    const defaultEmailReadingConfig = {
      enabled: true, // STANDARD: IMMER aktiviert für Organisation 1
      provider: 'imap' as const,
      imap: {
        host: 'mail.lafamilia-hostel.com',
        port: 993,
        secure: true,
        user: 'office@lafamilia-hostel.com',
        password: '', // Passwort muss separat gesetzt werden
        folder: 'INBOX',
        processedFolder: 'Processed'
      },
      filters: {
        from: ['notification@lobbybookings.com'],
        subject: ['Nueva reserva', 'New reservation']
      }
    };

    let updatedEmailReading;

    if (emailReading) {
      // Email-Reading existiert bereits
      if (emailReading.enabled) {
        console.log('✅ Email-Reading ist bereits aktiviert');
        console.log('\n📋 Aktuelle Konfiguration:');
        console.log(`   IMAP Host: ${emailReading.imap?.host || 'NICHT GESETZT'}`);
        console.log(`   IMAP User: ${emailReading.imap?.user || 'NICHT GESETZT'}`);
        console.log(`   From Filter: ${emailReading.filters?.from?.join(', ') || 'KEIN FILTER'}`);
        console.log(`   Subject Filter: ${emailReading.filters?.subject?.join(', ') || 'KEIN FILTER'}`);
        return; // Bereits aktiviert, nichts zu tun
      } else {
        // Email-Reading ist deaktiviert - aktiviere es
        console.log('⚠️ Email-Reading ist deaktiviert - aktiviere es...');
        updatedEmailReading = {
          ...emailReading,
          enabled: true // STANDARD: IMMER aktiviert für Organisation 1
        };
      }
    } else {
      // Email-Reading nicht konfiguriert - erstelle Standard-Konfiguration
      console.log('⚠️ Email-Reading nicht konfiguriert - erstelle Standard-Konfiguration');
      console.log('   ⚠️ WICHTIG: Passwort muss separat über setup-email-reading-la-familia.ts gesetzt werden!');
      updatedEmailReading = defaultEmailReadingConfig;
    }

    // Merge mit bestehenden Settings
    const updatedSettings = {
      ...currentSettings,
      emailReading: updatedEmailReading
    };

    // Verschlüssele API-Settings (falls Passwort vorhanden)
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(updatedSettings);
      console.log('\n✅ Settings verschlüsselt');
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

    console.log('\n✅ Email-Reading erfolgreich aktiviert!');
    
    if (!emailReading || !emailReading.imap?.password) {
      console.log('\n⚠️ WICHTIG: Passwort ist nicht gesetzt!');
      console.log('   Führe aus: npx ts-node scripts/setup-email-reading-la-familia.ts <password>');
    } else {
      console.log('\n📋 Nächste Schritte:');
      console.log('   1. Teste die Konfiguration mit: POST /api/email-reservations/check');
      console.log('   2. Prüfe den Status mit: GET /api/email-reservations/status');
      console.log('   3. Der Scheduler läuft automatisch alle 10 Minuten');
    }

  } catch (error) {
    console.error('\n❌ Fehler beim Aktivieren von Email-Reading:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
enableEmailReading();

