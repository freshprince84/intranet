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

    // Rollen erstellen
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        id: 1,
        name: 'Admin',
        description: 'Administrator mit allen Rechten',
      },
    });

    const hamburgerRole = await prisma.role.upsert({
      where: { name: 'Hamburger' },
      update: {},
      create: {
        id: 999,
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
      },
    });

    // Berechtigungen für Admin-Rolle - ALLE RECHTE
    // Admin bekommt Berechtigung für alle Seiten und Tabellen mit "both" Zugriff
    const adminPermissions = [
      // Seiten-Berechtigungen
      { entity: 'dashboard', entityType: 'page', accessLevel: 'both' },
      { entity: 'worktracker', entityType: 'page', accessLevel: 'both' },
      { entity: 'usermanagement', entityType: 'page', accessLevel: 'both' },
      { entity: 'settings', entityType: 'page', accessLevel: 'both' },
      { entity: 'profile', entityType: 'page', accessLevel: 'both' },
      { entity: 'cerebro', entityType: 'page', accessLevel: 'both' },
      { entity: 'team_worktime_control', entityType: 'page', accessLevel: 'both' },
      
      // Tabellen-Berechtigungen
      { entity: 'requests', entityType: 'table', accessLevel: 'both' },
      { entity: 'tasks', entityType: 'table', accessLevel: 'both' },
      { entity: 'users', entityType: 'table', accessLevel: 'both' },
      { entity: 'roles', entityType: 'table', accessLevel: 'both' }, // WICHTIG: Berechtigung für Rollen-Verwaltung
      { entity: 'team_worktime', entityType: 'table', accessLevel: 'both' },
    ];

    // Berechtigungen für Hamburger-Rolle - NUR BASIS-RECHTE
    const hamburgerPermissions = [
      // Nur eingeschränkte Berechtigungen
      { entity: 'dashboard', entityType: 'page', accessLevel: 'both' },
      { entity: 'settings', entityType: 'page', accessLevel: 'both' },
      { entity: 'profile', entityType: 'page', accessLevel: 'both' },
      { entity: 'cerebro', entityType: 'page', accessLevel: 'both' },
    ];

    // Admin-Berechtigungen erstellen
    for (const permission of adminPermissions) {
      await prisma.permission.create({
        data: {
          entity: permission.entity,
          entityType: permission.entityType,
          accessLevel: permission.accessLevel,
          roleId: adminRole.id
        }
      });
    }

    // Hamburger-Berechtigungen erstellen
    for (const permission of hamburgerPermissions) {
      await prisma.permission.create({
        data: {
          entity: permission.entity,
          entityType: permission.entityType,
          accessLevel: permission.accessLevel,
          roleId: hamburgerRole.id
        }
      });
    }

    // Erstelle Benutzer-Rolle
    const userRole = await prisma.role.upsert({
      where: { name: 'User' },
      update: {},
      create: {
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

    // Erstelle Admin-Benutzer
    const hashedPassword = await bcrypt.hash('admin123', 10);
    // @ts-ignore - Ignoriere den Email-Typfehler, der entsteht durch veraltete Typen
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
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

    // Erstelle Standard-Tabelleneinstellungen für den Admin
    await prisma.userTableSettings.upsert({
      where: {
        userId_tableId: {
          userId: adminUser.id,
          tableId: 'worktracker_tasks'
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        tableId: 'worktracker_tasks',
        columnOrder: JSON.stringify(['title', 'status', 'responsibleAndQualityControl', 'branch', 'dueDate', 'actions']),
        hiddenColumns: JSON.stringify([])
      }
    });
    console.log('Standard-Tabelleneinstellungen für Admin erstellt');

    // Erstelle Test-Niederlassungen
    const branches = ['Hauptsitz', 'Manila', 'Parque Poblado'];
    for (const branchName of branches) {
      const branch = await prisma.branch.upsert({
        where: { name: branchName },
        update: {},
        create: {
          name: branchName
        }
      });
      
      // Verknüpfe Admin mit jeder Niederlassung
      await prisma.usersBranches.upsert({
        where: { 
          userId_branchId: { 
            userId: adminUser.id, 
            branchId: branch.id 
          } 
        },
        update: {},
        create: {
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