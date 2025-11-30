/**
 * Test-Script für LobbyPMS Booking Creation API mit category_id
 * 
 * Testet Reservierungserstellung mit category_id (erforderlich)
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/test-lobbypms-create-booking-with-category.ts
 */

import { LobbyPmsService } from '../src/services/lobbyPmsService';
import { prisma } from '../src/utils/prisma';

interface TestResult {
  testName: string;
  endpoint: string;
  payload: any;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

async function testCreateBookingWithCategory() {
  console.log('🧪 LobbyPMS Booking Creation API Test (mit category_id)\n');
  console.log('=' .repeat(80));
  
  const results: TestResult[] = [];
  
  try {
    // Hole Branches Manila und Parque Poblado
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: [3, 4] } // Manila und Parque Poblado
      },
      select: {
        id: true,
        name: true,
        lobbyPmsSettings: true
      }
    });

    if (branches.length === 0) {
      console.error('❌ Keine Branches gefunden (Erwartet: Manila oder Parque Poblado)');
      process.exit(1);
    }

    const branch = branches[0];
    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})\n`);

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

    // Hole category_id aus Verfügbarkeits-API (z.B. 34281 = "La tia artista")
    const categoryIds = [34280, 34281, 34282, 34312]; // Bekannte category_ids aus Test

    // Test verschiedene Payload-Strukturen mit category_id
    // WICHTIG: total_adults ist ERFORDERLICH!
    const testPayloads = [
      {
        name: 'Minimal mit category_id',
        payload: {
          category_id: categoryIds[0],
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow),
          total_adults: 1
        }
      },
      {
        name: 'Mit Gästename',
        payload: {
          category_id: categoryIds[0],
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow),
          guest_name: 'Test Gast',
          total_adults: 1
        }
      },
      {
        name: 'Mit Kontakt',
        payload: {
          category_id: categoryIds[0],
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow),
          guest_name: 'Test Gast',
          guest_email: 'test@example.com',
          guest_phone: '+573001234567',
          total_adults: 1
        }
      },
      {
        name: 'Mit Anzahl Personen',
        payload: {
          category_id: categoryIds[0],
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow),
          guest_name: 'Test Gast',
          total_adults: 1
        }
      },
      {
        name: 'Vollständig',
        payload: {
          category_id: categoryIds[0],
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow),
          guest_name: 'Test Gast',
          guest_email: 'test@example.com',
          guest_phone: '+573001234567',
          total_adults: 1
        }
      },
      {
        name: 'Mit totalAdults (camelCase)',
        payload: {
          category_id: categoryIds[0],
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow),
          guest_name: 'Test Gast',
          totalAdults: 1
        }
      }
    ];

    // Test Endpunkt /api/v1/bookings
    console.log('📋 Teste Endpunkt: /api/v1/bookings\n');
    
    for (const testPayload of testPayloads) {
      console.log(`  📝 Test: ${testPayload.name}`);
      console.log(`    📤 Payload:`, JSON.stringify(testPayload.payload, null, 2));
      try {
        const response = await (service as any).axiosInstance.post(
          '/api/v1/bookings',
          testPayload.payload,
          {
            validateStatus: () => true // Akzeptiere alle Status-Codes
          }
        );
        
        results.push({
          testName: testPayload.name,
          endpoint: '/api/v1/bookings',
          payload: testPayload.payload,
          success: response.status >= 200 && response.status < 300,
          status: response.status,
          data: response.data
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`    ✅ Erfolg (Status ${response.status})!`);
          console.log(`    Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
        } else if (response.status === 422) {
          console.log(`    ⚠️  Validierungsfehler (Status ${response.status}):`, JSON.stringify(response.data, null, 2));
        } else {
          console.log(`    ❌ Fehler (Status ${response.status}):`, JSON.stringify(response.data, null, 2).substring(0, 300));
        }
      } catch (error: any) {
        results.push({
          testName: testPayload.name,
          endpoint: '/api/v1/bookings',
          payload: testPayload.payload,
          success: false,
          error: error.message
        });
        console.log(`    ❌ Exception:`, error.message);
      }
      console.log('');
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
        console.log(`    Payload:`, JSON.stringify(test.payload, null, 2));
        console.log(`    Response:`, JSON.stringify(test.data, null, 2).substring(0, 500));
      });
    } else {
      console.log('⚠️ KEINE ERFOLGREICHEN TESTS!');
      console.log('Prüfe Validierungsfehler oben, um zu sehen welche Felder fehlen.');
    }

    // Zeige Validierungsfehler
    const validationErrors = results.filter(r => r.status === 422);
    if (validationErrors.length > 0) {
      console.log('\n⚠️ VALIDIERUNGSFEHLER (Status 422):');
      validationErrors.forEach(test => {
        console.log(`  - ${test.testName}`);
        console.log(`    Fehler:`, JSON.stringify(test.data, null, 2));
      });
    }

    // Speichere Ergebnisse in Datei
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '../lobbypms-create-booking-with-category-test-results.json');
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
testCreateBookingWithCategory().catch(console.error);


