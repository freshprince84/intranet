import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservationFilters() {
  try {
    const RESERVATIONS_TABLE_ID = 'worktracker-reservations';
    
    // Hole alle gespeicherten Filter für Reservierungen
    const filters = await prisma.savedFilter.findMany({
      where: {
        tableId: RESERVATIONS_TABLE_ID
      }
    });

    console.log(`\n=== Gefundene Filter für Reservierungen: ${filters.length} ===\n`);

    for (const filter of filters) {
      console.log(`\nFilter ID: ${filter.id}`);
      console.log(`Name: ${filter.name}`);
      console.log(`User ID: ${filter.userId}`);
      
      try {
        const conditions = JSON.parse(filter.conditions);
        const operators = JSON.parse(filter.operators);
        
        console.log(`Conditions:`, JSON.stringify(conditions, null, 2));
        console.log(`Operators:`, JSON.stringify(operators, null, 2));
        
        // Prüfe, ob endsWith verwendet wird
        const hasEndsWith = conditions.some((cond: any) => cond.operator === 'endsWith');
        if (hasEndsWith) {
          console.log(`⚠️  WARNUNG: Filter verwendet 'endsWith' Operator!`);
          
          // Prüfe jede Condition auf endsWith
          conditions.forEach((cond: any, index: number) => {
            if (cond.operator === 'endsWith') {
              console.log(`  - Condition ${index}: column="${cond.column}", operator="${cond.operator}", value="${cond.value}"`);
              console.log(`    - value type: ${typeof cond.value}`);
              console.log(`    - value is null: ${cond.value === null}`);
              console.log(`    - value is undefined: ${cond.value === undefined}`);
            }
          });
        }
        
        // Prüfe auf fehlerhafte Daten
        conditions.forEach((cond: any, index: number) => {
          if (!cond.column || cond.column === null || cond.column === undefined) {
            console.log(`⚠️  FEHLER: Condition ${index} hat keine column!`);
          }
          if (cond.value === undefined) {
            console.log(`⚠️  FEHLER: Condition ${index} hat undefined value!`);
          }
        });
        
      } catch (error) {
        console.error(`❌ FEHLER beim Parsen von Filter ${filter.id}:`, error);
        console.log(`Raw conditions: ${filter.conditions}`);
        console.log(`Raw operators: ${filter.operators}`);
      }
    }
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Filter:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservationFilters();

