/**
 * Script zum Testen aller Integrationen
 * 
 * Führt Tests für alle konfigurierten Services durch
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import { TTLockService } from '../src/services/ttlockService';
import { WhatsAppService } from '../src/services/whatsappService';
import { SireService } from '../src/services/sireService';

const prisma = new PrismaClient();

interface TestResult {
  service: string;
  success: boolean;
  message: string;
  details?: any;
}

async function testLobbyPMS(organizationId: number): Promise<TestResult> {
  try {
    console.log('\n🔍 Teste LobbyPMS...');
    const service = new LobbyPmsService(organizationId);
    const isValid = await service.validateConnection();
    
    if (isValid) {
      return {
        service: 'LobbyPMS',
        success: true,
        message: 'Verbindung erfolgreich'
      };
    } else {
      return {
        service: 'LobbyPMS',
        success: false,
        message: 'Verbindung fehlgeschlagen'
      };
    }
  } catch (error) {
    return {
      service: 'LobbyPMS',
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: error
    };
  }
}

async function testBoldPayment(organizationId: number): Promise<TestResult> {
  try {
    console.log('\n💳 Teste Bold Payment...');
    const service = new BoldPaymentService(organizationId);
    
    // Prüfe ob Service initialisiert werden kann
    // (wird beim ersten API-Call initialisiert)
    return {
      service: 'Bold Payment',
      success: true,
      message: 'Service initialisiert (kein API-Call durchgeführt)'
    };
  } catch (error) {
    return {
      service: 'Bold Payment',
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: error
    };
  }
}

async function testTTLock(organizationId: number): Promise<TestResult> {
  try {
    console.log('\n🔐 Teste TTLock...');
    const service = new TTLockService(organizationId);
    const locks = await service.getLocks();
    
    return {
      service: 'TTLock',
      success: true,
      message: `Service funktioniert. ${locks.length} Lock(s) gefunden.`,
      details: { locks: locks.length }
    };
  } catch (error) {
    return {
      service: 'TTLock',
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: error
    };
  }
}

async function testWhatsApp(organizationId: number): Promise<TestResult> {
  try {
    console.log('\n📱 Teste WhatsApp...');
    const service = new WhatsAppService(organizationId);
    
    // Prüfe ob Service initialisiert werden kann
    return {
      service: 'WhatsApp',
      success: true,
      message: 'Service initialisiert (kein Test-Nachricht gesendet)'
    };
  } catch (error) {
    return {
      service: 'WhatsApp',
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: error
    };
  }
}

async function testSIRE(organizationId: number): Promise<TestResult> {
  try {
    console.log('\n🏛️ Teste SIRE...');
    const service = new SireService(organizationId);
    
    // Prüfe ob Service initialisiert werden kann
    return {
      service: 'SIRE',
      success: true,
      message: 'Service initialisiert (keine Registrierung durchgeführt)'
    };
  } catch (error) {
    return {
      service: 'SIRE',
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: error
    };
  }
}

async function testReservations(organizationId: number): Promise<TestResult> {
  try {
    console.log('\n📋 Teste Reservierungen...');
    const count = await prisma.reservation.count({
      where: { organizationId }
    });
    
    return {
      service: 'Reservierungen',
      success: true,
      message: `${count} Reservierung(en) in Datenbank gefunden`,
      details: { count }
    };
  } catch (error) {
    return {
      service: 'Reservierungen',
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: error
    };
  }
}

async function main() {
  const organizationId = parseInt(process.argv[2] || '1');
  
  console.log(`\n🧪 Teste alle Integrationen für Organisation ${organizationId}...\n`);
  
  const results: TestResult[] = [];
  
  // Teste alle Services
  results.push(await testLobbyPMS(organizationId));
  results.push(await testBoldPayment(organizationId));
  results.push(await testTTLock(organizationId));
  results.push(await testWhatsApp(organizationId));
  results.push(await testSIRE(organizationId));
  results.push(await testReservations(organizationId));
  
  // Zeige Ergebnisse
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST-ERGEBNISSE');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`\n${icon} ${result.service}`);
    console.log(`   ${result.message}`);
    if (result.details && !result.success) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📈 Zusammenfassung: ${successCount}/${totalCount} Tests erfolgreich`);
  console.log('='.repeat(60));
  
  if (successCount === totalCount) {
    console.log('\n🎉 Alle Tests erfolgreich!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Einige Tests fehlgeschlagen. Bitte prüfe die Konfiguration.');
    process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('❌ Fehler beim Ausführen der Tests:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

