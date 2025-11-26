#!/usr/bin/env node
/**
 * Test-Script: Testet POST-Endpoints (da PUT/PATCH 405 geben)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testPostEndpoints(branchId: number) {
  console.log('\n🔍 LobbyPMS POST-Endpoint Test');
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

    // Teste POST-Endpoints
    const testCases = [
      // Status-Update mit POST
      { path: `/api/v1/bookings/${reservationId}/status`, method: 'POST', body: { status: 'confirmed' }, desc: 'POST /api/v1/bookings/{id}/status' },
      { path: `/api/v1/bookings/${reservationId}/update-status`, method: 'POST', body: { status: 'confirmed' }, desc: 'POST /api/v1/bookings/{id}/update-status' },
      // Payment-Update mit POST
      { path: `/api/v1/bookings/${reservationId}/payment`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v1/bookings/{id}/payment' },
      { path: `/api/v1/bookings/${reservationId}/update-payment`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v1/bookings/{id}/update-payment' },
      { path: `/api/v1/bookings/${reservationId}/payments`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v1/bookings/{id}/payments' },
      // Allgemeine Updates
      { path: `/api/v1/bookings/${reservationId}/update`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v1/bookings/{id}/update' },
      { path: `/api/v1/bookings/${reservationId}`, method: 'POST', body: { paid_out: 1, _method: 'PATCH' }, desc: 'POST /api/v1/bookings/{id} (mit _method)' },
      // Mit Reservations statt Bookings
      { path: `/api/v1/reservations/${reservationId}/payment`, method: 'POST', body: { paid_out: 1 }, desc: 'POST /api/v1/reservations/{id}/payment' },
      { path: `/api/v1/reservations/${reservationId}/status`, method: 'POST', body: { status: 'confirmed' }, desc: 'POST /api/v1/reservations/{id}/status' },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    console.log('🧪 Teste POST-Endpoints...\n');

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
      console.log(`✅ ${successful.length} ERFOLGREICHE ENDPOINTS:\n`);
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
        console.log('');
      });
    } else {
      console.log('❌ KEINE ERFOLGREICHEN POST-ENDPOINTS GEFUNDEN\n');
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





