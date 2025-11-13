import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration Script: Umstellung von usermanagement auf organization_management
 * 
 * Zweck: Alle Berechtigungen von `usermanagement` (page) auf `organization_management` (page) umstellen
 * 
 * Vorgehen:
 * 1. Für jede Rolle prüfen:
 *    - Existiert `usermanagement` (page) Berechtigung?
 *    - Existiert bereits `organization_management` (page) Berechtigung?
 *    - Wenn beide existieren: `usermanagement` löschen (Dopplung)
 *    - Wenn nur `usermanagement` existiert: Umbenennen zu `organization_management`
 *    - Wenn nur `organization_management` existiert: Nichts tun
 * 2. Alle Änderungen loggen
 * 3. Rollback-Daten speichern (falls nötig)
 */

async function migrateUsermanagementToOrganizationManagement() {
  try {
    console.log('🚀 Starte Migration: usermanagement → organization_management\n');

    // Finde alle Rollen mit usermanagement oder organization_management Berechtigungen
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          where: {
            entity: {
              in: ['usermanagement', 'organization_management']
            },
            entityType: 'page'
          }
        }
      }
    });

    console.log(`📋 Gefundene Rollen: ${roles.length}\n`);

    let migratedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;
    const changes: Array<{ roleId: number; roleName: string; action: string; details: string }> = [];

    for (const role of roles) {
      const userManagementPerm = role.permissions.find(p => p.entity === 'usermanagement' && p.entityType === 'page');
      const orgManagementPerm = role.permissions.find(p => p.entity === 'organization_management' && p.entityType === 'page');

      if (userManagementPerm && orgManagementPerm) {
        // Beide existieren: usermanagement löschen (Dopplung)
        await prisma.permission.delete({
          where: { id: userManagementPerm.id }
        });
        deletedCount++;
        changes.push({
          roleId: role.id,
          roleName: role.name,
          action: 'deleted',
          details: `usermanagement gelöscht (Dopplung mit organization_management)`
        });
        console.log(`   ✅ Rolle "${role.name}" (ID: ${role.id}): usermanagement gelöscht (Dopplung)`);
      } else if (userManagementPerm && !orgManagementPerm) {
        // Nur usermanagement existiert: Umbenennen zu organization_management
        await prisma.permission.update({
          where: { id: userManagementPerm.id },
          data: {
            entity: 'organization_management'
          }
        });
        migratedCount++;
        changes.push({
          roleId: role.id,
          roleName: role.name,
          action: 'migrated',
          details: `usermanagement → organization_management (accessLevel: ${userManagementPerm.accessLevel})`
        });
        console.log(`   ✅ Rolle "${role.name}" (ID: ${role.id}): usermanagement → organization_management`);
      } else if (!userManagementPerm && orgManagementPerm) {
        // Nur organization_management existiert: Nichts tun
        skippedCount++;
        console.log(`   ⏭️  Rolle "${role.name}" (ID: ${role.id}): Bereits korrekt (nur organization_management)`);
      }
    }

    console.log('\n📊 Zusammenfassung:');
    console.log(`   - Migriert: ${migratedCount}`);
    console.log(`   - Gelöscht: ${deletedCount}`);
    console.log(`   - Übersprungen: ${skippedCount}`);
    console.log(`   - Gesamt geändert: ${migratedCount + deletedCount}`);

    // Verifiziere das Ergebnis
    console.log('\n🔍 Verifikation:');
    const remainingUserManagement = await prisma.permission.findMany({
      where: {
        entity: 'usermanagement',
        entityType: 'page'
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        }
      }
    });

    if (remainingUserManagement.length === 0) {
      console.log('   ✅ Keine usermanagement Berechtigungen mehr vorhanden');
    } else {
      console.log(`   ⚠️  Warnung: ${remainingUserManagement.length} usermanagement Berechtigungen noch vorhanden:`);
      remainingUserManagement.forEach(perm => {
        const orgInfo = perm.role.organizationId ? ` (Org: ${perm.role.organizationId})` : ' (global)';
        console.log(`      - Rolle "${perm.role.name}"${orgInfo}`);
      });
    }

    const orgManagementCount = await prisma.permission.count({
      where: {
        entity: 'organization_management',
        entityType: 'page'
      }
    });
    console.log(`   ✅ organization_management Berechtigungen vorhanden: ${orgManagementCount}`);

    console.log('\n🎉 Migration abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
migrateUsermanagementToOrganizationManagement()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });













