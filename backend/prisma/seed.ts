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
  'organization_management', // = organisation (Hauptseite)
  'cerebro',
  'settings',
  'profile',
  'tour_management', // NEU: Touren-Verwaltung
  'password_manager' // NEU: Passwort-Manager
];

// ALLE TABELLEN IM SYSTEM
const ALL_TABLES = [
  'requests',           // auf dashboard
  'tasks',             // auf worktracker
  'reservations',      // auf worktracker (in To Do's Box)
  'users',             // auf organization_management
  'roles',             // auf organization_management
  'organization',      // auf organization_management
  'team_worktime',     // auf team_worktime_control
  'worktime',          // auf worktracker
  'clients',           // auf consultations
  'consultation_invoices', // auf consultations
  'branches',          // auf settings/system
  'notifications',     // allgemein
  'settings',          // auf settings
  'monthly_reports',    // auf consultations/reports
  'organization_join_requests', // auf organization_management
  'organization_users',  // auf organization_management
  'tours',             // NEU: auf tour_management
  'tour_bookings',     // NEU: auf tour_management
  'tour_providers'     // NEU: auf organization_management
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
  
  // Organization Management Buttons
  'organization_create',
  'organization_edit',
  'organization_delete',
  
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
  'payroll_edit',
  
  // Tour Management Buttons
  'tour_create',
  'tour_edit',
  'tour_delete',
  'tour_view',
  'tour_booking_create',
  'tour_booking_edit',
  'tour_booking_cancel',
  'tour_provider_create',
  'tour_provider_edit',
  'tour_provider_delete',
  
  // Password Manager Buttons
  'password_entry_create',
  'password_entry_edit',
  'password_entry_delete'
];

