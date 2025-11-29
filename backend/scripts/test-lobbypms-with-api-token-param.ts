#!/usr/bin/env node
/**
 * Test-Script: Testet Endpoints mit api_token als Query-Parameter (wie im Python-Script)
 * 
 * Basierend auf dem erfolgreichen Python-Script für Preis-Updates
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testWithApiTokenParam(branchId: number) {
  console.log('\n🔍 LobbyPMS Endpoint-Test mit api_token Query-Parameter');
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

    // Hole Reservierung aus DB
    const dbReservation = await prisma.reservation.findFirst({
      where: { 
        branchId: branchId,
        lobbyReservationId: { not: null }
      },
      select: {
        lobbyReservationId: true,
        guestName: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!dbReservation || !dbReservation.lobbyReservationId) {
      console.log('⚠️  Keine Reservierung gefunden\n');
      return;
    }

    const reservationId = dbReservation.lobbyReservationId;
    console.log(`📋 Test-Reservierung: ${reservationId} (${dbReservation.guestName})\n`);

    // Erstelle Axios-Instanz MIT api_token als Query-Parameter (wie im Python-Script)
    const axiosInstanceWithToken: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        api_token: apiKey
      }
    });

    // Erstelle auch eine Instanz MIT Bearer Token (zum Vergleich)
    const axiosInstanceWithBearer: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // Teste verschiedene Endpoint-Varianten mit beiden Auth-Methoden
    const testCases = [
      // Status-Update
      { path: `/api/v2/bookings/${reservationId}/status`, method: 'PUT', body: { status: 'confirmed' }, desc: 'PUT /api/v2/bookings/{id}/status (mit api_token)' },
      { path: `/api/v2/reservations/${reservationId}/status`, method: 'PUT', body: { status: 'confirmed' }, desc: 'PUT /api/v2/reservations/{id}/status (mit api_token)' },
      // Payment-Update
      { path: `/api/v2/bookings/${reservationId}/payment`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /api/v2/bookings/{id}/payment (mit api_token)' },
      { path: `/api/v2/bookings/${reservationId}/payment`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v2/bookings/{id}/payment (mit api_token)' },
      { path: `/api/v2/bookings/${reservationId}`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /api/v2/bookings/{id} (mit api_token)' },
      { path: `/api/v2/bookings/${reservationId}`, method: 'PATCH', body: { paid_out: 1 }, desc: 'PATCH /api/v2/bookings/{id} (mit api_token)' },
      // Mit update-Endpoint
      { path: `/api/v2/bookings/${reservationId}/update`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v2/bookings/{id}/update (mit api_token)' },
      { path: `/api/v2/bookings/${reservationId}/update-payment`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v2/bookings/{id}/update-payment (mit api_token)' },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    console.log('🧪 Teste Endpoints mit api_token Query-Parameter...\n');

    for (const test of testCases) {
      try {
        console.log(`📤 Teste: ${test.desc}`);
        console.log(`   ${test.method} ${test.path}`);
        
        const response = await axiosInstanceWithToken.request({
          method: test.method as any,
          url: test.path,
          data: test.body,
          validateStatus: (status) => status < 500
        });

        if (response.status >= 200 && response.status < 300) {
          successful.push({
            path: test.path,
            method: test.method,
            auth: 'api_token query param',
            status: response.status,
            response: response.data
          });
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          failed.push({
            path: test.path,
            method: test.method,
            auth: 'api_token query param',
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
            auth: 'api_token query param',
            status: axiosError.response?.status,
            error: axiosError.response?.data
          });
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else if (axiosError.response?.status !== 405) {
            console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
            console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
          } else {
            console.log(`   ❌ 405 - Method Not Allowed`);
          }
        }
      }
      console.log('');
    }

    // Teste auch mit Bearer Token zum Vergleich
    console.log('🧪 Teste zum Vergleich mit Bearer Token...\n');

    for (const test of testCases.slice(0, 3)) { // Nur erste 3 zum Vergleich
      try {
        console.log(`📤 Teste: ${test.desc.replace('(mit api_token)', '(mit Bearer Token)')}`);
        
        const response = await axiosInstanceWithBearer.request({
          method: test.method as any,
          url: test.path,
          data: test.body,
          validateStatus: (status) => status < 500
        });

        if (response.status >= 200 && response.status < 300) {
          successful.push({
            path: test.path,
            method: test.method,
            auth: 'Bearer Token',
            status: response.status,
            response: response.data
          });
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
        } else {
          console.log(`   ⚠️  Status ${response.status}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else {
            console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
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
      console.log(`✅ ${successful.length} ERFOLGREICHE ENDPOINTS:\n`);
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Auth: ${result.auth}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
        console.log('');
      });
    } else {
      console.log('❌ KEINE ERFOLGREICHEN ENDPOINTS GEFUNDEN\n');
    }

    if (failed.length > 0 && failed.some(f => f.status !== 404 && f.status !== 405)) {
      console.log(`⚠️  ENDPOINTS MIT INTERESSANTEN FEHLERN (nicht 404/405):\n`);
      failed.filter(f => f.status !== 404 && f.status !== 405).forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error:`, JSON.stringify(result.error, null, 2));
        console.log('');
      });
    }

    // Speichere Ergebnisse
    const fs = await import('fs');
    const outputPath = path.join(__dirname, '../lobbypms-api-token-param-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({ successful, failed }, null, 2));
    console.log(`💾 Ergebnisse gespeichert in: ${outputPath}\n`);

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

testWithApiTokenParam(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });













