import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AccessLevel = 'read' | 'write' | 'both' | 'none';

/**
 * Skript zum Hinzufügen der team_worktime Berechtigungen für Admin-Rollen
 * 
 * Fügt die folgenden Berechtigungen für alle Admin-Rollen hinzu:
 * - team_worktime_control (page) - accessLevel: 'both'
 * - team_worktime (table) - accessLevel: 'both'
 * 
 * Ausführen mit: npx ts-node backend/scripts/addTeamWorktimePermission.ts
 */

async function addTeamWorktimePermission() {
  try {
    console.log('Starte Hinzufügen der team_worktime Berechtigungen...');

    // Berechtigungen, die hinzugefügt werden sollen
    const requiredPermissions = [
      { entity: 'team_worktime_control', entityType: 'page', accessLevel: 'both' as AccessLevel },
      { entity: 'team_worktime', entityType: 'table', accessLevel: 'both' as AccessLevel }
    ];

    // Hole alle Admin-Rollen (case-insensitive)
    const roles = await prisma.role.findMany({
      where: {
        name: {
          equals: 'Admin',
          mode: 'insensitive'
        }
      }
    });
    console.log(`Gefundene Admin-Rolle(n): ${roles.length}`);

    if (roles.length === 0) {
      console.log('Keine Rollen gefunden. Bitte überprüfe die Filterkriterien.');
      return;
    }

    // Für jede Rolle die Berechtigungen hinzufügen
    for (const role of roles) {
      console.log(`\nVerarbeite Rolle: ${role.name} (ID: ${role.id})`);
      
      for (const permission of requiredPermissions) {
        // Prüfe, ob die Berechtigung bereits existiert
        const existingPermission = await prisma.permission.findFirst({
          where: {
            roleId: role.id,
            entity: permission.entity,
            entityType: permission.entityType
          }
        });

        if (existingPermission) {
          // Aktualisiere die Berechtigung, falls sich der accessLevel geändert hat
          if (existingPermission.accessLevel !== permission.accessLevel) {
            await prisma.permission.update({
              where: { id: existingPermission.id },
              data: { accessLevel: permission.accessLevel }
            });
            console.log(`  ✅ Berechtigung aktualisiert: ${permission.entity} (${permission.entityType}) → ${permission.accessLevel}`);
          } else {
            console.log(`  ⏭️  Berechtigung bereits vorhanden: ${permission.entity} (${permission.entityType}) = ${permission.accessLevel}`);
          }
        } else {
          // Erstelle neue Berechtigung
          await prisma.permission.create({
            data: {
              entity: permission.entity,
              entityType: permission.entityType,
              accessLevel: permission.accessLevel,
              roleId: role.id
            }
          });
          console.log(`  ➕ Neue Berechtigung erstellt: ${permission.entity} (${permission.entityType}) = ${permission.accessLevel}`);
        }
      }
    }

    console.log('\n✅ Berechtigungskorrektur abgeschlossen.');
  } catch (error) {
    console.error('❌ Fehler bei der Berechtigungskorrektur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addTeamWorktimePermission()
  .then(() => console.log('\n✅ Skript erfolgreich ausgeführt'))
  .catch(e => {
    console.error('❌ Fehler beim Ausführen des Skripts:', e);
    process.exit(1);
  });
