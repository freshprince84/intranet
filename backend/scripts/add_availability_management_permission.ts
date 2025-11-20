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
    console.log('🔑 Füge availability_management Permission hinzu...\n');

    // Finde alle Admin-Rollen (name = 'admin' oder name enthält 'admin')
    const adminRoles = await prisma.role.findMany({
      where: {
        OR: [
          { name: { equals: 'admin', mode: 'insensitive' } },
          { name: { contains: 'admin', mode: 'insensitive' } }
        ]
      }
    });

    if (adminRoles.length === 0) {
      console.log('⚠️  Keine Admin-Rollen gefunden!');
      return;
    }

    console.log(`📋 Gefundene Admin-Rollen: ${adminRoles.length}`);
    adminRoles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id}, Org: ${role.organizationId || 'global'})`);
    });

    console.log('\n');

    // Füge Permission für alle Admin-Rollen hinzu
    for (const role of adminRoles) {
      console.log(`📋 Verarbeite Rolle: ${role.name} (ID: ${role.id}, Org: ${role.organizationId || 'global'})`);
      await ensurePermission(role.id, 'availability_management', 'page', 'both');
      await ensurePermission(role.id, 'availability_management', 'table', 'both');
      console.log('');
    }

    console.log('✅ Fertig!');
    console.log('   - availability_management Permission wurde für alle Admin-Rollen erstellt/aktualisiert');
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

