import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function analyzeLocalBranches() {
  try {
    console.log('🔍 Analysiere lokale Branches und Settings...\n');

    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: {
        organization: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    console.log(`📊 Gefundene Branches: ${branches.length}\n`);

    for (const branch of branches) {
      console.log(`\n📍 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`   Organisation: ${branch.organization?.displayName || 'Keine'} (ID: ${branch.organizationId || 'N/A'})`);

      // WhatsApp Settings
      if (branch.whatsappSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.whatsappSettings as any);
          console.log(`   ✅ WhatsApp Settings vorhanden`);
          if (decrypted.apiKey) console.log(`      - API Key: ${decrypted.apiKey.substring(0, 10)}...`);
          if (decrypted.apiSecret) console.log(`      - API Secret: ${decrypted.apiSecret.substring(0, 10)}...`);
        } catch (error) {
          console.log(`   ⚠️  WhatsApp Settings vorhanden (Entschlüsselung fehlgeschlagen)`);
        }
      } else {
        console.log(`   ❌ WhatsApp Settings: NICHT vorhanden`);
      }

      // LobbyPMS Settings
      if (branch.lobbyPmsSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
          console.log(`   ✅ LobbyPMS Settings vorhanden`);
          if (decrypted.apiKey) console.log(`      - API Key: ${decrypted.apiKey.substring(0, 20)}...`);
          if (decrypted.apiUrl) console.log(`      - API URL: ${decrypted.apiUrl}`);
          if (decrypted.propertyId) console.log(`      - Property ID: ${decrypted.propertyId}`);
        } catch (error) {
          console.log(`   ⚠️  LobbyPMS Settings vorhanden (Entschlüsselung fehlgeschlagen)`);
        }
      } else {
        console.log(`   ❌ LobbyPMS Settings: NICHT vorhanden`);
      }

      // Bold Payment Settings
      if (branch.boldPaymentSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.boldPaymentSettings as any);
          console.log(`   ✅ Bold Payment Settings vorhanden`);
          if (decrypted.apiKey) console.log(`      - API Key: ${decrypted.apiKey.substring(0, 10)}...`);
          if (decrypted.merchantId) console.log(`      - Merchant ID: ${decrypted.merchantId.substring(0, 10)}...`);
        } catch (error) {
          console.log(`   ⚠️  Bold Payment Settings vorhanden (Entschlüsselung fehlgeschlagen)`);
        }
      } else {
        console.log(`   ❌ Bold Payment Settings: NICHT vorhanden`);
      }

      // Door System Settings
      if (branch.doorSystemSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
          console.log(`   ✅ Door System Settings vorhanden`);
          if (decrypted.clientId) console.log(`      - Client ID: ${decrypted.clientId.substring(0, 10)}...`);
        } catch (error) {
          console.log(`   ⚠️  Door System Settings vorhanden (Entschlüsselung fehlgeschlagen)`);
        }
      } else {
        console.log(`   ❌ Door System Settings: NICHT vorhanden`);
      }

      // Email Settings
      if (branch.emailSettings) {
        try {
          const decrypted = decryptBranchApiSettings(branch.emailSettings as any);
          console.log(`   ✅ Email Settings vorhanden`);
          if (decrypted.smtpHost) console.log(`      - SMTP Host: ${decrypted.smtpHost}`);
          if (decrypted.imap?.host) console.log(`      - IMAP Host: ${decrypted.imap.host}`);
        } catch (error) {
          console.log(`   ⚠️  Email Settings vorhanden (Entschlüsselung fehlgeschlagen)`);
        }
      } else {
        console.log(`   ❌ Email Settings: NICHT vorhanden`);
      }
    }

    console.log('\n✅ Analyse abgeschlossen!\n');
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeLocalBranches();

