#!/usr/bin/env ts-node
/**
 * Fügt Permission für 'todos' Tab zur Reception-Rolle hinzu
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Suche Reception-Rolle...');
    
    // Finde Reception-Rolle
    const receptionRole = await prisma.role.findFirst({
      where: { name: 'Reception' },
      include: { permissions: true }
    });

    if (!receptionRole) {
      console.log('❌ Reception-Rolle nicht gefunden!');
      return;
    }

    console.log(`✅ Reception-Rolle gefunden (ID: ${receptionRole.id})`);
    console.log(`   Aktuelle Permissions: ${receptionRole.permissions.length}`);

    // Prüfe ob Permission bereits existiert
    const existingPermission = await prisma.permission.findFirst({
      where: {
        roleId: receptionRole.id,
        entity: 'todos',
        entityType: 'tab'
      }
    });

    if (existingPermission) {
      console.log('✅ Permission für todos Tab existiert bereits');
      console.log(`   AccessLevel: ${existingPermission.accessLevel}`);
      return;
    }

    // Füge Permission hinzu
    console.log('➕ Füge Permission für todos Tab hinzu...');
    
    const permission = await prisma.permission.create({
      data: {
        roleId: receptionRole.id,
        entity: 'todos',
        entityType: 'tab',
        accessLevel: 'both' // Lese- und Schreibzugriff
      }
    });

    console.log(`✅ Permission erstellt (ID: ${permission.id})`);
    console.log(`   Entity: ${permission.entity}`);
    console.log(`   EntityType: ${permission.entityType}`);
    console.log(`   AccessLevel: ${permission.accessLevel}`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

