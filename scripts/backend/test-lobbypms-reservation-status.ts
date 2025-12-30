/**
 * Test-Script: Prüft Status einer Reservation in LobbyPMS API
 * 
 * Verwendet Produktiv-Datenbank und LobbyPMS API direkt
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testLobbyPmsReservationStatus() {
  try {
    // 1. Hole Reservation 18586160 aus Produktiv-DB
    const reservation = await prisma.reservation.findFirst({
      where: { lobbyReservationId: '18586160' },
      select: {
        id: true,
        lobbyReservationId: true,
        status: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            lobbyPmsSettings: true,
            organizationId: true
          }
        }
      }
    });

    if (!reservation) {
      console.log('❌ Reservation 18586160 nicht in DB gefunden');
      return;
    }

    console.log(`✅ Reservation gefunden:`);
    console.log(`   ID: ${reservation.id}`);
    console.log(`   LobbyReservationId: ${reservation.lobbyReservationId}`);
    console.log(`   Status in DB: ${reservation.status}`);
    console.log(`   Branch: ${reservation.branch?.name} (ID: ${reservation.branchId})`);

    if (!reservation.branch?.lobbyPmsSettings) {
      console.log('❌ Branch hat keine LobbyPMS Settings');
      return;
    }

    // 2. Lade LobbyPMS Settings
    const settings = decryptBranchApiSettings(reservation.branch.lobbyPmsSettings as any);
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

    // 3. Erstelle Axios-Instanz für LobbyPMS API
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${lobbyPmsSettings.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // 4. Teste verschiedene Endpoints für einzelne Reservation
    const reservationId = reservation.lobbyReservationId!;
    console.log(`\n🔍 Teste LobbyPMS API Endpoints für Reservation ${reservationId}:`);

    // Test 1: /api/v1/bookings/{id}
    console.log(`\n1️⃣ Test: GET /api/v1/bookings/${reservationId}`);
    try {
      const response1 = await axiosInstance.get(`/api/v1/bookings/${reservationId}`);
      console.log(`   ✅ Status: ${response1.status}`);
      console.log(`   📦 Response:`, JSON.stringify(response1.data, null, 2));
      
      // Prüfe Status
      const data = response1.data?.data || response1.data;
      if (data?.status) {
        console.log(`   🎯 Status in LobbyPMS: ${data.status}`);
      }
      if (data?.booking_id || data?.id) {
        console.log(`   🆔 Booking ID: ${data.booking_id || data.id}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2));
      }
    }

    // Test 2: /reservations/{id}
    console.log(`\n2️⃣ Test: GET /reservations/${reservationId}`);
    try {
      const response2 = await axiosInstance.get(`/reservations/${reservationId}`);
      console.log(`   ✅ Status: ${response2.status}`);
      console.log(`   📦 Response:`, JSON.stringify(response2.data, null, 2));
      
      // Prüfe Status
      const data = response2.data?.data || response2.data;
      if (data?.status) {
        console.log(`   🎯 Status in LobbyPMS: ${data.status}`);
      }
      if (data?.booking_id || data?.id) {
        console.log(`   🆔 Booking ID: ${data.booking_id || data.id}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status} - ${error.message}`);
      if (error.response?.data) {
        console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2));
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
      const found = bookings.find((b: any) => 
        String(b.booking_id || b.id) === reservationId
      );

      if (found) {
        console.log(`   ✅ Reservation in Liste gefunden`);
        console.log(`   🎯 Status in Liste: ${found.status || 'N/A'}`);
        console.log(`   📦 Reservation Data:`, JSON.stringify(found, null, 2));
      } else {
        console.log(`   ❌ Reservation NICHT in Liste enthalten`);
        console.log(`   📊 Anzahl Reservationen in Liste: ${Array.isArray(bookings) ? bookings.length : 'N/A'}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status} - ${error.message}`);
    }

    console.log(`\n✅ Test abgeschlossen`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLobbyPmsReservationStatus();

