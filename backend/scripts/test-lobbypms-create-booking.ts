/**
 * Test-Script für LobbyPMS Booking Creation API
 * 
 * Testet verschiedene Endpunkte zum Erstellen von Reservierungen
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/test-lobbypms-create-booking.ts
 */

import { LobbyPmsService } from '../src/services/lobbyPmsService';
import { prisma } from '../src/utils/prisma';

interface TestResult {
  testName: string;
  endpoint: string;
  method: string;
  payload?: any;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

async function testCreateBookingApi() {
  console.log('🧪 LobbyPMS Booking Creation API Test\n');
  console.log('=' .repeat(80));
  
  const results: TestResult[] = [];
  
  try {
    // Hole nur Branches die in LobbyPMS existieren: Manila (ID: 3) und Parque Poblado (ID: 4)
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: [3, 4] }, // Nur Manila und Parque Poblado
        lobbyPmsSettings: {
          not: null
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (branches.length === 0) {
      console.error('❌ Kein Branch mit LobbyPMS Settings gefunden! (Erwartet: Manila oder Parque Poblado)');
      process.exit(1);
    }

    // Verwende ersten gefundenen Branch
    const branch = branches[0];
    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);
    if (branches.length > 1) {
      console.log(`   (Verfügbar: ${branches.map(b => b.name).join(', ')})`);
    }
    console.log('');

    // Erstelle Service
    const service = await LobbyPmsService.createForBranch(branch.id);
    
    // Test-Daten
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    // Test-Payload (verschiedene Varianten)
    const testPayloads = [
      {
        name: 'Minimal',
        payload: {
          guest_name: 'Test Gast',
          check_in_date: formatDate(tomorrow),
          check_out_date: formatDate(dayAfterTomorrow)
        }
      },
      {
        name: 'Mit Kontakt',
        payload: {
          guest_name: 'Test Gast',
          guest_email: 'test@example.com',
          guest_phone: '+573001234567',
          check_in_date: formatDate(tomorrow),
          check_out_date: formatDate(dayAfterTomorrow)
        }
      },
      {
        name: 'Mit Zimmerart',
        payload: {
          guest_name: 'Test Gast',
          check_in_date: formatDate(tomorrow),
          check_out_date: formatDate(dayAfterTomorrow),
          room_type: 'privada'
        }
      },
      {
        name: 'Vollständig',
        payload: {
          guest_name: 'Test Gast',
          guest_email: 'test@example.com',
          guest_phone: '+573001234567',
          check_in_date: formatDate(tomorrow),
          check_out_date: formatDate(dayAfterTomorrow),
          room_type: 'privada',
          amount: 50000,
          currency: 'COP'
        }
      }
    ];

    // Test verschiedene Endpunkte
    const endpoints = [
      '/api/v1/bookings',
      '/api/v2/bookings',
      '/api/v1/reservations',
      '/api/v2/reservations'
    ];

    for (const endpoint of endpoints) {
      console.log(`📋 Teste Endpunkt: ${endpoint}\n`);
      
      for (const testPayload of testPayloads) {
        console.log(`  📝 Test: ${testPayload.name}`);
        try {
          const response = await (service as any).axiosInstance.post(
            endpoint,
            testPayload.payload,
            {
              validateStatus: () => true // Akzeptiere alle Status-Codes
            }
          );
          
          results.push({
            testName: `${endpoint} - ${testPayload.name}`,
            endpoint,
            method: 'POST',
            payload: testPayload.payload,
            success: response.status >= 200 && response.status < 300,
            status: response.status,
            data: response.data
          });

          if (response.status >= 200 && response.status < 300) {
            console.log(`    ✅ Erfolg (Status ${response.status})!`);
            console.log(`    Response:`, JSON.stringify(response.data, null, 2).substring(0, 300));
          } else {
            console.log(`    ❌ Fehler (Status ${response.status}):`, JSON.stringify(response.data, null, 2).substring(0, 300));
          }
        } catch (error: any) {
          results.push({
            testName: `${endpoint} - ${testPayload.name}`,
            endpoint,
            method: 'POST',
            payload: testPayload.payload,
            success: false,
            error: error.message
          });
          console.log(`    ❌ Exception:`, error.message);
        }
        console.log('');
      }
    }

    // Zusammenfassung
    console.log('=' .repeat(80));
    console.log('📊 ZUSAMMENFASSUNG\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Erfolgreich: ${successful}`);
    console.log(`❌ Fehlgeschlagen: ${failed}`);
    console.log(`📋 Gesamt: ${results.length}\n`);

    // Zeige erfolgreiche Tests
    const successfulTests = results.filter(r => r.success);
    if (successfulTests.length > 0) {
      console.log('✅ ERFOLGREICHE TESTS:');
      successfulTests.forEach(test => {
        console.log(`  - ${test.testName}`);
        console.log(`    Endpunkt: ${test.method} ${test.endpoint}`);
        console.log(`    Status: ${test.status}`);
        if (test.data) {
          console.log(`    Response:`, JSON.stringify(test.data, null, 2).substring(0, 500));
        }
      });
    } else {
      console.log('⚠️ KEINE ERFOLGREICHEN TESTS!');
      console.log('Mögliche Gründe:');
      console.log('  - API-Endpunkt existiert nicht');
      console.log('  - Authentifizierung fehlgeschlagen');
      console.log('  - Payload-Struktur falsch');
      console.log('  - Reservierungen müssen über Website erstellt werden');
    }

    // Speichere Ergebnisse in Datei
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '../lobbypms-create-booking-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Ergebnisse gespeichert in: ${resultsPath}`);

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Tests aus
testCreateBookingApi().catch(console.error);

