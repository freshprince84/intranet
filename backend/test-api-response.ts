import { LobbyPmsService } from './src/services/lobbyPmsService';
import { prisma } from './src/utils/prisma';

async function testApiResponse() {
  try {
    console.log('=== TESTE API RESPONSE ===\n');
    
    // Test für Branch 3 (Manila)
    console.log('Erstelle Service für Branch 3...');
    const service = await LobbyPmsService.createForBranch(3);
    
    // Hole erste Seite Reservierungen
    console.log('Hole erste 5 Reservierungen von API...');
    const response = await (service as any).axiosInstance.get('/api/v1/bookings', {
      params: {
        per_page: 5,
        page: 1,
        property_id: (service as any).propertyId
      }
    });
    
    console.log('\n=== API RESPONSE STRUKTUR ===');
    console.log('Response Type:', typeof response.data);
    console.log('Hat data Array?', Array.isArray(response.data?.data));
    
    if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const firstReservation = response.data.data[0];
      console.log('\n=== ERSTE RESERVIERUNG ===');
      console.log('ID:', firstReservation.id || firstReservation.booking_id);
      console.log('Hat creation_date?', !!firstReservation.creation_date);
      console.log('creation_date Wert:', firstReservation.creation_date);
      console.log('creation_date Type:', typeof firstReservation.creation_date);
      console.log('\nAlle Felder:');
      Object.keys(firstReservation).forEach(key => {
        console.log(`  - ${key}: ${typeof firstReservation[key]} = ${firstReservation[key]}`);
      });
      
      // Test Date-Parsing
      if (firstReservation.creation_date) {
        const testDate = new Date(firstReservation.creation_date);
        console.log('\n=== DATE PARSING TEST ===');
        console.log('Original:', firstReservation.creation_date);
        console.log('Parsed Date:', testDate);
        console.log('Is Valid?', !isNaN(testDate.getTime()));
        console.log('ISO String:', testDate.toISOString());
      }
    } else {
      console.log('\n❌ KEINE RESERVIERUNGEN GEFUNDEN ODER FALSCHE STRUKTUR');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
    await prisma.$disconnect();
    console.log('\n✅ Test abgeschlossen');
  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

testApiResponse();