async function main() {
  try {
    console.log('🚀 Starte Seeding...');

    // ========================================
    // 1. ROLLEN ERSTELLEN/AKTUALISIEREN
    // ========================================
    console.log('📋 Erstelle/Aktualisiere Rollen...');
    
    // Admin-Rolle (ID 1) - ohne Organisation (organizationId = null)
    const adminRole = await prisma.role.upsert({
      where: { id: 1 },
      update: {
        name: 'Admin',
        description: 'Administrator mit allen Rechten',
        organizationId: null
      },
      create: {
        id: 1,
        name: 'Admin',
        description: 'Administrator mit allen Rechten',
        organizationId: null
      },
    });
    console.log(`✅ Admin-Rolle: ${adminRole.name} (ID: ${adminRole.id})`);
    
    // User-Rolle (ID 2) - ohne Organisation (organizationId = null)
    const userRole = await prisma.role.upsert({
      where: { id: 2 },
      update: {
        name: 'User',
        description: 'Standardbenutzer mit eingeschränkten Rechten',
        organizationId: null
      },
      create: {
        id: 2,
        name: 'User',
        description: 'Standardbenutzer mit eingeschränkten Rechten',
        organizationId: null
      },
    });
    console.log(`✅ User-Rolle: ${userRole.name} (ID: ${userRole.id})`);
    
    // Hamburger-Rolle (ID 999) - ohne Organisation (organizationId = null)
    const hamburgerRole = await prisma.role.upsert({
      where: { id: 999 },
      update: {
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
        organizationId: null
      },
      create: {
        id: 999,
        name: 'Hamburger',
        description: 'Hamburger-Rolle für neue Benutzer',
        organizationId: null
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

    // Cerebro-spezifische Berechtigungen für Admin (entityType: 'cerebro')
    await ensurePermission(adminRole.id, 'cerebro', 'cerebro', 'both');
    await ensurePermission(adminRole.id, 'cerebro_media', 'cerebro', 'both');
    await ensurePermission(adminRole.id, 'cerebro_links', 'cerebro', 'both');

    // ========================================
    // 4. USER-PERMISSIONS (SELEKTIV)
    // ========================================
    console.log('👤 Erstelle User-Berechtigungen (selektiv)...');
    
    const userPermissionMap: Record<string, AccessLevel> = {};
    
    // PAGES: alle AUSSER workcenter
    // organization_management = 'read' für User-Rolle OHNE Organisation (sichtbar für Beitritt/Gründung)
    // organization_management = 'none' für User-Rolle MIT Organisation (nicht sichtbar)
    userPermissionMap['page_dashboard'] = 'both';
    userPermissionMap['page_worktracker'] = 'both';
    userPermissionMap['page_consultations'] = 'both';
    userPermissionMap['page_payroll'] = 'both';
    userPermissionMap['page_cerebro'] = 'both';
    userPermissionMap['page_settings'] = 'both';
    userPermissionMap['page_profile'] = 'both';
    userPermissionMap['page_tour_management'] = 'read'; // NEU: User können Touren-Verwaltung sehen
    userPermissionMap['page_organization_management'] = 'read'; // Sichtbar für User OHNE Organisation
    // NICHT: team_worktime_control (bleibt 'none')
    
    // TABELLEN: alle AUSSER die auf worktracker, workcenter & organisation
    userPermissionMap['table_requests'] = 'both';       // dashboard
    userPermissionMap['table_clients'] = 'both';        // consultations
    userPermissionMap['table_consultation_invoices'] = 'both'; // consultations
    userPermissionMap['table_notifications'] = 'both';  // allgemein
    userPermissionMap['table_monthly_reports'] = 'both'; // consultations
    userPermissionMap['table_reservations'] = 'both';    // worktracker (in To Do's Box)
    userPermissionMap['table_tours'] = 'read';           // NEU: User können Touren sehen
    userPermissionMap['table_tour_bookings'] = 'read';  // NEU: User können Buchungen sehen
    // NICHT: tasks, users, roles, team_worktime, worktime, branches (bleiben 'none')
    // users & roles bleiben 'none', damit Tabs sichtbar aber inaktiv sind (PRO-Markierung)
    
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
    userPermissionMap['button_tour_view'] = 'both';           // NEU: User können Touren ansehen
    userPermissionMap['button_tour_booking_create'] = 'both'; // NEU: User können Touren buchen
    // NICHT: todo_*, task_*, user_*, role_*, database_*, settings_system, payroll_*, worktime_edit/delete

    await ensureAllPermissionsForRole(userRole.id, userPermissionMap);

    // Cerebro-spezifische Berechtigungen für User (entityType: 'cerebro')
    await ensurePermission(userRole.id, 'cerebro', 'cerebro', 'both');
    await ensurePermission(userRole.id, 'cerebro_media', 'cerebro', 'both');
    await ensurePermission(userRole.id, 'cerebro_links', 'cerebro', 'both');

    // ========================================
    // 5. HAMBURGER-PERMISSIONS (BASIS)
    // ========================================
    console.log('🍔 Erstelle Hamburger-Berechtigungen (basis)...');
    
    const hamburgerPermissionMap: Record<string, AccessLevel> = {};
    
    // Basis-Berechtigungen (OHNE Organisation-Seite)
    hamburgerPermissionMap['page_dashboard'] = 'both';
    hamburgerPermissionMap['page_settings'] = 'both';
    hamburgerPermissionMap['page_profile'] = 'both';
    hamburgerPermissionMap['page_cerebro'] = 'both';
    hamburgerPermissionMap['page_tour_management'] = 'read'; // NEU: Hamburger können Touren-Verwaltung sehen
    hamburgerPermissionMap['button_cerebro'] = 'both';
    hamburgerPermissionMap['button_settings_profile'] = 'both';
    hamburgerPermissionMap['table_notifications'] = 'both';
    hamburgerPermissionMap['table_tours'] = 'read';          // NEU: Hamburger können Touren sehen
    hamburgerPermissionMap['table_tour_bookings'] = 'read';   // NEU: Hamburger können Buchungen sehen
    hamburgerPermissionMap['button_tour_view'] = 'both';     // NEU: Hamburger können Touren ansehen
    hamburgerPermissionMap['button_tour_booking_create'] = 'both'; // NEU: Hamburger können Touren buchen

    await ensureAllPermissionsForRole(hamburgerRole.id, hamburgerPermissionMap);

    // Cerebro-spezifische Berechtigungen für Hamburger (entityType: 'cerebro')
    await ensurePermission(hamburgerRole.id, 'cerebro', 'cerebro', 'both');
    await ensurePermission(hamburgerRole.id, 'cerebro_media', 'cerebro', 'both');
    await ensurePermission(hamburgerRole.id, 'cerebro_links', 'cerebro', 'both');

    // ========================================
    // 6. ORGANISATIONEN ERSTELLEN
    // ========================================
    console.log('🏢 Erstelle/Aktualisiere Organisationen...');
    
    // Zuerst prüfen, ob Organisationen mit den gewünschten IDs existieren
    const existingOrg1 = await prisma.organization.findUnique({
      where: { id: 1 }
    });
    const existingOrg2 = await prisma.organization.findUnique({
      where: { id: 2 }
    });

    // Organisation 1: La Familia Hostel
    let org1;
    if (existingOrg1 && existingOrg1.name !== 'la-familia-hostel') {
      // Falls Organisation mit ID 1 existiert, aber falscher Name, umbenennen
      console.log(`⚠️ Organisation mit ID 1 existiert mit anderem Namen (${existingOrg1.name}), benenne um...`);
      // Prüfe ob Organisation mit Zielnamen bereits existiert
      const conflictingOrg = await prisma.organization.findUnique({
        where: { name: 'la-familia-hostel' }
      });
      if (conflictingOrg) {
        // Falls Konflikt, lösche die andere Organisation zuerst
        await prisma.organization.delete({ where: { name: 'la-familia-hostel' } });
      }
      org1 = await prisma.organization.update({
        where: { id: 1 },
        data: {
          name: 'la-familia-hostel',
          displayName: 'La Familia Hostel',
          domain: 'lafamilia-hostel.com',
          isActive: true,
          maxUsers: 1000,
          subscriptionPlan: 'enterprise'
        }
      });
    } else {
      // Prüfe ob Organisation mit Namen existiert
      const org1ByName = await prisma.organization.findUnique({
        where: { name: 'la-familia-hostel' }
      });

      if (org1ByName) {
        // Falls Organisation mit Namen existiert, aktualisiere sie
        org1 = await prisma.organization.update({
          where: { name: 'la-familia-hostel' },
          data: {
            displayName: 'La Familia Hostel',
            domain: 'lafamilia-hostel.com',
            isActive: true,
            maxUsers: 1000,
            subscriptionPlan: 'enterprise'
          }
        });
        // Falls ID nicht 1 ist, müssen wir die Sequenz anpassen
        if (org1.id !== 1) {
          console.log(`⚠️ Organisation hat ID ${org1.id}, setze Sequenz zurück...`);
          // Setze Sequenz zurück, damit nächste Organisation ID 1 bekommt (falls org1.id > 1)
          if (org1.id > 1) {
            await prisma.$executeRaw`SELECT setval('"Organization_id_seq"', ${org1.id - 1}, true)`;
          }
          // Lösche org1 und erstelle neu mit ID 1
          await prisma.organization.delete({ where: { id: org1.id } });
          await prisma.$executeRaw`SELECT setval('"Organization_id_seq"', 0, true)`;
          org1 = await prisma.organization.create({
            data: {
              name: 'la-familia-hostel',
              displayName: 'La Familia Hostel',
              domain: 'lafamilia-hostel.com',
              isActive: true,
              maxUsers: 1000,
              subscriptionPlan: 'enterprise'
            }
          });
        }
      } else {
        // Falls keine Organisation existiert, erstelle mit ID 1
        // Setze Sequenz zurück, falls nötig
        const maxId = await prisma.$queryRaw<[{ max: bigint | null }]>`
          SELECT MAX(id) as max FROM "Organization"
        `;
        if (maxId[0].max && maxId[0].max >= 1) {
          await prisma.$executeRaw`SELECT setval('"Organization_id_seq"', 0, true)`;
        }
        org1 = await prisma.organization.create({
          data: {
            name: 'la-familia-hostel',
            displayName: 'La Familia Hostel',
            domain: 'lafamilia-hostel.com',
            isActive: true,
            maxUsers: 1000,
            subscriptionPlan: 'enterprise'
          }
        });
      }
    }
    console.log(`✅ Organisation 1: ${org1.displayName} (ID: ${org1.id})`);

    // ========================================
    // EMAIL-READING STANDARD-AKTIVIERUNG FÜR ORGANISATION 1
    // ========================================
    // WICHTIG: Email-Reading ist STANDARDMÄSSIG für Organisation 1 (La Familia Hostel) aktiviert
    // Das Passwort muss separat über setup-email-reading-la-familia.ts gesetzt werden
    console.log('📧 Stelle sicher, dass Email-Reading für Organisation 1 aktiviert ist...');
    
    // Lade aktuelle Settings
    const org1WithSettings = await prisma.organization.findUnique({
      where: { id: org1.id },
      select: { settings: true }
    });
    
    const currentSettings = (org1WithSettings?.settings || {}) as any;
    const emailReading = currentSettings.emailReading;
    
    // Standard-Konfiguration für Email-Reading (ohne Passwort - muss separat gesetzt werden)
    const defaultEmailReadingConfig = {
      enabled: true, // STANDARD: IMMER aktiviert für Organisation 1
      provider: 'imap' as const,
      imap: {
        host: 'mail.lafamilia-hostel.com',
        port: 993,
        secure: true,
        user: 'office@lafamilia-hostel.com',
        password: emailReading?.imap?.password || '', // Passwort bleibt erhalten oder leer
        folder: 'INBOX',
        processedFolder: 'Processed'
      },
      filters: {
        from: ['notification@lobbybookings.com'],
        subject: ['Nueva reserva', 'New reservation']
      }
    };
    
    // Wenn Email-Reading bereits konfiguriert ist, stelle sicher, dass enabled: true ist
    // Wenn nicht konfiguriert, erstelle Standard-Konfiguration (ohne Passwort)
    if (emailReading) {
      // Email-Reading existiert bereits - stelle sicher, dass enabled: true ist
      if (!emailReading.enabled) {
        console.log('   ⚠️ Email-Reading ist deaktiviert - aktiviere es...');
        currentSettings.emailReading = {
          ...emailReading,
          enabled: true // STANDARD: IMMER aktiviert für Organisation 1
        };
      } else {
        console.log('   ✅ Email-Reading ist bereits aktiviert');
      }
    } else {
      // Email-Reading nicht konfiguriert - erstelle Standard-Konfiguration
      console.log('   ⚠️ Email-Reading nicht konfiguriert - erstelle Standard-Konfiguration (Passwort muss separat gesetzt werden)');
      currentSettings.emailReading = defaultEmailReadingConfig;
    }
    
    // Aktualisiere Organisation mit Settings
    await prisma.organization.update({
      where: { id: org1.id },
      data: {
        settings: currentSettings
      }
    });
    console.log('   ✅ Email-Reading-Konfiguration für Organisation 1 aktualisiert');

    // Organisation 2: Mosaik
    let org2;
    if (existingOrg2 && existingOrg2.name !== 'mosaik') {
      // Falls Organisation mit ID 2 existiert, aber falscher Name, umbenennen
      console.log(`⚠️ Organisation mit ID 2 existiert mit anderem Namen (${existingOrg2.name}), benenne um...`);
      // Prüfe ob Organisation mit Zielnamen bereits existiert
      const conflictingOrg = await prisma.organization.findUnique({
        where: { name: 'mosaik' }
      });
      if (conflictingOrg) {
        // Falls Konflikt, lösche die andere Organisation zuerst
        await prisma.organization.delete({ where: { name: 'mosaik' } });
      }
      org2 = await prisma.organization.update({
        where: { id: 2 },
        data: {
          name: 'mosaik',
          displayName: 'Mosaik',
          domain: 'mosaik.ch',
          isActive: true,
          maxUsers: 1000,
          subscriptionPlan: 'enterprise'
        }
      });
    } else {
      // Prüfe ob Organisation mit Namen existiert
      const org2ByName = await prisma.organization.findUnique({
        where: { name: 'mosaik' }
      });

      if (org2ByName) {
        // Falls Organisation mit Namen existiert, aktualisiere sie
        org2 = await prisma.organization.update({
          where: { name: 'mosaik' },
          data: {
            displayName: 'Mosaik',
            domain: 'mosaik.ch',
            isActive: true,
            maxUsers: 1000,
            subscriptionPlan: 'enterprise'
          }
        });
        // Falls ID nicht 2 ist, müssen wir die Sequenz anpassen
        if (org2.id !== 2) {
          console.log(`⚠️ Organisation hat ID ${org2.id}, setze Sequenz zurück...`);
          // Versuche org2 zu löschen und neu zu erstellen (nur wenn keine Abhängigkeiten bestehen)
          try {
            await prisma.organization.delete({ where: { id: org2.id } });
            await prisma.$executeRaw`SELECT setval('"Organization_id_seq"', 1, true)`;
            org2 = await prisma.organization.create({
              data: {
                name: 'mosaik',
                displayName: 'Mosaik',
                domain: 'mosaik.ch',
                isActive: true,
                maxUsers: 1000,
                subscriptionPlan: 'enterprise'
              }
            });
          } catch (deleteError) {
            // Organisation kann nicht gelöscht werden (Foreign Key Constraints) - verwende bestehende Organisation
            console.log(`⚠️ Organisation ${org2.id} kann nicht gelöscht werden (Abhängigkeiten vorhanden), verwende bestehende Organisation`);
            // org2 bleibt unverändert
          }
        }
      } else {
        // Falls keine Organisation existiert, erstelle mit ID 2
        await prisma.$executeRaw`SELECT setval('"Organization_id_seq"', 1, true)`;
        org2 = await prisma.organization.create({
          data: {
            name: 'mosaik',
            displayName: 'Mosaik',
            domain: 'mosaik.ch',
            isActive: true,
            maxUsers: 1000,
            subscriptionPlan: 'enterprise'
          }
        });
      }
    }
    console.log(`✅ Organisation 2: ${org2.displayName} (ID: ${org2.id})`);

    // Standard-Organisation erstellen oder aktualisieren (für Rückwärtskompatibilität)
    const defaultOrganization = await prisma.organization.upsert({
      where: { name: 'default' },
      update: {
        displayName: 'Standard Organisation',
        isActive: true,
        maxUsers: 1000,
        subscriptionPlan: 'enterprise'
      },
      create: {
        name: 'default',
        displayName: 'Standard Organisation',
        isActive: true,
        maxUsers: 1000,
        subscriptionPlan: 'enterprise'
      }
    });
    console.log(`✅ Standard-Organisation: ${defaultOrganization.displayName} (ID: ${defaultOrganization.id})`);

    // ========================================
    // 6.1. ROLLEN FÜR ORGANISATIONEN ERSTELLEN
    // ========================================
    console.log('📋 Erstelle Rollen für Organisationen...');

    // Org 1 Rollen: Admin, User, Hamburger
    let org1AdminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        organizationId: org1.id
      }
    });
    if (!org1AdminRole) {
      org1AdminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator von La Familia Hostel',
          organizationId: org1.id
        }
      });
    } else {
      org1AdminRole = await prisma.role.update({
        where: { id: org1AdminRole.id },
        data: {
          description: 'Administrator von La Familia Hostel'
        }
      });
    }
    console.log(`✅ Org 1 Admin-Rolle: ${org1AdminRole.name} (ID: ${org1AdminRole.id})`);

    let org1UserRole = await prisma.role.findFirst({
      where: {
        name: 'User',
        organizationId: org1.id
      }
    });
    if (!org1UserRole) {
      org1UserRole = await prisma.role.create({
        data: {
          name: 'User',
          description: 'User-Rolle für La Familia Hostel',
          organizationId: org1.id
        }
      });
    } else {
      org1UserRole = await prisma.role.update({
        where: { id: org1UserRole.id },
        data: {
          description: 'User-Rolle für La Familia Hostel'
        }
      });
    }
    console.log(`✅ Org 1 User-Rolle: ${org1UserRole.name} (ID: ${org1UserRole.id})`);

    let org1HamburgerRole = await prisma.role.findFirst({
      where: {
        name: 'Hamburger',
        organizationId: org1.id
      }
    });
    if (!org1HamburgerRole) {
      org1HamburgerRole = await prisma.role.create({
        data: {
          name: 'Hamburger',
          description: 'Hamburger-Rolle für La Familia Hostel',
          organizationId: org1.id
        }
      });
    } else {
      org1HamburgerRole = await prisma.role.update({
        where: { id: org1HamburgerRole.id },
        data: {
          description: 'Hamburger-Rolle für La Familia Hostel'
        }
      });
    }
    console.log(`✅ Org 1 Hamburger-Rolle: ${org1HamburgerRole.name} (ID: ${org1HamburgerRole.id})`);

    // Org 2 Rollen: Admin, User, Hamburger
    let org2AdminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        organizationId: org2.id
      }
    });
    if (!org2AdminRole) {
      org2AdminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator von Mosaik',
          organizationId: org2.id
        }
      });
    } else {
      org2AdminRole = await prisma.role.update({
        where: { id: org2AdminRole.id },
        data: {
          description: 'Administrator von Mosaik'
        }
      });
    }
    console.log(`✅ Org 2 Admin-Rolle: ${org2AdminRole.name} (ID: ${org2AdminRole.id})`);

    let org2UserRole = await prisma.role.findFirst({
      where: {
        name: 'User',
        organizationId: org2.id
      }
    });
    if (!org2UserRole) {
      org2UserRole = await prisma.role.create({
        data: {
          name: 'User',
          description: 'User-Rolle für Mosaik',
          organizationId: org2.id
        }
      });
    } else {
      org2UserRole = await prisma.role.update({
        where: { id: org2UserRole.id },
        data: {
          description: 'User-Rolle für Mosaik'
        }
      });
    }
    console.log(`✅ Org 2 User-Rolle: ${org2UserRole.name} (ID: ${org2UserRole.id})`);

    let org2HamburgerRole = await prisma.role.findFirst({
      where: {
        name: 'Hamburger',
        organizationId: org2.id
      }
    });
    if (!org2HamburgerRole) {
      org2HamburgerRole = await prisma.role.create({
        data: {
          name: 'Hamburger',
          description: 'Hamburger-Rolle für Mosaik',
          organizationId: org2.id
        }
      });
    } else {
      org2HamburgerRole = await prisma.role.update({
        where: { id: org2HamburgerRole.id },
        data: {
          description: 'Hamburger-Rolle für Mosaik'
        }
      });
    }
    console.log(`✅ Org 2 Hamburger-Rolle: ${org2HamburgerRole.name} (ID: ${org2HamburgerRole.id})`);

    // Org 1 Legal-Rolle (Derecho)
    let org1LegalRole = await prisma.role.findFirst({
      where: {
        name: 'Derecho',
        organizationId: org1.id
      }
    });
    if (!org1LegalRole) {
      org1LegalRole = await prisma.role.create({
        data: {
          name: 'Derecho',
          description: 'Legal-Rolle für Sozialversicherungen (La Familia Hostel)',
          organizationId: org1.id
        }
      });
    } else {
      org1LegalRole = await prisma.role.update({
        where: { id: org1LegalRole.id },
        data: {
          description: 'Legal-Rolle für Sozialversicherungen (La Familia Hostel)'
        }
      });
    }
    console.log(`✅ Org 1 Legal-Rolle (Derecho): ${org1LegalRole.name} (ID: ${org1LegalRole.id})`);

    // Org 2 Legal-Rolle (Derecho)
    let org2LegalRole = await prisma.role.findFirst({
      where: {
        name: 'Derecho',
        organizationId: org2.id
      }
    });
    if (!org2LegalRole) {
      org2LegalRole = await prisma.role.create({
        data: {
          name: 'Derecho',
          description: 'Legal-Rolle für Sozialversicherungen (Mosaik)',
          organizationId: org2.id
        }
      });
    } else {
      org2LegalRole = await prisma.role.update({
        where: { id: org2LegalRole.id },
        data: {
          description: 'Legal-Rolle für Sozialversicherungen (Mosaik)'
        }
      });
    }
    console.log(`✅ Org 2 Legal-Rolle (Derecho): ${org2LegalRole.name} (ID: ${org2LegalRole.id})`);

    // Standard-Organisation Rollen (für Rückwärtskompatibilität)
    let orgAdminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        organizationId: defaultOrganization.id
      }
    });
    if (!orgAdminRole) {
      orgAdminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator der Standard-Organisation',
          organizationId: defaultOrganization.id
        }
      });
    } else {
      orgAdminRole = await prisma.role.update({
        where: { id: orgAdminRole.id },
        data: {
          description: 'Administrator der Standard-Organisation'
        }
      });
    }
    console.log(`✅ Standard-Organisations-Admin-Rolle: ${orgAdminRole.name} (ID: ${orgAdminRole.id})`);

    // Berechtigungen für alle Organisations-Rollen erstellen
    console.log('🔑 Erstelle Berechtigungen für Organisations-Rollen...');
    
    // Org 1 Admin: alle Berechtigungen
    const org1AdminPermissionMap: Record<string, AccessLevel> = {};
    ALL_PAGES.forEach(page => org1AdminPermissionMap[`page_${page}`] = 'both');
    ALL_TABLES.forEach(table => org1AdminPermissionMap[`table_${table}`] = 'both');
    ALL_BUTTONS.forEach(button => org1AdminPermissionMap[`button_${button}`] = 'both');
    await ensureAllPermissionsForRole(org1AdminRole.id, org1AdminPermissionMap);

    // Org 1 User: gleiche Berechtigungen wie User, ABER organization_management = 'none' (User MIT Organisation)
    const org1UserPermissionMap = { ...userPermissionMap };
    org1UserPermissionMap['page_organization_management'] = 'none'; // User MIT Organisation → nicht sichtbar
    await ensureAllPermissionsForRole(org1UserRole.id, org1UserPermissionMap);

    // Org 1 Hamburger: gleiche Berechtigungen wie Hamburger
    await ensureAllPermissionsForRole(org1HamburgerRole.id, hamburgerPermissionMap);

    // Org 1 Legal (Derecho): Basis-Berechtigungen + organization_management (read) für Zugriff auf UserManagementTab
    const legalPermissionMap: Record<string, AccessLevel> = {
      ...hamburgerPermissionMap, // Basis-Berechtigungen
      'page_organization_management': 'read', // Zugriff auf Organisation-Seite
      'table_organization_users': 'read' // Zugriff auf User-Tabelle (nur Lesen)
    };
    await ensureAllPermissionsForRole(org1LegalRole.id, legalPermissionMap);

    // Org 2 Admin: alle Berechtigungen
    const org2AdminPermissionMap: Record<string, AccessLevel> = {};
    ALL_PAGES.forEach(page => org2AdminPermissionMap[`page_${page}`] = 'both');
    ALL_TABLES.forEach(table => org2AdminPermissionMap[`table_${table}`] = 'both');
    ALL_BUTTONS.forEach(button => org2AdminPermissionMap[`button_${button}`] = 'both');
    await ensureAllPermissionsForRole(org2AdminRole.id, org2AdminPermissionMap);

    // Org 2 User: gleiche Berechtigungen wie User, ABER organization_management = 'none' (User MIT Organisation)
    const org2UserPermissionMap = { ...userPermissionMap };
    org2UserPermissionMap['page_organization_management'] = 'none'; // User MIT Organisation → nicht sichtbar
    await ensureAllPermissionsForRole(org2UserRole.id, org2UserPermissionMap);

    // Org 2 Hamburger: gleiche Berechtigungen wie Hamburger
    await ensureAllPermissionsForRole(org2HamburgerRole.id, hamburgerPermissionMap);

    // Org 2 Legal (Derecho): Basis-Berechtigungen + organization_management (read) für Zugriff auf UserManagementTab
    await ensureAllPermissionsForRole(org2LegalRole.id, legalPermissionMap);

    // Standard-Organisation Admin: alle Berechtigungen
    const orgAdminPermissionMap: Record<string, AccessLevel> = {};
    ALL_PAGES.forEach(page => orgAdminPermissionMap[`page_${page}`] = 'both');
    ALL_TABLES.forEach(table => orgAdminPermissionMap[`table_${table}`] = 'both');
    ALL_BUTTONS.forEach(button => orgAdminPermissionMap[`button_${button}`] = 'both');
    await ensureAllPermissionsForRole(orgAdminRole.id, orgAdminPermissionMap);

    // ========================================
    // 7. BENUTZER ERSTELLEN
    // ========================================
    console.log('👥 Erstelle/Aktualisiere Benutzer...');
    
    // ========================================
    // 7.1. ADMIN-BENUTZER - FIXER ADMIN FÜR ALLE ORGANISATIONEN (UNLÖSCHBAR)
    // ========================================
    console.log('🔒 Erstelle/aktualisiere fixen Admin-Benutzer: admin...');
    
    // Admin-Benutzer - Fixer Admin-Benutzer für ALLE Organisationen
    // WICHTIG: Dieser Benutzer muss IMMER existieren und ist UNLÖSCHBAR
    // Er hat Admin-Rolle für: Standard-Organisation, Org 1 (La Familia Hostel), Org 2 (Mosaik)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        firstName: 'Pat',
        lastName: 'Admin'
      },
      create: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Pat',
        lastName: 'Admin'
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
    console.log(`✅ Admin-Benutzer erstellt/aktualisiert: ${adminUser.username} (ID: ${adminUser.id})`);

    // Admin mit Standard-Organisations-Admin-Rolle verknüpfen
    let adminStandardOrgRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: orgAdminRole.id
        }
      }
    });
    if (!adminStandardOrgRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: orgAdminRole.id,
          lastUsed: false
        }
      });
      console.log(`✅ Admin-Benutzer mit Standard-Organisations-Admin-Rolle verknüpft`);
    }

    // Admin mit Org 1 Admin-Rolle verknüpfen
    let adminOrg1Role = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: org1AdminRole.id
        }
      }
    });
    if (!adminOrg1Role) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: org1AdminRole.id,
          lastUsed: false
        }
      });
      console.log(`✅ Admin-Benutzer mit Org 1 (La Familia Hostel) Admin-Rolle verknüpft`);
    }

    // Admin mit Org 2 Admin-Rolle verknüpfen
    let adminOrg2Role = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: org2AdminRole.id
        }
      }
    });
    if (!adminOrg2Role) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: org2AdminRole.id,
          lastUsed: false
        }
      });
      console.log(`✅ Admin-Benutzer mit Org 2 (Mosaik) Admin-Rolle verknüpft`);
    }

    // Setze Standard-Organisations-Rolle als lastUsed für Admin
    await prisma.userRole.updateMany({
      where: {
        userId: adminUser.id,
        lastUsed: true
      },
      data: {
        lastUsed: false
      }
    });
    await prisma.userRole.update({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: orgAdminRole.id
        }
      },
      data: {
        lastUsed: true
      }
    });
    console.log(`🔒 Admin-Benutzer ist jetzt Admin für alle Organisationen (fixer, unloschbarer Benutzer)`);

    // ========================================
    // 7.2. WEITERE BENUTZER ERSTELLEN
    // ========================================
    console.log('👥 Erstelle weitere Benutzer...');

    // Rebeca Benitez für Org 2 (NUR Org 2!)
    const rebecaPassword = await bcrypt.hash('admin123', 10);
    const rebecaUser = await prisma.user.upsert({
      where: { username: 'rebeca-benitez' },
      update: {},
      create: {
        username: 'rebeca-benitez',
        email: 'rebeca.benitez@mosaik.ch',
        password: rebecaPassword,
        firstName: 'Rebeca',
        lastName: 'Benitez'
      }
    });
    
    // Stelle sicher, dass Rebeca NUR Org 2 Rollen hat
    // Entferne alle Rollen, die nicht zu Org 2 gehören
    const rebecaUserRoles = await prisma.userRole.findMany({
      where: { userId: rebecaUser.id },
      include: {
        role: {
          select: {
            id: true,
            organizationId: true
          }
        }
      }
    });
    
    for (const userRole of rebecaUserRoles) {
      if (userRole.role.organizationId !== org2.id) {
        await prisma.userRole.delete({
          where: {
            userId_roleId: {
              userId: rebecaUser.id,
              roleId: userRole.role.id
            }
          }
        });
        console.log(`   🗑️ Entfernt: Rebeca Benitez Rolle für Org ${userRole.role.organizationId}`);
      }
    }
    
    // Stelle sicher, dass Rebeca die Org 2 User-Rolle hat
    const rebecaOrg2UserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: rebecaUser.id,
          roleId: org2UserRole.id
        }
      }
    });
    
    if (!rebecaOrg2UserRole) {
      await prisma.userRole.create({
        data: {
          userId: rebecaUser.id,
          roleId: org2UserRole.id,
          lastUsed: true
        }
      });
      console.log(`   ✅ Rebeca Benitez mit Org 2 User-Rolle verknüpft`);
    } else {
      // Setze lastUsed für Org 2 Rolle
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
      console.log(`   ✅ Rebeca Benitez Org 2 User-Rolle als lastUsed gesetzt`);
    }
    
    console.log(`✅ Rebeca Benitez-Benutzer: ${rebecaUser.username} (nur Org 2)`);

    // Christina Di Biaso für Org 2
    const christinaPassword = await bcrypt.hash('admin123', 10);
    const christinaUser = await prisma.user.upsert({
      where: { username: 'christina-di-biaso' },
      update: {},
      create: {
        username: 'christina-di-biaso',
        email: 'christina.dibiaso@mosaik.ch',
        password: christinaPassword,
        firstName: 'Christina',
        lastName: 'Di Biaso',
        roles: {
          create: {
            roleId: org2UserRole.id,
            lastUsed: true
          }
        }
      }
    });
    console.log(`✅ Christina Di Biaso-Benutzer: ${christinaUser.username}`);

    // ========================================
    // 8. NIEDERLASSUNGEN ERSTELLEN
    // ========================================
    console.log('🏢 Erstelle/Aktualisiere Niederlassungen...');
    
    // La Familia Hostel Branches: Parque Poblado & Manila
    const org1Branches = ['Parque Poblado', 'Manila'];
    for (const branchName of org1Branches) {
      const branch = await prisma.branch.upsert({
        where: { name: branchName },
        update: {
          organizationId: org1.id
        },
        create: {
          name: branchName,
          organizationId: org1.id
        }
      });
      console.log(`✅ Niederlassung Org 1: ${branch.name} (Org ID: ${branch.organizationId})`);
    }

    // Mosaik Branches: Sonnenhalden
    const org2Branch = await prisma.branch.upsert({
      where: { name: 'Sonnenhalden' },
      update: {
        organizationId: org2.id
      },
      create: {
        name: 'Sonnenhalden',
        organizationId: org2.id
      }
    });
    console.log(`✅ Niederlassung Org 2: ${org2Branch.name} (Org ID: ${org2Branch.organizationId})`);
    
    // Hauptsitz für Standard-Organisation (Rückwärtskompatibilität)
    const hauptsitzBranch = await prisma.branch.upsert({
      where: { name: 'Hauptsitz' },
      update: {},
      create: {
        name: 'Hauptsitz'
      }
    });
    console.log(`✅ Niederlassung: ${hauptsitzBranch.name}`);

    // ========================================
    // 9. STANDARD-EINSTELLUNGEN
    // ========================================
    console.log('⚙️ Erstelle Standard-Einstellungen...');
    
    // Tabelleneinstellungen für Admin (nur wenn nicht vorhanden)
    // Prüfe erst ob die Spalte viewMode existiert
    try {
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
            hiddenColumns: JSON.stringify([]),
            // viewMode ist optional, kann null sein wenn Spalte nicht existiert
            viewMode: null
          }
        });
        console.log('✅ Standard-Tabelleneinstellungen erstellt');
      }
    } catch (error: any) {
      // Falls viewMode Spalte nicht existiert, erstelle ohne sie
      if (error.code === 'P2022' && error.meta?.column === 'UserTableSettings.viewMode') {
        console.log('⚠️ viewMode Spalte existiert nicht, erstelle Einstellungen ohne sie...');
        // Versuche mit raw SQL (falls Prisma das nicht unterstützt)
        await prisma.$executeRaw`
          INSERT INTO "UserTableSettings" ("userId", "tableId", "columnOrder", "hiddenColumns", "createdAt", "updatedAt")
          SELECT ${adminUser.id}, 'worktracker_tasks', 
                 ${JSON.stringify(['title', 'status', 'responsibleAndQualityControl', 'branch', 'dueDate', 'actions'])}, 
                 ${JSON.stringify([])},
                 NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM "UserTableSettings" 
            WHERE "userId" = ${adminUser.id} AND "tableId" = 'worktracker_tasks'
          )
        `;
        console.log('✅ Standard-Tabelleneinstellungen erstellt (ohne viewMode)');
      } else {
        throw error;
      }
    }

    // ========================================
    // 10. CLIENTS FÜR ORG 2 ERSTELLEN
    // ========================================
    console.log('👥 Erstelle Clients für Org 2 (Mosaik)...');
    
    // Hole erste Branch für Org 2 (für WorkTime-Verknüpfung)
    // org2Branch wurde bereits oben erstellt

    const org2Clients = [
      {
        name: 'Hampi',
        isActive: true
      },
      {
        name: 'Heinz Hunziker',
        isActive: true
      },
      {
        name: 'Rebeca Benitez',
        isActive: true
      },
      {
        name: 'Stiven Pino',
        company: 'CESE ASOCIADOS',
        phone: '323 8119170',
        address: 'NN',
        notes: 'Cliente: consultor indemnización, propiedad expropiada.',
        isActive: true
      },
      {
        name: 'Urs Schmidlin',
        isActive: true
      }
    ];

    let clientsCreated = 0;
    let clientsSkipped = 0;
    const createdOrg2Clients: any[] = [];

    for (const clientData of org2Clients) {
      // Prüfe ob Client bereits existiert (basierend auf Name)
      const existingClient = await prisma.client.findFirst({
        where: { name: clientData.name }
      });

      if (!existingClient) {
        const client = await prisma.client.create({
          data: clientData
        });
        clientsCreated++;
        createdOrg2Clients.push(client);
        console.log(`✅ Org 2 Client erstellt: ${clientData.name}`);
      } else {
        clientsSkipped++;
        createdOrg2Clients.push(existingClient);
        console.log(`⏭️ Org 2 Client existiert bereits: ${clientData.name}`);
      }
    }

    console.log(`📊 Org 2 Clients: ${clientsCreated} erstellt, ${clientsSkipped} übersprungen`);

    // Erstelle Demo-WorkTimes für Org 2 Clients, damit sie zur Org 2 gehören
    // (Clients werden über WorkTimes → User → Roles → Organization zugeordnet)
    if (createdOrg2Clients.length > 0 && org2Branch && (rebecaUser || adminUser)) {
      const org2UserId = rebecaUser ? rebecaUser.id : adminUser.id;
      const heute = new Date();
      const gestern = new Date(heute);
      gestern.setDate(heute.getDate() - 1);

      // Erstelle eine Demo-WorkTime für den ersten Client
      const existingWorkTime = await prisma.workTime.findFirst({
        where: {
          userId: org2UserId,
          clientId: createdOrg2Clients[0].id,
          startTime: {
            gte: new Date(gestern.getTime() - 24 * 60 * 60 * 1000),
            lt: new Date(gestern.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (!existingWorkTime) {
        await prisma.workTime.create({
          data: {
            userId: org2UserId,
            branchId: org2Branch.id,
            clientId: createdOrg2Clients[0].id,
            startTime: gestern,
            endTime: new Date(gestern.getTime() + 1 * 60 * 60 * 1000), // 1 Stunde
            notes: 'Demo-WorkTime für Org 2 Client-Verknüpfung',
            timezone: 'Europe/Zurich'
          }
        });
        console.log(`🔗 Demo-WorkTime für Org 2 Client-Verlinkung erstellt`);
      }
    }

    // ========================================
    // 10.1. DEMO-CLIENTS ERSTELLEN (für Standard-Organisation)
    // ========================================
    console.log('👥 Erstelle Demo-Clients für Standard-Organisation (nur neue)...');
    
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

    let demoClientsCreated = 0;
    let demoClientsSkipped = 0;

    for (const clientData of demoClients) {
      // Prüfe ob Client bereits existiert (basierend auf Name)
      const existingClient = await prisma.client.findFirst({
        where: { name: clientData.name }
      });

      if (!existingClient) {
        await prisma.client.create({
          data: clientData
        });
        demoClientsCreated++;
        console.log(`✅ Demo-Client erstellt: ${clientData.name}`);
      } else {
        demoClientsSkipped++;
        console.log(`⏭️ Demo-Client existiert bereits: ${clientData.name}`);
      }
    }

    console.log(`📊 Demo-Clients: ${demoClientsCreated} erstellt, ${demoClientsSkipped} übersprungen`);

    // ========================================
    // 11. DEMO-WORKTIME/BERATUNGEN ERSTELLEN
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
    // 12. STANDARDFILTER FÜR ROLLEN UND BENUTZER ERSTELLEN
    // ========================================
    // WICHTIG: Diese Funktion wird in einem try-catch ausgeführt, damit sie auch bei Fehlern in anderen Seed-Bereichen ausgeführt wird
    try {
      console.log('🔍 Erstelle Standardfilter für Rollen und Benutzer...');
    
    /**
     * Erstellt Filter-Gruppen und Filter für Rollen und Benutzer
     * @param userId - ID des Benutzers, für den die Filter erstellt werden
     * @param organizationId - ID der Organisation (null für globale Rollen)
     */
    async function createRoleAndUserFilters(userId: number, organizationId: number | null) {
      try {
        // Übersetzungen für Filter-Gruppen (DE als Standard)
        const groupNames = {
          roles: 'Rollen',
          users: 'Benutzer'
        };

        // Hole alle Rollen der Organisation (oder globale Rollen wenn organizationId = null)
        const roles = await prisma.role.findMany({
          where: organizationId !== null 
            ? { organizationId }
            : { organizationId: null },
          orderBy: { name: 'asc' }
        });

        // Hole alle aktiven Benutzer der Organisation
        // Für standalone User (organizationId = null): nur eigene User-Daten
        const userFilter = organizationId !== null
          ? {
              roles: {
                some: {
                  role: {
                    organizationId
                  }
                }
              },
              active: true
            }
          : {
              id: userId, // Nur eigene User-Daten für standalone User
              active: true
            };

        const users = await prisma.user.findMany({
          where: userFilter,
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        });

        // Tabellen für die Filter
        const tables = [
          { id: 'requests-table', name: 'Requests' },
          { id: 'worktracker-todos', name: 'ToDos' }
        ];

        for (const table of tables) {
          // Erstelle oder hole Filter-Gruppen
          let rolesGroup = await prisma.filterGroup.findFirst({
            where: {
              userId,
              tableId: table.id,
              name: groupNames.roles
            }
          });

          if (!rolesGroup) {
            // Finde die höchste order-Nummer für diese Tabelle
            const maxOrder = await prisma.filterGroup.findFirst({
              where: { userId, tableId: table.id },
              orderBy: { order: 'desc' },
              select: { order: true }
            });
            const newOrder = maxOrder ? maxOrder.order + 1 : 0;

            rolesGroup = await prisma.filterGroup.create({
              data: {
                userId,
                tableId: table.id,
                name: groupNames.roles,
                order: newOrder
              }
            });
            console.log(`  ✅ Filter-Gruppe "${groupNames.roles}" für ${table.name} erstellt`);
          }

          let usersGroup = await prisma.filterGroup.findFirst({
            where: {
              userId,
              tableId: table.id,
              name: groupNames.users
            }
          });

          if (!usersGroup) {
            const maxOrder = await prisma.filterGroup.findFirst({
              where: { userId, tableId: table.id },
              orderBy: { order: 'desc' },
              select: { order: true }
            });
            const newOrder = maxOrder ? maxOrder.order + 1 : 0;

            usersGroup = await prisma.filterGroup.create({
              data: {
                userId,
                tableId: table.id,
                name: groupNames.users,
                order: newOrder
              }
            });
            console.log(`  ✅ Filter-Gruppe "${groupNames.users}" für ${table.name} erstellt`);
          }

          // Erstelle Filter für jede Rolle
          for (const role of roles) {
            const filterName = role.name;
            
            // Prüfe ob Filter bereits existiert
            const existingFilter = await prisma.savedFilter.findFirst({
              where: {
                userId,
                tableId: table.id,
                name: filterName,
                groupId: rolesGroup.id
              }
            });

            if (!existingFilter) {
              let conditions: any[] = [];
              let operators: string[] = [];

              if (table.id === 'requests-table') {
                // Requests: requestedBy = role ODER responsible = role
                conditions = [
                  { column: 'requestedBy', operator: 'equals', value: `role-${role.id}` },
                  { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
                ];
                operators = ['OR'];
              } else if (table.id === 'worktracker-todos') {
                // ToDos: responsible = role
                conditions = [
                  { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
                ];
                operators = [];
              }

              // Finde die höchste order-Nummer in der Gruppe
              const maxOrder = await prisma.savedFilter.findFirst({
                where: { groupId: rolesGroup.id },
                orderBy: { order: 'desc' },
                select: { order: true }
              });
              const newOrder = maxOrder ? maxOrder.order + 1 : 0;

              await prisma.savedFilter.create({
                data: {
                  userId,
                  tableId: table.id,
                  name: filterName,
                  conditions: JSON.stringify(conditions),
                  operators: JSON.stringify(operators),
                  groupId: rolesGroup.id,
                  order: newOrder
                }
              });
              console.log(`    ✅ Filter "${filterName}" (Rolle) für ${table.name} erstellt`);
            }
          }

          // Erstelle Filter für jeden Benutzer
          for (const user of users) {
            const filterName = `${user.firstName} ${user.lastName}`.trim() || user.username;
            
            // Prüfe ob Filter bereits existiert
            const existingFilter = await prisma.savedFilter.findFirst({
              where: {
                userId,
                tableId: table.id,
                name: filterName,
                groupId: usersGroup.id
              }
            });

            if (!existingFilter) {
              let conditions: any[] = [];
              let operators: string[] = [];

              if (table.id === 'requests-table') {
                // Requests: requestedBy = user ODER responsible = user
                conditions = [
                  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
                  { column: 'responsible', operator: 'equals', value: `user-${user.id}` }
                ];
                operators = ['OR'];
              } else if (table.id === 'worktracker-todos') {
                // ToDos: responsible = user ODER qualityControl = user
                conditions = [
                  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
                  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` }
                ];
                operators = ['OR'];
              }

              // Finde die höchste order-Nummer in der Gruppe
              const maxOrder = await prisma.savedFilter.findFirst({
                where: { groupId: usersGroup.id },
                orderBy: { order: 'desc' },
                select: { order: true }
              });
              const newOrder = maxOrder ? maxOrder.order + 1 : 0;

              await prisma.savedFilter.create({
                data: {
                  userId,
                  tableId: table.id,
                  name: filterName,
                  conditions: JSON.stringify(conditions),
                  operators: JSON.stringify(operators),
                  groupId: usersGroup.id,
                  order: newOrder
                }
              });
              console.log(`    ✅ Filter "${filterName}" (Benutzer) für ${table.name} erstellt`);
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Fehler beim Erstellen der Filter für User ${userId}:`, error);
      }
    }

    // Hole alle Benutzer und erstelle Filter für jeden
    const allUsers = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: {
              select: {
                organizationId: true
              }
            }
          }
        }
      }
    });

    for (const user of allUsers) {
      // Bestimme organizationId aus der aktiven Rolle oder ersten Rolle
      let organizationId: number | null = null;
      const activeRole = user.roles.find(ur => ur.lastUsed) || user.roles[0];
      if (activeRole?.role?.organizationId) {
        organizationId = activeRole.role.organizationId;
      }

      await createRoleAndUserFilters(user.id, organizationId);
    }

      console.log('✅ Standardfilter für Rollen und Benutzer erstellt');
    } catch (filterError) {
      console.error('⚠️ Fehler beim Erstellen der Standardfilter (wird übersprungen):', filterError);
      // Fehler wird geloggt, aber Seed wird fortgesetzt
    }

    // ========================================
    // SEEDING ABGESCHLOSSEN
    // ========================================
    console.log('\n🎉 Seeding erfolgreich abgeschlossen!');
    console.log('\n📋 Zusammenfassung:');
    console.log(`   - ${ALL_PAGES.length} Seiten-Berechtigungen definiert`);
    console.log(`   - ${ALL_TABLES.length} Tabellen-Berechtigungen definiert`);
    console.log(`   - ${ALL_BUTTONS.length} Button-Berechtigungen definiert`);
    console.log(`   - 3 globale Rollen (Admin, User, Hamburger)`);
    console.log(`   - 2 Organisationen: La Familia Hostel & Mosaik`);
    console.log(`   - Standard-Organisation (für Rückwärtskompatibilität)`);
    console.log(`   - Rollen pro Organisation: Admin, User, Hamburger`);
    console.log(`   - Admin-Benutzer je Organisation`);
    console.log(`   - Rebeca Benitez & Christina Di Biaso in Org 2 (User)`);
    console.log(`   - 5 Clients für Org 2 (Mosaik)`);
    console.log(`   - 3 Niederlassungen (Parque Poblado, Manila, Sonnenhalden)`);
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