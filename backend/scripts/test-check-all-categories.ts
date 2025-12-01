/**
 * Test-Script: Prüft alle Kategorien, die die LobbyPMS API zurückgibt
 * 
 * Usage: npx ts-node scripts/test-check-all-categories.ts [branchId] [startDate] [endDate]
 * 
 * Beispiel:
 *   npx ts-node scripts/test-check-all-categories.ts 3 2025-11-28 2025-11-29
 */

import { LobbyPmsService } from '../src/services/lobbyPmsService';

async function testAllCategories() {
  const branchId = parseInt(process.argv[2]) || 3; // Manila
  const startDateStr = process.argv[3] || '2025-11-28';
  const endDateStr = process.argv[4] || '2025-11-29';

  console.log('🔍 Test: Alle Kategorien prüfen');
  console.log(`Branch ID: ${branchId}`);
  console.log(`Start Date: ${startDateStr}`);
  console.log(`End Date: ${endDateStr}`);
  console.log('---\n');

  try {
    const service = await LobbyPmsService.createForBranch(branchId);
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    console.log('📡 Rufe LobbyPMS API auf...\n');
    const availability = await service.checkAvailability(startDate, endDate);

    console.log(`✅ API Response: ${availability.length} Einträge erhalten\n`);

    // Gruppiere nach categoryId
    const categoryMap = new Map<number, {
      categoryId: number;
      name: string;
      roomType: 'compartida' | 'privada';
      dates: Array<{ date: string; availableRooms: number; price: number }>;
    }>();

    for (const item of availability) {
      if (!categoryMap.has(item.categoryId)) {
        categoryMap.set(item.categoryId, {
          categoryId: item.categoryId,
          name: item.roomName,
          roomType: item.roomType,
          dates: []
        });
      }

      const category = categoryMap.get(item.categoryId)!;
      category.dates.push({
        date: item.date,
        availableRooms: item.availableRooms,
        price: item.pricePerNight
      });
    }

    console.log(`📊 Gefundene Kategorien: ${categoryMap.size}\n`);
    console.log('---\n');

    // Zeige alle Kategorien
    for (const [categoryId, category] of categoryMap.entries()) {
      const minAvailable = Math.min(...category.dates.map(d => d.availableRooms));
      const maxAvailable = Math.max(...category.dates.map(d => d.availableRooms));
      const avgPrice = category.dates.reduce((sum, d) => sum + d.price, 0) / category.dates.length;

      console.log(`🏠 Kategorie: ${category.name}`);
      console.log(`   ID: ${categoryId}`);
      console.log(`   Typ: ${category.roomType}`);
      console.log(`   Verfügbare Zimmer: ${minAvailable} - ${maxAvailable}`);
      console.log(`   Preis (Ø): ${avgPrice.toLocaleString('de-CH')} COP`);
      console.log(`   Details pro Datum:`);
      for (const dateInfo of category.dates) {
        console.log(`     - ${dateInfo.date}: ${dateInfo.availableRooms} Zimmer, ${dateInfo.price.toLocaleString('de-CH')} COP`);
      }
      console.log('');
    }

    // Prüfe speziell nach "primo deportista"
    console.log('---\n');
    console.log('🔍 Suche nach "primo deportista"...\n');
    const primoDeportista = Array.from(categoryMap.values()).find(
      cat => cat.name.toLowerCase().includes('deportista')
    );

    if (primoDeportista) {
      console.log('✅ "primo deportista" GEFUNDEN!');
      console.log(`   ID: ${primoDeportista.categoryId}`);
      console.log(`   Typ: ${primoDeportista.roomType}`);
      const minAvailable = Math.min(...primoDeportista.dates.map(d => d.availableRooms));
      console.log(`   Verfügbare Zimmer: ${minAvailable}`);
    } else {
      console.log('❌ "primo deportista" NICHT GEFUNDEN in API Response!');
      console.log('   Verfügbare Namen:');
      for (const cat of categoryMap.values()) {
        console.log(`     - ${cat.name}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Fehler:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testAllCategories();


