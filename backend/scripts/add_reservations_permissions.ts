import { PrismaClient, AccessLevel } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_TABLES = [
  'requests',
  'tasks',
  'reservations',      // Neu hinzugefügt
  'users',
  'roles',
  'organization',
  'team_worktime',
  'worktime',
  'clients',
  'consultation_invoices',
  'branches',
  'notifications',
  'settings',
  'monthly_reports',
  'organization_join_requests',
  'organization_users'
];

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

async function ensureAllPermissionsForRole(roleId: number, permissionMap: Record<string, AccessLevel>) {
  for (const [key, accessLevel] of Object.entries(permissionMap)) {
    // Split beim ersten Unterstrich: "table_reservations" -> ["table", "reservations"]
    // "table_team_worktime" -> ["table", "team_worktime"]
    const parts = key.split('_');
    if (parts.length >= 2) {
      const entityType = parts[0];
      const entity = parts.slice(1).join('_'); // Alles nach dem ersten Unterstrich
      await ensurePermission(roleId, entity, entityType, accessLevel);
    }
  }
}

async function main() {
  try {
    console.log('🔑 Füge Reservations-Berechtigungen hinzu...\n');
    
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
      
      // Bestimme accessLevel basierend auf Rolle
      let accessLevel: AccessLevel = 'both';
      
      // Für globale User-Rolle und Org-User-Rollen: 'both'
      // Für Admin-Rollen: 'both' (wird über ensureAllPermissionsForRole gesetzt)
      if (role.name === 'Admin') {
        // Admin bekommt alle Tabellen-Berechtigungen
        const adminPermissionMap: Record<string, AccessLevel> = {};
        ALL_TABLES.forEach(table => {
          adminPermissionMap[`table_${table}`] = 'both';
        });
        await ensureAllPermissionsForRole(role.id, adminPermissionMap);
        console.log(`   ✓ Alle Tabellen-Berechtigungen für Admin-Rolle gesetzt\n`);
      } else if (role.name === 'User') {
        // User bekommt nur Reservations-Berechtigung
        await ensurePermission(role.id, 'reservations', 'table', 'both');
        console.log(`   ✓ Reservations-Berechtigung für User-Rolle gesetzt\n`);
      }
    }

    console.log('\n✅ Fertig! Reservations-Berechtigungen wurden hinzugefügt/aktualisiert.');
    console.log('   - Keine Daten wurden gelöscht');
    console.log('   - Nur Berechtigungen wurden erstellt/aktualisiert');

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

