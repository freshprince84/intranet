#!/usr/bin/env node
/**
 * Test-Script: Testet /api/v2/ Endpoints für Payment-Updates
 * 
 * Basierend auf dem erfolgreichen Python-Script das /api/v2/available-rooms verwendet
 * Wir verwenden unsere bestehende Bearer Token Auth
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testV2PaymentEndpoints(branchId: number) {
  console.log('\n🔍 LobbyPMS /api/v2/ Payment-Endpoint Test');
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

    // Erstelle Axios-Instanz mit Bearer Token (wie im bestehenden Code)
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // Schritt 1: Teste /api/v2/available-rooms (wie im Python-Script) um zu bestätigen, dass v2 funktioniert
    console.log('📥 Schritt 1: Teste /api/v2/available-rooms (Referenz aus Python-Script)...\n');
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      
      const availableRoomsResponse = await axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: tomorrow.toISOString().split('T')[0],
          end_date: dayAfter.toISOString().split('T')[0]
        },
        validateStatus: (status) => status < 500
      });

      if (availableRoomsResponse.status === 200) {
        console.log(`   ✅ /api/v2/available-rooms funktioniert (Status 200)`);
        console.log(`   → Bestätigt, dass /api/v2/ Endpoints funktionieren\n`);
      } else {
        console.log(`   ⚠️  Status ${availableRoomsResponse.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
        console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
      }
    }

    // Schritt 2: Hole Reservierung aus DB
    const dbReservation = await prisma.reservation.findFirst({
      where: { 
        branchId: branchId,
        lobbyReservationId: { not: null }
      },
      select: {
        lobbyReservationId: true,
        guestName: true,
        amount: true
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
    console.log(`📋 Test-Reservierung: ${reservationId} (${dbReservation.guestName})`);
    console.log(`   Amount: ${dbReservation.amount || 'N/A'}\n`);

    // Schritt 3: Teste verschiedene /api/v2/ Payment-Endpoint-Varianten
    console.log('📤 Schritt 2: Teste /api/v2/ Payment-Endpoint-Varianten...\n');
    
    // Basierend auf dem Python-Script Pattern: /api/v2/available-rooms
    // Mögliche Payment-Endpoints:
    const testCases = [
      // Direktes Update des Bookings
      { 
        path: `/api/v2/bookings/${reservationId}`, 
        method: 'PUT', 
        body: { paid_out: 1 }, 
        desc: 'PUT /api/v2/bookings/{id} (paid_out)' 
      },
      { 
        path: `/api/v2/bookings/${reservationId}`, 
        method: 'PATCH', 
        body: { paid_out: 1 }, 
        desc: 'PATCH /api/v2/bookings/{id} (paid_out)' 
      },
      { 
        path: `/api/v2/bookings/${reservationId}`, 
        method: 'PUT', 
        body: { paid_out: 1, payment_status: 'paid' }, 
        desc: 'PUT /api/v2/bookings/{id} (paid_out + payment_status)' 
      },
      { 
        path: `/api/v2/bookings/${reservationId}`, 
        method: 'PUT', 
        body: { paid_out: 1, payment_method: 'card' }, 
        desc: 'PUT /api/v2/bookings/{id} (paid_out + payment_method)' 
      },
      // Mit payment-Endpoint
      { 
        path: `/api/v2/bookings/${reservationId}/payment`, 
        method: 'PUT', 
        body: { paid_out: 1 }, 
        desc: 'PUT /api/v2/bookings/{id}/payment' 
      },
      { 
        path: `/api/v2/bookings/${reservationId}/payment`, 
        method: 'POST', 
        body: { paid_out: 1 }, 
        desc: 'POST /api/v2/bookings/{id}/payment' 
      },
      // Mit payments-Endpoint (Plural)
      { 
        path: `/api/v2/bookings/${reservationId}/payments`, 
        method: 'POST', 
        body: { amount: 1, payment_method: 'card' }, 
        desc: 'POST /api/v2/bookings/{id}/payments (neue Zahlung)' 
      },
      // Mit update-Endpoint
      { 
        path: `/api/v2/bookings/${reservationId}/update`, 
        method: 'POST', 
        body: { paid_out: 1 }, 
        desc: 'POST /api/v2/bookings/{id}/update' 
      },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    for (const test of testCases) {
      try {
        console.log(`📤 Teste: ${test.desc}`);
        console.log(`   ${test.method} ${test.path}`);
        console.log(`   Body:`, JSON.stringify(test.body, null, 2));
        
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
            body: test.body,
            status: response.status,
            response: response.data
          });
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          failed.push({
            path: test.path,
            method: test.method,
            body: test.body,
            status: response.status,
            error: response.data
          });
          console.log(`   ⚠️  Status ${response.status}`);
          if (response.status !== 404 && response.status !== 405) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          failed.push({
            path: test.path,
            method: test.method,
            body: test.body,
            status: axiosError.response?.status,
            error: axiosError.response?.data
          });
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else if (axiosError.response?.status === 405) {
            console.log(`   ❌ 405 - Method Not Allowed`);
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
        console.log(`   Body:`, JSON.stringify(result.body, null, 2));
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
    const outputPath = path.join(__dirname, '../lobbypms-v2-payment-results.json');
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

testV2PaymentEndpoints(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });





