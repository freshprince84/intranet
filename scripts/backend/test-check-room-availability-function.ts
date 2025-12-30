/**
 * Test-Script für check_room_availability Function
 * 
 * Testet die WhatsApp Bot Function direkt
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/test-check-room-availability-function.ts
 */

import { WhatsAppFunctionHandlers } from '../src/services/whatsappFunctionHandlers';
import { prisma } from '../src/utils/prisma';

async function testCheckRoomAvailability() {
  console.log('🧪 Test: check_room_availability Function\n');
  console.log('=' .repeat(80));
  
  try {
    // Hole Branch Manila (ID: 3)
    const branch = await prisma.branch.findFirst({
      where: { id: 3 }, // Manila
      select: { id: true, name: true }
    });

    if (!branch) {
      console.error('❌ Branch Manila (ID: 3) nicht gefunden!');
      process.exit(1);
    }

    console.log(`✅ Branch: ${branch.name} (ID: ${branch.id})\n`);

    // Test-Daten
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    const startDate = formatDate(tomorrow);
    const endDate = formatDate(dayAfterTomorrow);

    console.log(`📅 Test-Zeitraum: ${startDate} bis ${endDate}\n`);

    // Test 1: Alle Zimmer
    console.log('📋 Test 1: Alle Zimmer (ohne Filter)');
    try {
      const result1 = await WhatsAppFunctionHandlers.check_room_availability(
        {
          startDate: startDate,
          endDate: endDate
        },
        null, // userId
        null, // roleId
        branch.id // branchId
      );

      console.log('✅ Erfolg!');
      console.log(`   Gefundene Zimmer: ${result1.totalRooms}`);
      console.log(`   Zimmerarten: ${result1.roomType}`);
      console.log('\n   Zimmer:');
      result1.rooms.forEach((room: any, index: number) => {
        console.log(`   ${index + 1}. ${room.name} (${room.type})`);
        console.log(`      Verfügbar: ${room.availableRooms} Zimmer`);
        console.log(`      Preis: ${room.pricePerNight} ${room.currency}/Nacht (1 Person)`);
        if (room.prices.length > 1) {
          console.log(`      Preise: ${room.prices.map((p: any) => `${p.people} Pers. = ${p.price} ${room.currency}`).join(', ')}`);
        }
      });
    } catch (error: any) {
      console.error('❌ Fehler:', error.message);
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Test 2: Nur Dorm-Zimmer (compartida)
    console.log('📋 Test 2: Nur Dorm-Zimmer (compartida)');
    try {
      const result2 = await WhatsAppFunctionHandlers.check_room_availability(
        {
          startDate: startDate,
          endDate: endDate,
          roomType: 'compartida'
        },
        null,
        null,
        branch.id
      );

      console.log('✅ Erfolg!');
      console.log(`   Gefundene Dorm-Zimmer: ${result2.totalRooms}`);
      console.log('\n   Zimmer:');
      result2.rooms.forEach((room: any, index: number) => {
        console.log(`   ${index + 1}. ${room.name} (${room.type})`);
        console.log(`      Verfügbar: ${room.availableRooms} Zimmer`);
        console.log(`      Preis: ${room.pricePerNight} ${room.currency}/Nacht`);
      });
    } catch (error: any) {
      console.error('❌ Fehler:', error.message);
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Test 3: Nur private Zimmer (privada)
    console.log('📋 Test 3: Nur private Zimmer (privada)');
    try {
      const result3 = await WhatsAppFunctionHandlers.check_room_availability(
        {
          startDate: startDate,
          endDate: endDate,
          roomType: 'privada'
        },
        null,
        null,
        branch.id
      );

      console.log('✅ Erfolg!');
      console.log(`   Gefundene private Zimmer: ${result3.totalRooms}`);
      console.log('\n   Zimmer:');
      result3.rooms.forEach((room: any, index: number) => {
        console.log(`   ${index + 1}. ${room.name} (${room.type})`);
        console.log(`      Verfügbar: ${room.availableRooms} Zimmer`);
        console.log(`      Preis: ${room.pricePerNight} ${room.currency}/Nacht`);
      });
    } catch (error: any) {
      console.error('❌ Fehler:', error.message);
    }

    console.log('\n' + '-'.repeat(80) + '\n');

    // Test 4: Nur startDate (endDate wird automatisch +1 Tag)
    console.log('📋 Test 4: Nur startDate (endDate automatisch +1 Tag)');
    try {
      const result4 = await WhatsAppFunctionHandlers.check_room_availability(
        {
          startDate: startDate
        },
        null,
        null,
        branch.id
      );

      console.log('✅ Erfolg!');
      console.log(`   Zeitraum: ${result4.startDate} bis ${result4.endDate}`);
      console.log(`   Gefundene Zimmer: ${result4.totalRooms}`);
    } catch (error: any) {
      console.error('❌ Fehler:', error.message);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Alle Tests abgeschlossen');

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Tests aus
testCheckRoomAvailability().catch(console.error);

