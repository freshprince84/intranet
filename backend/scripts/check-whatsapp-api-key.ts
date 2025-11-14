import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings } from '../src/utils/encryption';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkWhatsAppApiKey() {
  try {
    console.log('🔍 Prüfe WhatsApp API Key\n');
    console.log('='.repeat(60));

    // 1. Prüfe Organization Settings
    console.log('\n1. Organization WhatsApp Settings:');
    console.log('-'.repeat(60));
    
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });

    if (organization?.settings) {
      const settings = decryptApiSettings(organization.settings as any);
      const whatsapp = settings?.whatsapp;
      
      if (whatsapp) {
        console.log(`✅ WhatsApp Settings gefunden in Organisation ${organization.name}:`);
        console.log(`   - Provider: ${whatsapp.provider || 'nicht gesetzt'}`);
        console.log(`   - API Key vorhanden: ${!!whatsapp.apiKey}`);
        if (whatsapp.apiKey) {
          const apiKeyStr = String(whatsapp.apiKey);
          console.log(`   - API Key Länge: ${apiKeyStr.length} Zeichen`);
          console.log(`   - API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
          console.log(`   - API Key Vorschau: ${apiKeyStr.substring(0, 30)}...`);
        }
        console.log(`   - Phone Number ID: ${whatsapp.phoneNumberId || 'nicht gesetzt'}`);
      } else {
        console.log('❌ Keine WhatsApp Settings in Organisation gefunden');
      }
    } else {
      console.log('❌ Keine Settings in Organisation gefunden');
    }

    // 2. Prüfe Branch Settings
    console.log('\n\n2. Branch WhatsApp Settings:');
    console.log('-'.repeat(60));
    
    const branch = await prisma.branch.findUnique({
      where: { id: 2 }, // Manila
      select: {
        id: true,
        name: true,
        whatsappSettings: true
      }
    });

    if (branch?.whatsappSettings) {
      console.log(`✅ Branch: ${branch.name} (ID: ${branch.id})`);
      const settings = branch.whatsappSettings as any;
      console.log(`   - Raw Settings Type: ${typeof settings}`);
      console.log(`   - Raw Settings Keys: ${Object.keys(settings || {}).join(', ')}`);
      
      // Prüfe ob verschlüsselt
      if (settings.apiKey) {
        const apiKeyStr = String(settings.apiKey);
        console.log(`   - API Key vorhanden: true`);
        console.log(`   - API Key Länge: ${apiKeyStr.length} Zeichen`);
        console.log(`   - API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
        console.log(`   - API Key Vorschau: ${apiKeyStr.substring(0, 30)}...`);
        
        // Versuche zu entschlüsseln
        try {
          const decrypted = decryptApiSettings(settings);
          const decryptedWhatsapp = decrypted?.whatsapp || decrypted;
          if (decryptedWhatsapp?.apiKey) {
            const decryptedKey = String(decryptedWhatsapp.apiKey);
            console.log(`   ✅ Entschlüsselung erfolgreich`);
            console.log(`   - Entschlüsselter API Key Länge: ${decryptedKey.length} Zeichen`);
            console.log(`   - Entschlüsselter API Key Vorschau: ${decryptedKey.substring(0, 30)}...`);
          }
        } catch (error) {
          console.log(`   ⚠️  Entschlüsselung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        }
      } else {
        console.log(`   ❌ API Key fehlt!`);
      }
      
      console.log(`   - Provider: ${settings.provider || 'nicht gesetzt'}`);
      console.log(`   - Phone Number ID: ${settings.phoneNumberId || 'nicht gesetzt'}`);
    } else {
      console.log('❌ Keine WhatsApp Settings im Branch gefunden');
    }

    // 3. Vergleich
    console.log('\n\n3. Vergleich:');
    console.log('-'.repeat(60));
    
    if (organization?.settings && branch?.whatsappSettings) {
      const orgSettings = decryptApiSettings(organization.settings as any);
      const orgWhatsapp = orgSettings?.whatsapp;
      const branchSettings = branch.whatsappSettings as any;
      
      if (orgWhatsapp?.apiKey && !branchSettings.apiKey) {
        console.log('⚠️  API Key in Organisation vorhanden, aber nicht im Branch!');
        console.log('   → Migration möglicherweise unvollständig');
      } else if (orgWhatsapp?.apiKey && branchSettings.apiKey) {
        console.log('✅ API Key in beiden vorhanden');
      } else if (!orgWhatsapp?.apiKey && !branchSettings.apiKey) {
        console.log('❌ API Key fehlt in beiden!');
      }
    }

    console.log('\n✅ Prüfung abgeschlossen!\n');

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

checkWhatsAppApiKey();

