import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script zum Prüfen und Setzen der tours-Berechtigung für Rezeption-Rolle
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/fix-rezeption-tours-permission.ts
 */
async function fixRezeptionPermission() {
  try {
    console.log('🔍 Suche nach Rezeption-Rolle...');

    // Finde Rezeption-Rolle (case-insensitive)
    const rezeptionRole = await prisma.role.findFirst({
      where: {
        OR: [
          { name: { contains: 'rezeption', mode: 'insensitive' } },
          { name: { contains: 'reception', mode: 'insensitive' } }
        ]
      }
    });

    if (!rezeptionRole) {
      console.log('❌ Rezeption-Rolle nicht gefunden');
      console.log('\n📋 Verfügbare Rollen:');
      const allRoles = await prisma.role.findMany({
        select: { id: true, name: true, organizationId: true },
        orderBy: { name: 'asc' }
      });
      allRoles.forEach(role => {
        console.log(`   - ID: ${role.id}, Name: ${role.name}, Org: ${role.organizationId || 'null'}`);
      });
      return;
    }

    console.log(`✅ Rezeption-Rolle gefunden: ${rezeptionRole.name} (ID: ${rezeptionRole.id}, Org: ${rezeptionRole.organizationId || 'null'})`);

    // Prüfe ob Berechtigung existiert
    const existingPermission = await prisma.permission.findFirst({
      where: {
        roleId: rezeptionRole.id,
        entity: 'tours',
        entityType: 'table'
      }
    });

    if (existingPermission) {
      console.log(`\n📊 Berechtigung existiert bereits:`);
      console.log(`   - Entity: ${existingPermission.entity}`);
      console.log(`   - EntityType: ${existingPermission.entityType}`);
      console.log(`   - AccessLevel: ${existingPermission.accessLevel}`);
      
      if (existingPermission.accessLevel !== 'read' && existingPermission.accessLevel !== 'both') {
        console.log(`\n⚠️  AccessLevel ist '${existingPermission.accessLevel}', sollte 'read' oder 'both' sein`);
        console.log(`🔄 Aktualisiere auf 'read'...`);
        
        await prisma.permission.update({
          where: { id: existingPermission.id },
          data: { accessLevel: 'read' }
        });
        
        console.log(`✅ Berechtigung aktualisiert: ${existingPermission.accessLevel} → read`);
      } else {
        console.log(`✅ Berechtigung ist korrekt (${existingPermission.accessLevel})`);
      }
    } else {
      console.log(`\n❌ Berechtigung fehlt: tours (table)`);
      console.log(`➕ Erstelle Berechtigung...`);
      
      await prisma.permission.create({
        data: {
          roleId: rezeptionRole.id,
          entity: 'tours',
          entityType: 'table',
          accessLevel: 'read'
        }
      });
      
      console.log(`✅ Berechtigung erstellt: tours (table) = read`);
    }

    // Zeige alle tours-bezogenen Berechtigungen für diese Rolle
    console.log(`\n📋 Alle tours-bezogenen Berechtigungen für ${rezeptionRole.name}:`);
    const allTourPermissions = await prisma.permission.findMany({
      where: {
        roleId: rezeptionRole.id,
        entity: { contains: 'tour', mode: 'insensitive' }
      },
      orderBy: [{ entityType: 'asc' }, { entity: 'asc' }]
    });

    if (allTourPermissions.length === 0) {
      console.log('   (Keine weiteren tours-Berechtigungen gefunden)');
    } else {
      allTourPermissions.forEach(perm => {
        console.log(`   - ${perm.entity} (${perm.entityType}): ${perm.accessLevel}`);
      });
    }

    console.log(`\n✅ Fertig!`);
  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixRezeptionPermission()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });








