import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Definiere AccessLevel als String-Literale entsprechend dem Enum in schema.prisma
type AccessLevel = 'read' | 'write' | 'both' | 'none';
const AccessLevel = {
  read: 'read' as AccessLevel,
  write: 'write' as AccessLevel,
  both: 'both' as AccessLevel,
  none: 'none' as AccessLevel
};

// Seiten, die immer sichtbar sein sollen
const alwaysVisiblePages = ['dashboard', 'settings'];

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starte Seeding...');

    // Erstelle Admin-Rolle
    const adminRole = await prisma.role.create({
      data: {
        id: 1,
        name: 'Admin',
        description: 'Administrator mit allen Rechten',
        permissions: {
          create: [
            // Immer sichtbare Seiten (für die Vollständigkeit)
            // @ts-ignore
            { entity: 'dashboard', entityType: 'page', accessLevel: AccessLevel.both },
            // @ts-ignore
            { entity: 'settings', entityType: 'page', accessLevel: AccessLevel.both },
            
            // Zusätzliche Seiten mit Berechtigungen
            // @ts-ignore
            { entity: 'usermanagement', entityType: 'page', accessLevel: AccessLevel.both },
            // @ts-ignore
            { entity: 'worktracker', entityType: 'page', accessLevel: AccessLevel.both },
            
            // Tabellen-Berechtigungen
            // @ts-ignore
            { entity: 'requests', entityType: 'table', accessLevel: AccessLevel.both },
            // @ts-ignore
            { entity: 'tasks', entityType: 'table', accessLevel: AccessLevel.both }
          ]
        }
      }
    });
    console.log('Admin-Rolle erstellt');

    // Erstelle Benutzer-Rolle
    const userRole = await prisma.role.create({
      data: {
        id: 2,
        name: 'User',
        description: 'Standardbenutzer',
        permissions: {
          create: [
            // Immer sichtbare Seiten (für die Vollständigkeit)
            // @ts-ignore
            { entity: 'dashboard', entityType: 'page', accessLevel: AccessLevel.read },
            // @ts-ignore
            { entity: 'settings', entityType: 'page', accessLevel: AccessLevel.read },
            
            // Zusätzliche Seiten mit Berechtigungen
            // @ts-ignore
            { entity: 'worktracker', entityType: 'page', accessLevel: AccessLevel.both },
            
            // Tabellen-Berechtigungen
            // @ts-ignore
            { entity: 'requests', entityType: 'table', accessLevel: AccessLevel.read },
            // @ts-ignore
            { entity: 'tasks', entityType: 'table', accessLevel: AccessLevel.both }
          ]
        }
      }
    });
    console.log('Benutzer-Rolle erstellt');

    // Erstelle Hamburger-Rolle
    const hamburgerRole = await prisma.role.create({
      data: {
        id: 999,
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
        permissions: {
          create: [
            // Immer sichtbare Seiten (für die Vollständigkeit) 
            // @ts-ignore
            { entity: 'dashboard', entityType: 'page', accessLevel: AccessLevel.read },
            // @ts-ignore
            { entity: 'settings', entityType: 'page', accessLevel: AccessLevel.read },
            
            // Zusätzliche Seiten mit Berechtigungen
            // @ts-ignore
            { entity: 'worktracker', entityType: 'page', accessLevel: AccessLevel.read },
            
            // Tabellen-Berechtigungen (minimal)
            // @ts-ignore
            { entity: 'tasks', entityType: 'table', accessLevel: AccessLevel.read }
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