import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPermissionCheck() {
  try {
    console.log('🔍 Debug: Berechtigungsprüfung simulieren...\n');

    // Hole einen aktiven User mit seiner Rolle
    const activeUserRole = await prisma.userRole.findFirst({
      where: {
        lastUsed: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!activeUserRole) {
      console.log('❌ Kein aktiver User gefunden');
      return;
    }

    const userId = activeUserRole.user.id;
    const roleId = activeUserRole.role.id;
    const role = activeUserRole.role;

    console.log(`👤 User: ${activeUserRole.user.username || activeUserRole.user.email} (ID: ${userId})`);
    console.log(`📌 Rolle: "${role.name}" (ID: ${roleId})`);
    console.log(`   Organization ID: ${role.organizationId || 'null (global)'}\n`);

    // Simuliere die checkPermission Funktion
    const testCases: Array<{ entity: string; requiredAccess: 'read' | 'write'; entityType: 'page' | 'table' | 'cerebro' }> = [
      { entity: 'cerebro', requiredAccess: 'write', entityType: 'cerebro' },
      { entity: 'cerebro_media', requiredAccess: 'write', entityType: 'cerebro' },
      { entity: 'cerebro_links', requiredAccess: 'write', entityType: 'cerebro' },
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Test: ${testCase.entity} (${testCase.requiredAccess}, ${testCase.entityType})`);
      
      // Suche nach der Berechtigung (wie in permissionMiddleware.ts)
      const permission = role.permissions.find(
        p => p.entity === testCase.entity && p.entityType === testCase.entityType
      );

      if (!permission) {
        console.log(`   ❌ Berechtigung NICHT gefunden!`);
        console.log(`   Verfügbare Permissions für diese Rolle:`);
        role.permissions
          .filter(p => p.entity.includes('cerebro'))
          .forEach(p => {
            console.log(`      - ${p.entity} (${p.entityType}): ${p.accessLevel}`);
          });
        continue;
      }

      console.log(`   ✅ Berechtigung gefunden: ${permission.accessLevel}`);

      // Prüfe, ob die Berechtigung ausreichend ist
      const hasAccess = 
        permission.accessLevel === 'both' || 
        (testCase.requiredAccess === 'read' && (permission.accessLevel === 'read' || permission.accessLevel === 'write')) ||
        (testCase.requiredAccess === 'write' && permission.accessLevel === 'write');

      if (hasAccess) {
        console.log(`   ✅ Zugriff GEWÄHRT`);
      } else {
        console.log(`   ❌ Zugriff VERWEIGERT (${permission.accessLevel} < ${testCase.requiredAccess})`);
      }
    }

    // Prüfe auch, ob es doppelte Berechtigungen gibt
    console.log(`\n\n🔍 Prüfe auf doppelte Berechtigungen...`);
    const cerebroPerms = role.permissions.filter(p => p.entity.includes('cerebro'));
    const grouped = cerebroPerms.reduce((acc, p) => {
      const key = `${p.entity}_${p.entityType}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(p);
      return acc;
    }, {} as Record<string, typeof cerebroPerms>);

    for (const [key, perms] of Object.entries(grouped)) {
      if (perms.length > 1) {
        console.log(`   ⚠️  Doppelte Berechtigung gefunden: ${key} (${perms.length}x)`);
        perms.forEach(p => {
          console.log(`      - ID: ${p.id}, AccessLevel: ${p.accessLevel}`);
        });
      }
    }

    console.log('\n\n✅ Debug abgeschlossen');
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPermissionCheck();

