/**
 * Test-Script für LobbyPMS Availability API
 * 
 * Testet den /api/v2/available-rooms Endpunkt mit verschiedenen Parametern
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/test-lobbypms-availability.ts
 */

import { LobbyPmsService } from '../src/services/lobbyPmsService';
import { prisma } from '../src/utils/prisma';

interface TestResult {
  testName: string;
  params: any;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

async function testAvailabilityApi() {
  console.log('🧪 LobbyPMS Availability API Test\n');
  console.log('=' .repeat(80));
  
  const results: TestResult[] = [];
  
  try {
    // Hole ersten Branch mit LobbyPMS Settings
    const branch = await prisma.branch.findFirst({
      where: {
        lobbyPmsSettings: {
          not: null
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!branch) {
      console.error('❌ Kein Branch mit LobbyPMS Settings gefunden!');
      process.exit(1);
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})\n`);

    // Erstelle Service
    const service = await LobbyPmsService.createForBranch(branch.id);
    
    // Test-Daten
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    // Test 1: Nur start_date (erforderlich)
    console.log('📋 Test 1: Nur start_date (erforderlich)');
    try {
      const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: formatDate(tomorrow)
        },
        validateStatus: () => true // Akzeptiere alle Status-Codes
      });
      
      results.push({
        testName: 'Test 1: Nur start_date',
        params: { start_date: formatDate(tomorrow) },
        success: response.status === 200,
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        console.log('✅ Erfolg!');
        console.log('Response-Struktur:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`❌ Fehler (Status ${response.status}):`, response.data);
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 1: Nur start_date',
        params: { start_date: formatDate(tomorrow) },
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Test 2: start_date + end_date
    console.log('📋 Test 2: start_date + end_date');
    try {
      const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow)
        },
        validateStatus: () => true
      });
      
      results.push({
        testName: 'Test 2: start_date + end_date',
        params: {
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow)
        },
        success: response.status === 200,
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        console.log('✅ Erfolg!');
        console.log('Response-Struktur:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`❌ Fehler (Status ${response.status}):`, response.data);
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 2: start_date + end_date',
        params: {
          start_date: formatDate(tomorrow),
          end_date: formatDate(dayAfterTomorrow)
        },
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Test 3: start_date + property_id
    console.log('📋 Test 3: start_date + property_id');
    try {
      // Hole propertyId aus Service (wenn verfügbar)
      const propertyId = (service as any).propertyId;
      
      if (propertyId) {
        const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
          params: {
            start_date: formatDate(tomorrow),
            property_id: propertyId
          },
          validateStatus: () => true
        });
        
        results.push({
          testName: 'Test 3: start_date + property_id',
          params: {
            start_date: formatDate(tomorrow),
            property_id: propertyId
          },
          success: response.status === 200,
          status: response.status,
          data: response.data
        });

        if (response.status === 200) {
          console.log('✅ Erfolg!');
          console.log('Response-Struktur:', JSON.stringify(response.data, null, 2));
        } else {
          console.log(`❌ Fehler (Status ${response.status}):`, response.data);
        }
      } else {
        console.log('⚠️ propertyId nicht verfügbar, überspringe Test');
        results.push({
          testName: 'Test 3: start_date + property_id',
          params: { start_date: formatDate(tomorrow), property_id: 'N/A' },
          success: false,
          error: 'propertyId nicht verfügbar'
        });
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 3: start_date + property_id',
        params: { start_date: formatDate(tomorrow), property_id: 'N/A' },
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Test 4: start_date + room_type (compartida)
    console.log('📋 Test 4: start_date + room_type (compartida)');
    try {
      const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: formatDate(tomorrow),
          room_type: 'compartida'
        },
        validateStatus: () => true
      });
      
      results.push({
        testName: 'Test 4: start_date + room_type (compartida)',
        params: {
          start_date: formatDate(tomorrow),
          room_type: 'compartida'
        },
        success: response.status === 200,
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        console.log('✅ Erfolg!');
        console.log('Response-Struktur:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`❌ Fehler (Status ${response.status}):`, response.data);
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 4: start_date + room_type (compartida)',
        params: {
          start_date: formatDate(tomorrow),
          room_type: 'compartida'
        },
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Test 5: start_date + room_type (privada)
    console.log('📋 Test 5: start_date + room_type (privada)');
    try {
      const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: formatDate(tomorrow),
          room_type: 'privada'
        },
        validateStatus: () => true
      });
      
      results.push({
        testName: 'Test 5: start_date + room_type (privada)',
        params: {
          start_date: formatDate(tomorrow),
          room_type: 'privada'
        },
        success: response.status === 200,
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        console.log('✅ Erfolg!');
        console.log('Response-Struktur:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`❌ Fehler (Status ${response.status}):`, response.data);
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 5: start_date + room_type (privada)',
        params: {
          start_date: formatDate(tomorrow),
          room_type: 'privada'
        },
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Test 6: Alle Parameter kombiniert
    console.log('📋 Test 6: Alle Parameter kombiniert');
    try {
      const propertyId = (service as any).propertyId;
      const params: any = {
        start_date: formatDate(tomorrow),
        end_date: formatDate(dayAfterTomorrow),
        room_type: 'compartida'
      };
      
      if (propertyId) {
        params.property_id = propertyId;
      }

      const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
        params,
        validateStatus: () => true
      });
      
      results.push({
        testName: 'Test 6: Alle Parameter kombiniert',
        params,
        success: response.status === 200,
        status: response.status,
        data: response.data
      });

      if (response.status === 200) {
        console.log('✅ Erfolg!');
        console.log('Response-Struktur:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`❌ Fehler (Status ${response.status}):`, response.data);
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 6: Alle Parameter kombiniert',
        params: {},
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Test 7: Fehlerfall - Kein start_date
    console.log('📋 Test 7: Fehlerfall - Kein start_date');
    try {
      const response = await (service as any).axiosInstance.get('/api/v2/available-rooms', {
        params: {},
        validateStatus: () => true
      });
      
      results.push({
        testName: 'Test 7: Fehlerfall - Kein start_date',
        params: {},
        success: response.status === 422, // Erwarteter Fehler-Status
        status: response.status,
        data: response.data
      });

      if (response.status === 422) {
        console.log('✅ Erwarteter Fehler erhalten!');
        console.log('Fehlermeldung:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`⚠️ Unerwarteter Status ${response.status}:`, response.data);
      }
    } catch (error: any) {
      results.push({
        testName: 'Test 7: Fehlerfall - Kein start_date',
        params: {},
        success: false,
        error: error.message
      });
      console.log('❌ Exception:', error.message);
    }
    console.log('');

    // Zusammenfassung
    console.log('=' .repeat(80));
    console.log('📊 ZUSAMMENFASSUNG\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Erfolgreich: ${successful}`);
    console.log(`❌ Fehlgeschlagen: ${failed}`);
    console.log(`📋 Gesamt: ${results.length}\n`);

    // Speichere Ergebnisse in Datei
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '../lobbypms-availability-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`💾 Ergebnisse gespeichert in: ${resultsPath}`);

    // Zeige erfolgreiche Tests
    const successfulTests = results.filter(r => r.success);
    if (successfulTests.length > 0) {
      console.log('\n✅ ERFOLGREICHE TESTS:');
      successfulTests.forEach(test => {
        console.log(`  - ${test.testName}`);
        if (test.data) {
          console.log(`    Response-Struktur:`, JSON.stringify(test.data, null, 4).substring(0, 500));
        }
      });
    }

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Tests aus
testAvailabilityApi().catch(console.error);

