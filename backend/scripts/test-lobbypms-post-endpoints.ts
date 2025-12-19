#!/usr/bin/env node
/**
 * Test-Script: Testet Preis-Update-Endpoints (PUT/POST/PATCH)
 * 
 * Verwendung:
 * npx ts-node scripts/test-lobbypms-post-endpoints.ts [branchId]
 * 
 * Beispiel:
 * npx ts-node scripts/test-lobbypms-post-endpoints.ts 3
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testPostEndpoints(branchId: number) {
  console.log('\n🔍 LobbyPMS Preis-Update-Endpoint Test');
  console.log('='.repeat(60));

  try {
    // Lade Branch mit Settings
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        organization: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (!branch) {
      console.error(`❌ Branch ${branchId} nicht gefunden`);
      process.exit(1);
    }

    // Entschlüssele Settings
    const branchSettings = branch.lobbyPmsSettings as any;
    const orgSettings = branch.organization?.settings as any;
    
    const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
    const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
    
    const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

    if (!lobbyPmsSettings?.apiKey) {
      console.error('❌ LobbyPMS API Key nicht gefunden');
      process.exit(1);
    }

    // Base URL bestimmen
    let apiUrl = lobbyPmsSettings.apiUrl;
    if (!apiUrl) {
      apiUrl = 'https://api.lobbypms.com';
    }
    if (apiUrl.includes('app.lobbypms.com')) {
      apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
    }
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.replace(/\/api$/, '');
    }

    const apiKey = lobbyPmsSettings.apiKey;

    console.log(`\n📋 Konfiguration:`);
    console.log(`   Branch: ${branch.name} (ID: ${branchId})`);
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...\n`);

    // Erstelle Axios-Instanz
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // Hole Verfügbarkeitsdaten, um categoryId und Datum zu bekommen
    const { LobbyPmsService } = await import('../src/services/lobbyPmsService');
    const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Nächste 7 Tage
    
    console.log('📋 Hole Verfügbarkeitsdaten...');
    const availabilityData = await lobbyPmsService.checkAvailability(startDate, endDate);
    
    if (availabilityData.length === 0) {
      console.log('⚠️  Keine Verfügbarkeitsdaten gefunden\n');
      return;
    }
    
    // Nimm erste Kategorie und Datum
    const testEntry = availabilityData[0];
    const categoryId = testEntry.categoryId;
    const testDate = testEntry.date;
    const currentPrice = testEntry.pricePerNight;
    
    console.log(`📋 Test-Daten:`);
    console.log(`   Kategorie ID: ${categoryId}`);
    console.log(`   Datum: ${testDate}`);
    console.log(`   Aktueller Preis: ${currentPrice}\n`);

    // Zuerst: Prüfe welche Endpoints überhaupt existieren (GET-Requests)
    console.log('🔍 Prüfe verfügbare Endpoints (GET-Requests)...\n');
    const discoveryEndpoints = [
      `/api/v2/categories/${categoryId}`,
      `/api/v2/categories/${categoryId}/prices`,
      `/api/v2/categories/${categoryId}/prices/${testDate}`,
      `/api/v2/prices`,
      `/api/v2/rooms`,
      `/api/v2/rooms/${categoryId}`,
      `/api/v2/rate-plans`,
      `/api/v2/rate-plans/${categoryId}`,
      `/api/v1/categories/${categoryId}`,
      `/api/v1/categories/${categoryId}/prices`,
      `/api/v1/categories`, // Liste aller Kategorien
    ];
    
    const existingEndpoints: string[] = [];
    let categoryData: any = null;
    
    for (const endpoint of discoveryEndpoints) {
      try {
        const response = await axiosInstance.get(endpoint, { validateStatus: (s) => s < 500 });
        if (response.status !== 404) {
          existingEndpoints.push(endpoint);
          console.log(`   ✅ ${endpoint} existiert (Status: ${response.status})`);
          
          // Speichere Kategorie-Daten für weitere Analyse
          if (endpoint === `/api/v2/categories/${categoryId}` || endpoint === `/api/v1/categories/${categoryId}`) {
            categoryData = response.data;
            console.log(`   📋 Kategorie-Daten-Struktur:`, JSON.stringify(categoryData, null, 2).substring(0, 500));
          }
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }
    console.log('');
    
    // Prüfe verfügbare Räume/Verfügbarkeit für dieses Datum (um Struktur zu sehen)
    console.log('🔍 Prüfe verfügbare Räume-Struktur für Preis-Updates...\n');
    let exactStructure: any = null;
    try {
      const availabilityResponse = await axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: testDate,
          end_date: testDate,
          property_id: lobbyPmsSettings.propertyId
        },
        validateStatus: (s) => s < 500
      });
      
      if (availabilityResponse.status === 200 && availabilityResponse.data) {
        console.log(`   ✅ /api/v2/available-rooms existiert`);
        const availData = availabilityResponse.data.data || availabilityResponse.data;
        if (Array.isArray(availData) && availData.length > 0) {
          const firstEntry = availData[0];
          console.log(`   📋 Struktur-Beispiel:`, JSON.stringify(firstEntry, null, 2).substring(0, 800));
          
          // Speichere exakte Struktur für Update-Tests
          exactStructure = firstEntry;
          
          // Prüfe ob Kategorien Preise enthalten
          if (firstEntry.categories && Array.isArray(firstEntry.categories) && firstEntry.categories.length > 0) {
            const firstCategory = firstEntry.categories.find((c: any) => c.category_id === categoryId);
            if (firstCategory) {
              console.log(`   📋 Kategorie-Struktur mit Preisen:`, JSON.stringify(firstCategory, null, 2).substring(0, 800));
            }
          }
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
    console.log('');

    // ⚠️ WICHTIG: Rate Plans abrufen (laut Dokumentation benötigt!)
    console.log('🔍 Hole Rate Plans (laut Dokumentation benötigt für Preis-Updates)...\n');
    let ratePlans: any[] = [];
    let rateId: number | null = null;
    let roomTypeId: number | null = null;
    
    try {
      const ratesResponse = await axiosInstance.get('/api/v1/rates', {
        validateStatus: (s) => s < 500
      });
      
      if (ratesResponse.status === 200 && ratesResponse.data) {
        console.log(`   ✅ /api/v1/rates existiert`);
        const ratesData = ratesResponse.data.data || ratesResponse.data;
        
        if (Array.isArray(ratesData) && ratesData.length > 0) {
          ratePlans = ratesData;
          console.log(`   📋 ${ratesData.length} Rate Plan(s) gefunden`);
          
          // Versuche rate_id und room_type_id zu finden, die zur categoryId passen
          // Oder nimm einfach den ersten Rate Plan
          const firstRate = ratesData[0];
          console.log(`   📋 Erster Rate Plan:`, JSON.stringify(firstRate, null, 2).substring(0, 500));
          
          // Versuche rate_id und room_type_id zu extrahieren
          if (firstRate.id) {
            rateId = firstRate.id;
          } else if (firstRate.rate_id) {
            rateId = firstRate.rate_id;
          }
          
          if (firstRate.room_type_id) {
            roomTypeId = firstRate.room_type_id;
          } else if (firstRate.roomTypeId) {
            roomTypeId = firstRate.roomTypeId;
          }
          
          // Versuche auch in der categoryId-Struktur zu finden
          if (!roomTypeId && categoryId) {
            // Vielleicht ist categoryId = room_type_id?
            roomTypeId = categoryId;
          }
          
          console.log(`   📋 Extrahierte IDs: rate_id=${rateId}, room_type_id=${roomTypeId}`);
        } else if (typeof ratesData === 'object') {
          // Vielleicht ist es ein einzelnes Objekt oder hat eine andere Struktur
          console.log(`   📋 Rate Plans Struktur:`, JSON.stringify(ratesData, null, 2).substring(0, 500));
        }
      } else {
        console.log(`   ⚠️  /api/v1/rates Status: ${ratesResponse.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Fehler beim Abrufen von Rate Plans:`, (error as any).message);
    }
    console.log('');

    // Erweiterte Suche nach dem Preis-Endpoint
    const testPrice = currentPrice + 1000; // Kleine Änderung für Test
    const propertyId = lobbyPmsSettings.propertyId;

    // Erstelle Testfälle basierend auf der GET-Struktur
    const testCases: Array<{ path: string; method: string; body: any; desc: string }> = [
      // 1. Die wahrscheinlichsten v1 Varianten (da v1 für Bookings funktioniert)
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v1 Category Prices POST' },
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Category Prices PUT' },
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'PATCH', body: { date: testDate, price: testPrice }, desc: 'v1 Category Prices PATCH' },
      { path: `/api/v1/categories/${categoryId}`, method: 'PUT', body: { prices: [{ date: testDate, value: testPrice }] }, desc: 'v1 Category PUT (nested)' },
      
      // 2. Verfügbarkeit/Inventory (oft für Bulk-Updates genutzt)
      { path: `/api/v1/availability`, method: 'POST', body: { property_id: propertyId, category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Availability POST' },
      { path: `/api/v1/inventory`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Inventory POST' },
      
      // 3. Preis-spezifische Endpoints
      { path: `/api/v1/prices/update`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Prices Update POST' },
      { path: `/api/v1/prices/set`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Prices Set POST' },
      
      // 4. Struktur-Varianten (manchmal ist es plural/singular)
      { path: `/api/v1/category/${categoryId}/price`, method: 'POST', body: { date: testDate, value: testPrice }, desc: 'v1 Category Price POST' },
      
      // 5. Mit property_id im Pfad
      { path: `/api/v1/properties/${propertyId}/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v1 Prop/Cat Prices POST' },
      { path: `/api/v1/properties/${propertyId}/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Prop/Cat Prices PUT' },
      
      // 6. Teste ob PUT über POST mit _method simuliert werden muss
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice, _method: 'PUT' }, desc: 'v1 PUT via POST _method' },
      
      // 7. Teste v2 Varianten ohne "api/" Präfix (falls baseURL anders ist)
      { path: `/v2/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 directly PUT' },
      { path: `/v1/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 directly PUT' },
      
      // 8. v2 Endpoints (da available-rooms v2 funktioniert)
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v2 Category Prices POST' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Category Prices PUT' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'PATCH', body: { date: testDate, price: testPrice }, desc: 'v2 Category Prices PATCH' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PUT', body: { price: testPrice }, desc: 'v2 Category Prices PUT (mit Datum im Pfad)' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PATCH', body: { price: testPrice }, desc: 'v2 Category Prices PATCH (mit Datum im Pfad)' },
      
      // 9. v2 mit property_id
      { path: `/api/v2/properties/${propertyId}/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v2 Prop/Cat Prices POST' },
      { path: `/api/v2/properties/${propertyId}/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Prop/Cat Prices PUT' },
      
      // 10. v2 available-rooms basierend auf GET-Struktur
      { path: `/api/v2/available-rooms`, method: 'PUT', body: { date: testDate, property_id: propertyId, categories: [{ category_id: categoryId, plans: [{ name: 'STANDARD_RATE', prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'v2 Available Rooms PUT (vereinfacht)' },
      { path: `/api/v2/available-rooms`, method: 'POST', body: { date: testDate, property_id: propertyId, categories: [{ category_id: categoryId, plans: [{ name: 'STANDARD_RATE', prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'v2 Available Rooms POST (vereinfacht)' },
      { path: `/api/v2/available-rooms`, method: 'PATCH', body: { date: testDate, property_id: propertyId, categories: [{ category_id: categoryId, plans: [{ name: 'STANDARD_RATE', prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'v2 Available Rooms PATCH (vereinfacht)' },
      
      // 11. v2 prices Endpoint
      { path: `/api/v2/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Prices POST' },
      { path: `/api/v2/prices`, method: 'PUT', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Prices PUT' },
      { path: `/api/v2/prices/${categoryId}`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Prices PUT (mit category_id im Pfad)' },
      
      // 12. v2 rate-plans
      { path: `/api/v2/rate-plans`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Rate Plans POST' },
      { path: `/api/v2/rate-plans/${categoryId}`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Rate Plans PUT' },
      
      // 13. Teste mit exakter available-rooms Struktur (wenn vorhanden)
      ...(exactStructure ? [
        { 
          path: `/api/v2/available-rooms`, 
          method: 'PUT', 
          body: {
            ...exactStructure,
            categories: exactStructure.categories.map((cat: any) => 
              cat.category_id === categoryId 
                ? {
                    ...cat,
                    plans: cat.plans.map((plan: any) => ({
                      ...plan,
                      prices: plan.prices.map((p: any) => 
                        p.people === 1 ? { ...p, value: testPrice } : p
                      )
                    }))
                  }
                : cat
            )
          }, 
          desc: 'PUT /api/v2/available-rooms (exakte GET-Struktur)' 
        },
        { 
          path: `/api/v2/available-rooms`, 
          method: 'POST', 
          body: {
            ...exactStructure,
            categories: exactStructure.categories.map((cat: any) => 
              cat.category_id === categoryId 
                ? {
                    ...cat,
                    plans: cat.plans.map((plan: any) => ({
                      ...plan,
                      prices: plan.prices.map((p: any) => 
                        p.people === 1 ? { ...p, value: testPrice } : p
                      )
                    }))
                  }
                : cat
            )
          }, 
          desc: 'POST /api/v2/available-rooms (exakte GET-Struktur)' 
        },
        { 
          path: `/api/v2/available-rooms`, 
          method: 'PATCH', 
          body: {
            ...exactStructure,
            categories: exactStructure.categories.map((cat: any) => 
              cat.category_id === categoryId 
                ? {
                    ...cat,
                    plans: cat.plans.map((plan: any) => ({
                      ...plan,
                      prices: plan.prices.map((p: any) => 
                        p.people === 1 ? { ...p, value: testPrice } : p
                      )
                    }))
                  }
                : cat
            )
          }, 
          desc: 'PATCH /api/v2/available-rooms (exakte GET-Struktur)' 
        },
      ] : []),
      
      // 14. Weitere v1 Varianten mit verschiedenen Payload-Strukturen
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Prices POST (einfach)' },
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, prices: [{ people: 1, value: testPrice }] }, desc: 'v1 Prices POST (mit prices array)' },
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, start_date: testDate, end_date: testDate, price: testPrice }, desc: 'v1 Prices POST (mit start/end_date)' },
      
      // 15. Rate Plans Varianten v1
      { path: `/api/v1/rate-plans`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Rate Plans POST' },
      { path: `/api/v1/rate-plans/${categoryId}`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Rate Plans PUT' },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    console.log('🧪 Teste Preis-Update-Endpoints (ERWEITERT)...\n');

    for (const test of testCases) {
      try {
        console.log(`📤 Teste: ${test.desc}`);
        console.log(`   ${test.method} ${test.path}`);
        
        const response = await axiosInstance.request({
          method: test.method as any,
          url: test.path,
          data: test.body,
          validateStatus: (status) => status < 500
        });

        if (response.status >= 200 && response.status < 300) {
          successful.push({
            path: test.path,
            method: test.method,
            status: response.status,
            response: response.data
          });
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          failed.push({
            path: test.path,
            method: test.method,
            status: response.status,
            error: response.data
          });
          console.log(`   ⚠️  Status ${response.status}`);
          if (response.status !== 404) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          failed.push({
            path: test.path,
            method: test.method,
            status: axiosError.response?.status,
            error: axiosError.response?.data
          });
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else {
            console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
            console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
          }
        }
      }
      console.log('');
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60) + '\n');

    if (successful.length > 0) {
      console.log(`✅ ${successful.length} ERFOLGREICHE PREIS-UPDATE-ENDPOINTS:\n`);
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
        console.log('');
      });
      
      // Prüfe ob Preis wirklich aktualisiert wurde
      console.log('\n🔍 Prüfe ob Preis wirklich aktualisiert wurde...');
      const updatedAvailability = await lobbyPmsService.checkAvailability(new Date(testDate), new Date(testDate));
      const updatedEntry = updatedAvailability.find(a => a.categoryId === categoryId && a.date === testDate);
      if (updatedEntry) {
        console.log(`   Aktueller Preis nach Update: ${updatedEntry.pricePerNight}`);
        if (updatedEntry.pricePerNight === testPrice) {
          console.log(`   ✅ Preis wurde erfolgreich aktualisiert!`);
        } else {
          console.log(`   ⚠️  Preis wurde nicht aktualisiert (erwartet: ${testPrice}, aktuell: ${updatedEntry.pricePerNight})`);
        }
      }
      console.log('');
    } else {
      console.log('❌ KEINE ERFOLGREICHEN PREIS-UPDATE-ENDPOINTS GEFUNDEN\n');
    }

    if (failed.length > 0 && failed.some(f => f.status !== 404)) {
      console.log(`⚠️  ENDPOINTS MIT NICHT-404 FEHLERN:\n`);
      failed.filter(f => f.status !== 404).forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error:`, JSON.stringify(result.error, null, 2));
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const branchId = process.argv[2] ? parseInt(process.argv[2], 10) : 3;

if (isNaN(branchId)) {
  console.error('❌ Ungültige Branch-ID');
  process.exit(1);
}

testPostEndpoints(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });
