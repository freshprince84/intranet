import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDefaultFilters() {
  try {
    console.log('🔍 Suche nach falschen "Aktuell"-Filtern...');

    // Hole alle "Aktuell"-Filter
    const aktuellFilters = await prisma.savedFilter.findMany({
      where: {
        name: 'Aktuell'
      }
    });

    console.log(`Gefundene "Aktuell"-Filter: ${aktuellFilters.length}`);

    let corrected = 0;

    for (const filter of aktuellFilters) {
      const conditions = JSON.parse(filter.conditions);
      const operators = filter.operators ? JSON.parse(filter.operators) : [];
      
      let needsUpdate = false;
      let newConditions = [...conditions];

      // Prüfe, ob der Filter falsch ist
      if (filter.tableId === 'worktracker_tasks') {
        // Für Tasks: "Aktuell" sollte "nicht done" sein
        const hasWrongFilter = conditions.some((c: any) => 
          c.column === 'status' && c.operator === 'equals' && c.value === 'done'
        );
        
        if (hasWrongFilter) {
          console.log(`❌ Falscher Filter gefunden für Task-Filter ID ${filter.id}`);
          // Ersetze mit korrigiertem Filter
          newConditions = [
            { column: 'status', operator: 'notEquals', value: 'done' }
          ];
          needsUpdate = true;
        }
      } else if (filter.tableId === 'requests') {
        // Für Requests: "Aktuell" sollte approval oder to_improve sein
        const hasArchivFilter = conditions.some((c: any) => 
          (c.operator === 'equals' && c.value === 'approved') ||
          (c.operator === 'equals' && c.value === 'denied')
        );
        
        if (hasArchivFilter && conditions.length === 1) {
          console.log(`❌ Falscher Filter gefunden für Request-Filter ID ${filter.id}`);
          // Ersetze mit korrigiertem Filter
          newConditions = [
            { column: 'status', operator: 'equals', value: 'approval' },
            { column: 'status', operator: 'equals', value: 'to_improve' }
          ];
          const newOperators = ['OR'];
          needsUpdate = true;

          await prisma.savedFilter.update({
            where: { id: filter.id },
            data: {
              conditions: JSON.stringify(newConditions),
              operators: JSON.stringify(newOperators)
            }
          });
          corrected++;
          console.log(`✅ Filter ID ${filter.id} korrigiert`);
        } else if (hasArchivFilter) {
          // Nur Archiv-Filter entfernen, nicht den ganzen Filter
          newConditions = conditions.filter((c: any) => 
            !((c.operator === 'equals' && c.value === 'approved') ||
              (c.operator === 'equals' && c.value === 'denied'))
          );
          if (newConditions.length !== conditions.length) {
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate && filter.tableId === 'worktracker_tasks') {
        await prisma.savedFilter.update({
          where: { id: filter.id },
          data: {
            conditions: JSON.stringify(newConditions)
          }
        });
        corrected++;
        console.log(`✅ Filter ID ${filter.id} korrigiert`);
      }
    }

    console.log(`\n✅ Insgesamt ${corrected} Filter korrigiert`);
    console.log('✨ Fertig!');
  } catch (error) {
    console.error('❌ Fehler beim Korrigieren der Filter:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDefaultFilters();

