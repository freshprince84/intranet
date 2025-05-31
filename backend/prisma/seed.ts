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
      { entity: 'consultations', entityType: 'page', accessLevel: 'both' },
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
      { entity: 'clients', entityType: 'table', accessLevel: 'both' },
    ];
    
    // User-Berechtigungen - EINGESCHRÄNKTE RECHTE
    const userPermissions = [
      // Seiten
      { entity: 'dashboard', entityType: 'page', accessLevel: 'read' },
      { entity: 'worktracker', entityType: 'page', accessLevel: 'both' },
      { entity: 'consultations', entityType: 'page', accessLevel: 'both' },
      { entity: 'settings', entityType: 'page', accessLevel: 'read' },
      { entity: 'team_worktime_control', entityType: 'page', accessLevel: 'read' },
      { entity: 'requests', entityType: 'table', accessLevel: 'both' },
      { entity: 'tasks', entityType: 'table', accessLevel: 'both' },
      { entity: 'clients', entityType: 'table', accessLevel: 'both' },
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
    
    // Hilfsfunktion zum Erstellen/Aktualisieren von Berechtigungen
    async function createOrUpdatePermission(roleId: number, entity: string, entityType: string, accessLevel: string) {
      // Prüfen, ob die Berechtigung bereits existiert
      const existingPermission = await prisma.permission.findFirst({
        where: {
          roleId: roleId,
          entity: entity,
          entityType: entityType
        }
      });
      
      if (existingPermission) {
        // Berechtigung aktualisieren, falls nötig
        if (existingPermission.accessLevel !== accessLevel) {
          await prisma.permission.update({
            where: { id: existingPermission.id },
            data: { accessLevel: accessLevel }
          });
          console.log(`Berechtigung aktualisiert: ${entity} ${entityType} für Rolle ${roleId}`);
        } else {
          console.log(`Berechtigung bereits vorhanden: ${entity} ${entityType} für Rolle ${roleId}`);
        }
      } else {
        // Neue Berechtigung erstellen
        await prisma.permission.create({
          data: {
            entity: entity,
            entityType: entityType,
            accessLevel: accessLevel,
            roleId: roleId
          }
        });
        console.log(`Neue Berechtigung erstellt: ${entity} ${entityType} für Rolle ${roleId}`);
      }
    }
    
    // Admin-Berechtigungen erstellen
    for (const permission of adminPermissions) {
      await createOrUpdatePermission(
        adminRole.id,
        permission.entity,
        permission.entityType,
        permission.accessLevel
      );
    }
    
    // User-Berechtigungen erstellen
    for (const permission of userPermissions) {
      await createOrUpdatePermission(
        userRole.id,
        permission.entity,
        permission.entityType,
        permission.accessLevel
      );
    }
    
    // Hamburger-Berechtigungen erstellen
    for (const permission of hamburgerPermissions) {
      await createOrUpdatePermission(
        hamburgerRole.id,
        permission.entity,
        permission.entityType,
        permission.accessLevel
      );
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
    
    // Demo-Clients erstellen
    console.log('Erstelle Demo-Clients...');
    const clients = [
      {
        name: 'Musterfirma GmbH',
        company: 'Musterfirma GmbH',
        email: 'info@musterfirma.de',
        phone: '+49 123 456789',
        address: 'Musterstraße 1, 12345 Musterstadt',
        notes: 'Langjähriger Kunde, bevorzugt Termine vormittags'
      },
      {
        name: 'Max Müller',
        email: 'max.mueller@example.com',
        phone: '+49 987 654321',
        notes: 'Einzelunternehmer, IT-Beratung'
      },
      {
        name: 'Beispiel AG',
        company: 'Beispiel AG',
        email: 'kontakt@beispiel-ag.de',
        address: 'Beispielweg 42, 54321 Beispielstadt'
      }
    ];

    for (const clientData of clients) {
      await prisma.client.create({
        data: clientData
      });
    }

    console.log('Demo-Clients erstellt');

    // Demo-WorkTime-Einträge für Beratungen erstellen
    console.log('Erstelle Demo-Beratungen...');
    
    const heute = new Date();
    const gestern = new Date(heute);
    gestern.setDate(heute.getDate() - 1);
    const dieseWoche = new Date(heute);
    dieseWoche.setDate(heute.getDate() - 3);
    const letzteWoche = new Date(heute);
    letzteWoche.setDate(heute.getDate() - 8);
    
    // Hole alle erstellten Clients und Branches
    const allClients = await prisma.client.findMany();
    const allBranches = await prisma.branch.findMany();
    const firstBranch = allBranches[0];
    
    // Demo-Beratungen erstellen
    const demoConsultations = [
      // Heute
      {
        userId: adminUser.id,
        branchId: firstBranch.id,
        clientId: allClients[0].id,
        startTime: new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), 9, 0),
        endTime: new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), 10, 30),
        notes: 'Erstberatung zu IT-Infrastruktur. Kunde möchte Netzwerk modernisieren.'
      },
      {
        userId: adminUser.id,
        branchId: firstBranch.id,
        clientId: allClients[1].id,
        startTime: new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), 14, 0),
        endTime: new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), 15, 15),
        notes: 'Follow-up Gespräch zur Projektplanung.'
      },
      // Gestern
      {
        userId: adminUser.id,
        branchId: firstBranch.id,
        clientId: allClients[2].id,
        startTime: new Date(gestern.getFullYear(), gestern.getMonth(), gestern.getDate(), 11, 0),
        endTime: new Date(gestern.getFullYear(), gestern.getMonth(), gestern.getDate(), 12, 0),
        notes: 'Technische Beratung zu Cloud-Migration.'
      },
      // Diese Woche
      {
        userId: adminUser.id,
        branchId: firstBranch.id,
        clientId: allClients[0].id,
        startTime: new Date(dieseWoche.getFullYear(), dieseWoche.getMonth(), dieseWoche.getDate(), 10, 0),
        endTime: new Date(dieseWoche.getFullYear(), dieseWoche.getMonth(), dieseWoche.getDate(), 11, 30),
        notes: 'Präsentation der Lösung und Kostenvoranschlag.'
      },
      // Letzte Woche
      {
        userId: adminUser.id,
        branchId: firstBranch.id,
        clientId: allClients[1].id,
        startTime: new Date(letzteWoche.getFullYear(), letzteWoche.getMonth(), letzteWoche.getDate(), 15, 0),
        endTime: new Date(letzteWoche.getFullYear(), letzteWoche.getMonth(), letzteWoche.getDate(), 16, 45),
        notes: 'Projektbesprechung und Zeitplanung. Nächste Schritte definiert.'
      }
    ];
    
    for (const consultation of demoConsultations) {
      await prisma.workTime.create({
        data: consultation
      });
    }
    
    console.log('Demo-Beratungen erstellt');
    
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
      { path: 'README.md', title: 'Readme - Überblick', slug: 'readme', position: 1 },
      { path: 'DOKUMENTATIONSSTANDARDS.md', title: 'Dokumentationsstandards', slug: 'dokumentationsstandards', position: 2 },
      { path: 'CHANGELOG.md', title: 'Änderungshistorie', slug: 'changelog', position: 3 },
      
      // Nutzerorientierte Dokumentation
      { path: 'BENUTZERHANDBUCH.md', title: 'Benutzerhandbuch', slug: 'benutzerhandbuch', position: 4 },
      { path: 'ADMINISTRATORHANDBUCH.md', title: 'Administratorhandbuch', slug: 'administratorhandbuch', position: 5 },
      
      // Entwicklungsdokumentation
      { path: 'ENTWICKLUNGSUMGEBUNG.md', title: 'Entwicklungsumgebung', slug: 'entwicklungsumgebung', position: 6 },
      { path: 'ARCHITEKTUR.md', title: 'Systemarchitektur', slug: 'architektur', position: 7 },
      { path: 'CODING_STANDARDS.md', title: 'Coding-Standards', slug: 'coding-standards', position: 8 },
      { path: 'DESIGN_STANDARDS.md', title: 'Design-Standards', slug: 'design-standards', position: 9 },
      
      // Technische Spezifikationen
      { path: 'API_REFERENZ.md', title: 'API-Referenz', slug: 'api-referenz', position: 10 },
      { path: 'DATENBANKSCHEMA.md', title: 'Datenbankschema', slug: 'datenbankschema', position: 11 },
      { path: 'BERECHTIGUNGSSYSTEM.md', title: 'Berechtigungssystem', slug: 'berechtigungssystem', position: 12 },
      { path: 'DEPLOYMENT.md', title: 'Deployment', slug: 'deployment', position: 13 },
      
      // Modulspezifische Dokumentation
      { path: 'MODUL_ZEITERFASSUNG.md', title: 'Modul: Zeiterfassung', slug: 'modul-zeiterfassung', position: 14 },
      { path: 'MODUL_CEREBRO.md', title: 'Cerebro Wiki-System', slug: 'cerebro-wiki', position: 15 },
      { path: 'MODUL_TEAMKONTROLLE.md', title: 'Modul: Teamkontrolle', slug: 'modul-teamkontrolle', position: 16 },
      { path: 'MODUL_ABRECHNUNG.md', title: 'Modul: Abrechnung', slug: 'modul-abrechnung', position: 17 },
      
      // Zusätzliche Dateien
      { path: 'PROJECT_SETUP.md', title: 'Projekt-Einrichtung', slug: 'project-setup', position: 18 },
      { path: 'API_INTEGRATION.md', title: 'API-Integration', slug: 'api-integration', position: 19 },
      { path: 'ROLE_SWITCH.md', title: 'Rollenwechsel-Funktionalität', slug: 'role-switch', position: 20 }
    ];
    
    // Erstelle für jede Markdown-Datei einen Eintrag in der Datenbank
    for (const mdFile of IMPORTANT_MD_FILES) {
      try {
        // Versuche zuerst, den Artikel mit githubPath zu erstellen/aktualisieren
        await prisma.cerebroCarticle.upsert({
          where: { slug: mdFile.slug },
          update: {
            title: mdFile.title,
            position: mdFile.position,
            githubPath: mdFile.path 
          },
          create: {
            title: mdFile.title,
            slug: mdFile.slug,
            content: `# ${mdFile.title}\n\nDiese Datei wird automatisch aus dem GitHub Repository geladen.`,
            parentId: markdownFolder.id,
            createdById: adminUser.id,
            isPublished: true,
            position: mdFile.position,
            githubPath: mdFile.path
          }
        });
      } catch (error) {
        // Falls ein Fehler auftritt (z.B. weil githubPath nicht existiert),
        // führe ein Fallback ohne githubPath aus
        if (error instanceof Error && error.message.includes("githubPath")) {
          console.log(`Hinweis: githubPath wird nicht unterstützt. Führe Upsert ohne githubPath für ${mdFile.slug} aus.`);
          await prisma.cerebroCarticle.upsert({
            where: { slug: mdFile.slug },
            update: {
              title: mdFile.title,
              position: mdFile.position
            },
            create: {
              title: mdFile.title,
              slug: mdFile.slug,
              content: `# ${mdFile.title}\n\nDiese Datei wird automatisch aus dem GitHub Repository geladen.`,
              parentId: markdownFolder.id,
              createdById: adminUser.id,
              isPublished: true,
              position: mdFile.position
            }
          });
        } else {
          // Falls ein anderer Fehler auftritt, wirf ihn weiter
          throw error;
        }
      }
      
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