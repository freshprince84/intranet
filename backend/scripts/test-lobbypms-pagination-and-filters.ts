/**
 * Test-Script: Prüft Pagination und Datum-Filter
 * 
 * Analysiert warum Reservationen nicht gefunden werden:
 * - Durchsucht mehrere Seiten (Pagination)
 * - Testet Datum-Filter (creation_date, check_out_date)
 * - Prüft ob Reservation auf späteren Seiten ist
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testPaginationAndFilters() {
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
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
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

    let apiUrl = lobbyPmsSettings.apiUrl;
    if (apiUrl.includes('app.lobbypms.com')) {
      apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
    }
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.replace(/\/api$/, '');
    }

    console.log(`✅ Reservation gefunden: ${reservation.lobbyReservationId}`);
    console.log(`   Check-in: ${reservation.checkInDate}`);
    console.log(`   Check-out: ${reservation.checkOutDate}`);
    console.log(`   Erstellt: ${reservation.createdAt}`);
    console.log(`   Branch: ${branch.name}\n`);

    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${lobbyPmsSettings.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Test 1: Durchsuche mehrere Seiten (Pagination)
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Test 1: Pagination durchsuchen (bis zu 10 Seiten)`);
    console.log(`${'='.repeat(60)}\n`);

    for (let page = 1; page <= 10; page++) {
      try {
        const response = await axiosInstance.get('/api/v1/bookings', {
          params: {
            per_page: 100,
            page: page
          }
        });

        const bookings = response.data?.data || response.data || [];
        const count = Array.isArray(bookings) ? bookings.length : 0;
        
        if (count === 0) {
          console.log(`   Seite ${page}: Keine Reservationen mehr`);
          break;
        }

        const found = Array.isArray(bookings) ? bookings.find((b: any) => 
          String(b.booking_id || b.id) === testReservationId
        ) : null;

        if (found) {
          console.log(`\n   🎯 ✅ GEFUNDEN auf Seite ${page}:`);
          console.log(`      Status: ${found.status || 'N/A'}`);
          console.log(`      Booking ID: ${found.booking_id || found.id}`);
          console.log(`      📦 Response:`, JSON.stringify(found, null, 2).substring(0, 500));
          return; // Erfolg!
        } else {
          console.log(`   Seite ${page}: ${count} Reservationen, Reservation ${testReservationId} NICHT gefunden`);
          
          // Zeige erste und letzte Reservation für Debugging
          if (Array.isArray(bookings) && bookings.length > 0) {
            const first = bookings[0];
            const last = bookings[bookings.length - 1];
            console.log(`      Erste: ${first.booking_id} (${first.creation_date || first.start_date})`);
            console.log(`      Letzte: ${last.booking_id} (${last.creation_date || last.start_date})`);
          }
        }
      } catch (error: any) {
        console.log(`   Seite ${page}: Fehler ${error.response?.status || error.code}`);
        break;
      }
    }

    // Test 2: Datum-Filter (creation_date)
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 Test 2: Datum-Filter (creation_date)`);
    console.log(`${'='.repeat(60)}\n`);

    if (reservation.createdAt) {
      const createdDate = new Date(reservation.createdAt);
      const dateStr = createdDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const dateFilters = [
        { start_date: dateStr },
        { end_date: dateStr },
        { creation_date: dateStr },
        { created_from: dateStr },
        { created_to: dateStr },
        { from_date: dateStr },
        { to_date: dateStr },
      ];

      for (const filter of dateFilters) {
        try {
          const response = await axiosInstance.get('/api/v1/bookings', {
            params: {
              ...filter,
              per_page: 1000,
              page: 1
            }
          });

          const bookings = response.data?.data || response.data || [];
          const count = Array.isArray(bookings) ? bookings.length : 0;
          const found = Array.isArray(bookings) ? bookings.find((b: any) => 
            String(b.booking_id || b.id) === testReservationId
          ) : null;

          if (found) {
            console.log(`\n   🎯 ✅ GEFUNDEN mit Filter ${JSON.stringify(filter)}:`);
            console.log(`      Status: ${found.status || 'N/A'}`);
            console.log(`      📦 Response:`, JSON.stringify(found, null, 2).substring(0, 500));
            return;
          } else {
            console.log(`   ${JSON.stringify(filter)}: ${count} Reservationen, NICHT gefunden`);
          }
        } catch (error: any) {
          // Ignoriere Fehler
        }
      }
    }

    // Test 3: Check-out-Datum Filter
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 Test 3: Check-out-Datum Filter`);
    console.log(`${'='.repeat(60)}\n`);

    if (reservation.checkOutDate) {
      const checkoutDate = new Date(reservation.checkOutDate);
      const dateStr = checkoutDate.toISOString().split('T')[0];
      
      const dateFilters = [
        { check_out_date: dateStr },
        { checkout_date: dateStr },
        { end_date: dateStr },
        { to_date: dateStr },
      ];

      for (const filter of dateFilters) {
        try {
          const response = await axiosInstance.get('/api/v1/bookings', {
            params: {
              ...filter,
              per_page: 1000,
              page: 1
            }
          });

          const bookings = response.data?.data || response.data || [];
          const count = Array.isArray(bookings) ? bookings.length : 0;
          const found = Array.isArray(bookings) ? bookings.find((b: any) => 
            String(b.booking_id || b.id) === testReservationId
          ) : null;

          if (found) {
            console.log(`\n   🎯 ✅ GEFUNDEN mit Filter ${JSON.stringify(filter)}:`);
            console.log(`      Status: ${found.status || 'N/A'}`);
            console.log(`      📦 Response:`, JSON.stringify(found, null, 2).substring(0, 500));
            return;
          } else {
            console.log(`   ${JSON.stringify(filter)}: ${count} Reservationen, NICHT gefunden`);
          }
        } catch (error: any) {
          // Ignoriere Fehler
        }
      }
    }

    // Test 4: Datum-Range (von Erstellungsdatum bis heute)
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 Test 4: Datum-Range (von Erstellungsdatum bis heute)`);
    console.log(`${'='.repeat(60)}\n`);

    if (reservation.createdAt) {
      const createdDate = new Date(reservation.createdAt);
      const fromDate = createdDate.toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      
      const rangeFilters = [
        { start_date: fromDate, end_date: toDate },
        { from_date: fromDate, to_date: toDate },
        { created_from: fromDate, created_to: toDate },
        { date_from: fromDate, date_to: toDate },
      ];

      for (const filter of rangeFilters) {
        try {
          const response = await axiosInstance.get('/api/v1/bookings', {
            params: {
              ...filter,
              per_page: 1000,
              page: 1
            }
          });

          const bookings = response.data?.data || response.data || [];
          const count = Array.isArray(bookings) ? bookings.length : 0;
          const found = Array.isArray(bookings) ? bookings.find((b: any) => 
            String(b.booking_id || b.id) === testReservationId
          ) : null;

          if (found) {
            console.log(`\n   🎯 ✅ GEFUNDEN mit Range ${JSON.stringify(filter)}:`);
            console.log(`      Status: ${found.status || 'N/A'}`);
            console.log(`      📦 Response:`, JSON.stringify(found, null, 2).substring(0, 500));
            return;
          } else {
            console.log(`   ${JSON.stringify(filter)}: ${count} Reservationen, NICHT gefunden`);
          }
        } catch (error: any) {
          // Ignoriere Fehler
        }
      }
    }

    console.log(`\n❌ Reservation ${testReservationId} mit keinem Filter/Pagination gefunden`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPaginationAndFilters();

