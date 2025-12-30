/**
 * Script: Fügt neue Branch-basierte Reservations-Berechtigungen hinzu
 * 
 * Erstellt:
 * - table_reservations_all_branches: Für Admin-Rollen (alle Reservierungen sehen)
 * - table_reservations_own_branch: Für User-Rollen (nur eigene Branch-Reservierungen sehen)
 */

import { PrismaClient, AccessLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function ensurePermission(roleId: number, entity: string, entityType: string, accessLevel: AccessLevel) {
  const existing = await prisma.permission.findFirst({
    where: {
      roleId,
      entity,
      entityType
    }
  });

  if (existing) {
    if (existing.accessLevel !== accessLevel) {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { accessLevel }
      });
      console.log(`   ✓ Aktualisiert: ${entityType}_${entity} = ${accessLevel} für Rolle ${roleId}`);
    } else {
      console.log(`   - Bereits vorhanden: ${entityType}_${entity} = ${accessLevel} für Rolle ${roleId}`);
    }
  } else {
    await prisma.permission.create({
      data: {
        roleId,
        entity,
        entityType,
        accessLevel
      }
    });
    console.log(`   + Erstellt: ${entityType}_${entity} = ${accessLevel} für Rolle ${roleId}`);
  }
}

async function main() {
  try {
    console.log('🔑 Füge Branch-basierte Reservations-Berechtigungen hinzu...\n');
    
    // Finde alle relevanten Rollen
    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { name: 'User', organizationId: null },  // Globale User-Rolle
          { name: 'Admin', organizationId: null },  // Globale Admin-Rolle
          { name: 'User', organizationId: 1 },     // Org 1 User
          { name: 'Admin', organizationId: 1 },    // Org 1 Admin
          { name: 'User', organizationId: 2 },     // Org 2 User
          { name: 'Admin', organizationId: 2 }     // Org 2 Admin
        ]
      }
    });

    console.log(`✓ ${roles.length} Rollen gefunden\n`);

    for (const role of roles) {
      console.log(`📋 Verarbeite Rolle: ${role.name} (ID: ${role.id}, Org: ${role.organizationId || 'global'})`);
      
      if (role.name === 'Admin') {
        // Admin bekommt "all_branches" Berechtigung
        await ensurePermission(role.id, 'reservations_all_branches', 'table', 'read');
        console.log(`   ✓ Admin-Rolle erhält: table_reservations_all_branches (entity: reservations_all_branches)\n`);
      } else if (role.name === 'User') {
        // User bekommt "own_branch" Berechtigung
        await ensurePermission(role.id, 'reservations_own_branch', 'table', 'read');
        console.log(`   ✓ User-Rolle erhält: table_reservations_own_branch (entity: reservations_own_branch)\n`);
      }
    }

    console.log('\n✅ Fertig! Branch-basierte Reservations-Berechtigungen wurden hinzugefügt/aktualisiert.');
    console.log('   - Keine Daten wurden gelöscht');
    console.log('   - Nur Berechtigungen wurden erstellt/aktualisiert');
  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

