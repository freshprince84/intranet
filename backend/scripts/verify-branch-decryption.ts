/**
 * Script: Verifiziert Entschlüsselung nach Re-Encryption
 * Führt auf Server aus, um zu prüfen, ob Re-Encryption erfolgreich war
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyBranchDecryption() {
  try {
    console.log('✅ Verifiziere Entschlüsselung nach Re-Encryption...\n');

    // Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY ist nicht korrekt gesetzt!');
    }
    console.log('✅ ENCRYPTION_KEY ist gesetzt\n');

    let allSuccess = true;

    // Test Branch 3 (Manila)
    console.log('='.repeat(80));
    console.log('BRANCH 3 (Manila) - Verifikation');
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
      try {
        const decrypted = decryptBranchApiSettings(branch3.boldPaymentSettings as any);
        const boldPayment = decrypted?.boldPayment || decrypted;
        if (boldPayment?.merchantId && boldPayment?.apiKey) {
          console.log('   ✅ Bold Payment: Entschlüsselung erfolgreich');
          console.log(`      Merchant ID: ${boldPayment.merchantId.substring(0, 30)}...`);
        } else {
          console.log('   ⚠️  Bold Payment: Entschlüsselt, aber Werte fehlen');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ Bold Payment: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }

    // LobbyPMS
    if (branch3.lobbyPmsSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch3.lobbyPmsSettings as any);
        const lobbyPms = decrypted?.lobbyPms || decrypted;
        if (lobbyPms?.apiKey) {
          console.log('   ✅ LobbyPMS: Entschlüsselung erfolgreich');
          console.log(`      API Key: ${lobbyPms.apiKey.substring(0, 30)}...`);
        } else {
          console.log('   ⚠️  LobbyPMS: Entschlüsselt, aber API Key fehlt');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ LobbyPMS: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }

    // TTLock
    if (branch3.doorSystemSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch3.doorSystemSettings as any);
        const doorSystem = decrypted?.doorSystem || decrypted;
        if (doorSystem?.clientSecret && doorSystem?.clientId) {
          console.log('   ✅ TTLock: Entschlüsselung erfolgreich');
          console.log(`      Client ID: ${doorSystem.clientId.substring(0, 20)}...`);
        } else {
          console.log('   ⚠️  TTLock: Entschlüsselt, aber Werte fehlen');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ TTLock: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }

    // WhatsApp
    if (branch3.whatsappSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch3.whatsappSettings as any);
        const whatsapp = decrypted?.whatsapp || decrypted;
        if (whatsapp?.apiKey) {
          console.log('   ✅ WhatsApp: Entschlüsselung erfolgreich');
          console.log(`      API Key: ${whatsapp.apiKey.substring(0, 30)}...`);
        } else {
          console.log('   ⚠️  WhatsApp: Entschlüsselt, aber API Key fehlt');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ WhatsApp: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }
    console.log('');

    // Test Branch 4 (Parque Poblado)
    console.log('='.repeat(80));
    console.log('BRANCH 4 (Parque Poblado) - Verifikation');
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
      try {
        const decrypted = decryptBranchApiSettings(branch4.boldPaymentSettings as any);
        const boldPayment = decrypted?.boldPayment || decrypted;
        if (boldPayment?.merchantId && boldPayment?.apiKey) {
          console.log('   ✅ Bold Payment: Entschlüsselung erfolgreich');
          console.log(`      Merchant ID: ${boldPayment.merchantId.substring(0, 30)}...`);
        } else {
          console.log('   ⚠️  Bold Payment: Entschlüsselt, aber Werte fehlen');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ Bold Payment: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }

    // LobbyPMS
    if (branch4.lobbyPmsSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch4.lobbyPmsSettings as any);
        const lobbyPms = decrypted?.lobbyPms || decrypted;
        if (lobbyPms?.apiKey) {
          console.log('   ✅ LobbyPMS: Entschlüsselung erfolgreich');
          console.log(`      API Key: ${lobbyPms.apiKey.substring(0, 30)}...`);
        } else {
          console.log('   ⚠️  LobbyPMS: Entschlüsselt, aber API Key fehlt');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ LobbyPMS: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }

    // WhatsApp
    if (branch4.whatsappSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch4.whatsappSettings as any);
        const whatsapp = decrypted?.whatsapp || decrypted;
        if (whatsapp?.apiKey) {
          console.log('   ✅ WhatsApp: Entschlüsselung erfolgreich');
          console.log(`      API Key: ${whatsapp.apiKey.substring(0, 30)}...`);
        } else {
          console.log('   ⚠️  WhatsApp: Entschlüsselt, aber API Key fehlt');
          allSuccess = false;
        }
      } catch (error) {
        console.log('   ❌ WhatsApp: Entschlüsselung fehlgeschlagen');
        console.log(`      Fehler: ${error instanceof Error ? error.message : String(error)}`);
        allSuccess = false;
      }
    }
    console.log('');

    console.log('='.repeat(80));
    if (allSuccess) {
      console.log('✅ ALLE ENTSCHLÜSSELUNGEN ERFOLGREICH!');
      console.log('✅ Problem behoben!');
    } else {
      console.log('⚠️  EINIGE ENTSCHLÜSSELUNGEN FEHLGESCHLAGEN!');
      console.log('⚠️  Bitte prüfen!');
    }
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

verifyBranchDecryption()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });




