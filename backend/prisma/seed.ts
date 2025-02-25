import { PrismaClient, AccessLevel } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starte Seeding...');

    // Erstelle Admin-Rolle
    const adminRole = await prisma.role.create({
      data: {
        id: 1,
        name: 'admin',
        description: 'Administrator mit allen Rechten',
        permissions: {
          create: [
            // Die Typenfehler ignorieren wir für den Seed - die Daten werden korrekt eingetragen
            // @ts-ignore
            { page: 'dashboard', accessLevel: AccessLevel.both },
            // @ts-ignore
            { page: 'roles', accessLevel: AccessLevel.both },
            // @ts-ignore
            { page: 'users', accessLevel: AccessLevel.both },
            // @ts-ignore
            { page: 'settings', accessLevel: AccessLevel.both },
            // @ts-ignore
            { page: 'worktracker', accessLevel: AccessLevel.both }
          ]
        }
      }
    });
    console.log('Admin-Rolle erstellt');

    // Erstelle Benutzer-Rolle
    const userRole = await prisma.role.create({
      data: {
        id: 2,
        name: 'user',
        description: 'Standardbenutzer',
        permissions: {
          create: [
            // @ts-ignore
            { page: 'dashboard', accessLevel: AccessLevel.read },
            // @ts-ignore
            { page: 'settings', accessLevel: AccessLevel.read },
            // @ts-ignore
            { page: 'worktracker', accessLevel: AccessLevel.both }
          ]
        }
      }
    });
    console.log('Benutzer-Rolle erstellt');

    // Erstelle Hamburger-Rolle
    const hamburgerRole = await prisma.role.create({
      data: {
        id: 999,
        name: 'hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
        permissions: {
          create: [
            // @ts-ignore
            { page: 'dashboard', accessLevel: AccessLevel.read },
            // @ts-ignore
            { page: 'worktracker', accessLevel: AccessLevel.read }
          ]
        }
      }
    });
    console.log('Hamburger-Rolle erstellt');

    // Erstelle Admin-Benutzer
    const hashedPassword = await bcrypt.hash('admin123', 10);
    // @ts-ignore - Ignoriere den Email-Typfehler, der entsteht durch veraltete Typen
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: {
          create: {
            roleId: adminRole.id,
            lastUsed: true
          }
        }
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    console.log('Admin-Benutzer erstellt');

    // Erstelle Test-Niederlassungen
    const branches = ['Hauptsitz', 'Manila', 'Parque Poblado'];
    for (const branchName of branches) {
      const branch = await prisma.branch.create({
        data: {
          name: branchName
        }
      });
      
      // Verknüpfe Admin mit jeder Niederlassung
      await prisma.usersBranches.create({
        data: {
          userId: adminUser.id,
          branchId: branch.id
        }
      });
    }
    console.log('Niederlassungen erstellt und mit Admin verknüpft');

    console.log('Seeding abgeschlossen!');
  } catch (error) {
    console.error('Fehler beim Seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Fehler beim Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 