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

    // Verwende lobbyReservationId (nicht lokale DB-ID)
    const lobbyReservationId = reservation.lobbyReservationId || testReservationId;
    console.log(`\n🔍 Teste LobbyPMS API Endpoints für gecancelte Reservation:`);
    console.log(`   LobbyReservationId: ${lobbyReservationId}`);
    console.log(`   (Lokale DB-ID: ${reservation.id})\n`);

    // Systematisch ALLE möglichen Endpoint-Varianten testen
    const basePaths = [
      '', // Root
      '/api',
      '/api/v1',
      '/api/v2',
      '/v1',
      '/v2'
    ];

    const resourceNames = [
      'reservations',
      'bookings',
      'reservation',
      'booking',
      'available-rooms',
      'rooms',
      'cancelled',
      'cancellations',
      'cancel',
      'status'
    ];

    // GET-Endpoints (ohne Suffix)
    const getEndpoints: Array<{ path: string; desc: string; params?: any }> = [];

    // 1. Path-Parameter Varianten: /resource/{id}
    for (const basePath of basePaths) {
      for (const resourceName of resourceNames) {
        const fullPath = `${basePath}/${resourceName}/${lobbyReservationId}`.replace(/\/+/g, '/');
        getEndpoints.push({
          path: fullPath,
          desc: `GET ${fullPath}`,
        });
      }
    }

    // 2. Query-Parameter Varianten: /resource?booking_id={id}, /resource?id={id}, etc.
    for (const basePath of basePaths) {
      for (const resourceName of resourceNames) {
        const baseResourcePath = `${basePath}/${resourceName}`.replace(/\/+/g, '/');
        
        // Verschiedene Query-Parameter-Namen
        const queryParams = [
          { booking_id: lobbyReservationId },
          { id: lobbyReservationId },
          { reservation_id: lobbyReservationId },
          { bookingId: lobbyReservationId },
          { reservationId: lobbyReservationId },
          { booking_id: lobbyReservationId, status: 'cancelled' },
          { booking_id: lobbyReservationId, status: 'cancelado' },
          { id: lobbyReservationId, include_cancelled: true },
          { id: lobbyReservationId, include_cancelled: 1 },
          { booking_id: lobbyReservationId, with_status: 'all' },
          { booking_id: lobbyReservationId, with_status: 'cancelled' },
        ];

        for (const params of queryParams) {
          const queryString = new URLSearchParams(params as any).toString();
          getEndpoints.push({
            path: `${baseResourcePath}?${queryString}`,
            desc: `GET ${baseResourcePath}?${queryString}`,
            params: params
          });
        }
      }
    }

    // 3. Alternative Path-Strukturen: /resource/{id}/show, /resource/{id}/get, etc.
    const pathSuffixes = ['', '/show', '/get', '/details', '/info', '/status', '/cancelled'];
    for (const basePath of basePaths) {
      for (const resourceName of resourceNames) {
        for (const suffix of pathSuffixes) {
          if (suffix) {
            const fullPath = `${basePath}/${resourceName}/${lobbyReservationId}${suffix}`.replace(/\/+/g, '/');
            getEndpoints.push({
              path: fullPath,
              desc: `GET ${fullPath}`,
            });
          }
        }
      }
    }

    // 4. Status-basierte Endpoints: /resource?status=cancelled&booking_id={id}
    for (const basePath of basePaths) {
      for (const resourceName of resourceNames) {
        const baseResourcePath = `${basePath}/${resourceName}`.replace(/\/+/g, '/');
        const statusParams = [
          { status: 'cancelled', booking_id: lobbyReservationId },
          { status: 'cancelado', booking_id: lobbyReservationId },
          { status: 'cancelled', id: lobbyReservationId },
          { filter: 'cancelled', booking_id: lobbyReservationId },
          { include: 'cancelled', booking_id: lobbyReservationId },
        ];
        
        for (const params of statusParams) {
          const queryString = new URLSearchParams(params as any).toString();
          getEndpoints.push({
            path: `${baseResourcePath}?${queryString}`,
            desc: `GET ${baseResourcePath}?${queryString}`,
            params: params
          });
        }
      }
    }

    // 5. Spezielle Endpoints: /cancelled/{id}, /cancellations/{id}, etc.
    const specialEndpoints = [
      `/cancelled/${lobbyReservationId}`,
      `/cancellations/${lobbyReservationId}`,
      `/cancel/${lobbyReservationId}`,
      `/api/v1/cancelled/${lobbyReservationId}`,
      `/api/v2/cancelled/${lobbyReservationId}`,
      `/api/v1/cancellations/${lobbyReservationId}`,
      `/api/v2/cancellations/${lobbyReservationId}`,
      `/api/v1/bookings/${lobbyReservationId}/status`,
      `/api/v2/bookings/${lobbyReservationId}/status`,
      `/api/v1/reservations/${lobbyReservationId}/status`,
      `/api/v2/reservations/${lobbyReservationId}/status`,
    ];
    
    for (const endpoint of specialEndpoints) {
      getEndpoints.push({
        path: endpoint,
        desc: `GET ${endpoint}`,
      });
    }

    let foundEndpoint: string | null = null;
    let foundStatus: string | null = null;
    let testedCount = 0;
    let successCount = 0;

    console.log(`📊 Teste ${getEndpoints.length} Endpoint-Varianten...\n`);

    for (const endpoint of getEndpoints) {
      testedCount++;
      try {
        const config: any = {
          validateStatus: (status: number) => status < 500
        };
        
        if (endpoint.params) {
          config.params = endpoint.params;
        }

        const response = await axiosInstance.get(endpoint.path, config);

        if (response.status === 200) {
          // Prüfe ob Response HTML ist (nicht JSON)
          const contentType = response.headers['content-type'] || '';
          const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          
          if (contentType.includes('text/html') || responseText.includes('<!doctype html>') || responseText.includes('<html')) {
            // HTML-Response ignorieren (nicht die API)
            continue;
          }
          
          successCount++;
          console.log(`\n✅ ${endpoint.desc}`);
          console.log(`   Status: ${response.status}`);
          
          let data = response.data?.data || response.data;
          
          // Prüfe ob Response ein Array ist (z.B. /api/v1/bookings?booking_id=...)
          if (Array.isArray(data)) {
            console.log(`   📋 Response ist Array mit ${data.length} Einträgen`);
            
            // Suche nach der gesuchten Reservation im Array
            const foundReservation = data.find((item: any) => 
              String(item.booking_id || item.id) === lobbyReservationId
            );
            
            if (foundReservation) {
              console.log(`   ✅ Reservation ${lobbyReservationId} im Array gefunden!`);
              data = foundReservation;
            } else {
              console.log(`   ❌ Reservation ${lobbyReservationId} NICHT im Array gefunden`);
              console.log(`   📦 Erste Reservation im Array:`, JSON.stringify(data[0], null, 2).substring(0, 300));
              continue; // Weiter mit nächstem Endpoint
            }
          }
          
          const status = data?.status || 'N/A';
          const bookingId = String(data?.booking_id || data?.id || 'N/A');
          
          console.log(`   🎯 Status in LobbyPMS: ${status}`);
          console.log(`   🆔 Booking ID: ${bookingId}`);
          
          if (status === 'cancelled' || status === 'cancelado') {
            console.log(`   ⚠️  ✅ Reservation ist GECANCELT in LobbyPMS!`);
            foundEndpoint = endpoint.path;
            foundStatus = status;
          }
          
          // Zeige vollständige Response für erfolgreiche Endpoints
          console.log(`   📦 Response:`, JSON.stringify(data, null, 2).substring(0, 500));
        } else if (response.status !== 404) {
          // Zeige nur non-404 Fehler (404 ist zu häufig)
          console.log(`\n⚠️  ${endpoint.desc}`);
          console.log(`   Status: ${response.status}`);
          if (response.data) {
            console.log(`   📦 Error Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
          }
        }
      } catch (error: any) {
        if (error.response?.status && error.response.status !== 404) {
          // Zeige nur non-404 Fehler
          console.log(`\n⚠️  ${endpoint.desc}`);
          console.log(`   Fehler: ${error.response.status} - ${error.message}`);
          if (error.response?.data) {
            console.log(`   📦 Error Response:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
          }
        }
      }
    }

    console.log(`\n\n📊 Test-Statistik:`);
    console.log(`   Getestet: ${testedCount} Endpoints`);
    console.log(`   Erfolgreich (200): ${successCount}`);
    console.log(`   Nicht gefunden (404): ${testedCount - successCount}`);

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

