/**
 * Script zum Testen einer einzelnen Integration
 * 
 * Verwendung:
 *   npx ts-node scripts/test-integration-single.ts <service> <organizationId>
 * 
 * Services: lobbypms, boldpayment, ttlock, whatsapp, sire
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { TTLockService } from '../src/services/ttlockService';
import { WhatsAppService } from '../src/services/whatsappService';
import { SireService } from '../src/services/sireService';

const prisma = new PrismaClient();

const serviceName = process.argv[2]?.toLowerCase();
const organizationId = parseInt(process.argv[3] || '1');

if (!serviceName) {
  console.error('❌ Service-Name erforderlich!');
  console.log('\nVerwendung:');
  console.log('  npx ts-node scripts/test-integration-single.ts <service> <organizationId>');
  console.log('\nServices:');
  console.log('  - lobbypms');
  console.log('  - boldpayment');
  console.log('  - ttlock');
  console.log('  - whatsapp');
  console.log('  - sire');
  process.exit(1);
}

async function testService() {
  console.log(`\n🧪 Teste ${serviceName} für Organisation ${organizationId}...\n`);
  
  try {
    switch (serviceName) {
      case 'lobbypms':
        await testLobbyPMS();
        break;
      case 'boldpayment':
        await testBoldPayment();
        break;
      case 'ttlock':
        await testTTLock();
        break;
      case 'whatsapp':
        await testWhatsApp();
        break;
      case 'sire':
        await testSIRE();
        break;
      default:
        console.error(`❌ Unbekannter Service: ${serviceName}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function testLobbyPMS() {
  console.log('🔍 Teste LobbyPMS Verbindung...');
  const service = new LobbyPmsService(organizationId);
  const isValid = await service.validateConnection();
  
  if (isValid) {
    console.log('✅ LobbyPMS Verbindung erfolgreich!');
    
    // Teste Reservierungen abrufen
    console.log('\n📋 Teste Reservierungen abrufen...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const reservations = await service.fetchTomorrowReservations('22:00');
    console.log(`✅ ${reservations.length} Reservierung(en) für morgen gefunden`);
  } else {
    console.log('❌ LobbyPMS Verbindung fehlgeschlagen');
  }
}

async function testBoldPayment() {
  console.log('💳 Teste Bold Payment...');
  const service = new BoldPaymentService(organizationId);
  console.log('✅ Bold Payment Service initialisiert');
  console.log('ℹ️  Für vollständigen Test: Erstelle Test-Reservierung und Payment-Link');
}

async function testTTLock() {
  console.log('🔐 Teste TTLock...');
  const service = new TTLockService(organizationId);
  
  console.log('📋 Teste Locks abrufen...');
  const locks = await service.getLocks();
  console.log(`✅ ${locks.length} Lock(s) gefunden:`);
  locks.forEach((lockId, index) => {
    console.log(`   ${index + 1}. ${lockId}`);
  });
}

async function testWhatsApp() {
  console.log('📱 Teste WhatsApp...');
  const service = new WhatsAppService(organizationId);
  console.log('✅ WhatsApp Service initialisiert');
  console.log('ℹ️  Für vollständigen Test: Sende Test-Nachricht über ReservationNotificationService');
}

async function testSIRE() {
  console.log('🏛️ Teste SIRE...');
  const service = new SireService(organizationId);
  console.log('✅ SIRE Service initialisiert');
  console.log('ℹ️  Für vollständigen Test: Führe Check-in mit SIRE-Registrierung durch');
}

testService();

