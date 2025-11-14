#!/usr/bin/env node
/**
 * Korrigiert die Berechtigungen für User-Rollen:
 * - User-Rolle OHNE Organisation → organization_management = 'read' (sichtbar für Beitritt/Gründung)
 * - User-Rolle MIT Organisation → organization_management = 'none' (nicht sichtbar)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AccessLevel = 'read' | 'write' | 'both' | 'none';

async function ensurePermission(roleId: number, entity: string, entityType: string, accessLevel: AccessLevel) {
  const existingPermission = await prisma.permission.findFirst({
    where: {
      roleId: roleId,
      entity: entity,
      entityType: entityType
    }
  });
  
  if (existingPermission) {
    // Nur aktualisieren wenn sich accessLevel geändert hat
    if (existingPermission.accessLevel !== accessLevel) {
      await prisma.permission.update({
        where: { id: existingPermission.id },
        data: { accessLevel: accessLevel }
      });
      console.log(`  🔄 Berechtigung aktualisiert: ${entity} (${entityType}) für Rolle ${roleId}: ${existingPermission.accessLevel} → ${accessLevel}`);
      return true;
    }
    return false;
  } else {
    // Neue Berechtigung erstellen
    await prisma.permission.create({
      data: {
        roleId: roleId,
        entity: entity,
        entityType: entityType,
        accessLevel: accessLevel
      }
    });
    console.log(`  ✓ Berechtigung erstellt: ${entity} (${entityType}) - ${accessLevel}`);
    return true;
  }
}

async function main() {
  try {
    console.log('🔍 Prüfe User-Rollen und deren organization_management Berechtigungen...\n');
    
    // Finde alle User-Rollen
    const userRoles = await prisma.role.findMany({
      where: {
        name: 'User'
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        permissions: {
          where: {
            entity: 'organization_management',
            entityType: 'page'
          }
        }
      }
    });
    
    console.log(`📋 Gefundene User-Rollen: ${userRoles.length}\n`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const role of userRoles) {
      const hasOrganization = role.organizationId !== null;
      const currentPermission = role.permissions[0];
      const shouldHaveAccess = !hasOrganization; // OHNE Organisation = sichtbar, MIT Organisation = nicht sichtbar
      const targetAccessLevel: AccessLevel = shouldHaveAccess ? 'read' : 'none';
      
      console.log(`\n🔍 Rolle: ${role.name} (ID: ${role.id})`);
      console.log(`   Organisation: ${hasOrganization ? `${role.organization?.displayName} (ID: ${role.organizationId})` : 'KEINE (ohne Organisation)'}`);
      console.log(`   Aktuelle Berechtigung: ${currentPermission ? currentPermission.accessLevel : 'FEHLT'}`);
      console.log(`   Sollte haben: ${targetAccessLevel}`);
      
      if (shouldHaveAccess) {
        // User OHNE Organisation → organization_management = 'read'
        if (!currentPermission || currentPermission.accessLevel !== 'read') {
          const changed = await ensurePermission(role.id, 'organization_management', 'page', 'read');
          if (changed) {
            if (currentPermission) updatedCount++;
            else createdCount++;
          } else {
            skippedCount++;
          }
        } else {
          console.log(`   ✓ Berechtigung bereits korrekt (read)`);
          skippedCount++;
        }
      } else {
        // User MIT Organisation → organization_management = 'none'
        if (!currentPermission || currentPermission.accessLevel !== 'none') {
          const changed = await ensurePermission(role.id, 'organization_management', 'page', 'none');
          if (changed) {
            if (currentPermission) updatedCount++;
            else createdCount++;
          } else {
            skippedCount++;
          }
        } else {
          console.log(`   ✓ Berechtigung bereits korrekt (none)`);
          skippedCount++;
        }
      }
    }
    
    console.log(`\n\n✅ Fertig!`);
    console.log(`   - ${createdCount} Berechtigungen erstellt`);
    console.log(`   - ${updatedCount} Berechtigungen aktualisiert`);
    console.log(`   - ${skippedCount} Berechtigungen bereits korrekt`);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

