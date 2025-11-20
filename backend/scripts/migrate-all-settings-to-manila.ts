/**
 * Data-Migration: Migriert ALLE Settings von Organization zu Branch "Manila"
 * 
 * Überträgt:
 * - LobbyPMS Settings (Organization.settings.lobbyPms → Branch.lobbyPmsSettings)
 * - Bold Payment Settings (Organization.settings.boldPayment → Branch.boldPaymentSettings)
 * - TTLock/Door System Settings (Organization.settings.doorSystem → Branch.doorSystemSettings)
 * - Email Settings (Organization.settings.smtp* + imap → Branch.emailSettings)
 * 
 * WICHTIG: Diese Migration muss NACH den Schema-Migrationen ausgeführt werden!
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { decryptApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function migrateAllSettingsToManila() {
  try {
    console.log('🚀 Migriere ALLE Settings von Organization zu Branch "Manila"...\n');

    // 1. Lade Organisation 1
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation gefunden: ${organization.displayName}`);

    // 2. Lade Branch "Manila" in Organisation 1
    const branch = await prisma.branch.findFirst({
      where: {
        name: 'Manila',
        organizationId: 1
      }
    });

    if (!branch) {
      throw new Error('Branch "Manila" in Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})\n`);

    // 3. Entschlüssele Organization Settings
    let orgSettings: any;
    try {
      orgSettings = decryptApiSettings(organization.settings as any);
      console.log('✅ Organization Settings entschlüsselt\n');
    } catch (error) {
      console.log('⚠️  Konnte Settings nicht entschlüsseln, verwende direkt');
      orgSettings = organization.settings as any;
    }

    const updateData: any = {};
    let hasAnySettings = false;

    // 4. LobbyPMS Settings
    if (orgSettings?.lobbyPms) {
      const lobbyPmsSettings = orgSettings.lobbyPms;
      if (lobbyPmsSettings.apiKey || lobbyPmsSettings.apiUrl) {
        console.log('📋 LobbyPMS Settings gefunden:');
        console.log(`   - API URL: ${lobbyPmsSettings.apiUrl || 'nicht gesetzt'}`);
        console.log(`   - API Key vorhanden: ${!!lobbyPmsSettings.apiKey}`);
        console.log(`   - Property ID: ${lobbyPmsSettings.propertyId || 'nicht gesetzt'}`);
        
        try {
          updateData.lobbyPmsSettings = encryptBranchApiSettings(lobbyPmsSettings);
          hasAnySettings = true;
          console.log('   ✅ Verschlüsselt und bereit zum Speichern\n');
        } catch (error) {
          console.log('   ⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt\n');
          updateData.lobbyPmsSettings = lobbyPmsSettings;
          hasAnySettings = true;
        }
      }
    }

    // 5. Bold Payment Settings
    if (orgSettings?.boldPayment) {
      const boldPaymentSettings = orgSettings.boldPayment;
      if (boldPaymentSettings.apiKey || boldPaymentSettings.merchantId) {
        console.log('📋 Bold Payment Settings gefunden:');
        console.log(`   - API Key vorhanden: ${!!boldPaymentSettings.apiKey}`);
        console.log(`   - Merchant ID vorhanden: ${!!boldPaymentSettings.merchantId}`);
        console.log(`   - Environment: ${boldPaymentSettings.environment || 'nicht gesetzt'}`);
        
        try {
          updateData.boldPaymentSettings = encryptBranchApiSettings(boldPaymentSettings);
          hasAnySettings = true;
          console.log('   ✅ Verschlüsselt und bereit zum Speichern\n');
        } catch (error) {
          console.log('   ⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt\n');
          updateData.boldPaymentSettings = boldPaymentSettings;
          hasAnySettings = true;
        }
      }
    }

    // 6. TTLock/Door System Settings
    if (orgSettings?.doorSystem) {
      const doorSystemSettings = orgSettings.doorSystem;
      if (doorSystemSettings.clientId || doorSystemSettings.username) {
        console.log('📋 TTLock/Door System Settings gefunden:');
        console.log(`   - Client ID vorhanden: ${!!doorSystemSettings.clientId}`);
        console.log(`   - Username vorhanden: ${!!doorSystemSettings.username}`);
        console.log(`   - Lock IDs: ${doorSystemSettings.lockIds?.length || 0}`);
        
        try {
          updateData.doorSystemSettings = encryptBranchApiSettings(doorSystemSettings);
          hasAnySettings = true;
          console.log('   ✅ Verschlüsselt und bereit zum Speichern\n');
        } catch (error) {
          console.log('   ⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt\n');
          updateData.doorSystemSettings = doorSystemSettings;
          hasAnySettings = true;
        }
      }
    }

    // 7. Email Settings (SMTP + IMAP)
    const emailSettings: any = {};
    let hasEmailSettings = false;

    // SMTP Settings
    if (orgSettings?.smtpHost || orgSettings?.smtpUser) {
      console.log('📋 SMTP Settings gefunden:');
      console.log(`   - SMTP Host: ${orgSettings.smtpHost || 'nicht gesetzt'}`);
      console.log(`   - SMTP Port: ${orgSettings.smtpPort || 'nicht gesetzt'}`);
      console.log(`   - SMTP User: ${orgSettings.smtpUser || 'nicht gesetzt'}`);
      console.log(`   - SMTP From Email: ${orgSettings.smtpFromEmail || 'nicht gesetzt'}`);
      console.log(`   - SMTP From Name: ${orgSettings.smtpFromName || 'nicht gesetzt'}`);
      
      emailSettings.smtpHost = orgSettings.smtpHost;
      emailSettings.smtpPort = orgSettings.smtpPort;
      emailSettings.smtpUser = orgSettings.smtpUser;
      emailSettings.smtpPass = orgSettings.smtpPass; // Wird verschlüsselt
      emailSettings.smtpFromEmail = orgSettings.smtpFromEmail;
      emailSettings.smtpFromName = orgSettings.smtpFromName;
      hasEmailSettings = true;
    }

    // IMAP Settings (falls vorhanden)
    if (orgSettings?.imap) {
      console.log('📋 IMAP Settings gefunden:');
      console.log(`   - IMAP Host: ${orgSettings.imap.host || 'nicht gesetzt'}`);
      console.log(`   - IMAP User: ${orgSettings.imap.user || 'nicht gesetzt'}`);
      
      emailSettings.imap = {
        enabled: orgSettings.imap.enabled || false,
        host: orgSettings.imap.host,
        port: orgSettings.imap.port,
        secure: orgSettings.imap.secure !== false, // Default: true
        user: orgSettings.imap.user,
        password: orgSettings.imap.password, // Wird verschlüsselt
        folder: orgSettings.imap.folder || 'INBOX',
        processedFolder: orgSettings.imap.processedFolder
      };
      hasEmailSettings = true;
    }

    if (hasEmailSettings) {
      try {
        updateData.emailSettings = encryptBranchApiSettings(emailSettings);
        hasAnySettings = true;
        console.log('   ✅ Email Settings verschlüsselt und bereit zum Speichern\n');
      } catch (error) {
        console.log('   ⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt\n');
        updateData.emailSettings = emailSettings;
        hasAnySettings = true;
      }
    }

    // 8. Prüfe ob überhaupt Settings gefunden wurden
    if (!hasAnySettings) {
      console.log('⚠️  Keine Settings in Organisation gefunden. Überspringe Migration.');
      return;
    }

    // 9. Speichere alle Settings in Branch
    console.log('💾 Speichere Settings in Branch "Manila"...\n');
    
    await prisma.branch.update({
      where: { id: branch.id },
      data: updateData
    });

    console.log('✅ Alle Settings erfolgreich zu Branch "Manila" migriert!');
    console.log('\n📊 Zusammenfassung:');
    if (updateData.lobbyPmsSettings) console.log('   ✅ LobbyPMS Settings');
    if (updateData.boldPaymentSettings) console.log('   ✅ Bold Payment Settings');
    if (updateData.doorSystemSettings) console.log('   ✅ TTLock/Door System Settings');
    if (updateData.emailSettings) console.log('   ✅ Email Settings (SMTP + IMAP)');
    console.log('\n⚠️  WICHTIG: Prüfe nach Migration, ob alles funktioniert!');

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Migration aus
migrateAllSettingsToManila()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

