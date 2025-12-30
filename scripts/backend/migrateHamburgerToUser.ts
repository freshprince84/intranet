import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Script zum Migrieren bestehender Benutzer von Hamburger-Rolle (ID 999) zu User-Rolle (ID 2)
 * 
 * Zweck: Alle bestehenden Benutzer mit Hamburger-Rolle (ID 999) auf User-Rolle (ID 2) migrieren
 */
async function migrateHamburgerToUser() {
  try {
    console.log('🔍 Starte Suche nach Benutzern mit Hamburger-Rolle (ID 999)...');

    // Finde alle UserRole-Einträge mit Hamburger-Rolle (ID 999)
    const hamburgerUserRoles = await prisma.userRole.findMany({
      where: {
        roleId: 999
      },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        },
        role: true
      }
    });

    console.log(`✅ Gefundene Benutzer mit Hamburger-Rolle: ${hamburgerUserRoles.length}`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errors = 0;

    for (const hamburgerUserRole of hamburgerUserRoles) {
      const userId = hamburgerUserRole.userId;
      const username = hamburgerUserRole.user.username || `User ${userId}`;
      const hadLastUsed = hamburgerUserRole.lastUsed;

      console.log(`\n📋 Prüfe Benutzer ID ${userId} (${username})`);

      // Prüfe ob User bereits User-Rolle (ID 2) hat
      const existingUserRole = hamburgerUserRole.user.roles.find(
        ur => ur.roleId === 2
      );

      if (existingUserRole) {
        console.log(`  ⏭️  Benutzer hat bereits User-Rolle (ID 2), überspringe`);
        
        // Falls Hamburger-Rolle lastUsed = true war, setze User-Rolle auf lastUsed = true
        if (hadLastUsed && !existingUserRole.lastUsed) {
          // Deaktiviere alle anderen lastUsed Rollen
          await prisma.userRole.updateMany({
            where: {
              userId: userId,
              lastUsed: true
            },
            data: {
              lastUsed: false
            }
          });
          
          // Aktiviere User-Rolle
          await prisma.userRole.update({
            where: {
              userId_roleId: {
                userId: userId,
                roleId: 2
              }
            },
            data: {
              lastUsed: true
            }
          });
          console.log(`  ✅ User-Rolle auf lastUsed = true gesetzt`);
        }
        
        skippedCount++;
        continue;
      }

      try {
        // Deaktiviere alle anderen lastUsed Rollen (falls Hamburger lastUsed war)
        if (hadLastUsed) {
          await prisma.userRole.updateMany({
            where: {
              userId: userId,
              lastUsed: true
            },
            data: {
              lastUsed: false
            }
          });
        }

        // Erstelle UserRole-Eintrag mit User-Rolle (ID 2)
        await prisma.userRole.create({
          data: {
            userId: userId,
            roleId: 2,
            lastUsed: hadLastUsed // Setze lastUsed wenn Hamburger-Rolle lastUsed war
          }
        });

        console.log(`  ✅ Benutzer migriert zu User-Rolle (ID 2)`);
        if (hadLastUsed) {
          console.log(`  ✅ User-Rolle als aktiv gesetzt (lastUsed = true)`);
        }
        migratedCount++;
      } catch (error) {
        console.error(`  ❌ Fehler beim Migrieren:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Zusammenfassung:');
    console.log(`  ✅ Migriert: ${migratedCount}`);
    console.log(`  ⏭️  Übersprungen (bereits vorhanden): ${skippedCount}`);
    console.log(`  ❌ Fehler: ${errors}`);
    console.log(`  📋 Gesamt geprüfte Benutzer: ${hamburgerUserRoles.length}`);
    console.log('='.repeat(60));

    if (migratedCount > 0 || skippedCount > 0) {
      console.log('\n💡 Hinweis: Hamburger-Rolle (ID 999) UserRole-Einträge wurden NICHT gelöscht.');
      console.log('   Sie können manuell entfernt werden, nachdem die Migration erfolgreich war.');
    }

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
migrateHamburgerToUser()
  .then(() => {
    console.log('\n✅ Migration erfolgreich abgeschlossen!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  });

