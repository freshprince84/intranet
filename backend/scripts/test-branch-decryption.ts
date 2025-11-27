/**
 * Script: Testet Entschlüsselung von Branch Settings
 * Führt auf Server aus, um zu beweisen, dass Branch Settings nicht entschlüsselt werden können
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBranchDecryption() {
  try {
    console.log('🔍 Teste Entschlüsselung von Branch Settings...\n');

    // Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY ist nicht korrekt gesetzt!');
    }
    console.log('✅ ENCRYPTION_KEY ist gesetzt');
    console.log(`   Key (erste 20 Zeichen): ${encryptionKey.substring(0, 20)}...\n`);

    // Test Branch 3 (Manila)
    console.log('='.repeat(80));
    console.log('BRANCH 3 (Manila) - Entschlüsselungstest');
    console.log('='.repeat(80));
    
    const branch3 = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { 
        id: true,
        name: true,
        boldPaymentSettings: true,
        lobbyPmsSettings: true,
        doorSystemSettings: true,
        whatsappSettings: true
      }
    });

    if (!branch3) {
      throw new Error('Branch 3 (Manila) nicht gefunden!');
    }

    console.log(`📋 Branch: ${branch3.name} (ID: ${branch3.id})\n`);

    // Bold Payment
    if (branch3.boldPaymentSettings) {
      console.log('🔐 Bold Payment Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch3.boldPaymentSettings as any);
        const boldPayment = decrypted?.boldPayment || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   Merchant ID: ${boldPayment?.merchantId ? boldPayment.merchantId.substring(0, 30) + '...' : 'FEHLT'}`);
        console.log(`   API Key: ${boldPayment?.apiKey ? boldPayment.apiKey.substring(0, 20) + '...' : 'FEHLT'}`);
        console.log(`   Environment: ${boldPayment?.environment || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine Bold Payment Settings vorhanden');
    }
    console.log('');

    // LobbyPMS
    if (branch3.lobbyPmsSettings) {
      console.log('🔐 LobbyPMS Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch3.lobbyPmsSettings as any);
        const lobbyPms = decrypted?.lobbyPms || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   API Key: ${lobbyPms?.apiKey ? lobbyPms.apiKey.substring(0, 30) + '...' : 'FEHLT'}`);
        console.log(`   API URL: ${lobbyPms?.apiUrl || 'nicht gesetzt'}`);
        console.log(`   Property ID: ${lobbyPms?.propertyId || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine LobbyPMS Settings vorhanden');
    }
    console.log('');

    // TTLock
    if (branch3.doorSystemSettings) {
      console.log('🔐 TTLock (Door System) Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch3.doorSystemSettings as any);
        const doorSystem = decrypted?.doorSystem || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   Client ID: ${doorSystem?.clientId ? doorSystem.clientId.substring(0, 20) + '...' : 'FEHLT'}`);
        console.log(`   Client Secret: ${doorSystem?.clientSecret ? doorSystem.clientSecret.substring(0, 20) + '...' : 'FEHLT'}`);
        console.log(`   Provider: ${doorSystem?.provider || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine TTLock Settings vorhanden');
    }
    console.log('');

    // WhatsApp
    if (branch3.whatsappSettings) {
      console.log('🔐 WhatsApp Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch3.whatsappSettings as any);
        const whatsapp = decrypted?.whatsapp || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   API Key: ${whatsapp?.apiKey ? whatsapp.apiKey.substring(0, 30) + '...' : 'FEHLT'}`);
        console.log(`   Provider: ${whatsapp?.provider || 'nicht gesetzt'}`);
        console.log(`   Phone Number ID: ${whatsapp?.phoneNumberId || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine WhatsApp Settings vorhanden');
    }
    console.log('');

    // Test Branch 4 (Parque Poblado)
    console.log('='.repeat(80));
    console.log('BRANCH 4 (Parque Poblado) - Entschlüsselungstest');
    console.log('='.repeat(80));
    
    const branch4 = await prisma.branch.findUnique({
      where: { id: 4 },
      select: { 
        id: true,
        name: true,
        boldPaymentSettings: true,
        lobbyPmsSettings: true,
        whatsappSettings: true
      }
    });

    if (!branch4) {
      throw new Error('Branch 4 (Parque Poblado) nicht gefunden!');
    }

    console.log(`📋 Branch: ${branch4.name} (ID: ${branch4.id})\n`);

    // Bold Payment
    if (branch4.boldPaymentSettings) {
      console.log('🔐 Bold Payment Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch4.boldPaymentSettings as any);
        const boldPayment = decrypted?.boldPayment || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   Merchant ID: ${boldPayment?.merchantId ? boldPayment.merchantId.substring(0, 30) + '...' : 'FEHLT'}`);
        console.log(`   API Key: ${boldPayment?.apiKey ? boldPayment.apiKey.substring(0, 20) + '...' : 'FEHLT'}`);
        console.log(`   Environment: ${boldPayment?.environment || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine Bold Payment Settings vorhanden');
    }
    console.log('');

    // LobbyPMS
    if (branch4.lobbyPmsSettings) {
      console.log('🔐 LobbyPMS Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch4.lobbyPmsSettings as any);
        const lobbyPms = decrypted?.lobbyPms || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   API Key: ${lobbyPms?.apiKey ? lobbyPms.apiKey.substring(0, 30) + '...' : 'FEHLT'}`);
        console.log(`   API URL: ${lobbyPms?.apiUrl || 'nicht gesetzt'}`);
        console.log(`   Property ID: ${lobbyPms?.propertyId || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine LobbyPMS Settings vorhanden');
    }
    console.log('');

    // WhatsApp
    if (branch4.whatsappSettings) {
      console.log('🔐 WhatsApp Settings:');
      try {
        const decrypted = decryptBranchApiSettings(branch4.whatsappSettings as any);
        const whatsapp = decrypted?.whatsapp || decrypted;
        console.log('   ✅ Entschlüsselung erfolgreich');
        console.log(`   API Key: ${whatsapp?.apiKey ? whatsapp.apiKey.substring(0, 30) + '...' : 'FEHLT'}`);
        console.log(`   Provider: ${whatsapp?.provider || 'nicht gesetzt'}`);
        console.log(`   Phone Number ID: ${whatsapp?.phoneNumberId || 'nicht gesetzt'}`);
      } catch (error) {
        console.log('   ❌ Entschlüsselung fehlgeschlagen');
        console.log(`   Fehler: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ⚠️  Keine WhatsApp Settings vorhanden');
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ TEST ABGESCHLOSSEN');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testBranchDecryption()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });




