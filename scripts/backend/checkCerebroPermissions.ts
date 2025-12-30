import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCerebroPermissions() {
  try {
    console.log('🔍 Prüfe Cerebro-Berechtigungen in der Datenbank...\n');

    // Hole alle Rollen mit ihren Cerebro-Berechtigungen
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          where: {
            entity: {
              in: ['cerebro', 'cerebro_media', 'cerebro_links']
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📋 Gefundene Rollen: ${roles.length}\n`);

    for (const role of roles) {
      const cerebroPerms = role.permissions.filter(p => p.entity === 'cerebro');
      const mediaPerms = role.permissions.filter(p => p.entity === 'cerebro_media');
      const linksPerms = role.permissions.filter(p => p.entity === 'cerebro_links');

      if (cerebroPerms.length > 0 || mediaPerms.length > 0 || linksPerms.length > 0) {
        console.log(`\n📌 Rolle: "${role.name}" (ID: ${role.id})`);
        console.log(`   Organization ID: ${role.organizationId || 'null (global)'}`);

        if (cerebroPerms.length > 0) {
          cerebroPerms.forEach(p => {
            console.log(`   ✅ cerebro: ${p.entityType} - ${p.accessLevel}`);
          });
        } else {
          console.log(`   ❌ cerebro: FEHLT`);
        }

        if (mediaPerms.length > 0) {
          mediaPerms.forEach(p => {
            console.log(`   ✅ cerebro_media: ${p.entityType} - ${p.accessLevel}`);
          });
        } else {
          console.log(`   ❌ cerebro_media: FEHLT`);
        }

        if (linksPerms.length > 0) {
          linksPerms.forEach(p => {
            console.log(`   ✅ cerebro_links: ${p.entityType} - ${p.accessLevel}`);
          });
        } else {
          console.log(`   ❌ cerebro_links: FEHLT`);
        }
      }
    }

    // Prüfe auch UserRoles, um zu sehen, welche Rollen aktiv verwendet werden
    console.log('\n\n👥 Aktive User-Rollen (lastUsed = true):\n');
    const activeUserRoles = await prisma.userRole.findMany({
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
            permissions: {
              where: {
                entity: {
                  in: ['cerebro', 'cerebro_media', 'cerebro_links']
                }
              }
            }
          }
        }
      },
      take: 10 // Nur die ersten 10 zeigen
    });

    for (const userRole of activeUserRoles) {
      const role = userRole.role;
      const cerebroPerms = role.permissions.filter(p => p.entity === 'cerebro');
      const mediaPerms = role.permissions.filter(p => p.entity === 'cerebro_media');
      const linksPerms = role.permissions.filter(p => p.entity === 'cerebro_links');

      console.log(`\n👤 User: ${userRole.user.username || userRole.user.email} (ID: ${userRole.user.id})`);
      console.log(`   Rolle: "${role.name}" (ID: ${role.id})`);
      
      if (cerebroPerms.length > 0) {
        cerebroPerms.forEach(p => {
          console.log(`   ✅ cerebro: ${p.entityType} - ${p.accessLevel}`);
        });
      } else {
        console.log(`   ❌ cerebro: FEHLT`);
      }

      if (mediaPerms.length > 0) {
        mediaPerms.forEach(p => {
          console.log(`   ✅ cerebro_media: ${p.entityType} - ${p.accessLevel}`);
        });
      } else {
        console.log(`   ❌ cerebro_media: FEHLT`);
      }

      if (linksPerms.length > 0) {
        linksPerms.forEach(p => {
          console.log(`   ✅ cerebro_links: ${p.entityType} - ${p.accessLevel}`);
        });
      } else {
        console.log(`   ❌ cerebro_links: FEHLT`);
      }
    }

    console.log('\n\n✅ Prüfung abgeschlossen');
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCerebroPermissions();


