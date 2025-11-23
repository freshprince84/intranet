import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBoldPaymentEnvironment() {
  try {
    console.log('🔍 Prüfe Bold Payment API-Keys (Sandbox vs Production)...\n');

    // 1. Organization Settings prüfen
    console.log('📋 Organization Settings:');
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      console.log('   ❌ Keine Settings gefunden');
      return;
    }

    const settings = decryptApiSettings(org.settings as any);
    const bpSettings = settings?.boldPayment;

    if (!bpSettings?.apiKey || !bpSettings?.merchantId) {
      console.log('   ❌ Keine Bold Payment Settings gefunden');
      return;
    }

    console.log(`   Environment: ${bpSettings.environment || 'sandbox'}`);
    console.log(`   API Key: ${bpSettings.apiKey.substring(0, 20)}...`);
    console.log(`   Merchant ID: ${bpSettings.merchantId.substring(0, 30)}...`);
    console.log('');

    // 2. Teste Payment-Link-Erstellung
    console.log('🧪 Teste Payment-Link-Erstellung...');
    
    try {
      const service = new BoldPaymentService(1);
      
      // Finde oder erstelle Test-Reservierung
      let reservation = await prisma.reservation.findFirst({
        where: { organizationId: 1 }
      });

      if (!reservation) {
        console.log('   ⚠️  Keine Reservierung gefunden, erstelle Test-Reservierung...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        reservation = await prisma.reservation.create({
          data: {
            lobbyReservationId: 'TEST-ENV-' + Date.now(),
            guestName: 'Test Environment Check',
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

      console.log(`   Verwende Reservierung ID: ${reservation.id}`);
      console.log('   Erstelle Test-Payment-Link...');
      
      const paymentLink = await service.createPaymentLink(
        reservation,
        100000,
        'COP',
        'Test Environment Check'
      );

      console.log(`   ✅ Payment-Link erstellt: ${paymentLink}`);
      console.log('');

      // 3. Prüfe Payment-Link Status
      console.log('🔍 Prüfe Payment-Link Status...');
      const linkId = paymentLink.match(/LNK_[A-Z0-9]+/)?.[0];
      
      if (linkId) {
        console.log(`   Link ID: ${linkId}`);
        
        try {
          const status = await service.getPaymentStatus(linkId);
          
          console.log('   Payment-Link Details:');
          console.log(`      Status: ${status.status || 'N/A'}`);
          console.log(`      is_sandbox: ${status.is_sandbox !== undefined ? status.is_sandbox : 'N/A'}`);
          console.log(`      Amount: ${status.total || 'N/A'} ${status.amount?.currency || 'COP'}`);
          console.log('');

          if (status.is_sandbox === true) {
            console.log('   ⚠️  WARNUNG: Payment-Link ist im SANDBOX-Modus!');
            console.log('   ❌ Die API-Keys sind Sandbox-Keys, nicht Production-Keys!');
            console.log('   💡 Lösung: Im Bold Payment Dashboard Production-Keys verwenden');
          } else if (status.is_sandbox === false) {
            console.log('   ✅ Payment-Link ist im PRODUCTION-Modus!');
            console.log('   ✅ Die API-Keys sind Production-Keys');
          } else {
            console.log('   ⚠️  Konnte Sandbox-Status nicht bestimmen');
            console.log('   💡 Prüfe manuell im Bold Payment Dashboard');
          }
        } catch (statusError) {
          console.log(`   ⚠️  Fehler beim Abrufen des Status: ${statusError instanceof Error ? statusError.message : 'Unbekannt'}`);
          console.log('   💡 Prüfe manuell den Payment-Link im Browser');
        }
      } else {
        console.log('   ⚠️  Konnte Link ID nicht extrahieren');
        console.log(`   💡 Prüfe manuell: ${paymentLink}`);
      }

      // Cleanup: Lösche Test-Reservierung
      if (reservation.lobbyReservationId?.startsWith('TEST-ENV-')) {
        await prisma.reservation.delete({ where: { id: reservation.id } });
        console.log(`   🗑️  Test-Reservierung ${reservation.id} gelöscht`);
      }

    } catch (error) {
      console.error('   ❌ Fehler beim Testen:', error instanceof Error ? error.message : 'Unbekannt');
      if (error instanceof Error && error.stack) {
        console.error('   Stack:', error.stack);
      }
    }

    console.log('\n✅ Prüfung abgeschlossen');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testBoldPaymentEnvironment()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

