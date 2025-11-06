import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Script zum Hinzufügen der fehlenden organization_management Berechtigung
 * für alle Admin-Rollen von Organisationen
 */
async function addOrganizationManagementPermission() {
  try {
    console.log('🔍 Starte Suche nach Admin-Rollen...');

    // Finde alle Admin-Rollen, die zu einer Organisation gehören
    const adminRoles = await prisma.role.findMany({
      where: {
        name: 'Admin',
        organizationId: {
          not: null
        }
      },
      include: {
        organization: true
      }
    });

    console.log(`✅ Gefundene Admin-Rollen: ${adminRoles.length}`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const adminRole of adminRoles) {
      const orgName = adminRole.organization?.displayName || adminRole.organization?.name || 'Unbekannt';
      
      // Prüfe ob die Berechtigung bereits existiert
      const existingPermission = await prisma.permission.findFirst({
        where: {
          roleId: adminRole.id,
          entity: 'organization_management',
          entityType: 'page'
        }
      });

      if (existingPermission) {
        console.log(`⏭️  Admin-Rolle ${adminRole.id} (Org: ${orgName}) hat bereits organization_management Berechtigung`);
        skippedCount++;
        
        // Prüfe ob accessLevel korrekt ist (sollte 'both' sein)
        if (existingPermission.accessLevel !== 'both') {
          await prisma.permission.update({
            where: { id: existingPermission.id },
            data: { accessLevel: 'both' }
          });
          console.log(`   ✅ AccessLevel für Admin-Rolle ${adminRole.id} auf 'both' aktualisiert`);
        }
      } else {
        // Erstelle die fehlende Berechtigung
        const newPermission = await prisma.permission.create({
          data: {
            roleId: adminRole.id,
            entity: 'organization_management',
            entityType: 'page',
            accessLevel: 'both'
          }
        });
        
        console.log(`✅ organization_management Berechtigung für Admin-Rolle ${adminRole.id} (Org: ${orgName}) hinzugefügt`);
        addedCount++;
      }
    }

    console.log('\n📊 Zusammenfassung:');
    console.log(`   ✅ Hinzugefügt: ${addedCount}`);
    console.log(`   ⏭️  Übersprungen (bereits vorhanden): ${skippedCount}`);
    console.log(`   📝 Gesamt Admin-Rollen: ${adminRoles.length}`);

    console.log('\n🎉 Berechtigungskorrektur abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler bei der Berechtigungskorrektur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
addOrganizationManagementPermission()
  .then(() => {
    console.log('✅ Script erfolgreich ausgeführt');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Fehler beim Ausführen des Scripts:', e);
    process.exit(1);
  });

