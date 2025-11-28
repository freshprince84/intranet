/**
 * Script: Prüft ob alle API Settings korrekt entschlüsselt werden können
 */

import { PrismaClient } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkAllApiSettingsDecryption() {
  try {
    console.log('🔍 Prüfe Entschlüsselung aller API Settings...\n');

    // 1. Organization Settings
    console.log('='.repeat(80));
    console.log('ORGANIZATION SETTINGS:');
    console.log('='.repeat(80));
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      console.log('❌ Keine Organization Settings gefunden!');
    } else {
      try {
        const decrypted = decryptApiSettings(org.settings as any);
        console.log('✅ Organization Settings können entschlüsselt werden');
        
        // Prüfe einzelne Settings
        console.log('   Bold Payment:', decrypted?.boldPayment ? '✅ vorhanden' : '❌ fehlt');
        console.log('   LobbyPMS:', decrypted?.lobbyPms ? '✅ vorhanden' : '❌ fehlt');
        console.log('   TTLock:', decrypted?.doorSystem ? '✅ vorhanden' : '❌ fehlt');
        console.log('   WhatsApp:', decrypted?.whatsapp ? '✅ vorhanden' : '❌ fehlt');
        console.log('   SIRE:', decrypted?.sire ? '✅ vorhanden' : '❌ fehlt');
        
        // Prüfe ob Bold Payment Settings korrekt entschlüsselt werden können
        if (decrypted?.boldPayment) {
          const bp = decrypted.boldPayment;
          console.log('   Bold Payment API Key:', bp.apiKey ? `✅ ${String(bp.apiKey).substring(0, 20)}...` : '❌ fehlt');
          console.log('   Bold Payment Merchant ID:', bp.merchantId ? `✅ ${bp.merchantId.substring(0, 20)}...` : '❌ fehlt');
        }
      } catch (error) {
        console.log('❌ Fehler beim Entschlüsseln der Organization Settings:');
        if (error instanceof Error) {
          console.log(`   ${error.message}`);
        }
      }
    }
    console.log('');

    // 2. Branch Settings
    console.log('='.repeat(80));
    console.log('BRANCH SETTINGS:');
    console.log('='.repeat(80));
    const branches = await prisma.branch.findMany({
      where: { organizationId: 1 },
      select: {
        id: true,
        name: true,
        boldPaymentSettings: true,
        lobbyPmsSettings: true,
        doorSystemSettings: true,
        whatsappSettings: true
      }
    });

    for (const branch of branches) {
      console.log(`\n📋 Branch ${branch.id}: ${branch.name}`);
      
      if (branch.boldPaymentSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.boldPaymentSettings as any);
          const bp = decrypted?.boldPayment || decrypted;
          console.log('   Bold Payment: ✅ kann entschlüsselt werden');
          console.log(`   API Key: ${bp?.apiKey ? String(bp.apiKey).substring(0, 20) + '...' : '❌ fehlt'}`);
          console.log(`   Merchant ID: ${bp?.merchantId ? bp.merchantId.substring(0, 20) + '...' : '❌ fehlt'}`);
        } catch (error) {
          console.log('   Bold Payment: ❌ Fehler beim Entschlüsseln');
          if (error instanceof Error) {
            console.log(`      ${error.message}`);
          }
        }
      } else {
        console.log('   Bold Payment: ⚠️  keine Settings');
      }

      if (branch.lobbyPmsSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
          console.log('   LobbyPMS: ✅ kann entschlüsselt werden');
        } catch (error) {
          console.log('   LobbyPMS: ❌ Fehler beim Entschlüsseln');
        }
      }

      if (branch.doorSystemSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
          console.log('   TTLock: ✅ kann entschlüsselt werden');
        } catch (error) {
          console.log('   TTLock: ❌ Fehler beim Entschlüsseln');
        }
      }
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAllApiSettingsDecryption()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });










