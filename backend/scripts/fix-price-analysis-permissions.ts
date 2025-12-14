import { PrismaClient } from '@prisma/client';
import { userCache } from '../src/services/userCache';

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

  // Invalidiere UserCache für alle User mit Admin-Rollen
  console.log('\n🔄 Invalidiere UserCache für alle Admin-User...');
  const adminUsers = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            OR: [
              { id: 1 },
              { name: 'Admin' }
            ]
          }
        }
      }
    },
    select: {
      id: true
    }
  });

  for (const user of adminUsers) {
    userCache.invalidate(user.id);
  }

  console.log(`✅ UserCache invalidiert für ${adminUsers.length} Admin-User`);
  console.log('\n✅ Fertig!');
  console.log('\n⚠️  WICHTIG: User müssen sich neu einloggen oder 5 Minuten warten, damit neue Permissions geladen werden!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

