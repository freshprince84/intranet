/**
 * Script: Verschlüsselt alle API Settings neu mit dem aktuellen ENCRYPTION_KEY
 */

import { PrismaClient } from '@prisma/client';
import { encryptApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function reEncryptAllApiSettings() {
  try {
    console.log('🔐 Verschlüssele alle API Settings neu...\n');

    // Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY ist nicht korrekt gesetzt!');
    }
    console.log('✅ ENCRYPTION_KEY ist gesetzt\n');

    // ==========================================
    // 1. ORGANIZATION SETTINGS - Bold Payment
    // ==========================================
    console.log('='.repeat(80));
    console.log('1. ORGANIZATION SETTINGS - Bold Payment');
    console.log('='.repeat(80));
    
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      throw new Error('Organization nicht gefunden!');
    }

    // Lade aktuelle Settings
    const currentSettings = org.settings as any;
    
    // Aktualisiere Bold Payment Settings
    const updatedOrgSettings = {
      ...currentSettings,
      boldPayment: {
        apiKey: '1hDVYQqQuaeAB16kQvXRrQ', // Llave secreta
        merchantId: 'CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E', // Llave de identidad
        environment: 'production'
      }
    };

    // Verschlüssele neu
    const encryptedOrgSettings = encryptApiSettings(updatedOrgSettings);

    await prisma.organization.update({
      where: { id: 1 },
      data: { settings: encryptedOrgSettings as any }
    });

    console.log('✅ Organization Bold Payment Settings aktualisiert');
    console.log(`   Merchant ID: CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E`);
    console.log(`   API Key: 1hDVYQqQuaeAB16kQvXRrQ`);
    console.log('');

    // ==========================================
    // 2. BRANCH SETTINGS - Manila (Branch 3)
    // ==========================================
    console.log('='.repeat(80));
    console.log('2. BRANCH SETTINGS - Manila (Branch 3)');
    console.log('='.repeat(80));

    const manilaBranch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { 
        boldPaymentSettings: true,
        lobbyPmsSettings: true,
        doorSystemSettings: true,
        whatsappSettings: true
      }
    });

    if (!manilaBranch) {
      throw new Error('Branch Manila (ID 3) nicht gefunden!');
    }

    // Bold Payment
    const manilaBoldPayment = {
      boldPayment: {
        apiKey: '1hDVYQqQuaeAB16kQvXRrQ',
        merchantId: 'CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E',
        environment: 'production'
      }
    };
    const encryptedManilaBoldPayment = encryptBranchApiSettings(manilaBoldPayment);

    // LobbyPMS
    const manilaLobbyPms = {
      lobbyPms: {
        apiKey: '8LwykKjLq7uziBRLxL1INGCLSsKfYWc5KIXTnRqZ28wTvSQehrIsToUJ3a5V'
      }
    };
    const encryptedManilaLobbyPms = encryptBranchApiSettings(manilaLobbyPms);

    // TTLock
    const manilaTTLock = {
      doorSystem: {
        provider: 'ttlock',
        clientId: 'c0128d6b496a4f848d06970a65210e8a',
        clientSecret: 'cdbb8ea148766914af14ef9e762a792d'
      }
    };
    const encryptedManilaTTLock = encryptBranchApiSettings(manilaTTLock);

    // WhatsApp
    const manilaWhatsApp = {
      whatsapp: {
        provider: 'whatsapp-business-api',
        apiKey: 'EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD'
      }
    };
    const encryptedManilaWhatsApp = encryptBranchApiSettings(manilaWhatsApp);

    await prisma.branch.update({
      where: { id: 3 },
      data: {
        boldPaymentSettings: encryptedManilaBoldPayment as any,
        lobbyPmsSettings: encryptedManilaLobbyPms as any,
        doorSystemSettings: encryptedManilaTTLock as any,
        whatsappSettings: encryptedManilaWhatsApp as any
      }
    });

    console.log('✅ Manila Branch Settings aktualisiert:');
    console.log('   Bold Payment: ✅');
    console.log('   LobbyPMS: ✅');
    console.log('   TTLock: ✅');
    console.log('   WhatsApp: ✅');
    console.log('');

    // ==========================================
    // 3. BRANCH SETTINGS - Parque Poblado (Branch 4)
    // ==========================================
    console.log('='.repeat(80));
    console.log('3. BRANCH SETTINGS - Parque Poblado (Branch 4)');
    console.log('='.repeat(80));

    const pobladoBranch = await prisma.branch.findUnique({
      where: { id: 4 },
      select: { 
        boldPaymentSettings: true,
        lobbyPmsSettings: true,
        whatsappSettings: true
      }
    });

    if (!pobladoBranch) {
      throw new Error('Branch Parque Poblado (ID 4) nicht gefunden!');
    }

    // Bold Payment
    const pobladoBoldPayment = {
      boldPayment: {
        apiKey: '1hDVYQqQuaeAB16kQvXRrQ',
        merchantId: 'CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E',
        environment: 'production'
      }
    };
    const encryptedPobladoBoldPayment = encryptBranchApiSettings(pobladoBoldPayment);

    // LobbyPMS
    const pobladoLobbyPms = {
      lobbyPms: {
        apiKey: 'Q3LiVD4A6438JatGPmNkBUPrErWM2HIU3KrJ0O2BoIWpNW3Q0l3ZC1JmRtri'
      }
    };
    const encryptedPobladoLobbyPms = encryptBranchApiSettings(pobladoLobbyPms);

    // WhatsApp
    const pobladoWhatsApp = {
      whatsapp: {
        provider: 'whatsapp-business-api',
        apiKey: 'EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD'
      }
    };
    const encryptedPobladoWhatsApp = encryptBranchApiSettings(pobladoWhatsApp);

    await prisma.branch.update({
      where: { id: 4 },
      data: {
        boldPaymentSettings: encryptedPobladoBoldPayment as any,
        lobbyPmsSettings: encryptedPobladoLobbyPms as any,
        whatsappSettings: encryptedPobladoWhatsApp as any
      }
    });

    console.log('✅ Parque Poblado Branch Settings aktualisiert:');
    console.log('   Bold Payment: ✅');
    console.log('   LobbyPMS: ✅');
    console.log('   WhatsApp: ✅');
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ ALLE API SETTINGS ERFOLGREICH NEU VERSCHLÜSSELT!');
    console.log('='.repeat(80));
    console.log('');

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

reEncryptAllApiSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });





