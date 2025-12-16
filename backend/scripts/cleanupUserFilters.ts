/**
 * Script zum Bereinigen von User-Filtern
 * Löscht alle Filter für Benutzer, die nicht mehr existieren oder nicht mehr aktiv sind
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupUserFilters() {
  try {
    console.log('🧹 Starte Bereinigung von User-Filtern...\n');

    // 1. Hole alle "Users"-Gruppen (alle Sprachen)
    const usersGroups = await prisma.filterGroup.findMany({
      where: {
        name: { in: ['Users', 'Benutzer', 'Usuarios'] }
      }
    });

    if (usersGroups.length === 0) {
      console.log('✅ Keine "Users"-Filtergruppen gefunden.');
      return;
    }

    console.log(`📋 Gefundene "Users"-Filtergruppen: ${usersGroups.length}\n`);

    let totalDeleted = 0;

    // 2. Für jede Gruppe: Filter prüfen und löschen
    for (const group of usersGroups) {
      console.log(`📊 Prüfe Filter-Gruppe "${group.name}" (ID: ${group.id}, Tabelle: ${group.tableId})...`);

      // Hole alle Filter in dieser Gruppe
      const filters = await prisma.savedFilter.findMany({
        where: {
          groupId: group.id
        }
      });

      if (filters.length === 0) {
        console.log(`   ⏭️  Keine Filter in dieser Gruppe\n`);
        continue;
      }

      console.log(`   📋 Gefundene Filter: ${filters.length}`);

      // Extrahiere User-IDs aus Filter-Bedingungen
      const userIdsInFilters: number[] = [];
      for (const filter of filters) {
        try {
          const conditions = JSON.parse(filter.conditions);
          if (Array.isArray(conditions)) {
            conditions.forEach((condition: any) => {
              if (condition.value && typeof condition.value === 'string' && condition.value.startsWith('user-')) {
                const userId = parseInt(condition.value.replace('user-', ''), 10);
                if (!isNaN(userId)) {
                  userIdsInFilters.push(userId);
                }
              }
            });
          }
        } catch (e) {
          // Ignoriere Fehler beim Parsen
        }
      }

      if (userIdsInFilters.length === 0) {
        console.log(`   ⏭️  Keine User-IDs in Filter-Bedingungen gefunden\n`);
        continue;
      }

      // Prüfe welche User noch existieren und aktiv sind
      const uniqueUserIds = [...new Set(userIdsInFilters)];
      const existingUsers = await prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
          active: true
        },
        select: { id: true }
      });
      const existingUserIds = new Set(existingUsers.map(u => u.id));

      console.log(`   📊 User-IDs in Filtern: ${uniqueUserIds.length}, Aktive User: ${existingUserIds.size}`);

      // Lösche Filter für nicht-existierende/inaktive User
      let deletedInGroup = 0;
      for (const filter of filters) {
        try {
          const conditions = JSON.parse(filter.conditions);
          if (Array.isArray(conditions)) {
            const hasValidUser = conditions.some((condition: any) => {
              if (condition.value && typeof condition.value === 'string' && condition.value.startsWith('user-')) {
                const userId = parseInt(condition.value.replace('user-', ''), 10);
                return !isNaN(userId) && existingUserIds.has(userId);
              }
              return false;
            });

            if (!hasValidUser) {
              await prisma.savedFilter.delete({
                where: { id: filter.id }
              });
              deletedInGroup++;
              console.log(`   🗑️  Filter "${filter.name}" gelöscht (User existiert nicht mehr oder ist inaktiv)`);
            }
          }
        } catch (e) {
          // Ignoriere Fehler
        }
      }

      if (deletedInGroup > 0) {
        console.log(`   ✅ ${deletedInGroup} Filter gelöscht\n`);
        totalDeleted += deletedInGroup;
      } else {
        console.log(`   ✅ Keine Filter zum Löschen gefunden\n`);
      }
    }

    console.log('============================================================');
    console.log(`✅ Bereinigung abgeschlossen!`);
    console.log(`   Gesamt gelöschte Filter: ${totalDeleted}`);
    console.log('============================================================');

  } catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUserFilters()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
