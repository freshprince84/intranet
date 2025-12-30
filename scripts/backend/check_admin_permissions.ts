#!/usr/bin/env node
/**
 * Prüft die Berechtigungen der Admin-Rolle
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const adminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        organizationId: 1
      },
      include: {
        permissions: {
          orderBy: [
            { entityType: 'asc' },
            { entity: 'asc' }
          ]
        }
      }
    });
    
    if (!adminRole) {
      console.error('❌ Admin-Rolle nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`\n📊 Admin-Rolle: ${adminRole.name} (ID: ${adminRole.id})`);
    console.log(`   Berechtigungen: ${adminRole.permissions.length}\n`);
    
    const byType = adminRole.permissions.reduce((acc, p) => {
      if (!acc[p.entityType]) {
        acc[p.entityType] = [];
      }
      acc[p.entityType].push(p.entity);
      return acc;
    }, {} as Record<string, string[]>);
    
    console.log('📄 Seiten (' + (byType.page?.length || 0) + '):');
    (byType.page || []).forEach(p => console.log(`   - ${p}`));
    
    console.log('\n📋 Tabellen (' + (byType.table?.length || 0) + '):');
    (byType.table || []).forEach(t => console.log(`   - ${t}`));
    
    console.log('\n🔘 Buttons (' + (byType.button?.length || 0) + '):');
    (byType.button || []).forEach(b => console.log(`   - ${b}`));
    
    console.log('\n✅ Erwartet: 9 Seiten, 15 Tabellen, 39 Buttons = 63 Berechtigungen');
    console.log(`✅ Tatsächlich: ${adminRole.permissions.length} Berechtigungen`);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

