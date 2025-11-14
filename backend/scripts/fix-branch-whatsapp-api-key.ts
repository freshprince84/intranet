import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings, encryptApiSettings } from '../src/utils/encryption';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixBranchWhatsAppApiKey() {
  try {
    console.log('🔧 Korrigiere Branch WhatsApp API Key\n');
    console.log('='.repeat(60));

    // 1. Lade Organization Settings
    console.log('\n1. Lade Organization Settings...');
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });

    if (!organization?.settings) {
      throw new Error('Keine Settings in Organisation gefunden');
    }

    const orgSettings = decryptApiSettings(organization.settings as any);
    const orgWhatsapp = orgSettings?.whatsapp;

    if (!orgWhatsapp?.apiKey) {
      throw new Error('Kein API Key in Organisation gefunden');
    }

    console.log(`✅ API Key gefunden in Organisation ${organization.name}`);
    console.log(`   - API Key Länge: ${String(orgWhatsapp.apiKey).length} Zeichen`);

    // 2. Lade Branch Settings
    console.log('\n2. Lade Branch Settings...');
    const branch = await prisma.branch.findUnique({
      where: { id: 2 }, // Manila
      select: {
        id: true,
        name: true,
        whatsappSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch Manila nicht gefunden');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);

    // 3. Aktualisiere Branch Settings mit API Key
    console.log('\n3. Aktualisiere Branch Settings...');
    
    const currentBranchSettings = (branch.whatsappSettings || {}) as any;
    
    const updatedBranchSettings = {
      provider: orgWhatsapp.provider || currentBranchSettings.provider || 'whatsapp-business-api',
      apiKey: orgWhatsapp.apiKey, // Verwende API Key aus Organisation
      apiSecret: orgWhatsapp.apiSecret || currentBranchSettings.apiSecret,
      phoneNumberId: orgWhatsapp.phoneNumberId || currentBranchSettings.phoneNumberId || '852832151250618',
      businessAccountId: orgWhatsapp.businessAccountId || currentBranchSettings.businessAccountId
    };

    console.log('   - Neue Settings:');
    console.log(`     - Provider: ${updatedBranchSettings.provider}`);
    console.log(`     - API Key vorhanden: ${!!updatedBranchSettings.apiKey}`);
    console.log(`     - Phone Number ID: ${updatedBranchSettings.phoneNumberId}`);

    // Verschlüssele Settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptApiSettings(updatedBranchSettings);
      console.log('   ✅ Settings verschlüsselt');
    } catch (error) {
      console.log('   ⚠️  Verschlüsselung fehlgeschlagen, speichere unverschlüsselt');
      encryptedSettings = updatedBranchSettings;
    }

    // 4. Speichere in Branch
    await prisma.branch.update({
      where: { id: branch.id },
      data: {
        whatsappSettings: encryptedSettings
      }
    });

    console.log(`\n✅ Branch WhatsApp Settings aktualisiert!`);

    // 5. Verifiziere
    console.log('\n4. Verifiziere...');
    const updatedBranch = await prisma.branch.findUnique({
      where: { id: branch.id },
      select: {
        whatsappSettings: true
      }
    });

    if (updatedBranch?.whatsappSettings) {
      const settings = updatedBranch.whatsappSettings as any;
      console.log(`   - API Key vorhanden: ${!!settings.apiKey}`);
      if (settings.apiKey) {
        const apiKeyStr = String(settings.apiKey);
        console.log(`   - API Key Länge: ${apiKeyStr.length} Zeichen`);
        console.log(`   - API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
      }
    }

    console.log('\n✅ Korrektur abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixBranchWhatsAppApiKey();

