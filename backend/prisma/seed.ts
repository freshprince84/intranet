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

    // 1. ROLLEN ERSTELLEN
    console.log('Erstelle Rollen...');
    
    // Admin-Rolle (ID 1)
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: {
        id: 1,
        name: 'Admin',
        description: 'Administrator mit allen Rechten',
      },
    });
    
    // User-Rolle (ID 2)
    const userRole = await prisma.role.upsert({
      where: { name: 'User' },
      update: {},
      create: {
        id: 2,
        name: 'User',
        description: 'Standardbenutzer',
      },
    });
    
    // Hamburger-Rolle (ID 999)
    const hamburgerRole = await prisma.role.upsert({
      where: { name: 'Hamburger' },
      update: {},
      create: {
        id: 999,
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
      },
    });
    
    // 2. BERECHTIGUNGEN DEFINIEREN
    console.log('Definiere Berechtigungen...');
    
    // Admin-Berechtigungen - ALLE RECHTE
    const adminPermissions = [
      // Seiten-Berechtigungen
      { entity: 'dashboard', entityType: 'page', accessLevel: 'both' },
      { entity: 'worktracker', entityType: 'page', accessLevel: 'both' },
      { entity: 'usermanagement', entityType: 'page', accessLevel: 'both' },
      { entity: 'settings', entityType: 'page', accessLevel: 'both' },
      { entity: 'profile', entityType: 'page', accessLevel: 'both' },
      { entity: 'cerebro', entityType: 'page', accessLevel: 'both' },
      { entity: 'cerebro', entityType: 'button', accessLevel: 'both' },
      { entity: 'team_worktime_control', entityType: 'page', accessLevel: 'both' },
      { entity: 'payroll', entityType: 'page', accessLevel: 'both' },
      
      // Tabellen-Berechtigungen
      { entity: 'requests', entityType: 'table', accessLevel: 'both' },
      { entity: 'tasks', entityType: 'table', accessLevel: 'both' },
      { entity: 'users', entityType: 'table', accessLevel: 'both' },
      { entity: 'roles', entityType: 'table', accessLevel: 'both' },
      { entity: 'team_worktime', entityType: 'table', accessLevel: 'both' },
    ];
    
    // User-Berechtigungen - EINGESCHRÄNKTE RECHTE
    const userPermissions = [
      // Seiten
      { entity: 'dashboard', entityType: 'page', accessLevel: 'read' },
      { entity: 'worktracker', entityType: 'page', accessLevel: 'both' },
      { entity: 'settings', entityType: 'page', accessLevel: 'read' },
      { entity: 'requests', entityType: 'table', accessLevel: 'both' },
      { entity: 'tasks', entityType: 'table', accessLevel: 'both' },
    ];
    
    // Hamburger-Berechtigungen - BASIS-RECHTE
    const hamburgerPermissions = [
      { entity: 'dashboard', entityType: 'page', accessLevel: 'both' },
      { entity: 'settings', entityType: 'page', accessLevel: 'both' },
      { entity: 'profile', entityType: 'page', accessLevel: 'both' },
      { entity: 'cerebro', entityType: 'page', accessLevel: 'both' },
      { entity: 'cerebro', entityType: 'button', accessLevel: 'both' },
    ];
    
    // 3. BERECHTIGUNGEN IN DER DATENBANK ERSTELLEN
    console.log('Erstelle Berechtigungen in der Datenbank...');
    
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
    
    // User-Berechtigungen erstellen
    for (const permission of userPermissions) {
      await prisma.permission.create({
        data: {
          entity: permission.entity,
          entityType: permission.entityType,
          accessLevel: permission.accessLevel,
          roleId: userRole.id
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
    
    // 4. BENUTZER ERSTELLEN
    console.log('Erstelle Benutzer...');
    
    // Admin-Benutzer
    const hashedPassword = await bcrypt.hash('admin123', 10);
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
    
    // 5. ERSTELLE STANDARDEINSTELLUNGEN
    console.log('Erstelle Standardeinstellungen...');
    
    // Tabelleneinstellungen für Admin
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
    
    // 6. ERSTELLE NIEDERLASSUNGEN
    console.log('Erstelle Niederlassungen...');
    
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
    
    // 7. ERSTELLE CEREBRO MARKDOWN-DATEIEN
    console.log('Erstelle Cerebro Markdown-Dateien...');
    
    // Erstelle einen übergeordneten Ordner für Markdown-Dateien
    const markdownFolder = await prisma.cerebroCarticle.upsert({
      where: { slug: 'markdown-folder' },
      update: {},
      create: {
        title: 'Markdown-Dateien',
        slug: 'markdown-folder',
        content: 'Sammlung wichtiger Dokumentationsdateien aus dem GitHub Repository.',
        createdById: adminUser.id,
        isPublished: true
      }
    });
    
    // Liste der wichtigen Markdown-Dateien
    const IMPORTANT_MD_FILES = [
      { path: 'README.md', title: 'Readme - Überblick', slug: 'readme' },
      { path: 'PROJECT_SETUP.md', title: 'Projekt-Einrichtung', slug: 'project-setup' },
      { path: 'DB_SCHEMA.md', title: 'Datenbankschema', slug: 'db-schema' },
      { path: 'BACKEND_SETUP.md', title: 'Backend-Setup', slug: 'backend-setup' },
      { path: 'FRONTEND_SETUP.md', title: 'Frontend-Setup', slug: 'frontend-setup' },
      { path: 'CEREBRO_WIKI.md', title: 'Cerebro Wiki-System', slug: 'cerebro-wiki' },
      { path: 'API_INTEGRATION.md', title: 'API-Integration', slug: 'api-integration' },
      { path: 'ROLE_SWITCH.md', title: 'Rollenwechsel-Funktionalität', slug: 'role-switch' },
      { path: 'CHANGELOG.md', title: 'Änderungshistorie', slug: 'changelog' }
    ];
    
    // Erstelle für jede Markdown-Datei einen Eintrag in der Datenbank
    for (const mdFile of IMPORTANT_MD_FILES) {
      await prisma.cerebroCarticle.upsert({
        where: { slug: mdFile.slug },
        update: {},
        create: {
          title: mdFile.title,
          slug: mdFile.slug,
          content: `# ${mdFile.title}\n\nDiese Datei wird automatisch aus dem GitHub Repository geladen.`,
          parentId: markdownFolder.id,  // Setze die Markdown-Datei als Kind des Ordners
          createdById: adminUser.id,
          isPublished: true
        }
      });
      
      // Erstelle einen GitHub-Link zur Markdown-Datei
      try {
        const existingLink = await prisma.cerebroExternalLink.findFirst({
          where: {
            url: `https://github.com/freshprince84/intranet/blob/main/${mdFile.path}`,
            carticleId: (await prisma.cerebroCarticle.findUnique({ where: { slug: mdFile.slug } }))!.id
          }
        });
        
        if (!existingLink) {
          await prisma.cerebroExternalLink.create({
            data: {
              url: `https://github.com/freshprince84/intranet/blob/main/${mdFile.path}`,
              title: `GitHub: ${mdFile.title}`,
              type: 'github_markdown',
              carticleId: (await prisma.cerebroCarticle.findUnique({ where: { slug: mdFile.slug } }))!.id,
              createdById: adminUser.id
            }
          });
        }
      } catch (error) {
        console.error(`Fehler beim Erstellen des Links für ${mdFile.title}:`, error);
      }
    }
    
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