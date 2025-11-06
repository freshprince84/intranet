/**
 * Script zum Bereinigen von User-Rollen:
 * 1. Rebeca Benitez: Entferne alle Rollen außer Org 2 (Mosaik)
 * 2. patrick-ammann: Entferne komplett
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupUsers() {
  try {
    console.log('🧹 Starte Bereinigung von User-Rollen...\n');

    // ========================================
    // 1. REBECA BENITEZ - Nur Org 2 (Mosaik) behalten
    // ========================================
    console.log('📋 Bereinige Rebeca Benitez...');
    
    const rebecaUser = await prisma.user.findUnique({
      where: { username: 'rebeca-benitez' },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                organizationId: true
              }
            }
          }
        }
      }
    });

    if (!rebecaUser) {
      console.log('   ⏭️ Rebeca Benitez nicht gefunden');
    } else {
      console.log(`   ✅ Rebeca Benitez gefunden (ID: ${rebecaUser.id})`);
      console.log(`   📊 Aktuelle Rollen: ${rebecaUser.roles.length}`);
      
      // Hole Org 2 (Mosaik) - sollte ID 2 haben
      const org2 = await prisma.organization.findUnique({
        where: { id: 2 }
      });

      if (!org2) {
        console.log('   ❌ Org 2 (Mosaik) nicht gefunden!');
      } else {
        console.log(`   ✅ Org 2 (Mosaik) gefunden: ${org2.displayName}`);
        
        // Finde alle Rollen von Org 2
        const org2Roles = await prisma.role.findMany({
          where: { organizationId: 2 },
          select: { id: true, name: true }
        });
        console.log(`   📋 Org 2 Rollen: ${org2Roles.map(r => `${r.name} (${r.id})`).join(', ')}`);

        // Entferne alle UserRoles, die NICHT zu Org 2 gehören
        let removedCount = 0;
        for (const userRole of rebecaUser.roles) {
          const role = userRole.role;
          
          // Wenn die Rolle nicht zu Org 2 gehört, entferne sie
          if (role.organizationId !== 2) {
            await prisma.userRole.delete({
              where: {
                userId_roleId: {
                  userId: rebecaUser.id,
                  roleId: role.id
                }
              }
            });
            removedCount++;
            console.log(`   🗑️ Entfernt: Rolle ${role.name} (Org ID: ${role.organizationId})`);
          } else {
            console.log(`   ✅ Behalten: Rolle ${role.name} (Org ID: ${role.organizationId})`);
          }
        }

        // Stelle sicher, dass Rebeca die Org 2 User-Rolle hat
        const org2UserRole = org2Roles.find(r => r.name === 'User');
        if (org2UserRole) {
          const existingUserRole = await prisma.userRole.findUnique({
            where: {
              userId_roleId: {
                userId: rebecaUser.id,
                roleId: org2UserRole.id
              }
            }
          });

          if (!existingUserRole) {
            await prisma.userRole.create({
              data: {
                userId: rebecaUser.id,
                roleId: org2UserRole.id,
                lastUsed: true
              }
            });
            console.log(`   ✅ Org 2 User-Rolle hinzugefügt`);
          } else {
            // Stelle sicher, dass lastUsed gesetzt ist
            await prisma.userRole.updateMany({
              where: {
                userId: rebecaUser.id
              },
              data: {
                lastUsed: false
              }
            });
            await prisma.userRole.update({
              where: {
                userId_roleId: {
                  userId: rebecaUser.id,
                  roleId: org2UserRole.id
                }
              },
              data: {
                lastUsed: true
              }
            });
            console.log(`   ✅ Org 2 User-Rolle als lastUsed gesetzt`);
          }
        }

        console.log(`\n📊 Rebeca Benitez: ${removedCount} Rollen entfernt\n`);
      }
    }

    // ========================================
    // 2. PATRICK-AMMANN - Komplett entfernen
    // ========================================
    console.log('📋 Entferne patrick-ammann...');
    
    const patrickUser = await prisma.user.findUnique({
      where: { username: 'patrick-ammann' },
      include: {
        roles: true,
        branches: true
      }
    });

    if (!patrickUser) {
      console.log('   ⏭️ patrick-ammann nicht gefunden');
    } else {
      console.log(`   ✅ patrick-ammann gefunden (ID: ${patrickUser.id})`);
      console.log(`   📊 Rollen: ${patrickUser.roles.length}, Branches: ${patrickUser.branches.length}`);

      // Entferne alle UserRoles
      if (patrickUser.roles.length > 0) {
        await prisma.userRole.deleteMany({
          where: { userId: patrickUser.id }
        });
        console.log(`   🗑️ ${patrickUser.roles.length} UserRoles entfernt`);
      }

      // Entferne alle UserBranches
      if (patrickUser.branches.length > 0) {
        await prisma.usersBranches.deleteMany({
          where: { userId: patrickUser.id }
        });
        console.log(`   🗑️ ${patrickUser.branches.length} UserBranches entfernt`);
      }

      // Entferne den User selbst
      await prisma.user.delete({
        where: { id: patrickUser.id }
      });
      console.log(`   🗑️ User patrick-ammann gelöscht\n`);
    }

    console.log('✅ Bereinigung abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupUsers()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

