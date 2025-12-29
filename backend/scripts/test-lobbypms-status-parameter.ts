/**
 * Test-Script: Prüft verschiedene Status-Parameter-Werte
 * 
 * Basierend auf LobbyBookings Frontend, das status=0 verwendet
 * Testet verschiedene Status-Werte um gecancelte Reservationen zu finden
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testStatusParameters() {
  try {
    const testReservationId = '18586160';

    // Hole Reservation aus DB
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

    if (!reservation || !reservation.branch?.lobbyPmsSettings) {
      console.log('❌ Reservation oder Branch Settings nicht gefunden');
      return;
    }

    const branch = reservation.branch;
    const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
    const lobbyPmsSettings = settings?.lobbyPms || settings;

    if (!lobbyPmsSettings?.apiKey || !lobbyPmsSettings?.apiUrl) {
      console.log('❌ LobbyPMS API Key oder URL fehlt');
      return;
    }

    // Teste beide API-URLs: api.lobbypms.com und app.lobbybookings.com
    const apiUrls = [
      lobbyPmsSettings.apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com').replace(/\/api$/, ''),
      'https://app.lobbybookings.com'
    ];

    console.log(`✅ Reservation gefunden: ${reservation.lobbyReservationId} (Branch: ${branch.name})\n`);

    for (const apiUrl of apiUrls) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📡 Teste API: ${apiUrl}`);
      console.log(`${'='.repeat(60)}\n`);

      const axiosInstance: AxiosInstance = axios.create({
        baseURL: apiUrl,
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${lobbyPmsSettings.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Teste verschiedene Status-Werte
      const statusValues = [
        null, // Kein Status-Parameter
        0, 1, 2, 3, 4, 5, -1,
        'cancelled', 'cancelado', 'canceled',
        'all', 'active', 'inactive',
        'confirmed', 'checked_in', 'checked_out', 'no_show'
      ];

      for (const statusValue of statusValues) {
        try {
          const params: any = {
            per_page: 1000, // Mehr Ergebnisse
            page: 1
          };

          if (statusValue !== null) {
            params.status = statusValue;
          }

          const response = await axiosInstance.get('/api/v1/bookings', {
            params,
            validateStatus: (status) => status < 500
          });

          if (response.status === 200) {
            const bookings = response.data?.data || response.data || [];
            const count = Array.isArray(bookings) ? bookings.length : 0;
            
            // Suche nach der Reservation
            const found = Array.isArray(bookings) ? bookings.find((b: any) => 
              String(b.booking_id || b.id) === testReservationId
            ) : null;

            if (found) {
              console.log(`\n🎯 ✅ GEFUNDEN mit status=${statusValue}:`);
              console.log(`   Status in Response: ${found.status || 'N/A'}`);
              console.log(`   Booking ID: ${found.booking_id || found.id}`);
              console.log(`   Total in Array: ${count}`);
              console.log(`   📦 Response:`, JSON.stringify(found, null, 2).substring(0, 500));
              return; // Erfolg!
            } else {
              console.log(`   status=${statusValue}: ${count} Reservationen, Reservation ${testReservationId} NICHT gefunden`);
            }
          } else {
            console.log(`   status=${statusValue}: Status ${response.status}`);
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.log(`   status=${statusValue}: Fehler ${error.response?.status || error.code}`);
          }
        }
      }

      // Teste auch direkte Endpoints mit verschiedenen Status-Werten
      console.log(`\n📋 Teste direkte Endpoints mit Status-Parametern:`);
      
      const directEndpoints = [
        `/api/bookings?status=0&booking=${testReservationId}`,
        `/api/bookings?status=1&booking=${testReservationId}`,
        `/api/bookings?status=2&booking=${testReservationId}`,
        `/api/bookings?status=-1&booking=${testReservationId}`,
        `/api/bookings?status=all&booking=${testReservationId}`,
        `/api/bookings?status=cancelled&booking=${testReservationId}`,
        `/api/bookings?channel=0&status=0&booking=${testReservationId}`,
        `/api/bookings?channel=0&status=1&booking=${testReservationId}`,
        `/api/bookings?channel=0&status=2&booking=${testReservationId}`,
      ];

      for (const endpoint of directEndpoints) {
        try {
          const response = await axiosInstance.get(endpoint, {
            validateStatus: (status) => status < 500
          });

          if (response.status === 200) {
            const bookings = response.data?.data || response.data || [];
            const count = Array.isArray(bookings) ? bookings.length : 0;
            
            const found = Array.isArray(bookings) ? bookings.find((b: any) => 
              String(b.booking_id || b.id) === testReservationId
            ) : null;

            if (found) {
              console.log(`\n🎯 ✅ GEFUNDEN mit ${endpoint}:`);
              console.log(`   Status in Response: ${found.status || 'N/A'}`);
              console.log(`   📦 Response:`, JSON.stringify(found, null, 2).substring(0, 500));
              return;
            } else {
              console.log(`   ${endpoint}: ${count} Reservationen, NICHT gefunden`);
            }
          }
        } catch (error: any) {
          // Ignoriere Fehler
        }
      }
    }

    console.log(`\n❌ Reservation ${testReservationId} mit keinem Status-Parameter gefunden`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStatusParameters();

