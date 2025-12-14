import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRICE_ANALYSIS_BUTTONS = [
  'price_analysis_create_rule',
  'price_analysis_edit_rule',
  'price_analysis_delete_rule',
  'price_analysis_apply_recommendation',
  'price_analysis_reject_recommendation',
  'price_analysis_run_rate_shopping'
];

async function main() {
  console.log('🔧 Fixe Price Analysis Button Permissions...\n');

  // Finde alle Admin-Rollen (ID 1, und alle mit name='Admin')
  const adminRoles = await prisma.role.findMany({
    where: {
      OR: [
        { id: 1 },
        { name: 'Admin' }
      ]
    },
    include: {
      permissions: true
    }
  });

  console.log(`📋 Gefundene Admin-Rollen: ${adminRoles.length}`);

  for (const role of adminRoles) {
    console.log(`\n🔑 Rolle: ${role.name} (ID: ${role.id}, Org: ${role.organizationId || 'global'})`);

    for (const button of PRICE_ANALYSIS_BUTTONS) {
      const existingPermission = await prisma.permission.findFirst({
        where: {
          roleId: role.id,
          entity: button,
          entityType: 'button'
        }
      });

      if (existingPermission) {
        if (existingPermission.accessLevel !== 'both') {
          await prisma.permission.update({
            where: { id: existingPermission.id },
            data: { accessLevel: 'both' }
          });
          console.log(`  ✅ Aktualisiert: ${button} (${existingPermission.accessLevel} → both)`);
        } else {
          console.log(`  ⏭️  Übersprungen: ${button} (bereits 'both')`);
        }
      } else {
        await prisma.permission.create({
          data: {
            roleId: role.id,
            entity: button,
            entityType: 'button',
            accessLevel: 'both'
          }
        });
        console.log(`  ➕ Erstellt: ${button} (both)`);
      }
    }
  }

  console.log('\n✅ Fertig!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

