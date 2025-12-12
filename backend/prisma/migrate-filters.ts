import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration-Script für Filter-Updates
 * 
 * 1. Löscht "Alle"/"Todos" Filter für requests-table (case-insensitive)
 * 2. Erweitert User-Filter für requests-table: Von 4 auf 6 Bedingungen umstrukturieren
 * 3. Erweitert User-Filter für worktracker-todos: Reihenfolge korrigieren + Status-Bedingung
 * 4. Erweitert Rollen-Filter für worktracker-todos: Status-Bedingung hinzufügen
 */
async function migrateFilters() {
  try {
    console.log('🚀 Starte Filter-Migration...\n');

    // 1. Lösche "Alle"/"Todos" Filter für requests-table (case-insensitive)
    console.log('📋 Schritt 1: Lösche "Alle"/"Todos" Filter für requests-table...');
    const deletedFilters = await prisma.$executeRaw`
      DELETE FROM "SavedFilter"
      WHERE "tableId" = 'requests-table'
      AND LOWER("name") IN ('alle', 'todos', 'all', 'alles')
    `;
    console.log(`   ✅ ${deletedFilters} Filter gelöscht\n`);

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

    // Finde ALLE User-Filter (auch ohne Gruppe)
    const requestsUserFilters = await prisma.savedFilter.findMany({
      where: {
        tableId: 'requests-table',
        OR: [
          { groupId: { in: usersGroups.map(g => g.id) } },
          { 
            groupId: null,
            name: { not: { in: ['Archiv', 'Aktuell'] } } // Exkludiere Standard-Filter
          }
        ]
      }
    });

    let requestsUpdated = 0;
    for (const filter of requestsUserFilters) {
      try {
        const conditions = JSON.parse(filter.conditions as string);
        const operators = JSON.parse(filter.operators as string);

        // Prüfe ob bereits korrekte Struktur vorhanden ist (6 Bedingungen)
        const hasCorrectStructure = conditions.length === 6 
          && conditions[0]?.column === 'requestedBy'
          && conditions[3]?.column === 'responsible'
          && conditions.filter((c: any) => c.column === 'status' && c.operator === 'notEquals').length === 4;

        if (!hasCorrectStructure) {
          // Prüfe ob BEIDE Status-Bedingungen fehlen (separat prüfen)
          const hasApprovedCondition = conditions.some((c: any) => 
            c.column === 'status' && c.operator === 'notEquals' && c.value === 'approved'
          );
          const hasDeniedCondition = conditions.some((c: any) => 
            c.column === 'status' && c.operator === 'notEquals' && c.value === 'denied'
          );

          // Finde User-Werte aus bestehenden Bedingungen
          const requestedByValue = conditions.find((c: any) => c.column === 'requestedBy')?.value;
          const responsibleValue = conditions.find((c: any) => c.column === 'responsible')?.value;

          // Erstelle neue Struktur: (requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)
          const newConditions = [
            { column: 'requestedBy', operator: 'equals', value: requestedByValue || conditions[0]?.value },
            { column: 'status', operator: 'notEquals', value: 'approved' },
            { column: 'status', operator: 'notEquals', value: 'denied' },
            { column: 'responsible', operator: 'equals', value: responsibleValue || conditions[1]?.value },
            { column: 'status', operator: 'notEquals', value: 'approved' },
            { column: 'status', operator: 'notEquals', value: 'denied' }
          ];
          const newOperators = ['AND', 'AND', 'OR', 'AND', 'AND'];

          await prisma.savedFilter.update({
            where: { id: filter.id },
            data: {
              conditions: JSON.stringify(newConditions),
              operators: JSON.stringify(newOperators)
            }
          });

          requestsUpdated++;
          console.log(`   ✅ Filter "${filter.name}" aktualisiert (6 Bedingungen)`);
        } else {
          console.log(`   ⏭️  Filter "${filter.name}" bereits korrekt (6 Bedingungen vorhanden)`);
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

        // Prüfe ob Reihenfolge falsch ist (responsible ZUERST)
        const isWrongOrder = conditions.length >= 2 
          && conditions[0]?.column === 'responsible'
          && conditions[1]?.column === 'qualityControl';

        // Prüfe ob Status-Bedingung bereits vorhanden ist
        const hasStatusCondition = conditions.some((c: any) => 
          c.column === 'status' && c.operator === 'notEquals' && c.value === 'done'
        );

        let needsUpdate = false;
        let newConditions = [...conditions];
        let newOperators = [...operators];

        // Korrigiere Reihenfolge falls nötig
        if (isWrongOrder) {
          newConditions = [
            conditions[1], // qualityControl ZUERST
            conditions[0], // responsible DANN
            ...conditions.slice(2) // Rest bleibt gleich
          ];
          needsUpdate = true;
        }

        // Füge Status-Bedingung hinzu falls fehlt
        if (!hasStatusCondition) {
          newConditions.push({ column: 'status', operator: 'notEquals', value: 'done' });
          newOperators.push('AND');
          needsUpdate = true;
        }

        if (needsUpdate) {
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
          console.log(`   ⏭️  Filter "${filter.name}" bereits korrekt`);
        }
      } catch (error) {
        console.error(`   ❌ Fehler beim Aktualisieren von Filter "${filter.name}":`, error);
      }
    }
    console.log(`   ✅ ${todosUpdated} Filter aktualisiert\n`);

    // 4. Erweitere Rollen-Filter für worktracker-todos
    console.log('📋 Schritt 4: Erweitere Rollen-Filter für worktracker-todos...');
    
    const rolesGroups = await prisma.filterGroup.findMany({
      where: {
        tableId: 'worktracker-todos',
        name: {
          in: ['Roles', 'Rollen']
        }
      }
    });

    const rolesFilters = rolesGroups.length > 0
      ? await prisma.savedFilter.findMany({
          where: {
            tableId: 'worktracker-todos',
            groupId: { in: rolesGroups.map(g => g.id) }
          }
        })
      : [];

    let rolesUpdated = 0;
    for (const filter of rolesFilters) {
      try {
        const conditions = JSON.parse(filter.conditions as string);
        const operators = JSON.parse(filter.operators as string);
        
        const hasStatusCondition = conditions.some((c: any) => 
          c.column === 'status' && c.operator === 'notEquals' && c.value === 'done'
        );
        
        if (!hasStatusCondition) {
          const newConditions = [
            ...conditions,
            { column: 'status', operator: 'notEquals', value: 'done' }
          ];
          const newOperators = [...operators, 'AND'];
          
          await prisma.savedFilter.update({
            where: { id: filter.id },
            data: {
              conditions: JSON.stringify(newConditions),
              operators: JSON.stringify(newOperators)
            }
          });
          
          rolesUpdated++;
          console.log(`   ✅ Rollen-Filter "${filter.name}" aktualisiert`);
        } else {
          console.log(`   ⏭️  Rollen-Filter "${filter.name}" bereits korrekt`);
        }
      } catch (error) {
        console.error(`   ❌ Fehler beim Aktualisieren von Rollen-Filter "${filter.name}":`, error);
      }
    }
    console.log(`   ✅ ${rolesUpdated} Rollen-Filter aktualisiert\n`);

    console.log('✅ Filter-Migration erfolgreich abgeschlossen!');
    console.log(`\nZusammenfassung:`);
    console.log(`- ${deletedFilters} "Alle"/"Todos" Filter gelöscht`);
    console.log(`- ${requestsUpdated} Requests-User-Filter aktualisiert`);
    console.log(`- ${todosUpdated} ToDos-User-Filter aktualisiert`);
    console.log(`- ${rolesUpdated} Rollen-Filter aktualisiert`);

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

