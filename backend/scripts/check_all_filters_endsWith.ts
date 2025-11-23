import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllFilters() {
  try {
    // Hole ALLE gespeicherten Filter
    const filters = await prisma.savedFilter.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`\n=== Prüfung aller gespeicherten Filter ===`);
    console.log(`Gesamt Filter: ${filters.length}\n`);

    let endsWithCount = 0;
    let reservationEndsWithCount = 0;

    for (const filter of filters) {
      try {
        const conditions = JSON.parse(filter.conditions);
        const operators = JSON.parse(filter.operators);
        
        // Prüfe, ob endsWith verwendet wird
        const hasEndsWith = conditions.some((cond: any) => cond.operator === 'endsWith');
        
        if (hasEndsWith) {
          endsWithCount++;
          
          if (filter.tableId === 'worktracker-reservations') {
            reservationEndsWithCount++;
            console.log(`\n⚠️  RESERVATIONS-FILTER mit endsWith gefunden:`);
            console.log(`   Filter ID: ${filter.id}`);
            console.log(`   Name: ${filter.name}`);
            console.log(`   User ID: ${filter.userId}`);
            console.log(`   Table ID: ${filter.tableId}`);
            console.log(`   Conditions:`, JSON.stringify(conditions, null, 2));
            console.log(`   Operators:`, JSON.stringify(operators, null, 2));
            
            // Prüfe jede Condition auf endsWith
            conditions.forEach((cond: any, index: number) => {
              if (cond.operator === 'endsWith') {
                console.log(`\n   Condition ${index} (endsWith):`);
                console.log(`     column: "${cond.column}" (${typeof cond.column})`);
                console.log(`     operator: "${cond.operator}" (${typeof cond.operator})`);
                console.log(`     value: ${JSON.stringify(cond.value)} (${typeof cond.value})`);
                console.log(`     value ist null: ${cond.value === null}`);
                console.log(`     value ist undefined: ${cond.value === undefined}`);
                
                // Prüfe, ob value ein Problem verursachen könnte
                if (cond.value === undefined) {
                  console.log(`     ⚠️  PROBLEM: value ist undefined!`);
                }
                if (cond.value !== null && cond.value !== undefined && typeof cond.value !== 'string' && typeof cond.value !== 'number') {
                  console.log(`     ⚠️  PROBLEM: value ist kein String/Number: ${typeof cond.value}`);
                }
              }
            });
          }
        }
      } catch (error) {
        console.error(`❌ Fehler beim Parsen von Filter ${filter.id}:`, error);
        console.log(`   Raw conditions: ${filter.conditions}`);
        console.log(`   Raw operators: ${filter.operators}`);
      }
    }

    console.log(`\n=== Zusammenfassung ===`);
    console.log(`Gesamt Filter geprüft: ${filters.length}`);
    console.log(`Filter mit endsWith: ${endsWithCount}`);
    console.log(`Reservations-Filter mit endsWith: ${reservationEndsWithCount}`);
    
    if (reservationEndsWithCount === 0) {
      console.log(`\n✅ Keine Reservations-Filter mit endsWith gefunden.`);
    }
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Filter:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllFilters();

