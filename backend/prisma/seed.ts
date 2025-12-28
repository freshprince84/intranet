import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
// ========================================
// ZENTRALE PERMISSION DEFINITIONEN
// ========================================
// Diese Definitionen sind synchron mit backend/src/config/permissions.ts
// Hier inline für Seed-Kompatibilität (Prisma Seed hat spezielle Import-Einschränkungen)

type NewAccessLevel = 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both';

interface PermissionEntity {
  entity: string;
  entityType: 'page' | 'box' | 'tab' | 'button';
  description: string;
  parent?: string;
  ownershipFields?: string[];
}

// ALLE PAGES
const CENTRAL_PAGES: PermissionEntity[] = [
  { entity: 'dashboard', entityType: 'page', description: 'Dashboard-Seite' },
  { entity: 'worktracker', entityType: 'page', description: 'Worktracker-Seite' },
  { entity: 'consultations', entityType: 'page', description: 'Beratungsstunden-Seite' },
  { entity: 'team_worktime_control', entityType: 'page', description: 'Workcenter-Seite' },
  { entity: 'payroll', entityType: 'page', description: 'Lohnabrechnungs-Seite' },
  { entity: 'cerebro', entityType: 'page', description: 'Cerebro Wiki-Seite' },
  { entity: 'organization_management', entityType: 'page', description: 'Organisations-Verwaltung' },
  { entity: 'price_analysis', entityType: 'page', description: 'Preisanalyse-Seite' },
  { entity: 'settings', entityType: 'page', description: 'Einstellungen-Seite' },
  { entity: 'profile', entityType: 'page', description: 'Profil-Seite' },
  { entity: 'tour_management', entityType: 'page', description: 'Touren-Verwaltung' },
];

// ALLE BOXES
const CENTRAL_BOXES: PermissionEntity[] = [
  { entity: 'requests', entityType: 'box', description: 'Requests-Box', parent: 'dashboard' },
  { entity: 'worktime', entityType: 'box', description: 'Zeiterfassungs-Box', parent: 'worktracker' },
  { entity: 'consultation_tracker', entityType: 'box', description: 'Beratungs-Tracker', parent: 'consultations' },
  { entity: 'consultation_list', entityType: 'box', description: 'Beratungsliste', parent: 'consultations' },
];

// ALLE TABS
const CENTRAL_TABS: PermissionEntity[] = [
  { entity: 'todos', entityType: 'tab', description: 'To-Dos Tab', parent: 'worktracker' },
  { entity: 'reservations', entityType: 'tab', description: 'Reservations Tab', parent: 'worktracker' },
  { entity: 'tour_bookings', entityType: 'tab', description: 'Tour Bookings Tab', parent: 'worktracker' },
  { entity: 'working_times', entityType: 'tab', description: 'Arbeitszeiten Tab', parent: 'team_worktime_control' },
  { entity: 'shift_planning', entityType: 'tab', description: 'Schichtplanung Tab', parent: 'team_worktime_control' },
  { entity: 'task_analytics', entityType: 'tab', description: 'Task Analytics Tab', parent: 'team_worktime_control' },
  { entity: 'request_analytics', entityType: 'tab', description: 'Request Analytics Tab', parent: 'team_worktime_control' },
  { entity: 'consultation_invoices', entityType: 'tab', description: 'Beratungsrechnungen Tab', parent: 'payroll' },
  { entity: 'monthly_reports', entityType: 'tab', description: 'Monatsrechnungen Tab', parent: 'payroll' },
  { entity: 'payroll_reports', entityType: 'tab', description: 'Lohnabrechnungen Tab', parent: 'payroll' },
  { entity: 'users', entityType: 'tab', description: 'Users Tab', parent: 'organization_management' },
  { entity: 'roles', entityType: 'tab', description: 'Roles Tab', parent: 'organization_management' },
  { entity: 'branches', entityType: 'tab', description: 'Branches Tab', parent: 'organization_management' },
  { entity: 'tour_providers', entityType: 'tab', description: 'Tour Providers Tab', parent: 'organization_management' },
  { entity: 'organization_settings', entityType: 'tab', description: 'Organisation-Einstellungen', parent: 'organization_management' },
  { entity: 'join_requests', entityType: 'tab', description: 'Beitrittsanfragen Tab', parent: 'organization_management' },
  { entity: 'password_manager', entityType: 'tab', description: 'Passwort-Manager Tab', parent: 'settings' },
  { entity: 'system', entityType: 'tab', description: 'System Tab', parent: 'settings' },
  { entity: 'price_analysis_listings', entityType: 'tab', description: 'OTA Listings', parent: 'price_analysis' },
  { entity: 'price_analysis_recommendations', entityType: 'tab', description: 'Preisempfehlungen', parent: 'price_analysis' },
  { entity: 'price_analysis_rules', entityType: 'tab', description: 'Preisregeln', parent: 'price_analysis' },
  { entity: 'price_analysis_rate_shopping', entityType: 'tab', description: 'Rate Shopping', parent: 'price_analysis' },
];

// ALLE BUTTONS
const CENTRAL_BUTTONS: PermissionEntity[] = [
  // Request Buttons
  { entity: 'request_create', entityType: 'button', description: 'Request erstellen', parent: 'requests' },
  { entity: 'request_edit', entityType: 'button', description: 'Request bearbeiten', parent: 'requests' },
  { entity: 'request_delete', entityType: 'button', description: 'Request löschen', parent: 'requests' },
  { entity: 'request_status_change', entityType: 'button', description: 'Request Status ändern', parent: 'requests' },
  // Task Buttons
  { entity: 'task_create', entityType: 'button', description: 'Task erstellen', parent: 'todos' },
  { entity: 'task_edit', entityType: 'button', description: 'Task bearbeiten', parent: 'todos' },
  { entity: 'task_delete', entityType: 'button', description: 'Task löschen', parent: 'todos' },
  { entity: 'task_status_change', entityType: 'button', description: 'Task Status ändern', parent: 'todos' },
  // Reservation Buttons
  { entity: 'reservation_create', entityType: 'button', description: 'Reservation erstellen', parent: 'reservations' },
  { entity: 'reservation_edit', entityType: 'button', description: 'Reservation bearbeiten', parent: 'reservations' },
  { entity: 'reservation_delete', entityType: 'button', description: 'Reservation löschen', parent: 'reservations' },
  { entity: 'reservation_send_invitation', entityType: 'button', description: 'Einladung senden', parent: 'reservations' },
  { entity: 'reservation_send_passcode', entityType: 'button', description: 'Passcode senden', parent: 'reservations' },
  // Tour Booking Buttons
  { entity: 'tour_booking_create', entityType: 'button', description: 'Tour Buchung erstellen', parent: 'tour_bookings' },
  { entity: 'tour_booking_edit', entityType: 'button', description: 'Tour Buchung bearbeiten', parent: 'tour_bookings' },
  { entity: 'tour_booking_cancel', entityType: 'button', description: 'Tour Buchung stornieren', parent: 'tour_bookings' },
  // Worktime Buttons
  { entity: 'worktime_start', entityType: 'button', description: 'Arbeitszeit starten', parent: 'worktime' },
  { entity: 'worktime_stop', entityType: 'button', description: 'Arbeitszeit stoppen', parent: 'worktime' },
  // Consultation Buttons
  { entity: 'consultation_start', entityType: 'button', description: 'Beratung starten', parent: 'consultation_tracker' },
  { entity: 'consultation_stop', entityType: 'button', description: 'Beratung stoppen', parent: 'consultation_tracker' },
  { entity: 'consultation_plan', entityType: 'button', description: 'Beratung planen', parent: 'consultation_tracker' },
  { entity: 'consultation_edit', entityType: 'button', description: 'Beratung bearbeiten', parent: 'consultation_list' },
  { entity: 'consultation_delete', entityType: 'button', description: 'Beratung löschen', parent: 'consultation_list' },
  // Client Buttons
  { entity: 'client_create', entityType: 'button', description: 'Client erstellen', parent: 'consultation_tracker' },
  { entity: 'client_edit', entityType: 'button', description: 'Client bearbeiten', parent: 'consultation_list' },
  { entity: 'client_delete', entityType: 'button', description: 'Client löschen', parent: 'consultation_list' },
  // Working Times Buttons
  { entity: 'working_time_create', entityType: 'button', description: 'Arbeitszeit erstellen', parent: 'working_times' },
  { entity: 'working_time_edit', entityType: 'button', description: 'Arbeitszeit bearbeiten', parent: 'working_times' },
  { entity: 'working_time_delete', entityType: 'button', description: 'Arbeitszeit löschen', parent: 'working_times' },
  // Shift Planning Buttons
  { entity: 'shift_create', entityType: 'button', description: 'Schicht erstellen', parent: 'shift_planning' },
  { entity: 'shift_edit', entityType: 'button', description: 'Schicht bearbeiten', parent: 'shift_planning' },
  { entity: 'shift_delete', entityType: 'button', description: 'Schicht löschen', parent: 'shift_planning' },
  { entity: 'shift_swap_request', entityType: 'button', description: 'Schichttausch anfragen', parent: 'shift_planning' },
  // User Buttons
  { entity: 'user_create', entityType: 'button', description: 'User erstellen', parent: 'users' },
  { entity: 'user_edit', entityType: 'button', description: 'User bearbeiten', parent: 'users' },
  { entity: 'user_delete', entityType: 'button', description: 'User löschen', parent: 'users' },
  // Role Buttons
  { entity: 'role_create', entityType: 'button', description: 'Rolle erstellen', parent: 'roles' },
  { entity: 'role_edit', entityType: 'button', description: 'Rolle bearbeiten', parent: 'roles' },
  { entity: 'role_delete', entityType: 'button', description: 'Rolle löschen', parent: 'roles' },
  { entity: 'role_copy', entityType: 'button', description: 'Rolle kopieren', parent: 'roles' },
  // Branch Buttons
  { entity: 'branch_create', entityType: 'button', description: 'Branch erstellen', parent: 'branches' },
  { entity: 'branch_edit', entityType: 'button', description: 'Branch bearbeiten', parent: 'branches' },
  { entity: 'branch_delete', entityType: 'button', description: 'Branch löschen', parent: 'branches' },
  // Tour Provider Buttons
  { entity: 'tour_provider_create', entityType: 'button', description: 'Tour Provider erstellen', parent: 'tour_providers' },
  { entity: 'tour_provider_edit', entityType: 'button', description: 'Tour Provider bearbeiten', parent: 'tour_providers' },
  { entity: 'tour_provider_delete', entityType: 'button', description: 'Tour Provider löschen', parent: 'tour_providers' },
  // Organization Buttons
  { entity: 'organization_edit', entityType: 'button', description: 'Organisation bearbeiten', parent: 'organization_settings' },
  // Join Request Buttons
  { entity: 'join_request_approve', entityType: 'button', description: 'Beitrittsanfrage genehmigen', parent: 'join_requests' },
  { entity: 'join_request_reject', entityType: 'button', description: 'Beitrittsanfrage ablehnen', parent: 'join_requests' },
  // Invoice Buttons
  { entity: 'invoice_create', entityType: 'button', description: 'Rechnung erstellen', parent: 'consultation_invoices' },
  { entity: 'invoice_download', entityType: 'button', description: 'Rechnung herunterladen', parent: 'consultation_invoices' },
  { entity: 'invoice_mark_paid', entityType: 'button', description: 'Rechnung als bezahlt markieren', parent: 'consultation_invoices' },
  // Password Manager Buttons
  { entity: 'password_entry_create', entityType: 'button', description: 'Passwort-Eintrag erstellen', parent: 'password_manager' },
  { entity: 'password_entry_edit', entityType: 'button', description: 'Passwort-Eintrag bearbeiten', parent: 'password_manager' },
  { entity: 'password_entry_delete', entityType: 'button', description: 'Passwort-Eintrag löschen', parent: 'password_manager' },
  // Price Analysis Buttons
  { entity: 'price_rule_create', entityType: 'button', description: 'Preisregel erstellen', parent: 'price_analysis_rules' },
  { entity: 'price_rule_edit', entityType: 'button', description: 'Preisregel bearbeiten', parent: 'price_analysis_rules' },
  { entity: 'price_rule_delete', entityType: 'button', description: 'Preisregel löschen', parent: 'price_analysis_rules' },
  { entity: 'price_recommendation_apply', entityType: 'button', description: 'Preisempfehlung anwenden', parent: 'price_analysis_recommendations' },
  { entity: 'rate_shopping_run', entityType: 'button', description: 'Rate Shopping starten', parent: 'price_analysis_rate_shopping' },
  // Cerebro Buttons
  { entity: 'cerebro_article_create', entityType: 'button', description: 'Artikel erstellen', parent: 'cerebro' },
  { entity: 'cerebro_article_edit', entityType: 'button', description: 'Artikel bearbeiten', parent: 'cerebro' },
  { entity: 'cerebro_article_delete', entityType: 'button', description: 'Artikel löschen', parent: 'cerebro' },
  { entity: 'cerebro_media_upload', entityType: 'button', description: 'Medien hochladen', parent: 'cerebro' },
  { entity: 'cerebro_link_add', entityType: 'button', description: 'Link hinzufügen', parent: 'cerebro' },
  // Tour Management Buttons
  { entity: 'tour_create', entityType: 'button', description: 'Tour erstellen', parent: 'tour_management' },
  { entity: 'tour_edit', entityType: 'button', description: 'Tour bearbeiten', parent: 'tour_management' },
  { entity: 'tour_delete', entityType: 'button', description: 'Tour löschen', parent: 'tour_management' },
];

// ALLE ENTITIES KOMBINIERT
const ALL_ENTITIES_COMBINED: PermissionEntity[] = [
  ...CENTRAL_PAGES,
  ...CENTRAL_BOXES,
  ...CENTRAL_TABS,
  ...CENTRAL_BUTTONS,
];

// ========================================
// ACCESS LEVEL DEFINITIONEN
// ========================================
// NEUES FORMAT: 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both'
// Altes Format (read/write/both) wird für Abwärtskompatibilität beibehalten
type AccessLevel = 'read' | 'write' | 'both' | 'none' | NewAccessLevel;

const prisma = new PrismaClient();

// ========================================
// FLACHE LISTEN FÜR LEGACY-KOMPATIBILITÄT
// ========================================
// Extrahiert aus den zentralen Definitionen

const ALL_PAGES = CENTRAL_PAGES.map(p => p.entity);
const ALL_BOXES = CENTRAL_BOXES.map(b => b.entity);
const ALL_TABS = CENTRAL_TABS.map(t => t.entity);
const ALL_BUTTONS = CENTRAL_BUTTONS.map(b => b.entity);

// Legacy-Kompatibilität: ALL_TABLES enthält Boxes + Tabs
const ALL_TABLES = [...ALL_BOXES, ...ALL_TABS];

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

    // Branch-basierte Reservations-Berechtigungen für Admin (alle Branches)
    await ensurePermission(adminRole.id, 'reservations_all_branches', 'table', 'read');

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
    userPermissionMap['page_price_analysis'] = 'read'; // NEU: User können Preisanalyse sehen
    userPermissionMap['page_price_analysis_listings'] = 'read'; // NEU: User können Inserate sehen
    userPermissionMap['page_price_analysis_recommendations'] = 'read'; // NEU: User können Empfehlungen sehen
    userPermissionMap['page_price_analysis_rules'] = 'read'; // NEU: User können Regeln sehen
    userPermissionMap['page_price_analysis_rate_shopping'] = 'read'; // NEU: User können Rate Shopping sehen
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
    userPermissionMap['table_price_analysis_listings'] = 'read'; // NEU: User können Inserate sehen
    userPermissionMap['table_price_analysis_recommendations'] = 'read'; // NEU: User können Empfehlungen sehen
    userPermissionMap['table_price_analysis_rules'] = 'read'; // NEU: User können Regeln sehen
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
    // NICHT: price_analysis_* Buttons (User haben nur Leserechte)

    await ensureAllPermissionsForRole(userRole.id, userPermissionMap);

    // Branch-basierte Reservations-Berechtigungen für User (nur eigene Branch)
    await ensurePermission(userRole.id, 'reservations_own_branch', 'table', 'read');

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
    const org1AdminRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Admin',
          organizationId: org1.id
        }
      },
      update: {
        description: 'Administrator von La Familia Hostel'
      },
      create: {
        name: 'Admin',
        description: 'Administrator von La Familia Hostel',
        organizationId: org1.id
      }
    });
    console.log(`✅ Org 1 Admin-Rolle: ${org1AdminRole.name} (ID: ${org1AdminRole.id})`);

    const org1UserRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'User',
          organizationId: org1.id
        }
      },
      update: {
        description: 'User-Rolle für La Familia Hostel'
      },
      create: {
        name: 'User',
        description: 'User-Rolle für La Familia Hostel',
        organizationId: org1.id
      }
    });
    console.log(`✅ Org 1 User-Rolle: ${org1UserRole.name} (ID: ${org1UserRole.id})`);

    const org1HamburgerRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Hamburger',
          organizationId: org1.id
        }
      },
      update: {
        description: 'Hamburger-Rolle für La Familia Hostel'
      },
      create: {
        name: 'Hamburger',
        description: 'Hamburger-Rolle für La Familia Hostel',
        organizationId: org1.id
      }
    });
    console.log(`✅ Org 1 Hamburger-Rolle: ${org1HamburgerRole.name} (ID: ${org1HamburgerRole.id})`);

    // Org 2 Rollen: Admin, User, Hamburger
    const org2AdminRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Admin',
          organizationId: org2.id
        }
      },
      update: {
        description: 'Administrator von Mosaik'
      },
      create: {
        name: 'Admin',
        description: 'Administrator von Mosaik',
        organizationId: org2.id
      }
    });
    console.log(`✅ Org 2 Admin-Rolle: ${org2AdminRole.name} (ID: ${org2AdminRole.id})`);

    const org2UserRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'User',
          organizationId: org2.id
        }
      },
      update: {
        description: 'User-Rolle für Mosaik'
      },
      create: {
        name: 'User',
        description: 'User-Rolle für Mosaik',
        organizationId: org2.id
      }
    });
    console.log(`✅ Org 2 User-Rolle: ${org2UserRole.name} (ID: ${org2UserRole.id})`);

    const org2HamburgerRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Hamburger',
          organizationId: org2.id
        }
      },
      update: {
        description: 'Hamburger-Rolle für Mosaik'
      },
      create: {
        name: 'Hamburger',
        description: 'Hamburger-Rolle für Mosaik',
        organizationId: org2.id
      }
    });
    console.log(`✅ Org 2 Hamburger-Rolle: ${org2HamburgerRole.name} (ID: ${org2HamburgerRole.id})`);

    // Org 1 Legal-Rolle (Derecho)
    const org1LegalRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Derecho',
          organizationId: org1.id
        }
      },
      update: {
        description: 'Legal-Rolle für Sozialversicherungen (La Familia Hostel)'
      },
      create: {
        name: 'Derecho',
        description: 'Legal-Rolle für Sozialversicherungen (La Familia Hostel)',
        organizationId: org1.id
      }
    });
    console.log(`✅ Org 1 Legal-Rolle (Derecho): ${org1LegalRole.name} (ID: ${org1LegalRole.id})`);

    // Org 2 Legal-Rolle (Derecho)
    const org2LegalRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Derecho',
          organizationId: org2.id
        }
      },
      update: {
        description: 'Legal-Rolle für Sozialversicherungen (Mosaik)'
      },
      create: {
        name: 'Derecho',
        description: 'Legal-Rolle für Sozialversicherungen (Mosaik)',
        organizationId: org2.id
      }
    });
    console.log(`✅ Org 2 Legal-Rolle (Derecho): ${org2LegalRole.name} (ID: ${org2LegalRole.id})`);

    // Standard-Organisation Rollen (für Rückwärtskompatibilität)
    const orgAdminRole = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: 'Admin',
          organizationId: defaultOrganization.id
        }
      },
      update: {
        description: 'Administrator der Standard-Organisation'
      },
      create: {
        name: 'Admin',
        description: 'Administrator der Standard-Organisation',
        organizationId: defaultOrganization.id
      }
    });
    console.log(`✅ Standard-Organisations-Admin-Rolle: ${orgAdminRole.name} (ID: ${orgAdminRole.id})`);

    // Berechtigungen für alle Organisations-Rollen erstellen
    console.log('🔑 Erstelle Berechtigungen für Organisations-Rollen...');
    
    // Org 1 Admin: alle Berechtigungen
    const org1AdminPermissionMap: Record<string, AccessLevel> = {};
    ALL_PAGES.forEach(page => org1AdminPermissionMap[`page_${page}`] = 'both');
    ALL_TABLES.forEach(table => org1AdminPermissionMap[`table_${table}`] = 'both');
    ALL_BUTTONS.forEach(button => org1AdminPermissionMap[`button_${button}`] = 'both');
    await ensureAllPermissionsForRole(org1AdminRole.id, org1AdminPermissionMap);

    // Branch-basierte Reservations-Berechtigungen für Org 1 Admin (alle Branches)
    await ensurePermission(org1AdminRole.id, 'reservations_all_branches', 'table', 'read');

    // Org 1 User: gleiche Berechtigungen wie User, ABER organization_management = 'none' (User MIT Organisation)
    const org1UserPermissionMap = { ...userPermissionMap };
    org1UserPermissionMap['page_organization_management'] = 'none'; // User MIT Organisation → nicht sichtbar
    await ensureAllPermissionsForRole(org1UserRole.id, org1UserPermissionMap);

    // Branch-basierte Reservations-Berechtigungen für Org 1 User (nur eigene Branch)
    await ensurePermission(org1UserRole.id, 'reservations_own_branch', 'table', 'read');

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

    // Branch-basierte Reservations-Berechtigungen für Org 2 Admin (alle Branches)
    await ensurePermission(org2AdminRole.id, 'reservations_all_branches', 'table', 'read');

    // Org 2 User: gleiche Berechtigungen wie User, ABER organization_management = 'none' (User MIT Organisation)
    const org2UserPermissionMap = { ...userPermissionMap };
    org2UserPermissionMap['page_organization_management'] = 'none'; // User MIT Organisation → nicht sichtbar
    await ensureAllPermissionsForRole(org2UserRole.id, org2UserPermissionMap);

    // Branch-basierte Reservations-Berechtigungen für Org 2 User (nur eigene Branch)
    await ensurePermission(org2UserRole.id, 'reservations_own_branch', 'table', 'read');

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

    // Branch-basierte Reservations-Berechtigungen für Standard-Organisation Admin (alle Branches)
    await ensurePermission(orgAdminRole.id, 'reservations_all_branches', 'table', 'read');

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
        firstName: null,
        lastName: null,
        active: true // Admin muss immer aktiv sein
      },
      create: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: null,
        lastName: null,
        active: true
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
    // WICHTIG: Prüfe ob Benutzer existiert und inaktiv ist - dann nicht neu erstellen
    const existingRebeca = await prisma.user.findUnique({
      where: { username: 'rebeca-benitez' }
    });
    
    let rebecaUser;
    if (existingRebeca && !existingRebeca.active) {
      // Benutzer existiert aber ist inaktiv - NICHT reaktivieren
      console.log(`⏭️ Rebeca Benitez existiert als inaktiver Benutzer - wird übersprungen`);
      rebecaUser = existingRebeca;
    } else {
    const rebecaPassword = await bcrypt.hash('admin123', 10);
      rebecaUser = await prisma.user.upsert({
      where: { username: 'rebeca-benitez' },
        update: {
          // Stelle sicher, dass active nicht auf false gesetzt wird, wenn Benutzer bereits aktiv ist
          active: existingRebeca?.active ?? true
        },
      create: {
        username: 'rebeca-benitez',
        email: 'rebeca.benitez@mosaik.ch',
        password: rebecaPassword,
        firstName: 'Rebeca',
          lastName: 'Benitez',
          active: true
      }
    });
    }
    
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
    // WICHTIG: Prüfe ob Benutzer existiert und inaktiv ist - dann nicht neu erstellen
    const existingChristina = await prisma.user.findUnique({
      where: { username: 'christina-di-biaso' }
    });
    
    let christinaUser;
    if (existingChristina && !existingChristina.active) {
      // Benutzer existiert aber ist inaktiv - NICHT reaktivieren
      console.log(`⏭️ Christina Di Biaso existiert als inaktiver Benutzer - wird übersprungen`);
      christinaUser = existingChristina;
    } else {
    const christinaPassword = await bcrypt.hash('admin123', 10);
      christinaUser = await prisma.user.upsert({
      where: { username: 'christina-di-biaso' },
        update: {
          // Stelle sicher, dass active nicht auf false gesetzt wird, wenn Benutzer bereits aktiv ist
          active: existingChristina?.active ?? true
        },
      create: {
        username: 'christina-di-biaso',
        email: 'christina.dibiaso@mosaik.ch',
        password: christinaPassword,
        firstName: 'Christina',
        lastName: 'Di Biaso',
          active: true,
        roles: {
          create: {
            roleId: org2UserRole.id,
            lastUsed: true
          }
        }
      }
    });
    console.log(`✅ Christina Di Biaso-Benutzer: ${christinaUser.username}`);
    }

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
    // 12. STANDARDFILTER ERSTELLEN
    // ========================================
    // WICHTIG: Diese Funktion wird in einem try-catch ausgeführt, damit sie auch bei Fehlern in anderen Seed-Bereichen ausgeführt wird
    try {
      console.log('🔍 Erstelle Standardfilter...');
      
      /**
       * Erstellt Standard-Filter für alle Tabellen
       * @param userId - ID des Benutzers, für den die Filter erstellt werden
       */
      async function createStandardFilters(userId: number) {
        try {
          // Standard-Filter für To-Do's (worktracker-todos)
          const todosTableId = 'worktracker-todos';
          
          // "Aktuell" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: todosTableId,
                name: 'Aktuell'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'status', operator: 'notEquals', value: 'done' }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: todosTableId,
              name: 'Aktuell',
              conditions: JSON.stringify([
                { column: 'status', operator: 'notEquals', value: 'done' }
              ]),
              operators: JSON.stringify([])
            }
          });
          
          // "Archiv" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: todosTableId,
                name: 'Archiv'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'status', operator: 'equals', value: 'done' }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: todosTableId,
              name: 'Archiv',
              conditions: JSON.stringify([
                { column: 'status', operator: 'equals', value: 'done' }
              ]),
              operators: JSON.stringify([])
            }
          });
          
          // ✅ PHASE 4: "Meine Aufgaben" Filter (responsible = user OR qc = user OR responsible = rolle OR qc = rolle)
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: todosTableId,
                name: 'Meine Aufgaben'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'responsible', operator: 'equals', value: '__CURRENT_USER__' },
                { column: 'qualityControl', operator: 'equals', value: '__CURRENT_USER__' },
                { column: 'responsible', operator: 'equals', value: '__CURRENT_ROLE__' },
                { column: 'qualityControl', operator: 'equals', value: '__CURRENT_ROLE__' }
              ]),
              operators: JSON.stringify(['OR', 'OR', 'OR'])
            },
            create: {
              userId,
              tableId: todosTableId,
              name: 'Meine Aufgaben',
              conditions: JSON.stringify([
                { column: 'responsible', operator: 'equals', value: '__CURRENT_USER__' },
                { column: 'qualityControl', operator: 'equals', value: '__CURRENT_USER__' },
                { column: 'responsible', operator: 'equals', value: '__CURRENT_ROLE__' },
                { column: 'qualityControl', operator: 'equals', value: '__CURRENT_ROLE__' }
              ]),
              operators: JSON.stringify(['OR', 'OR', 'OR'])
            }
          });
          
          // Standard-Filter für Requests (requests-table)
          const requestsTableId = 'requests-table';
          
          // "Aktuell" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: requestsTableId,
                name: 'Aktuell'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'status', operator: 'notEquals', value: 'approved' },
                { column: 'status', operator: 'notEquals', value: 'denied' }
              ]),
              operators: JSON.stringify(['AND'])
            },
            create: {
              userId,
              tableId: requestsTableId,
              name: 'Aktuell',
              conditions: JSON.stringify([
                { column: 'status', operator: 'notEquals', value: 'approved' },
                { column: 'status', operator: 'notEquals', value: 'denied' }
              ]),
              operators: JSON.stringify(['AND'])
            }
          });
          
          // "Archiv" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: requestsTableId,
                name: 'Archiv'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'status', operator: 'equals', value: 'approved' },
                { column: 'status', operator: 'equals', value: 'denied' }
              ]),
              operators: JSON.stringify(['OR'])
            },
            create: {
              userId,
              tableId: requestsTableId,
              name: 'Archiv',
              conditions: JSON.stringify([
                { column: 'status', operator: 'equals', value: 'approved' },
                { column: 'status', operator: 'equals', value: 'denied' }
              ]),
              operators: JSON.stringify(['OR'])
            }
          });
          
          
          // Standard-Filter für Reservations (worktracker-reservations)
          const reservationsTableId = 'worktracker-reservations';
          
          // "Hoy" Filter (mit __TODAY__)
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: reservationsTableId,
                name: 'Hoy'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'checkInDate', operator: 'equals', value: '__TODAY__' }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: reservationsTableId,
              name: 'Hoy',
              conditions: JSON.stringify([
                { column: 'checkInDate', operator: 'equals', value: '__TODAY__' }
              ]),
              operators: JSON.stringify([])
            }
          });
          
          // ✅ PHASE 4: "Morgen" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: reservationsTableId,
                name: 'Morgen'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'checkInDate', operator: 'equals', value: '__TOMORROW__' }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: reservationsTableId,
              name: 'Morgen',
              conditions: JSON.stringify([
                { column: 'checkInDate', operator: 'equals', value: '__TOMORROW__' }
              ]),
              operators: JSON.stringify([])
            }
          });
          
          // ✅ PHASE 4: "Gestern" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: reservationsTableId,
                name: 'Gestern'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'checkInDate', operator: 'equals', value: '__YESTERDAY__' }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: reservationsTableId,
              name: 'Gestern',
              conditions: JSON.stringify([
                { column: 'checkInDate', operator: 'equals', value: '__YESTERDAY__' }
              ]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Join Requests (join-requests-table)
          const joinRequestsTableId = 'join-requests-table';
          
          // "Alle" Filter (leere Bedingungen = alle anzeigen)
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: joinRequestsTableId,
                name: 'Alle'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: joinRequestsTableId,
              name: 'Alle',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Cerebro (CEREBRO_ARTICLES)
          const cerebroTableId = 'CEREBRO_ARTICLES';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: cerebroTableId,
                name: 'Alle Artikel'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: cerebroTableId,
              name: 'Alle Artikel',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Tours (worktracker-tours)
          const toursTableId = 'worktracker-tours';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: toursTableId,
                name: 'Aktuell'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'isActive', operator: 'equals', value: true }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: toursTableId,
              name: 'Aktuell',
              conditions: JSON.stringify([
                { column: 'isActive', operator: 'equals', value: true }
              ]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Password Manager (password-manager-table)
          const passwordManagerTableId = 'password-manager-table';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: passwordManagerTableId,
                name: 'Alle Einträge'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: passwordManagerTableId,
              name: 'Alle Einträge',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Todo Analytics (todo-analytics-table)
          const todoAnalyticsTableId = 'todo-analytics-table';
          
          // "Alle" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: todoAnalyticsTableId,
                name: 'Alle'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: todoAnalyticsTableId,
              name: 'Alle',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Request Analytics (request-analytics-table)
          const requestAnalyticsTableId = 'request-analytics-table';
          
          // "Alle" Filter
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: requestAnalyticsTableId,
                name: 'Alle'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: requestAnalyticsTableId,
              name: 'Alle',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für My Join Requests (my-join-requests-table)
          const myJoinRequestsTableId = 'my-join-requests-table';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: myJoinRequestsTableId,
                name: 'Alle'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: myJoinRequestsTableId,
              name: 'Alle',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Branches (branches-table)
          const branchesTableId = 'branches-table';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: branchesTableId,
                name: 'Alle'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: branchesTableId,
              name: 'Alle',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Roles (roles-table)
          const rolesTableId = 'roles-table';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: rolesTableId,
                name: 'Alle'
              }
            },
            update: {
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: rolesTableId,
              name: 'Alle',
              conditions: JSON.stringify([]),
              operators: JSON.stringify([])
            }
          });
          
          // Standard-Filter für Workcenter (workcenter-table)
          const workcenterTableId = 'workcenter-table';
          await prisma.savedFilter.upsert({
            where: {
              userId_tableId_name: {
                userId,
                tableId: workcenterTableId,
                name: 'Aktive'
              }
            },
            update: {
              conditions: JSON.stringify([
                { column: 'hasActiveWorktime', operator: 'equals', value: 'true' }
              ]),
              operators: JSON.stringify([])
            },
            create: {
              userId,
              tableId: workcenterTableId,
              name: 'Aktive',
              conditions: JSON.stringify([
                { column: 'hasActiveWorktime', operator: 'equals', value: 'true' }
              ]),
              operators: JSON.stringify([])
            }
          });
          
        } catch (error) {
          console.error(`  ❌ Fehler beim Erstellen der Standard-Filter für User ${userId}:`, error);
        }
      }
      
      // Erstelle Standard-Filter für alle AKTIVEN Benutzer
      const allUsersForStandardFilters = await prisma.user.findMany({
        where: { active: true }
      });
      for (const user of allUsersForStandardFilters) {
        await createStandardFilters(user.id);
      }
      
      console.log('✅ Standard-Filter erstellt');
      
      // ========================================
      // 13. STANDARDFILTER FÜR ROLLEN UND BENUTZER ERSTELLEN
      // ========================================
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
          { id: 'worktracker-todos', name: 'ToDos' },
          { id: 'todo-analytics-table', name: 'Todo Analytics' },
          { id: 'request-analytics-table', name: 'Request Analytics' }
        ];

        for (const table of tables) {
          // Erstelle oder hole Filter-Gruppen
          // WICHTIG: Roles-Gruppe wird nur erstellt wenn auch Rollen-Filter erstellt werden (nicht bei Requests)
          let rolesGroup: any = null;
          if (table.id === 'worktracker-todos' || table.id === 'todo-analytics-table') {
            // Nur für Tasks und Todo Analytics: Roles-Gruppe erstellen
            rolesGroup = await prisma.filterGroup.findFirst({
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

          // Erstelle Filter für jede Rolle (nur für Tasks und Todo Analytics, nicht für Requests)
          if ((table.id === 'worktracker-todos' || table.id === 'todo-analytics-table') && rolesGroup) {
            for (const role of roles) {
              const filterName = role.name;
              
              let conditions: any[] = [];
              let operators: string[] = [];
              
              if (table.id === 'worktracker-todos') {
                // ToDos: responsible = role UND status != done
                conditions = [
                  { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
                  { column: 'status', operator: 'notEquals', value: 'done' }
                ];
                operators = ['AND'];
                } else if (table.id === 'todo-analytics-table') {
                  // ✅ PHASE 13: Todo Analytics: responsible = role AND time = __THIS_WEEK__
                  conditions = [
                    { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
                    { column: 'time', operator: 'equals', value: '__THIS_WEEK__' }
                  ];
                  operators = ['AND'];
                }

                // Finde die höchste order-Nummer in der Gruppe
                const maxOrder = await prisma.savedFilter.findFirst({
                  where: { groupId: rolesGroup.id },
                  orderBy: { order: 'desc' },
                  select: { order: true }
                });
                const newOrder = maxOrder ? maxOrder.order + 1 : 0;

              // ✅ FIX: upsert verwenden, damit bestehende Filter aktualisiert werden
              await prisma.savedFilter.upsert({
                where: {
                  userId_tableId_name: {
                    userId,
                    tableId: table.id,
                    name: filterName
                  }
                },
                update: {
                  conditions: JSON.stringify(conditions),
                  operators: JSON.stringify(operators),
                  groupId: rolesGroup.id,
                  order: newOrder
                },
                create: {
                    userId,
                    tableId: table.id,
                    name: filterName,
                    conditions: JSON.stringify(conditions),
                    operators: JSON.stringify(operators),
                    groupId: rolesGroup.id,
                    order: newOrder
                  }
                });
              console.log(`    ✅ Filter "${filterName}" (Rolle) für ${table.name} erstellt/aktualisiert`);
            }
          }
          // Requests: KEINE Rollen-Filter (Requests unterstützen keine Rollen)
          // Nur User-Filter werden erstellt (siehe Zeile 1705-1711)

          // Erstelle Filter für jeden Benutzer
          for (const user of users) {
            const filterName = `${user.firstName} ${user.lastName}`.trim() || user.username;
            
            // Prüfe ob Filter bereits existiert
              let conditions: any[] = [];
              let operators: string[] = [];

              if (table.id === 'requests-table') {
                // Requests: (requestedBy AND status != approved AND status != denied) OR (responsible AND status != approved AND status != denied)
                conditions = [
                  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
                  { column: 'status', operator: 'notEquals', value: 'approved' },
                  { column: 'status', operator: 'notEquals', value: 'denied' },
                  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
                  { column: 'status', operator: 'notEquals', value: 'approved' },
                  { column: 'status', operator: 'notEquals', value: 'denied' }
                ];
                operators = ['AND', 'AND', 'OR', 'AND', 'AND'];
              } else if (table.id === 'worktracker-todos') {
                // ToDos: qualityControl = user ODER responsible = user UND status != done
                conditions = [
                  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
                  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
                  { column: 'status', operator: 'notEquals', value: 'done' }
              ];
              operators = ['OR', 'AND'];
              } else if (table.id === 'todo-analytics-table') {
                // ✅ PHASE 13: Todo Analytics: responsible = user ODER qualityControl = user AND time = __THIS_WEEK__
                conditions = [
                  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
                  { column: 'qualityControl', operator: 'equals', value: `user-${user.id}` },
                  { column: 'time', operator: 'equals', value: '__THIS_WEEK__' }
                ];
                operators = ['OR', 'AND'];
              } else if (table.id === 'request-analytics-table') {
                // ✅ PHASE 13: Request Analytics: requestedBy = user ODER responsible = user AND time = __THIS_WEEK__
                conditions = [
                  { column: 'requestedBy', operator: 'equals', value: `user-${user.id}` },
                  { column: 'responsible', operator: 'equals', value: `user-${user.id}` },
                  { column: 'time', operator: 'equals', value: '__THIS_WEEK__' }
                ];
                operators = ['OR', 'AND'];
              }

              // Finde die höchste order-Nummer in der Gruppe
              const maxOrder = await prisma.savedFilter.findFirst({
                where: { groupId: usersGroup.id },
                orderBy: { order: 'desc' },
                select: { order: true }
              });
              const newOrder = maxOrder ? maxOrder.order + 1 : 0;

            // ✅ FIX: upsert verwenden, damit bestehende Filter aktualisiert werden
            await prisma.savedFilter.upsert({
              where: {
                userId_tableId_name: {
                  userId,
                  tableId: table.id,
                  name: filterName
                }
              },
              update: {
                conditions: JSON.stringify(conditions),
                operators: JSON.stringify(operators),
                groupId: usersGroup.id,
                order: newOrder
              },
              create: {
                  userId,
                  tableId: table.id,
                  name: filterName,
                  conditions: JSON.stringify(conditions),
                  operators: JSON.stringify(operators),
                  groupId: usersGroup.id,
                  order: newOrder
                }
              });
            console.log(`    ✅ Filter "${filterName}" (Benutzer) für ${table.name} erstellt/aktualisiert`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Fehler beim Erstellen der Filter für User ${userId}:`, error);
      }
    }

    // Hole alle AKTIVEN Benutzer und erstelle Filter für jeden
    const allUsers = await prisma.user.findMany({
      where: { active: true },
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