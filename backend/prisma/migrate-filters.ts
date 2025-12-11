import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration-Script für Filter-Updates
 * 
 * 1. Löscht "Alle"/"Todos" Filter für requests-table
 * 2. Erweitert User-Filter für requests-table mit Status-Bedingungen
 * 3. Erweitert User-Filter für worktracker-todos mit Status-Bedingungen
 */
async function migrateFilters() {
  try {
    console.log('🚀 Starte Filter-Migration...\n');

    // 1. Lösche "Alle"/"Todos" Filter für requests-table
    console.log('📋 Schritt 1: Lösche "Alle"/"Todos" Filter für requests-table...');
    const deletedFilters = await prisma.savedFilter.deleteMany({
      where: {
        tableId: 'requests-table',
        name: {
          in: ['Alle', 'Todos', 'All', 'Alles']
        }
      }
    });
    console.log(`   ✅ ${deletedFilters.count} Filter gelöscht\n`);

    // 2. Erweitere User-Filter für requests-table
    console.log('📋 Schritt 2: Erweitere User-Filter für requests-table...');
    
    // Finde alle Filter-Gruppen mit Namen "Users", "Benutzer", "Usuarios"
    const usersGroups = await prisma.filterGroup.findMany({
      where: {
        tableId: 'requests-table',
        name: {
          in: ['Users', 'Benutzer', 'Usuarios']
        }
      }
    });

    const requestsUserFilters = usersGroups.length > 0
      ? await prisma.savedFilter.findMany({
          where: {
            tableId: 'requests-table',
            groupId: {
              in: usersGroups.map(g => g.id)
            }
          }
        })
      : [];

    let requestsUpdated = 0;
    for (const filter of requestsUserFilters) {
      try {
        const conditions = JSON.parse(filter.conditions as string);
        const operators = JSON.parse(filter.operators as string);

        // Prüfe ob Status-Bedingungen bereits vorhanden sind
        const hasStatusConditions = conditions.some((c: any) => 
          c.column === 'status' && c.operator === 'notEquals' && (c.value === 'approved' || c.value === 'denied')
        );

        if (!hasStatusConditions) {
          // Erweitere Bedingungen
          const newConditions = [
            ...conditions,
            { column: 'status', operator: 'notEquals', value: 'approved' },
            { column: 'status', operator: 'notEquals', value: 'denied' }
          ];

          // Erweitere Operatoren (OR zwischen user-Bedingungen, dann AND für status)
          const newOperators = [
            ...operators,
            'AND',
            'AND'
          ];

          await prisma.savedFilter.update({
            where: { id: filter.id },
            data: {
              conditions: JSON.stringify(newConditions),
              operators: JSON.stringify(newOperators)
            }
          });

          requestsUpdated++;
          console.log(`   ✅ Filter "${filter.name}" aktualisiert`);
        } else {
          console.log(`   ⏭️  Filter "${filter.name}" bereits aktualisiert (Status-Bedingungen vorhanden)`);
        }
      } catch (error) {
        console.error(`   ❌ Fehler beim Aktualisieren von Filter "${filter.name}":`, error);
      }
    }
    console.log(`   ✅ ${requestsUpdated} Filter aktualisiert\n`);

    // 3. Erweitere User-Filter für worktracker-todos
    console.log('📋 Schritt 3: Erweitere User-Filter für worktracker-todos...');
    
    // Finde alle Filter-Gruppen mit Namen "Users", "Benutzer", "Usuarios"
    const todosUsersGroups = await prisma.filterGroup.findMany({
      where: {
        tableId: 'worktracker-todos',
        name: {
          in: ['Users', 'Benutzer', 'Usuarios']
        }
      }
    });

    const todosUserFilters = todosUsersGroups.length > 0
      ? await prisma.savedFilter.findMany({
          where: {
            tableId: 'worktracker-todos',
            groupId: {
              in: todosUsersGroups.map(g => g.id)
            }
          }
        })
      : [];

    let todosUpdated = 0;
    for (const filter of todosUserFilters) {
      try {
        const conditions = JSON.parse(filter.conditions as string);
        const operators = JSON.parse(filter.operators as string);

        // Prüfe ob Status-Bedingung bereits vorhanden ist
        const hasStatusCondition = conditions.some((c: any) => 
          c.column === 'status' && c.operator === 'notEquals' && c.value === 'done'
        );

        if (!hasStatusCondition) {
          // Erweitere Bedingungen
          const newConditions = [
            ...conditions,
            { column: 'status', operator: 'notEquals', value: 'done' }
          ];

          // Erweitere Operatoren (OR zwischen user-Bedingungen, dann AND für status)
          const newOperators = [
            ...operators,
            'AND'
          ];

          await prisma.savedFilter.update({
            where: { id: filter.id },
            data: {
              conditions: JSON.stringify(newConditions),
              operators: JSON.stringify(newOperators)
            }
          });

          todosUpdated++;
          console.log(`   ✅ Filter "${filter.name}" aktualisiert`);
        } else {
          console.log(`   ⏭️  Filter "${filter.name}" bereits aktualisiert (Status-Bedingung vorhanden)`);
        }
      } catch (error) {
        console.error(`   ❌ Fehler beim Aktualisieren von Filter "${filter.name}":`, error);
      }
    }
    console.log(`   ✅ ${todosUpdated} Filter aktualisiert\n`);

    console.log('✅ Filter-Migration erfolgreich abgeschlossen!');
    console.log(`\nZusammenfassung:`);
    console.log(`- ${deletedFilters.count} "Alle"/"Todos" Filter gelöscht`);
    console.log(`- ${requestsUpdated} Requests-User-Filter aktualisiert`);
    console.log(`- ${todosUpdated} ToDos-User-Filter aktualisiert`);

  } catch (error) {
    console.error('❌ Fehler bei der Filter-Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
migrateFilters()
  .catch((error) => {
    console.error('❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  });

