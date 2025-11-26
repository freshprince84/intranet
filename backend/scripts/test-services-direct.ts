/**
 * Script: Testet Services direkt
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { TTLockService } from '../src/services/ttlockService';
import { WhatsAppService } from '../src/services/whatsappService';
import { decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testServicesDirect() {
  try {
    console.log('🔍 Teste Services direkt...\n');

    const branchId = 3; // Manila

    // ==========================================
    // 1. PRÜFE ROH-DATEN AUS DB
    // ==========================================
    console.log('='.repeat(80));
    console.log('1. ROH-DATEN AUS DB');
    console.log('='.repeat(80));

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        boldPaymentSettings: true,
        doorSystemSettings: true,
        whatsappSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch nicht gefunden!');
    }

    // Bold Payment
    console.log('\n📋 Bold Payment (roh):');
    if (branch.boldPaymentSettings) {
      const bold = branch.boldPaymentSettings as any;
      console.log('   Struktur:', JSON.stringify(Object.keys(bold)));
      if (bold.boldPayment) {
        console.log('   boldPayment.apiKey:', bold.boldPayment.apiKey ? (bold.boldPayment.apiKey.includes(':') ? 'VERSCHLÜSSELT' : 'UNVERSCHLÜSSELT') : 'FEHLT');
        console.log('   boldPayment.merchantId:', bold.boldPayment.merchantId ? (bold.boldPayment.merchantId.includes(':') ? 'VERSCHLÜSSELT' : 'UNVERSCHLÜSSELT') : 'FEHLT');
      } else {
        console.log('   ⚠️ KEINE boldPayment-Struktur!');
        console.log('   Direkte Keys:', Object.keys(bold));
      }
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // TTLock
    console.log('\n📋 TTLock (roh):');
    if (branch.doorSystemSettings) {
      const door = branch.doorSystemSettings as any;
      console.log('   Struktur:', JSON.stringify(Object.keys(door)));
      if (door.doorSystem) {
        console.log('   doorSystem.lockIds:', door.doorSystem.lockIds);
      } else {
        console.log('   ⚠️ KEINE doorSystem-Struktur!');
        console.log('   Direkte Keys:', Object.keys(door));
      }
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // WhatsApp
    console.log('\n📋 WhatsApp (roh):');
    if (branch.whatsappSettings) {
      const whatsapp = branch.whatsappSettings as any;
      console.log('   Struktur:', JSON.stringify(Object.keys(whatsapp)));
      console.log('   phoneNumberId:', whatsapp.phoneNumberId || 'FEHLT');
    } else {
      console.log('   ❌ NICHT VORHANDEN');
    }

    // ==========================================
    // 2. PRÜFE ENTSCHLÜSSELTE DATEN
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('2. ENTSCHLÜSSELTE DATEN');
    console.log('='.repeat(80));

    // Bold Payment
    console.log('\n📋 Bold Payment (entschlüsselt):');
    if (branch.boldPaymentSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        console.log('   Struktur:', JSON.stringify(Object.keys(decrypted)));
        const bold = decrypted?.boldPayment || decrypted;
        console.log('   apiKey:', bold?.apiKey || 'FEHLT');
        console.log('   merchantId:', bold?.merchantId || 'FEHLT');
      } catch (e: any) {
        console.log('   ❌ FEHLER:', e.message);
      }
    }

    // TTLock
    console.log('\n📋 TTLock (entschlüsselt):');
    if (branch.doorSystemSettings) {
      try {
        const decrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
        console.log('   Struktur:', JSON.stringify(Object.keys(decrypted)));
        const door = decrypted?.doorSystem || decrypted;
        console.log('   lockIds:', door?.lockIds || 'FEHLT');
        console.log('   clientId:', door?.clientId || 'FEHLT');
        console.log('   username:', door?.username || 'FEHLT');
      } catch (e: any) {
        console.log('   ❌ FEHLER:', e.message);
      }
    }

    // ==========================================
    // 3. TESTE SERVICES
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('3. TESTE SERVICES');
    console.log('='.repeat(80));

    // Bold Payment
    console.log('\n📋 Bold Payment Service:');
    try {
      const boldService = await BoldPaymentService.createForBranch(branchId);
      const serviceAny = boldService as any;
      console.log('   ✅ Service erstellt');
      console.log('   apiKey:', serviceAny.apiKey || '❌ FEHLT');
      console.log('   merchantId:', serviceAny.merchantId || '❌ FEHLT');
    } catch (e: any) {
      console.log('   ❌ FEHLER:', e.message);
    }

    // TTLock
    console.log('\n📋 TTLock Service:');
    try {
      const ttlockService = await TTLockService.createForBranch(branchId);
      const serviceAny = ttlockService as any;
      console.log('   ✅ Service erstellt');
      console.log('   clientId:', serviceAny.clientId || '❌ FEHLT');
      console.log('   username:', serviceAny.username || '❌ FEHLT');
    } catch (e: any) {
      console.log('   ❌ FEHLER:', e.message);
    }

    // WhatsApp
    console.log('\n📋 WhatsApp Service:');
    try {
      const whatsappService = new WhatsAppService(undefined, branchId);
      await (whatsappService as any).loadSettings();
      const serviceAny = whatsappService as any;
      console.log('   ✅ Service erstellt');
      console.log('   apiKey:', serviceAny.apiKey ? `✅ (${serviceAny.apiKey.length} Zeichen)` : '❌ FEHLT');
      console.log('   phoneNumberId:', serviceAny.phoneNumberId || '❌ FEHLT');
    } catch (e: any) {
      console.log('   ❌ FEHLER:', e.message);
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testServicesDirect()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });



