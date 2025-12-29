/**
 * Test-Script: Prüft welche LobbyPMS API Endpoints für gecancelte Reservationen funktionieren
 * 
 * Testet verschiedene Endpoints um herauszufinden, wie man gecancelte Reservationen abrufen kann
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testCancelledReservationEndpoints() {
  try {
    // Reservation ID zum Testen (gecancelt in LobbyPMS)
    const testReservationId = '18586160';

    // Hole Reservation aus DB um Branch zu finden
    const reservation = await prisma.reservation.findFirst({
      where: {
        lobbyReservationId: testReservationId
      },
      select: {
        id: true,
        lobbyReservationId: true,
        status: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            lobbyPmsSettings: true
          }
        }
      }
    });

    if (!reservation) {
      console.log(`❌ Reservation ${testReservationId} nicht in DB gefunden`);
      return;
    }

    if (!reservation.branchId || !reservation.branch) {
      console.log(`❌ Reservation ${testReservationId} hat keinen Branch`);
      return;
    }

    const branch = reservation.branch;

    if (!branch.lobbyPmsSettings) {
      console.log(`❌ Branch ${branch.name} (ID: ${branch.id}) hat keine LobbyPMS Settings`);
      return;
    }

    console.log(`✅ Reservation gefunden:`);
    console.log(`   ID: ${reservation.id}`);
    console.log(`   LobbyReservationId: ${reservation.lobbyReservationId}`);
    console.log(`   Status in DB: ${reservation.status}`);
    console.log(`   Branch: ${branch.name} (ID: ${branch.id})`);

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

    console.log(`\n🔍 Teste LobbyPMS API Endpoints für gecancelte Reservation ${testReservationId}:\n`);

    // Liste aller möglichen Endpoints
    const endpoints = [
      { path: `/api/v1/bookings/${testReservationId}`, desc: 'GET /api/v1/bookings/{id}' },
      { path: `/api/v2/bookings/${testReservationId}`, desc: 'GET /api/v2/bookings/{id}' },
      { path: `/reservations/${testReservationId}`, desc: 'GET /reservations/{id}' },
      { path: `/api/v1/reservations/${testReservationId}`, desc: 'GET /api/v1/reservations/{id}' },
      { path: `/api/v2/reservations/${testReservationId}`, desc: 'GET /api/v2/reservations/{id}' },
      { path: `/bookings/${testReservationId}`, desc: 'GET /bookings/{id}' },
    ];

    let foundEndpoint: string | null = null;
    let foundStatus: string | null = null;

    for (const endpoint of endpoints) {
      console.log(`\n${endpoint.desc}:`);
      try {
        const response = await axiosInstance.get(endpoint.path, {
          validateStatus: (status) => status < 500
        });

        if (response.status === 200) {
          console.log(`   ✅ Status: ${response.status}`);
          const data = response.data?.data || response.data;
          console.log(`   🎯 Status in LobbyPMS: ${data?.status || 'N/A'}`);
          console.log(`   🆔 Booking ID: ${data?.booking_id || data?.id || 'N/A'}`);
          
          if (data?.status === 'cancelled' || data?.status === 'cancelado') {
            console.log(`   ⚠️  ✅ Reservation ist GECANCELT in LobbyPMS!`);
            foundEndpoint = endpoint.path;
            foundStatus = data?.status;
          }
          
          console.log(`   📦 Response (erste 300 Zeichen):`, JSON.stringify(data, null, 2).substring(0, 300));
        } else {
          console.log(`   ❌ Status: ${response.status}`);
          if (response.data) {
            console.log(`   📦 Error Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
          }
        }
      } catch (error: any) {
        console.log(`   ❌ Fehler: ${error.response?.status || error.code} - ${error.message}`);
        if (error.response?.data) {
          console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
        }
      }
    }

    // Prüfe ob in Liste enthalten
    console.log(`\n\n📋 Prüfe ob in Liste /api/v1/bookings enthalten:`);
    try {
      const response = await axiosInstance.get('/api/v1/bookings', {
        params: {
          per_page: 100,
          page: 1
        }
      });

      const bookings = response.data?.data || response.data || [];
      const found = Array.isArray(bookings) ? bookings.find((b: any) => 
        String(b.booking_id || b.id) === testReservationId
      ) : null;

      if (found) {
        console.log(`   ✅ Reservation in Liste gefunden`);
        console.log(`   🎯 Status in Liste: ${found.status || 'N/A'}`);
      } else {
        console.log(`   ❌ Reservation NICHT in Liste enthalten`);
        console.log(`   📊 Anzahl Reservationen in Liste: ${Array.isArray(bookings) ? bookings.length : 'N/A'}`);
        console.log(`   ⚠️  Gecancelte Reservationen werden aus Liste gefiltert!`);
      }
    } catch (error: any) {
      console.log(`   ❌ Fehler: ${error.response?.status || error.code} - ${error.message}`);
    }

    // Zusammenfassung
    console.log(`\n\n📊 ZUSAMMENFASSUNG:`);
    if (foundEndpoint) {
      console.log(`   ✅ FUNKTIONIERENDER ENDPOINT GEFUNDEN: ${foundEndpoint}`);
      console.log(`   🎯 Status: ${foundStatus}`);
      console.log(`   💡 Verwende diesen Endpoint für syncExistingReservations()`);
    } else {
      console.log(`   ❌ KEIN FUNKTIONIERENDER ENDPOINT GEFUNDEN`);
      console.log(`   ⚠️  Gecancelte Reservationen können NICHT per API abgerufen werden`);
      console.log(`   💡 Alternative Lösung erforderlich`);
    }

    console.log(`\n✅ Test abgeschlossen`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancelledReservationEndpoints();

