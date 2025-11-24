import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    // 1. Prüfe alle Users mit Telefonnummer
    const usersWithPhone = await prisma.user.findMany({
      where: {
        phoneNumber: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        roles: {
          select: {
            roleId: true,
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log('\n=== Users mit Telefonnummer ===');
    console.log(`Anzahl: ${usersWithPhone.length}\n`);

    usersWithPhone.forEach(user => {
      console.log(`User ${user.id}: ${user.firstName} ${user.lastName}`);
      console.log(`  Telefonnummer: ${user.phoneNumber}`);
      console.log(`  Anzahl Rollen: ${user.roles.length}`);
      if (user.roles.length === 0) {
        console.log(`  ⚠️  WARNUNG: User hat KEINE Rollen!`);
      } else {
        user.roles.forEach(r => {
          console.log(`    - RoleId: ${r.roleId}, Role Name: ${r.role.name}`);
        });
      }
      console.log('');
    });

    // 2. Prüfe speziell User Pat (ID 3)
    const userPat = await prisma.user.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        roles: {
          select: {
            roleId: true,
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (userPat) {
      console.log('\n=== User Pat (ID 3) ===');
      console.log(JSON.stringify(userPat, null, 2));
      console.log(`\nAnzahl Rollen: ${userPat.roles.length}`);
      if (userPat.roles.length === 0) {
        console.log('⚠️  WARNUNG: User Pat hat KEINE Rollen!');
      }
    } else {
      console.log('\n⚠️  User Pat (ID 3) nicht gefunden!');
    }

    // 3. Prüfe UserRole Tabelle direkt
    const allUserRoles = await prisma.userRole.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('\n=== UserRole Tabelle ===');
    console.log(`Anzahl Einträge: ${allUserRoles.length}\n`);

    // Gruppiere nach User
    const usersWithRolesMap = new Map<number, any[]>();
    allUserRoles.forEach(ur => {
      if (!usersWithRolesMap.has(ur.userId)) {
        usersWithRolesMap.set(ur.userId, []);
      }
      usersWithRolesMap.get(ur.userId)!.push(ur);
    });

    usersWithRolesMap.forEach((roles, userId) => {
      const user = roles[0].user;
      if (user.phoneNumber) {
        console.log(`User ${userId}: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
        console.log(`  Rollen: ${roles.length}`);
        roles.forEach(r => {
          console.log(`    - RoleId: ${r.roleId}, Role Name: ${r.role.name}`);
        });
        console.log('');
      }
    });

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles();

