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
    const testPrice = currentPrice + 5000; // Erhöhe um 5000 für Test
    
    console.log(`📋 Test-Daten:`);
    console.log(`   Kategorie ID: ${categoryId}`);
    console.log(`   Datum: ${testDate}`);
    console.log(`   Aktueller Preis: ${currentPrice}`);
    console.log(`   Test-Preis: ${testPrice}\n`);

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
    ];
    
    const existingEndpoints: string[] = [];
    for (const endpoint of discoveryEndpoints) {
      try {
        const response = await axiosInstance.get(endpoint, { validateStatus: (s) => s < 500 });
        if (response.status !== 404) {
          existingEndpoints.push(endpoint);
          console.log(`   ✅ ${endpoint} existiert (Status: ${response.status})`);
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }
    console.log('');

    // Teste Preis-Update-Endpoints (PUT, POST, PATCH)
    const testCases = [
      // PUT-Endpoints
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'PUT /api/v2/categories/{id}/prices' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, prices: [{ people: 1, value: testPrice }] }, desc: 'PUT /api/v2/categories/{id}/prices (mit prices array)' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PUT', body: { price: testPrice }, desc: 'PUT /api/v2/categories/{id}/prices/{date}' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PUT', body: { prices: [{ people: 1, value: testPrice }] }, desc: 'PUT /api/v2/categories/{id}/prices/{date} (mit prices array)' },
      { path: `/api/v2/categories/${categoryId}/update-price`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'PUT /api/v2/categories/{id}/update-price' },
      { path: `/api/v2/categories/${categoryId}/set-price`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'PUT /api/v2/categories/{id}/set-price' },
      
      // POST-Endpoints
      { path: `/api/v2/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'POST /api/v2/prices' },
      { path: `/api/v2/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, prices: [{ people: 1, value: testPrice }] }, desc: 'POST /api/v2/prices (mit prices array)' },
      { path: `/api/v2/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, value: testPrice, people: 1 }, desc: 'POST /api/v2/prices (mit value statt price)' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'POST /api/v2/categories/{id}/prices' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, prices: [{ people: 1, value: testPrice }] }, desc: 'POST /api/v2/categories/{id}/prices (mit prices array)' },
      { path: `/api/v2/categories/${categoryId}/update-price`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'POST /api/v2/categories/{id}/update-price' },
      { path: `/api/v2/categories/${categoryId}/set-price`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'POST /api/v2/categories/{id}/set-price' },
      
      // PATCH-Endpoints
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PATCH', body: { price: testPrice }, desc: 'PATCH /api/v2/categories/{id}/prices/{date}' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PATCH', body: { prices: [{ people: 1, value: testPrice }] }, desc: 'PATCH /api/v2/categories/{id}/prices/{date} (mit prices array)' },
      { path: `/api/v2/categories/${categoryId}`, method: 'PATCH', body: { prices: { [testDate]: { [1]: testPrice } } }, desc: 'PATCH /api/v2/categories/{id} (mit prices object)' },
      
      // V1-Endpoints (für Kompatibilität)
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'PUT /api/v1/categories/{id}/prices' },
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'POST /api/v1/prices' },
      
      // available-rooms mit Preis-Updates (POST statt PUT)
      { path: `/api/v2/available-rooms`, method: 'POST', body: { date: testDate, categories: [{ category_id: categoryId, plans: [{ prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'POST /api/v2/available-rooms (mit Preis-Updates)' },
      
      // Rate Plans
      { path: `/api/v2/rate-plans/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'PUT /api/v2/rate-plans/{id}/prices' },
      { path: `/api/v2/rate-plans/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'POST /api/v2/rate-plans/{id}/prices' },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    console.log('🧪 Teste Preis-Update-Endpoints (PUT/POST/PATCH)...\n');

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














