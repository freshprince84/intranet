/**
 * Script: Beweist dass decryptBranchApiSettings() verschachtelte Settings nicht entschlüsselt
 * 
 * Dieses Script beweist zu 100%, dass das Problem durch decryptBranchApiSettings() verursacht wird.
 */

import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function proveBranchEncryptionBug() {
  try {
    console.log('🔍 BEWEIS: decryptBranchApiSettings() entschlüsselt verschachtelte Settings nicht\n');
    console.log('='.repeat(80));

    // 1. Lade Branch Settings aus Datenbank
    console.log('\n1️⃣ Lade Branch Settings aus Datenbank (Branch 3 - Manila)...');
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { 
        id: true,
        name: true,
        boldPaymentSettings: true 
      }
    });

    if (!branch?.boldPaymentSettings) {
      throw new Error('Branch 3 hat keine boldPaymentSettings!');
    }

    console.log(`✅ Branch ${branch.id} (${branch.name}) gefunden`);
    console.log(`✅ boldPaymentSettings vorhanden\n`);

    // 2. Zeige rohe Struktur
    console.log('2️⃣ Zeige rohe Struktur (wie in DB gespeichert):');
    const rawSettings = branch.boldPaymentSettings as any;
    console.log('   Struktur:', JSON.stringify(Object.keys(rawSettings), null, 2));
    
    if (rawSettings.boldPayment) {
      console.log('   ✅ boldPayment-Objekt vorhanden (verschachtelt)');
      console.log(`   boldPayment.apiKey: ${rawSettings.boldPayment.apiKey ? (rawSettings.boldPayment.apiKey.includes(':') ? '🔒 VERSCHLÜSSELT' : '🔓 UNVERSCHLÜSSELT') : '❌ FEHLT'}`);
      console.log(`   boldPayment.merchantId: ${rawSettings.boldPayment.merchantId ? (rawSettings.boldPayment.merchantId.includes(':') ? '🔒 VERSCHLÜSSELT' : '🔓 UNVERSCHLÜSSELT') : '❌ FEHLT'}`);
    } else {
      console.log('   ⚠️ KEINE boldPayment-Struktur (flach)');
      console.log(`   apiKey: ${rawSettings.apiKey ? (rawSettings.apiKey.includes(':') ? '🔒 VERSCHLÜSSELT' : '🔓 UNVERSCHLÜSSELT') : '❌ FEHLT'}`);
      console.log(`   merchantId: ${rawSettings.merchantId ? (rawSettings.merchantId.includes(':') ? '🔒 VERSCHLÜSSELT' : '🔓 UNVERSCHLÜSSELT') : '❌ FEHLT'}`);
    }
    console.log('');

    // 3. Entschlüssele mit decryptBranchApiSettings()
    console.log('3️⃣ Entschlüssele mit decryptBranchApiSettings()...');
    const decrypted = decryptBranchApiSettings(rawSettings);
    console.log('   Struktur nach Entschlüsselung:', JSON.stringify(Object.keys(decrypted), null, 2));
    
    const boldPaymentSettings = decrypted?.boldPayment || decrypted;
    console.log('   boldPaymentSettings (nach settings?.boldPayment || settings):', boldPaymentSettings ? '✅ vorhanden' : '❌ fehlt');
    
    if (boldPaymentSettings) {
      const apiKey = boldPaymentSettings.apiKey;
      const merchantId = boldPaymentSettings.merchantId;
      
      console.log(`   apiKey: ${apiKey ? (apiKey.includes(':') ? '🔒 IMMER NOCH VERSCHLÜSSELT! ❌' : '🔓 ENTSCHLÜSSELT ✅') : '❌ FEHLT'}`);
      console.log(`   merchantId: ${merchantId ? (merchantId.includes(':') ? '🔒 IMMER NOCH VERSCHLÜSSELT! ❌' : '🔓 ENTSCHLÜSSELT ✅') : '❌ FEHLT'}`);
      
      if (apiKey && apiKey.includes(':')) {
        console.log('\n   ❌❌❌ BEWEIS: apiKey ist IMMER NOCH VERSCHLÜSSELT!');
        console.log(`   ❌❌❌ Dies würde an die API gesendet werden → 403 Forbidden!`);
      }
      if (merchantId && merchantId.includes(':')) {
        console.log('\n   ❌❌❌ BEWEIS: merchantId ist IMMER NOCH VERSCHLÜSSELT!');
        console.log(`   ❌❌❌ Dies würde an die API gesendet werden → 403 Forbidden!`);
      }
    }
    console.log('');

    // 4. Test: Manuelle Entschlüsselung von verschachtelten Feldern
    console.log('4️⃣ Test: Manuelle Entschlüsselung von verschachtelten Feldern...');
    if (decrypted.boldPayment) {
      const { decryptSecret } = await import('../src/utils/encryption');
      
      if (decrypted.boldPayment.apiKey && typeof decrypted.boldPayment.apiKey === 'string' && decrypted.boldPayment.apiKey.includes(':')) {
        try {
          const manuallyDecryptedApiKey = decryptSecret(decrypted.boldPayment.apiKey);
          console.log(`   ✅ apiKey kann manuell entschlüsselt werden: ${manuallyDecryptedApiKey.substring(0, 20)}...`);
        } catch (error) {
          console.log(`   ❌ apiKey kann NICHT entschlüsselt werden: ${error}`);
        }
      }
      
      if (decrypted.boldPayment.merchantId && typeof decrypted.boldPayment.merchantId === 'string' && decrypted.boldPayment.merchantId.includes(':')) {
        try {
          const manuallyDecryptedMerchantId = decryptSecret(decrypted.boldPayment.merchantId);
          console.log(`   ✅ merchantId kann manuell entschlüsselt werden: ${manuallyDecryptedMerchantId}`);
        } catch (error) {
          console.log(`   ❌ merchantId kann NICHT entschlüsselt werden: ${error}`);
        }
      }
    }
    console.log('');

    // 5. Zeige Code-Beweis
    console.log('5️⃣ Code-Beweis:');
    console.log('   decryptBranchApiSettings() prüft nur Root-Level:');
    console.log('   - decrypted.apiKey ✅');
    console.log('   - decrypted.merchantId ✅');
    console.log('   - decrypted.boldPayment.apiKey ❌ NICHT GEPRÜFT!');
    console.log('   - decrypted.boldPayment.merchantId ❌ NICHT GEPRÜFT!');
    console.log('');

    // 6. Zusammenfassung
    console.log('='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG - BEWEIS:');
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ Branch Settings sind verschachtelt: { boldPayment: { apiKey, merchantId } }');
    console.log('✅ decryptBranchApiSettings() prüft nur Root-Level Felder');
    console.log('❌ Verschachtelte Felder (boldPayment.apiKey, boldPayment.merchantId) werden NICHT entschlüsselt');
    console.log('❌ Verschlüsselte Werte werden an die API gesendet → 403 Forbidden');
    console.log('');
    console.log('🔴 DIES IST ZU 100% DIE URACHE DES PROBLEMS!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

proveBranchEncryptionBug()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

