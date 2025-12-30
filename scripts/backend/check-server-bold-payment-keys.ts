import { PrismaClient } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Production-Keys zum Vergleich
const PRODUCTION_API_KEY = '1hDVYQqQuaeAB16kQvXRrQ';
const PRODUCTION_MERCHANT_ID = 'CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E';

async function checkServerKeys() {
  try {
    console.log('🔍 Prüfe Bold Payment Keys auf Server...\n');

    // 1. Organization Settings
    console.log('📋 Organization Settings:');
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      console.log('   ❌ Keine Settings gefunden');
      return;
    }

    let settings: any;
    try {
      settings = decryptApiSettings(org.settings as any);
    } catch {
      settings = org.settings as any;
    }

    const bpSettings = settings?.boldPayment;
    if (!bpSettings) {
      console.log('   ❌ Keine Bold Payment Settings gefunden');
      return;
    }

    console.log(`   Environment: ${bpSettings.environment || 'sandbox'}`);
    console.log(`   API Key: ${bpSettings.apiKey || 'NICHT GESETZT'}`);
    console.log(`   Merchant ID: ${bpSettings.merchantId || 'NICHT GESETZT'}`);
    console.log('');

    // Vergleich mit Production-Keys
    const apiKeyMatch = bpSettings.apiKey === PRODUCTION_API_KEY;
    const merchantIdMatch = bpSettings.merchantId === PRODUCTION_MERCHANT_ID;

    console.log('🔍 Vergleich mit Production-Keys:');
    console.log(`   API Key Match: ${apiKeyMatch ? '✅' : '❌'} ${apiKeyMatch ? 'KORREKT' : 'FALSCH - Verwendet noch alte Keys!'}`);
    console.log(`   Merchant ID Match: ${merchantIdMatch ? '✅' : '❌'} ${merchantIdMatch ? 'KORREKT' : 'FALSCH - Verwendet noch alte Keys!'}`);
    console.log('');

    if (!apiKeyMatch || !merchantIdMatch) {
      console.log('⚠️  PROBLEM: Die Keys auf dem Server sind NICHT die Production-Keys!');
      console.log('');
      console.log('💡 Lösung: Production-Keys müssen auf dem Server eingetragen werden');
    } else {
      console.log('✅ Production-Keys sind korrekt eingetragen');
    }

    // 2. Branch Settings
    console.log('\n📋 Branch Settings:');
    const branches = await prisma.branch.findMany({
      where: { organizationId: 1 },
      select: { id: true, name: true, boldPaymentSettings: true }
    });

    for (const branch of branches) {
      if (!branch.boldPaymentSettings) {
        continue;
      }

      try {
        let settings: any;
        try {
          settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        } catch {
          settings = branch.boldPaymentSettings as any;
        }

        const bpSettings = settings?.boldPayment || settings;
        if (!bpSettings?.apiKey) {
          continue;
        }

        console.log(`   Branch ${branch.id} (${branch.name}):`);
        console.log(`      Environment: ${bpSettings.environment || 'sandbox'}`);
        console.log(`      API Key: ${bpSettings.apiKey}`);
        console.log(`      Merchant ID: ${bpSettings.merchantId || 'NICHT GESETZT'}`);
        
        const apiKeyMatch = bpSettings.apiKey === PRODUCTION_API_KEY;
        const merchantIdMatch = bpSettings.merchantId === PRODUCTION_MERCHANT_ID;
        
        console.log(`      API Key Match: ${apiKeyMatch ? '✅' : '❌'}`);
        console.log(`      Merchant ID Match: ${merchantIdMatch ? '✅' : '❌'}`);
        console.log('');
      } catch (e) {
        console.log(`   Branch ${branch.id}: Fehler beim Lesen`);
      }
    }

    // 3. Test Payment-Link erstellen
    console.log('\n🧪 Teste Payment-Link-Erstellung...');
    try {
      const { BoldPaymentService } = await import('../src/services/boldPaymentService');
      const service = new BoldPaymentService(1);

      let reservation = await prisma.reservation.findFirst({
        where: { organizationId: 1 }
      });

      if (!reservation) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        reservation = await prisma.reservation.create({
          data: {
            lobbyReservationId: 'TEST-KEY-CHECK-' + Date.now(),
            guestName: 'Test Key Check',
            guestEmail: 'test@example.com',
            guestPhone: '+573001234567',
            checkInDate: tomorrow,
            checkOutDate: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
            status: 'confirmed',
            paymentStatus: 'pending',
            organizationId: 1,
            amount: 100000,
            currency: 'COP'
          }
        });
      }

      const paymentLink = await service.createPaymentLink(
        reservation,
        100000,
        'COP',
        'Test Key Check'
      );

      console.log(`   ✅ Payment-Link erstellt: ${paymentLink}`);

      const linkId = paymentLink.match(/LNK_[A-Z0-9]+/)?.[0];
      if (linkId) {
        const status = await service.getPaymentStatus(linkId);
        console.log(`   Status: ${status.status || 'N/A'}`);
        console.log(`   is_sandbox: ${status.is_sandbox !== undefined ? status.is_sandbox : 'N/A'}`);
        
        if (status.is_sandbox === true) {
          console.log('   ❌ PROBLEM: Payment-Link ist im SANDBOX-Modus!');
          console.log('   ⚠️  Die Keys sind NICHT die Production-Keys!');
        } else if (status.is_sandbox === false) {
          console.log('   ✅ Payment-Link ist im PRODUCTION-Modus!');
        }
      }

      if (reservation.lobbyReservationId?.startsWith('TEST-KEY-CHECK-')) {
        await prisma.reservation.delete({ where: { id: reservation.id } });
      }
    } catch (error) {
      console.error('   ❌ Fehler beim Testen:', error instanceof Error ? error.message : 'Unbekannt');
    }

    console.log('\n✅ Prüfung abgeschlossen');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkServerKeys()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

