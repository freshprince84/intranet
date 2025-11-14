#!/usr/bin/env node
/**
 * Migriert WhatsApp Settings von Organization zu Branch "Manila"
 * 
 * WICHTIG: Dieses Script muss NACH der Migration ausgeführt werden, die Branch.whatsappSettings hinzufügt!
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { decryptApiSettings, encryptApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function migrateWhatsAppSettings() {
  try {
    console.log('🚀 Migriere WhatsApp Settings von Organization zu Branch "Manila"...\n');

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

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);

    // 3. Prüfe ob Branch bereits WhatsApp Settings hat
    if (branch.whatsappSettings) {
      console.log('⚠️  Branch "Manila" hat bereits WhatsApp Settings.');
      const overwrite = process.argv[2] === '--overwrite';
      if (!overwrite) {
        console.log('   Überspringe Migration. Verwende --overwrite um zu überschreiben.');
        return;
      }
      console.log('   Überschreibe bestehende Settings...');
    }

    // 4. Extrahiere WhatsApp Settings aus Organization
    const orgSettings = organization.settings as any;
    
    // Entschlüssele Settings falls verschlüsselt
    let decryptedSettings: any;
    try {
      decryptedSettings = decryptApiSettings(orgSettings);
    } catch (error) {
      // Falls Entschlüsselung fehlschlägt, verwende Settings direkt
      console.log('⚠️  Konnte Settings nicht entschlüsseln, verwende direkt');
      decryptedSettings = orgSettings;
    }

    const whatsappSettings = decryptedSettings?.whatsapp;

    if (!whatsappSettings || !whatsappSettings.apiKey) {
      console.log('⚠️  Keine WhatsApp Settings in Organisation gefunden. Überspringe Migration.');
      return;
    }

    console.log(`✅ WhatsApp Settings gefunden in Organisation:`);
    console.log(`   - Provider: ${whatsappSettings.provider || 'nicht gesetzt'}`);
    console.log(`   - Phone Number ID: ${whatsappSettings.phoneNumberId || 'nicht gesetzt'}`);
    console.log(`   - API Key vorhanden: ${!!whatsappSettings.apiKey}`);
    console.log(`   - API Secret vorhanden: ${!!whatsappSettings.apiSecret}`);
    console.log(`   - Business Account ID: ${whatsappSettings.businessAccountId || 'nicht gesetzt'}`);

    // 5. Verschlüssele WhatsApp Settings für Branch (falls ENCRYPTION_KEY gesetzt)
    let finalSettings: any;
    try {
      // Erstelle Objekt nur mit WhatsApp Settings
      const branchWhatsAppSettings = {
        provider: whatsappSettings.provider,
        apiKey: whatsappSettings.apiKey,
        apiSecret: whatsappSettings.apiSecret,
        phoneNumberId: whatsappSettings.phoneNumberId,
        businessAccountId: whatsappSettings.businessAccountId
      };

      // Versuche zu verschlüsseln (falls ENCRYPTION_KEY gesetzt)
      finalSettings = encryptApiSettings(branchWhatsAppSettings);
    } catch (error) {
      // Falls Verschlüsselung fehlschlägt, speichere unverschlüsselt
      console.log('⚠️  ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt (nur für Development)');
      finalSettings = {
        provider: whatsappSettings.provider,
        apiKey: whatsappSettings.apiKey,
        apiSecret: whatsappSettings.apiSecret,
        phoneNumberId: whatsappSettings.phoneNumberId,
        businessAccountId: whatsappSettings.businessAccountId
      };
    }

    // 6. Speichere WhatsApp Settings in Branch
    await prisma.branch.update({
      where: { id: branch.id },
      data: {
        whatsappSettings: finalSettings
      }
    });

    console.log(`\n✅ WhatsApp Settings erfolgreich zu Branch "Manila" migriert!`);
    console.log(`\n⚠️  WICHTIG: Prüfe nach Migration, ob alles funktioniert!`);
    console.log(`   - Bestehende WhatsApp-Funktionalität sollte weiterhin funktionieren`);
    console.log(`   - Settings sind jetzt in Branch statt Organization`);
    console.log(`\n📝 Nächste Schritte:`);
    console.log(`   1. Teste bestehende WhatsApp-Funktionalität (z.B. Check-in-Einladungen)`);
    console.log(`   2. Stelle sicher, dass WhatsApp Service Branch-Support hat`);
    console.log(`   3. Passe bestehende Aufrufe schrittweise auf Branch-basiert um`);

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateWhatsAppSettings();

