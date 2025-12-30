/**
 * Test-Script: Prüft LobbyPMS API Endpoints für einzelne Reservationen
 * 
 * Testet verschiedene Endpoints um herauszufinden, welcher für einzelne Reservationen funktioniert
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testLobbyPmsApiEndpoints() {
  try {
    // Reservation ID zum Testen
    const testReservationId = '18586160';

    // Hole Branch mit LobbyPMS Settings (Branch 3 oder 4)
    const branch = await prisma.branch.findFirst({
      where: {
        id: { in: [3, 4] },
        lobbyPmsSettings: { not: null }
      },
      select: {
        id: true,
        name: true,
        lobbyPmsSettings: true
      }
    });

    if (!branch?.lobbyPmsSettings) {
      console.log('❌ Kein Branch mit LobbyPMS Settings gefunden');
      return;
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);

    // Lade LobbyPMS Settings
    const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
    const lobbyPmsSettings = settings?.lobbyPms || settings;

    if (!lobbyPmsSettings?.apiKey || !lobbyPmsSettings?.apiUrl) {
      console.log('❌ LobbyPMS API Key oder URL fehlt');
      return;
    }

    let apiUrl = lobbyPmsSettings.apiUrl;
    if (apiUrl.includes('app.lobbypms.com')) {
      apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
    }
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.replace(/\/api$/, '');
    }

    console.log(`\n📡 LobbyPMS API Konfiguration:`);
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   API Key: ${lobbyPmsSettings.apiKey.substring(0, 10)}...`);

    // Erstelle Axios-Instanz für LobbyPMS API
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${lobbyPmsSettings.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`\n🔍 Teste LobbyPMS API Endpoints für Reservation ${testReservationId}:\n`);

    // Test 1: /api/v1/bookings/{id}
    console.log(`1️⃣ Test: GET ${apiUrl}/api/v1/bookings/${testReservationId}`);
    try {
      const response1 = await axiosInstance.get(`/api/v1/bookings/${testReservationId}`);
      console.log(`   ✅ Status: ${response1.status}`);
      const data = response1.data?.data || response1.data;
      console.log(`   🎯 Status in LobbyPMS: ${data?.status || 'N/A'}`);
      console.log(`   🆔 Booking ID: ${data?.booking_id || data?.id || 'N/A'}`);
      if (data?.status === 'cancelled' || data?.status === 'cancelado') {
        console.log(`   ⚠️  Reservation ist GECANCELT in LobbyPMS!`);
      }
      console.log(`   📦 Response (erste 500 Zeichen):`, JSON.stringify(data, null, 2).substring(0, 500));
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status || error.code} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2).substring(0, 300));
      }
    }

    // Test 2: /reservations/{id}
    console.log(`\n2️⃣ Test: GET ${apiUrl}/reservations/${testReservationId}`);
    try {
      const response2 = await axiosInstance.get(`/reservations/${testReservationId}`);
      console.log(`   ✅ Status: ${response2.status}`);
      const data = response2.data?.data || response2.data;
      console.log(`   🎯 Status in LobbyPMS: ${data?.status || 'N/A'}`);
      console.log(`   🆔 Booking ID: ${data?.booking_id || data?.id || 'N/A'}`);
      if (data?.status === 'cancelled' || data?.status === 'cancelado') {
        console.log(`   ⚠️  Reservation ist GECANCELT in LobbyPMS!`);
      }
      console.log(`   📦 Response (erste 500 Zeichen):`, JSON.stringify(data, null, 2).substring(0, 500));
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status || error.code} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2).substring(0, 300));
      }
    }

    // Test 3: Prüfe ob in Liste enthalten
    console.log(`\n3️⃣ Test: Prüfe ob in Liste /api/v1/bookings enthalten`);
    try {
      const response3 = await axiosInstance.get('/api/v1/bookings', {
        params: {
          per_page: 100,
          page: 1
        }
      });

      const bookings = response3.data?.data || response3.data || [];
      const found = Array.isArray(bookings) ? bookings.find((b: any) => 
        String(b.booking_id || b.id) === testReservationId
      ) : null;

      if (found) {
        console.log(`   ✅ Reservation in Liste gefunden`);
        console.log(`   🎯 Status in Liste: ${found.status || 'N/A'}`);
        if (found.status === 'cancelled' || found.status === 'cancelado') {
          console.log(`   ⚠️  Reservation ist GECANCELT in LobbyPMS Liste!`);
        }
      } else {
        console.log(`   ❌ Reservation NICHT in Liste enthalten`);
        console.log(`   📊 Anzahl Reservationen in Liste: ${Array.isArray(bookings) ? bookings.length : 'N/A'}`);
        console.log(`   ⚠️  Gecancelte Reservationen werden möglicherweise aus Liste gefiltert!`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status || error.code} - ${error.message}`);
    }

    console.log(`\n✅ Test abgeschlossen`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLobbyPmsApiEndpoints();

