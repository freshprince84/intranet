/**
 * Script: Debuggt wie Services die Settings laden
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { TTLockService } from '../src/services/ttlockService';
import { WhatsAppService } from '../src/services/whatsappService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugServiceLoadSettings() {
  try {
    console.log('🔍 Debugge wie Services die Settings laden...\n');

    const branchId = 3; // Manila

    // ==========================================
    // 1. BOLD PAYMENT SERVICE
    // ==========================================
    console.log('='.repeat(80));
    console.log('1. BOLD PAYMENT SERVICE');
    console.log('='.repeat(80));

    try {
      const boldService = await BoldPaymentService.createForBranch(branchId);
      console.log('✅ Service erstellt');
      
      // Prüfe interne Werte
      const serviceAny = boldService as any;
      console.log('📋 Service interne Werte:');
      console.log('   - apiKey:', serviceAny.apiKey || '❌');
      console.log('   - merchantId:', serviceAny.merchantId || '❌');
      console.log('   - environment:', serviceAny.environment || '❌');
      
      // Versuche Settings zu laden (durch API-Call)
      console.log('\n📋 Versuche Payment Link zu erstellen (lädt Settings)...');
      const testLink = await boldService.createPaymentLink({
        amount: 1000,
        currency: 'COP',
        description: 'Test'
      });
      console.log('✅ Payment Link erstellt:', testLink.url);
    } catch (error: any) {
      console.log('❌ FEHLER:', error.message);
      console.log('   Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    }

    // ==========================================
    // 2. TTLOCK SERVICE
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('2. TTLOCK SERVICE');
    console.log('='.repeat(80));

    try {
      const ttlockService = await TTLockService.createForBranch(branchId);
      console.log('✅ Service erstellt');
      
      // Prüfe interne Werte
      const serviceAny = ttlockService as any;
      console.log('📋 Service interne Werte:');
      console.log('   - clientId:', serviceAny.clientId ? '✅' : '❌');
      console.log('   - clientSecret:', serviceAny.clientSecret ? '✅' : '❌');
      console.log('   - username:', serviceAny.username || '❌');
      console.log('   - password:', serviceAny.password ? '✅' : '❌');
      
      // Versuche Locks abzurufen
      console.log('\n📋 Versuche Locks abzurufen...');
      const locks = await ttlockService.getLocks();
      console.log('✅ Locks gefunden:', locks);
    } catch (error: any) {
      console.log('❌ FEHLER:', error.message);
      console.log('   Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    }

    // ==========================================
    // 3. WHATSAPP SERVICE
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('3. WHATSAPP SERVICE');
    console.log('='.repeat(80));

    try {
      const whatsappService = new WhatsAppService(undefined, branchId);
      console.log('✅ Service erstellt');
      
      // Prüfe interne Werte (durch Versuch eine Nachricht zu senden)
      const serviceAny = whatsappService as any;
      console.log('📋 Service interne Werte:');
      console.log('   - apiKey:', serviceAny.apiKey ? `✅ (${serviceAny.apiKey.length} Zeichen)` : '❌');
      console.log('   - phoneNumberId:', serviceAny.phoneNumberId || '❌');
      console.log('   - provider:', serviceAny.provider || '❌');
      
      // Versuche Settings zu laden (durch Versuch eine Nachricht zu senden)
      console.log('\n📋 Versuche Settings zu laden (durch Test-Nachricht)...');
      // Nur testen ob Settings geladen werden können, nicht wirklich senden
      await (serviceAny as any).loadSettings();
      console.log('✅ Settings geladen');
      console.log('   - apiKey nach load:', serviceAny.apiKey ? `✅ (${serviceAny.apiKey.length} Zeichen)` : '❌');
      console.log('   - phoneNumberId nach load:', serviceAny.phoneNumberId || '❌');
    } catch (error: any) {
      console.log('❌ FEHLER:', error.message);
      console.log('   Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    }

    // ==========================================
    // 4. PRÜFE ROH-DATEN AUS DB
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('4. ROH-DATEN AUS DB (VERSCHLÜSSELT)');
    console.log('='.repeat(80));

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        boldPaymentSettings: true,
        doorSystemSettings: true,
        whatsappSettings: true
      }
    });

    if (branch) {
      console.log('\n📋 Bold Payment Settings (roh):');
      console.log('   Typ:', typeof branch.boldPaymentSettings);
      console.log('   Ist Objekt:', typeof branch.boldPaymentSettings === 'object');
      if (branch.boldPaymentSettings) {
        const bold = branch.boldPaymentSettings as any;
        console.log('   Keys:', Object.keys(bold));
        if (bold.boldPayment) {
          console.log('   boldPayment.apiKey:', bold.boldPayment.apiKey ? (bold.boldPayment.apiKey.includes(':') ? 'VERSCHLÜSSELT' : 'UNVERSCHLÜSSELT') : 'FEHLT');
          console.log('   boldPayment.merchantId:', bold.boldPayment.merchantId ? (bold.boldPayment.merchantId.includes(':') ? 'VERSCHLÜSSELT' : 'UNVERSCHLÜSSELT') : 'FEHLT');
        }
      }

      console.log('\n📋 TTLock Settings (roh):');
      console.log('   Typ:', typeof branch.doorSystemSettings);
      if (branch.doorSystemSettings) {
        const door = branch.doorSystemSettings as any;
        console.log('   Keys:', Object.keys(door));
        if (door.doorSystem) {
          console.log('   doorSystem.lockIds:', door.doorSystem.lockIds);
        }
      }

      console.log('\n📋 WhatsApp Settings (roh):');
      console.log('   Typ:', typeof branch.whatsappSettings);
      if (branch.whatsappSettings) {
        const whatsapp = branch.whatsappSettings as any;
        console.log('   Keys:', Object.keys(whatsapp));
        console.log('   phoneNumberId:', whatsapp.phoneNumberId || 'FEHLT');
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugServiceLoadSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

