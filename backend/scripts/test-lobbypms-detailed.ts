/**
 * Detaillierter LobbyPMS API Test
 * 
 * Testet die gefundenen Endpoints mit korrekten Parametern
 */

import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_TOKEN = '8LwykKjLq7uziBRLxL1INGCLSsKfYWc5KIXTnRqZ28wTvSQehrIsToUJ3a5V';
const BASE_URL = 'https://api.lobbypms.com';

async function testDetailed() {
  console.log('\n🔍 Detaillierter LobbyPMS API Test');
  console.log('='.repeat(60));

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    }
  });

  try {
    // Test 1: /api/v1/bookings - Alle Reservierungen
    console.log('\n📋 Test 1: /api/v1/bookings (alle Reservierungen)');
    console.log('─'.repeat(60));
    const bookingsResponse = await axiosInstance.get('/api/v1/bookings');
    console.log(`✅ Status: ${bookingsResponse.status}`);
    console.log(`📊 Anzahl Reservierungen: ${bookingsResponse.data.data?.length || 0}`);
    
    if (bookingsResponse.data.meta) {
      console.log(`📊 Meta-Informationen:`, JSON.stringify(bookingsResponse.data.meta, null, 2));
    }
    
    if (bookingsResponse.data.data && bookingsResponse.data.data.length > 0) {
      const firstBooking = bookingsResponse.data.data[0];
      console.log(`\n📋 Erste Reservierung (vollständig):`);
      console.log(JSON.stringify(firstBooking, null, 2));
    }

    // Test 2: /api/v1/bookings mit Pagination
    console.log('\n\n📋 Test 2: /api/v1/bookings mit Pagination (page=1, per_page=5)');
    console.log('─'.repeat(60));
    const bookingsPageResponse = await axiosInstance.get('/api/v1/bookings', {
      params: {
        page: 1,
        per_page: 5
      }
    });
    console.log(`✅ Status: ${bookingsPageResponse.status}`);
    console.log(`📊 Anzahl Reservierungen: ${bookingsPageResponse.data.data?.length || 0}`);
    if (bookingsPageResponse.data.meta) {
      console.log(`📊 Meta (Pagination):`, JSON.stringify(bookingsPageResponse.data.meta, null, 2));
    }

    // Test 3: /api/v1/bookings mit Datum-Filter
    console.log('\n\n📋 Test 3: /api/v1/bookings mit Datum-Filter');
    console.log('─'.repeat(60));
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const bookingsDateResponse = await axiosInstance.get('/api/v1/bookings', {
      params: {
        start_date: today.toISOString().split('T')[0],
        end_date: nextWeek.toISOString().split('T')[0]
      }
    });
    console.log(`✅ Status: ${bookingsDateResponse.status}`);
    console.log(`📊 Reservierungen zwischen ${today.toISOString().split('T')[0]} und ${nextWeek.toISOString().split('T')[0]}: ${bookingsDateResponse.data.data?.length || 0}`);

    // Test 4: /api/v2/available-rooms mit start_date
    console.log('\n\n📋 Test 4: /api/v2/available-rooms mit start_date');
    console.log('─'.repeat(60));
    const availableRoomsResponse = await axiosInstance.get('/api/v2/available-rooms', {
      params: {
        start_date: today.toISOString().split('T')[0],
        end_date: nextWeek.toISOString().split('T')[0]
      }
    });
    console.log(`✅ Status: ${availableRoomsResponse.status}`);
    if (availableRoomsResponse.data) {
      console.log(`📊 Verfügbare Zimmer:`);
      if (Array.isArray(availableRoomsResponse.data)) {
        console.log(`   Array mit ${availableRoomsResponse.data.length} Einträgen`);
        if (availableRoomsResponse.data.length > 0) {
          console.log(`   Erster Eintrag:`, JSON.stringify(availableRoomsResponse.data[0], null, 2));
        }
      } else {
        console.log(JSON.stringify(availableRoomsResponse.data, null, 2));
      }
    }

    // Test 5: /api/v1/bookings - Einzelne Reservierung per ID
    if (bookingsResponse.data.data && bookingsResponse.data.data.length > 0) {
      const bookingId = bookingsResponse.data.data[0].booking_id;
      console.log(`\n\n📋 Test 5: /api/v1/bookings/${bookingId} (Einzelne Reservierung)`);
      console.log('─'.repeat(60));
      try {
        const singleBookingResponse = await axiosInstance.get(`/api/v1/bookings/${bookingId}`);
        console.log(`✅ Status: ${singleBookingResponse.status}`);
        console.log(`📋 Reservierungsdetails:`);
        console.log(JSON.stringify(singleBookingResponse.data, null, 2));
      } catch (error: any) {
        console.log(`❌ Fehler: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }

    // Zusammenfassung
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60));
    console.log('\n✅ Funktionsfähige Endpoints:');
    console.log('   1. GET /api/v1/bookings - Alle Reservierungen');
    console.log('   2. GET /api/v1/bookings?page=X&per_page=Y - Mit Pagination');
    console.log('   3. GET /api/v1/bookings?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD - Mit Datum-Filter');
    console.log('   4. GET /api/v2/available-rooms?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD - Verfügbare Zimmer');
    console.log('   5. GET /api/v1/bookings/{id} - Einzelne Reservierung (zu testen)');

  } catch (error: any) {
    console.error('\n❌ FEHLER:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDetailed()
  .then(() => {
    console.log('\n✅ Test abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });

