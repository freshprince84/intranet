import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fügt cerebro-spezifische Berechtigungen zu allen bestehenden Rollen hinzu
 * die noch keine cerebro-Berechtigungen haben
 */
async function addCerebroPermissionsToExistingRoles() {
  try {
    console.log('🔍 Suche nach Rollen ohne cerebro-Berechtigungen...');
    
    // Hole alle Rollen
    const allRoles = await prisma.role.findMany({
      include: {
        permissions: true
      }
    });
    
    console.log(`📋 Gefundene Rollen: ${allRoles.length}`);
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const role of allRoles) {
      // Prüfe, ob die Rolle bereits cerebro-Berechtigungen hat
      const hasCerebro = role.permissions.some(
        p => p.entity === 'cerebro' && p.entityType === 'cerebro'
      );
      const hasCerebroMedia = role.permissions.some(
        p => p.entity === 'cerebro_media' && p.entityType === 'cerebro'
      );
      const hasCerebroLinks = role.permissions.some(
        p => p.entity === 'cerebro_links' && p.entityType === 'cerebro'
      );
      
      const permissionsToAdd = [];
      
      if (!hasCerebro) {
        permissionsToAdd.push({
          entity: 'cerebro',
          entityType: 'cerebro',
          accessLevel: 'both',
          roleId: role.id
        });
      }
      
      if (!hasCerebroMedia) {
        permissionsToAdd.push({
          entity: 'cerebro_media',
          entityType: 'cerebro',
          accessLevel: 'both',
          roleId: role.id
        });
      }
      
      if (!hasCerebroLinks) {
        permissionsToAdd.push({
          entity: 'cerebro_links',
          entityType: 'cerebro',
          accessLevel: 'both',
          roleId: role.id
        });
      }
      
      if (permissionsToAdd.length > 0) {
        await prisma.permission.createMany({
          data: permissionsToAdd
        });
        console.log(`✅ Berechtigungen hinzugefügt für Rolle "${role.name}" (ID: ${role.id}): ${permissionsToAdd.map(p => p.entity).join(', ')}`);
        addedCount += permissionsToAdd.length;
      } else {
        console.log(`⏭️  Rolle "${role.name}" (ID: ${role.id}) hat bereits alle cerebro-Berechtigungen`);
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Fertig! ${addedCount} Berechtigungen hinzugefügt, ${skippedCount} Rollen übersprungen`);
  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addCerebroPermissionsToExistingRoles()
  .then(() => {
    console.log('✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

