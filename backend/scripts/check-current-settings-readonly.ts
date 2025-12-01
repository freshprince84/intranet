/**
 * Script: Prüft aktuelle Settings in DB (NUR LESEN, KEINE ÄNDERUNGEN)
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings, decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkCurrentSettings() {
  try {
    console.log('🔍 Prüfe aktuelle Settings in DB (NUR LESEN)...\n');

    // ==========================================
    // MANILA BRANCH (ID 3)
    // ==========================================
    console.log('='.repeat(80));
    console.log('BRANCH MANILA (ID 3)');
    console.log('='.repeat(80));

    const manila = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        whatsappSettings: true,
        doorSystemSettings: true,
        boldPaymentSettings: true,
        lobbyPmsSettings: true
      }
    });

    if (!manila) {
      throw new Error('Branch Manila nicht gefunden!');
    }

    // WhatsApp
    console.log('\n📱 WhatsApp Settings:');
    if (manila.whatsappSettings) {
      try {
        const decrypted = decryptBranchApiSettings(manila.whatsappSettings as any);
        console.log(JSON.stringify(decrypted, null, 2));
        const whatsapp = decrypted?.whatsapp || decrypted;
        console.log('\n   Felder:');
        console.log('   - provider:', whatsapp?.provider || '❌ FEHLT');
        console.log('   - apiKey:', whatsapp?.apiKey ? '✅ (' + whatsapp.apiKey.length + ' Zeichen)' : '❌ FEHLT');
        console.log('   - phoneNumberId:', whatsapp?.phoneNumberId || '❌ FEHLT');
        console.log('   - apiSecret:', whatsapp?.apiSecret ? '✅' : '❌ FEHLT');
      } catch (e: any) {
        console.log('   ❌ FEHLER beim Entschlüsseln:', e.message);
      }
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // TTLock
    console.log('\n🔐 TTLock Settings:');
    if (manila.doorSystemSettings) {
      try {
        const decrypted = decryptBranchApiSettings(manila.doorSystemSettings as any);
        console.log(JSON.stringify(decrypted, null, 2));
        const doorSystem = decrypted?.doorSystem || decrypted;
        console.log('\n   Felder:');
        console.log('   - provider:', doorSystem?.provider || '❌ FEHLT');
        console.log('   - clientId:', doorSystem?.clientId || '❌ FEHLT');
        console.log('   - clientSecret:', doorSystem?.clientSecret ? '✅' : '❌ FEHLT');
        console.log('   - username:', doorSystem?.username || '❌ FEHLT');
        console.log('   - password:', doorSystem?.password ? '✅' : '❌ FEHLT');
        console.log('   - lockIds:', doorSystem?.lockIds ? `✅ (${doorSystem.lockIds.length} Lock(s))` : '❌ FEHLT');
        if (doorSystem?.lockIds) {
          console.log('      Lock IDs:', doorSystem.lockIds);
        }
      } catch (e: any) {
        console.log('   ❌ FEHLER beim Entschlüsseln:', e.message);
      }
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // Bold Payment
    console.log('\n💳 Bold Payment Settings:');
    if (manila.boldPaymentSettings) {
      try {
        const decrypted = decryptBranchApiSettings(manila.boldPaymentSettings as any);
        console.log(JSON.stringify(decrypted, null, 2));
        const bold = decrypted?.boldPayment || decrypted;
        console.log('\n   Felder:');
        console.log('   - apiKey:', bold?.apiKey || '❌ FEHLT');
        console.log('   - merchantId:', bold?.merchantId || '❌ FEHLT');
        console.log('   - environment:', bold?.environment || '❌ FEHLT');
      } catch (e: any) {
        console.log('   ❌ FEHLER beim Entschlüsseln:', e.message);
      }
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // LobbyPMS
    console.log('\n🏨 LobbyPMS Settings:');
    if (manila.lobbyPmsSettings) {
      try {
        const decrypted = decryptBranchApiSettings(manila.lobbyPmsSettings as any);
        console.log(JSON.stringify(decrypted, null, 2));
        const lobby = decrypted?.lobbyPms || decrypted;
        console.log('\n   Felder:');
        console.log('   - apiKey:', lobby?.apiKey || '❌ FEHLT');
        console.log('   - apiUrl:', lobby?.apiUrl || '❌ FEHLT');
        console.log('   - propertyId:', lobby?.propertyId || '❌ FEHLT');
      } catch (e: any) {
        console.log('   ❌ FEHLER beim Entschlüsseln:', e.message);
      }
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // ==========================================
    // ORGANIZATION SETTINGS (ID 1)
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('ORGANIZATION (ID 1)');
    console.log('='.repeat(80));

    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (org?.settings) {
      try {
        const decrypted = decryptApiSettings(org.settings as any);
        console.log('\nBold Payment:');
        const bold = decrypted?.boldPayment;
        console.log('   - apiKey:', bold?.apiKey || '❌ FEHLT');
        console.log('   - merchantId:', bold?.merchantId || '❌ FEHLT');
        console.log('   - environment:', bold?.environment || '❌ FEHLT');
      } catch (e: any) {
        console.log('   ❌ FEHLER beim Entschlüsseln:', e.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ANALYSE ABGESCHLOSSEN (NUR GELESEN)');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });












