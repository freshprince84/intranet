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

const prisma = new PrismaClient();

// ========================================
// VOLLSTÄNDIGE PERMISSION DEFINITIONS
// ========================================

// ALLE SEITEN IM SYSTEM
const ALL_PAGES = [
  'dashboard',
  'worktracker', 
  'consultations',
  'team_worktime_control', // = workcenter
  'payroll', // = lohnabrechnung
  'usermanagement', // = organisation
  'cerebro',
  'settings',
  'profile'
];

// ALLE TABELLEN IM SYSTEM
const ALL_TABLES = [
  'requests',           // auf dashboard
  'tasks',             // auf worktracker
  'users',             // auf usermanagement
  'roles',             // auf usermanagement
  'team_worktime',     // auf team_worktime_control
  'worktime',          // auf worktracker
  'clients',           // auf consultations
  'consultation_invoices', // auf consultations
  'branches',          // auf settings/system
  'notifications',     // allgemein
  'settings',          // auf settings
  'monthly_reports'    // auf consultations/reports
];

// ALLE BUTTONS IM SYSTEM
const ALL_BUTTONS = [
  // Database Management Buttons (Settings/System)
  'database_reset_table',
  'database_logs',
  
  // Invoice Functions Buttons
  'invoice_create',
  'invoice_download', 
  'invoice_mark_paid',
  'invoice_settings',
  
  // Todo/Task Buttons (Worktracker)
  'todo_create',
  'todo_edit',
  'todo_delete',
  'task_create',
  'task_edit', 
  'task_delete',
  
  // User Management Buttons
  'user_create',
  'user_edit',
  'user_delete',
  'role_assign',
  'role_create',
  'role_edit',
  'role_delete',
  
  // Worktime Buttons
  'worktime_start',
  'worktime_stop', 
  'worktime_edit',
  'worktime_delete',
  
  // General Cerebro Button
  'cerebro',
  
  // Consultation Buttons
  'consultation_start',
  'consultation_stop',
  'consultation_edit',
  
  // Client Management Buttons
  'client_create',
  'client_edit',
  'client_delete',
  
  // Settings Buttons
  'settings_system',
  'settings_notifications',
  'settings_profile',
  
  // Payroll Buttons
  'payroll_generate',
  'payroll_export',
  'payroll_edit'
];

async function main() {
  try {
    console.log('🚀 Starte Seeding...');

    // ========================================
    // 1. ROLLEN ERSTELLEN/AKTUALISIEREN
    // ========================================
    console.log('📋 Erstelle/Aktualisiere Rollen...');
    
    // Admin-Rolle (ID 1)
    const adminRole = await prisma.role.upsert({
      where: { id: 1 },
      update: {
        name: 'Admin',
        description: 'Administrator mit allen Rechten'
      },
      create: {
        id: 1,
        name: 'Admin',
        description: 'Administrator mit allen Rechten',
      },
    });
    console.log(`✅ Admin-Rolle: ${adminRole.name} (ID: ${adminRole.id})`);
    
    // User-Rolle (ID 2)
    const userRole = await prisma.role.upsert({
      where: { id: 2 },
      update: {
        name: 'User',
        description: 'Standardbenutzer mit eingeschränkten Rechten'
      },
      create: {
        id: 2,
        name: 'User',
        description: 'Standardbenutzer mit eingeschränkten Rechten',
      },
    });
    console.log(`✅ User-Rolle: ${userRole.name} (ID: ${userRole.id})`);
    
    // Hamburger-Rolle (ID 999)
    const hamburgerRole = await prisma.role.upsert({
      where: { id: 999 },
      update: {
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer'
      },
      create: {
        id: 999,
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
      },
    });
    console.log(`✅ Hamburger-Rolle: ${hamburgerRole.name} (ID: ${hamburgerRole.id})`);
    
    // ========================================
    // 2. HILFSFUNKTIONEN FÜR PERMISSIONS
    // ========================================
    
    // Hilfsfunktion zum idempotenten Erstellen von Berechtigungen
    async function ensurePermission(roleId: number, entity: string, entityType: string, accessLevel: string) {
      const existingPermission = await prisma.permission.findFirst({
        where: {
          roleId: roleId,
          entity: entity,
          entityType: entityType
        }
      });
      
      if (existingPermission) {
        // Nur aktualisieren wenn sich accessLevel geändert hat
        if (existingPermission.accessLevel !== accessLevel) {
          await prisma.permission.update({
            where: { id: existingPermission.id },
            data: { accessLevel: accessLevel }
          });
          console.log(`🔄 Berechtigung aktualisiert: ${entity} (${entityType}) für Rolle ${roleId}: ${existingPermission.accessLevel} → ${accessLevel}`);
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
        console.log(`➕ Neue Berechtigung erstellt: ${entity} (${entityType}) für Rolle ${roleId}: ${accessLevel}`);
      }
    }

    // Hilfsfunktion zum Erstellen aller Permissions für eine Rolle
    async function ensureAllPermissionsForRole(roleId: number, permissionMap: Record<string, AccessLevel>) {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      // Pages
      for (const page of ALL_PAGES) {
        const accessLevel = permissionMap[`page_${page}`] || 'none';
        const existingPermission = await prisma.permission.findFirst({
          where: { roleId, entity: page, entityType: 'page' }
        });
        
        if (existingPermission) {
          if (existingPermission.accessLevel !== accessLevel) {
            await prisma.permission.update({
              where: { id: existingPermission.id },
              data: { accessLevel }
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await prisma.permission.create({
            data: { roleId, entity: page, entityType: 'page', accessLevel }
          });
          createdCount++;
        }
      }

      // Tables  
      for (const table of ALL_TABLES) {
        const accessLevel = permissionMap[`table_${table}`] || 'none';
        const existingPermission = await prisma.permission.findFirst({
          where: { roleId, entity: table, entityType: 'table' }
        });
        
        if (existingPermission) {
          if (existingPermission.accessLevel !== accessLevel) {
            await prisma.permission.update({
              where: { id: existingPermission.id },
              data: { accessLevel }
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await prisma.permission.create({
            data: { roleId, entity: table, entityType: 'table', accessLevel }
          });
          createdCount++;
        }
      }

      // Buttons
      for (const button of ALL_BUTTONS) {
        const accessLevel = permissionMap[`button_${button}`] || 'none';
        const existingPermission = await prisma.permission.findFirst({
          where: { roleId, entity: button, entityType: 'button' }
        });
        
        if (existingPermission) {
          if (existingPermission.accessLevel !== accessLevel) {
            await prisma.permission.update({
              where: { id: existingPermission.id },
              data: { accessLevel }
            });
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          await prisma.permission.create({
            data: { roleId, entity: button, entityType: 'button', accessLevel }
          });
          createdCount++;
        }
      }

      console.log(`   📊 Rolle ${roleId}: ${createdCount} erstellt, ${updatedCount} aktualisiert, ${skippedCount} übersprungen`);
    }

    // ========================================
    // 3. ADMIN-PERMISSIONS (ALLE = BOTH)
    // ========================================
    console.log('🔑 Erstelle Admin-Berechtigungen (alle = both)...');
    
    const adminPermissionMap: Record<string, AccessLevel> = {};
    
    // Admin bekommt ALLES mit 'both'
    ALL_PAGES.forEach(page => adminPermissionMap[`page_${page}`] = 'both');
    ALL_TABLES.forEach(table => adminPermissionMap[`table_${table}`] = 'both');
    ALL_BUTTONS.forEach(button => adminPermissionMap[`button_${button}`] = 'both');

    await ensureAllPermissionsForRole(adminRole.id, adminPermissionMap);

    // ========================================
    // 4. USER-PERMISSIONS (SELEKTIV)
    // ========================================
    console.log('👤 Erstelle User-Berechtigungen (selektiv)...');
    
    const userPermissionMap: Record<string, AccessLevel> = {};
    
    // PAGES: alle AUSSER workcenter & organisation
    userPermissionMap['page_dashboard'] = 'both';
    userPermissionMap['page_worktracker'] = 'both';
    userPermissionMap['page_consultations'] = 'both';
    userPermissionMap['page_payroll'] = 'both';
    userPermissionMap['page_cerebro'] = 'both';
    userPermissionMap['page_settings'] = 'both';
    userPermissionMap['page_profile'] = 'both';
    // NICHT: team_worktime_control, usermanagement (bleiben 'none')
    
    // TABELLEN: alle AUSSER die auf worktracker, workcenter & organisation
    userPermissionMap['table_requests'] = 'both';       // dashboard
    userPermissionMap['table_clients'] = 'both';        // consultations
    userPermissionMap['table_consultation_invoices'] = 'both'; // consultations
    userPermissionMap['table_notifications'] = 'both';  // allgemein
    userPermissionMap['table_monthly_reports'] = 'both'; // consultations
    // NICHT: tasks, users, roles, team_worktime, worktime, branches (bleiben 'none')
    
    // BUTTONS: alle AUSSER in to do's & workcenter, lohnabrechnung, organisation & settings/system
    userPermissionMap['button_invoice_create'] = 'both';
    userPermissionMap['button_invoice_download'] = 'both';
    userPermissionMap['button_cerebro'] = 'both';
    userPermissionMap['button_consultation_start'] = 'both';
    userPermissionMap['button_consultation_stop'] = 'both';
    userPermissionMap['button_consultation_edit'] = 'both';
    userPermissionMap['button_client_create'] = 'both';
    userPermissionMap['button_client_edit'] = 'both';
    userPermissionMap['button_client_delete'] = 'both';
    userPermissionMap['button_settings_notifications'] = 'both';
    userPermissionMap['button_settings_profile'] = 'both';
    userPermissionMap['button_worktime_start'] = 'both';
    userPermissionMap['button_worktime_stop'] = 'both';
    // NICHT: todo_*, task_*, user_*, role_*, database_*, settings_system, payroll_*, worktime_edit/delete

    await ensureAllPermissionsForRole(userRole.id, userPermissionMap);

    // ========================================
    // 5. HAMBURGER-PERMISSIONS (BASIS)
    // ========================================
    console.log('🍔 Erstelle Hamburger-Berechtigungen (basis)...');
    
    const hamburgerPermissionMap: Record<string, AccessLevel> = {};
    
    // Nur Basis-Berechtigungen
    hamburgerPermissionMap['page_dashboard'] = 'both';
    hamburgerPermissionMap['page_settings'] = 'both';
    hamburgerPermissionMap['page_profile'] = 'both';
    hamburgerPermissionMap['page_cerebro'] = 'both';
    hamburgerPermissionMap['button_cerebro'] = 'both';
    hamburgerPermissionMap['button_settings_profile'] = 'both';
    hamburgerPermissionMap['table_notifications'] = 'both';

    await ensureAllPermissionsForRole(hamburgerRole.id, hamburgerPermissionMap);

    // ========================================
    // 6. BENUTZER ERSTELLEN
    // ========================================
    console.log('👥 Erstelle/Aktualisiere Benutzer...');
    
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
    console.log(`✅ Admin-Benutzer: ${adminUser.username}`);

    // ========================================
    // 7. NIEDERLASSUNGEN ERSTELLEN
    // ========================================
    console.log('🏢 Erstelle/Aktualisiere Niederlassungen...');
    
    const branches = ['Hauptsitz', 'Manila', 'Parque Poblado'];
    for (const branchName of branches) {
      const branch = await prisma.branch.upsert({
        where: { name: branchName },
        update: {},
        create: {
          name: branchName
        }
      });
      console.log(`✅ Niederlassung: ${branch.name}`);
      
      // Verknüpfe Admin mit jeder Niederlassung (nur wenn nicht bereits verknüpft)
      const existingConnection = await prisma.usersBranches.findUnique({
        where: { 
          userId_branchId: { 
            userId: adminUser.id, 
            branchId: branch.id 
          } 
        }
      });

      if (!existingConnection) {
        await prisma.usersBranches.create({
          data: {
            userId: adminUser.id,
            branchId: branch.id
          }
        });
        console.log(`🔗 Admin mit ${branch.name} verknüpft`);
      }
    }

    // ========================================
    // 8. STANDARD-EINSTELLUNGEN
    // ========================================
    console.log('⚙️ Erstelle Standard-Einstellungen...');
    
    // Tabelleneinstellungen für Admin (nur wenn nicht vorhanden)
    const existingTableSettings = await prisma.userTableSettings.findUnique({
      where: {
        userId_tableId: {
          userId: adminUser.id,
          tableId: 'worktracker_tasks'
        }
      }
    });

    if (!existingTableSettings) {
      await prisma.userTableSettings.create({
        data: {
          userId: adminUser.id,
          tableId: 'worktracker_tasks',
          columnOrder: JSON.stringify(['title', 'status', 'responsibleAndQualityControl', 'branch', 'dueDate', 'actions']),
          hiddenColumns: JSON.stringify([])
        }
      });
      console.log('✅ Standard-Tabelleneinstellungen erstellt');
    }

    // ========================================
    // 9. DEMO-CLIENTS ERSTELLEN
    // ========================================
    console.log('👥 Erstelle Demo-Clients (nur neue)...');
    
    const demoClients = [
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
        address: 'Beispielweg 42, 54321 Beispielstadt',
        notes: 'Großkunde mit regelmäßigen Beratungen'
      },
      {
        name: 'Tech Startup XYZ',
        company: 'Tech Startup XYZ',
        email: 'hello@techstartup.com',
        phone: '+49 555 123456',
        notes: 'Junges Unternehmen, sehr digital affin'
      }
    ];

    let clientsCreated = 0;
    let clientsSkipped = 0;

    for (const clientData of demoClients) {
      // Prüfe ob Client bereits existiert (basierend auf Name)
      const existingClient = await prisma.client.findFirst({
        where: { name: clientData.name }
      });

      if (!existingClient) {
      await prisma.client.create({
        data: clientData
      });
        clientsCreated++;
        console.log(`✅ Demo-Client erstellt: ${clientData.name}`);
      } else {
        clientsSkipped++;
        console.log(`⏭️ Demo-Client existiert bereits: ${clientData.name}`);
      }
    }

    console.log(`📊 Demo-Clients: ${clientsCreated} erstellt, ${clientsSkipped} übersprungen`);

    // ========================================
    // 10. DEMO-WORKTIME/BERATUNGEN ERSTELLEN
    // ========================================
    console.log('🕐 Erstelle Demo-Beratungen (nur neue)...');
    
    const heute = new Date();
    const gestern = new Date(heute);
    gestern.setDate(heute.getDate() - 1);
    const dieseWoche = new Date(heute);
    dieseWoche.setDate(heute.getDate() - 3);
    
    // Hole alle Clients und Branches
    const allClients = await prisma.client.findMany();
    const allBranches = await prisma.branch.findMany();
    
    if (allClients.length > 0 && allBranches.length > 0) {
    const demoConsultations = [
      {
        userId: adminUser.id,
          branchId: allBranches[0].id,
        clientId: allClients[0].id,
          startTime: gestern,
          endTime: new Date(gestern.getTime() + 2 * 60 * 60 * 1000), // 2 Stunden
          notes: 'Erste Beratung mit Musterfirma - sehr produktiv',
          timezone: 'Europe/Berlin'
      },
      {
        userId: adminUser.id,
          branchId: allBranches[0].id,
          clientId: allClients[1] ? allClients[1].id : allClients[0].id,
          startTime: dieseWoche,
          endTime: new Date(dieseWoche.getTime() + 1.5 * 60 * 60 * 1000), // 1.5 Stunden
          notes: 'Beratung zu steuerlichen Fragen',
          timezone: 'Europe/Berlin'
        }
      ];

      let consultationsCreated = 0;
    
    for (const consultation of demoConsultations) {
        // Prüfe ob ähnliche Beratung bereits existiert
        const existingConsultation = await prisma.workTime.findFirst({
          where: {
            userId: consultation.userId,
            clientId: consultation.clientId,
            startTime: consultation.startTime
          }
        });

        if (!existingConsultation) {
          await prisma.workTime.create({
            data: consultation
          });
          consultationsCreated++;
          console.log(`✅ Demo-Beratung erstellt für Client ${consultation.clientId}`);
        }
      }

      console.log(`📊 Demo-Beratungen: ${consultationsCreated} erstellt`);
    }

    // ========================================
    // SEEDING ABGESCHLOSSEN
    // ========================================
    console.log('\n🎉 Seeding erfolgreich abgeschlossen!');
    console.log('\n📋 Zusammenfassung:');
    console.log(`   - ${ALL_PAGES.length} Seiten-Berechtigungen definiert`);
    console.log(`   - ${ALL_TABLES.length} Tabellen-Berechtigungen definiert`);
    console.log(`   - ${ALL_BUTTONS.length} Button-Berechtigungen definiert`);
    console.log(`   - 3 Rollen (Admin, User, Hamburger)`);
    console.log(`   - Admin-Benutzer mit allen Berechtigungen`);
    console.log(`   - ${branches.length} Niederlassungen`);
    console.log(`   - Demo-Clients und Beratungen`);
    console.log('\n✨ Das System ist bereit für die Nutzung!');

  } catch (error) {
    console.error('❌ Fehler beim Seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  }); 